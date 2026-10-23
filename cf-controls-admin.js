/* CallFocus V16.22, admin-only announcement and service rates. Independent of global voice configuration. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
let lastToken='';let loading=false;
async function api(options={}){
 const r=await fetch('/api/admin/cf-feature-controls',{...options,headers:{'X-CallFocus-Admin-Key':token(),...(options.body?{'Content-Type':'application/json'}:{})},cache:'no-store'});
 let d={};try{d=await r.json()}catch{}if(!r.ok||!d.ok)throw Error(d.error||'Unable to save settings.');return d;
}
const txt=(id,text,ok)=>{if($(id)){$(id).textContent=text;$(id).className='admin-availability-feedback '+(ok?'ok':'error')}};
function preview(){const per=Number($('cfRateLiveCall')?.value)||100;const video=Number($('cfRateImageVideo')?.value)||1800;const note=Number($('cfRateVoiceNote')?.value)||100;const clone=Number($('cfRateCloneVoice')?.value)||150;
 $('cfRatePreview').textContent=`Per-second examples: 10-second call = ${(per/6).toFixed(2)} credits; 10-second cloned call/note = ${(clone/6).toFixed(2)} credits; 10-second regular note = ${(note/6).toFixed(2)} credits; 10-second video = ${(video/6).toFixed(2)} credits. Wallet transactions round to supported billing units.`;}
function fill(d){let a=d.announcement||{},r=d.rates||{};
 $('cfAnnEnabled').checked=!!a.enabled;$('cfAnnTitle').value=a.title||'';$('cfAnnMessage').value=a.message||'';$('cfAnnButton').value=a.buttonText||'Got it';$('cfAnnOpen').value=a.openSeconds??2;$('cfAnnClose').value=a.closeSeconds??0;
 $('cfRateLiveCall').value=r.liveCall||100;$('cfRateCloneVoice').value=r.cloneVoice||150;$('cfRateVoiceNote').value=r.voiceNote||100;$('cfRateImageVideo').value=r.imageVideo||1800;preview();}
async function load(){if(!token()||loading)return;loading=true;try{fill(await api())}catch(e){txt('cfAnnFeedback',e.message,false)}finally{loading=false}}
async function save(kind){const btn=$(kind==='announcement'?'cfAnnSave':'cfRatesSave');const fb=kind==='announcement'?'cfAnnFeedback':'cfRatesFeedback';if(!btn)return;btn.disabled=true;
 const payload=kind==='announcement'?{kind,announcement:{enabled:$('cfAnnEnabled').checked,title:$('cfAnnTitle').value,message:$('cfAnnMessage').value,buttonText:$('cfAnnButton').value,openSeconds:Number($('cfAnnOpen').value),closeSeconds:Number($('cfAnnClose').value)}}:{kind,rates:{liveCall:Number($('cfRateLiveCall').value),cloneVoice:Number($('cfRateCloneVoice').value),voiceNote:Number($('cfRateVoiceNote').value),imageVideo:Number($('cfRateImageVideo').value)}};
 try{const result=await api({method:'POST',body:JSON.stringify(payload)});if(kind==='rates')preview();txt(fb,kind==='announcement'?'Announcement saved. Customers will see the latest version when enabled.':'Service charges saved for new usage. Active services keep existing ledger rates.',true)}catch(e){txt(fb,e.message,false)}finally{btn.disabled=false}}
$('cfAnnSave')?.addEventListener('click',()=>save('announcement'));$('cfRatesSave')?.addEventListener('click',()=>save('rates'));
['cfRateLiveCall','cfRateCloneVoice','cfRateVoiceNote','cfRateImageVideo'].forEach(k=>$(k)?.addEventListener('input',preview));
document.querySelector('[data-admin-tab="payments"]')?.addEventListener('click',()=>{if(token())load()});
$('adminManualPaymentsRefreshBtn')?.addEventListener('click',()=>{if(token())load()});
// Load only after an existing admin session has been established. Never request or save credentials.
const gate=$('adminGate');if(gate){new MutationObserver(()=>{if(!gate.classList.contains('hidden')||!token())return;if(lastToken!==token()){lastToken=token();load()}}).observe(gate,{attributes:true,attributeFilter:['class']})}
if(token()&&gate?.classList.contains('hidden')){lastToken=token();load()}
})();
