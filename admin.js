const VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const $=id=>document.getElementById(id);
const ADMIN_BACKUP_KEY='callfocus_admin_config_backup_v1';
let adminKey='';
let currentConfig=null;
let previewUrl='';
let draftTimer=null;
let unlimitedCreditEmails=[];
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function authHeaders(extra={}){return {'X-CallFocus-Admin-Key':adminKey,...extra}}
function populateVoices(){const options=VOICES.map(v=>`<option value="${v}">${v}${v==='marin'||v==='cedar'?' · recommended':''}</option>`).join('');$('adminMaleVoice').innerHTML=options;$('adminFemaleVoice').innerHTML=options}
function renderServerState(){const online=$('adminServerOnline').checked;$('serverStateBadge').classList.toggle('offline',!online);$('serverStateBadge').querySelector('b').textContent=online?'Online':'Offline'}
function readBackup(){try{return JSON.parse(localStorage.getItem(ADMIN_BACKUP_KEY)||'null')}catch{return null}}
function saveBackup(config){try{localStorage.setItem(ADMIN_BACKUP_KEY,JSON.stringify({savedAt:new Date().toISOString(),config}));renderBackupStatus()}catch{}}
function formPayload(){return {unlimitedCreditEmails:[...unlimitedCreditEmails],siteTheme:$('adminSiteTheme').value||'black',serverOnline:$('adminServerOnline').checked,serverMessage:$('adminServerMessage').value.trim(),maleVoice:$('adminMaleVoice').value,femaleVoice:$('adminFemaleVoice').value,model:'gpt-live-1',speakingPace:$('adminSpeakingPace').value,speechStyle:$('adminSpeechStyle').value.trim(),instructions:$('adminInstructions').value.trim(),opening:$('adminOpening').value.trim(),speakFirst:$('adminSpeakFirst').checked,interruptions:$('adminInterruptions').checked}}
function renderBackupStatus(storageConnected=true){const el=$('adminBackupStatus'),btn=$('restoreAdminBackupBtn');if(!el||!btn)return;const b=readBackup();btn.classList.toggle('hidden',!b?.config);if(!b?.config){el.textContent='A protected browser backup will also be kept automatically.';el.className='admin-backup-status';return}const when=b.savedAt?new Date(b.savedAt).toLocaleString():'recently';if(!storageConnected){el.textContent=`KV is disconnected, but your last admin settings are protected on this device (${when}). Reconnect KV, then restore and save.`;el.className='admin-backup-status warn'}else{el.textContent=`Protected browser backup available from ${when}.`;el.className='admin-backup-status good'}}
function normalizeUnlimitedEmail(value=''){return String(value||'').trim().toLowerCase()}
function validUnlimitedEmail(value=''){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeUnlimitedEmail(value))}
function renderUnlimitedUsers(){
  const root=$('adminUnlimitedList'); if(!root)return;
  const list=[...unlimitedCreditEmails].sort((a,b)=>a.localeCompare(b));
  root.innerHTML=list.length?list.map(email=>`<div class="admin-unlimited-user"><span><strong>${email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong><small>Unlimited calls + voice notes</small></span><button type="button" data-remove-unlimited="${email.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">Remove</button></div>`).join(''):'<div class="admin-unlimited-empty">No unlimited-credit users yet.</div>';
}
function addUnlimitedUser(){
  const input=$('adminUnlimitedEmail'); const email=normalizeUnlimitedEmail(input?.value||'');
  if(!validUnlimitedEmail(email))return toast('Enter a valid email address');
  if(unlimitedCreditEmails.includes(email))return toast('That email already has unlimited access');
  unlimitedCreditEmails=[...unlimitedCreditEmails,email]; if(input)input.value=''; renderUnlimitedUsers(); scheduleDraftBackup(); toast('Unlimited user added — save global settings to apply');
}
function fill(config,storageConnected){currentConfig=config;unlimitedCreditEmails=Array.isArray(config.unlimitedCreditEmails)?[...new Set(config.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail))]:[];renderUnlimitedUsers();$('adminSiteTheme').value=config.siteTheme||'black';document.querySelectorAll('[data-site-theme]').forEach(btn=>{const on=btn.dataset.siteTheme===$('adminSiteTheme').value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});$('adminServerOnline').checked=config.serverOnline!==false;$('adminServerMessage').value=config.serverMessage||'';$('adminMaleVoice').value=config.maleVoice||'cedar';$('adminFemaleVoice').value=config.femaleVoice||'marin';$('adminModel').value='gpt-live-1';$('adminSpeakingPace').value=config.speakingPace||'relaxed';$('adminSpeechStyle').value=config.speechStyle||'';$('adminInstructions').value=config.instructions||'';$('adminOpening').value=config.opening||'';$('adminSpeakFirst').checked=config.speakFirst!==false;$('adminInterruptions').checked=config.interruptions!==false;$('adminStorageStatus').textContent=storageConnected?'Global settings storage connected':'Global settings storage is not connected yet';$('adminStorageStatus').classList.toggle('bad',!storageConnected);renderServerState();renderBackupStatus(storageConnected)}
async function api(path,options={}){const res=await fetch(path,{...options,headers:authHeaders(options.headers||{})});const type=res.headers.get('content-type')||'';const data=type.includes('application/json')?await res.json():await res.text();if(!res.ok)throw new Error(data?.error||data||'Request failed');return data}
async function login(){const key=$('adminPasscode').value.trim();if(!key)return toast('Enter your admin passcode');adminKey=key;try{await api('/api/admin/login',{method:'POST'});const result=await api('/api/admin/config');sessionStorage.setItem('callfocus_admin_key',key);$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!result.storageConnected&&backup?.config){fill(backup.config,false);toast('KV disconnected — protected settings restored on this device')}else{fill(result.config,result.storageConnected);if(result.storageConnected)saveBackup(result.config)} }catch(err){adminKey='';$('adminGateNote').textContent=err.message;toast(err.message)}}
async function saveConfig(){const payload=formPayload();saveBackup(payload);try{const result=await api('/api/admin/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});fill(result.config,true);saveBackup(result.config);toast('Global CallFocus settings saved')}catch(err){renderBackupStatus(false);toast(`${err.message} — your settings are protected on this device`)}}
function restoreBackup(){const b=readBackup();if(!b?.config)return toast('No protected backup found');fill(b.config,!!currentConfig);toast('Protected settings loaded. Press Save global settings to write them to KV.')}
function scheduleDraftBackup(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{saveBackup(formPayload())}catch{}},350)}
async function previewVoice(kind,button){const voice=kind==='female'?$('adminFemaleVoice').value:$('adminMaleVoice').value;const old=button.textContent;button.disabled=true;button.textContent='Preparing preview…';try{const res=await fetch('/api/admin/voice-preview',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({voice,text:'Hi, this is a CallFocus voice preview. I am checking how natural this voice sounds in a relaxed phone conversation.'})});if(!res.ok){let message='Voice preview unavailable';try{message=(await res.json()).error||message}catch{}throw new Error(message)}const blob=await res.blob();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('voicePreviewAudio').src=previewUrl;$('voicePreviewAudio').classList.remove('hidden');await $('voicePreviewAudio').play();}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent=old}}
populateVoices();
document.querySelectorAll('[data-site-theme]').forEach(btn=>btn.addEventListener('click',()=>{const value=btn.dataset.siteTheme==='pearl'?'pearl':'black';$('adminSiteTheme').value=value;document.querySelectorAll('[data-site-theme]').forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});scheduleDraftBackup()}));
$('adminGateBtn').onclick=login;$('adminPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('adminServerOnline').onchange=()=>{renderServerState();scheduleDraftBackup()};$('saveAdminBtn').onclick=saveConfig;$('restoreAdminBackupBtn')?.addEventListener('click',restoreBackup);$('adminLockBtn').onclick=()=>{sessionStorage.removeItem('callfocus_admin_key');location.reload()};document.querySelectorAll('[data-preview]').forEach(btn=>btn.onclick=()=>previewVoice(btn.dataset.preview,btn));
['adminServerMessage','adminMaleVoice','adminFemaleVoice','adminSpeakingPace','adminSpeechStyle','adminInstructions','adminOpening','adminSpeakFirst','adminInterruptions'].forEach(id=>$(id)?.addEventListener('input',scheduleDraftBackup));
$('adminUnlimitedAddBtn')?.addEventListener('click',addUnlimitedUser);
$('adminUnlimitedEmail')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addUnlimitedUser();}});
$('adminUnlimitedList')?.addEventListener('click',e=>{const btn=e.target.closest('[data-remove-unlimited]');if(!btn)return;const email=normalizeUnlimitedEmail(btn.dataset.removeUnlimited);unlimitedCreditEmails=unlimitedCreditEmails.filter(x=>x!==email);renderUnlimitedUsers();scheduleDraftBackup();toast('Unlimited user removed — save global settings to apply');});
const remembered=sessionStorage.getItem('callfocus_admin_key');if(remembered){adminKey=remembered;api('/api/admin/config').then(r=>{$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!r.storageConnected&&backup?.config){fill(backup.config,false)}else{fill(r.config,r.storageConnected);if(r.storageConnected)saveBackup(r.config)}}).catch(()=>{adminKey='';sessionStorage.removeItem('callfocus_admin_key')})}

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
