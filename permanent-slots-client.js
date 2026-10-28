/* Standalone CallFocus slot popup. No OpenAI call files are imported or modified. */
(()=>{'use strict';
const auth=()=>localStorage.getItem('callfocus_server_session_v1')||'';
let current=null,shown='',pending=false;
const $=id=>document.getElementById(id);
const money=n=>'₦'+Number(n||0).toLocaleString('en-NG');
async function load(){const r=await fetch('/api/permanent-slots/status',{cache:'no-store',headers:auth()?{Authorization:'Bearer '+auth()}:{}}),v=await r.json();if(!r.ok)throw Error(v.error||'Booking status unavailable.');current=v;return v}
function ensure(){if($('cf-slot-layer'))return;const layer=document.createElement('div');layer.id='cf-slot-layer';layer.className='cf-slot-layer';layer.innerHTML=`<section class="cf-slot-popup" role="dialog" aria-modal="true" aria-labelledby="cf-slot-title"><button type="button" class="cf-slot-close" aria-label="Close">×</button><small class="cf-slot-eyebrow">CALLFOCUS · LIMITED RELEASE</small><h2 id="cf-slot-title"></h2><p class="cf-slot-description"></p><div class="cf-slot-stats"><div><small>Slots remaining</small><strong class="cf-slot-remaining"></strong></div><div><small>Voice cloning date</small><strong class="cf-slot-date"></strong></div></div><p class="cf-slot-minimum"></p><p class="cf-slot-response" role="status" aria-live="polite"></p><button class="cf-slot-book" type="button">Book slot</button><a class="cf-slot-telegram" target="_blank" rel="noopener noreferrer">Join our Telegram channel</a></section>`;document.body.append(layer);
layer.querySelector('.cf-slot-close').onclick=close;layer.addEventListener('click',e=>{if(e.target===layer)close()});layer.querySelector('.cf-slot-book').onclick=book;window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}
function close(){const layer=$('cf-slot-layer');layer?.classList.remove('open');document.body.classList.remove('cf-slot-modal-open')}
async function show(force=false){ensure();let s;try{s=await load()}catch(e){if(force){$('cf-slot-layer').classList.add('open');$('cf-slot-layer').querySelector('.cf-slot-description').textContent=e.message}return}
const layer=$('cf-slot-layer'),book=layer.querySelector('.cf-slot-book'),msg=layer.querySelector('.cf-slot-response'),isFull=s.full&&!s.me,hasSlot=!!s.me;
layer.querySelector('#cf-slot-title').textContent=isFull?'All voice cloning slots are filled':s.headline;
layer.querySelector('.cf-slot-description').textContent=isFull?s.fullMessage:hasSlot?(s.me.hasSavedVoice?'Your permanent cloned voice is ready. You can reuse it for cloned calls and voice notes.':'Your slot is reserved. You can prepare your permanent voice when cloning is enabled on the announced date.'):s.message;
layer.querySelector('.cf-slot-remaining').textContent=`${s.remaining} of ${s.slotLimit}`;
layer.querySelector('.cf-slot-date').textContent=s.eventDate?new Date(s.eventDate+'T12:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'To be announced';
layer.querySelector('.cf-slot-minimum').textContent=`Minimum confirmed account funding: ${money(s.minimumFundingNaira)}. One permanent voice per customer.`;
msg.textContent='';book.hidden=hasSlot||isFull||!s.enabled;book.disabled=pending;book.textContent='Book slot';
const telegram=layer.querySelector('.cf-slot-telegram');telegram.href=s.telegramUrl||'https://t.me/callfocus';telegram.hidden=!isFull&&s.enabled;
if(!s.enabled&&!isFull&&!hasSlot)msg.textContent='Slot booking is currently closed. Watch this page for the next opening.';
if(!s.signedIn&&!isFull&&s.enabled)msg.textContent='Sign in to your CallFocus account to book.';
if(!force&&!s.popupEnabled)return;
layer.classList.add('open');document.body.classList.add('cf-slot-modal-open');shown=''+s.revision;
}
async function book(){if(pending)return;const l=$('cf-slot-layer'),btn=l?.querySelector('.cf-slot-book'),info=l?.querySelector('.cf-slot-response');if(!auth()){info.textContent='Sign in to your CallFocus account and try again.';return}
pending=true;btn.disabled=true;btn.textContent='Reserving your slot…';try{const r=await fetch('/api/permanent-slots/book',{method:'POST',headers:{Authorization:'Bearer '+auth()},cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not reserve slot.');current=data;info.textContent='Your permanent voice slot is reserved for your account. Open Clone your voice to prepare your saved voice when it becomes available.';btn.hidden=true;document.dispatchEvent(new Event('cf-permanent-slots-changed'));}catch(e){info.textContent=e.message;btn.disabled=false;btn.textContent='Book slot';}finally{pending=false}}
async function state(){return current||await load()}
window.CallFocusPermanentSlots={show,load,state,close};
let firstToken='';async function auto(){const t=auth();if(!t){firstToken='';return}if(t!==firstToken){firstToken=t;try{const s=await load();const key='cf-slot-popup-seen:'+s.revision;if(s.popupEnabled&&!s.me&&!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');show(true)}}catch{}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensure();auto();setInterval(auto,4500)});else{ensure();auto();setInterval(auto,4500)}
})();
