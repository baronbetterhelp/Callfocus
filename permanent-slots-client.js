/* Standalone CallFocus slot popup. No OpenAI call files are imported or modified. */
(()=>{'use strict';
const auth=()=>{try{return localStorage.getItem('callfocus_server_session_v1')||''}catch{return ''}};
let current=null,pending=false,autoDismissed=false;
const $=id=>document.getElementById(id);
const creditNumber=n=>Number(n||0).toLocaleString('en-NG');
async function load(){if(!auth())throw Error('Sign in to see the limited voice-cloning slots.');const r=await fetch('/api/permanent-slots/status',{cache:'no-store',headers:auth()?{Authorization:'Bearer '+auth()}:{}}),v=await r.json();if(!r.ok)throw Error(v.error||'Booking status unavailable.');current=v;return v}
function ensure(){if($('cf-slot-layer'))return;const layer=document.createElement('div');layer.id='cf-slot-layer';layer.className='cf-slot-layer';layer.innerHTML=`<section class="cf-slot-popup" role="dialog" aria-modal="true" aria-labelledby="cf-slot-title"><button type="button" class="cf-slot-close" aria-label="Close">×</button><small class="cf-slot-eyebrow">CALLFOCUS · LIMITED RELEASE</small><h2 id="cf-slot-title"></h2><p class="cf-slot-description"></p><div class="cf-slot-default-offer" hidden><span class="cf-slot-default-eyebrow">CALLS ARE STILL AVAILABLE</span><strong>Voice cloning is full, but you can still make calls.</strong><p>Choose our standard Male or Female voice and start a regular CallFocus call.</p><button class="cf-slot-default-btn" type="button">Use our default voice <span aria-hidden="true">→</span></button></div><div class="cf-slot-stats"><div><small>Slots remaining</small><strong class="cf-slot-remaining"></strong></div><div><small>Voice cloning date</small><strong class="cf-slot-date"></strong></div></div><p class="cf-slot-window"></p><p class="cf-slot-minimum"></p><p class="cf-slot-balance" aria-live="polite"></p><p class="cf-slot-response" role="status" aria-live="polite"></p><button class="cf-slot-book" type="button">Buy slot · 1,000 credits</button><a class="cf-slot-telegram" target="_blank" rel="noopener noreferrer">Join our Telegram channel</a></section>`;document.body.append(layer);
layer.querySelector('.cf-slot-close').onclick=close;layer.addEventListener('click',e=>{if(e.target===layer)close()});layer.querySelector('.cf-slot-book').onclick=book;layer.querySelector('.cf-slot-default-btn').onclick=openDefaultVoiceCall;window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}
// Guided entry only: the ordinary New Call button still owns the call form,
// validation, profile-prefill and provider/voice behavior. No call is started here.
let defaultVoiceGuideWatcher=null;
function openDefaultVoiceCall(){
 const modal=$('newCallModal'),newCallButton=$('heroNewCallBtn');
 if(!modal||!newCallButton){window.toast?.('The call form is unavailable. Open Start a Call from the home page.');return;}
 close();
 // The current signed-in user's existing Start a Call flow resets and
 // pre-fills the form from My Profile. Do not manufacture caller details.
 newCallButton.click();
 if(modal.classList.contains('hidden'))return;
 const section=$('newCallVoiceGender')?.closest('.field-section');
 const content=section?.querySelector('.field-content');
 const choices=content?.querySelector('.voice-choice');
 const scroller=modal.querySelector('.call-form-modal');
 if(!content||!choices||!scroller)return;
 defaultVoiceGuideWatcher?.disconnect();
 modal.querySelector('.cf-default-voice-guide')?.remove();
 // Use the original built-in voice control; never change OpenAI call settings.
 modal.querySelector('.voice-option[data-voice="male"]')?.click();
 const guide=document.createElement('div');
 guide.className='cf-default-voice-guide';
 guide.setAttribute('role','status');
 guide.innerHTML=`<strong>You're ready to use the standard CallFocus voice.</strong><p>Choose Male or Female here. Then scroll up to complete the other call details. For an easier setup, you can use <b>Fill in all information automatically</b> at the top and review the results before starting your call.</p><div class="cf-default-voice-guide-actions"><button type="button" class="cf-default-guide-up">↑ Scroll up to fill in details</button><button type="button" class="cf-default-guide-autofill">Fill in information automatically</button></div>`;
 choices.insertAdjacentElement('afterend',guide);
 guide.querySelector('.cf-default-guide-up').addEventListener('click',()=>{
  try{scroller.scrollTo({top:0,behavior:'smooth'})}catch{scroller.scrollTop=0}
 });
 guide.querySelector('.cf-default-guide-autofill').addEventListener('click',()=>{
  const autoFill=$('cfAutoFillAllBtn');
  if(autoFill){autoFill.click();return}
  scroller.scrollTop=0;
  window.toast?.('Use Fill in all information automatically at the top of this form.');
 });
 defaultVoiceGuideWatcher=new MutationObserver(()=>{
  if(modal.classList.contains('hidden')){
   guide.remove();defaultVoiceGuideWatcher?.disconnect();defaultVoiceGuideWatcher=null;
  }
 });
 defaultVoiceGuideWatcher.observe(modal,{attributes:true,attributeFilter:['class']});
 // Keep the user within the existing scrollable modal, aligned on section 08.
 // This is deliberate navigation only for the filled-slot CTA.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(modal.classList.contains('hidden'))return;
  const y=scroller.scrollTop+section.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;
  scroller.scrollTop=Math.max(0,y);
 }));
}
function close(){const layer=$('cf-slot-layer');if(layer?.classList.contains('open'))autoDismissed=true;layer?.classList.remove('open');document.body.classList.remove('cf-slot-modal-open')}
async function show(force=false,provided=null){if(force)autoDismissed=false;if(!auth()){close();if(force)window.showAuth?.('signin',null,'Sign in to view voice-cloning slots.');return;}ensure();let s;try{s=provided||await load()}catch(e){if(force&&auth())window.toast?.(e.message);return}if(!s.signedIn||!auth()){close();return}
const layer=$('cf-slot-layer'),book=layer.querySelector('.cf-slot-book'),msg=layer.querySelector('.cf-slot-response'),isFull=s.full&&!s.me,hasSlot=!!s.me,phase=s.bookingPhase||'open',upcoming=phase==='upcoming',ended=phase==='ended';
layer.querySelector('#cf-slot-title').textContent=isFull?'All voice cloning slots are filled':s.headline;
layer.querySelector('.cf-slot-default-offer').hidden=!isFull;
layer.querySelector('.cf-slot-description').textContent=isFull?s.fullMessage:hasSlot?(s.me.purchasePending?'Your 1,000-credit slot purchase has not been confirmed yet. Tap Complete purchase to verify it.':s.me.hasSavedVoice?'Your permanent cloned voice is ready. You can reuse it for cloned calls and voice notes.':'Your permanent voice slot is yours. You can prepare your permanent voice when cloning is enabled on the announced date.'):s.message;
layer.querySelector('.cf-slot-remaining').textContent=`${s.remaining} of ${s.slotLimit}`;
layer.querySelector('.cf-slot-date').textContent=s.eventDate?new Date(s.eventDate+'T12:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'To be announced';
const formatWAT=value=>{if(!value)return '';const d=new Date(value+':00+01:00');return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(d)+' WAT'};
const windowLabel=[s.bookingOpensAt?'Bookings open: '+formatWAT(s.bookingOpensAt):'',s.bookingClosesAt?'Bookings close: '+formatWAT(s.bookingClosesAt):''].filter(Boolean).join(' · ');
const times=layer.querySelector('.cf-slot-window');times.textContent=windowLabel;times.hidden=!windowLabel;
layer.querySelector('.cf-slot-minimum').textContent=`Permanent voice slot price: ${creditNumber(s.purchasePrice||1000)} CallFocus credits (deducted once when purchased). One slot per customer.`;
// Reflect the exact current, unused server wallet, not cumulative payments.
// Booking eligibility is enforced again by the server when Book slot is tapped.
const balance=layer.querySelector('.cf-slot-balance');
const available=Number(s.availableCredits);
if((!hasSlot||s.me?.purchasePending)&&s.availableCredits!==null&&s.availableCredits!==undefined&&Number.isFinite(available)){
 const missing=Math.max(0,Number(s.minimumCredits||0)-available);
 balance.textContent=missing>0?`Your balance is ${creditNumber(available)} credits. Add ${creditNumber(missing)} more to buy a permanent slot.`:`Your balance is ${creditNumber(available)} credits. Buying deducts ${creditNumber(s.purchasePrice||1000)} credits.`;
 balance.hidden=false;
}else{balance.textContent='';balance.hidden=true;}
msg.textContent='';book.hidden=(hasSlot&&!s.me?.purchasePending)||(!hasSlot&&(isFull||!s.enabled||upcoming||ended));book.disabled=pending;book.textContent=s.me?.purchasePending?'Complete purchase':`Buy slot · ${creditNumber(s.purchasePrice||1000)} credits`;
const telegram=layer.querySelector('.cf-slot-telegram');telegram.href=s.telegramUrl||'https://t.me/callfocus';telegram.hidden=!isFull&&!ended&&s.enabled;
if(!s.enabled&&!isFull&&!hasSlot)msg.textContent='Slot booking is currently paused. Watch this page for the next opening.';
else if(upcoming&&!hasSlot)msg.textContent='Bookings are not open yet. Reservations begin at the announced opening time (Nigeria time).';
else if(ended&&!hasSlot&&!isFull)msg.textContent='Bookings have closed for this release. Join our Telegram channel for the next opening.';
if(!force&&!s.popupEnabled)return;
layer.classList.add('open');document.body.classList.add('cf-slot-modal-open');
}
async function book(){if(pending)return;const l=$('cf-slot-layer'),btn=l?.querySelector('.cf-slot-book'),info=l?.querySelector('.cf-slot-response');if(!auth()){info.textContent='Sign in to your CallFocus account and try again.';return}
pending=true;btn.disabled=true;btn.textContent='Confirming your 1,000-credit purchase…';try{const r=await fetch('/api/permanent-slots/book',{method:'POST',headers:{Authorization:'Bearer '+auth()},cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not reserve slot.');current=data;info.textContent=data.chargedCredits>0?'Purchase successful. 1,000 credits were deducted once. Your permanent voice slot is ready for cloning when enabled.':'Your permanent voice slot purchase is confirmed. No additional credits were deducted.';btn.hidden=true;document.dispatchEvent(new Event('cf-permanent-slots-changed'));
 // Refresh only the existing authoritative wallet display. Never calculate a
 // client-side debit or fabricate a local balance after a slot purchase.
 try{const walletRes=await fetch('/api/account/data',{cache:'no-store',headers:{Authorization:'Bearer '+auth()}});const body=await walletRes.json().catch(()=>({}));if(walletRes.ok&&body?.data?.wallet)window.CallFocusCredits?.applyAuthoritativeWallet?.(body.data.wallet)}catch{}}catch(e){info.textContent=e.message;btn.disabled=false;btn.textContent='Buy slot · 1,000 credits';}finally{pending=false}}
async function state(){return current||await load()}
window.CallFocusPermanentSlots={show,load,state,close};
// Start the delay from page readiness, NOT from the completion of the slow
// provider-capacity endpoint. Users see a non-purchasable preview on time if
// real-time availability has not yet arrived. No provider details are exposed.
let handledToken='',busy=false,autoTimer=null,activeToken='',firstSeenAt=0;
const clock=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
function clearAutoTimer(){if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null}}
async function quickConfig(token){
 const r=await fetch('/api/permanent-slots/popup-config',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.ok)throw Error(d.error||'Announcement settings unavailable.');
 return d;
}
function preview(cfg){
 if(autoDismissed||!auth()||!cfg.popupEnabled)return;
 ensure();const layer=$('cf-slot-layer');
 layer.querySelector('#cf-slot-title').textContent=cfg.headline||'Limited permanent voice cloning slots';
 layer.querySelector('.cf-slot-description').textContent=cfg.message||'Permanent voice cloning slots are available in limited releases.';
 layer.querySelector('.cf-slot-default-offer').hidden=true;
 layer.querySelector('.cf-slot-remaining').textContent='Checking availability…';
 layer.querySelector('.cf-slot-date').textContent=cfg.eventDate?new Date(cfg.eventDate+'T12:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'To be announced';
 layer.querySelector('.cf-slot-window').hidden=true;
 layer.querySelector('.cf-slot-minimum').textContent=`Permanent voice slot price: ${creditNumber(cfg.purchasePrice||1000)} CallFocus credits (deducted once when purchased). One slot per customer.`;
 layer.querySelector('.cf-slot-balance').hidden=true;
 layer.querySelector('.cf-slot-response').textContent='Checking your reservation and live availability…';
 layer.querySelector('.cf-slot-book').hidden=true;
 layer.querySelector('.cf-slot-telegram').hidden=true;
 layer.classList.add('open');document.body.classList.add('cf-slot-modal-open');
}
function statusUnavailable(){
 const layer=$('cf-slot-layer');if(layer?.classList.contains('open')&&!autoDismissed){
  layer.querySelector('.cf-slot-response').textContent='Current availability could not be loaded. Please refresh the page to try again.';
 }
}
async function auto(){
 const token=auth();
 if(!token){clearAutoTimer();handledToken='';activeToken='';current=null;close();autoDismissed=false;return}
 if(token!==activeToken){activeToken=token;firstSeenAt=clock();autoDismissed=false;clearAutoTimer();handledToken=''}
 if(busy||handledToken===token)return;
 busy=true;
 try{
  // Begin the slower status read in parallel; catch failures immediately.
  // Never delay popup timing on provider APIs or wallet lookups.
  let fullData=null,fullFailed=false,previewAllowed=false;
  const fullPromise=load().then(v=>{fullData=v;return v}).catch(()=>{fullFailed=true;return null});
  const cfg=await quickConfig(token);
  if(auth()!==token||!cfg.signedIn)return;
  handledToken=token;
  if(!cfg.popupEnabled)return;
  previewAllowed=true;
  const delay=Math.max(0,Math.min(60,Number(cfg.popupDelaySeconds)||0));
  const remainingMs=Math.max(0,delay*1000-(clock()-firstSeenAt));
  clearAutoTimer();
  autoTimer=setTimeout(()=>{
   autoTimer=null;
   if(auth()!==token||autoDismissed||!previewAllowed)return;
   if(fullData){show(false,{...fullData,popupEnabled:true});return}
   preview(cfg);
   if(fullFailed)statusUnavailable();
  },remainingMs);
  fullPromise.then(v=>{
   if(auth()!==token||autoDismissed||!previewAllowed)return;
   const layer=$('cf-slot-layer');
   if(!layer?.classList.contains('open'))return;
   if(v)show(false,{...v,popupEnabled:true});else statusUnavailable();
  });
 }catch(e){if(auth()===token)handledToken=''}
 finally{busy=false}
}
function boot(){ensure();auto();setInterval(auto,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
