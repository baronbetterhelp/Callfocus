import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toggleAccount5,slotAdmin} from './permanent-voice-slots-worker.js';
const root=new URL('.',import.meta.url);
const script=fs.readFileSync(new URL('permanent-slots-admin.js',root),'utf8');
const html=fs.readFileSync(new URL('admin.html',root),'utf8');
const worker=fs.readFileSync(new URL('_worker.js',root),'utf8');
const config=fs.readFileSync(new URL('wrangler.jsonc',root),'utf8');
assert.match(html, /Account 5 setup/);
assert.match(html, /id="cfSlot_pool5AcceptNew" type="checkbox" disabled/);
assert.match(html, /permanent-slots-admin.js\?v=16\.66/);
assert.match(worker, /X-CallFocus-Voice-Admin-Build/);
assert.match(config, /"\/permanent-slots-admin.js"/);
console.log('PASS Account 5 control is present, disabled until initialized, and routed through Worker');
const ids=['cfSlotSave','cfSlotStatus','cfSlotRefresh','cfSlotAccount4Verify','cfSlotAccount5Verify','cfSlot_pool4AcceptNew','cfSlot_pool5AcceptNew','cfSlot_headline','cfSlot_enabled','cfSlot_slotLimit','cfSlot_popupEnabled','cfSlot_forceFull','cfSlot_minimumCredits','cfSlot_eventDate','cfSlot_bookingOpensAt','cfSlot_bookingClosesAt','cfSlot_message','cfSlot_fullMessage','cfSlot_telegramUrl','cfSlotAccount4Status','cfSlotAccount5Status','cfSlotGlobalTotal','cfSlotGlobalCreated','cfSlotGlobalPending','cfSlotGlobalEligible','cfSlotGlobalRelease','cfSlotPools','cfSlotProvider','cfSlotBookings','adminDashboard','cfSlotReleaseBtn','cfSlotReleaseCount','cfSlotReleaseConfirm','cfSlotReleaseStatus'];
const snap=(build,revision,enabled)=>({ok:true,voiceAdminBuild:build,settings:{revision,pool4AcceptNew:false,pool5AcceptNew:enabled,enabled:true,popupEnabled:true,popupDelaySeconds:1,slotLimit:150,minimumCredits:1000,headline:'Title',message:'Text',fullMessage:'All filled',telegramUrl:'https://t.me/callfocus',eventDate:'',bookingOpensAt:'',bookingClosesAt:''},booked:120,total:150,remaining:0,created:118,pending:2,reclaimable:0,paidPurchases:42,account4:{ready:true,message:'Connected'},account5:{ready:true,message:'Account 5 verified'},pools:{pool4:{ok:true,voiceSlotsUsed:25,voiceSlotLimit:30,reserved:30,created:25,apiKeyConfigured:true},pool5:{ok:true,voiceSlotsUsed:0,voiceSlotLimit:30,reserved:0,created:0,apiKeyConfigured:true}},bookings:[]});
function setup({build='16.66',postBuild='16.66',reject=false}={}){
 let rev=5,enabled=false,posts=0;
 const els={};for(const id of ids){const handlers={};els[id]={id,type:id.includes('pool')||['cfSlot_enabled','cfSlot_popupEnabled','cfSlot_forceFull'].includes(id)?'checkbox':id==='cfSlot_slotLimit'||id==='cfSlot_minimumCredits'?'number':'text',checked:false,value:'',textContent:'',disabled:id==='cfSlot_pool5AcceptNew'||id==='cfSlotAccount5Verify',handlers,addEventListener(event,cb){(handlers[event]??=[]).push(cb)},classList:{contains(){return false}},trigger(event){return Promise.all((handlers[event]||[]).map(cb=>cb()))}}}
 const calls=[];
 const fetchMock=async (url,options={})=>{calls.push([url,options.method||'GET']);
   if(url==='/api/admin/permanent-slots'&&(!options.method||options.method==='GET'))return {ok:true,json:async()=>snap(build,rev,enabled)};
   if(url==='/api/admin/permanent-slots/account5'){
     posts++;
     if(reject)return {ok:false,json:async()=>({ok:false,error:'Agent ID verification failed'})};
     enabled=JSON.parse(options.body).enabled;rev++;
     return {ok:true,json:async()=>({ok:true,pool5AcceptNew:enabled,revision:rev,voiceAdminBuild:postBuild})};
   }
   throw Error('Unexpected '+url)
 };
 const context={document:{getElementById(id){return els[id]||null},querySelector(){return null}},window:{},localStorage:{getItem(){return 'session'}},sessionStorage:{getItem(){return ''}},MutationObserver:class {observe(){}},fetch:fetchMock,console};
 vm.runInNewContext(script,context);
 const settle=()=>new Promise(r=>setTimeout(r,3));
 return {els,context,calls,settle,get posts(){return posts},get enabled(){return enabled}};
}
let t=setup({build:'16.65'});await t.settle();assert.equal(t.els.cfSlot_pool5AcceptNew.disabled,true);assert.match(t.els.cfSlotAccount5Status.textContent,/do not match/i);assert.equal(t.posts,0);console.log('PASS stale Worker never activates Account 5 and reports precise version mismatch');
t=setup();await t.settle();assert.equal(t.els.cfSlot_pool5AcceptNew.disabled,false);assert.match(t.els.cfSlotAccount5Status.textContent,/Account 5 verified/);t.els.cfSlot_pool5AcceptNew.checked=true;await t.els.cfSlot_pool5AcceptNew.trigger('change');assert.equal(t.posts,1);assert.equal(t.enabled,true);assert.match(t.els.cfSlotAccount5Status.textContent,/enabled and saved successfully/);console.log('PASS verified matching build saves Account 5 activation immediately');
t=setup({reject:true});await t.settle();t.els.cfSlot_pool5AcceptNew.checked=true;await t.els.cfSlot_pool5AcceptNew.trigger('change');assert.equal(t.els.cfSlot_pool5AcceptNew.checked,false);assert.match(t.els.cfSlotAccount5Status.textContent,/NOT saved/);console.log('PASS failed activation is explicit and does not show a false success');
t=setup({postBuild:'16.65'});await t.settle();t.els.cfSlot_pool5AcceptNew.checked=true;await t.els.cfSlot_pool5AcceptNew.trigger('change');assert.match(t.els.cfSlotAccount5Status.textContent,/NOT saved/);console.log('PASS unexpected server change during POST reports a build error');
const settings={pool5AcceptNew:false,revision:1,slotLimit:150};const env={CALLFOCUS_CONFIG:{async get(){return settings},async put(key,value){Object.assign(settings,JSON.parse(value));}},ELEVENLABS_PERMANENT_5_API_KEY:'test-key',ELEVENLABS_PERMANENT_5_AGENT_ID:'agent-test'};
const prevFetch=globalThis.fetch;
globalThis.fetch=async url=>url.toString().includes('user/subscription')?{ok:true,json:async()=>({status:'active',voice_limit:30,voice_slots_used:0,can_use_instant_voice_cloning:true})}:{ok:true,json:async()=>({agent_id:'agent-test'})};
let res=await toggleAccount5(new Request('https://callfocus.link/api/admin/permanent-slots/account5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true})}),env);assert.equal(res.status,200);let d=await res.json();assert.equal(d.voiceAdminBuild,'16.66');assert.equal(settings.pool5AcceptNew,true);
res=await toggleAccount5(new Request('https://callfocus.link/api/admin/permanent-slots/account5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true})}),env);assert.equal((await res.json()).unchanged,true);
globalThis.fetch=prevFetch;
console.log('PASS Account 5 backend responds with matching build and preserves existing settings');
