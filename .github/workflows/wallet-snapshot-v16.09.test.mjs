// V16.09 self-contained fake Cloudflare REST tests. No real network, no live KV/D1 writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { takeSnapshot, verifyArchive, WALLET_PREFIXES } from '../scripts/wallet-snapshot-v16.09.mjs';
const accountId='a'.repeat(32), namespaceId='b'.repeat(32), token='fixture_read_only_key', passphrase='a-strong-backup-secret-only-for-test-use-123';
const entries = new Map([
  ['customer:user:u1', JSON.stringify({id:'u1',name:'Test One'})],
  ['customer:user:u2', JSON.stringify({id:'u2',name:'Test Two'})],
  ['customer:user:u3', JSON.stringify({id:'u3',name:'Test Three'})],
  ['customer:data:u1', JSON.stringify({wallet:{balanceSeconds:360,revision:2,purchases:[{provider:'pocketfi',reference:'PFI|A'}],usage:[]}})],
  ['customer:data:u2', JSON.stringify({wallet:{balanceSeconds:720,revision:1,purchases:[{provider:'pocketfi',reference:'PFI|B'}],usage:[]}})],
  ['pocketfi:va:receipt-A', JSON.stringify({reference:'PFI|A',amount:3000})],
  ['korapay:processed:test', 'processed'],
  ['manual:payment:test','metadata'],
]);
let requestCount=0, valuesCount=0, mutations=0, fail=false, drift=false;
const keys = [...entries.keys()];
async function mockFetch(rawUrl, opts={}){
  requestCount++;
  assert(['GET','POST'].includes(opts.method));
  if (opts.method==='POST') assert(rawUrl.endsWith('/bulk/get')); // Cloudflare read-only bulk endpoint
  if (!['GET','POST'].includes(opts.method) || (opts.method==='POST' && !rawUrl.endsWith('/bulk/get'))) mutations++;
  assert.equal(opts.headers?.Authorization,`Bearer ${token}`);
  const url=new URL(rawUrl);
  assert(url.pathname.startsWith(`/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/`));
  if (url.pathname.endsWith('/keys')) {
    const prefix=url.searchParams.get('prefix');assert(WALLET_PREFIXES.includes(prefix));
    const matched=keys.filter(k=>k.startsWith(prefix));
    const offset=Number(url.searchParams.get('cursor')||0);
    // Two-key pages, including an empty page with cursor if desired in fixture.
    const subset=matched.slice(offset,offset+2);
    return Response.json({success:true,result:subset.map(name=>({name})),result_info:{cursor:offset+2<matched.length?String(offset+2):''}});
  }
  if (url.pathname.endsWith('/bulk/get')) {
    assert.equal(opts.method,'POST');
    const body=JSON.parse(opts.body);
    assert.equal(body.type,'text');
    // Force 413 on an oversized batch to exercise safe read-only split-and-retry.
    if (body.keys.length>2) return new Response('too large',{status:413});
    const values={};
    for (const key of body.keys) {
      valuesCount++;
      if (fail && key==='customer:data:u2') return new Response('missing',{status:404});
      values[key]=drift && key==='customer:data:u1' && valuesCount>entries.size
        ? JSON.stringify({wallet:{balanceSeconds:350,revision:3,purchases:[],usage:[]}})
        : entries.get(key);
    }
    return Response.json({success:true,result:{values}});
  }
  if (url.pathname.includes('/values/')){
    const key=decodeURIComponent(url.pathname.slice(url.pathname.indexOf('/values/')+8));
    valuesCount++;
    if (fail && key==='customer:data:u2') return new Response('not found',{status:404});
    const value=drift&&key==='customer:data:u1'&&valuesCount>keys.length
      ? JSON.stringify({wallet:{balanceSeconds:350,revision:3,purchases:[],usage:[]}})
      : entries.get(key);
    assert(value!==undefined,`Unknown fake KV key: ${key}`);
    return new Response(value,{status:200});
  }
  throw new Error('Unexpected API endpoint');
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cf-v1609-test-'));
try{
  const r=await takeSnapshot({accountId,namespaceId,token,passphrase,outputDir:temp,fetchImpl:mockFetch,now:()=>new Date().toISOString(),pause:async()=>{}});
  assert.equal(r.summary.accountUsers,3);
  assert.equal(r.summary.walletDataRecords,2);
  assert.equal(r.summary.missingData,1);
  assert.equal(r.summary.walletDataRecords,2);
  assert.equal(r.summary.totalBalanceSeconds,'1080');
  assert.equal(r.summary.changedDuringScan,0);
  assert.equal(r.summary.safeToCutOver,false);
  assert.equal(r.summary.needsHumanReconciliation,true);
  assert.equal(mutations,0);
  assert(requestCount>entries.size);
  assert(!fs.readFileSync(r.filename).includes(Buffer.from('Test One')));
  assert(!fs.readFileSync(r.filename).includes(Buffer.from('PFI|A')));
  const v=await verifyArchive(r.filename,passphrase,{returnContents:true});
  assert.equal(v.verified,true);
  assert.equal(v.records,entries.size+1);
  assert.equal(v.all.filter(x=>x.kind==='kv').length,entries.size);
  assert.equal(v.all.filter(x=>x.kind==='audit').length,1);
  assert.equal(v.all.find(x=>x.key==='customer:data:u1')?.valueB64,Buffer.from(entries.get('customer:data:u1')).toString('base64'));
  await assert.rejects(()=>verifyArchive(r.filename,'a completely different long test backup password'),/authenticate|Unsupported state/i);
  const encrypted=fs.readFileSync(r.filename);
  const tampered=path.join(temp,'tampered.cfw09'); encrypted[encrypted.length-20]^=1;fs.writeFileSync(tampered,encrypted);
  await assert.rejects(()=>verifyArchive(tampered,passphrase),/authenticate|Unsupported state|JSON/i);
  // Read failures must not publish partial archive, and should never mutate KV.
  fail=true;
  const before=new Set(fs.readdirSync(temp));
  await assert.rejects(()=>takeSnapshot({accountId,namespaceId,token,passphrase,outputDir:temp,fetchImpl:mockFetch,now:()=>new Date('2026-10-21T00:00:00Z').toISOString(),pause:async()=>{}}),/HTTP 404/);
  const after=fs.readdirSync(temp).filter(f=>!before.has(f));
  assert.deepEqual(after,[]);
  fail=false;drift=true;valuesCount=0;
  const d=await takeSnapshot({accountId,namespaceId,token,passphrase,outputDir:temp,fetchImpl:mockFetch,now:()=>new Date('2026-10-22T00:00:00Z').toISOString(),pause:async()=>{}});
  assert(d.summary.changedDuringScan>=1);
  assert.equal(d.summary.safeToCutOver,false);
  console.log('PASS: V16.09 encrypted wallet snapshot, pagination, audit, no live writes, archive integrity, corrupted/wrong-secret rejection, partial-failure cleanup, drift detection');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
