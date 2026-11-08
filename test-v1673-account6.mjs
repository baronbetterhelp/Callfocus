import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toggleAccount6,slotSettings,slotAdmin} from './permanent-voice-slots-worker.js';
const root=new URL('.',import.meta.url);
const file=x=>fs.readFileSync(new URL(x,root),'utf8');
const html=file('admin.html'),admin=file('permanent-slots-admin.js'),server=file('_worker.js'),pool=file('permanent-voice-slots-worker.js');
assert.match(html,/Account 6 setup/);
assert.match(html,/id="cfSlot_pool6AcceptNew" type="checkbox" disabled/);
assert.match(html,/id="cfSlotAccount6Verify" type="button" disabled/);
assert.match(html,/permanent-slots-admin\.js\?v=16\.73/);
assert.match(server,/\/api\/admin\/permanent-slots\/account6/);
assert.match(server,/adminAuthorized\(request,env\)/);
assert.match(pool,/pool==='pool6'\?s\.pool6AcceptNew===true/);
assert.match(pool,/provider_pool\|\|'primary'/);
assert.match(file('elevenlabs-worker.js'),/\^pool\(\?:\[4-9\]\|10\)\$/);
assert.match(file('VERSION'),/^16\.73/);
console.log('PASS account6 UI, built-in provider routing, opt-in and worker guard are present');
const baseSettings={pool4AcceptNew:true,pool5AcceptNew:true,revision:21,slotLimit:150,enabled:true};
const secretApi='test-key-6',agentId='agent-test-6';
let settings={...baseSettings};let fetchLog=[];let mode='good';
const env={CALLFOCUS_CONFIG:{async get(){return structuredClone(settings)},async put(key,value){settings=JSON.parse(value)}},ELEVENLABS_PERMANENT_6_API_KEY:secretApi,ELEVENLABS_PERMANENT_6_AGENT_ID:agentId};
const prevFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 fetchLog.push(String(url));
 if(String(url).endsWith('/user/subscription'))return {ok:true,json:async()=>({status:'active',tier:mode==='creator'?'creator':'pro',voice_limit:160,voice_slots_used:mode==='full'?160:0,voice_add_edit_counter:mode==='ops'?290:0,max_voice_add_edits:290,can_use_instant_voice_cloning:true})};
 if(String(url).includes('/convai/agents/'))return {ok:mode!=='agent-fail',status:404,json:async()=>({agent_id:mode==='wrong-agent'?'not-the-same':agentId})};
 throw Error('Unexpected fetch '+url);
};
const req=enabled=>new Request('https://callfocus.link/api/admin/permanent-slots/account6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})});
try {
 let response;
 delete env.ELEVENLABS_PERMANENT_6_API_KEY;
 response=await toggleAccount6(req(true),env);assert.equal(response.status,409);assert.equal(settings.pool6AcceptNew,undefined);assert.equal(fetchLog.length,0);
 env.ELEVENLABS_PERMANENT_6_API_KEY=secretApi;
 for(const flag of ['creator','full','ops','wrong-agent','agent-fail']){
  mode=flag;response=await toggleAccount6(req(true),env);assert.equal(response.status,409,flag);assert.equal(settings.pool6AcceptNew,undefined,flag);
 }
 mode='good';response=await toggleAccount6(req(true),env);assert.equal(response.status,200);assert.deepEqual((await response.json()).pool6AcceptNew,true);assert.equal(settings.pool6AcceptNew,true);
 assert.equal(settings.pool4AcceptNew,true);assert.equal(settings.pool5AcceptNew,true);assert.equal(settings.revision,22);
 const calls=fetchLog.length;response=await toggleAccount6(req(true),env);assert.equal((await response.json()).unchanged,true);assert.equal(fetchLog.length,calls);
 response=await toggleAccount6(req(false),env);assert.equal(response.status,200);assert.equal(settings.pool6AcceptNew,false);assert.equal(settings.pool4AcceptNew,true);
 console.log('PASS missing credentials, full storage, exhausted operations, wrong/missing agent rejected; verified enable, idempotence, disable preserve accounts 4/5');
} finally { globalThis.fetch=prevFetch; }
// Verify the browser controller holds the switch OFF for an older Worker.
const ids=['cfSlotSave','cfSlotStatus','cfSlotRefresh','cfSlotAccount4Verify','cfSlotAccount5Verify','cfSlotAccount6Verify','cfSlot_pool4AcceptNew','cfSlot_pool5AcceptNew','cfSlot_pool6AcceptNew','cfSlotAccount4Status','cfSlotAccount5Status','cfSlotAccount6Status','adminDashboard','cfSlotPools','cfSlotProvider','cfSlotBookings'];
function clientHarness(serverBuild='16.73'){
 const els={};for(const id of ids){els[id]={id,checked:false,value:'',disabled:id.includes('Account6Verify')||id.includes('pool6AcceptNew'),type:id.includes('AcceptNew')?'checkbox':'text',textContent:'',handlers:{},addEventListener(type,handler){(this.handlers[type]??=[]).push(handler)},async trigger(type){await Promise.all((this.handlers[type]||[]).map(fn=>fn()))},classList:{contains(){return false}}};}
 let enabled=false,post=0;
 const fetch=async (url,opts={})=>{
   if(url==='/api/admin/permanent-slots'&&(!opts.method||opts.method==='GET'))return {ok:true,json:async()=>({ok:true,voiceAdminBuild:serverBuild,settings:{...baseSettings,pool6AcceptNew:enabled,pool4AcceptNew:true,pool5AcceptNew:true,popupDelaySeconds:0,popupEnabled:true,forceFull:false,minimumCredits:1000,eventDate:'',bookingOpensAt:'',bookingClosesAt:'',headline:'A',message:'B',fullMessage:'C',telegramUrl:'https://t.me/callfocus'},booked:15,total:150,created:10,pending:5,remaining:0,pools:{pool4:{ok:true},pool5:{ok:true},pool6:{ok:false}},account4:{ready:true},account5:{ready:true},account6:{ready:false,message:'Add both Account 6 secrets in Cloudflare.'},bookings:[]})};
   if(url==='/api/admin/permanent-slots/account6'){post++;enabled=JSON.parse(opts.body).enabled;return {ok:true,json:async()=>({ok:true,voiceAdminBuild:'16.73',pool6AcceptNew:enabled,revision:23})};}
   throw Error('unexpected '+url);
 };
 const context={document:{getElementById:id=>els[id]||null,querySelector:()=>null},window:{},localStorage:{getItem(){return 'session'}},sessionStorage:{getItem(){return ''}},MutationObserver:class{observe(){}},fetch,console};
 vm.runInNewContext(admin,context);
 return {els,get post(){return post},get enabled(){return enabled}};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
let ui=clientHarness('16.66');await settle();assert.equal(ui.els.cfSlot_pool6AcceptNew.disabled,true);assert.equal(ui.post,0);assert.match(ui.els.cfSlotAccount6Status.textContent,/do not match/i);
ui=clientHarness('16.73');await settle();assert.equal(ui.els.cfSlot_pool6AcceptNew.disabled,false);assert.match(ui.els.cfSlotAccount6Status.textContent,/disabled/i);ui.els.cfSlot_pool6AcceptNew.checked=true;await ui.els.cfSlot_pool6AcceptNew.trigger('change');assert.equal(ui.post,1);assert.equal(ui.enabled,true);
console.log('PASS stale Worker prevents new account6 UI action; matching build saves toggle and confirms success');
