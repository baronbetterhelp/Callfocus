import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {subscriptionForUser,adminReport,renew,releaseExpired,startSubscriptionIfPurchased,view} from './cf-voice-subscriptions.js';
import {slotVoiceForUser} from './permanent-voice-slots-worker.js';
const raw = new DatabaseSync(':memory:');
raw.exec(`CREATE TABLE cf_permanent_voice_slots(user_id TEXT PRIMARY KEY,provider_pool TEXT,booked_at TEXT,state TEXT,voice_id TEXT,purchase_id TEXT,voice_name TEXT,created_at TEXT);CREATE TABLE cf_permanent_voice_slot_purchases(purchase_id TEXT PRIMARY KEY,user_id TEXT,state TEXT,paid_at TEXT,created_at TEXT);`);
const now = Date.now(); const iso=d=>new Date(now+d*86400000).toISOString();
// Seed 30 pre-existing purchases. Migration must protect them before release.
for(let i=0;i<30;i++){const uid=`old${i}`;raw.prepare('INSERT INTO cf_permanent_voice_slots(user_id,provider_pool,booked_at,state,voice_id,purchase_id,voice_name) VALUES(?,?,?,?,?,?,?)').run(uid,'primary',iso(-45),'ready',`legacyvoice${i}00000000`,null,`Old${i}`);}
raw.exec(readFileSync(new URL('./migrations/0002_voice_monthly_subscriptions.sql',import.meta.url),'utf8'));
assert.equal(raw.prepare("SELECT COUNT(*) n FROM cf_permanent_voice_subscriptions WHERE status='legacy'").get().n,30,'grandfather every existing purchase');
// New 30 accounts: 18 current subscribers, 12 overdue beyond grace.
for(let i=0;i<30;i++){
 const uid=`user${i}`,active=i<18,expiry=iso(active?10:-9),grace=iso(active?17:-2);
 raw.prepare('INSERT INTO cf_permanent_voice_slots(user_id,provider_pool,booked_at,state,voice_id,purchase_id,voice_name) VALUES(?,?,?,?,?,?,?)').run(uid,'pool6',iso(-45),'ready',`testVoice${i}00000000`,`newpurchase${i}`,`User${i}`);
 raw.prepare('INSERT INTO cf_permanent_voice_subscriptions(user_id,provider_pool,status,started_at,paid_through,grace_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(uid,'pool6','active',iso(-30),expiry,grace,iso(-30),iso(-30));
}
class D1Stmt{
 constructor(sql,params=[]){this.sql=sql;this.params=params;}
 bind(...params){return new D1Stmt(this.sql,params)}
 async first(){return raw.prepare(this.sql).get(...this.params)||null}
 async all(){return {results:raw.prepare(this.sql).all(...this.params)}}
 async run(){const r=raw.prepare(this.sql).run(...this.params);return {meta:{changes:Number(r.changes)}}}
}
const db={prepare(sql){return new D1Stmt(sql)},async batch(statements){raw.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());raw.exec('COMMIT');return out}catch(e){raw.exec('ROLLBACK');throw e}}};
const env={CALLFOCUS_WALLET_DB:db,ELEVENLABS_PERMANENT_6_API_KEY:'mock-key',CALLFOCUS_CONFIG:{
 async put(key,value){walletDB.set(key,JSON.parse(value))}
}};
const walletDB=new Map();
assert.equal((await subscriptionForUser(env,'old0')).state,'grandfathered');
assert.equal((await subscriptionForUser(env,'user0')).canUseVoice,true);
assert.equal((await subscriptionForUser(env,'user18')).canUseVoice,false);
assert.equal((await slotVoiceForUser(env,'user18')),null,'expired user cannot select/use saved voice');
assert.equal((await slotVoiceForUser(env,'old0')).voiceId,'legacyvoice000000000','grandfathered voice remains accessible');
let report=await adminReport(db);
assert.deepEqual([report.pools.pool6.total,report.pools.pool6.subscribed,report.pools.pool6.eligible],[30,18,12]);
assert.equal(report.pools.primary.grandfathered,30);
const origFetch=globalThis.fetch; let deleteCount=0;
globalThis.fetch=async(url,options)=>{assert(String(url).includes('/v1/voices/'));assert.equal(options.method,'DELETE');assert.equal(options.headers['xi-api-key'],'mock-key');deleteCount++;return new Response(null,{status:204})};
const input=new Request('https://cf.test/api/admin/permanent-slots/release-expired',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pool:'pool6',count:12,confirm:'RELEASE EXPIRED VOICES'})});
const result=await (await releaseExpired(input,env)).json();assert.equal(result.released,12,result.message);assert.equal(result.failed,0);assert.equal(deleteCount,12);
report=await adminReport(db);assert.deepEqual([report.pools.pool6.total,report.pools.pool6.subscribed,report.pools.pool6.eligible],[18,18,0]);
assert.equal(raw.prepare('SELECT COUNT(*) n FROM cf_permanent_voice_monthly_release_audit').get().n,12);
assert.equal(raw.prepare("SELECT COUNT(*) n FROM cf_permanent_voice_slots WHERE user_id LIKE 'old%'").get().n,30);
// Grace: not selectable, but invoice can be renewed before Admin releases it.
raw.prepare('UPDATE cf_permanent_voice_subscriptions SET paid_through=?,grace_until=? WHERE user_id=?').run(iso(-2),iso(5),'user0');
const balanceSeconds=3000;walletDB.set('customer:data:user0',{wallet:{balanceSeconds,revision:1,usage:[]}});
const helpers={auth:async()=>({user:{id:'user0',name:'User 0'}}),customerData:async(env,id)=>structuredClone(walletDB.get('customer:data:'+id)),normalizeWallet:v=>v};
const req=()=>new Request('https://cf.test/api/permanent-slots/renew',{method:'POST'});
const first=await (await renew(req(),env,helpers,1000)).json();assert.equal(first.ok,true,JSON.stringify(first));assert.equal(first.chargedCredits,1000);
const second=await renew(req(),env,helpers,1000);assert.equal(second.status,409,'cannot double-renew same 30-day period');
assert.equal(walletDB.get('customer:data:user0').wallet.balanceSeconds,balanceSeconds-600,'charged exactly once');
assert.equal(walletDB.get('customer:data:user0').wallet.usage.filter(x=>x.type==='permanent_voice_renewal').length,1);
assert.equal((await subscriptionForUser(env,'user0')).canUseVoice,true);
// Payment during the seven-day grace period must stay anchored to the existing billing day.
const renewedUntil=raw.prepare('SELECT paid_through FROM cf_permanent_voice_subscriptions WHERE user_id=?').get('user0').paid_through;
assert.ok(Math.abs(Date.parse(renewedUntil)-Date.parse(iso(28)))<1000,'renewal in grace extends prior due date by 30 days, not today');
// Decline renewal on protected permanent purchase
const lifetime=await renew(new Request('https://cf.test/renew',{method:'POST'}),env,{...helpers,auth:async()=>({user:{id:'old0',name:'Old'}})},1000);
assert.equal(lifetime.status,409);
// Newly paid slot begins active with thirty days
raw.prepare('INSERT INTO cf_permanent_voice_slots(user_id,provider_pool,booked_at,state,voice_id,purchase_id,voice_name) VALUES(?,?,?,?,?,?,?)').run('newbuyer','pool6',iso(0),'booked',null,'paidnew','New buyer');
raw.prepare('INSERT INTO cf_permanent_voice_slot_purchases VALUES(?,?,?,?,?)').run('paidnew','newbuyer','paid',iso(0),iso(0));
await startSubscriptionIfPurchased(db,{user_id:'newbuyer',provider_pool:'pool6',purchase_id:'paidnew',booked_at:iso(0)});
assert.equal((await subscriptionForUser(env,'newbuyer')).state,'active');
assert.equal((await subscriptionForUser(env,'newbuyer')).mayRenew,false);
globalThis.fetch=origFetch;
console.log('PASS: SQL migration/legacy protection, 30=18+12 pool view, 7-day release, 12 voice provider deletions, per-user voice blocking, renewal idempotency, 30-day new purchase');
