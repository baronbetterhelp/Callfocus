(()=>{'use strict';
const $=id=>document.getElementById(id);if(!$('cfSlotSave'))return;
const token=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
const status=$('cfSlotStatus');
const fields=['enabled','popupEnabled','popupDelaySeconds','forceFull','slotLimit','minimumCredits','pool4AcceptNew','pool5AcceptNew','eventDate','bookingOpensAt','bookingClosesAt','headline','message','fullMessage','telegramUrl'];
const dirty=new Set();
let loaded=false,fetchGeneration=0,toggleBusy=false,confirmedToggle=false,confirmedRevision=0,toggleNotice='',account5Busy=false,confirmedToggle5=false,toggleNotice5='',publicAvailabilityBusy=false,publicAvailabilityEdited=false;
async function request(path='/api/admin/permanent-slots',method='GET',body){
 const r=await fetch(path,{method,headers:{'X-CallFocus-Admin-Key':token(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'Slot request failed.');return d;
}
function render(d){
 const s=d.settings;if(!s)return;
 // A KV read made immediately after a successful write may return older data.
 // Never let it undo the admin's newly saved Account 4 selection.
 if(Number(s.revision||0)<confirmedRevision)return;
 for(const k of fields){
  const el=$('cfSlot_'+k);if(!el||dirty.has(k)||(k==='pool4AcceptNew'&&toggleBusy)||(k==='pool5AcceptNew'&&account5Busy))continue;
  if(el.type==='checkbox')el.checked=!!s[k];else el.value=s[k]??'';
 }
 if(!toggleBusy){confirmedToggle=!!s.pool4AcceptNew;confirmedRevision=Math.max(confirmedRevision,Number(s.revision||0));}
 if(!account5Busy){confirmedToggle5=!!s.pool5AcceptNew;confirmedRevision=Math.max(confirmedRevision,Number(s.revision||0));}
 status.textContent=`${d.booked} reserved of ${d.total} total slots. ${d.remaining} currently open for new customers. Booking ${s.enabled?'ON':'OFF'}; popup ${s.popupEnabled?'ON':'OFF'}; delay ${Number(s.popupDelaySeconds||0)} second(s).`;
 const values={cfSlotGlobalTotal:`${d.booked} / ${d.total}`,cfSlotGlobalCreated:d.created,cfSlotGlobalPending:d.pending,cfSlotGlobalEligible:d.reclaimable,cfSlotGlobalRelease:`${d.remaining} available · ${d.paidPurchases||0} paid`};
 for(const [id,value] of Object.entries(values))if($(id))$(id).textContent=value;
 const a4=d.account4||{},c4=d.pools?.pool4||{};
 const msg=`${a4.ready?'Verified':'Not yet ready'} · ${a4.message||'Not checked'} · ${c4.reserved||0} booked · ${c4.created||0} saved voices · ${c4.ok?c4.voiceSlotsUsed+'/'+c4.voiceSlotLimit+' storage used':'subscription not verified'}. ${s.pool4AcceptNew?'Accepting new purchases':'New purchases disabled'}.`;
 if($('cfSlotAccount4Status'))$('cfSlotAccount4Status').textContent=(toggleNotice?toggleNotice+' · ':'')+msg;
 const a5=d.account5||{},c5=d.pools?.pool5||{};
 const msg5=`${a5.ready?'Verified':'Not yet ready'} · ${a5.message||'Not checked'} · ${c5.reserved||0} booked · ${c5.created||0} saved voices · ${c5.ok?c5.voiceSlotsUsed+'/'+c5.voiceSlotLimit+' storage used':'subscription not verified'}. ${s.pool5AcceptNew?'Accepting new purchases':'New purchases disabled'}.`;
 if($('cfSlotAccount5Status'))$('cfSlotAccount5Status').textContent=(toggleNotice5?toggleNotice5+' · ':'')+msg5;
 if($('cfSlotPools'))$('cfSlotPools').textContent=Object.values(d.pools||{}).filter(p=>p.apiKeyConfigured||p.reserved).map(p=>`Account ${p.index}: ${p.ok?'connected':'check connection'} · ${p.reserved} booked · ${p.created} saved · ${p.pending} idle pending · ${p.ok?p.voiceSlotsUsed+'/'+p.voiceSlotLimit+' used':''} · ${p.available} usable slots`).join(' | ');
 if($('cfSlotProvider'))$('cfSlotProvider').textContent=`Public release: ${d.releaseUsed||0} booked from current release of ${d.releaseQuota||0}. New accounts are detected when configured with their own API key and Agent ID.`;
 if(!publicAvailabilityBusy&&!publicAvailabilityEdited&&$('cfSlotPublicAvailableCount'))$('cfSlotPublicAvailableCount').value=String(d.remaining??0);
 if($('cfSlotBookings'))$('cfSlotBookings').textContent=(d.bookings||[]).map(r=>`${r.state.toUpperCase()} · ${r.user_id.slice(0,10)}… · ${r.voice_name||'Voice not created'} · ${r.booked_at.slice(0,10)}`).join('\n')||'No reservations yet.';
 loaded=true;
}
async function refresh(){
 if(!token())return;
 const generation=++fetchGeneration;
 try{const d=await request();if(generation===fetchGeneration)render(d)}
 catch(e){if(generation===fetchGeneration){status.textContent=e.message;if(!loaded)loaded=false}}
}
// Do not throw away edits to other settings when a background refresh completes.
for(const k of fields){const el=$('cfSlot_'+k);if(!el||k==='pool4AcceptNew'||k==='pool5AcceptNew')continue;
 const changed=()=>dirty.add(k);el.addEventListener('input',changed);el.addEventListener('change',changed);
}
const account4=$('cfSlot_pool4AcceptNew');
if(account4)account4.addEventListener('change',async()=>{
 if(toggleBusy||account5Busy){account4.checked=confirmedToggle;return;}
 const desired=account4.checked;
 toggleBusy=true;account4.disabled=true;++fetchGeneration;
 toggleNotice=`Saving Account 4 ${desired?'activation':'deactivation'}…`;
 if($('cfSlotAccount4Status'))$('cfSlotAccount4Status').textContent=toggleNotice;
 try{
  const d=await request('/api/admin/permanent-slots/account4','POST',{enabled:desired});
  confirmedToggle=!!d.pool4AcceptNew;
  confirmedRevision=Math.max(confirmedRevision,Number(d.revision||0));
  account4.checked=confirmedToggle;
  toggleNotice=`Account 4 ${confirmedToggle?'enabled':'disabled'} and saved successfully`;
 }catch(e){
  account4.checked=confirmedToggle;
  toggleNotice=`Account 4 setting NOT saved: ${e.message}`;
  status.textContent=toggleNotice;
 }finally{
  account4.disabled=false;toggleBusy=false;
  if($('cfSlotAccount4Status'))$('cfSlotAccount4Status').textContent=toggleNotice;
 }
 // Load fresh counters, without changing any unsaved fields on the page.
 await refresh();
});
const account5=$('cfSlot_pool5AcceptNew');
if(account5)account5.addEventListener('change',async()=>{
 if(toggleBusy||account5Busy){account5.checked=confirmedToggle5;return;}
 const desired=account5.checked;
 account5Busy=true;account5.disabled=true;++fetchGeneration;
 if(account4)account4.disabled=true;
 toggleNotice5=`Saving Account 5 ${desired?'activation':'deactivation'}…`;
 if($('cfSlotAccount5Status'))$('cfSlotAccount5Status').textContent=toggleNotice5;
 try{
  const d=await request('/api/admin/permanent-slots/account5','POST',{enabled:desired});
  confirmedToggle5=!!d.pool5AcceptNew;
  confirmedRevision=Math.max(confirmedRevision,Number(d.revision||0));
  account5.checked=confirmedToggle5;
  toggleNotice5=`Account 5 ${confirmedToggle5?'enabled':'disabled'} and saved successfully`;
 }catch(e){
  account5.checked=confirmedToggle5;
  toggleNotice5=`Account 5 setting NOT saved: ${e.message}`;
  status.textContent=toggleNotice5;
 }finally{
  account5.disabled=false;account5Busy=false;
  if(account4)account4.disabled=false;
  if($('cfSlotAccount5Status'))$('cfSlotAccount5Status').textContent=toggleNotice5;
 }
 await refresh();
});
$('cfSlotRefresh').onclick=refresh;
$('cfSlotAccount4Verify')?.addEventListener('click',refresh);
$('cfSlotAccount5Verify')?.addEventListener('click',refresh);
$('cfSlotSave').onclick=async()=>{
 if(!loaded)return refresh();if(toggleBusy||account5Busy){status.textContent='Finish saving the account activation switch before saving other settings.';return}
 const body={};for(const k of fields){const el=$('cfSlot_'+k);body[k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value.trim()}
 const btn=$('cfSlotSave');btn.disabled=true;++fetchGeneration;status.textContent='Saving…';
 try{const d=await request('/api/admin/permanent-slots','POST',body);confirmedRevision=Math.max(confirmedRevision,Number(d.settings?.revision||0));confirmedToggle=!!d.settings?.pool4AcceptNew;confirmedToggle5=!!d.settings?.pool5AcceptNew;dirty.clear();status.textContent=`Settings saved successfully. Popup delay: ${Number(d.settings?.popupDelaySeconds||0)} second(s).`;await refresh()}
 catch(e){status.textContent='Settings NOT saved: '+e.message}finally{btn.disabled=false}
};
$('cfSlotPublicAvailableCount')?.addEventListener('input',()=>{publicAvailabilityEdited=true});
$('cfSlotPublicAvailableSave')?.addEventListener('click',async()=>{
 if(publicAvailabilityBusy)return;
 const input=$('cfSlotPublicAvailableCount'),button=$('cfSlotPublicAvailableSave'),message=$('cfSlotPublicAvailableStatus');
 const count=Number(input?.value);
 if(!input?.value.trim()||!Number.isSafeInteger(count)||count<0||count>1000){message.textContent='Enter a whole number between 0 and 1000.';return}
 button.disabled=true;publicAvailabilityBusy=true;++fetchGeneration;
 message.textContent='Checking available capacity and updating the website…';
 try{
  const d=await request('/api/admin/permanent-slots/public-availability','POST',{count});
  confirmedRevision=Math.max(confirmedRevision,Number(d.revision||0));
  publicAvailabilityEdited=false;
  if($('cfSlotGlobalRelease'))$('cfSlotGlobalRelease').textContent=`${d.remaining} available · updating`;
  message.textContent=`Saved: ${d.remaining} slots available on the website out of ${d.total} total. Existing ${d.booked} reservations were preserved.`;
 }catch(e){message.textContent='Not saved: '+e.message}
 finally{button.disabled=false;publicAvailabilityBusy=false}
 await refresh();
});
$('cfSlotReleaseBtn')?.addEventListener('click',async()=>{
 const btn=$('cfSlotReleaseBtn'),info=$('cfSlotReleaseStatus');const count=Number($('cfSlotReleaseCount')?.value||0),confirm=$('cfSlotReleaseConfirm')?.value||'';
 if(confirm!=='RELEASE UNCREATED SLOTS'){info.textContent='Type RELEASE UNCREATED SLOTS to confirm. Only free legacy reservations may be cancelled. Paid reservations are protected until refunded.';return}
 if(!Number.isInteger(count)||count<1){info.textContent='Enter the number of slots to release.';return}
 btn.disabled=true;info.textContent='Verifying capacity and releasing slots…';
 try{const d=await request('/api/admin/permanent-slots/release','POST',{count,confirm});info.textContent=`${d.opened} slots are open for new customers. ${d.reclaimed} pending reservations were cancelled; no saved voices were deleted.`;$('cfSlotReleaseConfirm').value='';await refresh()}catch(e){info.textContent=e.message}finally{btn.disabled=false}
});
document.querySelector('[data-admin-tab="voice"]')?.addEventListener('click',refresh);
const main=$('adminDashboard');if(main){new MutationObserver(()=>{if(!main.classList.contains('hidden'))refresh()}).observe(main,{attributes:true,attributeFilter:['class']});if(!main.classList.contains('hidden'))refresh()}
})();
