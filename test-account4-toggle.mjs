import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {toggleAccount4} from './permanent-voice-slots-worker.js';
const originalFetch=globalThis.fetch;
let valid=true, kvFail=false;
const settings={enabled:true,pool4AcceptNew:false,slotLimit:120,headline:'Keep this title',revision:10};
const env={ELEVENLABS_PERMANENT_4_API_KEY:'dummy-key',ELEVENLABS_PERMANENT_4_AGENT_ID:'dummy-agent',CALLFOCUS_CONFIG:{async get(){return {...settings}},async put(key,val){if(kvFail)throw Error('KV failed');Object.assign(settings,JSON.parse(val));}}};
globalThis.fetch=async url=>String(url).includes('/subscription')?{ok:true,json:async()=>({status:'active',voice_limit:30,voice_slots_used:0,can_use_instant_voice_cloning:true})}: {ok:valid,status:valid?200:403,json:async()=>({agent_id:'dummy-agent'})};
const send=async enabled=>{const r=await toggleAccount4(new Request('https://callfocus.link/api/admin/permanent-slots/account4',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled})}),env);return {code:r.status,...await r.json()}};
let x=await send(true);assert.equal(x.ok,true);assert.equal(x.pool4AcceptNew,true);assert.equal(settings.pool4AcceptNew,true);assert.equal(settings.headline,'Keep this title');assert.equal(settings.revision,11);console.log('PASS isolated activation succeeds and does not overwrite unrelated settings');
x=await send(true);assert.equal(x.unchanged,true);assert.equal(settings.revision,11);console.log('PASS repeat activation is idempotent');
x=await send(false);assert.equal(x.ok,true);assert.equal(settings.pool4AcceptNew,false);console.log('PASS deactivation succeeds');
valid=false;x=await send(true);assert.equal(x.code,409);assert.equal(settings.pool4AcceptNew,false);assert.match(x.error,/Agent ID verification failed/);console.log('PASS failed verification clearly rejects activation');
valid=true;kvFail=true;x=await send(true);assert.equal(x.code,503);assert.equal(settings.pool4AcceptNew,false);console.log('PASS storage failure does not claim save succeeded');
globalThis.fetch=originalFetch;
// Simulate the dashboard's asynchronous refresh while the admin clicks Account 4.
const names=['cfSlotSave','cfSlotStatus','cfSlotRefresh','cfSlotAccount4Verify','cfSlot_pool4AcceptNew','cfSlot_headline','cfSlot_enabled','cfSlot_slotLimit','cfSlot_popupEnabled','cfSlot_forceFull','cfSlot_minimumCredits','cfSlot_eventDate','cfSlot_bookingOpensAt','cfSlot_bookingClosesAt','cfSlot_message','cfSlot_fullMessage','cfSlot_telegramUrl','cfSlotAccount4Status','cfSlotGlobalTotal','cfSlotGlobalCreated','cfSlotGlobalPending','cfSlotGlobalEligible','cfSlotGlobalRelease','cfSlotPools','cfSlotProvider','cfSlotBookings','adminDashboard','cfSlotReleaseBtn','cfSlotReleaseCount','cfSlotReleaseConfirm','cfSlotReleaseStatus'];
const els={};for(const id of names){const handlers={};els[id]={id,type:id==='cfSlot_pool4AcceptNew'||['cfSlot_enabled','cfSlot_popupEnabled','cfSlot_forceFull'].includes(id)?'checkbox':id==='cfSlot_slotLimit'||id==='cfSlot_minimumCredits'?'number':'text',checked:false,value:'',textContent:'',disabled:false,handlers,addEventListener(event,callback){(handlers[event]??=[]).push(callback)},classList:{contains(){return false}},trigger(type){return Promise.all((handlers[type]||[]).map(f=>f()))}}}
let currentVersion=1,allow=true,reqs=0,lastGet;
const snapshot=(rev=currentVersion,accept=false)=>({ok:true,settings:{enabled:true,popupEnabled:false,forceFull:false,slotLimit:120,minimumCredits:1000,pool4AcceptNew:accept,headline:'Server title',message:'msg',fullMessage:'Full',telegramUrl:'https://t.me/callfocus',eventDate:'',bookingOpensAt:'',bookingClosesAt:'',revision:rev},booked:90,total:120,remaining:0,created:88,pending:2,reclaimable:0,account4:{ready:true,message:'Agent verified'},pools:{pool4:{ok:true,voiceSlotsUsed:0,voiceSlotLimit:30,reserved:0,created:0}},bookings:[]});
const fetchMock=async (url,init)=>{
 const method=init?.method||'GET';if(method==='GET'){reqs++;if(reqs===1)return {ok:true,json:async()=>snapshot(1,false)};return {ok:true,json:async()=>snapshot(currentVersion,currentVersion>=2)};}
 if(url.endsWith('/account4')){if(!allow)return {ok:false,json:async()=>({ok:false,error:'Agent permission missing'})};currentVersion++;return {ok:true,json:async()=>({ok:true,pool4AcceptNew:true,revision:currentVersion})};}
 throw Error('Unexpected '+url);
};
const context={document:{getElementById(id){return els[id]||null},querySelector(){return null}},localStorage:{getItem(){return 'session'}},sessionStorage:{getItem(){return ''}},MutationObserver:class {observe(){}},fetch:fetchMock,console};
vm.runInNewContext(fs.readFileSync(new URL('./permanent-slots-admin.js',import.meta.url),'utf8'),context);
await new Promise(r=>setTimeout(r,0));assert.equal(els.cfSlot_pool4AcceptNew.checked,false);
els.cfSlot_headline.value='Unsaved custom text';await els.cfSlot_headline.trigger('input');
els.cfSlot_pool4AcceptNew.checked=true;await els.cfSlot_pool4AcceptNew.trigger('change');assert.equal(els.cfSlot_pool4AcceptNew.checked,true);assert.match(els.cfSlotAccount4Status.textContent,/enabled and saved/);assert.equal(els.cfSlot_headline.value,'Unsaved custom text');
assert.equal(els.cfSlot_pool4AcceptNew.disabled,false);console.log('PASS UI toggle autosaves and preserves unsaved fields during background refresh');
allow=false;currentVersion=1;els.cfSlot_pool4AcceptNew.checked=false;await els.cfSlot_pool4AcceptNew.trigger('change');assert.equal(els.cfSlot_pool4AcceptNew.checked,true);assert.match(els.cfSlotAccount4Status.textContent,/NOT saved/);console.log('PASS UI shows error and restores previous saved value instead of silently reverting');
