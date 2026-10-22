/* CallFocus V16.19: opt-in clone UI. No normal call functions are replaced. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
if(!byId('newCallForm')||byId('cfClonePortal'))return;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice='This call uses an AI voice. Audio and transcripts are recorded and may be shared with ElevenLabs and its third-party AI providers to provide this service.';
const portal=document.createElement('div');portal.id='cfClonePortal';
portal.innerHTML=`
 <div class="cf-clone-overlay" data-clone-dialog="create" hidden>
  <section class="cf-clone-dialog" role="dialog" aria-modal="true" aria-labelledby="cfCloneCreateTitle" tabindex="-1">
   <div class="cf-clone-head"><div><small>YOUR PERSONAL VOICE</small><h2 id="cfCloneCreateTitle">Create your own voice</h2></div><button type="button" class="cf-clone-close" data-clone-close aria-label="Close voice recording">×</button></div>
   <p>Record or upload 30–120 seconds of your own clear speech. Save it once, then choose it for future calls and voice notes.</p>
   <div data-clone-id="status" class="cf-clone-status" role="status">Checking your saved voices…</div>
   <form data-clone-id="cloneForm">
    <label for="cfCloneName">Voice name</label><input id="cfCloneName" data-clone-id="cloneName" type="text" maxlength="60" placeholder="My own voice" required>
    <div class="cf-clone-record"><button type="button" data-clone-id="recordBtn" class="cf-clone-secondary">Record sample</button><small data-clone-id="recTimer">Not recording</small></div>
    <label for="cfCloneSample">Or upload your own recording</label><input id="cfCloneSample" data-clone-id="sample" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/aac,audio/flac,.mp3,.m4a,.wav,.webm,.ogg,.flac" required>
    <label class="cf-clone-consent" for="cfCloneConsent"><input id="cfCloneConsent" data-clone-id="ownVoice" type="checkbox" required><span>This is my own adult voice. I consent to its AI cloning and understand that generated speech must not be presented as a real recording of me.</span></label>
    <p class="cf-clone-small">Your sample is sent privately to the speech provider for cloning. Some voices may require verification before use.</p>
    <button type="submit" data-clone-id="createBtn" class="cf-clone-primary">Save my voice</button>
   </form>
   <details class="cf-clone-saved"><summary>My saved voices <span data-clone-id="voiceLimit">0 / 3</span></summary><div data-clone-id="voices"></div></details>
  </section>
 </div>
 <div class="cf-clone-overlay" data-clone-dialog="live" hidden>
  <section class="cf-clone-dialog cf-clone-live" role="dialog" aria-modal="true" aria-labelledby="cfCloneLiveTitle" tabindex="-1">
   <div class="cf-clone-head"><div><small>LIVE CONVERSATION</small><h2 id="cfCloneLiveTitle">Your live call</h2><p id="cfCloneLiveName"></p></div><button type="button" class="cf-clone-close" data-clone-close aria-label="End and close call">×</button></div>
   <p class="cf-clone-small">${notice}</p>
   <div hidden><select data-clone-id="liveVoice"></select><textarea data-clone-id="liveContext"></textarea><button type="button" data-clone-id="startLive">Start live voice</button></div>
   <div class="cf-clone-live-clock" data-clone-id="liveClock">00:00</div>
   <div class="cf-clone-meter"><i data-clone-id="liveMeter"></i></div>
   <p data-clone-id="liveStatus" class="cf-clone-status" role="status">Preparing your call…</p>
   <div data-clone-id="liveTranscript" class="cf-clone-transcript" role="log" aria-live="polite"></div>
   <button type="button" data-clone-id="endLive" class="cf-clone-end" disabled>End call</button>
   <p class="cf-clone-small">Cloned-voice test calls are limited to 60 seconds and use your existing CallFocus credits.</p>
  </section>
 </div>`;
document.body.append(portal);
let access={enabled:false,liveReady:false,voices:[]},newVoice='',createScope='new',createThread='',activeCall=null,startingCall=false;
let openDialog=null,returnFocus=null,previousOverflow='',lastToken='',queued=false,lastVoiceSignature='';
const repeatChoices=new Map();
const thread=id=>typeof data!=='undefined'?data?.threads?.find(t=>t.id===id):null;
const currentThreadId=()=>document.querySelector('[data-repeat-call]')?.dataset.repeatCall||'';
const studio=()=>window.CallFocusCloneStudio;
const voice=id=>access.voices.find(v=>v.id===id&&!v.verificationRequired);
const alertUser=message=>{if(typeof toast==='function')toast(message);else portal.querySelector('[data-clone-id="status"]').textContent=message;};
function setDialog(name){
 if(!openDialog){returnFocus=document.activeElement;previousOverflow=document.body.style.overflow;}
 for(const el of portal.querySelectorAll('[data-clone-dialog]'))el.hidden=el.dataset.cloneDialog!==name;
 openDialog=name;document.body.style.overflow='hidden';
 portal.querySelector(`[data-clone-dialog="${name}"] .cf-clone-dialog`).focus();
}
async function closeDialog(){
 if(openDialog==='live'){studio()?.endCall('Call ended.');}
 else studio()?.stopRecording();
 for(const el of portal.querySelectorAll('[data-clone-dialog]'))el.hidden=true;
 openDialog=null;document.body.style.overflow=previousOverflow;returnFocus?.focus?.();
}
function updateSelect(select,value){
 const signature=JSON.stringify(access.voices.map(v=>[v.id,v.name,v.verificationRequired]));
 if(select.dataset.cloneOptions!==signature){
  const option=document.createElement('option');option.value='';option.textContent='Use normal voice';select.replaceChildren(option);
  for(const v of access.voices){const o=document.createElement('option');o.value=v.id;o.textContent=v.name+(v.verificationRequired?' · verification needed':'');o.disabled=!!v.verificationRequired;select.append(o);}
  select.dataset.cloneOptions=signature;
 }
 select.value=voice(value)?value:'';
}
function panel(scope,id){
 let root=byId(id);if(root)return root;
 root=document.createElement('section');root.id=id;root.className='cf-clone-picker';root.dataset.cloneScope=scope;
 root.innerHTML=`<div class="cf-clone-picker-head"><div><strong>Clone your voice</strong><p>Record or upload your own voice, save it, and use it again.</p></div><button type="button" class="cf-clone-secondary" data-clone-create="${scope}">+ Create your own voice</button></div><label for="${id}Select">My saved cloned voice</label><select id="${id}Select" data-clone-select="${scope}"><option value="">Use normal voice</option></select><p class="cf-clone-choice" aria-live="polite"></p><p class="cf-clone-notice">${notice}</p>`;
 return root;
}
function updatePanel(root,value){
 root.hidden=!access.enabled;root.classList.toggle('cf-clone-selected',!!voice(value));
 updateSelect(root.querySelector('select'),value);
 const choice=root.querySelector('.cf-clone-choice');const text=voice(value)?`Selected: ${voice(value).name}. Choose Male, Female or a voice style to switch back.`:'Your saved voices stay available here for your next call.';
 if(choice.textContent!==text)choice.textContent=text;
}
function ensureUI(){
 const home=byId('heroCloneVoiceBtn');if(home)home.hidden=!access.enabled;
 const anchor=document.querySelector('#newCallModal .voice-choice');
 if(anchor){const root=panel('new','cfNewCallClonePicker');if(!root.isConnected)anchor.insertAdjacentElement('afterend',root);updatePanel(root,newVoice);}
 const repeatButton=document.querySelector('[data-repeat-call]');
 if(repeatButton){
  const id=repeatButton.dataset.repeatCall;
  if(!repeatChoices.has(id))repeatChoices.set(id,thread(id)?.voiceCloneId||'');
  const root=panel('repeat','cfRepeatClonePicker');root.dataset.cloneThread=id;
  if(!root.isConnected)repeatButton.insertAdjacentElement('beforebegin',root);
  updatePanel(root,repeatChoices.get(id));
 }
 let note=byId('cfVoiceNoteCloneSection');const row=document.querySelector('.voice-note-gender-row');
 if(!note&&row){note=document.createElement('section');note.id='cfVoiceNoteCloneSection';note.innerHTML='<label for="cfVoiceNoteClone">My saved cloned voice</label><select id="cfVoiceNoteClone"><option value="">Use normal male / female voice</option></select>';row.insertAdjacentElement('afterend',note);}
 if(note&&row){
  if(!note.dataset.cloneIntegrated){
   note.dataset.cloneIntegrated='1';note.classList.add('cf-clone-picker');note.dataset.cloneScope='note';
   const label=note.querySelector('label');if(label)label.textContent='My saved cloned voice';
   const head=document.createElement('div');head.className='cf-clone-picker-head';head.innerHTML='<div><strong>Clone your voice</strong><p>Save your own voice for calls and voice notes.</p></div><button type="button" class="cf-clone-secondary" data-clone-create="note">+ Create your own voice</button>';note.prepend(head);
   const oldLink=note.querySelector('a[href="/voice-clone"]');if(oldLink)oldLink.closest('p')?.remove();
   const help=document.createElement('p');help.className='cf-clone-small';help.textContent='Select a saved voice here, or choose Male, Female or a voice style above.';note.append(help);
   row.insertAdjacentElement('afterend',note);
  }
  note.hidden=!access.enabled;note.classList.toggle('hidden',!access.enabled);
  const select=byId('cfVoiceNoteClone');updateSelect(select,select.value);
 }
}
function scheduleUI(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;ensureUI();});}
function selectClone(scope,id,threadId=''){
 if(id&&!voice(id))return;
 if(scope==='note'){const select=byId('cfVoiceNoteClone');if(select)select.value=id;}
 else if(scope==='repeat')repeatChoices.set(threadId||currentThreadId(),id);
 else newVoice=id;
 ensureUI();
}
function clearRepeatChoice(id){
 repeatChoices.set(id,'');const t=thread(id);
 if(t?.voiceCloneId){t.voiceCloneId='';t.voiceCloneName='';if(typeof saveData==='function')saveData();}
}
function openCreate(scope='new',threadId=''){
 if(!access.enabled)return;
 if(studio()?.getState().creating)return alertUser('Please wait for your voice to finish saving.');
 if(studio()?.getState().active||studio()?.getState().starting)return alertUser('End your current call before creating a voice.');
 createScope=scope;createThread=threadId;setDialog('create');
}
function callFacts(call){
 const t=thread(call.threadId);
 return JSON.stringify({title:call.title,personBeingCalled:call.callerName,aboutCallerA:call.aboutSelf,aboutCallerB:call.aboutCaller,relationship:call.dynamicsMode,relationshipDetails:call.rawDynamics,topic:call.topic,callerA:call.callerA,callerB:call.callerB,callLanguage:call.callLanguage,previousCalls:(t?.calls||[]).slice(-8).map(c=>({topic:c.topic,createdAt:c.createdAt,spokenOutput:c.assistantTranscript||''}))}).slice(0,22000);
}
function normalCallActive(){return typeof live!=='undefined'&&!!live?.current&&!byId('callScreen')?.classList.contains('hidden');}
async function beginClonedCall(prepare,selectedId){
 if(startingCall||studio()?.getState().active)return;
 if(normalCallActive())return alertUser('End your current call before starting another.');
 if(!access.liveReady||!voice(selectedId))return alertUser('Select an available saved voice first.');
 startingCall=true;
 try{
  const result=prepare();if(result?.error)return alertUser(result.error);if(!result?.call)return;
  const call=result.call;call.voiceCloneId=selectedId;call.voiceCloneName=voice(selectedId).name;
  // A clone supplies the sound. An unrelated saved OpenAI voice style is not applied to it.
  call.voiceProfile=null;call.voiceProfileId='';
  const t=thread(call.threadId);if(t){t.voiceCloneId=selectedId;t.voiceCloneName=call.voiceCloneName;saveData();}
  activeCall={call,ownerId:typeof account!=='undefined'?account?.id:'',saved:false};
  byId('cfCloneLiveName').textContent=[call.callerName,call.voiceCloneName].filter(Boolean).join(' · ');
  setDialog('live');
  const payload={voiceId:selectedId,context:callFacts(call),callLanguage:call.callLanguage||'English'};
  const started=await studio().startCall(payload);
  if(!started)activeCall=null;
 }catch{activeCall=null;alertUser('Could not start this call. Please try again.');}
 finally{startingCall=false;}
}
document.addEventListener('reset',e=>{if(e.target===byId('newCallForm')){newVoice='';scheduleUI();}},true);
// Capture only explicit clone selections. Every other submit/click reaches the existing handlers.
document.addEventListener('submit',e=>{
 if(e.target!==byId('newCallForm')||!newVoice||!access.enabled)return;
 e.preventDefault();e.stopImmediatePropagation();beginClonedCall(()=>prepareNewCall(),newVoice);
},true);
document.addEventListener('click',e=>{
 const target=e.target.closest?.('button,a');if(!target)return;
 const repeat=target.closest('[data-repeat-call]');
 if(repeat){const id=repeat.dataset.repeatCall;const selected=repeatChoices.has(id)?repeatChoices.get(id):thread(id)?.voiceCloneId;
  if(selected&&access.enabled){e.preventDefault();e.stopImmediatePropagation();beginClonedCall(()=>prepareRepeatCall(id),selected);}return;
 }
 if(['heroNewCallBtn','customerNewCallBtn','bottomNewCallBtn'].includes(target.id)){newVoice='';scheduleUI();}
 const normal=target.closest('.voice-option'),note=target.closest('[data-vn-gender]'),style=target.closest('[data-ai-select]');
 if(normal&&byId('newCallModal').contains(normal))selectClone('new','');
 if(note)selectClone('note','');
 if(style){const scope=style.closest('[data-ai-scope]')?.dataset.aiScope;if(scope==='repeat'){clearRepeatChoice(currentThreadId());ensureUI();}else selectClone(scope,'');}
},true);
document.addEventListener('click',e=>{
 if(e.target.closest?.('#heroCloneVoiceBtn'))return openCreate('home');
 const create=e.target.closest?.('[data-clone-create]');if(create)return openCreate(create.dataset.cloneCreate,create.closest('[data-clone-thread]')?.dataset.cloneThread||'');
 if(e.target.closest?.('[data-clone-close]'))closeDialog();
});
document.addEventListener('change',e=>{
 const select=e.target.closest?.('[data-clone-select]');if(select)selectClone(select.dataset.cloneSelect,select.value,select.closest('[data-clone-thread]')?.dataset.cloneThread||'');
 if(e.target.id==='repeatVoiceGender'){clearRepeatChoice(currentThreadId());ensureUI();}
});
portal.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDialog();return;}
 if(e.key!=='Tab'||!openDialog)return;
 const dialog=portal.querySelector(`[data-clone-dialog="${openDialog}"]`);
 const focusable=[...dialog.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')].filter(x=>!x.disabled&&!x.closest('[hidden]'));
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.querySelector('.cf-clone-dialog'))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
window.addEventListener('callfocus:clone-voices',e=>{
 access=e.detail;const signature=JSON.stringify(access.voices.map(v=>[v.id,v.name,v.verificationRequired]));
 if(signature!==lastVoiceSignature){lastVoiceSignature=signature;if(!voice(newVoice))newVoice='';}
 if(!access.enabled){newVoice='';repeatChoices.clear();const note=byId('cfVoiceNoteClone');if(note)note.value='';}
 ensureUI();
});
window.addEventListener('callfocus:clone-saved',async e=>{
 const v=e.detail?.voice;if(!v||v.verificationRequired||!voice(v.id))return;
 const scope=createScope,id=createThread;await closeDialog();
 if(scope==='home'){openNewCall();selectClone('new',v.id);}
 else selectClone(scope,v.id,id);
 alertUser('Voice saved. You can select it again next time.');
});
window.addEventListener('callfocus:clone-ended',e=>{
 const report=e.detail,current=activeCall;activeCall=null;
 if(current&&!current.saved&&report.connected&&typeof account!=='undefined'&&account?.id===current.ownerId){
  current.saved=true;const call=current.call,t=thread(call.threadId);
  if(t){t.calls||=[];if(!t.calls.some(c=>c.id===report.sessionId)){t.calls.push({id:report.sessionId,topic:call.topic,createdAt:new Date().toISOString(),duration:typeof fmtDuration==='function'?fmtDuration(report.elapsed):String(report.elapsed),callLanguage:call.callLanguage||'English',voiceGender:call.voiceGender,voiceCloneId:call.voiceCloneId,voiceName:call.voiceCloneName,openingMode:call.openingMode||'auto',openingCustom:call.openingCustom||'',callerA:call.callerA,callerB:call.callerB,assistantTranscript:String(report.transcript||'').trim().slice(0,6000),connected:true});t.updatedAt=new Date().toISOString();saveData();}}
 }
 const clock=portal.querySelector('[data-clone-id="liveClock"]');clock.textContent=String(Math.floor(report.elapsed/60)).padStart(2,'0')+':'+String(report.elapsed%60).padStart(2,'0');
 window.CallFocusPaystack?.refreshWallet?.({quiet:true});
});
new MutationObserver(scheduleUI).observe(document.body,{childList:true,subtree:true});
// Sign-in on the same page does not fire the browser's storage event.
function checkAccount(){
 let next='';try{next=localStorage.getItem('callfocus_server_session_v1')||'';}catch{}
 if(next===lastToken)return;lastToken=next;
 if(studio()?.getState().active||studio()?.getState().starting)studio().endCall('Account changed. Call ended.');
 newVoice='';repeatChoices.clear();studio()?.refresh();
}
try{lastToken=localStorage.getItem('callfocus_server_session_v1')||'';}catch{}
setInterval(checkAccount,1500);window.addEventListener('storage',checkAccount);
ensureUI();
})();
