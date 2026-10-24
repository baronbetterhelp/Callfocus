/* V16.40 standalone admin control; deliberately separate from global calling settings. */
(()=>{'use strict';
const $=id=>document.getElementById(id),save=$('cfCloneSaveAvailability');if(!save)return;
const status=$('cfCloneAvailabilityStatus'),toggle=$('cfCloneEnabled'),homeToggle=$('cfCloneHomeButtonVisible'),message=$('cfCloneUnavailableMessage');
const defaultMessage='Voice cloning is currently unavailable while we make improvements. Please use the standard voices for now.';
const token=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
let loaded=false,loading=false;
async function call(method='GET',body){const r=await fetch('/api/admin/voice-cloning-availability',{method,cache:'no-store',credentials:'same-origin',headers:{'X-CallFocus-Admin-Key':token(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw Error(data.error||`Could not update cloning availability (${r.status}).`);return data}
async function refresh(){if(loading||!token())return;loading=true;status.textContent='Checking voice-cloning availability…';try{const data=await call();toggle.checked=data.enabled===true;homeToggle.checked=data.homeButtonVisible!==false;message.value=data.message||defaultMessage;status.textContent=`Cloning is ${data.enabled?'enabled':'paused'}. Homepage button is ${homeToggle.checked?'visible':'hidden'}.`;loaded=true}catch(e){loaded=false;toggle.checked=false;status.textContent=e.message||'Unable to load settings. Cloning remains paused.'}finally{loading=false}}
save.addEventListener('click',async()=>{if(!loaded)return refresh();const msg=message.value.trim();if(!msg)return status.textContent='Enter the message customers should see when cloning is off.';save.disabled=true;status.textContent='Saving…';try{const d=await call('POST',{enabled:toggle.checked,homeButtonVisible:homeToggle.checked,message:msg});status.textContent=`Saved. Cloning is ${d.enabled?'enabled':'paused'}; homepage button is ${d.homeButtonVisible?'visible':'hidden'}.`}catch(e){status.textContent=e.message||'Could not save settings.';await refresh()}finally{save.disabled=false}});
document.querySelector('[data-admin-tab="voice"]')?.addEventListener('click',refresh);
const obs=new MutationObserver(()=>{if(!document.getElementById('adminDashboard')?.classList.contains('hidden')){refresh();obs.disconnect()}});
const dashboard=$('adminDashboard');if(dashboard){obs.observe(dashboard,{attributes:true,attributeFilter:['class']});if(!dashboard.classList.contains('hidden'))refresh()}
})();
