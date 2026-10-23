/* CallFocus V16.22, customer announcement and package presentation. No changes to call-provider code. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const money=n=>'₦'+Math.round(Number(n)||0).toLocaleString('en-NG');
 let announcement=null,announcementTimer=null,closeTimer=null,lastRevision='',rates={liveCall:100,voiceNote:100,imageVideo:1800};
 function signed(){return !!localStorage.getItem('callfocus_server_session_v1')}
 function home(){const page=$('page-home');return page&&page.classList.contains('active')}
 function close(){document.getElementById('cfAnnouncementOverlay')?.remove();clearTimeout(closeTimer)}
 function show(){if(!announcement?.enabled||!signed()||!home())return;if(!announcement.title||!announcement.message)return;
  const key='callfocus_announcement_seen_'+announcement.revision;
  try{if(sessionStorage.getItem(key))return}catch{}
  if($('cfAnnouncementOverlay'))return;
  const wrapper=document.createElement('div');wrapper.className='cf-ann-overlay';wrapper.id='cfAnnouncementOverlay';wrapper.setAttribute('role','presentation');
  const box=document.createElement('section');box.className='cf-ann-panel';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','cfAnnHeadline');
  const icon=document.createElement('span');icon.className='cf-ann-icon';icon.textContent='●';icon.setAttribute('aria-hidden','true');
  const eyebrow=document.createElement('small');eyebrow.className='cf-ann-eyebrow';eyebrow.textContent='CALLFOCUS ANNOUNCEMENT';
  const title=document.createElement('h2');title.id='cfAnnHeadline';title.textContent=announcement.title;
  const body=document.createElement('p');body.className='cf-ann-message';body.textContent=announcement.message;
  const btn=document.createElement('button');btn.type='button';btn.textContent=announcement.buttonText||'Got it';btn.className='cf-ann-button';
  const dismiss=()=>{try{sessionStorage.setItem(key,'1')}catch{}close()};btn.addEventListener('click',dismiss);
  const x=document.createElement('button');x.type='button';x.className='cf-ann-x';x.textContent='×';x.setAttribute('aria-label','Close announcement');x.addEventListener('click',dismiss);
  box.append(icon,eyebrow,x,title,body,btn);wrapper.append(box);wrapper.addEventListener('click',e=>{if(e.target===wrapper)dismiss()});document.body.append(wrapper);btn.focus({preventScroll:true});
  const delay=Math.max(0,Number(announcement.closeSeconds)||0);if(delay)closeTimer=setTimeout(dismiss,delay*1000);
 }
 function schedule(){clearTimeout(announcementTimer);announcementTimer=null;
  if(!announcement?.enabled||!signed()||!home())return;const key='callfocus_announcement_seen_'+announcement.revision;
  try{if(sessionStorage.getItem(key))return}catch{}
  announcementTimer=setTimeout(()=>{announcementTimer=null;show()},Math.max(0,Number(announcement.openSeconds)||0)*1000);
 }
 function syncPrices(){const opts=window.CallFocusPurchaseOffers||{};const credit=opts.purchasePackages||{},prices=opts.purchasePackagePrices||{};const min=Number(opts.minimumDepositNaira)||3000;
  document.querySelectorAll('[data-credit-package]').forEach(btn=>{const credits=Number(btn.dataset.creditPackage);const key=Object.keys(credit).find(k=>Number(credit[k])===credits);if(!key)return;const price=Number(prices[key])||Number(key);{btn.dataset.cfPrice=String(price);let b=btn.querySelector('b');if(b&&b.textContent!==money(price))b.textContent=money(price)}btn.classList.toggle('cf-package-too-small',price<min);btn.setAttribute('aria-disabled',price<min?'true':'false');});
  const selected=document.querySelector('.credit-package.active[data-credit-package]');const raw=Number($('customCreditAmount')?.value||0);const match=Object.keys(credit).find(k=>Number(credit[k])===raw);const quoted=match?(Number(prices[match])||Number(match)):raw*10;const tooSmall=quoted<min;
  const target=$('creditAmountError');if(target){target.textContent=tooSmall?`Minimum deposit is ${money(min)}. Choose a larger credit amount.`:'';target.hidden=!tooSmall;}
  const input=$('customCreditNaira');if(input&&Number.isFinite(quoted)&&raw>0&&input.textContent!==money(quoted))input.textContent=money(quoted);
  const bonus=opts.purchaseBonusEnabled?Math.round(raw*(Number(opts.purchaseBonusPercent)||0)/100*10)/10:0;const summary=$('creditCheckoutSummary');if(summary&&raw>0){const label=`${raw.toLocaleString()} credits${bonus?` + ${bonus.toLocaleString()} bonus`:''} · ${money(quoted)}`;if(summary.textContent!==label)summary.textContent=label;}
  if(selected&&selected.getAttribute('aria-disabled')==='true')selected.classList.remove('active');
  for(const id of ['creditCheckoutBtn','korapayCheckoutBtn','flutterwaveCheckoutBtn','pocketfiCheckoutBtn','manualPaymentBtn']){const b=$(id);if(b){b.dataset.cfBelowMin=String(tooSmall);b.title=tooSmall?`Minimum deposit is ${money(min)}`:''}}
 }
 function syncTariffs(){
  const call=Number(rates.liveCall)||100,note=Number(rates.voiceNote)||100,vid=Number(rates.imageVideo)||1800;
  document.querySelectorAll('.credit-rate-card strong').forEach(n=>{const v=`Voice calls: ${call} credits/min · Voice notes: ${note} credits/min`;if(n.textContent!==v)n.textContent=v});
  document.querySelectorAll('.credit-rate-card small').forEach(n=>{const v=`Billed by second. Image to Video: ${vid} credits/min`;if(n.textContent!==v)n.textContent=v});
  if($('voiceNoteCreditRate')){$('voiceNoteCreditRate').textContent=`Voice notes: ${note} credits/min · Billed per second`}
  document.querySelectorAll('.credit-package[data-credit-package]').forEach(btn=>{const n=Number(btn.dataset.creditPackage);const seconds=n/call*60;const msg=`≈ ${seconds<60?Math.round(seconds)+' seconds':(seconds/60).toFixed(1)+' minutes'} of voice calls`;const small=btn.querySelector('small');if(small&&small.textContent!==msg)small.textContent=msg});
 }
 async function refresh(){let d;try{const r=await fetch('/api/cf-feature-controls',{cache:'no-store'});if(!r.ok)return;d=await r.json()}catch{return};
  announcement=d.announcement||null;if(!announcement?.enabled)close();if(lastRevision!==announcement?.revision){lastRevision=announcement?.revision||'';schedule()}
  window.CallFocusServiceRates=d.rates||{};rates=d.rates||rates;syncTariffs();
 }
 document.addEventListener('click',e=>{const button=e.target.closest?.('button[data-cf-below-min="true"]');if(button){e.preventDefault();e.stopImmediatePropagation();const msg=$('creditAmountError')?.textContent||'Choose a higher deposit amount.';if(window.toast)window.toast(msg);else alert(msg)}},true);
 const observer=new MutationObserver(()=>{syncPrices();schedule()});const homePage=$('page-home');if(homePage)observer.observe(homePage,{attributes:true,attributeFilter:['class']});
 const creditPage=$('page-credits');if(creditPage)observer.observe(creditPage,{attributes:true,attributeFilter:['class']});
 $('customCreditAmount')?.addEventListener('input',()=>queueMicrotask(syncPrices));document.querySelectorAll('[data-credit-package]').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(syncPrices)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('cfAnnouncementOverlay'))close()});
 window.addEventListener('callfocus:account-ready',schedule);window.addEventListener('focus',refresh);
 window.addEventListener('pageshow',()=>{refresh();syncPrices()});
 // Use existing refresh stream, do not modify the original payment script.
 setInterval(()=>{if(document.visibilityState!=='visible')return;syncPrices();syncTariffs();if(home())refresh()},10000);
 refresh();syncPrices();syncTariffs();
})();
