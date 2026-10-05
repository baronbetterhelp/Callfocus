const VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const $=id=>document.getElementById(id);
let adminKey='';
let currentConfig=null;
let previewUrl='';
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function authHeaders(extra={}){return {'X-CallFocus-Admin-Key':adminKey,...extra}}
function populateVoices(){const options=VOICES.map(v=>`<option value="${v}">${v}${v==='marin'||v==='cedar'?' · recommended':''}</option>`).join('');$('adminMaleVoice').innerHTML=options;$('adminFemaleVoice').innerHTML=options}
function renderServerState(){const online=$('adminServerOnline').checked;$('serverStateBadge').classList.toggle('offline',!online);$('serverStateBadge').querySelector('b').textContent=online?'Online':'Offline'}
function fill(config,storageConnected){currentConfig=config;$('adminSiteTheme').value=config.siteTheme||'black';document.querySelectorAll('[data-site-theme]').forEach(btn=>{const on=btn.dataset.siteTheme===$('adminSiteTheme').value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});$('adminServerOnline').checked=config.serverOnline!==false;$('adminServerMessage').value=config.serverMessage||'';$('adminMaleVoice').value=config.maleVoice||'cedar';$('adminFemaleVoice').value=config.femaleVoice||'marin';$('adminModel').value='gpt-live-1';$('adminSpeakingPace').value=config.speakingPace||'relaxed';$('adminSpeechStyle').value=config.speechStyle||'';$('adminInstructions').value=config.instructions||'';$('adminOpening').value=config.opening||'';$('adminSpeakFirst').checked=config.speakFirst!==false;$('adminInterruptions').checked=config.interruptions!==false;$('adminStorageStatus').textContent=storageConnected?'Global settings storage connected':'Global settings storage is not connected yet';$('adminStorageStatus').classList.toggle('bad',!storageConnected);renderServerState()}
async function api(path,options={}){const res=await fetch(path,{...options,headers:authHeaders(options.headers||{})});const type=res.headers.get('content-type')||'';const data=type.includes('application/json')?await res.json():await res.text();if(!res.ok)throw new Error(data?.error||data||'Request failed');return data}
async function login(){const key=$('adminPasscode').value.trim();if(!key)return toast('Enter your admin passcode');adminKey=key;try{await api('/api/admin/login',{method:'POST'});const result=await api('/api/admin/config');sessionStorage.setItem('callfocus_admin_key',key);$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');fill(result.config,result.storageConnected);toast('Admin unlocked')}catch(err){adminKey='';$('adminGateNote').textContent=err.message;toast(err.message)}}
async function saveConfig(){const payload={siteTheme:$('adminSiteTheme').value||'black',serverOnline:$('adminServerOnline').checked,serverMessage:$('adminServerMessage').value.trim(),maleVoice:$('adminMaleVoice').value,femaleVoice:$('adminFemaleVoice').value,model:'gpt-live-1',speakingPace:$('adminSpeakingPace').value,speechStyle:$('adminSpeechStyle').value.trim(),instructions:$('adminInstructions').value.trim(),opening:$('adminOpening').value.trim(),speakFirst:$('adminSpeakFirst').checked,interruptions:$('adminInterruptions').checked};try{const result=await api('/api/admin/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});fill(result.config,true);toast('Global CallFocus settings saved')}catch(err){toast(err.message)}}
async function previewVoice(kind,button){const voice=kind==='female'?$('adminFemaleVoice').value:$('adminMaleVoice').value;const old=button.textContent;button.disabled=true;button.textContent='Preparing preview…';try{const res=await fetch('/api/admin/voice-preview',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({voice,text:'Hi, this is a CallFocus voice preview. I am checking how natural this voice sounds in a relaxed phone conversation.'})});if(!res.ok){let message='Voice preview unavailable';try{message=(await res.json()).error||message}catch{}throw new Error(message)}const blob=await res.blob();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('voicePreviewAudio').src=previewUrl;$('voicePreviewAudio').classList.remove('hidden');await $('voicePreviewAudio').play();}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent=old}}
populateVoices();
document.querySelectorAll('[data-site-theme]').forEach(btn=>btn.addEventListener('click',()=>{
  const value=btn.dataset.siteTheme==='pearl'?'pearl':'black';
  $('adminSiteTheme').value=value;
  document.querySelectorAll('[data-site-theme]').forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});
}));
$('adminGateBtn').onclick=login;$('adminPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('adminServerOnline').onchange=renderServerState;$('saveAdminBtn').onclick=saveConfig;$('adminLockBtn').onclick=()=>{sessionStorage.removeItem('callfocus_admin_key');location.reload()};document.querySelectorAll('[data-preview]').forEach(btn=>btn.onclick=()=>previewVoice(btn.dataset.preview,btn));
const remembered=sessionStorage.getItem('callfocus_admin_key');if(remembered){adminKey=remembered;api('/api/admin/config').then(r=>{$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');fill(r.config,r.storageConnected)}).catch(()=>{adminKey='';sessionStorage.removeItem('callfocus_admin_key')})}

async function runDiagnostics(){
  const btn=$('runDiagnosticsBtn');
  const box=$('adminDiagnostics');
  if(!btn||!box)return;
  const old=btn.textContent; btn.disabled=true; btn.textContent='Checking…';
  try{
    const d=await api('/api/admin/diagnostics');
    const last=d.lastLiveStatus||{};
    box.innerHTML=`
      <div class="admin-diagnostics-row"><span>OpenAI API key</span><strong>${d.openaiKeyConfigured?'Configured':'Missing'}</strong></div>
      <div class="admin-diagnostics-row"><span>Global KV storage</span><strong>${d.kvConnected?'Connected':'Not connected'}</strong></div>
      <div class="admin-diagnostics-row"><span>Admin server switch</span><strong>${d.serverOnline?'Online':'Offline'}</strong></div>
      <div class="admin-diagnostics-row"><span>Voice engine</span><strong>${d.engine||'gpt-live-1'}</strong></div>
      <div class="admin-diagnostics-row"><span>GPT-Live model access</span><strong>${d.modelAccess?.ok?'Available':`Unavailable (${d.modelAccess?.status||'no status'})`}</strong></div>
      <div class="admin-diagnostics-note">${d.modelAccess?.message||''}</div>
      <div class="admin-diagnostics-row"><span>Last session result</span><strong>${last.ok===true?'Connected':last.ok===false?'Failed':'No result recorded yet'}</strong></div>
      ${last.code?`<div class="admin-diagnostics-row"><span>Last error code</span><strong>${last.code}</strong></div>`:''}
      ${last.message?`<div class="admin-diagnostics-note">${last.message}</div>`:''}
      ${last.at?`<div class="admin-diagnostics-note">Last checked: ${new Date(last.at).toLocaleString()}</div>`:''}`;
    box.classList.remove('hidden');
  }catch(err){ toast(err.message); }
  finally{ btn.disabled=false; btn.textContent=old; }
}
$('runDiagnosticsBtn')?.addEventListener('click',runDiagnostics);
