const STORE={callers:'ca_callers_v1',profile:'ca_profile_v1',admin:'ca_admin_v1',history:'ca_history_v1'};
const VOICES=['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const TIMEZONES=[
  ['Africa/Lagos','Nigeria / West Africa (Lagos)'],['America/Los_Angeles','US Pacific (Los Angeles)'],['America/Denver','US Mountain (Denver)'],['America/Chicago','US Central (Chicago)'],['America/New_York','US Eastern (New York)'],['America/Phoenix','Arizona (Phoenix)'],['America/Toronto','Canada Eastern (Toronto)'],['America/Vancouver','Canada Pacific (Vancouver)'],['Europe/London','United Kingdom (London)'],['Europe/Rome','Italy (Rome)'],['Europe/Paris','France (Paris)'],['Europe/Berlin','Germany (Berlin)'],['Asia/Dubai','UAE (Dubai)'],['Asia/Kolkata','India (Kolkata)'],['Asia/Tokyo','Japan (Tokyo)'],['Asia/Shanghai','China (Shanghai)'],['Australia/Sydney','Australia (Sydney)'],['Pacific/Auckland','New Zealand (Auckland)']
];
const defaults={
  profile:{name:'',about:'',rules:''},
  admin:{maleVoice:'cedar',femaleVoice:'marin',model:'gpt-realtime-2.1',instructions:'Have a natural spoken conversation based on the supplied call context. Do not recite the background information. Keep replies conversational and appropriately brief. Listen carefully, respond to what was actually said, and use the supplied relationship dynamics and memory naturally. Never invent personal facts that were not supplied or established during the call.',opening:'Start the call naturally as soon as the session begins. Use the call topic, relationship context, regions and current local times when relevant.',speakFirst:true,interruptions:true}
};
let state={callers:load(STORE.callers,[]),profile:load(STORE.profile,defaults.profile),admin:load(STORE.admin,defaults.admin),history:load(STORE.history,[])};
let live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,muted:false,audioMuted:false,current:null};
function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function $(id){return document.getElementById(id)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2200)}
function uuid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`}
function formatTime(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function nowFor(tz){try{return new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date())}catch{return new Date().toString()}}
function initSelects(){
  for(const id of ['adminMaleVoice','adminFemaleVoice']){$(id).innerHTML=VOICES.map(v=>`<option value="${v}">${v}</option>`).join('')}
  const tzOptions=TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');$('callerATimezone').innerHTML=tzOptions;$('callerBTimezone').innerHTML=tzOptions;
}
function render(){
  $('statCallers').textContent=state.callers.length;$('statCalls').textContent=state.history.length;$('statVoice').textContent='Male / Female';
  $('miniProfileName').textContent=state.profile.name||'Your profile';
  const callerMarkup=state.callers.length?state.callers.map(c=>callerCard(c)).join(''):`<div class="empty-state">No caller profiles yet. Add someone once, then reuse and update their memory for future calls.</div>`;
  $('callerList').innerHTML=callerMarkup;$('homeCallerList').innerHTML=state.callers.length?state.callers.slice(0,3).map(c=>callerCard(c,true)).join(''):`<div class="empty-state">Your saved callers will appear here.</div>`;
  $('callSavedCaller').innerHTML=`<option value="">New / unsaved caller</option>`+state.callers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('historyList').innerHTML=state.history.length?state.history.map(h=>`<div class="history-item"><div><div class="history-name">${esc(h.callerName||'Call')}</div><div class="history-meta">${esc(h.title||'Untitled')} · ${esc(h.date)} · ${esc(h.duration)}</div></div><div class="history-meta">${esc(h.voice||'')}</div></div>`).join(''):`<div class="empty-state">Completed calls will appear here.</div>`;
}
function callerCard(c,compact=false){return `<div class="caller-card"><div class="caller-avatar">${esc((c.name||'?')[0].toUpperCase())}</div><div class="caller-main"><div class="caller-name">${esc(c.name)}</div><div class="caller-meta">${esc(c.relationship||'Saved caller')}</div>${!compact&&c.memory?`<div class="caller-memory">${esc(c.memory.slice(0,130))}${c.memory.length>130?'…':''}</div>`:''}</div><div class="card-actions"><button class="small-btn" onclick="openCallFor('${c.id}')">Call</button><button class="small-btn" onclick="editCaller('${c.id}')">Edit</button></div></div>`}
function switchView(view){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.view===view));$(`view-${view}`).classList.add('active');$('viewTitle').textContent={home:'Home',callers:'My callers',history:'Call history',profile:'My profile',admin:'Admin'}[view];$('viewEyebrow').textContent=view==='admin'?'System':'Workspace';$('sidebar').classList.remove('open')}
function openModal(id){$(id).classList.remove('hidden')} function closeModal(id){$(id).classList.add('hidden')}
window.editCaller=(id)=>{const c=state.callers.find(x=>x.id===id);if(!c)return;$('callerModalTitle').textContent='Edit caller';$('callerId').value=c.id;$('callerName').value=c.name||'';$('callerRelationship').value=c.relationship||'';$('callerAbout').value=c.about||'';$('callerAboutMe').value=c.aboutMe||'';$('callerDynamics').value=c.dynamics||'';$('callerMemory').value=c.memory||'';$('callerRules').value=c.rules||'';openModal('callerModal')}
window.openCallFor=(id)=>{openCallSetup(id)};
function blankCallerForm(){$('callerModalTitle').textContent='Add caller';['callerId','callerName','callerRelationship','callerAbout','callerAboutMe','callerDynamics','callerMemory','callerRules'].forEach(id=>$(id).value='')}
function openCallSetup(callerId=''){
  $('callSavedCaller').value=callerId;$('callTitle').value='';$('callTopic').value='';$('callerARegion').value='';$('callerBRegion').value='';$('callerATimezone').value='America/Los_Angeles';$('callerBTimezone').value='America/New_York';$('callVoiceGender').value='male';$('callOpeningOverride').value='';hydrateCallFromCaller(callerId);openModal('callSetupModal');
}
function hydrateCallFromCaller(id){const c=state.callers.find(x=>x.id===id);$('callAboutCaller').value=c?.about||'';$('callAboutSelf').value=c?.aboutMe||state.profile.about||'';$('callDynamics').value=c?.dynamics||'';$('callMemory').value=c?.memory||'';$('callRules').value=c?.rules||''}
function loadForms(){
  $('profileName').value=state.profile.name||'';$('profileAbout').value=state.profile.about||'';$('profileRules').value=state.profile.rules||'';
  $('adminMaleVoice').value=state.admin.maleVoice||'cedar';$('adminFemaleVoice').value=state.admin.femaleVoice||'marin';$('adminModel').value=state.admin.model||'gpt-realtime-2.1';$('adminInstructions').value=state.admin.instructions||'';$('adminOpening').value=state.admin.opening||'';$('adminSpeakFirst').checked=state.admin.speakFirst!==false;$('adminInterruptions').checked=state.admin.interruptions!==false;
}
function assembleCall(){
  const caller=state.callers.find(c=>c.id===$('callSavedCaller').value);
  const gender=$('callVoiceGender').value; const voice=gender==='female'?state.admin.femaleVoice:state.admin.maleVoice;
  return {title:$('callTitle').value.trim(),topic:$('callTopic').value.trim(),callerId:caller?.id||'',callerName:caller?.name||'Caller',relationship:caller?.relationship||'',callerA:{region:$('callerARegion').value.trim(),timezone:$('callerATimezone').value,localTime:nowFor($('callerATimezone').value)},callerB:{region:$('callerBRegion').value.trim(),timezone:$('callerBTimezone').value,localTime:nowFor($('callerBTimezone').value)},voiceGender:gender,voice,model:state.admin.model,aboutCaller:$('callAboutCaller').value.trim(),aboutSelf:$('callAboutSelf').value.trim(),dynamics:$('callDynamics').value.trim(),memory:$('callMemory').value.trim(),callerRules:$('callRules').value.trim(),personalRules:state.profile.rules||'',masterInstructions:state.admin.instructions||'',opening:$('callOpeningOverride').value.trim()||state.admin.opening||'',speakFirst:state.admin.speakFirst!==false,interruptions:state.admin.interruptions!==false};
}
function buildInstructions(c){return `${c.masterInstructions}\n\nCALL-SPECIFIC CONTEXT\nCaller A region: ${c.callerA.region||'Not provided'}\nCaller A timezone: ${c.callerA.timezone}\nCaller A current local date/time: ${c.callerA.localTime}\nCaller B region: ${c.callerB.region||'Not provided'}\nCaller B timezone: ${c.callerB.timezone}\nCaller B current local date/time: ${c.callerB.localTime}\nRelationship: ${c.relationship||'Not provided'}\nAbout Caller A: ${c.aboutSelf||'Not provided'}\nAbout Caller B: ${c.aboutCaller||'Not provided'}\nConversation dynamics: ${c.dynamics||'Not provided'}\nRecent conversation memory: ${c.memory||'Not provided'}\nPersonal default rules: ${c.personalRules||'None'}\nCaller-specific rules: ${c.callerRules||'None'}\nNew call topic/details: ${c.topic||'No new topic supplied; continue naturally using established context and memory.'}\n\nOPENING BEHAVIOR\n${c.opening||'Begin naturally when the call starts.'}\nDo not read this context aloud. Use it silently to conduct the call.`}
async function startRealtimeCall(c){
  closeModal('callSetupModal'); live.current=c;$('callScreen').classList.remove('hidden');$('liveCallerName').textContent=c.callerName;$('liveAvatar').textContent=(c.callerName||'C')[0].toUpperCase();$('liveRegion').textContent=[c.callerB.region,c.callerB.timezone].filter(Boolean).join(' · ');$('liveStatus').textContent='Connecting…';$('liveCaption').textContent='Preparing voice connection…';$('callTimer').textContent='00:00';
  try{
    const pc=new RTCPeerConnection(); live.pc=pc;
    const audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;live.audio=audio;pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})};
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});live.stream=stream;stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream));
    const dc=pc.createDataChannel('oai-events');live.dc=dc;
    dc.onmessage=e=>handleRealtimeEvent(e.data);
    dc.onopen=()=>{$('liveCaption').textContent='Voice channel connected.'};
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitForIce(pc);
    const response=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,session:{model:c.model,voice:c.voice,instructions:buildInstructions(c),interruptions:c.interruptions}})});
    if(!response.ok)throw new Error(await response.text());
    const answerSdp=await response.text();await pc.setRemoteDescription({type:'answer',sdp:answerSdp});
  }catch(err){console.error(err);$('liveStatus').textContent='Connection failed';$('liveCaption').textContent='Check microphone permission and Cloudflare OPENAI_API_KEY.';toast('Voice connection failed');}
}
function waitForIce(pc){if(pc.iceGatheringState==='complete')return Promise.resolve();return new Promise(resolve=>{const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);resolve()}};pc.addEventListener('icegatheringstatechange',f);setTimeout(resolve,2500)})}
function handleRealtimeEvent(raw){let e;try{e=JSON.parse(raw)}catch{return}
  if(e.type==='session.created'){
    $('liveStatus').textContent='Connected';$('liveCaption').textContent='Call started';startTimer();
    if(live.current?.speakFirst){setTimeout(()=>{if(live.dc?.readyState==='open'){live.dc.send(JSON.stringify({type:'response.create',response:{instructions:`Begin the call now. ${live.current.opening||'Open naturally based on the supplied context.'}`}}))}},120)}
  }
  if(e.type==='input_audio_buffer.speech_started')$('liveStatus').textContent='Listening…';
  if(e.type==='input_audio_buffer.speech_stopped')$('liveStatus').textContent='Thinking…';
  if(e.type==='response.created')$('liveStatus').textContent='Speaking…';
  if(e.type==='response.done')$('liveStatus').textContent='Connected';
  if(e.type==='response.output_audio_transcript.delta'&&e.delta)$('liveCaption').textContent=e.delta;
  if(e.type==='conversation.item.input_audio_transcription.completed'&&e.transcript)$('liveCaption').textContent=e.transcript;
  if(e.type==='error'){console.error(e);$('liveCaption').textContent=e.error?.message||'Realtime error'}
}
function startTimer(){clearInterval(live.timer);live.seconds=0;$('callTimer').textContent='00:00';live.timer=setInterval(()=>{$('callTimer').textContent=formatTime(++live.seconds)},1000)}
function cleanupCall(saveHistory=true){
  clearInterval(live.timer);live.timer=null;if(live.dc?.readyState==='open'){try{live.dc.close()}catch{}};live.stream?.getTracks().forEach(t=>t.stop());try{live.pc?.close()}catch{};if(saveHistory&&live.current){state.history.unshift({id:uuid(),callerName:live.current.callerName,title:live.current.title||live.current.topic.slice(0,40)||'Call',date:new Date().toLocaleString(),duration:formatTime(live.seconds),voice:`${live.current.voiceGender} · ${live.current.voice}`});state.history=state.history.slice(0,100);save(STORE.history,state.history)}live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,muted:false,audioMuted:false,current:null};$('callScreen').classList.add('hidden');render()}
function bind(){
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>switchView(b.dataset.viewTarget));document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  $('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');$('quickCallBtn').onclick=()=>openCallSetup();$('heroNewCallBtn').onclick=()=>openCallSetup();$('addCallerBtn').onclick=()=>{blankCallerForm();openModal('callerModal')};
  $('callSavedCaller').onchange=e=>hydrateCallFromCaller(e.target.value);
  $('saveCallerBtn').onclick=()=>{const name=$('callerName').value.trim();if(!name)return toast('Caller name is required');const item={id:$('callerId').value||uuid(),name,relationship:$('callerRelationship').value.trim(),about:$('callerAbout').value.trim(),aboutMe:$('callerAboutMe').value.trim(),dynamics:$('callerDynamics').value.trim(),memory:$('callerMemory').value.trim(),rules:$('callerRules').value.trim()};const i=state.callers.findIndex(c=>c.id===item.id);if(i>=0)state.callers[i]=item;else state.callers.unshift(item);save(STORE.callers,state.callers);closeModal('callerModal');render();toast('Caller saved')};
  $('saveProfileBtn').onclick=()=>{state.profile={name:$('profileName').value.trim(),about:$('profileAbout').value.trim(),rules:$('profileRules').value.trim()};save(STORE.profile,state.profile);render();toast('Profile saved')};
  $('saveAdminBtn').onclick=()=>{state.admin={maleVoice:$('adminMaleVoice').value,femaleVoice:$('adminFemaleVoice').value,model:$('adminModel').value.trim()||'gpt-realtime-2.1',instructions:$('adminInstructions').value.trim(),opening:$('adminOpening').value.trim(),speakFirst:$('adminSpeakFirst').checked,interruptions:$('adminInterruptions').checked};save(STORE.admin,state.admin);toast('Admin settings saved')};
  $('startCallBtn').onclick=()=>{const c=assembleCall();if(!c.callerA.region||!c.callerB.region)return toast('Select both callers’ regions for this call');startRealtimeCall(c)};
  $('muteBtn').onclick=()=>{live.muted=!live.muted;live.stream?.getAudioTracks().forEach(t=>t.enabled=!live.muted);$('muteBtn').classList.toggle('active',live.muted)};
  $('audioBtn').onclick=()=>{live.audioMuted=!live.audioMuted;if(live.audio)live.audio.muted=live.audioMuted;$('audioBtn').classList.toggle('active',live.audioMuted)};
  $('notesBtn').onclick=()=>toast('Live notes panel is reserved for V2');$('callMinimizeBtn').onclick=()=>toast('Minimize is reserved for the installed-app version');
  $('endCallBtn').onclick=()=>{if(live.dc?.readyState==='open'){try{live.dc.send(JSON.stringify({type:'response.cancel'}))}catch{}}cleanupCall(true)};
}
initSelects();loadForms();bind();render();
