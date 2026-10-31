(()=>{'use strict';
const $=id=>document.getElementById(id);if(!$('cfSlotSave'))return;
const token=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
const status=$('cfSlotStatus');let loaded=false;
const fields=['enabled','popupEnabled','forceFull','slotLimit','minimumCredits','eventDate','bookingOpensAt','bookingClosesAt','headline','message','fullMessage','telegramUrl'];
async function request(path='/api/admin/permanent-slots',method='GET',body){const r=await fetch(path,{method,headers:{'X-CallFocus-Admin-Key':token(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'Slot request failed.');return d;}
function render(d){const s=d.settings;
 for(const k of fields){const el=$('cfSlot_'+k);if(!el)continue;if(el.type==='checkbox')el.checked=!!s[k];else el.value=s[k]??''}
 status.textContent=`${d.booked} reserved of ${d.total} total slots. ${d.remaining} currently open for new customers. Booking ${s.enabled?'ON':'OFF'}; popup ${s.popupEnabled?'ON':'OFF'}.`;
 const values={cfSlotGlobalTotal:`${d.booked} / ${d.total}`,cfSlotGlobalCreated:d.created,cfSlotGlobalPending:d.pending,cfSlotGlobalEligible:d.reclaimable,cfSlotGlobalRelease:`${d.remaining} available`};
 for(const [id,value] of Object.entries(values))if($(id))$(id).textContent=value;
 if($('cfSlotPools'))$('cfSlotPools').textContent=Object.values(d.pools||{}).filter(p=>p.apiKeyConfigured||p.reserved).map(p=>`Account ${p.index}: ${p.ok?'connected':'check connection'} · ${p.reserved} booked · ${p.created} saved · ${p.pending} idle pending · ${p.ok?p.voiceSlotsUsed+'/'+p.voiceSlotLimit+' used':''} · ${p.available} usable slots`).join(' | ');
 if($('cfSlotProvider'))$('cfSlotProvider').textContent=`Public release: ${d.releaseUsed||0} booked from current release of ${d.releaseQuota||0}. New accounts are detected when configured with their own API key and Agent ID.`;
 if($('cfSlotBookings'))$('cfSlotBookings').textContent=(d.bookings||[]).map(r=>`${r.state.toUpperCase()} · ${r.user_id.slice(0,10)}… · ${r.voice_name||'Voice not created'} · ${r.booked_at.slice(0,10)}`).join('\n')||'No reservations yet.';
 loaded=true;
}
async function refresh(){if(!token())return;try{render(await request())}catch(e){status.textContent=e.message;loaded=false}}
$('cfSlotRefresh').onclick=refresh;
$('cfSlotSave').onclick=async()=>{if(!loaded)return refresh();const body={};for(const k of fields){const el=$('cfSlot_'+k);body[k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value.trim()};const btn=$('cfSlotSave');btn.disabled=true;status.textContent='Saving…';try{await request('/api/admin/permanent-slots','POST',body);await refresh()}catch(e){status.textContent=e.message}finally{btn.disabled=false}};
$('cfSlotReleaseBtn')?.addEventListener('click',async()=>{
 const btn=$('cfSlotReleaseBtn'),info=$('cfSlotReleaseStatus');const count=Number($('cfSlotReleaseCount')?.value||0),confirm=$('cfSlotReleaseConfirm')?.value||'';
 if(confirm!=='RELEASE UNCREATED SLOTS'){info.textContent='Type RELEASE UNCREATED SLOTS to confirm. Reclaiming a booking cancels that customer’s reservation.';return}
 if(!Number.isInteger(count)||count<1){info.textContent='Enter the number of slots to release.';return}
 btn.disabled=true;info.textContent='Verifying capacity and releasing slots…';
 try{const d=await request('/api/admin/permanent-slots/release','POST',{count,confirm});info.textContent=`${d.opened} slots are open for new customers. ${d.reclaimed} pending reservations were cancelled; no saved voices were deleted.`;$('cfSlotReleaseConfirm').value='';await refresh()}catch(e){info.textContent=e.message}finally{btn.disabled=false}
});
document.querySelector('[data-admin-tab="voice"]')?.addEventListener('click',refresh);
const main=$('adminDashboard');if(main){new MutationObserver(()=>{if(!main.classList.contains('hidden'))refresh()}).observe(main,{attributes:true,attributeFilter:['class']});if(!main.classList.contains('hidden'))refresh()}
})();
