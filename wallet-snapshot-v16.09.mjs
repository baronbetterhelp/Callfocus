#!/usr/bin/env node
// V16.09: manually invoked, read-only Cloudflare KV wallet preservation snapshot.
// Uses GET and the documented POST /bulk/get (read-only) endpoint; never KV PUT/DELETE, D1 APIs or worker routes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { finished } from 'node:stream/promises';
import { once } from 'node:events';
import { StringDecoder } from 'node:string_decoder';

const MAGIC = Buffer.from('CFWALLET09\0');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES;
const SCRYPT_OPTIONS = { N: 1 << 16, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const API_ORIGIN = 'https://api.cloudflare.com/client/v4';
// Scoped wallet/financial evidence only. Not a full Cloudflare KV disaster recovery backup.
export const WALLET_PREFIXES = Object.freeze([
  'customer:user:', 'customer:data:',
  'paystack:pending:', 'paystack:processed:', 'paystack:customer:', 'paystack:dva:', 'paystack:user-customer:',
  'korapay:pending:', 'korapay:processed:',
  'pocketfi:va:', 'pocketfi:pending:', 'pocketfi:processed:', 'pocketfi:last:',
  'manual:payment:', 'manual:recent:', 'manual:notification:',
  'referral:code:', 'referral:invitee:', 'referral:referrer:'
]);
const SHA = x => crypto.createHash('sha256').update(x).digest('hex');
const saneInt = x => Number.isSafeInteger(x) && x >= 0;
function keyFromPassphrase(passphrase, salt) {
  if (typeof passphrase !== 'string' || Buffer.byteLength(passphrase, 'utf8') < 32) {
    throw new Error('Backup passphrase must be 32+ UTF-8 bytes and stored securely outside GitHub.');
  }
  return crypto.scryptSync(passphrase, salt, 32, SCRYPT_OPTIONS);
}
function requireName(x, label, re) {
  if (typeof x !== 'string' || !re.test(x)) throw new Error(`Missing/invalid ${label}`);
  return x;
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// This method uses exclusively HTTP GET and retry logic for transient failures.
export function kvApiClient({accountId, namespaceId, token, fetchImpl = fetch, pause = sleep}) {
  requireName(accountId, 'Cloudflare account ID', /^[a-f0-9]{32}$/i);
  requireName(namespaceId, 'KV namespace ID', /^[a-f0-9]{32}$/i);
  if (!token || token.length < 10) throw new Error('Missing read-only KV API token');
  const base = `${API_ORIGIN}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  async function request(url,{method='GET', body}={}) {
    if (method !== 'GET' && !(method === 'POST' && url === base + '/bulk/get')) throw new Error('Disallowed API endpoint/method');
    for (let attempt = 0; attempt < 6; attempt++) {
      let response;
      try {
        response = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? {'Content-Type':'application/json'} : {}) }, ...(body?{body:JSON.stringify(body)}:{}), redirect: 'error' });
      } catch {
        if (attempt === 5) throw new Error('Cloudflare KV GET failed after retries');
        await pause(Math.min(8000, 300 * (2 ** attempt))); continue;
      }
      if (response.ok || (method==='POST' && response.status===413)) return response;
      if (response.status === 429 || response.status >= 500) {
        if (attempt === 5) throw new Error(`Cloudflare KV GET returned ${response.status} after retries`);
        const retry = Number(response.headers.get('retry-after'));
        await pause(Number.isFinite(retry) && retry >= 0 ? Math.min(15000, retry * 1000) : Math.min(8000, 300 * (2 ** attempt)));
        continue;
      }
      throw new Error(`Cloudflare KV GET rejected (HTTP ${response.status}); verify read-only token, account and namespace.`);
    }
    throw new Error('Cloudflare KV GET retries exhausted');
  }
  return {
    async list(prefix, cursor = '') {
      const u = new URL(base + '/keys');
      u.searchParams.set('prefix', prefix);
      u.searchParams.set('limit', '1000');
      if (cursor) u.searchParams.set('cursor', cursor);
      const r = await request(u.toString());
      const body = await r.json();
      if (body.success !== true || !Array.isArray(body.result)) throw new Error('Unexpected KV list response');
      const next = String(body.result_info?.cursor || '');
      return { keys: body.result, next };
    },
    async value(key) {
      const r = await request(base + '/values/' + encodeURIComponent(key));
      return Buffer.from(await r.arrayBuffer());
    },
    // Cloudflare defines POST /bulk/get as a READ operation. No POST to any other path.
    async bulk(keys) {
      if (!keys.length) return new Map();
      if (keys.length > 40) throw new Error('Backup bulk read is limited to 40 keys per request');
      const r = await request(base + '/bulk/get',{method:'POST',body:{keys,type:'text',withMetadata:false}});
      if (r.status===413) {
        if (keys.length===1) return new Map([[keys[0],await this.value(keys[0])]]);
        const mid=Math.ceil(keys.length/2);
        return new Map([...(await this.bulk(keys.slice(0,mid))),...(await this.bulk(keys.slice(mid)))]);
      }
      const body = await r.json();
      const values=body?.result?.values;
      if (body.success!==true || !values || typeof values!=='object') throw new Error('Invalid read-only KV bulk-get response');
      const found=new Map();
      for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(values,key) || typeof values[key]!=='string') {
          throw new Error('KV key missing from bulk read; snapshot may have raced an expiration/deletion');
        }
        found.set(key,Buffer.from(values[key],'utf8'));
      }
      return found;
    }
  };
}

function walletState(raw, key, state) {
  const id = key.slice('customer:data:'.length);
  let data;
  try { data = JSON.parse(raw.toString('utf8')); } catch { state.badJson++; state.issues.set(id, ['invalid_json']); return; }
  const w = data?.wallet;
  const issues = [];
  if (!w || typeof w !== 'object' || Array.isArray(w)) issues.push('missing_wallet');
  else {
    if (!saneInt(w.balanceSeconds)) issues.push('invalid_balance');
    if (!saneInt(w.revision)) issues.push('invalid_revision');
    if (!Array.isArray(w.purchases)) issues.push('missing_purchase_history');
    if (!Array.isArray(w.usage)) issues.push('missing_usage_history');
    if (saneInt(w.balanceSeconds)) state.balanceSeconds += BigInt(w.balanceSeconds);
    state.purchases += Array.isArray(w.purchases) ? w.purchases.length : 0;
    state.usage += Array.isArray(w.usage) ? w.usage.length : 0;
    for (const entry of (Array.isArray(w.purchases) ? w.purchases : [])) {
      const provider = String(entry?.provider || '').trim().toLowerCase();
      const ref = String(entry?.reference || entry?.id || '').trim();
      if (!provider || !ref) { state.unidentifiedPurchaseEntries++; continue; }
      const fingerprint = SHA(provider + '\0' + ref);
      const former = state.paymentOwner.get(fingerprint);
      if (former && former !== id) { state.conflictingPurchaseReferences++; issues.push('cross_customer_purchase_reference'); }
      else state.paymentOwner.set(fingerprint, id);
    }
  }
  if (issues.length) state.issues.set(id, [...new Set(issues)]);
}

async function encryptedWriter(filename, passphrase) {
  const salt = crypto.randomBytes(SALT_BYTES), iv = crypto.randomBytes(IV_BYTES);
  const key = keyFromPassphrase(passphrase, salt);
  fs.mkdirSync(path.dirname(filename), {recursive:true, mode:0o700});
  const output = fs.createWriteStream(filename, {flags:'wx', mode:0o600});
  await once(output, 'open');
  output.write(Buffer.concat([MAGIC,salt,iv]));
  const cipher = crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(MAGIC);
  cipher.pipe(output);
  let lines = 0;
  return {
    async line(o) {
      if (!cipher.write(JSON.stringify(o) + '\n')) await once(cipher,'drain');
      lines++;
    },
    async close() {
      cipher.end();
      await finished(output);
      fs.appendFileSync(filename,cipher.getAuthTag());
      return lines;
    },
    async abort() { cipher.end(); await finished(output).catch(()=>{}); }
  };
}

export async function verifyArchive(filename, passphrase, {returnContents=false}={}) {
  const stat = fs.statSync(filename);
  if (stat.size <= HEADER_BYTES + TAG_BYTES) throw new Error('Archive is truncated');
  const fd = fs.openSync(filename,'r');
  const header=Buffer.alloc(HEADER_BYTES),tag=Buffer.alloc(TAG_BYTES);
  try {
    fs.readSync(fd,header,0,header.length,0);
    fs.readSync(fd,tag,0,TAG_BYTES,stat.size-TAG_BYTES);
  } finally { fs.closeSync(fd); }
  if (!header.subarray(0,MAGIC.length).equals(MAGIC)) throw new Error('Not a CallFocus v16.09 archive');
  const salt=header.subarray(MAGIC.length,MAGIC.length+SALT_BYTES);
  const iv=header.subarray(MAGIC.length+SALT_BYTES);
  const decipher=crypto.createDecipheriv('aes-256-gcm',keyFromPassphrase(passphrase,salt),iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  const ciphertext=fs.createReadStream(filename,{start:HEADER_BYTES,end:stat.size-TAG_BYTES-1});
  ciphertext.pipe(decipher);
  let buffer='', lines=0, first=null, last=null;
  const decoder = new StringDecoder('utf8');
  const all=[];
  for await (const chunk of decipher) {
    buffer += decoder.write(chunk);
    let index;
    while ((index=buffer.indexOf('\n'))!==-1) {
      const line = buffer.slice(0,index);
      buffer=buffer.slice(index+1);
      const data=JSON.parse(line);
      if (!first) first=data;
      last=data;
      if (returnContents) all.push(data);
      lines++;
    }
  }
  buffer += decoder.end();
  if (buffer) throw new Error('Incomplete JSONL last record');
  if (first?.kind !== 'manifest' || last?.kind !== 'footer' || last?.complete !== true) throw new Error('Archive missing manifest or footer');
  if (last.recordCount !== lines-2) throw new Error('Archive record-count mismatch');
  return {verified:true,lines,records:last.recordCount,completedAt:last.finishedAt,summary:last.summary,...(returnContents?{all}:{})};
}

export async function takeSnapshot({accountId,namespaceId,token,passphrase,outputDir,fetchImpl=fetch,pause=sleep,now=()=>new Date().toISOString(),checkStability=true}={}) {
  const api = kvApiClient({accountId,namespaceId,token,fetchImpl,pause});
  const stamp = now().replace(/[:.]/g,'-');
  const filename=path.join(outputDir,`callfocus-wallet-${stamp}.cfw09`);
  const reportFile=path.join(outputDir,`callfocus-wallet-${stamp}-summary.json`);
  const writer=await encryptedWriter(filename,passphrase);
  const state={users:new Set(), dataKeys:new Set(), issues:new Map(), paymentOwner:new Map(), hashes:new Map(),
    balanceSeconds:0n,purchases:0,usage:0,badJson:0,unidentifiedPurchaseEntries:0,conflictingPurchaseReferences:0,
    countByPrefix:{},readCount:0,pages:0,driftCount:0};
  const startedAt=now();
  try {
    await writer.line({kind:'manifest',version:'16.09',startedAt,scope:'WALLET_PREFIXES_ONLY_NOT_ALL_KV',prefixes:WALLET_PREFIXES});
    for (const prefix of WALLET_PREFIXES) {
      const seenCursors=new Set();let cursor='',keyCount=0;
      do {
        const page=await api.list(prefix,cursor);state.pages++;
        for (let offset=0;offset<page.keys.length;offset+=40) {
          const chunk=page.keys.slice(offset,offset+40);
          for (const entry of chunk) if (typeof entry?.name!=='string' || !entry.name.startsWith(prefix)) throw new Error('KV list returned unexpected key');
          const values=await api.bulk(chunk.map(entry=>entry.name));
          for (const entry of chunk) {
            const key=entry.name;
            const value=values.get(key);
            if (!value) throw new Error('KV key not returned from read-only bulk request');
            await writer.line({kind:'kv',key,expiration:entry.expiration??null,metadata:entry.metadata??null,valueB64:value.toString('base64')});
            keyCount++;state.readCount++;
            if (prefix==='customer:user:') state.users.add(key.slice(prefix.length));
            if (prefix==='customer:data:') {
              const id=key.slice(prefix.length);state.dataKeys.add(id);
              state.hashes.set(id,SHA(value));
              walletState(value,key,state);
            }
          }
        }
        cursor=page.next;
        if (cursor && seenCursors.has(cursor)) throw new Error('KV cursor repeated, aborting incomplete enumeration');
        if (cursor) seenCursors.add(cursor);
      } while (cursor);
      state.countByPrefix[prefix]=keyCount;
    }
    if (!state.users.size || !state.dataKeys.size) throw new Error('No customer wallets found. Refusing to mark backup complete.');
    let missingData=0,orphanData=0;
    for (const id of state.users) if (!state.dataKeys.has(id)) {missingData++;state.issues.set(id,['user_missing_data']);}
    for (const id of state.dataKeys) if (!state.users.has(id)) {orphanData++;state.issues.set(id,[...new Set([...(state.issues.get(id)||[]),'data_missing_user'])]);}
    // Second read is a drift detector, never a guarantee of an atomic point-in-time snapshot.
    if (checkStability) {
      const saved=[...state.hashes.entries()];
      for (let off=0;off<saved.length;off+=40) {
        const group=saved.slice(off,off+40);
        const values=await api.bulk(group.map(([id])=>'customer:data:'+id));
        for (const [id,hash] of group) {
          const reread=values.get('customer:data:'+id);
          if (!reread || SHA(reread)!==hash) {state.driftCount++;state.issues.set(id,[...new Set([...(state.issues.get(id)||[]),'changed_during_scan'])]);}
        }
      }
    }
    for (const [userId, issues] of state.issues) await writer.line({kind:'audit',userId,issues});
    const summary={version:'16.09',startedAt,finishedAt:now(),scope:'wallet_relevant_KV_keys_only',
      warning:'Non-atomic KV scan. Not a full-site or verified point-in-time backup; no D1 import or cutover.',
      accountUsers:state.users.size,walletDataRecords:state.dataKeys.size,missingData,orphanData,
      invalidOrMissingWalletRecords:state.issues.size,changedDuringScan:state.driftCount,
      purchaseEntries:state.purchases,usageEntries:state.usage,badJson:state.badJson,
      unidentifiedPurchaseEntries:state.unidentifiedPurchaseEntries,
      conflictingPurchaseReferences:state.conflictingPurchaseReferences,
      totalBalanceSeconds:state.balanceSeconds.toString(),countByPrefix:state.countByPrefix,
      kvKeysRead:state.readCount,pagesRead:state.pages,
      needsHumanReconciliation:state.issues.size>0 || state.unidentifiedPurchaseEntries>0 || state.driftCount>0,
      safeToCutOver:false,fullyReconciled:false};
    const lines=state.readCount+state.issues.size;
    await writer.line({kind:'footer',complete:true,finishedAt:summary.finishedAt,recordCount:lines,summary});
    await writer.close();
    await verifyArchive(filename,passphrase);
    fs.writeFileSync(reportFile,JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
    return {filename,reportFile,summary};
  } catch (err) {
    await writer.abort();
    try{fs.rmSync(filename,{force:true});}catch{}
    try{fs.rmSync(reportFile,{force:true});}catch{}
    throw err;
  }
}

function cliError(err) { console.error(`V16.09 wallet snapshot failed: ${err.message}`); process.exitCode=1; }
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [mode,arg] = process.argv.slice(2);
  const passphrase=process.env.CALLFOCUS_BACKUP_PASSPHRASE;
  if (mode==='snapshot') {
    takeSnapshot({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,
      namespaceId:process.env.CALLFOCUS_KV_NAMESPACE_ID,
      token:process.env.CLOUDFLARE_KV_READ_TOKEN,
      passphrase,
      outputDir:process.env.CALLFOCUS_BACKUP_OUT || path.join(os.tmpdir(),'callfocus-wallet-v16.09')})
      .then(({summary,filename,reportFile})=>{console.log(`Encrypted archive created and verified; summary path: ${reportFile}; encrypted path: ${filename}`);console.log(JSON.stringify({accountUsers:summary.accountUsers,walletDataRecords:summary.walletDataRecords,kvKeysRead:summary.kvKeysRead,changedDuringScan:summary.changedDuringScan,safeToCutOver:false}));})
      .catch(cliError);
  } else if (mode==='verify' && arg) {
    verifyArchive(arg,passphrase).then(x=>console.log(JSON.stringify(x,null,2))).catch(cliError);
  } else {
    console.error('Usage: node scripts/wallet-snapshot-v16.09.mjs snapshot | verify <encrypted-file>'); process.exitCode=2;
  }
}
