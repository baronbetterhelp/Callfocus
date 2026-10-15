const CORE_VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const ADMIN_BUILD_VERSION='15.48-test';
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
const ADMIN_SESSION_KEY='callfocus_admin_session_v158';
function isAdminSessionToken(token=''){const v=String(token||'');return v.startsWith('session:')||v.startsWith('session2:')}
function rememberAdminSession(token){if(!isAdminSessionToken(token))return;localStorage.setItem(ADMIN_SESSION_KEY,token);sessionStorage.removeItem('callfocus_admin_key');}
function forgetAdminSession(){localStorage.removeItem(ADMIN_SESSION_KEY);sessionStorage.removeItem('callfocus_admin_key');}
let adminKey='';
let currentConfig=null;
let previewUrl='';
let draftTimer=null;
let unlimitedCreditEmails=[];
let adminUsers=[];
let adminUsersCursor='';
let adminUsersLoading=false;
let adminAiUsage=null;
let adminAiUsageLoading=false;
let customVoices=[];
let customVoiceAccess=null;
let adminManualPayments=[];
let adminManualPaymentsLoading=false;
let quickStartItems=[];
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function authHeaders(extra={}){return {'X-CallFocus-Admin-Key':adminKey,...extra}}
function coreVoiceOptions(){return CORE_VOICES.map(v=>`<option value="${v}">${v}${v==='marin'||v==='cedar'?' · recommended':''}</option>`).join('')}
function liveVoiceOptions(rows){return rows.map(([id,label])=>`<option value="${id}">${label} · Live only</option>`).join('')}
function customVoiceOptions(){return customVoices.map(v=>`<option value="${esc(v.id)}">${esc(v.name)} · Custom clone</option>`).join('')}
function populateVoices(){
  const custom=customVoiceOptions();
  const customGroup=custom?`<optgroup label="CallFocus custom voices">${custom}</optgroup>`:'';
  $('adminMaleVoice').innerHTML=`${customGroup}<optgroup label="Core GPT-Live voices">${coreVoiceOptions()}</optgroup><optgroup label="Additional masculine GPT-Live voices">${liveVoiceOptions(EXTRA_MALE_VOICES)}</optgroup>`;
  $('adminFemaleVoice').innerHTML=`${customGroup}<optgroup label="Core GPT-Live voices">${coreVoiceOptions()}</optgroup><optgroup label="Additional feminine GPT-Live voices">${liveVoiceOptions(EXTRA_FEMALE_VOICES)}</optgroup>`;
}
function renderServerState(){const online=$('adminServerOnline').checked;$('serverStateBadge').classList.toggle('offline',!online);$('serverStateBadge').querySelector('b').textContent=online?'Online':'Offline';if($('adminDashServer'))$('adminDashServer').textContent=online?'Online':'Offline'}
function readBackup(){try{return JSON.parse(localStorage.getItem(ADMIN_BACKUP_KEY)||'null')}catch{return null}}
function saveBackup(config){try{localStorage.setItem(ADMIN_BACKUP_KEY,JSON.stringify({savedAt:new Date().toISOString(),config}));renderBackupStatus()}catch{}}
async function saveScreenshotLimitsDirect(){
  const limits=screenshotLimits();
  if(limits.min>limits.max){renderScreenshotLimitsSummary();toast('Minimum screenshots cannot be higher than maximum screenshots');return false;}
  const btn=$('saveScreenshotLimitsBtn'); const old=btn?.textContent; if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{
    const result=await api('/api/admin/screenshot-limits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({min:limits.min,max:limits.max})});
    if(currentConfig){currentConfig={...currentConfig,...result.config};}
    if($('adminAnalysisScreenshotMin'))$('adminAnalysisScreenshotMin').value=result.min;
    if($('adminAnalysisScreenshotMax'))$('adminAnalysisScreenshotMax').value=result.max;
    renderScreenshotLimitsSummary();
    toast(`Screenshot limits saved: ${result.min}–${result.max}`);
    return true;
  }catch(err){toast(err.message||'Could not save screenshot limits');return false;}
  finally{if(btn){btn.disabled=false;btn.textContent=old||'Save screenshot limits';}}
}

const QUICK_START_ADMIN_DEFAULTS={
  youtubeEnabled:true,youtubePopupEnabled:true,youtubeFloatingEnabled:true,
  telegramEnabled:true,telegramPopupEnabled:true,telegramFloatingEnabled:true,
  popupEnabled:true,popupAppearDelaySeconds:2,popupAutoHideSeconds:8,
  floatingButtonEnabled:true,floatingAppearDelaySeconds:10,floatingAutoHideSeconds:null,
  panelEyebrow:'CallFocus quick start',panelTitle:'Learn how to use CallFocus',
  panelMessage:'Watch the step-by-step guide to see how to prepare your caller information, choose your call setup and start a CallFocus conversation.',
  youtubeTitle:'Watch how to use CallFocus',youtubeMessage:'Open the video guide here without leaving CallFocus',youtubeUrl:'https://youtu.be/t91M_7QkMyA',
  telegramTitle:'Join the CallFocus Telegram channel',telegramMessage:'Get updates, useful tools and CallFocus announcements',telegramUrl:'https://t.me/callfocus',customItems:[]
};
function quickSeconds(value,fallback=0){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.round(n*10)/10):fallback}
function quickOptionalSeconds(value,fallback=null){if(value===null||value===undefined||String(value).trim()==='')return fallback;const n=Number(value);return Number.isFinite(n)&&n>0?Math.round(n*10)/10:null}
function normalizeQuickStartAdmin(value={}){
  const src=value&&typeof value==='object'?value:{};
  const q={...QUICK_START_ADMIN_DEFAULTS,...src};
  const legacyAppear=quickSeconds(src.appearDelaySeconds,QUICK_START_ADMIN_DEFAULTS.popupAppearDelaySeconds);
  const legacyHide=quickOptionalSeconds(src.autoHideSeconds,QUICK_START_ADMIN_DEFAULTS.popupAutoHideSeconds);
  q.popupEnabled=src.popupEnabled!==false;
  q.popupAppearDelaySeconds=quickSeconds(src.popupAppearDelaySeconds,legacyAppear);
  q.popupAutoHideSeconds=Object.prototype.hasOwnProperty.call(src,'popupAutoHideSeconds')?quickOptionalSeconds(src.popupAutoHideSeconds,null):legacyHide;
  q.floatingButtonEnabled=src.floatingButtonEnabled!==false;
  q.floatingAppearDelaySeconds=quickSeconds(src.floatingAppearDelaySeconds,legacyAppear+(legacyHide||0));
  q.floatingAutoHideSeconds=Object.prototype.hasOwnProperty.call(src,'floatingAutoHideSeconds')?quickOptionalSeconds(src.floatingAutoHideSeconds,null):null;
  q.youtubePopupEnabled=src.youtubePopupEnabled!==false;q.youtubeFloatingEnabled=src.youtubeFloatingEnabled!==false;
  q.telegramPopupEnabled=src.telegramPopupEnabled!==false;q.telegramFloatingEnabled=src.telegramFloatingEnabled!==false;
  q.customItems=(Array.isArray(q.customItems)?q.customItems:[]).slice(0,8).map((row,index)=>({
    id:String(row?.id||`promo_${index+1}`).replace(/[^A-Za-z0-9_-]/g,'').slice(0,48)||`promo_${index+1}`,
    enabled:row?.enabled!==false,popupEnabled:row?.popupEnabled!==false,floatingEnabled:row?.floatingEnabled!==false,
    title:String(row?.title||'CallFocus update').slice(0,120),message:String(row?.message||'').slice(0,260),link:String(row?.link||'').slice(0,1200),logo:String(row?.logo||row?.logoDataUrl||'').slice(0,500000)
  }));
  return q;
}
function quickStartPayload(){
  const popupCloseRaw=$('adminQuickPopupHideSeconds')?.value??'';
  const floatingCloseRaw=$('adminQuickFloatingHideSeconds')?.value??'';
  return {
    popupEnabled:$('adminQuickPopupEnabled')?.checked!==false,
    popupAppearDelaySeconds:quickSeconds($('adminQuickPopupAppearSeconds')?.value,0),
    popupAutoHideSeconds:quickOptionalSeconds(popupCloseRaw,null),
    floatingButtonEnabled:$('adminQuickFloatingEnabled')?.checked!==false,
    floatingAppearDelaySeconds:quickSeconds($('adminQuickFloatingAppearSeconds')?.value,0),
    floatingAutoHideSeconds:quickOptionalSeconds(floatingCloseRaw,null),
    youtubeEnabled:$('adminQuickYoutubeEnabled')?.checked!==false,
    youtubePopupEnabled:$('adminQuickYoutubePopupEnabled')?.checked!==false,
    youtubeFloatingEnabled:$('adminQuickYoutubeFloatingEnabled')?.checked!==false,
    telegramEnabled:$('adminQuickTelegramEnabled')?.checked!==false,
    telegramPopupEnabled:$('adminQuickTelegramPopupEnabled')?.checked!==false,
    telegramFloatingEnabled:$('adminQuickTelegramFloatingEnabled')?.checked!==false,
    panelEyebrow:$('adminQuickEyebrow')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.panelEyebrow,
    panelTitle:$('adminQuickTitle')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.panelTitle,
    panelMessage:$('adminQuickMessage')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.panelMessage,
    youtubeTitle:$('adminQuickYoutubeTitle')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.youtubeTitle,
    youtubeMessage:$('adminQuickYoutubeMessage')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.youtubeMessage,
    youtubeUrl:$('adminQuickYoutubeUrl')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.youtubeUrl,
    telegramTitle:$('adminQuickTelegramTitle')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.telegramTitle,
    telegramMessage:$('adminQuickTelegramMessage')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.telegramMessage,
    telegramUrl:$('adminQuickTelegramUrl')?.value.trim()||QUICK_START_ADMIN_DEFAULTS.telegramUrl,
    customItems:quickStartItems.map(row=>({...row}))
  };
}
async function saveQuickStartDirect(){
  const btn=$('saveQuickStartBtn'),old=btn?.textContent||'Save Quick Start settings';
  if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{
    const result=await api('/api/admin/quick-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quickStart:quickStartPayload()})});
    if(currentConfig)currentConfig={...currentConfig,quickStart:result.quickStart,updatedAt:result.config?.updatedAt||currentConfig.updatedAt};
    fillQuickStart(result.quickStart||{});saveBackup({...formPayload(),quickStart:result.quickStart||quickStartPayload()});toast('Quick Start settings saved');return true;
  }catch(err){if(err?.status===401||err?.status===403)toast('Your admin session needs to be renewed. Sign in once, then save again.');else toast(err.message||'Could not save Quick Start settings');return false}
  finally{if(btn){btn.disabled=false;btn.textContent=old}}
}
function fillQuickStart(value={}){
  const q=normalizeQuickStartAdmin(value);
  if($('adminQuickPopupEnabled'))$('adminQuickPopupEnabled').checked=q.popupEnabled!==false;
  if($('adminQuickPopupAppearSeconds'))$('adminQuickPopupAppearSeconds').value=q.popupAppearDelaySeconds;
  if($('adminQuickPopupHideSeconds'))$('adminQuickPopupHideSeconds').value=q.popupAutoHideSeconds??'';
  if($('adminQuickFloatingEnabled'))$('adminQuickFloatingEnabled').checked=q.floatingButtonEnabled!==false;
  if($('adminQuickFloatingAppearSeconds'))$('adminQuickFloatingAppearSeconds').value=q.floatingAppearDelaySeconds;
  if($('adminQuickFloatingHideSeconds'))$('adminQuickFloatingHideSeconds').value=q.floatingAutoHideSeconds??'';
  if($('adminQuickYoutubeEnabled'))$('adminQuickYoutubeEnabled').checked=q.youtubeEnabled!==false;
  if($('adminQuickYoutubePopupEnabled'))$('adminQuickYoutubePopupEnabled').checked=q.youtubePopupEnabled!==false;
  if($('adminQuickYoutubeFloatingEnabled'))$('adminQuickYoutubeFloatingEnabled').checked=q.youtubeFloatingEnabled!==false;
  if($('adminQuickTelegramEnabled'))$('adminQuickTelegramEnabled').checked=q.telegramEnabled!==false;
  if($('adminQuickTelegramPopupEnabled'))$('adminQuickTelegramPopupEnabled').checked=q.telegramPopupEnabled!==false;
  if($('adminQuickTelegramFloatingEnabled'))$('adminQuickTelegramFloatingEnabled').checked=q.telegramFloatingEnabled!==false;
  if($('adminQuickEyebrow'))$('adminQuickEyebrow').value=q.panelEyebrow;if($('adminQuickTitle'))$('adminQuickTitle').value=q.panelTitle;if($('adminQuickMessage'))$('adminQuickMessage').value=q.panelMessage;
  if($('adminQuickYoutubeTitle'))$('adminQuickYoutubeTitle').value=q.youtubeTitle;if($('adminQuickYoutubeMessage'))$('adminQuickYoutubeMessage').value=q.youtubeMessage;if($('adminQuickYoutubeUrl'))$('adminQuickYoutubeUrl').value=q.youtubeUrl;
  if($('adminQuickTelegramTitle'))$('adminQuickTelegramTitle').value=q.telegramTitle;if($('adminQuickTelegramMessage'))$('adminQuickTelegramMessage').value=q.telegramMessage;if($('adminQuickTelegramUrl'))$('adminQuickTelegramUrl').value=q.telegramUrl;
  quickStartItems=q.customItems.map(row=>({...row}));renderCustomPromos();
}
function promoId(){try{return `promo_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`}catch{return `promo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}}
function promoInitial(row){return String(row?.title||'C').trim().slice(0,1).toUpperCase()||'C'}
function renderCustomPromos(){
  const root=$('adminCustomPromos');if(!root)return;
  if(!quickStartItems.length){root.innerHTML='<div class="admin-users-empty">No custom promos yet.</div>';return}
  root.innerHTML=quickStartItems.map((row,index)=>`<article class="admin-custom-promo" data-promo-id="${esc(row.id)}"><div class="admin-custom-promo-head"><div class="admin-custom-promo-title"><span class="admin-custom-promo-preview">${row.logo?`<img src="${esc(row.logo)}" alt="" />`:esc(promoInitial(row))}</span><span><strong>${esc(row.title||`Promo ${index+1}`)}</strong><small>Custom promo ${index+1}</small></span></div><button class="admin-promo-delete" type="button" data-promo-delete>Delete</button></div><div class="quickstart-channel-row custom"><label class="admin-promo-enabled"><span>Promo on</span><input type="checkbox" data-promo-field="enabled" ${row.enabled!==false?'checked':''} /></label><label class="admin-promo-enabled"><span>Popup</span><input type="checkbox" data-promo-field="popupEnabled" ${row.popupEnabled!==false?'checked':''} /></label><label class="admin-promo-enabled"><span>Floating</span><input type="checkbox" data-promo-field="floatingEnabled" ${row.floatingEnabled!==false?'checked':''} /></label></div><div class="form-grid two"><label>Title<input data-promo-field="title" maxlength="120" value="${esc(row.title||'')}" placeholder="New CallFocus update" /></label><label>Destination link<input data-promo-field="link" maxlength="1200" value="${esc(row.link||'')}" placeholder="https://..." /></label></div><label>Short message<textarea data-promo-field="message" rows="3" maxlength="260" placeholder="What should customers know?">${esc(row.message||'')}</textarea></label><div class="admin-promo-logo-row"><label>Logo picture<input type="file" data-promo-logo accept="image/png,image/jpeg,image/webp,image/gif" /></label><button class="btn btn-ghost admin-promo-clear-logo" type="button" data-promo-clear-logo ${row.logo?'':'disabled'}>Remove logo</button></div><div class="admin-promo-meta">Turn the promo on, then choose Popup, Floating, or both. Leaving both display methods off keeps the promo saved but not shown.</div></article>`).join('');
}
async function promoLogoData(file){if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Choose a PNG, JPG or WebP image.');if(file.size>8*1024*1024)throw new Error('Logo image must be under 8 MB.');const url=URL.createObjectURL(file);try{const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('Could not read that logo image.'));el.src=url});const side=Math.min(192,Math.max(img.naturalWidth||1,img.naturalHeight||1));const scale=Math.min(1,side/Math.max(img.naturalWidth||1,img.naturalHeight||1));const w=Math.max(1,Math.round((img.naturalWidth||1)*scale)),h=Math.max(1,Math.round((img.naturalHeight||1)*scale));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d',{alpha:true}).drawImage(img,0,0,w,h);let data=canvas.toDataURL('image/webp',.86);if(data.length>450000)data=canvas.toDataURL('image/jpeg',.78);if(data.length>500000)throw new Error('Logo is still too large after resizing. Try a simpler image.');return data}finally{URL.revokeObjectURL(url)}}
function addCustomPromo(){if(quickStartItems.length>=8)return toast('You can add up to 8 custom promos');quickStartItems.push({id:promoId(),enabled:true,popupEnabled:true,floatingEnabled:true,title:'CallFocus update',message:'',link:'',logo:''});renderCustomPromos();scheduleDraftBackup();setTimeout(()=>document.querySelector('.admin-custom-promo:last-child input[data-promo-field="title"]')?.focus(),0)}
function bindQuickStartManager(){
  const root=$('adminCustomPromos');$('adminAddPromoBtn')?.addEventListener('click',addCustomPromo);$('saveQuickStartBtn')?.addEventListener('click',saveQuickStartDirect);
  root?.addEventListener('input',event=>{const card=event.target.closest?.('[data-promo-id]');if(!card)return;const row=quickStartItems.find(item=>item.id===card.dataset.promoId);if(!row)return;const field=event.target.dataset.promoField;if(!field)return;if(['enabled','popupEnabled','floatingEnabled'].includes(field))row[field]=event.target.checked;else row[field]=event.target.value;scheduleDraftBackup()});
  root?.addEventListener('change',async event=>{const card=event.target.closest?.('[data-promo-id]');if(!card)return;const row=quickStartItems.find(item=>item.id===card.dataset.promoId);if(!row)return;if(event.target.matches('[data-promo-field="enabled"],[data-promo-field="popupEnabled"],[data-promo-field="floatingEnabled"]')){row[event.target.dataset.promoField]=event.target.checked;scheduleDraftBackup();return}if(event.target.matches('[data-promo-logo]')){const file=event.target.files?.[0];event.target.value='';if(!file)return;try{row.logo=await promoLogoData(file);renderCustomPromos();scheduleDraftBackup();toast('Logo prepared. Save Quick Start settings to publish it.')}catch(err){toast(err.message)}}});
  root?.addEventListener('click',event=>{const card=event.target.closest?.('[data-promo-id]');if(!card)return;const id=card.dataset.promoId;if(event.target.closest('[data-promo-delete]')){quickStartItems=quickStartItems.filter(row=>row.id!==id);renderCustomPromos();scheduleDraftBackup();toast('Promo removed. Save settings to publish the change.');return}if(event.target.closest('[data-promo-clear-logo]')){const row=quickStartItems.find(item=>item.id===id);if(row){row.logo='';renderCustomPromos();scheduleDraftBackup();toast('Logo removed. Save settings to publish the change.')}}});
}

function screenshotLimits(){const min=Math.max(1,Math.min(50,Math.round(Number($('adminAnalysisScreenshotMin')?.value)||20)));const max=Math.max(1,Math.min(50,Math.round(Number($('adminAnalysisScreenshotMax')?.value)||50)));return {min,max};}
function renderScreenshotLimitsSummary(){const box=$('adminScreenshotLimitsSummary');if(!box)return;const {min,max}=screenshotLimits();box.innerHTML=min<=max?`Customers must upload between <strong>${min} and ${max} screenshot${max===1?'':'s'}</strong> before either generator can run. Allowed admin range: 1–50.`:`Minimum cannot be higher than maximum. Current values: <strong>${min}</strong> minimum and <strong>${max}</strong> maximum.`;box.classList.toggle('bad',min>max);}
function formPayload(){const limits=screenshotLimits();return {customVoices:[...customVoices],unlimitedCreditEmails:[...unlimitedCreditEmails],siteTheme:$('adminSiteTheme').value||'black',serverOnline:$('adminServerOnline').checked,serverMessage:$('adminServerMessage').value.trim(),maleVoice:$('adminMaleVoice').value,femaleVoice:$('adminFemaleVoice').value,model:'gpt-live-1',speakingPace:$('adminSpeakingPace').value,speechStyle:$('adminSpeechStyle').value.trim(),instructions:$('adminInstructions').value.trim(),opening:$('adminOpening').value.trim(),speakFirst:$('adminSpeakFirst').checked,interruptions:$('adminInterruptions').checked,manualPaymentsEnabled:$('adminManualPaymentsEnabled')?.checked===true,manualPaymentBankName:$('adminManualBankName')?.value.trim()||'',manualPaymentAccountName:$('adminManualAccountName')?.value.trim()||'',manualPaymentAccountNumber:$('adminManualAccountNumber')?.value.replace(/[^0-9]/g,'')||'',manualPaymentNotificationEmail:$('adminManualPaymentEmail')?.value.trim().toLowerCase()||'support@callfocus.link',analysisScreenshotMin:limits.min,analysisScreenshotMax:limits.max,autoFillScreenshotLimit:limits.max,quickStart:quickStartPayload()}}
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
function fill(config,storageConnected){currentConfig=config;customVoices=Array.isArray(config.customVoices)?config.customVoices:[];populateVoices();renderCustomVoiceLibrary();unlimitedCreditEmails=Array.isArray(config.unlimitedCreditEmails)?[...new Set(config.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail))]:[];renderUnlimitedUsers();$('adminSiteTheme').value=config.siteTheme||'black';document.querySelectorAll('[data-site-theme]').forEach(btn=>{const on=btn.dataset.siteTheme===$('adminSiteTheme').value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});$('adminServerOnline').checked=config.serverOnline!==false;$('adminServerMessage').value=config.serverMessage||'';$('adminMaleVoice').value=config.maleVoice||'cedar';$('adminFemaleVoice').value=config.femaleVoice||'marin';$('adminModel').value='gpt-live-1';$('adminSpeakingPace').value=config.speakingPace||'relaxed';$('adminSpeechStyle').value=config.speechStyle||'';$('adminInstructions').value=config.instructions||'';$('adminOpening').value=config.opening||'';$('adminSpeakFirst').checked=config.speakFirst!==false;$('adminInterruptions').checked=config.interruptions!==false;if($('adminManualPaymentsEnabled'))$('adminManualPaymentsEnabled').checked=config.manualPaymentsEnabled===true;if($('adminManualBankName'))$('adminManualBankName').value=config.manualPaymentBankName||'';if($('adminManualAccountName'))$('adminManualAccountName').value=config.manualPaymentAccountName||'';if($('adminManualAccountNumber'))$('adminManualAccountNumber').value=config.manualPaymentAccountNumber||'';if($('adminManualPaymentEmail'))$('adminManualPaymentEmail').value=config.manualPaymentNotificationEmail||'support@callfocus.link';if($('adminAnalysisScreenshotMin'))$('adminAnalysisScreenshotMin').value=Math.max(1,Math.min(50,Math.round(Number(config.analysisScreenshotMin)||20)));if($('adminAnalysisScreenshotMax'))$('adminAnalysisScreenshotMax').value=Math.max(1,Math.min(50,Math.round(Number(config.analysisScreenshotMax)||Number(config.autoFillScreenshotLimit)||50)));fillQuickStart(config.quickStart||{});renderScreenshotLimitsSummary();$('adminStorageStatus').textContent=storageConnected?'Global settings storage connected':'Global settings storage is not connected yet';$('adminStorageStatus').classList.toggle('bad',!storageConnected);if($('adminDashStorage'))$('adminDashStorage').textContent=storageConnected?'Global storage connected':'Storage needs attention';renderServerState();renderBackupStatus(storageConnected)}
async function api(path,options={}){const res=await fetch(path,{credentials:'same-origin',...options,headers:authHeaders(options.headers||{})});const type=res.headers.get('content-type')||'';const data=type.includes('application/json')?await res.json():await res.text();if(!res.ok)throw Object.assign(new Error(data?.error||data||'Request failed'),{status:res.status});return data}
async function login(){const key=$('adminPasscode').value.trim();if(!key)return toast('Enter your admin passcode');adminKey=key;try{const auth=await api('/api/admin/login',{method:'POST'});adminKey=auth.adminToken||key;rememberAdminSession(adminKey);$('adminPasscode').value='';const result=await api('/api/admin/config');$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!result.storageConnected&&backup?.config){fill(backup.config,false);toast('KV disconnected — protected settings restored on this device')}else{fill(result.config,result.storageConnected);if(result.storageConnected)saveBackup(result.config)}loadAdminUsers(true);loadAdminAiUsage();loadAdminCallUsage();loadAdminBilledCosts();loadAdminManualPayments();}catch(err){adminKey='';if(err.status===401||err.status===403)forgetAdminSession();$('adminGateNote').textContent=err.message;toast(err.message)}}
async function saveConfig(message='Global CallFocus settings saved'){
  const btn=$('saveAdminBtn'),old=btn?.textContent||'Save global settings';
  if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{
    const limits=screenshotLimits();
    if(limits.min>limits.max){renderScreenshotLimitsSummary();toast('Minimum screenshots cannot be higher than maximum screenshots');return false;}
    const payload=formPayload();saveBackup(payload);
    const result=await api('/api/admin/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    fill(result.config,true);saveBackup(result.config);toast(message);return true;
  }catch(err){
    renderBackupStatus(false);
    if(err?.status===401||err?.status===403)toast('Your admin session needs to be renewed. Sign in once, then save again.');
    else toast(`${err.message||'Could not save global settings'} — your settings are protected on this device`);
    return false;
  }finally{if(btn){btn.disabled=false;btn.textContent=old}}
}
function restoreBackup(){const b=readBackup();if(!b?.config)return toast('No protected backup found');fill(b.config,!!currentConfig);toast('Protected settings loaded. Press Save global settings to write them to KV.')}
function scheduleDraftBackup(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{saveBackup(formPayload())}catch{}},350)}
async function previewVoice(kind,button){const voice=kind==='female'?$('adminFemaleVoice').value:$('adminMaleVoice').value;if(LIVE_ONLY_VOICES.has(voice)&&!String(voice).startsWith('voice_'))return toast('This is a GPT-Live-only voice. Save it and place a short test call to audition it.');const old=button.textContent;button.disabled=true;button.textContent='Preparing preview…';try{const res=await fetch('/api/admin/voice-preview',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({voice,text:'Hi, this is a CallFocus voice preview. I am checking how natural this voice sounds in a relaxed phone conversation.'})});if(!res.ok){let message='Voice preview unavailable';try{message=(await res.json()).error||message}catch{}throw new Error(message)}const blob=await res.blob();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('voicePreviewAudio').src=previewUrl;$('voicePreviewAudio').classList.remove('hidden');await $('voicePreviewAudio').play();}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent=old}}

function renderCustomVoiceLibrary(){
  const root=$('customVoiceLibrary'); if(!root)return;
  if(!customVoices.length){root.innerHTML='<div class="admin-users-empty">No custom voices created yet.</div>';return;}
  const male=$('adminMaleVoice')?.value||currentConfig?.maleVoice||'';
  const female=$('adminFemaleVoice')?.value||currentConfig?.femaleVoice||'';
  root.innerHTML=customVoices.map(v=>{
    const assigned=[male===v.id?'Male':'',female===v.id?'Female':''].filter(Boolean).join(' + ');
    return `<article class="custom-voice-item"><div><strong>${esc(v.name)}</strong><span>${assigned?`Assigned to ${assigned}`:'Available in voice selectors'}${v.createdAt?` · ${esc(new Date(v.createdAt).toLocaleDateString())}`:''}</span></div><button type="button" class="btn btn-ghost custom-voice-preview" data-custom-preview="${esc(v.id)}">Preview</button></article>`;
  }).join('');
}
async function checkCustomVoiceAccess(){
  const btn=$('checkCustomVoiceAccessBtn'),status=$('customVoiceAccessStatus'); if(!btn||!status)return;
  const old=btn.textContent;btn.disabled=true;btn.textContent='Checking…';status.textContent='Checking your OpenAI project…';status.className='custom-voice-access';
  try{
    const result=await api('/api/admin/custom-voices/access');customVoiceAccess=result;
    status.textContent=result.enabled?'Custom voice access is enabled. You can create a consent-based clone below.':`${result.message||'Custom voice access is not enabled yet.'}${result.status?` (HTTP ${result.status})`:''}`;
    status.className=`custom-voice-access ${result.enabled?'good':'warn'}`;
  }catch(err){status.textContent=err.message;status.className='custom-voice-access warn';}
  finally{btn.disabled=false;btn.textContent=old;}
}
async function createCustomVoice(event){
  event.preventDefault();
  const btn=$('createCustomVoiceBtn');
  const name=$('customVoiceName')?.value.trim()||'';
  const consent=$('customVoiceConsentFile')?.files?.[0];
  const sample=$('customVoiceSampleFile')?.files?.[0];
  if(!name)return toast('Give the custom voice a name');
  if(!$('customVoiceOwnership')?.checked)return toast('Confirm the speaker owns and consented to this voice');
  if(!consent||!sample)return toast('Upload both the consent recording and voice sample');
  if(consent.size>10*1024*1024||sample.size>10*1024*1024)return toast('Each audio file must be 10 MB or smaller');
  const old=btn.textContent;btn.disabled=true;btn.textContent='Creating voice…';
  try{
    const form=new FormData();form.set('name',name);form.set('assignSlot',$('customVoiceAssignSlot')?.value||'none');form.set('ownershipConfirmed','true');form.set('consentRecording',consent,consent.name);form.set('sampleRecording',sample,sample.name);
    const res=await fetch('/api/admin/custom-voices/create',{method:'POST',headers:authHeaders(),body:form});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||'Could not create custom voice');
    fill(data.config,true);saveBackup(data.config);$('customVoiceForm')?.reset();toast(`Custom voice “${data.voice?.name||name}” created`);
    const status=$('customVoiceAccessStatus');if(status){status.textContent='Custom voice created successfully and added to CallFocus.';status.className='custom-voice-access good';}
  }catch(err){toast(err.message);const status=$('customVoiceAccessStatus');if(status){status.textContent=err.message;status.className='custom-voice-access warn';}}
  finally{btn.disabled=false;btn.textContent=old;}
}
$('checkCustomVoiceAccessBtn')?.addEventListener('click',checkCustomVoiceAccess);
$('customVoiceForm')?.addEventListener('submit',createCustomVoice);
$('customVoiceLibrary')?.addEventListener('click',e=>{const b=e.target.closest('[data-custom-preview]');if(b)previewVoiceById(b.dataset.customPreview,b);});
async function previewVoiceById(voice,button){const old=button.textContent;button.disabled=true;button.textContent='Preparing…';try{const res=await fetch('/api/admin/voice-preview',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({voice,text:'Hi, this is a CallFocus custom voice preview. I am checking how natural this voice sounds in a relaxed phone conversation.'})});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||'Voice preview unavailable')}const blob=await res.blob();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('voicePreviewAudio').src=previewUrl;$('voicePreviewAudio').classList.remove('hidden');await $('voicePreviewAudio').play();}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent=old}}
$('adminMaleVoice')?.addEventListener('change',renderCustomVoiceLibrary);
$('adminFemaleVoice')?.addEventListener('change',renderCustomVoiceLibrary);

populateVoices();
document.querySelectorAll('[data-site-theme]').forEach(btn=>btn.addEventListener('click',()=>{const value=btn.dataset.siteTheme==='pearl'?'pearl':'black';$('adminSiteTheme').value=value;document.querySelectorAll('[data-site-theme]').forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});scheduleDraftBackup()}));
$('adminGateBtn').onclick=login;$('adminPasscode').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('adminServerOnline').onchange=()=>{renderServerState();scheduleDraftBackup()};$('saveAdminBtn').onclick=()=>saveConfig();$('saveScreenshotLimitsBtn')?.addEventListener('click',saveScreenshotLimitsDirect);$('restoreAdminBackupBtn')?.addEventListener('click',restoreBackup);$('adminLockBtn').onclick=()=>{const key=adminKey;forgetAdminSession();adminKey='';fetch('/api/admin/logout',{method:'POST',headers:{'X-CallFocus-Admin-Key':key},keepalive:true}).catch(()=>{});location.reload()};document.querySelectorAll('[data-preview]').forEach(btn=>btn.onclick=()=>previewVoice(btn.dataset.preview,btn));
['adminServerMessage','adminMaleVoice','adminFemaleVoice','adminSpeakingPace','adminSpeechStyle','adminInstructions','adminOpening','adminSpeakFirst','adminInterruptions','adminAnalysisScreenshotMin','adminAnalysisScreenshotMax'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='adminAnalysisScreenshotMin'||id==='adminAnalysisScreenshotMax')renderScreenshotLimitsSummary();scheduleDraftBackup();}));
['adminQuickPopupEnabled','adminQuickPopupAppearSeconds','adminQuickPopupHideSeconds','adminQuickFloatingEnabled','adminQuickFloatingAppearSeconds','adminQuickFloatingHideSeconds','adminQuickYoutubeEnabled','adminQuickYoutubePopupEnabled','adminQuickYoutubeFloatingEnabled','adminQuickTelegramEnabled','adminQuickTelegramPopupEnabled','adminQuickTelegramFloatingEnabled','adminQuickEyebrow','adminQuickTitle','adminQuickMessage','adminQuickYoutubeTitle','adminQuickYoutubeMessage','adminQuickYoutubeUrl','adminQuickTelegramTitle','adminQuickTelegramMessage','adminQuickTelegramUrl'].forEach(id=>$(id)?.addEventListener('input',scheduleDraftBackup));
bindQuickStartManager();
(async()=>{try{const r=await fetch('/api/app-version',{cache:'no-store'});const d=await r.json();if(String(d?.version||'')&&String(d.version)!==ADMIN_BUILD_VERSION&&!sessionStorage.getItem('callfocus_admin_reload_'+d.version)){sessionStorage.setItem('callfocus_admin_reload_'+d.version,'1');location.replace('/admin?build='+encodeURIComponent(d.version)+'&t='+Date.now());}}catch{}})();
let restoringAdmin=false;
async function restoreRememberedAdmin(){
  const remembered=localStorage.getItem(ADMIN_SESSION_KEY)||sessionStorage.getItem('callfocus_admin_key');
  if(!remembered||restoringAdmin)return;
  restoringAdmin=true;adminKey=remembered;
  try{
    const r=await api('/api/admin/config');if(adminKey!==remembered)return;
    if(!remembered.startsWith('session2:')){const auth=await api('/api/admin/login',{method:'POST'});if(adminKey!==remembered)return;adminKey=auth.adminToken||remembered;rememberAdminSession(adminKey);}
    $('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');
    const backup=readBackup();
    if(!r.storageConnected&&backup?.config)fill(backup.config,false);else{fill(r.config,r.storageConnected);if(r.storageConnected)saveBackup(r.config);}
    loadAdminUsers(true);loadAdminAiUsage();loadAdminCallUsage();loadAdminBilledCosts();loadAdminManualPayments();
  }catch(err){
    if(adminKey!==remembered)return;
    adminKey='';if(err.status===401||err.status===403)forgetAdminSession();else $('adminGateNote').textContent='Your sign-in is remembered. Refresh when the connection is available.';
  }finally{restoringAdmin=false;}
}
restoreRememberedAdmin();
window.addEventListener('online',()=>{if(!adminKey)restoreRememberedAdmin()});
window.addEventListener('pageshow',()=>{if(!adminKey)restoreRememberedAdmin()});



function esc(value=''){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function adminCreditText(user){const credits=Math.max(0,Number(user?.wallet?.credits)||0);const seconds=Math.max(0,Number(user?.wallet?.balanceSeconds)||0);const mins=Math.floor(seconds/60),secs=seconds%60;return `${credits.toLocaleString(undefined,{maximumFractionDigits:1})} credits · ${mins}m ${String(secs).padStart(2,'0')}s`;}
function filteredAdminUsers(){const q=String($('adminUsersSearch')?.value||'').trim().toLowerCase();if(!q)return adminUsers;return adminUsers.filter(u=>[u.name,u.email,u.phone].some(v=>String(v||'').toLowerCase().includes(q)));}
function renderAdminUsers(){
  const root=$('adminUsersList'),summary=$('adminUsersSummary'); if(!root)return;
  const rows=filteredAdminUsers();
  const disabled=adminUsers.filter(u=>u.accountDisabled).length;
  const unlimited=adminUsers.filter(u=>u.unlimited).length;
  const funded=adminUsers.filter(u=>Number(u?.wallet?.purchaseCount||0)>0).length;
  if(summary)summary.textContent=`${adminUsers.length} loaded · ${funded} funded · ${unlimited} unlimited · ${disabled} disabled`;if($('adminDashUsers'))$('adminDashUsers').textContent=String(adminUsers.length);if($('adminDashFunded'))$('adminDashFunded').textContent=String(funded);if($('adminDashUsersNote'))$('adminDashUsersNote').textContent=`${disabled} disabled · ${unlimited} unlimited`;
  if(!rows.length){root.innerHTML='<div class="admin-users-empty">No matching customer accounts.</div>';return;}
  root.innerHTML=rows.map(u=>{
    const disabledClass=u.accountDisabled?' is-disabled':'';
    const status=u.accountDisabled?'Disabled':'Active';
    const access=u.unlimited?'Unlimited access':'Standard credit';
    const purchaseCount=Number(u?.wallet?.purchaseCount||0);
    const paid=Number(u?.wallet?.totalPaidNaira||0);
    const created=u.createdAt?new Date(u.createdAt).toLocaleDateString():'—';
    const lastFunded=u?.wallet?.lastPurchaseAt?new Date(u.wallet.lastPurchaseAt).toLocaleString():'No verified funding';
    return `<article class="admin-user-card${disabledClass}" data-admin-user="${esc(u.id)}">
      <div class="admin-user-main">
        <div class="admin-user-avatar">${esc((u.name||u.email||'?').trim().charAt(0).toUpperCase()||'?')}</div>
        <div class="admin-user-identity"><strong>${esc(u.name||'Unnamed user')}</strong><span>${esc(u.email)}</span><small>${esc(u.phone||'No phone')} · Joined ${esc(created)}</small></div>
        <div class="admin-user-badges"><span class="admin-user-badge ${u.accountDisabled?'bad':'good'}">${status}</span><span class="admin-user-badge ${u.unlimited?'gold':''}">${access}</span></div>
      </div>
      <div class="admin-user-stats">
        <div><span>Available balance</span><strong>${esc(adminCreditText(u))}</strong></div>
        <div><span>Verified funding</span><strong>${purchaseCount} payment${purchaseCount===1?'':'s'} · ₦${paid.toLocaleString(undefined,{maximumFractionDigits:2})}</strong><small>${esc(lastFunded)}</small></div>
      </div>
      <div class="admin-user-actions">
        <button class="btn btn-ghost admin-add-credit-toggle" type="button" data-user-credit-toggle>Add balance</button>
        <button class="btn btn-ghost" type="button" data-user-action="${u.accountDisabled?'enable_account':'disable_account'}">${u.accountDisabled?'Enable account':'Disable account'}</button>
        <button class="btn btn-ghost" type="button" data-user-action="${u.unlimited?'revoke_unlimited':'grant_unlimited'}">${u.unlimited?'Turn off unlimited':'Give unlimited'}</button>
        <button class="btn admin-danger-btn" type="button" data-user-action="remove_balance" ${Number(u?.wallet?.balanceSeconds||0)<=0?'disabled':''}>Remove balance</button>
        <button class="btn admin-danger-btn admin-delete-account-btn" type="button" data-user-action="delete_account">Delete account</button>
      </div>
      <div class="admin-credit-grant hidden" data-user-credit-panel>
        <div class="admin-credit-grant-head"><strong>Add custom balance</strong><small>Credits are added directly to the customer wallet and are not counted as a paid purchase.</small></div>
        <div class="admin-credit-grant-grid">
          <label>Credits<input type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="100" data-user-credit-amount /></label>
          <label>Notification message<textarea rows="3" maxlength="360" data-user-credit-message>You received {amount} credits courtesy of Baron.</textarea><small>Use {amount} for the credit amount and {name} for the customer name.</small></label>
        </div>
        <button class="btn btn-primary" type="button" data-user-credit-submit>Add credits & send notification</button>
      </div>
    </article>`;
  }).join('');
}
async function loadAdminUsers(reset=false){
  if(adminUsersLoading)return; adminUsersLoading=true;
  const refresh=$('adminUsersRefreshBtn'),more=$('adminUsersMoreBtn');
  if(reset){adminUsers=[];adminUsersCursor='';if(refresh){refresh.disabled=true;refresh.textContent='Refreshing all…';}}
  if(more){more.disabled=true;more.textContent='Loading…';}
  let listComplete=false;
  let pagesLoaded=0;
  try{
    // V15.45: the Customers page is an "All CallFocus users" view. On initial
    // load and Refresh, walk every available KV page instead of silently
    // stopping after the first 50. Manual Load more still fetches one page.
    do{
      const qs=new URLSearchParams({limit:'50'}); if(adminUsersCursor)qs.set('cursor',adminUsersCursor);
      const result=await api(`/api/admin/users?${qs.toString()}`);
      const incoming=Array.isArray(result.users)?result.users:[];
      const byId=new Map(adminUsers.map(u=>[u.id,u])); incoming.forEach(u=>byId.set(u.id,u));
      adminUsers=[...byId.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
      adminUsersCursor=String(result.cursor||'');
      listComplete=!!result.listComplete || !adminUsersCursor;
      pagesLoaded+=1;
      renderAdminUsers();
      if(!reset || listComplete)break;
      // Yield briefly so mobile Safari can keep the admin interface responsive.
      await new Promise(resolve=>setTimeout(resolve,0));
    }while(adminUsersCursor && pagesLoaded<40);
    if(more)more.classList.toggle('hidden',!adminUsersCursor);
    const summary=$('adminUsersSummary');
    if(summary && listComplete){
      const disabled=adminUsers.filter(u=>u.accountDisabled).length;
      const unlimited=adminUsers.filter(u=>u.unlimited).length;
      const funded=adminUsers.filter(u=>Number(u?.wallet?.purchaseCount||0)>0).length;
      summary.textContent=`${adminUsers.length} customers · ${funded} funded · ${unlimited} unlimited · ${disabled} disabled`;
    }
  }catch(err){toast(err.message);if(!adminUsers.length&&$('adminUsersList'))$('adminUsersList').innerHTML='<div class="admin-users-empty">Could not load customer accounts.</div>';}
  finally{adminUsersLoading=false;if(refresh){refresh.disabled=false;refresh.textContent='Refresh users';}if(more){more.disabled=false;more.textContent='Load more users';}}
}
function actionPrompt(action,user){
  if(action==='disable_account')return `Disable ${user.email}? They will be signed out and unable to sign in until you enable the account again.`;
  if(action==='enable_account')return `Enable ${user.email} again?`;
  if(action==='remove_balance')return `Remove the entire available balance from ${user.email}? Their verified payment history will remain recorded, so those payments will not be credited again automatically.`;
  if(action==='grant_unlimited')return `Give ${user.email} unlimited CallFocus access?`;
  if(action==='revoke_unlimited')return `Turn off unlimited access for ${user.email}? Their normal credit balance will remain.`;
  if(action==='delete_account')return `Permanently delete ${user.email}? Their CallFocus account, saved callers, threads, saved information, wallet and active sessions will be removed. Payment audit records are not changed.`;
  return 'Apply this customer change?';
}
async function runAdminUserAction(card,button,action){
  const userId=card?.dataset?.adminUser; const user=adminUsers.find(u=>u.id===userId); if(!user)return;
  let confirmEmail='';
  if(action==='delete_account'){
    if(!confirm(actionPrompt(action,user)))return;
    confirmEmail=String(prompt(`Type the customer email exactly to confirm deletion:\n\n${user.email}`)||'').trim().toLowerCase();
    if(confirmEmail!==String(user.email||'').trim().toLowerCase())return toast('Deletion cancelled · email did not match');
  }else if(!confirm(actionPrompt(action,user)))return;
  const old=button.textContent;button.disabled=true;button.textContent='Working…';
  try{
    const result=await api('/api/admin/user-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action,confirmEmail})});
    if(result.deletedUserId){adminUsers=adminUsers.filter(u=>u.id!==result.deletedUserId);renderAdminUsers();}
    else if(result.user){adminUsers=adminUsers.map(u=>u.id===result.user.id?result.user:u);renderAdminUsers();}
    if(Array.isArray(result.unlimitedCreditEmails)){unlimitedCreditEmails=result.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail);saveBackup({...formPayload(),unlimitedCreditEmails:[...unlimitedCreditEmails]});}
    const messages={disable_account:'Account disabled',enable_account:'Account enabled',remove_balance:'Balance removed',grant_unlimited:'Unlimited access enabled',revoke_unlimited:'Unlimited access removed',delete_account:'Customer account deleted'};
    toast(messages[action]||'Customer updated');
  }catch(err){toast(err.message);button.disabled=false;button.textContent=old;}
}
function toggleAdminCreditPanel(card,button){
  const panel=card?.querySelector('[data-user-credit-panel]');if(!panel)return;
  const opening=panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!opening);
  if(button)button.textContent=opening?'Close add balance':'Add balance';
  if(opening)card.querySelector('[data-user-credit-amount]')?.focus();
}
async function runAdminAddBalance(card,button){
  const userId=card?.dataset?.adminUser;const user=adminUsers.find(u=>u.id===userId);if(!user)return;
  const amountInput=card.querySelector('[data-user-credit-amount]');
  const messageInput=card.querySelector('[data-user-credit-message]');
  const credits=Number(amountInput?.value);
  if(!Number.isFinite(credits)||credits<=0)return toast('Enter the number of credits to add');
  const message=String(messageInput?.value||'').trim();
  if(!confirm(`Add ${credits.toLocaleString(undefined,{maximumFractionDigits:1})} credits to ${user.email}?\n\nThe customer will receive the CallFocus notification shown in the message field.`))return;
  const old=button.textContent;button.disabled=true;button.textContent='Adding…';
  try{
    const result=await api('/api/admin/user-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'add_balance',credits,message})});
    if(result.user){adminUsers=adminUsers.map(u=>u.id===result.user.id?result.user:u);renderAdminUsers();}
    toast(`${Number(result.creditsAdded||credits).toLocaleString(undefined,{maximumFractionDigits:1})} credits added · notification queued`);
  }catch(err){toast(err.message);button.disabled=false;button.textContent=old;}
}

function toggleAdminBulkGift(open){
  const panel=$('adminBulkGiftPanel');const toggle=$('adminGiftAllToggleBtn');if(!panel)return;
  const shouldOpen=typeof open==='boolean'?open:panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!shouldOpen);
  if(toggle)toggle.textContent=shouldOpen?'Close gift all':'Gift all customers';
  if(shouldOpen)$('adminBulkGiftAmount')?.focus();
}
async function runAdminGiftAll(){
  const amountInput=$('adminBulkGiftAmount'),messageInput=$('adminBulkGiftMessage'),button=$('adminBulkGiftSubmitBtn');
  const credits=Number(amountInput?.value);
  if(!Number.isFinite(credits)||credits<=0)return toast('Enter the number of credits to gift each customer');
  const message=String(messageInput?.value||'').trim();
  const amountText=credits.toLocaleString(undefined,{maximumFractionDigits:1});
  if(!confirm(`Gift ${amountText} credits to every CallFocus customer account?

This affects all existing customers, including customers not currently loaded on this page. Each customer will receive the notification message shown here.`))return;
  const old=button?.textContent;if(button){button.disabled=true;button.textContent='Gifting customers…';}
  const requestId=(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
  try{
    const result=await api('/api/admin/gift-all',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credits,message,requestId})});
    const credited=Number(result.credited||0),duplicates=Number(result.duplicates||0),failed=Number(result.failed||0);
    const parts=[`${credited} customer${credited===1?'':'s'} gifted`];if(duplicates)parts.push(`${duplicates} already applied`);if(failed)parts.push(`${failed} failed`);
    toast(parts.join(' · '));
    await loadAdminUsers(true);
  }catch(err){toast(err.message||'Could not gift all customers');}
  finally{if(button){button.disabled=false;button.textContent=old||'Gift every customer';}}
}
$('adminGiftAllToggleBtn')?.addEventListener('click',()=>toggleAdminBulkGift());
$('adminBulkGiftCloseBtn')?.addEventListener('click',()=>toggleAdminBulkGift(false));
$('adminBulkGiftSubmitBtn')?.addEventListener('click',runAdminGiftAll);

$('adminUsersRefreshBtn')?.addEventListener('click',()=>loadAdminUsers(true));
$('adminUsersMoreBtn')?.addEventListener('click',()=>loadAdminUsers(false));
$('adminUsersSearch')?.addEventListener('input',renderAdminUsers);
$('adminUsersList')?.addEventListener('click',e=>{
  const creditToggle=e.target.closest('[data-user-credit-toggle]');
  if(creditToggle){toggleAdminCreditPanel(creditToggle.closest('[data-admin-user]'),creditToggle);return;}
  const creditSubmit=e.target.closest('[data-user-credit-submit]');
  if(creditSubmit){runAdminAddBalance(creditSubmit.closest('[data-admin-user]'),creditSubmit);return;}
  const button=e.target.closest('[data-user-action]');if(!button)return;
  const card=button.closest('[data-admin-user]');runAdminUserAction(card,button,button.dataset.userAction);
});


function manualStatusLabel(status=''){
  const map={pending_confirmation:'Awaiting confirmation',approved:'Approved',rejected:'Rejected',awaiting_transfer:'Transfer not submitted',cancelled:'Cancelled'};return map[status]||status||'Unknown';
}
function manualStatusClass(status=''){return status==='approved'?'good':status==='rejected'||status==='cancelled'?'bad':status==='pending_confirmation'?'gold':'';}
function renderAdminManualPayments(payload={}){
  adminManualPayments=Array.isArray(payload.payments)?payload.payments:adminManualPayments;const counts=payload.counts||{};
  if($('adminManualPending'))$('adminManualPending').textContent=String(Number(counts.pending)||adminManualPayments.filter(p=>p.status==='pending_confirmation').length);
  if($('adminManualApproved'))$('adminManualApproved').textContent=String(Number(counts.approved)||adminManualPayments.filter(p=>p.status==='approved').length);
  if($('adminManualRejected'))$('adminManualRejected').textContent=String(Number(counts.rejected)||adminManualPayments.filter(p=>p.status==='rejected').length);
  if($('adminDashManualPending'))$('adminDashManualPending').textContent=String(Number(counts.pending)||adminManualPayments.filter(p=>p.status==='pending_confirmation').length);
  const root=$('adminManualPaymentsList');if(!root)return;
  if(!adminManualPayments.length){root.innerHTML='<div class="admin-users-empty">No manual payment requests yet.</div>';return;}
  root.innerHTML=adminManualPayments.map(p=>{
    const when=p.submittedAt||p.createdAt;const amount=Number(p.amountNaira||0).toLocaleString();const credits=Number(p.credits||0).toLocaleString();const pending=p.status==='pending_confirmation';
    return `<article class="admin-manual-payment-card" data-manual-payment="${esc(p.id)}">
      <div class="admin-manual-payment-head"><div><strong>${esc(p.customerName||'Unnamed customer')}</strong><span>${esc(p.customerEmail||'')}</span><small>${esc(p.customerPhone||'No phone')} · ${when?esc(new Date(when).toLocaleString()):'—'}</small></div><span class="admin-user-badge ${manualStatusClass(p.status)}">${esc(manualStatusLabel(p.status))}</span></div>
      <div class="admin-manual-payment-grid"><div><span>Amount</span><strong>₦${amount}</strong></div><div><span>Credits</span><strong>${credits}</strong></div><div><span>Reference</span><strong>${esc(p.id)}</strong></div><div><span>Receipt</span><strong>${p.receipt?esc(p.receipt.name):'Not uploaded'}</strong></div></div>
      ${p.rejectionReason?`<div class="admin-manual-reason">${esc(p.rejectionReason)}</div>`:''}
      <div class="admin-user-actions">${p.receipt?'<button class="btn btn-ghost" type="button" data-manual-receipt>Open receipt</button>':''}${pending?'<button class="btn btn-primary" type="button" data-manual-action="approve">Approve payment</button><button class="btn admin-danger-btn" type="button" data-manual-action="reject">Reject</button>':''}</div>
    </article>`;
  }).join('');
}
async function loadAdminManualPayments(){
  if(adminManualPaymentsLoading)return;adminManualPaymentsLoading=true;const btn=$('adminManualPaymentsRefreshBtn');const old=btn?.textContent||'Refresh payments';if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
  try{const result=await api('/api/admin/manual-payments');renderAdminManualPayments(result);}catch(err){toast(err.message);}
  finally{adminManualPaymentsLoading=false;if(btn){btn.disabled=false;btn.textContent=old;}}
}
async function openManualReceipt(card){
  const id=card?.dataset?.manualPayment;if(!id)return;let tab=null;try{tab=window.open('about:blank','_blank');}catch{}
  try{const res=await fetch(`/api/admin/manual-payment-receipt?id=${encodeURIComponent(id)}`,{headers:authHeaders(),cache:'no-store'});if(!res.ok){let d={};try{d=await res.json()}catch{}throw new Error(d?.error||'Could not open receipt.');}const blob=await res.blob();const url=URL.createObjectURL(blob);if(tab)tab.location.href=url;else{const a=document.createElement('a');a.href=url;a.target='_blank';a.click();}setTimeout(()=>URL.revokeObjectURL(url),120000);}catch(err){if(tab)tab.close();toast(err.message);}
}
async function runManualPaymentAction(card,action,button){
  const id=card?.dataset?.manualPayment;const row=adminManualPayments.find(p=>p.id===id);if(!id||!row)return;
  let reason='';if(action==='approve'){if(!confirm(`Approve ₦${Number(row.amountNaira||0).toLocaleString()} from ${row.customerEmail} and add ${Number(row.credits||0).toLocaleString()} credits? Confirm only after the money is visible in your bank account.`))return;}else{const entered=prompt('Optional reason for rejecting this payment:','');if(entered===null)return;reason=entered;if(!confirm(`Reject this payment from ${row.customerEmail}? No credits will be added.`))return;}
  const old=button?.textContent||'';if(button){button.disabled=true;button.textContent=action==='approve'?'Approving…':'Rejecting…';}
  try{const result=await api('/api/admin/manual-payment-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId:id,action,reason})});if(result.payment){adminManualPayments=adminManualPayments.map(p=>p.id===id?result.payment:p);renderAdminManualPayments({payments:adminManualPayments});}await Promise.all([loadAdminUsers(true),loadAdminManualPayments()]);toast(action==='approve'?'Payment approved · credits added':'Payment rejected');}catch(err){toast(err.message);if(button){button.disabled=false;button.textContent=old;}}
}
$('adminManualPaymentsRefreshBtn')?.addEventListener('click',loadAdminManualPayments);
$('adminManualPaymentsList')?.addEventListener('click',e=>{const card=e.target.closest('[data-manual-payment]');if(!card)return;const receipt=e.target.closest('[data-manual-receipt]');if(receipt)return openManualReceipt(card);const action=e.target.closest('[data-manual-action]');if(action)runManualPaymentAction(card,action.dataset.manualAction,action);});
['adminManualPaymentsEnabled','adminManualBankName','adminManualAccountName','adminManualAccountNumber','adminManualPaymentEmail'].forEach(id=>$(id)?.addEventListener('input',scheduleDraftBackup));

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


/* CallFocus V12.3 — organized scrollable admin + AI usage tracker */
function setAdminTab(name='dashboard'){
  const target=String(name||'dashboard');
  document.querySelectorAll('[data-admin-tab]').forEach(btn=>{
    const on=btn.dataset.adminTab===target;
    btn.classList.toggle('active',on);btn.setAttribute('aria-selected',String(on));
    if(on)btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  });
  document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.adminPanel===target));
  try{history.replaceState(history.state||{},'',`#admin-${target}`);}catch{}
}
function initialAdminTab(){const m=String(location.hash||'').match(/^#admin-([a-z-]+)$/);return m?.[1]||'dashboard';}
document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>setAdminTab(btn.dataset.adminTab)));
setAdminTab(initialAdminTab());

function fmtInt(value){return Math.max(0,Number(value)||0).toLocaleString();}
function fmtUsd(value){const n=Math.max(0,Number(value)||0);return n<0.01?`$${n.toFixed(5)}`:`$${n.toFixed(4)}`;}
function renderAdminAiUsage(payload){
  adminAiUsage=payload||{};const s=payload?.stats||{};
  if($('aiUsageAnalyses'))$('aiUsageAnalyses').textContent=fmtInt(s.analyses);
  if($('aiUsageScreenshots'))$('aiUsageScreenshots').textContent=fmtInt(s.screenshots);
  if($('aiUsageRequests'))$('aiUsageRequests').textContent=fmtInt(s.requests);
  if($('aiUsageCost'))$('aiUsageCost').textContent=fmtUsd(s.estimatedCostUsd);
  if($('aiUsageInputTokens'))$('aiUsageInputTokens').textContent=fmtInt(s.inputTokens);
  if($('aiUsageCachedTokens'))$('aiUsageCachedTokens').textContent=fmtInt(s.cachedInputTokens);
  if($('aiUsageOutputTokens'))$('aiUsageOutputTokens').textContent=fmtInt(s.outputTokens);
  if($('aiUsageLastUpdated'))$('aiUsageLastUpdated').textContent=s.lastUpdatedAt?new Date(s.lastUpdatedAt).toLocaleString():'No usage recorded yet';
  if($('adminDashAI'))$('adminDashAI').textContent=fmtInt(s.analyses);
  if($('adminDashAINote'))$('adminDashAINote').textContent=`${fmtInt(s.screenshots)} screenshots · ${fmtUsd(s.estimatedCostUsd)}`;
  const root=$('aiUsageRecent');if(!root)return;
  const rows=Array.isArray(payload?.recent)?payload.recent:[];
  if(!rows.length){root.innerHTML='<div class="admin-users-empty">No AI analyses recorded yet.</div>';return;}
  root.innerHTML=rows.map(r=>`<article class="ai-usage-item">
    <div class="ai-usage-user"><strong>${esc(r.userName||'CallFocus user')}</strong><span>${esc(r.userEmail||'Unknown account')} · ${r.completedAt?esc(new Date(r.completedAt).toLocaleString()):'—'}</span></div>
    <div class="ai-usage-metric"><span>Screenshots</span><strong>${fmtInt(r.imageCount)}</strong></div>
    <div class="ai-usage-metric"><span>Tokens</span><strong>${fmtInt((Number(r.inputTokens)||0)+(Number(r.outputTokens)||0))}</strong></div>
    <div class="ai-usage-metric"><span>Est. cost</span><strong>${fmtUsd(r.estimatedCostUsd)}</strong></div>
  </article>`).join('');
}
async function loadAdminAiUsage(){
  if(adminAiUsageLoading||!adminKey)return;adminAiUsageLoading=true;
  const btn=$('aiUsageRefreshBtn');if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
  try{renderAdminAiUsage(await api('/api/admin/ai-usage'));await Promise.all([loadAdminCallUsage(),loadAdminBilledCosts()]);}
  catch(err){if($('aiUsageRecent'))$('aiUsageRecent').innerHTML='<div class="admin-users-empty">Could not load AI usage.</div>';toast(err.message);}
  finally{adminAiUsageLoading=false;if(btn){btn.disabled=false;btn.textContent='Refresh usage';}}
}
$('aiUsageRefreshBtn')?.addEventListener('click',loadAdminAiUsage);
$('adminRefreshAllBtn')?.addEventListener('click',async()=>{
  const btn=$('adminRefreshAllBtn');const old=btn?.textContent||'Refresh data';if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
  try{await Promise.all([loadAdminUsers(true),loadAdminAiUsage(),loadAdminManualPayments()]);toast('Admin data refreshed');}
  finally{if(btn){btn.disabled=false;btn.textContent=old;}}
});

/* V15.8 call usage, measured API cost and provider billing. */
function ensureAdminCallUsagePanels(){if($('adminCallUsagePanel'))return;const point=document.querySelector('[data-admin-panel="ai"] .ai-usage-grid');if(point)point.insertAdjacentHTML('beforebegin',"        <div class=\"premium-panel call-usage-panel\" id=\"adminCallUsagePanel\">\n          <div class=\"admin-users-heading\"><div><h3>Call usage and cost</h3><p class=\"admin-panel-copy\">See each customer\u2019s call time, credits used and API cost calculated from recorded usage. Monitoring starts with calls prepared after this update.</p></div></div>\n          <div class=\"admin-overview-grid call-usage-grid\">\n            <article class=\"admin-stat-card\"><span>Tracked calls</span><strong id=\"callUsageCount\">0</strong><small>Including prepared sessions</small></article>\n            <article class=\"admin-stat-card\"><span>Customer call time</span><strong id=\"callUsageDuration\">00:00</strong><small>Time in the customer\u2019s call</small></article>\n            <article class=\"admin-stat-card\"><span>Customer credits used</span><strong id=\"callUsageCredits\">0</strong><small>Unlimited accounts use 0 credits</small></article>\n            <article class=\"admin-stat-card\"><span>Calculated API cost</span><strong id=\"callUsageCost\">$0.0000</strong><small>Voice + recorded backend usage</small></article>\n          </div>\n          <p class=\"admin-panel-copy call-usage-note\" id=\"callUsageNote\">GPT-Live voice pricing: $0.05 per minute, billed per second. Setup includes a 15-second minimum that is credited against the session\u2019s duration. Per-call values are calculated costs, not individual invoice charges.</p>\n          <div class=\"call-usage-list\" id=\"callUsageRecent\"><div class=\"admin-users-empty\">No call usage recorded yet.</div></div>\n          <button class=\"btn btn-ghost hidden\" type=\"button\" id=\"callUsageMoreBtn\">Load older calls</button>\n        </div>\n        <div class=\"premium-panel call-billing-panel\" id=\"adminBilledCostsPanel\">\n          <div class=\"admin-users-heading\"><div><h3>OpenAI billed spend</h3><p class=\"admin-panel-copy\">Actual provider-reported spend, grouped by UTC day. These totals cover all API activity in the selected project or organization and can include other apps.</p></div><button class=\"btn btn-ghost\" type=\"button\" id=\"billedCostsRefreshBtn\">Refresh billed spend</button></div>\n          <div class=\"admin-overview-grid call-billing-grid\">\n            <article class=\"admin-stat-card\"><span>Billed today</span><strong id=\"billedCostsToday\">\u2014</strong><small>UTC day</small></article>\n            <article class=\"admin-stat-card\"><span>Billed last 30 days</span><strong id=\"billedCostsTotal\">\u2014</strong><small id=\"billedCostsScope\">Provider billing connection</small></article>\n          </div>\n          <p class=\"admin-panel-copy\" id=\"billedCostsStatus\">Checking billing connection\u2026</p>\n          <details class=\"call-billing-setup\"><summary>Connect provider billing</summary><p class=\"admin-panel-copy\">In Cloudflare\u2019s CallFocus runtime settings, add an OpenAI organization Admin API key as the secret <code>OPENAI_ADMIN_KEY</code>. Add <code>OPENAI_BILLING_PROJECT_ID</code> to filter billed spend to the CallFocus project. The key stays on the server. Your existing call API key continues to run calls.</p></details>\n        </div>\n");}
ensureAdminCallUsagePanels();
let adminCallUsageLoading=false,adminCallUsageCursor=null,adminCallUsageRows=[],adminBilledCostsLoading=false;
function callUsageDuration(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function billedUsd(value){const n=Number(value)||0;return(n<0?'-':'')+fmtUsd(Math.abs(n));}
function callUsageCredits(value){return Math.max(0,Number(value)||0).toLocaleString(undefined,{maximumFractionDigits:1})}
function renderAdminCallUsage(payload,append=false){
  const stats=payload?.stats||{};
  $('callUsageCount').textContent=fmtInt(stats.calls);
  $('callUsageDuration').textContent=callUsageDuration(stats.durationSeconds);
  $('callUsageCredits').textContent=callUsageCredits(stats.creditsUsed);
  $('callUsageCost').textContent=fmtUsd(stats.estimatedCostUsd);
  adminCallUsageRows=append?[...adminCallUsageRows,...(payload.recent||[])]:payload.recent||[];
  adminCallUsageRows=[...new Map(adminCallUsageRows.map(r=>[r.id,r])).values()];
  adminCallUsageCursor=payload.nextCursor||null;
  $('callUsageMoreBtn')?.classList.toggle('hidden',!adminCallUsageCursor);
  const root=$('callUsageRecent');
  if(!adminCallUsageRows.length){root.innerHTML='<div class="admin-users-empty">No call usage recorded yet. New calls will appear here after this update is deployed.</div>';return;}
  root.innerHTML=adminCallUsageRows.map(r=>{
    const final=r.closed===true;
    const status=final?'Final API duration received':r.finalized?'Incomplete API finalization':r.started?'In progress':'Prepared session';
    const apiTime=Number(r.billableSeconds??15);
    const tokens=(r.backendResponses||[]).reduce((n,u)=>n+(Number(u.totalTokens)||0),0)+(Number(r.translationTokens)||0);
    return `<article class="call-usage-item">
      <div class="ai-usage-user call-usage-user"><strong>${esc(r.userName||'CallFocus user')}</strong><span>${esc(r.userEmail||'Unknown account')} · ${esc(new Date(r.createdAt).toLocaleString())}</span><span>${esc(r.title||r.callerName||'Call session')}</span></div>
      <span class="call-usage-status">${esc(status)}</span>
      <div class="ai-usage-metric"><span>Customer duration</span><strong>${callUsageDuration(r.durationSeconds)}</strong></div>
      <div class="ai-usage-metric"><span>Customer credits</span><strong>${r.unlimitedCredit?'0 · Unlimited':callUsageCredits(r.creditsUsed)}</strong></div>
      <div class="ai-usage-metric"><span>API billable time</span><strong>${apiTime.toFixed(2)} seconds</strong></div>
      <div class="ai-usage-metric"><span>Voice cost</span><strong>${fmtUsd(r.voiceCostUsd)}</strong></div>
      <div class="ai-usage-metric"><span>Backend / translation</span><strong>${fmtUsd(r.backendCostUsd)} · ${fmtInt(tokens)} tokens</strong></div>
      <div class="ai-usage-metric"><span>Calculated API cost</span><strong>${fmtUsd(r.estimatedCostUsd)}${r.missingBackendPricing?' + unpriced backend usage':''}</strong></div>
      ${!final?'<p class="call-usage-row-note">The final API duration has not been received. This amount uses the recorded duration so far, including any session-setup estimate.</p>':''}
    </article>`;
  }).join('');
  if(stats.partial)$('callUsageNote').textContent='These totals cover the most recent tracked records. Per-call costs are calculated from recorded usage; provider-reported billed spend is shown separately below.';
}
async function loadAdminCallUsage(append=false){
  if(adminCallUsageLoading||!adminKey)return;adminCallUsageLoading=true;
  const btn=$('callUsageMoreBtn');if(btn)btn.disabled=true;
  try{renderAdminCallUsage(await api('/api/admin/call-usage'+(append&&adminCallUsageCursor?'?cursor='+encodeURIComponent(adminCallUsageCursor):'')),append)}
  catch(err){if(!append)$('callUsageRecent').innerHTML='<div class="admin-users-empty">Call usage is temporarily unavailable.</div>';}
  finally{adminCallUsageLoading=false;if(btn)btn.disabled=false}
}
async function loadAdminBilledCosts(){
  if(adminBilledCostsLoading||!adminKey)return;adminBilledCostsLoading=true;
  const btn=$('billedCostsRefreshBtn');if(btn)btn.disabled=true;
  try{
    const b=await api('/api/admin/billed-costs');
    $('billedCostsToday').textContent=b.available?billedUsd(b.todayUsd):'—';
    $('billedCostsTotal').textContent=b.available?billedUsd(b.totalUsd):'—';
    $('billedCostsScope').textContent=b.scope==='project'?'Selected project spend':'Organization spend · all projects';
    $('billedCostsStatus').textContent=b.available?`Provider-reported spend for UTC days. Updated ${new Date(b.fetchedAt).toLocaleString()}. Billing can arrive later than call usage.${b.partial?' Some billing pages remain unavailable.':''}`:b.message||'The provider billing connection is not available.';
  }catch{$('billedCostsStatus').textContent='Provider-reported billed spend is temporarily unavailable.'}
  finally{adminBilledCostsLoading=false;if(btn)btn.disabled=false}
}
$('callUsageMoreBtn')?.addEventListener('click',()=>loadAdminCallUsage(true));
$('billedCostsRefreshBtn')?.addEventListener('click',loadAdminBilledCosts);
window.addEventListener('storage',e=>{if(e.key===ADMIN_SESSION_KEY&&!e.newValue){adminKey='';$('adminDashboard').classList.add('hidden');$('adminGate').classList.remove('hidden')}});
