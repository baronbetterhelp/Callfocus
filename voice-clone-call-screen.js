/* CallFocus V16.20: cloned calls use the existing caller screen. Normal calls keep their original handlers. */
(()=>{'use strict';
const byId=id=>document.getElementById(id),screen=byId('callScreen');if(!screen)return;
const studio=()=>window.CallFocusCloneStudio;
let current=null,tick=null,turns=[],turnNumber=0;
const text=(id,value)=>{const el=byId(id);if(el&&el.textContent!==String(value))el.textContent=String(value);};
const tell=message=>{if(typeof toast==='function')toast(message);else text('liveCaption',message);};
const duration=seconds=>typeof fmtDuration==='function'?fmtDuration(seconds):String(seconds);
const connected=()=>!!current&&studio()?.getState().ready;
function setButton(id,on){const b=byId(id);b?.classList.toggle('active',!!on);b?.setAttribute('aria-pressed',String(!!on));}
function controls(){
 if(!current)return;const s=studio()?.getState()||{},ready=!!s.ready&&!s.graceful&&current.phase!=='ending';
 for(const id of ['muteBtn','speakerBtn','holdBtn','requestEndBtn'])if(byId(id))byId(id).disabled=!ready;
 for(const id of ['cfRedirectNaturalBtn','cfInterruptNowBtn'])if(byId(id))byId(id).disabled=!ready||!!s.held;
 byId('cfRedirectControls')?.classList.toggle('hidden',!s.ready||!!s.held||!!s.graceful);
 setButton('muteBtn',s.muted);setButton('speakerBtn',s.speakerOn!==false);setButton('holdBtn',s.held);
 byId('liveStartCallBtn')?.classList.add('hidden');
}
function creditLabel(s){
 if(s.unlimited)return 'Unlimited';
 if(!Number.isFinite(s.remainingSeconds))return byId('liveCreditBalance')?.textContent||'Checking credit…';
 const seconds=Math.max(0,s.remainingSeconds),credits=seconds/0.6;
 return `${Math.round(credits*10)/10} credits · ${duration(seconds)}`;
}
function update(){
 if(!current)return;const s=studio()?.getState()||{};
 if(current.phase!=='failed'){
  text('liveStatus',s.graceful?'Wrapping up':s.held?'On hold':s.ready?'Connected':current.phase==='ending'?'Ending call…':s.starting||s.active?'Connecting…':'Preparing call…');
  if(s.ready){current.connected=true;current.phase='connected';text('callTimer',duration(s.elapsed));text('activeCallTime',duration(s.elapsed));}
 }
 text('liveCreditBalance',creditLabel(s));text('callMoreCredit',creditLabel(s));
 controls();
}
function closeTranscript(){if(byId('moreBtn')?.getAttribute('aria-expanded')==='true')byId('moreBtn').click();byId('callMorePanel')?.classList.add('hidden');}
function clearView(){
 clearInterval(tick);tick=null;closeTranscript();screen.classList.add('hidden');screen.classList.remove('awaiting-start');
 byId('activeCallBar')?.classList.add('hidden');byId('callFailureActions')?.classList.add('hidden');
 byId('cfRedirectControls')?.classList.add('hidden');delete screen.dataset.cloneCall;
 for(const id of ['muteBtn','speakerBtn','holdBtn','requestEndBtn','cfRedirectNaturalBtn','cfInterruptNowBtn'])if(byId(id))byId(id).disabled=false;
 text('liveCaption','Call ended.');document.body.style.overflow='';current=null;
}
function show(call){
 clearInterval(tick);closeTranscript();
 current={call,phase:'connecting',connected:false,sessionId:'',minimized:false};turns=[];turnNumber=0;
 if(typeof closeModal==='function')closeModal('newCallModal');
 screen.dataset.cloneCall='active';screen.classList.remove('hidden','awaiting-start');byId('activeCallBar')?.classList.add('hidden');
 byId('callFailureActions')?.classList.add('hidden');byId('liveTranscript')?.classList.remove('error-visible');
 document.body.style.overflow='hidden';text('liveCallerName',call.callerName||'Caller');
 text('liveAvatar',typeof initials==='function'?initials(call.callerName||'Caller'):'C');
 text('liveRegion',[call.callerB?.region,call.callerB?.timezone].filter(Boolean).join(' · '));
 text('liveStatus','Connecting…');text('liveCaption','Connecting your saved voice…');text('liveTranscript','');text('callTimer','00:00');
 text('activeCallName',call.callerName||'Call');text('activeCallTime','00:00');
 text('callMoreTitle',call.title||call.callerName||'Call');text('callMoreTopic',call.topic||'No new topic supplied');text('callMoreConnection','Connecting');
 const list=byId('cfLiveTranslationList');if(list)list.replaceChildren();
 text('cfLiveTranslationStatus',(call.callLanguage||'English')==='English'?'English · live transcript':`${call.callLanguage} → English · live translation`);
 tick=setInterval(update,250);update();
}
function failed(message){
 if(!current)return;current.phase='failed';current.failure=message||'Could not connect this call. Please try again.';
 text('liveStatus','Call not connected');text('liveCaption',current.failure);text('liveTranscript',current.failure);
 byId('liveTranscript')?.classList.add('error-visible');byId('callFailureActions')?.classList.remove('hidden');text('callMoreConnection','Not connected');controls();
}
function minimize(){if(!current)return;current.minimized=true;screen.classList.add('hidden');byId('activeCallBar')?.classList.remove('hidden');document.body.style.overflow='';}
function restore(){if(!current)return;current.minimized=false;screen.classList.remove('hidden');byId('activeCallBar')?.classList.add('hidden');document.body.style.overflow='hidden';update();}
async function endNow(){
 if(!current)return;if(!studio()?.getState().active&&!studio()?.getState().starting){clearView();return;}
 current.phase='ending';screen.classList.add('hidden');byId('activeCallBar')?.classList.add('hidden');document.body.style.overflow='';
 await studio().endCall('Call ended.');
 if(current&&current.phase==='ending'&&!studio().getState().active)clearView();
}
async function retry(){
 if(!current||current.phase!=='failed'||studio()?.getState().active||studio()?.getState().starting)return;
 const call=current.call;show(call);window.dispatchEvent(new CustomEvent('callfocus:clone-retry',{detail:{call}}));
 const started=await studio().startCall(current.payload||{voiceId:call.voiceCloneId,context:call.cloneContext||'',callLanguage:call.callLanguage||'English'});
 if(!started){failed(studio().getState().status);window.dispatchEvent(new CustomEvent('callfocus:clone-start-failed'));}
}
function backToSetup(){
 if(!current)return;const call=current.call;clearView();
 if(call.threadId&&typeof showView==='function'&&typeof selectThread==='function'){
  showView('recent');selectThread(call.threadId);
  if(byId('repeatTopic'))byId('repeatTopic').value=call.topic||'';
 }else if(typeof openModal==='function')openModal('newCallModal');
}
function renderTurn(turn){
 if(!current||turn.owner!==current)return;const list=byId('cfLiveTranslationList');if(!list)return;
 let row=Array.from(list.children).find(el=>el.dataset.cloneTurn===String(turn.id));
 if(!row){row=document.createElement('div');row.className='cf-live-translation-turn';row.dataset.cloneTurn=String(turn.id);row.dataset.role=turn.role==='agent'?'live':'remote';
  const speaker=document.createElement('div');speaker.className='cf-live-translation-speaker';
  const bubble=document.createElement('div');bubble.className='cf-live-translation-bubble';bubble.append(document.createElement('p'),document.createElement('small'));row.append(speaker,bubble);list.append(row);
 }
 row.querySelector('.cf-live-translation-speaker').textContent=turn.role==='agent'?'Live Caller':current.call.callerName||'Caller';
 row.querySelector('p').textContent=turn.translation||turn.text;
 row.querySelector('small').textContent=turn.translating?'Translating…':turn.translation?'Translated to English':turn.error?'Original transcript':'Live';
 if(list.children.length>80)list.firstElementChild?.remove();list.scrollTop=list.scrollHeight;
}
window.addEventListener('callfocus:clone-transcript',async e=>{
 if(!current||!e.detail?.text||e.detail.sessionId!==studio()?.getState().sessionId)return;
 const d=e.detail,key=d.eventId==null?null:`${d.role}:${d.eventId}`;
 let turn=key?turns.find(t=>t.key===key):null;
 if(!turn){turn={id:++turnNumber,key,owner:current,role:d.role,text:d.text};turns.push(turn);}else turn.text=d.text;
 renderTurn(turn);text('liveCaption',d.role==='agent'?d.text:`Heard: ${d.text}`);
 if((current.call.callLanguage||'English')==='English')return;
 turn.translating=true;renderTurn(turn);
 try{
  const token=localStorage.getItem('callfocus_server_session_v1')||'';
  const response=await fetch('/api/live-translate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},cache:'no-store',body:JSON.stringify({text:turn.text,sourceLanguage:current.call.callLanguage,speaker:d.role==='agent'?'Live Caller':current.call.callerName,callUsageId:''})});
  const data=await response.json();if(!response.ok)throw Error();turn.translation=String(data.translation||turn.text);
 }catch{turn.error=true;}finally{turn.translating=false;renderTurn(turn);}
});
window.addEventListener('callfocus:clone-started',e=>{if(!current)return;current.sessionId=e.detail.sessionId;current.connected=true;text('liveCaption','Call started.');text('callMoreConnection','Connected');update();});
window.addEventListener('callfocus:clone-usage',e=>{
 if(!current)return;if(e.detail.wallet&&typeof account!=='undefined'&&account?.id===current.call.cloneOwnerId)window.CallFocusCredits?.applyAuthoritativeWallet?.(e.detail.wallet);update();
});
window.addEventListener('callfocus:clone-controls',update);
window.addEventListener('callfocus:clone-ended',e=>{
 if(!current)return;const report=e.detail;
 if(!report.connected&&current.phase!=='ending'){failed(report.reason);return;}
 const reason=report.reason;clearView();if(typeof renderWorkspace==='function')renderWorkspace();
 if(reason&&!['Call ended.','Call ended naturally.'].includes(reason))tell(reason);
});
document.addEventListener('click',e=>{
 if(!current||screen.dataset.cloneCall!=='active')return;const target=e.target.closest?.('button');if(!target)return;
 const id=target.id;
 if(id==='moreBtn'||id==='cfLiveTranslationClose')return; // Existing transcript toggle and dragging keep working.
 const known=['muteBtn','speakerBtn','holdBtn','requestEndBtn','endCallBtn','activeCallEndBtn','callMinimizeBtn','restoreCallBtn','callRetryBtn','callBackSetupBtn','liveStartCallBtn','cfRedirectNaturalBtn','cfInterruptNowBtn'];
 if(!known.includes(id))return;e.preventDefault();e.stopImmediatePropagation();
 const s=studio()?.getState()||{};
 if(id==='callMinimizeBtn')return minimize();if(id==='restoreCallBtn')return restore();
 if(id==='endCallBtn'||id==='activeCallEndBtn')return void endNow();if(id==='callRetryBtn')return void retry();if(id==='callBackSetupBtn')return backToSetup();
 if(!connected())return tell('The call is not connected yet.');
 if(id==='muteBtn')studio().setAudioControls({muted:!s.muted});
 if(id==='speakerBtn')studio().setAudioControls({speakerOn:!s.speakerOn});
 if(id==='holdBtn')studio().setAudioControls({held:!s.held});
 if(id==='requestEndBtn')studio().callControl('end');
 if(id==='cfRedirectNaturalBtn')studio().callControl('continue');
 if(id==='cfInterruptNowBtn')studio().callControl('purpose',{topic:current.call.topic});
 update();
},true);
window.CallFocusCloneCaller={show,failed,getState:()=>({active:!!current,phase:current?.phase||'',call:current?.call||null})};
})();
