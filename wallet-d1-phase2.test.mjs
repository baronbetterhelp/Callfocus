// V16.08 Phase-2 isolated SQLite/D1 API compatibility tests. No Cloudflare/network calls.
// Run: node --no-warnings tests/wallet-d1-phase2.test.mjs
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const worker=fs.readFileSync(path.join(root,'_worker.js'),'utf8');
const start='// === BEGIN V16.08 PHASE 2 D1 WALLET ENGINE';
const stop='// === END V16.08 PHASE 2 D1 WALLET ENGINE ===';
const begin=worker.indexOf(start),end=worker.indexOf(stop);
assert(begin>=0&&end>begin);
const engine=worker.slice(begin,end+stop.length);
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(path.join(root,'migrations/0001_wallet_schema.sql'),'utf8'));
const getChangeStats = sql => !/^\s*SELECT\b/i.test(sql);
const d1 = {
  prepare(sql) {
    return {
      bind(...values) {
        const stmt = sqlite.prepare(sql);
        return {
          first:async()=>stmt.get(...values)||null,
          all:async()=>({success:true,results:stmt.all(...values)}),
          run:async()=>{const m=stmt.run(...values);return {success:true,meta:{changes:m.changes},results:[]}},
          sql, values
        };
      },
      first:async()=>sqlite.prepare(sql).get()||null,
      all:async()=>({success:true,results:sqlite.prepare(sql).all()}),
    };
  },
  async batch(statements) {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const out=statements.map(({sql,values})=>{
        const stmt=sqlite.prepare(sql);
        if (getChangeStats(sql)) {
          const m=stmt.run(...values);
          return {success:true,meta:{changes:Number(m.changes)},results:[]};
        }
        return {success:true,meta:{changes:0},results:stmt.all(...values)};
      });
      sqlite.exec('COMMIT');
      return out;
    } catch (err){sqlite.exec('ROLLBACK');throw err;}
  }
};
const ctx=vm.createContext({console,Date,Number,String,JSON,Error,Set,Array,Promise,URL,
  adminAuthorized:async()=>true,
  json:(obj,status=200)=>({status,body:obj}),
  customerDataKey:id=>`customer:data:${id}`,
  normalizeServerWallet:x=>x,
});
vm.runInContext(engine,ctx);
const post=vm.runInContext('cfD1WalletPost',ctx);
const reset=vm.runInContext('cfD1WalletSetBalance',ctx);
const preflight=vm.runInContext('handleAdminD1WalletPreflight',ctx);
const enabled={CALLFOCUS_WALLET_DB:d1,CALLFOCUS_D1_WALLET_WRITES_ENABLED:'enabled-after-audited-cutover'};
const disabled={CALLFOCUS_WALLET_DB:d1};
const q=sql=>sqlite.prepare(sql).all();
function seed(user,balance,verified=true){
  sqlite.prepare(`INSERT INTO wallet_accounts (user_id,balance_seconds,revision,migrated_at,updated_at) VALUES (?, ?,0,'2026-10-20','2026-10-20')`).run(user,balance);
  sqlite.prepare(`INSERT INTO wallet_migration_audit (user_id,kv_balance_seconds,kv_revision,imported_balance_seconds,import_state,observed_at) VALUES (?,?,0,?,?,?)`).run(user,balance,balance,verified?'verified':'imported','2026-10-20');
}
seed('alice',0);
seed('bob',360);
seed('unverified',1000,false);

// No live writes without explicit cutover guard, even if D1 exists.
await assert.rejects(()=>post(disabled,{userId:'alice',entryId:'p1',kind:'purchase',provider:'pocketfi',providerReference:'PFI|1',amountKobo:300000,deltaSeconds:180}),/disabled/);
assert.equal(q('SELECT count(*) AS n FROM wallet_journal')[0].n,0);

const purchase=(reference,seconds,entryId=reference)=>post(enabled,{userId:'alice',entryId,kind:'purchase',provider:'pocketfi',providerReference:reference,amountKobo:seconds*1000,deltaSeconds:seconds});
const [one,two] = await Promise.all([purchase('PFI|A',180),purchase('PFI|B',360)]);
assert.equal(one.applied,true);assert.equal(two.applied,true);
assert.equal(q("SELECT balance_seconds AS b FROM wallet_accounts WHERE user_id='alice'")[0].b,540);
assert.equal(q("SELECT count(*) AS n FROM wallet_journal WHERE user_id='alice'")[0].n,2);
const again=await purchase('PFI|A',180);
assert.equal(again.duplicate,true);
assert.equal(q("SELECT balance_seconds AS b FROM wallet_accounts WHERE user_id='alice'")[0].b,540);
await assert.rejects(()=>purchase('PFI|A',100,'another-entry'),/Conflicting/);

// Correctly records debits and rejects insufficient balances with no negative wallet.
let charged=await post(enabled,{userId:'alice',entryId:'voice-note:one',kind:'voice_note',deltaSeconds:-150});
assert.equal(charged.applied,true); assert.equal(charged.balanceSeconds,390);
charged=await post(enabled,{userId:'alice',entryId:'voice-note:two',kind:'voice_note',deltaSeconds:-1000});
assert.equal(charged.applied,false);assert.equal(charged.insufficientOrUnverified,true);
assert.equal(charged.balanceSeconds,390);
assert.equal(q("SELECT count(*) AS n FROM wallet_journal WHERE entry_id='voice-note:two'")[0].n,0);

// Reject unmigrated accounts even when balance is present.
const unverified=await post(enabled,{userId:'unverified',entryId:'p-unverified',kind:'purchase',provider:'paystack',providerReference:'CF-A',amountKobo:300000,deltaSeconds:180});
assert.equal(unverified.insufficientOrUnverified,true);
assert.equal(q("SELECT balance_seconds AS b FROM wallet_accounts WHERE user_id='unverified'")[0].b,1000);
await assert.rejects(()=>post(enabled,{userId:'nonexistent',entryId:'p-new',kind:'purchase',provider:'paystack',providerReference:'CF-NEW',amountKobo:300000,deltaSeconds:180}),/not seeded/);

// Set-balance delta calculated in SQL, idempotent resets cannot reverse later spending.
const zero=await reset(enabled,{userId:'bob',entryId:'admin:reset:1',balanceSeconds:0});
assert.equal(zero.applied,true);assert.equal(zero.balanceSeconds,0);
const duplicateReset=await reset(enabled,{userId:'bob',entryId:'admin:reset:1',balanceSeconds:0});
assert.equal(duplicateReset.applied,false);
await assert.rejects(()=>reset(enabled,{userId:'bob',entryId:'admin:reset:1',balanceSeconds:150}),/Conflicting/);
const journalReset=q("SELECT delta_seconds AS delta,balance_after_seconds AS after FROM wallet_journal WHERE entry_id='admin:reset:1'")[0];
assert.equal(journalReset.delta,-360);assert.equal(journalReset.after,0);

// An error in step 2 must roll back step 1, not leave history without balance.
sqlite.exec(`CREATE TRIGGER force_fail BEFORE UPDATE OF balance_seconds ON wallet_accounts WHEN NEW.user_id='bob' BEGIN SELECT RAISE(FAIL,'fake worker interruption'); END;`);
await assert.rejects(()=>post(enabled,{userId:'bob',entryId:'failure-simulated',kind:'purchase',provider:'pocketfi',providerReference:'PFI|ERROR',amountKobo:300000,deltaSeconds:180}),/interruption/);
assert.equal(q("SELECT count(*) AS n FROM wallet_journal WHERE entry_id='failure-simulated'")[0].n,0);
assert.equal(q("SELECT balance_seconds AS b FROM wallet_accounts WHERE user_id='bob'")[0].b,0);

// Admin preflight GET performs no writes and reports schema + verified count.
const before=q('SELECT count(*) AS n FROM wallet_journal')[0].n;
const status=await preflight({method:'GET',url:'https://callfocus.link/api/admin/d1-wallet/preflight'},disabled);
assert.equal(status.status,200);assert.equal(status.body.schemaReady,true);
assert.equal(status.body.writeCutover,false);assert.equal(status.body.counts.verifiedSnapshots,2);
assert.equal(q('SELECT count(*) AS n FROM wallet_journal')[0].n,before);

// Validation fails closed.
await assert.rejects(()=>post(enabled,{userId:'alice',entryId:'bad',kind:'purchase',deltaSeconds:10}),/provider/);
await assert.rejects(()=>post(enabled,{userId:'alice',entryId:'bad',kind:'admin_grant',deltaSeconds:1.5}),/integer/);

console.log('PASS: phase2 D1 staging ledger, concurrent payments, exact-once reference, debits, balance reset, missing account, unverified import, rollback, admin preflight, guard');
