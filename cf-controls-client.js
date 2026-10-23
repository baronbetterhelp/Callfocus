/* CallFocus V16.28: keep admin-defined package prices and minutes authoritative in the existing Credits UI. */
(()=>{'use strict';
 const $=id=>document.getElementById(id), money=n=>'₦'+Math.round(Number(n)||0).toLocaleString('en-NG');
 const defaults={purchasePackages:{'3000':300,'5000':500,'10000':1000},purchasePackagePrices:{'3000':3000,'5000':5000,'10000':10000},minimumDepositNaira:3000};
 let offers=null,rates={liveCall:100,cloneVoice:150,voiceNote:100,imageVideo:1800},announcement=null,annSeen='',annTimer,closeTimer,annShownThisLoad=false;
 let loading=false,lastFetch=0,rendering=false,didInitialValueSync=false;
 const signed=()=>{try{return !!localStorage.getItem('callfocus_server_session_v1')}catch{return false}};
 const home=()=>!!$('page-home')?.classList.contains('active');
 const creditsActive=()=>!!$('page-credits')?.classList.contains('active');
 const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};
 const safeNum=(v,d)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):d;
 const packageRows=()=>['3000','5000','10000'].map(k=>({key:k,credits:safeNum(offers?.purchasePackages?.[k],defaults.purchasePackages[k]),price:safeNum(offers?.purchasePackagePrices?.[k],defaults.purchasePackagePrices[k])}));
 const minimum=()=>safeNum(offers?.minimumDepositNaira,3000);
 const minimumCredits=()=>Math.max(300,Math.ceil(minimum()/10));
 const rate=n=>safeNum(rates?.[n],{liveCall:100,cloneVoice:150,voiceNote:100,imageVideo:1800}[n]);
 const quote=c=>{const value=Math.floor(Number(c)||0),match=packageRows().find(p=>p.credits===value);return match?match.price:value*10};
 const minutes=(c,r)=>{const secs=c/r*60;return secs<60?`${Math.floor(secs)} seconds`:`${Number((secs/60).toFixed(1)).toLocaleString('en-NG',{maximumFractionDigits:1})} min`};
 function announceClose(){document.getElementById('cfAnnouncementOverlay')?.remove();clearTimeout(closeTimer)}
 function announcementAudience(){return home()&&signed()&&Boolean(window.CallFocusServerAccount?.isServerReady?.()&&typeof account!=='undefined'&&account?.id)}
 function buildAnnouncementParagraphs(text){
  const chunks=String(text||'').split(/\n\s*\n+/).map(s=>s.trim()).filter(Boolean);
  return chunks.length?chunks:[String(text||'').trim()].filter(Boolean);
 }
 function openAnnouncement(){if(!announcement?.enabled||!announcementAudience()||!announcement.title||!announcement.message||annShownThisLoad)return;
  if($('cfAnnouncementOverlay'))return;annShownThisLoad=true;
  const overlay=document.createElement('div');overlay.id='cfAnnouncementOverlay';overlay.className='cf-purchase-promo-overlay cf-ann-overlay';
  const panel=document.createElement('section');panel.className='cf-purchase-promo-card cf-ann-promo-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','cfAnnHeadline');
  const x=document.createElement('button');x.type='button';x.className='cf-purchase-promo-close cf-ann-promo-close';x.setAttribute('aria-label','Close announcement');x.textContent='×';
  const logoWrap=document.createElement('div');logoWrap.className='cf-ann-promo-logo-wrap';
  const logo=document.createElement('img');logo.className='cf-ann-promo-logo';logo.src='/logo.png';logo.alt='CallFocus';logoWrap.append(logo);
  const label=document.createElement('span');label.className='cf-purchase-promo-label cf-ann-promo-label';label.textContent='CALLFOCUS · LATEST ANNOUNCEMENT';
  const title=document.createElement('h2');title.id='cfAnnHeadline';title.className='cf-ann-promo-title';title.textContent=announcement.title;
  const message=document.createElement('div');message.className='cf-ann-promo-message';
  const intro=document.createElement('span');intro.className='cf-ann-promo-tag';intro.textContent='An update for you';message.append(intro);
  for(const part of buildAnnouncementParagraphs(announcement.message)){const p=document.createElement('p');p.textContent=part;message.append(p)}
  const btn=document.createElement('button');btn.type='button';btn.className='cf-purchase-promo-deposit cf-ann-promo-button';btn.textContent=announcement.buttonText||'Close';
  const dismiss=()=>{announceClose()};btn.addEventListener('click',dismiss);x.addEventListener('click',dismiss);overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss()});
  panel.append(x,logoWrap,label,title,message,btn);overlay.append(panel);document.body.append(overlay);x.focus({preventScroll:true});if(Number(announcement.closeSeconds)>0)closeTimer=setTimeout(dismiss,Number(announcement.closeSeconds)*1000);
 }
 function schedule(){
  if(!announcement?.enabled||!announcementAudience()){
   clearTimeout(annTimer);annTimer=null;
   if($('cfAnnouncementOverlay'))announceClose();
   return;
  }
  if(annShownThisLoad||annTimer||$('cfAnnouncementOverlay'))return;
  annTimer=setTimeout(()=>{annTimer=null;openAnnouncement()},Math.max(0,Number(announcement.openSeconds)||0)*1000);
 }
 function syncPackages(){
  // Older CallFocus renderers still write static package values. Restore the
  // authoritative settings here without editing the original calling bundle.
  const current=window.CallFocusPurchaseOffers;
  if(current?.purchasePackages&&current?.purchasePackagePrices)offers=current;
  if(!offers)return;
  const items=document.querySelectorAll('#page-credits .credit-package[data-credit-package]');
  const rows=packageRows();items.forEach((btn,i)=>{
   if(i>=rows.length)return;const p=rows[i];
   if(btn.dataset.creditPackage!==String(p.credits))btn.dataset.creditPackage=String(p.credits);
   if(btn.dataset.packageNaira!==p.key)btn.dataset.packageNaira=p.key;
   if(btn.dataset.cfPrice!==String(p.price))btn.dataset.cfPrice=String(p.price);
   setText(btn.querySelector('strong'),p.credits.toLocaleString('en-NG')+' credits');
   setText(btn.querySelector('small'),minutes(p.credits,rate('liveCall'))+' standard calls');
   setText(btn.querySelector('b'),money(p.price));
   const below=p.price<minimum();btn.classList.toggle('cf-package-too-small',below);
   if(btn.getAttribute('aria-disabled')!==String(below))btn.setAttribute('aria-disabled',String(below));
   const bonus=btn.querySelector('.cf-offer-package-bonus');
   if(bonus){const percent=offers.purchaseBonusEnabled?safeNum(offers.purchaseBonusPercent,0):0;
    const extra=Math.round(p.credits*percent/100*10)/10;
    if(bonus.hidden!==(extra<=0))bonus.hidden=extra<=0;
    setText(bonus,extra>0?`+${extra.toLocaleString('en-NG')} free · ${(p.credits+extra).toLocaleString('en-NG')} total`:'');
   }
  });
  const inp=$('customCreditAmount');
  if(inp&&!didInitialValueSync){
   if(Number(inp.value)<minimumCredits()){
    const eligible=packageRows().find(row=>row.price>=minimum());inp.value=String(eligible?.credits||minimumCredits());
   }
   didInitialValueSync=true;
  }
  const base=Number(inp?.value)||0,price=quote(base);
  if(inp){if(inp.min!==String(minimumCredits()))inp.min=String(minimumCredits());
   const placeholder=`${minimumCredits().toLocaleString('en-NG')} credits or more`;
   if(inp.placeholder!==placeholder)inp.placeholder=placeholder;
  }
  document.querySelectorAll('#page-credits .credit-custom-card > div:first-child small').forEach(n=>setText(n,`Enter ${minimumCredits().toLocaleString('en-NG')} credits or more (minimum ${money(minimum())}).`));
  document.querySelectorAll('#page-credits .credit-section-title > small').forEach(n=>setText(n,`Minimum deposit ${money(minimum())}`));
  if(base>0){setText($('customCreditNaira'),money(price));setText($('customCreditMinutes'),minutes(base,rate('liveCall'))+' standard call time')}
  const bonusPercent=offers.purchaseBonusEnabled?Math.max(0,Number(offers.purchaseBonusPercent)||0):0;
  const bonus=Math.round(base*bonusPercent/100*10)/10;
  if(base>0)setText($('creditCheckoutSummary'),`${base.toLocaleString('en-NG')} credits${bonus?` + ${bonus.toLocaleString('en-NG')} bonus`:''} · ${money(price)}`);
  const invalid=base<300||!Number.isInteger(base)||price<minimum();const err=$('creditAmountError');
  if(err){setText(err,base<300?'Minimum purchase is 300 credits.':`Minimum deposit is ${money(minimum())}. Choose at least ${minimumCredits().toLocaleString('en-NG')} credits or an eligible package.`);
   err.classList.toggle('hidden',!invalid);if(err.hidden!==!invalid)err.hidden=!invalid;
  }
  for(const id of ['creditCheckoutBtn','korapayCheckoutBtn','pocketfiCheckoutBtn','flutterwaveCheckoutBtn','pocketfiBankBtn']){
   const btn=$(id);if(!btn)continue;
   if(btn.dataset.cfBelowMin!==String(invalid))btn.dataset.cfBelowMin=String(invalid);
   if(invalid&&btn.offsetParent!==null)btn.disabled=true;
  }
 }
 function syncRates(){if(!rates)return;
  const host=document.querySelector('#page-credits .credit-rate-card');if(host){host.classList.add('cf-rate-overview');
   const main=host.querySelector(':scope > strong'),small=host.querySelector(':scope > small'),span=host.querySelector(':scope > span');
   if(span)span.textContent='Our service rates';if(main)main.style.display='none';if(small)small.style.display='none';
   let grid=$('cfRateOverview');if(!grid){grid=document.createElement('div');grid.id='cfRateOverview';grid.className='cf-rate-overview-grid';host.append(grid)}
   const display=[['Standard calls','liveCall'],['Cloned voices','cloneVoice'],['Voice notes','voiceNote'],['Image to Video','imageVideo']];
   grid.replaceChildren(...display.map(([label,key])=>{const row=document.createElement('div');row.className='cf-rate-row';const a=document.createElement('span');a.textContent=label;const b=document.createElement('b');b.textContent=`1 min / ${rate(key).toLocaleString('en-NG')}c`;row.append(a,b);return row}));
   let legend=$('cfRatesLegend');if(!legend){legend=document.createElement('p');legend.id='cfRatesLegend';legend.className='cf-rates-legend';host.append(legend)}legend.textContent='Usage is charged proportionally by seconds. Video costs depend on the selected duration.';
  }
  const all=document.querySelectorAll('[id^="cf-el-select-"]');for(const select of all){for(const option of select.options){const custom=option.value&&option.value!=='normal'&&option.value!=='default'&&option.value!=='standard';if(custom){const original=option.dataset.cfVoiceName||option.textContent.replace(/\s*·\s*1 min\s*\/.*$/,'');option.dataset.cfVoiceName=original;option.textContent=`${original} · 1 min / ${rate('cloneVoice')}c`;}else if(!option.dataset.cfBaseText)option.dataset.cfBaseText=option.textContent;}
   let note=select.parentElement?.querySelector('.cf-clone-rate-display');if(!note){note=document.createElement('div');note.className='cf-clone-rate-display';note.setAttribute('aria-live','polite');select.insertAdjacentElement('afterend',note)}
   const custom=select.value&&select.value!=='normal'&&select.value!=='default'&&select.value!=='standard';const current=custom?rate('cloneVoice'):(select.id==='cf-el-select-note'?rate('voiceNote'):rate('liveCall'));note.textContent=custom?`Cloned voice selected · 1 min / ${current} credits · charged by seconds`:`Normal voice · 1 min / ${current} credits · charged by seconds`;
  }
  const vn=$('voiceNoteCreditRate');if(vn)vn.textContent=`Standard voice note: 1 min / ${rate('voiceNote')}c · Cloned: 1 min / ${rate('cloneVoice')}c`;
 }
 function render(){if(rendering)return;rendering=true;try{syncPackages();syncRates()}finally{rendering=false}}
 // Older view refreshes and offer-promo code can still rewrite credit amounts.
 // Restore in the same task when possible, and after any direct DOM change.
 const originalOfferSync=window.CallFocusSyncOffersUI;
 if(typeof originalOfferSync==='function'){
  window.CallFocusSyncOffersUI=function(...args){
   const result=originalOfferSync.apply(this,args);
   syncPackages();
   return result;
  };
 }
 let packageRepairQueued=false;
 const purchaseSection=$('creditPurchaseSection');
 if(purchaseSection){
  new MutationObserver(()=>{
   if(!offers||packageRepairQueued)return;
   packageRepairQueued=true;
   queueMicrotask(()=>{packageRepairQueued=false;syncPackages()});
  }).observe(purchaseSection,{subtree:true,childList:true,characterData:true});
 }

 async function refresh(force=false){if(loading||(!force&&Date.now()-lastFetch<5000))return;loading=true;
  try{const [feature,publicData]=await Promise.all([fetch('/api/cf-feature-controls',{cache:'no-store'}).then(r=>r.ok?r.json():null),fetch('/api/public-config',{cache:'no-store'}).then(r=>r.ok?r.json():null)]);
   if(feature?.rates)rates=feature.rates;if(publicData?.purchaseOffers){offers=publicData.purchaseOffers;window.CallFocusPurchaseOffers=offers;}
   announcement=feature?.announcement||null;
   if(!announcement?.enabled){announceClose();annShownThisLoad=false;}
   if((announcement?.revision||'')!==annSeen){annSeen=announcement?.revision||'';annShownThisLoad=false;clearTimeout(annTimer);annTimer=null;announceClose();}
   schedule();lastFetch=Date.now();render();
  }catch{}finally{loading=false}
 }
 document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-cf-below-min="true"],.credit-package.cf-package-too-small');if(btn){e.preventDefault();e.stopImmediatePropagation();window.toast?.(`Minimum deposit is ${money(minimum())}.`)||null;}},true);
 document.addEventListener('change',e=>{if(e.target.matches?.('[id^="cf-el-select-"]'))render();});
 document.addEventListener('input',e=>{if(e.target.id==='customCreditAmount')queueMicrotask(render)});
 document.addEventListener('click',e=>{if(e.target.matches?.('.credit-package'))setTimeout(render,30)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('cfAnnouncementOverlay'))announceClose()});
 window.addEventListener('callfocus:account-ready',()=>{refresh(true);schedule()});
 window.addEventListener('storage',e=>{if(e.key==='callfocus_server_session_v1'){if(!e.newValue){announceClose();annShownThisLoad=false;}schedule()}});
 window.addEventListener('focus',()=>{schedule();refresh(true)});
 window.addEventListener('pageshow',()=>{schedule();refresh(true)});
 const observer=new MutationObserver(()=>{if(creditsActive()||home())queueMicrotask(render);schedule()});for(const id of ['page-home','page-credits'])if($(id))observer.observe($(id),{attributes:true,attributeFilter:['class']});
 // Core UI is refreshed by earlier modules; render authoritative values last. No provider code changes.
 setInterval(()=>{if(document.visibilityState==='hidden')return;if(!announcementAudience()){if($('cfAnnouncementOverlay'))announceClose();if(!signed())annShownThisLoad=false;}if(creditsActive()||home()||document.querySelector('[id^="cf-el-select-"]'))render();refresh()},1100);
 refresh(true);
})();
