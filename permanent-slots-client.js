/* Standalone CallFocus slot popup. No OpenAI call files are imported or modified. */
(()=>{'use strict';
const auth=()=>{try{return localStorage.getItem('callfocus_server_session_v1')||''}catch{return ''}};
let current=null,pending=false;
const $=id=>document.getElementById(id);
const creditNumber=n=>Number(n||0).toLocaleString('en-NG');
async function load(){if(!auth())throw Error('Sign in to see the limited voice-cloning slots.');const r=await fetch('/api/permanent-slots/status',{cache:'no-store',headers:auth()?{Authorization:'Bearer '+auth()}:{}}),v=await r.json();if(!r.ok)throw Error(v.error||'Booking status unavailable.');current=v;return v}
function ensure(){if($('cf-slot-layer'))return;const layer=document.createElement('div');layer.id='cf-slot-layer';layer.className='cf-slot-layer';layer.innerHTML=`<section class="cf-slot-popup" role="dialog" aria-modal="true" aria-labelledby="cf-slot-title"><button type="button" class="cf-slot-close" aria-label="Close">×</button><small class="cf-slot-eyebrow">CALLFOCUS · LIMITED RELEASE</small><h2 id="cf-slot-title"></h2><p class="cf-slot-description"></p><div class="cf-slot-stats"><div><small>Slots remaining</small><strong class="cf-slot-remaining"></strong></div><div><small>Voice cloning date</small><strong class="cf-slot-date"></strong></div></div><p class="cf-slot-window"></p><p class="cf-slot-minimum"></p><p class="cf-slot-response" role="status" aria-live="polite"></p><button class="cf-slot-book" type="button">Book slot</button><a class="cf-slot-telegram" target="_blank" rel="noopener noreferrer">Join our Telegram channel</a></section>`;document.body.append(layer);
layer.querySelector('.cf-slot-close').onclick=close;layer.addEventListener('click',e=>{if(e.target===layer)close()});layer.querySelector('.cf-slot-book').onclick=book;window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}
function close(){const layer=$('cf-slot-layer');layer?.classList.remove('open');document.body.classList.remove('cf-slot-modal-open')}
async function show(force=false,provided=null){if(!auth()){close();if(force)window.showAuth?.('signin',null,'Sign in to view voice-cloning slots.');return;}ensure();let s;try{s=provided||await load()}catch(e){if(force&&auth())window.toast?.(e.message);return}if(!s.signedIn||!auth()){close();return}
const layer=$('cf-slot-layer'),book=layer.querySelector('.cf-slot-book'),msg=layer.querySelector('.cf-slot-response'),isFull=s.full&&!s.me,hasSlot=!!s.me,phase=s.bookingPhase||'open',upcoming=phase==='upcoming',ended=phase==='ended';
layer.querySelector('#cf-slot-title').textContent=isFull?'All voice cloning slots are filled':s.headline;
layer.querySelector('.cf-slot-description').textContent=isFull?s.fullMessage:hasSlot?(s.me.hasSavedVoice?'Your permanent cloned voice is ready. You can reuse it for cloned calls and voice notes.':'Your slot is reserved. You can prepare your permanent voice when cloning is enabled on the announced date.'):s.message;
layer.querySelector('.cf-slot-remaining').textContent=`${s.remaining} of ${s.slotLimit}`;
layer.querySelector('.cf-slot-date').textContent=s.eventDate?new Date(s.eventDate+'T12:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'To be announced';
const formatWAT=value=>{if(!value)return '';const d=new Date(value+':00+01:00');return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(d)+' WAT'};
const windowLabel=[s.bookingOpensAt?'Bookings open: '+formatWAT(s.bookingOpensAt):'',s.bookingClosesAt?'Bookings close: '+formatWAT(s.bookingClosesAt):''].filter(Boolean).join(' · ');
const times=layer.querySelector('.cf-slot-window');times.textContent=windowLabel;times.hidden=!windowLabel;
layer.querySelector('.cf-slot-minimum').textContent=`Minimum available balance: ${creditNumber(s.minimumCredits)} CallFocus credits. One permanent voice per customer.`;
msg.textContent='';book.hidden=hasSlot||isFull||!s.enabled||upcoming||ended;book.disabled=pending;book.textContent='Book slot';
const telegram=layer.querySelector('.cf-slot-telegram');telegram.href=s.telegramUrl||'https://t.me/callfocus';telegram.hidden=!isFull&&!ended&&s.enabled;
if(!s.enabled&&!isFull&&!hasSlot)msg.textContent='Slot booking is currently paused. Watch this page for the next opening.';
else if(upcoming&&!hasSlot)msg.textContent='Bookings are not open yet. Reservations begin at the announced opening time (Nigeria time).';
else if(ended&&!hasSlot&&!isFull)msg.textContent='Bookings have closed for this release. Join our Telegram channel for the next opening.';
if(!force&&!s.popupEnabled)return;
layer.classList.add('open');document.body.classList.add('cf-slot-modal-open');
}
async function book(){if(pending)return;const l=$('cf-slot-layer'),btn=l?.querySelector('.cf-slot-book'),info=l?.querySelector('.cf-slot-response');if(!auth()){info.textContent='Sign in to your CallFocus account and try again.';return}
pending=true;btn.disabled=true;btn.textContent='Reserving your slot…';try{const r=await fetch('/api/permanent-slots/book',{method:'POST',headers:{Authorization:'Bearer '+auth()},cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not reserve slot.');current=data;info.textContent='Your permanent voice slot is reserved for your account. Open Clone your voice to prepare your saved voice when it becomes available.';btn.hidden=true;document.dispatchEvent(new Event('cf-permanent-slots-changed'));}catch(e){info.textContent=e.message;btn.disabled=false;btn.textContent='Book slot';}finally{pending=false}}
async function state(){return current||await load()}
window.CallFocusPermanentSlots={show,load,state,close};
// Auto-open once per signed-in customer per actual page load, including refresh.
// A successful sign-in on this same page is picked up without changing the auth engine.
// Closing the popup never writes a dismissal preference, so refresh opens it again.
let handledToken='',busy=false;
async function auto(){
 const token=auth();
 if(!token){handledToken='';current=null;close();return}
 if(busy||handledToken===token)return;
 busy=true;
 try{
  const data=await load();
  if(auth()!==token||!data.signedIn)return;
  handledToken=token;
  if(data.popupEnabled)await show(false,data);
 }catch(e){if(auth()!==token)handledToken=''}
 finally{busy=false}
}
function boot(){ensure();auto();setInterval(auto,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
