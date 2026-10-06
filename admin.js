const CORE_VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const EXTRA_MALE_VOICES=[
  ['meridian','Meridian · Masculine · North American · Natural'],
  ['vesper','Vesper · Masculine · British · Natural'],
  ['stone','Stone · Masculine · Irish · Natural'],
  ['ripple','Ripple · Masculine · Australian · Natural'],
  ['cinder','Cinder · Masculine · Southern U.S. · Generated'],
  ['beacon','Beacon · Masculine · Filipino · Generated'],
  ['tempo','Tempo · Masculine · Brazilian Portuguese · Natural']
];
const EXTRA_FEMALE_VOICES=[
  ['gleam','Gleam · Feminine · North American · Natural'],
  ['willow','Willow · Feminine · Irish · Natural'],
  ['quartz','Quartz · Feminine · Australian · Generated'],
  ['delta','Delta · Feminine · Southern U.S. · Generated'],
  ['bossa','Bossa · Feminine · Brazilian Portuguese · Natural']
];
const LIVE_ONLY_VOICES=new Set([...EXTRA_MALE_VOICES,...EXTRA_FEMALE_VOICES].map(([id])=>id));
const $=id=>document.getElementById(id);
const ADMIN_BACKUP_KEY='callfocus_admin_config_backup_v1';
let adminKey='';
let currentConfig=null;
let previewUrl='';
let draftTimer=null;
let unlimitedCreditEmails=[];
let adminUsers=[];
let adminUsersCursor='';
let adminUsersLoading=false;
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function authHeaders(extra={}){return {'X-CallFocus-Admin-Key':adminKey,...extra}}
function coreVoiceOptions(){return CORE_VOICES.map(v=>`<option value="${v}">${v}${v==='marin'||v==='cedar'?' · recommended':''}</option>`).join('')}
function liveVoiceOptions(rows){return rows.map(([id,label])=>`<option value="${id}">${label} · Live only</option>`).join('')}
function populateVoices(){
  $('adminMaleVoice').innerHTML=`<optgroup label="Core GPT-Live voices">${coreVoiceOptions()}</optgroup><optgroup label="Additional masculine GPT-Live voices">${liveVoiceOptions(EXTRA_MALE_VOICES)}</optgroup>`;
  $('adminFemaleVoice').innerHTML=`<optgroup label="Core GPT-Live voices">${coreVoiceOptions()}</optgroup><optgroup label="Additional feminine GPT-Live voices">${liveVoiceOptions(EXTRA_FEMALE_VOICES)}</optgroup>`;
}
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
async function setUnlimitedUser(action,email,button){
  const normalized=normalizeUnlimitedEmail(email);
  if(!validUnlimitedEmail(normalized))return toast('Enter a valid email address');
  const oldText=button?.textContent||'';
  if(button){button.disabled=true;button.textContent=action==='add'?'Adding…':'Removing…';}
  try{
    const result=await api('/api/admin/unlimited-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email:normalized})});
    unlimitedCreditEmails=Array.isArray(result.unlimitedCreditEmails)?result.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail):[];
    renderUnlimitedUsers();
    saveBackup({...formPayload(),unlimitedCreditEmails:[...unlimitedCreditEmails]});
    toast(action==='add'?'Unlimited access enabled immediately':'Unlimited access removed immediately');
    return true;
  }catch(err){toast(err.message);return false}
  finally{if(button){button.disabled=false;button.textContent=oldText;}}
}
async function addUnlimitedUser(){
  const input=$('adminUnlimitedEmail'); const email=normalizeUnlimitedEmail(input?.value||''); const btn=$('adminUnlimitedAddBtn');
  if(!validUnlimitedEmail(email))return toast('Enter a valid email address');
  if(unlimitedCreditEmails.includes(email))return toast('That email already has unlimited access');
  const ok=await setUnlimitedUser('add',email,btn); if(ok&&input)input.value='';
}
function fill(config,storageConnected){currentConfig=config;unlimitedCreditEmails=Array.isArray(config.unlimitedCreditEmails)?[...new Set(config.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail))]:[];renderUnlimitedUsers();$('adminSiteTheme').value=config.siteTheme||'black';document.querySelectorAll('[data-site-theme]').forEach(btn=>{const on=btn.dataset.siteTheme===$('adminSiteTheme').value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});$('adminServerOnline').checked=config.serverOnline!==false;$('adminServerMessage').value=config.serverMessage||'';$('adminMaleVoice').value=config.maleVoice||'cedar';$('adminFemaleVoice').value=config.femaleVoice||'marin';$('adminModel').value='gpt-live-1';$('adminSpeakingPace').value=config.speakingPace||'relaxed';$('adminSpeechStyle').value=config.speechStyle||'';$('adminInstructions').value=config.instructions||'';$('adminOpening').value=config.opening||'';$('adminSpeakFirst').checked=config.speakFirst!==false;$('adminInterruptions').checked=config.interruptions!==false;$('adminStorageStatus').textContent=storageConnected?'Global settings storage connected':'Global settings storage is not connected yet';$('adminStorageStatus').classList.toggle('bad',!storageConnected);renderServerState();renderBackupStatus(storageConnected)}
async function api(path,options={}){const res=await fetch(path,{...options,headers:authHeaders(options.headers||{})});const type=res.headers.get('content-type')||'';const data=type.includes('application/json')?await res.json():await res.text();if(!res.ok)throw new Error(data?.error||data||'Request failed');return data}
async function login(){const key=$('adminPasscode').value.trim();if(!key)return toast('Enter your admin passcode');adminKey=key;try{await api('/api/admin/login',{method:'POST'});const result=await api('/api/admin/config');sessionStorage.setItem('callfocus_admin_key',key);$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!result.storageConnected&&backup?.config){fill(backup.config,false);toast('KV disconnected — protected settings restored on this device')}else{fill(result.config,result.storageConnected);if(result.storageConnected)saveBackup(result.config)}loadAdminUsers(true);}catch(err){adminKey='';$('adminGateNote').textContent=err.message;toast(err.message)}}
async function saveConfig(){const payload=formPayload();saveBackup(payload);try{const result=await api('/api/admin/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});fill(result.config,true);saveBackup(result.config);toast('Global CallFocus settings saved')}catch(err){renderBackupStatus(false);toast(`${err.message} — your settings are protected on this device`)}}
function restoreBackup(){const b=readBackup();if(!b?.config)return toast('No protected backup found');fill(b.config,!!currentConfig);toast('Protected settings loaded. Press Save global settings to write them to KV.')}
function scheduleDraftBackup(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{saveBackup(formPayload())}catch{}},350)}
async function previewVoice(kind,button){const voice=kind==='female'?$('adminFemaleVoice').value:$('adminMaleVoice').value;if(LIVE_ONLY_VOICES.has(voice))return toast('This is a GPT-Live-only voice. Save it and place a short test call to audition it.');const old=button.textContent;button.disabled=true;button.textContent='Preparing preview…';try{const res=await fetch('/api/admin/voice-preview',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({voice,text:'Hi, this is a CallFocus voice preview. I am checking how natural this voice sounds in a relaxed phone conversation.'})});if(!res.ok){let message='Voice preview unavailable';try{message=(await res.json()).error||message}catch{}throw new Error(message)}const blob=await res.blob();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('voicePreviewAudio').src=previewUrl;$('voicePreviewAudio').classList.remove('hidden');await $('voicePreviewAudio').play();}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent=old}}
populateVoices();
document.querySelectorAll('[data-site-theme]').forEach(btn=>btn.addEventListener('click',()=>{const value=btn.dataset.siteTheme==='pearl'?'pearl':'black';$('adminSiteTheme').value=value;document.querySelectorAll('[data-site-theme]').forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});scheduleDraftBackup()}));
$('adminGateBtn').onclick=login;$('adminPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('adminServerOnline').onchange=()=>{renderServerState();scheduleDraftBackup()};$('saveAdminBtn').onclick=saveConfig;$('restoreAdminBackupBtn')?.addEventListener('click',restoreBackup);$('adminLockBtn').onclick=()=>{sessionStorage.removeItem('callfocus_admin_key');location.reload()};document.querySelectorAll('[data-preview]').forEach(btn=>btn.onclick=()=>previewVoice(btn.dataset.preview,btn));
['adminServerMessage','adminMaleVoice','adminFemaleVoice','adminSpeakingPace','adminSpeechStyle','adminInstructions','adminOpening','adminSpeakFirst','adminInterruptions'].forEach(id=>$(id)?.addEventListener('input',scheduleDraftBackup));
const remembered=sessionStorage.getItem('callfocus_admin_key');if(remembered){adminKey=remembered;api('/api/admin/config').then(r=>{$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!r.storageConnected&&backup?.config){fill(backup.config,false)}else{fill(r.config,r.storageConnected);if(r.storageConnected)saveBackup(r.config)}loadAdminUsers(true);}).catch(()=>{adminKey='';sessionStorage.removeItem('callfocus_admin_key')})}


function esc(value=''){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function adminCreditText(user){const credits=Math.max(0,Number(user?.wallet?.credits)||0);const seconds=Math.max(0,Number(user?.wallet?.balanceSeconds)||0);const mins=Math.floor(seconds/60),secs=seconds%60;return `${credits.toLocaleString(undefined,{maximumFractionDigits:1})} credits · ${mins}m ${String(secs).padStart(2,'0')}s`;}
function filteredAdminUsers(){const q=String($('adminUsersSearch')?.value||'').trim().toLowerCase();if(!q)return adminUsers;return adminUsers.filter(u=>[u.name,u.email,u.phone].some(v=>String(v||'').toLowerCase().includes(q)));}
function renderAdminUsers(){
  const root=$('adminUsersList'),summary=$('adminUsersSummary'); if(!root)return;
  const rows=filteredAdminUsers();
  const disabled=adminUsers.filter(u=>u.accountDisabled).length;
  const unlimited=adminUsers.filter(u=>u.unlimited).length;
  const funded=adminUsers.filter(u=>Number(u?.wallet?.purchaseCount||0)>0).length;
  if(summary)summary.textContent=`${adminUsers.length} loaded · ${funded} funded · ${unlimited} unlimited · ${disabled} disabled`;
  if(!rows.length){root.innerHTML='<div class="admin-users-empty">No matching customer accounts.</div>';return;}
  root.innerHTML=rows.map(u=>{
    const disabledClass=u.accountDisabled?' is-disabled':'';
    const status=u.accountDisabled?'Disabled':'Active';
    const access=u.unlimited?'Unlimited access':'Standard credit';
    const purchaseCount=Number(u?.wallet?.purchaseCount||0);
    const paid=Number(u?.wallet?.totalPaidNaira||0);
    const created=u.createdAt?new Date(u.createdAt).toLocaleDateString():'—';
    const lastFunded=u?.wallet?.lastPurchaseAt?new Date(u.wallet.lastPurchaseAt).toLocaleString():'No Paystack funding';
    return `<article class="admin-user-card${disabledClass}" data-admin-user="${esc(u.id)}">
      <div class="admin-user-main">
        <div class="admin-user-avatar">${esc((u.name||u.email||'?').trim().charAt(0).toUpperCase()||'?')}</div>
        <div class="admin-user-identity"><strong>${esc(u.name||'Unnamed user')}</strong><span>${esc(u.email)}</span><small>${esc(u.phone||'No phone')} · Joined ${esc(created)}</small></div>
        <div class="admin-user-badges"><span class="admin-user-badge ${u.accountDisabled?'bad':'good'}">${status}</span><span class="admin-user-badge ${u.unlimited?'gold':''}">${access}</span></div>
      </div>
      <div class="admin-user-stats">
        <div><span>Available balance</span><strong>${esc(adminCreditText(u))}</strong></div>
        <div><span>Paystack funding</span><strong>${purchaseCount} payment${purchaseCount===1?'':'s'} · ₦${paid.toLocaleString(undefined,{maximumFractionDigits:2})}</strong><small>${esc(lastFunded)}</small></div>
      </div>
      <div class="admin-user-actions">
        <button class="btn btn-ghost" type="button" data-user-action="${u.accountDisabled?'enable_account':'disable_account'}">${u.accountDisabled?'Enable account':'Disable account'}</button>
        <button class="btn btn-ghost" type="button" data-user-action="${u.unlimited?'revoke_unlimited':'grant_unlimited'}">${u.unlimited?'Turn off unlimited':'Give unlimited'}</button>
        <button class="btn admin-danger-btn" type="button" data-user-action="remove_balance" ${Number(u?.wallet?.balanceSeconds||0)<=0?'disabled':''}>Remove balance</button>
      </div>
    </article>`;
  }).join('');
}
async function loadAdminUsers(reset=false){
  if(adminUsersLoading)return; adminUsersLoading=true;
  const refresh=$('adminUsersRefreshBtn'),more=$('adminUsersMoreBtn');
  if(reset){adminUsers=[];adminUsersCursor='';if(refresh){refresh.disabled=true;refresh.textContent='Refreshing…';}}
  if(more){more.disabled=true;more.textContent='Loading…';}
  try{
    const qs=new URLSearchParams({limit:'50'}); if(adminUsersCursor)qs.set('cursor',adminUsersCursor);
    const result=await api(`/api/admin/users?${qs.toString()}`);
    const incoming=Array.isArray(result.users)?result.users:[];
    const byId=new Map(adminUsers.map(u=>[u.id,u])); incoming.forEach(u=>byId.set(u.id,u));
    adminUsers=[...byId.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    adminUsersCursor=String(result.cursor||'');
    if(more)more.classList.toggle('hidden',!adminUsersCursor);
    renderAdminUsers();
  }catch(err){toast(err.message);if(!adminUsers.length&&$('adminUsersList'))$('adminUsersList').innerHTML='<div class="admin-users-empty">Could not load customer accounts.</div>';}
  finally{adminUsersLoading=false;if(refresh){refresh.disabled=false;refresh.textContent='Refresh users';}if(more){more.disabled=false;more.textContent='Load more users';}}
}
function actionPrompt(action,user){
  if(action==='disable_account')return `Disable ${user.email}? They will be signed out and unable to sign in until you enable the account again.`;
  if(action==='enable_account')return `Enable ${user.email} again?`;
  if(action==='remove_balance')return `Remove the entire available balance from ${user.email}? Their Paystack purchase history will remain recorded, so those payments will not be credited again automatically.`;
  if(action==='grant_unlimited')return `Give ${user.email} unlimited CallFocus access?`;
  if(action==='revoke_unlimited')return `Turn off unlimited access for ${user.email}? Their normal credit balance will remain.`;
  return 'Apply this customer change?';
}
async function runAdminUserAction(card,button,action){
  const userId=card?.dataset?.adminUser; const user=adminUsers.find(u=>u.id===userId); if(!user)return;
  if(!confirm(actionPrompt(action,user)))return;
  const old=button.textContent;button.disabled=true;button.textContent='Working…';
  try{
    const result=await api('/api/admin/user-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action})});
    if(result.user){adminUsers=adminUsers.map(u=>u.id===result.user.id?result.user:u);renderAdminUsers();}
    if(Array.isArray(result.unlimitedCreditEmails)){unlimitedCreditEmails=result.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail);saveBackup({...formPayload(),unlimitedCreditEmails:[...unlimitedCreditEmails]});}
    const messages={disable_account:'Account disabled',enable_account:'Account enabled',remove_balance:'Balance removed',grant_unlimited:'Unlimited access enabled',revoke_unlimited:'Unlimited access removed'};
    toast(messages[action]||'Customer updated');
  }catch(err){toast(err.message);button.disabled=false;button.textContent=old;}
}
$('adminUsersRefreshBtn')?.addEventListener('click',()=>loadAdminUsers(true));
$('adminUsersMoreBtn')?.addEventListener('click',()=>loadAdminUsers(false));
$('adminUsersSearch')?.addEventListener('input',renderAdminUsers);
$('adminUsersList')?.addEventListener('click',e=>{const button=e.target.closest('[data-user-action]');if(!button)return;const card=button.closest('[data-admin-user]');runAdminUserAction(card,button,button.dataset.userAction);});

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
