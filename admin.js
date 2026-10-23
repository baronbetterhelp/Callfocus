const CORE_VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const ADMIN_BUILD_VERSION='16.11-pocketfi-checkout-resume-test';
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
let adminUsersComplete=false;
let adminUsersLoadError='';
let adminUsersVisibleLimit=80;
let adminAiUsage=null;
let adminAiUsageLoading=false;
let customVoices=[];
let customVoiceAccess=null;
let adminManualPayments=[];
let adminManualPaymentsLoading=false;
// A successful Admin decision should not visually revert while an older KV
// edge has not yet observed the status write.
const adminManualLocalDecisions=new Map();
function mergeManualDecisionIfNewer(server){
  if(!server?.id)return server;
  const local=adminManualLocalDecisions.get(server.id);
  if(!local)return server;
  if(server.status===local.status){adminManualLocalDecisions.delete(server.id);return server;}
  const serverAt=Date.parse(server.updatedAt||'')||0, localAt=Date.parse(local.updatedAt||'')||0;
  if(serverAt>localAt){adminManualLocalDecisions.delete(server.id);return server;}
  return local;
}

let adminManualVisibleLimit=100;
let quickStartItems=[];
let marketingSelectedUserIds=new Set();
let directSelectedUserIds=new Set();
let directFundingFilter='all';
let directVisibleLimit=80;
let directSending=false;
let directTemplates=[];
let directDraftTimer=null;
const DIRECT_DRAFT_STORAGE_KEY='callfocus_admin_direct_message_draft_v1';
let marketingHistory=[];
let marketingSending=false;
let marketingDraftLoaded=false;
let marketingDraftTimer=0;
let marketingDraftSaving=false;
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function authHeaders(extra={}){return {'X-CallFocus-Admin-Key':adminKey,...extra}}

/* V15.98: Funding overview uses the existing authenticated admin session and
   paginates every account without modifying payment ledgers or settings. */
let adminFundingRequestId = 0;
const cfFundingNaira = kobo => '₦' + (Math.max(0, Number(kobo) || 0) / 100).toLocaleString('en-NG', {minimumFractionDigits: 0, maximumFractionDigits: 2});
function cfFundingTodayWAT() {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get = key => parts.find(p=>p.type===key)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function cfFundingSelection() {
  const mode = $('adminFundingPeriod')?.value || 'all';
  const qs = new URLSearchParams({period:mode});
  const show = (id,visible)=>$(id)?.classList.toggle('hidden', !visible);
  show('adminFundingDayWrap',mode==='daily');show('adminFundingMonthWrap',mode==='monthly');
  show('adminFundingFromWrap',mode==='custom');show('adminFundingToWrap',mode==='custom');
  let label = 'All recorded confirmed deposits';
  if(mode==='daily'){const day=$('adminFundingDay').value;if(!day)throw new Error('Choose a day.');qs.set('day',day);label=`Deposits on ${day}`;}
  if(mode==='monthly'){const month=$('adminFundingMonth').value;if(!month)throw new Error('Choose a month.');qs.set('month',month);label=`Deposits in ${month}`;}
  if(mode==='custom'){
    const from=$('adminFundingFrom').value,to=$('adminFundingTo').value;
    if(!from||!to||to<from)throw new Error('Choose a valid start and end date.');
    qs.set('from',from);qs.set('to',to);label=`Deposits from ${from} to ${to}`;
  }
  return {qs,label};
}
async function loadAdminFundingReport(){
  if(!adminKey)return;
  const seq=++adminFundingRequestId, btn=$('adminFundingApplyBtn'), refresh=$('adminFundingRefreshBtn'), status=$('adminFundingStatus');
  let selection;
  try{selection=cfFundingSelection();}catch(err){toast(err.message);return;}
  const keys=['adminFundingTotal','adminFundingCount','adminFundingCustomers','adminFundingKora','adminFundingPaystack','adminFundingManual','adminFundingPocketfi'];
  keys.forEach(id=>{if($(id))$(id).textContent='—';});
  if($('adminFundingLabel'))$('adminFundingLabel').textContent=selection.label;
  if(btn)btn.disabled=true;if(refresh)refresh.disabled=true;
  if(status)status.textContent='Reading confirmed deposits…';
  const totals={amountKobo:0,transactions:0,fundedCustomers:0,scannedCustomers:0,unavailableCustomers:0,truncatedWallets:0,undatedPayments:0,providers:{korapay:0,paystack:0,manual_bank_transfer:0,pocketfi:0}};
  let cursor='',pages=0,complete=false;
  try{
    do{
      if(seq!==adminFundingRequestId)return;
      const qs=new URLSearchParams(selection.qs);if(cursor)qs.set('cursor',cursor);
      const data=await api(`/api/admin/funding-report?${qs}`);
      if(seq!==adminFundingRequestId)return;
      for(const key of ['amountKobo','transactions','fundedCustomers','scannedCustomers','unavailableCustomers','truncatedWallets','undatedPayments'])totals[key]+=Number(data[key])||0;
      for(const provider of Object.keys(totals.providers))totals.providers[provider]+=Number(data.providers?.[provider]?.amountKobo)||0;
      complete=data.listComplete===true;
      cursor=String(data.cursor||'');
      pages++;
      if(!complete&&!cursor)throw new Error('The customer list stopped before the report was complete.');
      if(pages>10000)throw new Error('Funding report exceeded the safety limit.');
      if(status)status.textContent=`Scanning customer records… ${totals.scannedCustomers} checked`;
    }while(!complete);
    if(seq!==adminFundingRequestId)return;
    $('adminFundingTotal').textContent=cfFundingNaira(totals.amountKobo);
    $('adminFundingCount').textContent=totals.transactions.toLocaleString();
    $('adminFundingCustomers').textContent=totals.fundedCustomers.toLocaleString();
    $('adminFundingKora').textContent=cfFundingNaira(totals.providers.korapay);
    $('adminFundingPaystack').textContent=cfFundingNaira(totals.providers.paystack);
    $('adminFundingManual').textContent=cfFundingNaira(totals.providers.manual_bank_transfer);
    if($('adminFundingPocketfi'))$('adminFundingPocketfi').textContent=cfFundingNaira(totals.providers.pocketfi);
    const warnings=[];
    if(totals.unavailableCustomers)warnings.push(`${totals.unavailableCustomers} account records unavailable`);
    if(totals.truncatedWallets)warnings.push(`${totals.truncatedWallets} wallets may have older entries trimmed`);
    if(totals.undatedPayments)warnings.push(`${totals.undatedPayments} payments had no usable date`);
    if(status)status.textContent=`Loaded ${totals.scannedCustomers} customer accounts · ${new Date().toLocaleTimeString()}${warnings.length?' · Incomplete: '+warnings.join('; '):''}`;
  }catch(err){if(seq===adminFundingRequestId){if(status)status.textContent='Could not finish the funding report: '+(err.message||'Please retry.');toast('Funding report unavailable');}}
  finally{if(seq===adminFundingRequestId){if(btn)btn.disabled=false;if(refresh)refresh.disabled=false;}}
}
(function(){
  const today=cfFundingTodayWAT();
  if($('adminFundingDay'))$('adminFundingDay').value=today;
  if($('adminFundingMonth'))$('adminFundingMonth').value=today.slice(0,7);
  if($('adminFundingFrom'))$('adminFundingFrom').value=today;
  if($('adminFundingTo'))$('adminFundingTo').value=today;
  $('adminFundingPeriod')?.addEventListener('change',()=>{try{cfFundingSelection();}catch{}});
  $('adminFundingApplyBtn')?.addEventListener('click',loadAdminFundingReport);
  $('adminFundingRefreshBtn')?.addEventListener('click',loadAdminFundingReport);
})();

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
function formPayload(){const limits=screenshotLimits();return {customVoices:[...customVoices],unlimitedCreditEmails:[...unlimitedCreditEmails],siteTheme:$('adminSiteTheme').value||'black',serverOnline:$('adminServerOnline').checked,serverMessage:$('adminServerMessage').value.trim(),maleVoice:$('adminMaleVoice').value,femaleVoice:$('adminFemaleVoice').value,model:'gpt-live-1',speakingPace:$('adminSpeakingPace').value,speechStyle:$('adminSpeechStyle').value.trim(),instructions:$('adminInstructions').value.trim(),opening:$('adminOpening').value.trim(),speakFirst:$('adminSpeakFirst').checked,interruptions:$('adminInterruptions').checked,websiteMaintenanceEnabled:$('adminWebsiteMaintenanceEnabled')?.checked===true,korapayPaymentsEnabled:$('adminKorapayPaymentsEnabled')?.checked!==false,flutterwavePaymentsEnabled:$('adminFlutterwavePaymentsEnabled')?.checked===true,pocketfiPaymentsEnabled:$('adminPocketfiPaymentsEnabled')?.checked===true,pocketfiVirtualAccountsEnabled:$('adminPocketfiBankEnabled')?.checked===true,manualPaymentsEnabled:$('adminManualPaymentsEnabled')?.checked===true,manualPaymentBankName:$('adminManualBankName')?.value.trim()||'',manualPaymentAccountName:$('adminManualAccountName')?.value.trim()||'',manualPaymentAccountNumber:$('adminManualAccountNumber')?.value.replace(/[^0-9]/g,'')||'',manualPaymentNotificationEmail:$('adminManualPaymentEmail')?.value.trim().toLowerCase()||'support@callfocus.link',analysisScreenshotMin:limits.min,analysisScreenshotMax:limits.max,autoFillScreenshotLimit:limits.max,quickStart:quickStartPayload()}}
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
function fill(config,storageConnected){fillPurchaseOfferControls(config);currentConfig=config;customVoices=Array.isArray(config.customVoices)?config.customVoices:[];populateVoices();renderCustomVoiceLibrary();unlimitedCreditEmails=Array.isArray(config.unlimitedCreditEmails)?[...new Set(config.unlimitedCreditEmails.map(normalizeUnlimitedEmail).filter(validUnlimitedEmail))]:[];renderUnlimitedUsers();$('adminSiteTheme').value=config.siteTheme||'black';document.querySelectorAll('[data-site-theme]').forEach(btn=>{const on=btn.dataset.siteTheme===$('adminSiteTheme').value;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});$('adminServerOnline').checked=config.serverOnline!==false;$('adminServerMessage').value=config.serverMessage||'';$('adminMaleVoice').value=config.maleVoice||'cedar';$('adminFemaleVoice').value=config.femaleVoice||'marin';$('adminModel').value='gpt-live-1';$('adminSpeakingPace').value=config.speakingPace||'relaxed';$('adminSpeechStyle').value=config.speechStyle||'';$('adminInstructions').value=config.instructions||'';$('adminOpening').value=config.opening||'';$('adminSpeakFirst').checked=config.speakFirst!==false;$('adminInterruptions').checked=config.interruptions!==false;if($('adminManualPaymentsEnabled'))$('adminManualPaymentsEnabled').checked=config.manualPaymentsEnabled===true;if($('adminKorapayPaymentsEnabled'))$('adminKorapayPaymentsEnabled').checked=config.korapayPaymentsEnabled!==false;if($('adminFlutterwavePaymentsEnabled'))$('adminFlutterwavePaymentsEnabled').checked=config.flutterwavePaymentsEnabled===true;if($('adminPocketfiPaymentsEnabled'))$('adminPocketfiPaymentsEnabled').checked=config.pocketfiPaymentsEnabled===true;if($('adminPocketfiBankEnabled'))$('adminPocketfiBankEnabled').checked=config.pocketfiVirtualAccountsEnabled===true;if($('adminWebsiteMaintenanceEnabled'))$('adminWebsiteMaintenanceEnabled').checked=config.websiteMaintenanceEnabled===true;if($('adminSignupEmailVerificationRequired'))$('adminSignupEmailVerificationRequired').checked=config.signupEmailVerificationEnabled===true;if($('adminManualBankName'))$('adminManualBankName').value=config.manualPaymentBankName||'';if($('adminManualAccountName'))$('adminManualAccountName').value=config.manualPaymentAccountName||'';if($('adminManualAccountNumber'))$('adminManualAccountNumber').value=config.manualPaymentAccountNumber||'';if($('adminManualPaymentEmail'))$('adminManualPaymentEmail').value=config.manualPaymentNotificationEmail||'support@callfocus.link';if($('adminAnalysisScreenshotMin'))$('adminAnalysisScreenshotMin').value=Math.max(1,Math.min(50,Math.round(Number(config.analysisScreenshotMin)||20)));if($('adminAnalysisScreenshotMax'))$('adminAnalysisScreenshotMax').value=Math.max(1,Math.min(50,Math.round(Number(config.analysisScreenshotMax)||Number(config.autoFillScreenshotLimit)||50)));fillQuickStart(config.quickStart||{});renderScreenshotLimitsSummary();$('adminStorageStatus').textContent=storageConnected?'Global settings storage connected':'Global settings storage is not connected yet';$('adminStorageStatus').classList.toggle('bad',!storageConnected);if($('adminDashStorage'))$('adminDashStorage').textContent=storageConnected?'Global storage connected':'Storage needs attention';renderServerState();renderBackupStatus(storageConnected)}
async function api(path,options={}){const res=await fetch(path,{credentials:'same-origin',...options,headers:authHeaders(options.headers||{})});const type=res.headers.get('content-type')||'';const data=type.includes('application/json')?await res.json():await res.text();if(!res.ok)throw Object.assign(new Error(data?.error||data||'Request failed'),{status:res.status});return data}
async function login(){const key=$('adminPasscode').value.trim();if(!key)return toast('Enter your admin passcode');adminKey=key;try{const auth=await api('/api/admin/login',{method:'POST'});adminKey=auth.adminToken||key;rememberAdminSession(adminKey);$('adminPasscode').value='';const result=await api('/api/admin/config');$('adminGate').classList.add('hidden');$('adminDashboard').classList.remove('hidden');const backup=readBackup();if(!result.storageConnected&&backup?.config){fill(backup.config,false);toast('KV disconnected — protected settings restored on this device')}else{fill(result.config,result.storageConnected);if(result.storageConnected)saveBackup(result.config)}loadAdminManualPayments();loadAdminUsers(true);loadAdminAiUsage();loadAdminCallUsage();loadAdminBilledCosts();loadMarketingStatus();loadDirectTemplates();loadAdminFundingReport();}catch(err){adminKey='';if(err.status===401||err.status===403)forgetAdminSession();$('adminGateNote').textContent=err.message;toast(err.message)}}
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
// V15.85: dedicated switches save only their own fields to the existing global KV config.
async function saveAvailabilitySwitches(kind) {
  const payment=kind==='payments';
  const btn=$(payment?'savePaymentAvailabilityBtn':'saveWebsiteMaintenanceBtn');
  const feedback=$(payment?'adminPaymentAvailabilityFeedback':'adminWebsiteMaintenanceFeedback');
  if(!btn)return;
  const payload=payment?{
    manualPaymentsEnabled:$('adminManualPaymentsEnabled').checked,
    korapayPaymentsEnabled:$('adminKorapayPaymentsEnabled').checked,
    flutterwavePaymentsEnabled:$('adminFlutterwavePaymentsEnabled').checked,
    pocketfiPaymentsEnabled:$('adminPocketfiPaymentsEnabled').checked,
    pocketfiVirtualAccountsEnabled:$('adminPocketfiBankEnabled').checked
  }:{ websiteMaintenanceEnabled:$('adminWebsiteMaintenanceEnabled').checked };
  const text=btn.textContent;btn.disabled=true;btn.textContent='Applying…';
  if(feedback){feedback.textContent='Saving your changes…';feedback.className='admin-availability-feedback';}
  try {
    const result=await api('/api/admin/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    currentConfig=result.config;
    if(payment){$('adminManualPaymentsEnabled').checked=result.manualPaymentsEnabled===true;$('adminKorapayPaymentsEnabled').checked=result.korapayPaymentsEnabled!==false;$('adminFlutterwavePaymentsEnabled').checked=result.flutterwavePaymentsEnabled===true;$('adminPocketfiPaymentsEnabled').checked=result.pocketfiPaymentsEnabled===true;$('adminPocketfiBankEnabled').checked=result.pocketfiVirtualAccountsEnabled===true;}
    else $('adminWebsiteMaintenanceEnabled').checked=result.websiteMaintenanceEnabled===true;
    saveBackup(result.config);
    if(feedback){feedback.textContent=payment?'Payment methods updated. Disabled choices disappear on the customer payment page.':result.websiteMaintenanceEnabled?'Maintenance mode enabled. Visitors now see the maintenance page.':'Maintenance mode disabled. Your website is open again.';feedback.className='admin-availability-feedback ok';}
    toast('Availability settings updated');
  } catch(error) {
    if(feedback){feedback.textContent=error.message||'Could not update availability. No changes were confirmed.';feedback.className='admin-availability-feedback error';}
    toast(error.message||'Could not save availability');
  } finally {btn.disabled=false;btn.textContent=text;}
}
$('savePaymentAvailabilityBtn')?.addEventListener('click',()=>saveAvailabilitySwitches('payments'));
$('saveWebsiteMaintenanceBtn')?.addEventListener('click',()=>saveAvailabilitySwitches('website'));
['adminKorapayPaymentsEnabled','adminFlutterwavePaymentsEnabled','adminPocketfiPaymentsEnabled','adminPocketfiBankEnabled','adminWebsiteMaintenanceEnabled'].forEach(id=>$(id)?.addEventListener('change',scheduleDraftBackup));
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
    loadAdminManualPayments();loadAdminUsers(true);loadAdminAiUsage();loadAdminCallUsage();loadAdminBilledCosts();loadMarketingStatus();loadDirectTemplates();loadAdminFundingReport();
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
  const shown=rows.slice(0,adminUsersVisibleLimit);
  root.innerHTML=shown.map(u=>{
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
  if(rows.length>shown.length)root.insertAdjacentHTML('beforeend',`<button class="btn btn-ghost admin-users-more" type="button" data-admin-users-show-more>Show more customers (${(rows.length-shown.length).toLocaleString()} remaining)</button>`);
}
async function loadAdminUsers(reset=false){
  if(adminUsersLoading)return;
  adminUsersLoading=true;
  const refresh=$('adminUsersRefreshBtn'),more=$('adminUsersMoreBtn'),summary=$('adminUsersSummary');
  if(reset){adminUsers=[];adminUsersCursor='';adminUsersVisibleLimit=80;adminUsersComplete=false;adminUsersLoadError='';directVisibleLimit=80;renderDirectRecipients();}
  if(refresh){refresh.disabled=true;refresh.textContent='Refreshing users…';}
  if(more){more.disabled=true;more.textContent='Loading…';more.classList.add('hidden');}
  let complete=false;
  let pages=0;
  const seenCursors=new Set();
  const byId=new Map(adminUsers.map(u=>[u.id,u]));
  try{
    // Read all KV pages. The former 40 x 50 limit silently capped Admin at 2,000.
    do{
      const cursor=adminUsersCursor;
      if(cursor){if(seenCursors.has(cursor))throw new Error('Repeated customer page cursor; refresh to retry.');seenCursors.add(cursor);}
      const qs=new URLSearchParams({limit:'75'});if(cursor)qs.set('cursor',cursor);
      const result=await api(`/api/admin/users?${qs.toString()}`);
      for(const u of (Array.isArray(result.users)?result.users:[]))if(u?.id)byId.set(u.id,u);
      adminUsersCursor=String(result.cursor||'');
      complete=result.listComplete===true;
      pages++;
      if(!complete&&!adminUsersCursor)throw new Error('The customer list stopped before all accounts were loaded.');
      if(pages>1000)throw new Error('Too many customer pages; retry the refresh.');
      if(summary)summary.textContent=`Loading customer accounts… ${byId.size.toLocaleString()} read`;
      if($('adminDashUsers'))$('adminDashUsers').textContent=byId.size.toLocaleString();
      // Keep iPhone Safari responsive. Do not rebuild thousands of DOM cards
      // for each received page: draw once on first page and once at completion.
      if(pages===1){adminUsers=[...byId.values()];renderAdminUsers();renderDirectRecipients();}
      if(pages%5===0)await new Promise(resolve=>setTimeout(resolve,0));
    }while(!complete);
    adminUsers=[...byId.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    adminUsersComplete=true;adminUsersLoadError='';renderAdminUsers();
    if(summary){
      const funded=adminUsers.filter(u=>Number(u?.wallet?.purchaseCount||0)>0).length;
      const disabled=adminUsers.filter(u=>u.accountDisabled).length;
      const unlimited=adminUsers.filter(u=>u.unlimited).length;
      summary.textContent=`${adminUsers.length.toLocaleString()} customers · ${funded} funded · ${unlimited} unlimited · ${disabled} disabled`;
    }
  }catch(err){
    adminUsersComplete=false;adminUsersLoadError=err.message||'Customer list incomplete';
    adminUsers=[...byId.values()].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    renderAdminUsers();
    if(summary)summary.textContent=`Partial customer list: ${adminUsers.length.toLocaleString()} loaded. ${err.message} Try Refresh users.`;
    toast('Customer refresh incomplete');
    if(!adminUsers.length&&$('adminUsersList'))$('adminUsersList').innerHTML='<div class="admin-users-empty">Could not load customer accounts. Try again.</div>';
  }finally{
    adminUsersLoading=false;
    if(refresh){refresh.disabled=false;refresh.textContent='Refresh users';}
    if(more){more.disabled=false;more.textContent='Load more users';more.classList.toggle('hidden',!adminUsersCursor);}
    renderMarketingRecipients();renderDirectRecipients();
  }
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
    // Reuse the same request ID on retry to prevent a timed-out grant from
    // being credited twice. New amount/user = new grant intent.
    const intentKey=`callfocus_admin_credit_intent:${userId}`;
    let priorIntent=null;
    try{priorIntent=JSON.parse(sessionStorage.getItem(intentKey)||'null')}catch{}
    const requestId=(priorIntent?.credits===credits&&priorIntent?.requestId)?priorIntent.requestId:crypto.randomUUID();
    try{sessionStorage.setItem(intentKey,JSON.stringify({credits,requestId}))}catch{}
    const result=await api('/api/admin/user-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,action:'add_balance',credits,message,requestId})});
    try{sessionStorage.removeItem(intentKey)}catch{}
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
$('adminUsersSearch')?.addEventListener('input',()=>{adminUsersVisibleLimit=80;renderAdminUsers();});
$('adminUsersList')?.addEventListener('click',e=>{
  if(e.target.closest('[data-admin-users-show-more]')){adminUsersVisibleLimit+=80;renderAdminUsers();return;}
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
  if($('adminManualPending'))$('adminManualPending').textContent=String(counts.pending??adminManualPayments.filter(p=>p.status==='pending_confirmation').length);
  if($('adminManualApproved'))$('adminManualApproved').textContent=String(counts.approved??adminManualPayments.filter(p=>p.status==='approved').length);
  if($('adminManualRejected'))$('adminManualRejected').textContent=String(counts.rejected??adminManualPayments.filter(p=>p.status==='rejected').length);
  if($('adminDashManualPending'))$('adminDashManualPending').textContent=String(counts.pending??adminManualPayments.filter(p=>p.status==='pending_confirmation').length);
  const root=$('adminManualPaymentsList');if(!root)return;
  if(!adminManualPayments.length){root.innerHTML='<div class="admin-users-empty">No manual payment requests yet.</div>';return;}
  const sorted=[...adminManualPayments].sort((a,b)=>{
    const pa=a.status==='pending_confirmation'?1:0,pb=b.status==='pending_confirmation'?1:0;
    return pb-pa||String(b.submittedAt||b.createdAt||'').localeCompare(String(a.submittedAt||a.createdAt||''));
  });
  const shown=sorted.slice(0,adminManualVisibleLimit);
  root.innerHTML=shown.map(p=>{
    const when=p.submittedAt||p.createdAt;const amount=Number(p.amountNaira||0).toLocaleString();const credits=Number(p.credits||0).toLocaleString();const pending=p.status==='pending_confirmation';
    const creditAlert=p.status==='approved'&&p.walletCreditPresent===false;
    const statusText=creditAlert?'Approved · credit check pending':manualStatusLabel(p.status);
    const statusClass=creditAlert?'gold':manualStatusClass(p.status);
    return `<article class="admin-manual-payment-card" data-manual-payment="${esc(p.id)}">
      <div class="admin-manual-payment-head"><div><strong>${esc(p.customerName||'Unnamed customer')}</strong><span>${esc(p.customerEmail||'')}</span><small>${esc(p.customerPhone||'No phone')} · ${when?esc(new Date(when).toLocaleString()):'—'}</small></div><span class="admin-user-badge ${statusClass}">${esc(statusText)}</span></div>
      <div class="admin-manual-payment-grid"><div><span>Amount</span><strong>₦${amount}</strong></div><div><span>Credits</span><strong>${credits}</strong></div><div><span>Reference</span><strong>${esc(p.id)}</strong></div><div><span>Receipt</span><strong>${p.receipt?esc(p.receipt.name):'Not uploaded'}</strong></div></div>
      ${p.rejectionReason?`<div class="admin-manual-reason">${esc(p.rejectionReason)}</div>`:''}
      <div class="admin-user-actions">${p.receipt?'<button class="btn btn-ghost" type="button" data-manual-receipt>Open receipt</button>':''}${pending?'<button class="btn btn-primary" type="button" data-manual-action="approve">Approve payment</button><button class="btn admin-danger-btn" type="button" data-manual-action="reject">Reject</button>':''}</div>
    </article>`;
  }).join('');
  if(sorted.length>shown.length)root.insertAdjacentHTML('beforeend',`<button class="btn btn-ghost admin-users-more" type="button" data-manual-show-more>Show more payments (${(sorted.length-shown.length).toLocaleString()} remaining)</button>`);
}
async function loadAdminManualPayments(){
  if(adminManualPaymentsLoading)return;
  adminManualPaymentsLoading=true;
  const btn=$('adminManualPaymentsRefreshBtn'),status=$('adminManualLoadStatus');
  const old=btn?.textContent||'Refresh payments';
  if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
  if(status)status.textContent='Scanning all manual payment requests…';
  const byId=new Map();
  const seenCursors=new Set();
  let cursor='',complete=false,pages=0;
  try{
    // New submissions have increasing CFM timestamp keys. A single KV list
    // page returns the OLDEST keys and can hide the receipts needing approval.
    do{
      if(cursor){if(seenCursors.has(cursor))throw new Error('Repeated payment page cursor.');seenCursors.add(cursor);}
      const qs=new URLSearchParams({limit:'100'});if(cursor)qs.set('cursor',cursor);
      qs.set('_',String(Date.now())+'-'+pages);
      const result=await api(`/api/admin/manual-payments?${qs}`,{cache:'no-store'});
      for(const item of (Array.isArray(result.payments)?result.payments:[]))if(item?.id)byId.set(item.id,mergeManualDecisionIfNewer(item));
      pages++;
      complete=result.listComplete===true;
      cursor=String(result.cursor||'');
      if(!complete&&!cursor)throw new Error('The payment list stopped before completion.');
      if(pages>1000)throw new Error('Too many payment pages; retry the refresh.');
      if(status)status.textContent=`Checking manual payments… ${byId.size.toLocaleString()} records loaded`;
      if(pages%3===0)await new Promise(resolve=>setTimeout(resolve,0));
    }while(!complete);
    adminManualPayments=[...byId.values()];
    adminManualVisibleLimit=100;
    renderAdminManualPayments({payments:adminManualPayments});
    if(status){
      const latest=adminManualPayments.filter(p=>p.submittedAt).sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)))[0];
      const time=latest?.submittedAt?new Date(latest.submittedAt).toLocaleString():'none found';
      status.textContent=`${adminManualPayments.length.toLocaleString()} manual payment records loaded. Latest submitted: ${time}. If an expected receipt is missing, use Find reference to check its saved record directly.`;
    }
  }catch(err){
    // Never silently call a partial page the complete payment history.
    if(byId.size){adminManualPayments=[...byId.values()];renderAdminManualPayments({payments:adminManualPayments});}
    if(status)status.textContent=`Incomplete payment list (${byId.size.toLocaleString()} read): ${err.message}. Tap Refresh payments to retry.`;
    toast('Manual payments refresh incomplete');
  }finally{adminManualPaymentsLoading=false;if(btn){btn.disabled=false;btn.textContent=old;}}
}

async function openManualReceipt(card){
  const id=card?.dataset?.manualPayment;if(!id)return;let tab=null;try{tab=window.open('about:blank','_blank');}catch{}
  try{const res=await fetch(`/api/admin/manual-payment-receipt?id=${encodeURIComponent(id)}`,{headers:authHeaders(),cache:'no-store'});if(!res.ok){let d={};try{d=await res.json()}catch{}throw new Error(d?.error||'Could not open receipt.');}const blob=await res.blob();const url=URL.createObjectURL(blob);if(tab)tab.location.href=url;else{const a=document.createElement('a');a.href=url;a.target='_blank';a.click();}setTimeout(()=>URL.revokeObjectURL(url),120000);}catch(err){if(tab)tab.close();toast(err.message);}
}
async function runManualPaymentAction(card,action,button){
  const id=card?.dataset?.manualPayment;const row=adminManualPayments.find(p=>p.id===id);if(!id||!row)return;
  let reason='';if(action==='approve'){if(!confirm(`Approve ₦${Number(row.amountNaira||0).toLocaleString()} from ${row.customerEmail} and add ${Number(row.credits||0).toLocaleString()} credits? Confirm only after the money is visible in your bank account.`))return;}else{const entered=prompt('Optional reason for rejecting this payment:','');if(entered===null)return;reason=entered;if(!confirm(`Reject this payment from ${row.customerEmail}? No credits will be added.`))return;}
  const old=button?.textContent||'';if(button){button.disabled=true;button.textContent=action==='approve'?'Approving…':'Rejecting…';}
  try{const result=await api('/api/admin/manual-payment-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId:id,action,reason})});if(result.payment){adminManualLocalDecisions.set(id,result.payment);adminManualPayments=adminManualPayments.map(p=>p.id===id?result.payment:p);renderAdminManualPayments({payments:adminManualPayments});}if(result.user){const i=adminUsers.findIndex(u=>u.id===result.user.id);if(i>=0)adminUsers[i]=result.user;else adminUsers.unshift(result.user);renderAdminUsers();}toast(action==='approve'?(result.repaired?'Approved payment repaired · credits restored':'Payment approved · credits added'):'Payment rejected');loadAdminManualPayments();}catch(err){toast(err.message);if(button){button.disabled=false;button.textContent=old;}}
}
async function lookupAdminManualPayment(){
  const entered=prompt('Enter the payment reference (CFM-...) to check the saved record:','');
  if(entered===null)return;
  const id=entered.trim();if(!id)return;
  const btn=$('adminManualPaymentFindBtn');if(btn){btn.disabled=true;btn.textContent='Checking…';}
  try {
    const result=await api(`/api/admin/manual-payment-lookup?id=${encodeURIComponent(id)}&_=${Date.now()}`,{cache:'no-store'});
    if(result?.payment){
      const existing=adminManualPayments.findIndex(p=>p.id===result.payment.id);
      if(existing>=0)adminManualPayments[existing]=result.payment;else adminManualPayments.unshift(result.payment);
      adminManualVisibleLimit=Math.max(adminManualVisibleLimit,100);
      renderAdminManualPayments({payments:adminManualPayments});
      const status=$('adminManualLoadStatus');if(status)status.textContent=`Reference ${id} found. Status: ${manualStatusLabel(result.payment.status)}. Directly checked against the current Worker KV.`;
      toast('Payment reference found.');
    }
  }catch(err){toast(err.message);const status=$('adminManualLoadStatus');if(status)status.textContent=`Reference ${id}: ${err.message}`;}
  finally{if(btn){btn.disabled=false;btn.textContent='Find reference';}}
}
$('adminManualPaymentFindBtn')?.addEventListener('click',lookupAdminManualPayment);
$('adminManualPaymentsRefreshBtn')?.addEventListener('click',loadAdminManualPayments);
$('adminManualPaymentsList')?.addEventListener('click',e=>{if(e.target.closest('[data-manual-show-more]')){adminManualVisibleLimit+=100;renderAdminManualPayments({payments:adminManualPayments});return;}const card=e.target.closest('[data-manual-payment]');if(!card)return;const receipt=e.target.closest('[data-manual-receipt]');if(receipt)return openManualReceipt(card);const action=e.target.closest('[data-manual-action]');if(action)runManualPaymentAction(card,action.dataset.manualAction,action);});
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




/* CallFocus V15.72 — persistent direct-email draft + reusable saved messages. */
function directValue(id){return String($(id)?.value||'').trim();}
function directDraftPayload(){return {customEmails:directValue('directCustomEmails'),audience:directAudience(),selectedUserIds:[...directSelectedUserIds],subject:directValue('directSubject'),message:directValue('directMessage'),ctaLabel:directValue('directCtaLabel'),ctaUrl:directValue('directCtaUrl'),updatedAt:new Date().toISOString()};}
function saveDirectDraftLocal(){try{localStorage.setItem(DIRECT_DRAFT_STORAGE_KEY,JSON.stringify(directDraftPayload()));}catch{}}
function scheduleDirectDraftSave(){clearTimeout(directDraftTimer);directDraftTimer=setTimeout(saveDirectDraftLocal,180);}
function restoreDirectDraftLocal(){
  try{
    const raw=localStorage.getItem(DIRECT_DRAFT_STORAGE_KEY);if(!raw)return;const d=JSON.parse(raw)||{};
    if($('directCustomEmails'))$('directCustomEmails').value=String(d.customEmails||'');
    if($('directSubject'))$('directSubject').value=String(d.subject||'');
    if($('directMessage'))$('directMessage').value=String(d.message||'');
    if($('directCtaLabel'))$('directCtaLabel').value=String(d.ctaLabel??'Open CallFocus');
    if($('directCtaUrl'))$('directCtaUrl').value=String(d.ctaUrl??'https://callfocus.link');
    if(Array.isArray(d.selectedUserIds))directSelectedUserIds=new Set(d.selectedUserIds.map(v=>String(v||'')).filter(Boolean));
    const audience=d.audience==='all'?'all':'selected';const input=document.querySelector(`input[name="directAudience"][value="${audience}"]`);if(input)input.checked=true;
  }catch{}
}
function renderDirectTemplates(){
  const select=$('directTemplateSelect');if(!select)return;const selected=String(select.value||'');
  if(!directTemplates.length){select.innerHTML='<option value="">No saved messages yet</option>';return;}
  select.innerHTML='<option value="">Choose a saved message</option>'+directTemplates.map(item=>`<option value="${esc(item.id)}">${esc(item.name||item.subject||'Saved message')}</option>`).join('');
  if(directTemplates.some(x=>x.id===selected))select.value=selected;
}
async function loadDirectTemplates(){
  if(!adminKey)return;try{const data=await api('/api/admin/direct-email-templates');directTemplates=Array.isArray(data.templates)?data.templates:[];renderDirectTemplates();}catch(err){console.warn('Could not load direct email templates',err);}
}
async function saveDirectTemplate(){
  const name=directValue('directTemplateName'),subject=directValue('directSubject'),message=directValue('directMessage'),ctaLabel=directValue('directCtaLabel'),ctaUrl=directValue('directCtaUrl');
  if(!name)return toast('Add a name for this saved message');
  if(!subject||!message)return toast('Add an email subject and message first');
  if((ctaLabel&&!ctaUrl)||(!ctaLabel&&ctaUrl))return toast('Add both button text and button link, or leave both blank');
  const btn=$('directSaveTemplateBtn'),old=btn?.textContent||'Save message';if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try{const currentId=String($('directTemplateSelect')?.value||'');const result=await api('/api/admin/direct-email-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:currentId,name,subject,message,ctaLabel,ctaUrl})});directTemplates=Array.isArray(result.templates)?result.templates:[];renderDirectTemplates();if(result.template?.id&&$('directTemplateSelect'))$('directTemplateSelect').value=result.template.id;toast(currentId?'Saved message updated':'Message saved');}
  catch(err){toast(err.message||'Could not save message');}
  finally{if(btn){btn.disabled=false;btn.textContent=old;}}
}
function loadSelectedDirectTemplate(){
  const id=String($('directTemplateSelect')?.value||'');const item=directTemplates.find(x=>x.id===id);if(!item)return toast('Choose a saved message first');
  if($('directTemplateName'))$('directTemplateName').value=String(item.name||'');
  if($('directSubject'))$('directSubject').value=String(item.subject||'');
  if($('directMessage'))$('directMessage').value=String(item.message||'');
  if($('directCtaLabel'))$('directCtaLabel').value=String(item.ctaLabel||'');
  if($('directCtaUrl'))$('directCtaUrl').value=String(item.ctaUrl||'');
  saveDirectDraftLocal();toast('Saved message loaded');
}
async function deleteSelectedDirectTemplate(){
  const id=String($('directTemplateSelect')?.value||'');const item=directTemplates.find(x=>x.id===id);if(!item)return toast('Choose a saved message first');
  if(!confirm(`Delete saved message “${item.name||item.subject||'Saved message'}”?`))return;
  const btn=$('directDeleteTemplateBtn'),old=btn?.textContent||'Delete';if(btn){btn.disabled=true;btn.textContent='Deleting…';}
  try{const result=await api('/api/admin/direct-email-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id})});directTemplates=Array.isArray(result.templates)?result.templates:[];renderDirectTemplates();if($('directTemplateName'))$('directTemplateName').value='';toast('Saved message deleted');}
  catch(err){toast(err.message||'Could not delete saved message');}
  finally{if(btn){btn.disabled=false;btn.textContent=old;}}
}

function directEmailValid(email=''){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim());}
function directCustomRecipientEmails(){
  const raw=directValue('directCustomEmails');
  if(!raw)return [];
  const parts=raw.split(/[\s,;]+/).map(v=>v.trim().toLowerCase()).filter(Boolean);
  return [...new Set(parts.filter(directEmailValid))];
}
function directInvalidRecipientEmails(){
  const raw=directValue('directCustomEmails');
  if(!raw)return [];
  const parts=raw.split(/[\s,;]+/).map(v=>v.trim().toLowerCase()).filter(Boolean);
  return [...new Set(parts.filter(v=>!directEmailValid(v)))];
}
function directUserIsFunded(user){return Number(user?.wallet?.purchaseCount||0)>0;}
function directAudience(){return document.querySelector('input[name="directAudience"]:checked')?.value==='all'?'all':'selected';}
// Transactional/service emails may include active accounts created while
// verification was paused. This does NOT change promotional eligibility.
function directEligibleUsers(){return adminUsers.filter(u=>!u.accountDisabled&&directEmailValid(u.email));}
function directRecipientRows(){
  const q=String($('directRecipientSearch')?.value||'').trim().toLowerCase();
  let rows=directEligibleUsers();
  if(directFundingFilter==='funded')rows=rows.filter(directUserIsFunded);
  if(directFundingFilter==='not_funded')rows=rows.filter(u=>!directUserIsFunded(u));
  if(q)rows=rows.filter(u=>[u.name,u.email,u.phone].some(v=>String(v||'').toLowerCase().includes(q)));
  return rows;
}
function renderDirectFundingControls(){
  const eligible=directEligibleUsers();
  const funded=eligible.filter(directUserIsFunded).length;
  const notFunded=eligible.length-funded;
  const counts={all:eligible.length,funded,not_funded:notFunded};
  document.querySelectorAll('[data-direct-funding-filter]').forEach(btn=>{
    const key=String(btn.dataset.directFundingFilter||'all');
    btn.classList.toggle('active',key===directFundingFilter);
    btn.setAttribute('aria-pressed',key===directFundingFilter?'true':'false');
    const count=btn.querySelector('[data-direct-filter-count]');if(count)count.textContent=String(counts[key]??0);
  });
}
function renderDirectRecipients(){
  const root=$('directRecipientList'),summary=$('directRecipientSummary');if(!root||!summary)return;
  const rows=directRecipientRows(),audience=directAudience(),eligible=directEligibleUsers();
  if(adminUsersComplete){directSelectedUserIds=new Set([...directSelectedUserIds].filter(id=>eligible.some(u=>u.id===id)));}
  const custom=directCustomRecipientEmails(),invalid=directInvalidRecipientEmails();
  document.querySelectorAll('input[name="directAudience"]').forEach(input=>input.closest('.marketing-audience-option')?.classList.toggle('active',input.checked));
  const parts=[];
  if(audience==='all')parts.push(`${eligible.length.toLocaleString()} active customer${eligible.length===1?'':'s'}`);
  else parts.push(`${directSelectedUserIds.size.toLocaleString()} selected customer${directSelectedUserIds.size===1?'':'s'}`);
  if(custom.length)parts.push(`${custom.length} additional email${custom.length===1?'':'s'}`);
  if(invalid.length)parts.push(`${invalid.length} invalid email address${invalid.length===1?'':'es'}`);
  summary.textContent=parts.join(' · ') + (adminUsersComplete?'':' · list still loading');
  renderDirectFundingControls();
  const status=$('directAudienceStatus');
  if(status){
    status.classList.toggle('is-error',!!adminUsersLoadError);
    status.textContent=adminUsersLoading?`Loading customer accounts… ${adminUsers.length.toLocaleString()} received so far. Do not send to All until loading finishes.`:
      adminUsersLoadError?`Customer loading incomplete: ${adminUsersLoadError}. Press Refresh customers and verify the customer storage binding if the count remains unexpected.`:
      adminUsersComplete?`${adminUsers.length.toLocaleString()} customer records read from this website's connected storage. ${eligible.length.toLocaleString()} active accounts have email addresses.${adminUsers.length>eligible.length?' Disabled or invalid-email accounts are excluded.':''}`:
      'Customer records have not finished loading. Press Refresh customers if needed.';
  }
  const refresh=$('directRefreshCustomersBtn');if(refresh){refresh.disabled=adminUsersLoading;refresh.textContent=adminUsersLoading?'Loading customers…':'Refresh customers';}
  const selectShown=$('directSelectShownBtn'),clearShown=$('directClearShownBtn');
  if(selectShown)selectShown.disabled=audience==='all'||!rows.length||rows.every(u=>directSelectedUserIds.has(u.id));
  if(clearShown)clearShown.disabled=audience==='all'||!rows.some(u=>directSelectedUserIds.has(u.id));
  const shown=rows.slice(0,directVisibleLimit),more=$('directMoreCustomersBtn');
  if(more){more.classList.toggle('hidden',rows.length<=shown.length);more.textContent=`Show more customers (${(rows.length-shown.length).toLocaleString()} remaining)`;}
  if(!rows.length){root.innerHTML=`<div class="admin-users-empty">${adminUsersLoading?'Loading customer accounts…':adminUsersLoadError?'Could not load the full customer list. Refresh customers to retry.':adminUsersComplete?'No active customers match this search or funding filter.':'Waiting for customer accounts…'}</div>`;return;}
  const previousScroll=root.scrollTop;
  root.innerHTML=shown.map(u=>{
    const funded=directUserIsFunded(u),purchaseCount=Number(u?.wallet?.purchaseCount||0),paid=Number(u?.wallet?.totalPaidNaira||0);
    const fundingTitle=funded?`${purchaseCount} verified payment${purchaseCount===1?'':'s'} · ₦${paid.toLocaleString(undefined,{maximumFractionDigits:2})}`:'No verified payment yet';
    return `<label class="marketing-recipient-row direct-recipient-row${directSelectedUserIds.has(u.id)?' selected':''}"><input type="checkbox" data-direct-user-id="${esc(u.id)}" ${directSelectedUserIds.has(u.id)?'checked':''} ${audience==='all'?'disabled':''}/><span class="marketing-recipient-avatar">${esc((u.name||u.email||'?').trim().charAt(0).toUpperCase()||'?')}</span><span class="marketing-recipient-copy"><strong>${esc(u.name||'Unnamed user')}</strong><small>${esc(u.email)}</small>${u.unlimited?'<small class="direct-recipient-access">Unlimited access</small>':''}${u.emailVerified===false?'<small class="direct-recipient-unverified">Email not verified</small>':''}</span><span class="direct-funding-badge ${funded?'funded':'not-funded'}" title="${esc(fundingTitle)}">${funded?'Funded':'Not funded'}</span></label>`;
  }).join('');
  root.scrollTop=previousScroll;
}
function directSelectRows(select=true){
  if(directAudience()==='all')return;
  const rows=directRecipientRows();
  rows.forEach(u=>{if(select)directSelectedUserIds.add(u.id);else directSelectedUserIds.delete(u.id);});
  renderDirectRecipients();scheduleDirectDraftSave();
  toast(select?`${rows.length} matching customer${rows.length===1?'':'s'} selected`:`${rows.length} matching customer${rows.length===1?'':'s'} cleared`);
}
function directShowResult(message,type='ok'){
  const box=$('directSendResult');if(!box)return;box.classList.remove('hidden','bad');if(type==='bad')box.classList.add('bad');box.textContent=message;
}
async function sendDirectCustomerEmail(){
  if(directSending)return;
  const subject=directValue('directSubject'),message=directValue('directMessage'),ctaLabel=directValue('directCtaLabel'),ctaUrl=directValue('directCtaUrl');
  const customEmails=directCustomRecipientEmails(),invalidEmails=directInvalidRecipientEmails(),audience=directAudience();
  if(invalidEmails.length)return toast(`Fix invalid email address${invalidEmails.length===1?'':'es'} first`);
  if(!adminUsersComplete||adminUsersLoading||adminUsersLoadError)return toast('Finish loading customers or press Refresh customers before sending');
  const eligible=directEligibleUsers(),selected=audience==='all'?eligible:eligible.filter(u=>directSelectedUserIds.has(u.id));
  if(!selected.length&&!customEmails.length)return toast('Add a recipient email or select customers');
  if(!subject||!message)return toast('Add an email subject and message first');
  if((ctaLabel&&!ctaUrl)||(!ctaLabel&&ctaUrl))return toast('Add both button text and button link, or leave both blank');
  // Deduplicate manual addresses and registered customers by normalized email.
  const ids=[...new Map(selected.map(u=>[String(u.email).toLowerCase(),u.id])).values()];
  const existing=new Set(selected.map(u=>String(u.email).toLowerCase()));
  const manual=customEmails.filter(email=>!existing.has(email));
  const estimatedCount=ids.length+manual.length;
  if(!confirm(`Send this non-promotional service email to ${estimatedCount.toLocaleString()} recipient${estimatedCount===1?'':'s'}?\n\nAudience: ${audience==='all'?'Every active registered customer':'Selected customers'}${manual.length?` plus ${manual.length} additional address(es)`:''}.\n\nRecipients will be processed in batches of up to 100. Use this only for account, service, support, or payment notices, not advertising.`))return;
  const btn=$('directSendBtn'),old=btn?.textContent||'Send direct message';
  const requestId=(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
  const packets=[];for(let i=0;i<ids.length;i+=100)packets.push({selectedUserIds:ids.slice(i,i+100),customEmails:[]});
  for(let i=0;i<manual.length;i+=100)packets.push({selectedUserIds:[],customEmails:manual.slice(i,i+100)});
  directSending=true;if(btn){btn.disabled=true;btn.textContent='Sending…';}
  let sent=0,failed=0,batches=0;
  try{
    for(let i=0;i<packets.length;i++){
      const chunk=packets[i];directShowResult(`Sending batch ${i+1} of ${packets.length}… ${sent.toLocaleString()} sent, ${failed.toLocaleString()} failed.`);
      let result;
      try{result=await api('/api/admin/direct-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject,message,ctaLabel,ctaUrl,...chunk,requestId:`${requestId}-${i+1}`})});}
      catch(err){throw new Error(`Batch ${i+1}/${packets.length} could not be confirmed: ${err.message}. ${sent} previous messages were confirmed. Do not resend the whole audience until you verify the delivery log.`);}
      sent+=Number(result.sent||0);failed+=Number(result.failed||0);batches++;
    }
    directShowResult(`${sent.toLocaleString()} sent · ${failed.toLocaleString()} failed · ${batches} batch(es).`,failed&&!sent?'bad':'ok');
    toast(failed?'Direct messages completed with delivery errors':`Direct message sent to ${sent.toLocaleString()} recipients`);
    loadMarketingStatus().catch(()=>{});
  }catch(err){directShowResult(err.message||'Could not finish sending','bad');toast('Direct sending interrupted; check results');}
  finally{directSending=false;if(btn){btn.disabled=false;btn.textContent=old;}}
}
restoreDirectDraftLocal();
['directCustomEmails','directSubject','directMessage','directCtaLabel','directCtaUrl'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='directCustomEmails')renderDirectRecipients();scheduleDirectDraftSave();}));
document.querySelectorAll('input[name="directAudience"]').forEach(input=>input.addEventListener('change',()=>{renderDirectRecipients();scheduleDirectDraftSave();}));
$('directRefreshCustomersBtn')?.addEventListener('click',()=>loadAdminUsers(true));
$('directMoreCustomersBtn')?.addEventListener('click',()=>{directVisibleLimit+=80;renderDirectRecipients();});
$('directRecipientSearch')?.addEventListener('input',()=>{directVisibleLimit=80;if($('directRecipientList'))$('directRecipientList').scrollTop=0;renderDirectRecipients();});
document.querySelectorAll('[data-direct-funding-filter]').forEach(btn=>btn.addEventListener('click',()=>{directFundingFilter=String(btn.dataset.directFundingFilter||'all');directVisibleLimit=80;renderDirectRecipients();}));
$('directSelectShownBtn')?.addEventListener('click',()=>directSelectRows(true));
$('directClearShownBtn')?.addEventListener('click',()=>directSelectRows(false));
$('directRecipientList')?.addEventListener('change',event=>{const box=event.target.closest('[data-direct-user-id]');if(!box)return;const id=box.dataset.directUserId;if(box.checked)directSelectedUserIds.add(id);else directSelectedUserIds.delete(id);renderDirectRecipients();scheduleDirectDraftSave();});
$('directSaveTemplateBtn')?.addEventListener('click',saveDirectTemplate);
$('directLoadTemplateBtn')?.addEventListener('click',loadSelectedDirectTemplate);
$('directDeleteTemplateBtn')?.addEventListener('click',deleteSelectedDirectTemplate);
$('directSendBtn')?.addEventListener('click',sendDirectCustomerEmail);
window.addEventListener('pagehide',saveDirectDraftLocal);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDirectDraftLocal();});

/* CallFocus V15.49 — premium promotional email studio. */
function marketingAudience(){return document.querySelector('input[name="marketingAudience"]:checked')?.value==='selected'?'selected':'all';}
function marketingValue(id){return String($(id)?.value||'').trim();}
function marketingHtmlText(value=''){return esc(String(value||'')).replace(/\n/g,'<br>');}
function marketingPersonalPreview(value=''){return String(value||'').replace(/\{name\}/gi,'Alex').replace(/\{first_name\}|\{firstname\}/gi,'Alex');}
function marketingRecipientRows(){
  const q=String($('marketingRecipientSearch')?.value||'').trim().toLowerCase();
  const rows=adminUsers.filter(u=>!u.accountDisabled&&u.emailVerified!==false);
  return q?rows.filter(u=>[u.name,u.email,u.phone].some(v=>String(v||'').toLowerCase().includes(q))):rows;
}
function renderMarketingRecipients(){
  const root=$('marketingRecipientList'),summary=$('marketingRecipientSummary');if(!root||!summary)return;
  const rows=marketingRecipientRows(),allActive=adminUsers.filter(u=>!u.accountDisabled&&u.emailVerified!==false);
  const selected=[...marketingSelectedUserIds].filter(id=>adminUsers.some(u=>u.id===id&&!u.accountDisabled&&u.emailVerified!==false));
  marketingSelectedUserIds=new Set(selected);
  const audience=marketingAudience();
  summary.textContent=audience==='all'?`${allActive.length} active verified customers will be targeted · unsubscribed addresses are skipped by the server`:`${marketingSelectedUserIds.size} customer${marketingSelectedUserIds.size===1?'':'s'} selected · ${rows.length} shown`;
  if(!rows.length){root.innerHTML='<div class="admin-users-empty">No matching active customer accounts.</div>';return;}
  root.innerHTML=rows.map(u=>`<label class="marketing-recipient-row${marketingSelectedUserIds.has(u.id)?' selected':''}"><input type="checkbox" data-marketing-user-id="${esc(u.id)}" ${marketingSelectedUserIds.has(u.id)?'checked':''} ${audience==='all'?'disabled':''}/><span class="marketing-recipient-avatar">${esc((u.name||u.email||'?').trim().charAt(0).toUpperCase()||'?')}</span><span class="marketing-recipient-copy"><strong>${esc(u.name||'Unnamed user')}</strong><small>${esc(u.email)}</small></span><span class="marketing-recipient-state">${u.unlimited?'Unlimited':'Active'}</span></label>`).join('');
}
function marketingCampaignPayload(){
  return {
    subject:marketingValue('marketingSubject'),preheader:marketingValue('marketingPreheader'),eyebrow:marketingValue('marketingEyebrow'),headline:marketingValue('marketingHeadline'),message:marketingValue('marketingMessage'),ctaLabel:marketingValue('marketingCtaLabel'),ctaUrl:marketingValue('marketingCtaUrl'),companyName:marketingValue('marketingCompanyName'),businessAddress:marketingValue('marketingBusinessAddress'),testEmail:marketingValue('marketingTestEmail')
  };
}
function setMarketingDraftStatus(message,state=''){
  const el=$('marketingDraftStatus');if(!el)return;el.textContent=message;el.classList.remove('is-saved','is-saving');if(state)el.classList.add(state);
}
function applyMarketingDraft(draft){
  if(!draft||typeof draft!=='object'||marketingDraftLoaded)return;
  const map={marketingSubject:'subject',marketingPreheader:'preheader',marketingEyebrow:'eyebrow',marketingHeadline:'headline',marketingMessage:'message',marketingCtaLabel:'ctaLabel',marketingCtaUrl:'ctaUrl',marketingCompanyName:'companyName',marketingBusinessAddress:'businessAddress',marketingTestEmail:'testEmail'};
  Object.entries(map).forEach(([id,key])=>{const el=$(id);if(el&&draft[key]!==undefined&&draft[key]!==null)el.value=String(draft[key]);});
  marketingDraftLoaded=true;renderMarketingPreview();
  if(draft.updatedAt){const when=new Date(draft.updatedAt);setMarketingDraftStatus(`Saved draft restored · ${Number.isNaN(when.getTime())?'recently':when.toLocaleString()}`,'is-saved');}
  else setMarketingDraftStatus('Saved draft restored.','is-saved');
}
async function saveMarketingDraft({silent=false}={}){
  if(!adminKey||marketingDraftSaving)return;
  marketingDraftSaving=true;if(!silent)setMarketingDraftStatus('Saving draft…','is-saving');
  const btn=$('marketingSaveDraftBtn'),old=btn?.textContent||'';if(btn&&!silent){btn.disabled=true;btn.textContent='Saving…';}
  try{
    const result=await api('/api/admin/marketing-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...marketingCampaignPayload(),action:'save-draft'})});
    const when=result?.draft?.updatedAt?new Date(result.draft.updatedAt):new Date();
    setMarketingDraftStatus(`Draft saved · ${when.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,'is-saved');
  }catch(err){setMarketingDraftStatus(`Draft could not be saved · ${err.message||'Try again.'}`);if(!silent)toast(err.message||'Could not save draft');}
  finally{marketingDraftSaving=false;if(btn&&!silent){btn.disabled=false;btn.textContent=old||'Save draft';}}
}
function queueMarketingDraftSave(){
  if(!marketingDraftLoaded)return;clearTimeout(marketingDraftTimer);setMarketingDraftStatus('Saving changes…','is-saving');marketingDraftTimer=setTimeout(()=>saveMarketingDraft({silent:true}),900);
}
function renderMarketingPreview(){
  const root=$('marketingEmailPreview');if(!root)return;const p=marketingCampaignPayload();
  const eyebrow=marketingPersonalPreview(p.eyebrow||'CALLFOCUS UPDATE'),headline=marketingPersonalPreview(p.headline||'Your CallFocus update'),message=marketingPersonalPreview(p.message||'Write your promotional message and the finished email will preview here.'),cta=marketingPersonalPreview(p.ctaLabel||'Open CallFocus');
  root.innerHTML=`<div class="marketing-preview-canvas"><div class="marketing-preview-brand"><img src="/logo.png?v=${ADMIN_BUILD_VERSION}" alt=""><span><strong>Call<span>Focus</span></strong><small>Conversation continuity, simplified.</small></span></div><div class="marketing-preview-body"><span class="marketing-preview-eyebrow">${esc(eyebrow)}</span><h3>${esc(headline)}</h3><div class="marketing-preview-message">${marketingHtmlText(message)}</div>${p.ctaLabel&&p.ctaUrl?`<span class="marketing-preview-cta">${esc(cta)}</span>`:''}</div><div class="marketing-preview-footer"><strong>${esc(p.companyName||'CallFocus')}</strong><span>${esc(p.businessAddress||'Your business mailing address will appear here.')}</span><small>Unsubscribe from promotional email</small></div></div>`;
}
function renderMarketingHistory(rows=marketingHistory){
  const root=$('marketingCampaignHistory');if(!root)return;marketingHistory=Array.isArray(rows)?rows:[];
  if(!marketingHistory.length){root.innerHTML='<div class="admin-users-empty">No promotional campaigns sent yet.</div>';return;}
  root.innerHTML=marketingHistory.map(c=>`<article class="marketing-history-item"><div><strong>${esc(c.subject||'Untitled campaign')}</strong><span>${c.createdAt?esc(new Date(c.createdAt).toLocaleString()):'—'} · ${esc(c.audience||'all')}</span></div><div class="marketing-history-stats"><span>${Number(c.sent||0)} sent</span><span>${Number(c.suppressed||0)} skipped</span><span class="${Number(c.failed||0)?'bad':''}">${Number(c.failed||0)} failed</span></div></article>`).join('');
}
function formatResendQuota(row){
  const used=Math.max(0,Number(row?.used)||0);
  const limit=row?.limit===null||row?.limit===undefined?null:Math.max(0,Number(row.limit)||0);
  return limit===null?`${used.toLocaleString()} used · No cap`:`${used.toLocaleString()} / ${limit.toLocaleString()}`;
}
function renderResendUsage(usage){
  const live=$('resendUsageLive'),note=$('resendUsageNote');
  [live,note].forEach(el=>{el?.classList.remove('is-ready','is-warn','bad','warn')});
  if(!usage?.available){
    if($('resendDailyUsage'))$('resendDailyUsage').textContent='Unavailable';
    if($('resendMonthlyUsage'))$('resendMonthlyUsage').textContent='Unavailable';
    if($('resendDailyRemaining'))$('resendDailyRemaining').textContent='—';
    if($('resendDailySent'))$('resendDailySent').textContent='Resend did not return quota data.';
    if($('resendMonthlySent'))$('resendMonthlySent').textContent='Your email sending can still remain connected.';
    if($('resendUsageReset'))$('resendUsageReset').textContent='Use Refresh email status to try again.';
    if(live){live.textContent=usage?.permissionError?'Key permission needed':'Usage unavailable';live.classList.add('is-warn');}
    if(note){note.textContent=usage?.error||'Could not retrieve Resend account usage.';note.classList.add(usage?.permissionError?'warn':'bad');}
    return;
  }
  const daily=usage.daily||{},monthly=usage.monthly||{};
  const dailyLimit=daily.limit===null||daily.limit===undefined?null:Math.max(0,Number(daily.limit)||0);
  const dailyUsed=Math.max(0,Number(daily.used)||0);
  const remaining=dailyLimit===null?null:Math.max(0,dailyLimit-dailyUsed);
  if($('resendDailyUsage'))$('resendDailyUsage').textContent=formatResendQuota(daily);
  if($('resendMonthlyUsage'))$('resendMonthlyUsage').textContent=formatResendQuota(monthly);
  if($('resendDailyRemaining'))$('resendDailyRemaining').textContent=remaining===null?'No cap':remaining.toLocaleString();
  if($('resendDailySent'))$('resendDailySent').textContent=`${Math.max(0,Number(daily.sent)||0).toLocaleString()} sent today${Number(daily.received)>0?` · ${Math.max(0,Number(daily.received)||0).toLocaleString()} received`:''}`;
  if($('resendMonthlySent'))$('resendMonthlySent').textContent=`${Math.max(0,Number(monthly.sent)||0).toLocaleString()} sent this month${Number(monthly.received)>0?` · ${Math.max(0,Number(monthly.received)||0).toLocaleString()} received`:''}`;
  const reset=daily.resetsAt?new Date(daily.resetsAt):null;
  if($('resendUsageReset'))$('resendUsageReset').textContent=reset&&!Number.isNaN(reset.getTime())?`Daily quota resets ${reset.toLocaleString()}`:'Daily quota reset time unavailable.';
  if(live){live.textContent=usage?.keySource==='dedicated'?'Live from Resend · Usage key':'Live from Resend';live.classList.add('is-ready');}
  if(note){
    const pct=dailyLimit?Math.min(100,Math.round((dailyUsed/dailyLimit)*100)):null;
    note.textContent=dailyLimit===null?'Your current Resend plan has no daily cap reported by the Usage API.':`${remaining.toLocaleString()} email${remaining===1?'':'s'} remaining today · ${pct}% of the daily quota used.`;
  }
}
async function loadMarketingStatus(){
  if(!adminKey)return;const btn=$('marketingRefreshBtn');if(btn){btn.disabled=true;btn.textContent='Refreshing…';}
  try{
    const result=await api('/api/admin/marketing-email');
    $('marketingStatusStrip')?.classList.toggle('is-ready',!!result.configured);
    if($('marketingStatusText'))$('marketingStatusText').textContent=result.configured?'Resend promotional sending is connected':'Resend promotional sending is not configured';
    if($('marketingSenderText'))$('marketingSenderText').textContent=result.configured?`Sender: ${result.sender||'configured sender'}${result.replyTo?` · Replies: ${result.replyTo}`:''}`:'Add RESEND_API_KEY and CALLFOCUS_FROM_EMAIL in Cloudflare.';
    renderResendUsage(result.usage||{available:false,error:'Usage details were not returned.'});
    applyMarketingDraft(result.draft||null);
    if(!marketingDraftLoaded){marketingDraftLoaded=true;setMarketingDraftStatus('No saved draft yet. Changes will save automatically.');}
    renderMarketingHistory(result.history||[]);
  }catch(err){if($('marketingStatusText'))$('marketingStatusText').textContent='Could not check email status';if($('marketingSenderText'))$('marketingSenderText').textContent=err.message||'Try again.';renderResendUsage({available:false,error:err.message||'Try again.'});}
  finally{if(btn){btn.disabled=false;btn.textContent='Refresh email status';}}
}
function marketingShowResult(message,type='ok'){
  const box=$('marketingSendResult');if(!box)return;box.classList.remove('hidden','bad');if(type==='bad')box.classList.add('bad');box.textContent=message;
}
async function sendMarketingEmail(test=false){
  if(marketingSending)return;const p=marketingCampaignPayload();
  if(!p.subject||!p.headline||!p.message)return toast('Add a subject, headline and message first');
  if((p.ctaLabel&&!p.ctaUrl)||(!p.ctaLabel&&p.ctaUrl))return toast('Add both a button label and button link, or leave both blank');
  if(!p.companyName||!p.businessAddress)return toast('Add your legal business name and mailing address');
  if(!test&&!$('marketingConsentConfirmed')?.checked)return toast('Confirm that these recipients opted in to promotional email');
  const audience=marketingAudience();if(!test&&audience==='selected'&&!marketingSelectedUserIds.size)return toast('Select at least one customer');
  const testEmail=marketingValue('marketingTestEmail');if(test&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail))return toast('Enter a valid test email address');
  const btn=test?$('marketingTestBtn'):$('marketingSendBtn'),old=btn?.textContent||'';const requestId=(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);
  if(!test){const count=audience==='all'?adminUsers.filter(u=>!u.accountDisabled&&u.emailVerified!==false).length:marketingSelectedUserIds.size;if(!confirm(`Send this promotional email to ${count} ${audience==='all'?'active customer account(s)':'selected customer(s)'}?\n\nCustomers who previously unsubscribed will be skipped automatically.`))return;}
  marketingSending=true;if(btn){btn.disabled=true;btn.textContent=test?'Sending test…':'Sending campaign…';}marketingShowResult(test?'Preparing test email…':'Preparing campaign…');
  try{
    const result=await api('/api/admin/marketing-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,action:test?'test':'send',testEmail,audience,selectedUserIds:[...marketingSelectedUserIds],consentConfirmed:$('marketingConsentConfirmed')?.checked===true,requestId})});
    if(test){marketingShowResult(`Test email sent to ${testEmail}. Check the inbox and spam folder before sending the campaign.`);toast('Test email sent');}
    else{const c=result.campaign||{};marketingShowResult(`${Number(c.sent||0)} sent · ${Number(c.suppressed||0)} unsubscribed skipped · ${Number(c.failed||0)} failed${Number(c.failed||0)?' · check Resend logs for delivery details':''}`,Number(c.failed||0)&&!Number(c.sent||0)?'bad':'ok');renderMarketingHistory(result.history||[]);toast(Number(c.failed||0)?'Campaign completed with some delivery errors':'Campaign submitted to Resend');}
    loadMarketingStatus().catch(()=>{});
  }catch(err){marketingShowResult(err.message||'Could not send email','bad');toast(err.message||'Could not send email');}
  finally{marketingSending=false;if(btn){btn.disabled=false;btn.textContent=old;}}
}
document.querySelectorAll('input[name="marketingAudience"]').forEach(input=>input.addEventListener('change',()=>{document.querySelectorAll('.marketing-audience-option').forEach(label=>label.classList.toggle('active',label.querySelector('input')?.checked));renderMarketingRecipients();}));
$('marketingRecipientSearch')?.addEventListener('input',renderMarketingRecipients);
$('marketingRecipientList')?.addEventListener('change',event=>{const box=event.target.closest('[data-marketing-user-id]');if(!box)return;const id=box.dataset.marketingUserId;if(box.checked)marketingSelectedUserIds.add(id);else marketingSelectedUserIds.delete(id);renderMarketingRecipients();});
$('marketingSelectVisibleBtn')?.addEventListener('click',()=>{document.querySelector('input[name="marketingAudience"][value="selected"]')?.click();marketingRecipientRows().forEach(u=>marketingSelectedUserIds.add(u.id));renderMarketingRecipients();});
$('marketingClearSelectedBtn')?.addEventListener('click',()=>{marketingSelectedUserIds.clear();renderMarketingRecipients();});
['marketingSubject','marketingPreheader','marketingEyebrow','marketingHeadline','marketingMessage','marketingCtaLabel','marketingCtaUrl','marketingCompanyName','marketingBusinessAddress','marketingTestEmail'].forEach(id=>$(id)?.addEventListener('input',()=>{renderMarketingPreview();queueMarketingDraftSave();}));
$('marketingSaveDraftBtn')?.addEventListener('click',()=>saveMarketingDraft({silent:false}));
$('marketingTestBtn')?.addEventListener('click',()=>sendMarketingEmail(true));
$('marketingSendBtn')?.addEventListener('click',()=>sendMarketingEmail(false));
$('marketingRefreshBtn')?.addEventListener('click',loadMarketingStatus);
renderMarketingPreview();

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

/* V15.92: lightweight navigation only. Existing controls and save handlers are unchanged. */
const ADMIN_CONTROL_TARGETS={
  'payment-methods':['payments','adminPaymentMethodsPanel'],
  'credit-offers':['payments','purchaseOffersPanel'],
  'maintenance':['dashboard','adminWebsiteMaintenancePanel']
};
document.querySelectorAll('[data-admin-control]').forEach(btn=>btn.addEventListener('click',()=>{
  const [tab,id]=ADMIN_CONTROL_TARGETS[btn.dataset.adminControl]||[];
  if(!tab)return;
  setAdminTab(tab);
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:'auto'}));
}));
(async()=>{
  const stamp=$('adminBuildStamp'),status=$('adminControlStatus');
  const ids=['adminManualPaymentsEnabled','adminKorapayPaymentsEnabled','adminWebsiteMaintenanceEnabled','adminOffer3000','adminOffer5000','adminOffer10000','adminPurchaseBonusEnabled','adminPurchasePopupEnabled','savePurchaseOffersBtn'];
  const missing=ids.filter(id=>!$(id));
  try{
    const response=await fetch('/api/app-version',{cache:'no-store'});
    if(!response.ok)throw new Error('Version unavailable');
    const data=await response.json();const running=String(data.version||'unknown');
    if(stamp)stamp.textContent=`Admin 16.11 · Worker ${running}`;
    if(running!==ADMIN_BUILD_VERSION||missing.length){
      if(status){status.textContent='A different or incomplete set of CallFocus files is active. Do not save admin settings until the matching complete build is uploaded and promoted.';status.classList.add('admin-control-warning');}
    }
  }catch{
    if(stamp)stamp.textContent='Admin 16.11 · Worker status unavailable';
    if(missing.length&&status){status.textContent='Some required controls were not found. Verify that the complete build was uploaded.';status.classList.add('admin-control-warning');}
  }
})();

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
  try{await loadAdminManualPayments();await Promise.all([loadAdminUsers(true),loadAdminAiUsage(),loadMarketingStatus(),loadAdminFundingReport()]);toast('Admin data refreshed');}
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


/* V15.91 — independent real-time credit and promo settings. */
function fillPurchaseOfferControls(config={}) {
 const packages=config.purchasePackages||{};
 for(const amount of ['3000','5000','10000']) {const input=$('adminOffer'+amount);if(input)input.value=Number(packages[amount])||Number(amount)/10;const price=$('adminPrice'+amount);if(price)price.value=Number(config.purchasePackagePrices?.[amount])||Number(amount);}
 if($('adminMinimumDeposit'))$('adminMinimumDeposit').value=Number(config.minimumDepositNaira)||3000;
 if($('adminPurchaseBonusEnabled'))$('adminPurchaseBonusEnabled').checked=config.purchaseBonusEnabled===true;
 if($('adminPurchaseBonusPercent'))$('adminPurchaseBonusPercent').value=Number(config.purchaseBonusPercent??30);
 if($('adminPurchasePopupEnabled'))$('adminPurchasePopupEnabled').checked=config.purchasePromoPopupEnabled===true;
 if($('adminPurchasePopupOpen'))$('adminPurchasePopupOpen').value=Number(config.purchasePromoPopupOpenSeconds??8);
 if($('adminPurchasePopupClose'))$('adminPurchasePopupClose').value=Number(config.purchasePromoPopupCloseSeconds??0);
 renderPurchaseOffersPreview();
}
function renderPurchaseOffersPreview(){
 const sample=Number($('adminOffer10000')?.value)||1000,price=Number($('adminPrice10000')?.value)||10000,pct=$('adminPurchaseBonusEnabled')?.checked?Number($('adminPurchaseBonusPercent')?.value)||0:0;
 const bonus=Math.round(sample*pct/100*10)/10;
 const el=$('adminOfferPreview');if(el)el.textContent=`Example: ₦${price.toLocaleString()} buys ${sample.toLocaleString()} base credits${bonus?` plus ${bonus.toLocaleString()} free credits (${pct}% bonus), for ${(sample+bonus).toLocaleString()} credits total`:'. No purchase bonus while disabled'}.`;
}
['adminOffer3000','adminOffer5000','adminOffer10000','adminPrice3000','adminPrice5000','adminPrice10000','adminMinimumDeposit','adminPurchaseBonusEnabled','adminPurchaseBonusPercent'].forEach(id=>$(id)?.addEventListener('input',renderPurchaseOffersPreview));
$('savePurchaseOffersBtn')?.addEventListener('click',async()=>{
 const btn=$('savePurchaseOffersBtn'),feedback=$('purchaseOffersFeedback');
 const payload={purchasePackages:{'3000':Number($('adminOffer3000').value),'5000':Number($('adminOffer5000').value),'10000':Number($('adminOffer10000').value)},purchasePackagePrices:{'3000':Number($('adminPrice3000').value),'5000':Number($('adminPrice5000').value),'10000':Number($('adminPrice10000').value)},minimumDepositNaira:Number($('adminMinimumDeposit').value),purchaseBonusEnabled:$('adminPurchaseBonusEnabled').checked,purchaseBonusPercent:Number($('adminPurchaseBonusPercent').value),purchasePromoPopupEnabled:$('adminPurchasePopupEnabled').checked,purchasePromoPopupOpenSeconds:Number($('adminPurchasePopupOpen').value),purchasePromoPopupCloseSeconds:Number($('adminPurchasePopupClose').value)};
 btn.disabled=true;const old=btn.textContent;btn.textContent='Saving…';
 try{const result=await api('/api/admin/purchase-offers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   currentConfig=result.config;fillPurchaseOfferControls(result.config);saveBackup(result.config);
   feedback.textContent='Saved. New offers are available on the customer payment page; existing pending payments keep their original offer.';feedback.className='admin-availability-feedback ok';toast('Credit offers updated');
 }catch(error){feedback.textContent=error.message||'Could not save offers';feedback.className='admin-availability-feedback error';toast(error.message||'Could not save offers');}
 finally{btn.disabled=false;btn.textContent=old;}
});

/* V15.96 — Emergency signup code pause, isolated from other admin saves. */
$('saveSignupEmailVerificationBtn')?.addEventListener('click', async () => {
  const btn=$('saveSignupEmailVerificationBtn');
  const feedback=$('adminSignupEmailFeedback');
  if(!btn||!feedback)return;
  const required=$('adminSignupEmailVerificationRequired')?.checked===true;
  btn.disabled=true;const original=btn.textContent;btn.textContent='Saving…';
  try {
    const result=await api('/api/admin/signup-email-verification', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({required})
    });
    if(result.config){currentConfig=result.config;saveBackup(result.config);}
    $('adminSignupEmailVerificationRequired').checked=result.required===true;
    feedback.textContent=result.required?'Email verification required for new signups. Codes will be sent through Resend.':'Temporary signup mode active. New accounts can register without an email code and remain unverified.';
    feedback.className='admin-availability-feedback ok';
    toast(result.required?'Signup verification enabled':'Temporary signup enabled');
  } catch(err) {
    feedback.textContent=err.message||'Unable to save signup setting.';
    feedback.className='admin-availability-feedback error';
    toast(err.message||'Unable to save signup setting');
    if(currentConfig)$('adminSignupEmailVerificationRequired').checked=currentConfig.signupEmailVerificationEnabled===true;
  } finally {btn.disabled=false;btn.textContent=original;}
});

/* V16.06 PocketFi static-account webhook review: read-only event feed and verified recheck. */
(()=>{
 const init=()=>{
  const place=document.getElementById('adminManualPaymentsPanel')||document.getElementById('manualPaymentsPanel')||document.querySelector('[data-admin-panel="payments"] .admin-manual-payments-panel');
  if(!place||document.getElementById('pfiBankAdminPanel'))return;
  const section=document.createElement('section');section.id='pfiBankAdminPanel';section.className='premium-panel form-panel';
  section.style.cssText='margin-top:24px;padding:22px;border:1px solid #dbe8e3;border-radius:20px';
  section.innerHTML='<h3>PocketFi bank transfer events</h3><p>Signed virtual-account deposits. Items requiring review are never automatically credited.</p><button type="button" class="btn btn-ghost" id="pfiBankEventsRefresh">Refresh signed events</button><div id="pfiBankEventsContent" style="margin-top:12px;font-size:14px">Select Refresh to inspect events.</div>';
  place.parentElement?.appendChild(section);
  const content=section.querySelector('#pfiBankEventsContent');
  const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function loadSignedEvents(cursor='',append=false){
   if(!append)content.textContent='Loading signed events…';
   try{
    const url='/api/admin/pocketfi-bank-events'+(cursor?'?cursor='+encodeURIComponent(cursor):'');
    const result=await api(url);if(!result.ok)throw Error(result.error||'Could not load events');
    if(!append)content.innerHTML='';
    if(!result.events.length&&!append)content.textContent='No signed events found.';
    for(const ev of result.events){
     const row=document.createElement('div');row.style.cssText='border:1px solid #dbe8e3;border-radius:12px;padding:12px;margin-top:9px;overflow-wrap:anywhere';
     row.innerHTML=`<strong>${safe(ev.status)}</strong> · ₦${safe(ev.amountNaira)}<div>${safe(ev.reference)}</div><small>${safe(ev.receivedAt)} · account ****${safe(String(ev.accountNumber||'').slice(-4))}</small>${String(ev.status).startsWith('review_')?`<button type="button" class="btn btn-ghost" style="margin-top:8px" data-pfi-recheck="${safe(ev.reference)}">Recheck signed event</button>`:''}`;
     content.appendChild(row);
    }
    if(!result.complete&&result.cursor){const more=document.createElement('button');more.className='btn btn-ghost';more.type='button';more.textContent='Load more PocketFi events';more.style.marginTop='12px';more.onclick=()=>{more.remove();loadSignedEvents(result.cursor,true)};content.appendChild(more)}
   }catch(error){const notice=document.createElement('p');notice.textContent=error.message||'Could not load events';content.appendChild(notice)}
  }
  section.querySelector('#pfiBankEventsRefresh').onclick=()=>loadSignedEvents();
 section.addEventListener('click',async e=>{const b=e.target.closest('[data-pfi-recheck]');if(!b)return;b.disabled=true;try{const r=await api('/api/admin/pocketfi-bank-recheck',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference:b.dataset.pfiRecheck})});if(!r.ok)throw Error(r.error||'Recheck failed');b.textContent='Result: '+r.status;}catch(ex){b.textContent=ex.message||'Review needed'}finally{b.disabled=false}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
