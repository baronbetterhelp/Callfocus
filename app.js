const STORE = {
  callers: 'callfocus_callers_v2',
  profile: 'callfocus_profile_v2',
  admin: 'callfocus_admin_v2',
  history: 'callfocus_history_v2'
};

const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const TIMEZONES = [
  ['Africa/Lagos','Nigeria / West Africa (Lagos)'],['America/Los_Angeles','US Pacific (Los Angeles)'],['America/Denver','US Mountain (Denver)'],['America/Chicago','US Central (Chicago)'],['America/New_York','US Eastern (New York)'],['America/Phoenix','Arizona (Phoenix)'],['America/Toronto','Canada Eastern (Toronto)'],['America/Vancouver','Canada Pacific (Vancouver)'],['Europe/London','United Kingdom (London)'],['Europe/Rome','Italy (Rome)'],['Europe/Paris','France (Paris)'],['Europe/Berlin','Germany (Berlin)'],['Asia/Dubai','UAE (Dubai)'],['Asia/Kolkata','India (Kolkata)'],['Asia/Tokyo','Japan (Tokyo)'],['Asia/Shanghai','China (Shanghai)'],['Australia/Sydney','Australia (Sydney)'],['Pacific/Auckland','New Zealand (Auckland)']
];

const DYNAMICS_PRESETS = {
  custom:{label:'Upload my own dynamics (Recommended)',description:'Use the real relationship tone, style and boundaries you provide.',prompt:''},
  romantic:{label:'Romantic Call',description:'Warm, affectionate and emotionally attentive.',prompt:'Use a warm, affectionate and emotionally attentive romantic tone. Be natural and grounded in the supplied context. Do not invent intimacy, promises or facts.'},
  dating:{label:'Dating / Getting to Know Each Other',description:'Warm, interested and lightly flirtatious.',prompt:'Use a warm, interested, lightly flirtatious getting-to-know-you tone. Ask natural follow-up questions and avoid acting as though the relationship is deeper than the supplied context.'},
  friendship:{label:'Friendship Call',description:'Relaxed, familiar and friendly.',prompt:'Use a relaxed, friendly and familiar friendship dynamic. Follow the other person naturally and avoid inventing history.'},
  business:{label:'Business Call',description:'Clear, polished and focused.',prompt:'Use a professional, clear and goal-oriented business dynamic. Be courteous, efficient and natural.'},
  client:{label:'Professional / Client Call',description:'Polished and client-safe.',prompt:'Use a polished professional-client dynamic with clear boundaries. Be helpful and courteous without inventing company facts or promises.'},
  family:{label:'Family Call',description:'Warm and familiar.',prompt:'Use a warm, familiar family-call dynamic and rely only on supplied context for relationship details.'},
  supportive:{label:'Supportive / Check-in Call',description:'Attentive and caring.',prompt:'Use a supportive, caring and attentive check-in dynamic. Ask gentle follow-ups and avoid sounding clinical.'},
  reconnecting:{label:'Reconnecting Call',description:'Warm but measured.',prompt:'Use a warm but measured reconnecting dynamic. Let the conversation rebuild naturally.'},
  casual:{label:'Casual Call',description:'Light and easygoing.',prompt:'Use a light, easygoing casual-call dynamic. Keep the exchange relaxed.'},
  formal:{label:'Formal Call',description:'Respectful and restrained.',prompt:'Use a formal, respectful and composed dynamic with restrained language.'}
};

const defaults = {
  profile: {name:'', role:'', about:'', rules:''},
  admin: {
    maleVoice:'cedar',
    femaleVoice:'marin',
    model:'gpt-realtime-2.1',
    instructions:'Have a natural spoken conversation based on the supplied call context. Do not read background context aloud. Keep replies conversational, emotionally appropriate, and grounded in the real details provided. Never invent personal facts, promises or relationship history that were not supplied.',
    opening:'Start naturally as soon as the call begins. Use the relationship, topic and local times when relevant.',
    speakFirst:true,
    interruptions:true
  }
};

let state = {
  callers: load(STORE.callers, []),
  profile: load(STORE.profile, defaults.profile),
  admin: {...defaults.admin, ...load(STORE.admin, defaults.admin)},
  history: load(STORE.history, [])
};

let composerSeed = null;
let live = {
  pc:null, dc:null, stream:null, audio:null, timer:null, seconds:0,
  muted:false, audioMuted:false, held:false, current:null, transcript:'', gracefulEndRequested:false
};

function $(id){ return document.getElementById(id); }
function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function uuid(){ return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function esc(text=''){ return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(msg){ $('toast').textContent = msg; $('toast').classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(()=>$('toast').classList.add('hidden'), 2400); }
function formatDuration(sec){ const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60; return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function initials(name='?'){ return (name.trim()?.[0] || '?').toUpperCase(); }
function nowFor(tz){ try { return new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date()); } catch { return new Date().toString(); } }
function shortDate(iso){ try{ return new Date(iso).toLocaleString(); } catch { return iso; } }

function initSelects(){
  const voiceOptions = VOICES.map(v=>`<option value="${v}">${v}</option>`).join('');
  $('adminMaleVoice').innerHTML = voiceOptions;
  $('adminFemaleVoice').innerHTML = voiceOptions;
  const tzOptions = TIMEZONES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
  $('callerATimezone').innerHTML = tzOptions;
  $('callerBTimezone').innerHTML = tzOptions;
  const dynOptions = Object.entries(DYNAMICS_PRESETS).map(([value,d])=>`<option value="${value}">${d.label}</option>`).join('');
  $('callerDynamicsMode').innerHTML = dynOptions;
  $('callDynamicsMode').innerHTML = dynOptions;
}

function loadForms(){
  $('profileName').value = state.profile.name || '';
  $('profileRole').value = state.profile.role || '';
  $('profileAbout').value = state.profile.about || '';
  $('profileRules').value = state.profile.rules || '';
  $('adminMaleVoice').value = state.admin.maleVoice || defaults.admin.maleVoice;
  $('adminFemaleVoice').value = state.admin.femaleVoice || defaults.admin.femaleVoice;
  $('adminModel').value = state.admin.model || defaults.admin.model;
  $('adminInstructions').value = state.admin.instructions || defaults.admin.instructions;
  $('adminOpening').value = state.admin.opening || defaults.admin.opening;
  $('adminSpeakFirst').checked = state.admin.speakFirst !== false;
  $('adminInterruptions').checked = state.admin.interruptions !== false;
}

function updateDynamicsUI(scope){
  const modeEl = $(scope + 'DynamicsMode');
  const mode = modeEl.value || 'custom';
  const customWrap = $(scope + 'DynamicsCustomWrap');
  const help = $(scope + 'DynamicsHelp');
  const preset = DYNAMICS_PRESETS[mode] || DYNAMICS_PRESETS.custom;
  const isCustom = mode === 'custom';
  customWrap.classList.toggle('hidden', !isCustom);
  help.classList.toggle('hidden', isCustom);
  help.innerHTML = isCustom ? '' : `<strong>${esc(preset.label)}</strong><br>${esc(preset.description)} This is a fallback style. Custom dynamics are still better whenever you have them.`;
}

function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active', v.dataset.view === view));
  const active = $('view-' + view);
  if(active) active.classList.add('active');
  const titleMap = {home:['Workspace','Home'], callers:['People memory','My callers'], history:['Continuity','Recent calls'], profile:['Profile','My profile'], admin:['System control','Admin']};
  $('viewEyebrow').textContent = titleMap[view]?.[0] || 'Workspace';
  $('viewTitle').textContent = titleMap[view]?.[1] || 'Home';
  closeSidebar();
}

function openModal(id){ $(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id){ $(id).classList.add('hidden'); if(document.querySelectorAll('.modal-backdrop:not(.hidden)').length === 0 && $('callScreen').classList.contains('hidden')) document.body.style.overflow = ''; }

function openSidebar(){ $('sidebar').classList.add('open'); $('mobileNavBackdrop').classList.remove('hidden'); }
function closeSidebar(){ $('sidebar').classList.remove('open'); $('mobileNavBackdrop').classList.add('hidden'); }

function blankCallerForm(){
  $('callerModalTitle').textContent = 'Add caller';
  $('callerId').value = '';
  $('callerName').value = '';
  $('callerRelationship').value = '';
  $('callerAbout').value = '';
  $('callerAboutMe').value = '';
  $('callerDynamicsMode').value = 'custom';
  $('callerDynamics').value = '';
  $('callerMemory').value = '';
  $('callerRules').value = '';
  updateDynamicsUI('caller');
}

function fillCallerForm(caller){
  $('callerModalTitle').textContent = 'Edit caller';
  $('callerId').value = caller.id;
  $('callerName').value = caller.name || '';
  $('callerRelationship').value = caller.relationship || '';
  $('callerAbout').value = caller.about || '';
  $('callerAboutMe').value = caller.aboutMe || '';
  $('callerDynamicsMode').value = caller.dynamicsMode || 'custom';
  $('callerDynamics').value = caller.dynamics || '';
  $('callerMemory').value = caller.memory || '';
  $('callerRules').value = caller.rules || '';
  updateDynamicsUI('caller');
}

function renderCallerList(){
  $('callerList').innerHTML = state.callers.length ? state.callers.map(c=>`
    <article class="caller-card">
      <div class="caller-avatar">${esc(initials(c.name))}</div>
      <div>
        <div class="caller-name">${esc(c.name)}</div>
        <div class="caller-meta">${esc(c.relationship || 'Saved caller')}</div>
        <div class="caller-extra">${esc((c.memory || c.about || 'No saved memory yet.').slice(0,150))}</div>
      </div>
      <div class="caller-actions">
        <button class="mini-btn" data-action="call-caller" data-id="${c.id}">Call</button>
        <button class="mini-btn" data-action="edit-caller" data-id="${c.id}">Edit</button>
        <button class="mini-btn" data-action="delete-caller" data-id="${c.id}">Delete</button>
      </div>
    </article>
  `).join('') : `<div class="empty-state">No callers yet. Add your first caller and start building reusable call memory.</div>`;
}

function renderHistoryList(targetId='historyList', limit=null){
  const items = limit ? state.history.slice(0, limit) : state.history;
  $(targetId).innerHTML = items.length ? items.map(h=>`
    <article class="history-item">
      <div class="history-avatar">${esc(initials(h.callerName || 'C'))}</div>
      <div>
        <div class="history-title">${esc(h.title || h.callerName || 'Call')}</div>
        <div class="history-subtitle">${esc(h.callerName || 'Unknown caller')}</div>
        <div class="history-line">${esc(h.topic || 'No specific new-call topic was provided.')}</div>
        <div class="history-meta">${esc(shortDate(h.createdAt))} · ${esc(h.duration || '00:00')} · ${esc(h.voiceLabel || '')}</div>
      </div>
      <div class="history-actions">
        <button class="mini-btn" data-action="open-history" data-id="${h.id}">Open</button>
        <button class="mini-btn" data-action="call-again" data-id="${h.id}">Call again</button>
      </div>
    </article>
  `).join('') : `<div class="empty-state">No recent calls yet. Once you complete calls, they will appear here as reusable conversation threads.</div>`;
}

function render(){
  $('miniProfileName').textContent = state.profile.name || 'Your workspace';
  $('miniAvatar').textContent = initials(state.profile.name || 'Y');
  $('statCallers').textContent = state.callers.length;
  $('statCalls').textContent = state.history.length;
  $('statVoices').textContent = `${state.admin.maleVoice} / ${state.admin.femaleVoice}`;
  renderCallerList();
  renderHistoryList('historyList');
  renderHistoryList('homeHistoryList', 4);
  $('callSavedCaller').innerHTML = `<option value="">Unsaved / one-off caller</option>` + state.callers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

function saveState(){
  save(STORE.callers, state.callers);
  save(STORE.profile, state.profile);
  save(STORE.admin, state.admin);
  save(STORE.history, state.history);
  render();
}

function hydrateCallFromCaller(callerId){
  const caller = state.callers.find(c=>c.id===callerId);
  if(!caller) return;
  $('callManualName').value = caller.name || '';
  $('callManualRelationship').value = caller.relationship || '';
  $('callAboutCaller').value = caller.about || '';
  $('callAboutSelf').value = caller.aboutMe || state.profile.about || '';
  $('callDynamicsMode').value = caller.dynamicsMode || 'custom';
  $('callDynamics').value = caller.dynamics || '';
  $('callMemory').value = caller.memory || '';
  $('callRules').value = caller.rules || '';
  updateDynamicsUI('call');
}

function resetCallComposer(){
  $('callModalTitle').textContent = 'New call';
  $('callSavedCaller').value = '';
  $('callTitle').value = '';
  $('callManualName').value = '';
  $('callManualRelationship').value = '';
  $('callTopic').value = '';
  $('callDynamicsMode').value = 'custom';
  $('callDynamics').value = '';
  $('callerARegion').value = state.profile.name ? '' : '';
  $('callerBRegion').value = '';
  $('callerATimezone').value = 'Africa/Lagos';
  $('callerBTimezone').value = 'America/New_York';
  $('callVoiceGender').value = 'male';
  $('callOpeningOverride').value = '';
  $('callAboutCaller').value = '';
  $('callAboutSelf').value = state.profile.about || '';
  $('callMemory').value = '';
  $('callRules').value = '';
  composerSeed = null;
  updateDynamicsUI('call');
}

function openCallComposer(seed = null){
  resetCallComposer();
  composerSeed = seed;
  if(seed?.type === 'caller'){
    const caller = state.callers.find(c=>c.id===seed.id);
    if(caller){
      $('callModalTitle').textContent = `Call ${caller.name}`;
      $('callSavedCaller').value = caller.id;
      hydrateCallFromCaller(caller.id);
    }
  }
  if(seed?.type === 'history'){
    const item = state.history.find(h=>h.id===seed.id);
    if(item){
      $('callModalTitle').textContent = `Continue ${item.callerName || 'call'}`;
      $('callTitle').value = item.title || '';
      $('callTopic').value = '';
      $('callManualName').value = item.callerName || '';
      $('callManualRelationship').value = item.relationship || '';
      $('callerARegion').value = item.callerA?.region || '';
      $('callerBRegion').value = item.callerB?.region || '';
      $('callerATimezone').value = item.callerA?.timezone || 'Africa/Lagos';
      $('callerBTimezone').value = item.callerB?.timezone || 'America/New_York';
      $('callVoiceGender').value = item.voiceGender || 'male';
      $('callAboutCaller').value = item.aboutCaller || '';
      $('callAboutSelf').value = item.aboutSelf || state.profile.about || '';
      $('callMemory').value = item.memory || '';
      $('callRules').value = item.callerRules || '';
      $('callOpeningOverride').value = '';
      $('callSavedCaller').value = item.callerId || '';
      $('callDynamicsMode').value = item.dynamicsMode || 'custom';
      $('callDynamics').value = item.rawDynamics || '';
      updateDynamicsUI('call');
    }
  }
  openModal('callSetupModal');
}

function buildResolvedDynamics(mode, customText){
  const preset = DYNAMICS_PRESETS[mode] || DYNAMICS_PRESETS.custom;
  if(mode === 'custom') return customText.trim() || 'No detailed conversation dynamics were supplied. Use the saved context conservatively and do not invent relationship tone or history.';
  return `${preset.label}: ${preset.prompt}`;
}

function assembleCall(){
  const selectedId = $('callSavedCaller').value;
  const savedCaller = state.callers.find(c=>c.id === selectedId);
  const voiceGender = $('callVoiceGender').value;
  const voice = voiceGender === 'female' ? state.admin.femaleVoice : state.admin.maleVoice;
  const manualName = $('callManualName').value.trim();
  const callerName = savedCaller?.name || manualName;
  const relationship = savedCaller?.relationship || $('callManualRelationship').value.trim();
  return {
    id: uuid(),
    sourceHistoryId: composerSeed?.type === 'history' ? composerSeed.id : '',
    callerId: savedCaller?.id || '',
    callerName,
    relationship,
    title: $('callTitle').value.trim() || callerName || 'Untitled call',
    topic: $('callTopic').value.trim(),
    callerA: {
      region: $('callerARegion').value.trim(),
      timezone: $('callerATimezone').value,
      localTime: nowFor($('callerATimezone').value)
    },
    callerB: {
      region: $('callerBRegion').value.trim(),
      timezone: $('callerBTimezone').value,
      localTime: nowFor($('callerBTimezone').value)
    },
    voiceGender,
    voice,
    voiceLabel: `${voiceGender} · ${voice}`,
    model: state.admin.model,
    dynamicsMode: $('callDynamicsMode').value || 'custom',
    dynamicsLabel: (DYNAMICS_PRESETS[$('callDynamicsMode').value] || DYNAMICS_PRESETS.custom).label,
    rawDynamics: $('callDynamics').value.trim(),
    dynamics: buildResolvedDynamics($('callDynamicsMode').value || 'custom', $('callDynamics').value.trim()),
    aboutCaller: $('callAboutCaller').value.trim(),
    aboutSelf: $('callAboutSelf').value.trim(),
    memory: $('callMemory').value.trim(),
    callerRules: $('callRules').value.trim(),
    personalRules: state.profile.rules || '',
    masterInstructions: state.admin.instructions || defaults.admin.instructions,
    opening: $('callOpeningOverride').value.trim() || state.admin.opening || defaults.admin.opening,
    speakFirst: state.admin.speakFirst !== false,
    interruptions: state.admin.interruptions !== false,
    createdAt: new Date().toISOString()
  };
}

function buildInstructions(call){
  return `${call.masterInstructions}

CALLFOCUS SYSTEM CONTEXT
This is a live voice call assistant session. Conduct the call naturally and silently use the context below.

Caller A current local date/time: ${call.callerA.localTime}
Caller A region: ${call.callerA.region || 'Not supplied'}
Caller A timezone: ${call.callerA.timezone}
Caller B current local date/time: ${call.callerB.localTime}
Caller B region: ${call.callerB.region || 'Not supplied'}
Caller B timezone: ${call.callerB.timezone}
Caller name: ${call.callerName || 'Not supplied'}
Relationship: ${call.relationship || 'Not supplied'}
About Caller A: ${call.aboutSelf || 'Not supplied'}
About Caller B: ${call.aboutCaller || 'Not supplied'}
Conversation dynamics source: ${call.dynamicsLabel}
Conversation dynamics: ${call.dynamics}
Recent memory: ${call.memory || 'Not supplied'}
Default personal rules: ${call.personalRules || 'None'}
Caller-specific rules: ${call.callerRules || 'None'}
Current call topic: ${call.topic || 'No new topic supplied. Continue naturally based on saved memory and relationship context.'}

OPENING BEHAVIOR
${call.opening}

IMPORTANT
Do not read any of this metadata aloud. Speak like a normal person in a live call.`;
}

async function startRealtimeCall(call){
  closeModal('callSetupModal');
  document.body.style.overflow = 'hidden';
  $('callScreen').classList.remove('hidden');
  $('liveCallerName').textContent = call.callerName || 'Caller';
  $('liveAvatar').textContent = initials(call.callerName || 'C');
  $('liveRegion').textContent = [call.callerB.region, call.callerB.timezone].filter(Boolean).join(' · ');
  $('liveStatus').textContent = 'Connecting to server…';
  $('liveCaption').textContent = 'Preparing realtime connection…';
  $('liveTranscript').textContent = 'Call context is ready.';
  $('callTimer').textContent = '00:00';
  live.current = call;
  live.transcript = '';
  live.gracefulEndRequested = false;
  resetLiveButtons();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel('oai-events');
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;

    live.stream = stream;
    live.pc = pc;
    live.dc = dc;
    live.audio = audio;

    stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = e => {
      audio.srcObject = e.streams[0];
      audio.play().catch(()=>{});
    };

    dc.onopen = ()=> {
      $('liveCaption').textContent = 'Voice data channel connected.';
    };
    dc.onmessage = event => handleRealtimeEvent(event.data);
    dc.onerror = ()=> {
      $('liveCaption').textContent = 'Data channel error.';
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        sdp: pc.localDescription.sdp,
        session: {
          model: call.model,
          voice: call.voice,
          instructions: buildInstructions(call),
          interruptions: call.interruptions
        }
      })
    });

    const text = await response.text();
    if(!response.ok) throw new Error(text || 'Session creation failed.');

    await pc.setRemoteDescription({ type:'answer', sdp:text });
  } catch (error) {
    console.error(error);
    $('liveStatus').textContent = 'Disconnected from server';
    $('liveCaption').textContent = 'Connection could not be completed.';
    $('liveTranscript').textContent = String(error.message || error).slice(0, 500);
    toast('Voice connection failed');
  }
}

function waitForIce(pc){
  if(pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(resolve => {
    const handler = ()=> {
      if(pc.iceGatheringState === 'complete'){
        pc.removeEventListener('icegatheringstatechange', handler);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', handler);
    setTimeout(resolve, 2500);
  });
}

function handleRealtimeEvent(raw){
  let event;
  try { event = JSON.parse(raw); } catch { return; }
  if(event.type === 'session.created'){
    $('liveStatus').textContent = 'Connected to server';
    $('liveCaption').textContent = 'Call started.';
    startLiveTimer();
    if(live.current?.speakFirst && live.dc?.readyState === 'open'){
      setTimeout(()=>{
        live.dc.send(JSON.stringify({
          type:'response.create',
          response:{ instructions: `Begin the call now. ${live.current.opening || 'Open naturally.'}` }
        }));
      }, 150);
    }
  }
  if(event.type === 'input_audio_buffer.speech_started') $('liveStatus').textContent = 'Connected to server · Listening';
  if(event.type === 'input_audio_buffer.speech_stopped') $('liveStatus').textContent = 'Connected to server · Thinking';
  if(event.type === 'response.created') $('liveStatus').textContent = 'Connected to server · Speaking';
  if(event.type === 'response.done'){
    $('liveStatus').textContent = live.held ? 'Connected to server · Call on hold' : 'Connected to server';
    if(live.gracefulEndRequested){
      $('liveCaption').textContent = 'Graceful wrap-up sent. End the call when ready.';
      live.gracefulEndRequested = false;
    }
  }
  if(event.type === 'response.output_audio_transcript.delta' && event.delta){
    live.transcript += event.delta;
    $('liveTranscript').textContent = live.transcript.slice(-1200);
  }
  if(event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript){
    $('liveCaption').textContent = `Heard: ${event.transcript}`;
  }
  if(event.type === 'error'){
    $('liveStatus').textContent = 'Disconnected from server';
    $('liveCaption').textContent = event.error?.message || 'Realtime error';
  }
}

function startLiveTimer(){
  clearInterval(live.timer);
  live.seconds = 0;
  $('callTimer').textContent = '00:00';
  live.timer = setInterval(()=>{
    live.seconds += 1;
    $('callTimer').textContent = formatDuration(live.seconds);
  }, 1000);
}

function resetLiveButtons(){
  live.muted = false;
  live.audioMuted = false;
  live.held = false;
  $('muteBtn').classList.remove('active');
  $('audioBtn').classList.remove('active');
  $('holdBtn').classList.remove('active');
}

function storeHistory(call){
  const item = {
    id: uuid(),
    callerId: call.callerId,
    callerName: call.callerName,
    relationship: call.relationship,
    title: call.title,
    topic: call.topic,
    callerA: call.callerA,
    callerB: call.callerB,
    voiceGender: call.voiceGender,
    voiceLabel: call.voiceLabel,
    aboutCaller: call.aboutCaller,
    aboutSelf: call.aboutSelf,
    dynamicsMode: call.dynamicsMode,
    rawDynamics: call.rawDynamics,
    memory: call.memory,
    callerRules: call.callerRules,
    duration: formatDuration(live.seconds),
    createdAt: new Date().toISOString()
  };
  state.history.unshift(item);
  state.history = state.history.slice(0, 150);
}

function cleanupCall(saveHistory = true){
  clearInterval(live.timer);
  if(saveHistory && live.current) storeHistory(live.current);
  try { if(live.dc?.readyState === 'open') live.dc.close(); } catch {}
  try { live.stream?.getTracks().forEach(track => track.stop()); } catch {}
  try { live.pc?.close(); } catch {}
  live = { pc:null, dc:null, stream:null, audio:null, timer:null, seconds:0, muted:false, audioMuted:false, held:false, current:null, transcript:'', gracefulEndRequested:false };
  $('callScreen').classList.add('hidden');
  document.body.style.overflow = '';
  save(STORE.history, state.history);
  render();
}

function bindGlobalActions(){
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', ()=>switchView(btn.dataset.view)));
  document.querySelectorAll('[data-view-target]').forEach(btn => btn.addEventListener('click', ()=>switchView(btn.dataset.viewTarget)));
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', e => { if(e.target === backdrop) closeModal(backdrop.id); }));
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', ()=>closeModal(btn.dataset.close)));
  $('menuBtn').addEventListener('click', openSidebar);
  $('mobileNavBackdrop').addEventListener('click', closeSidebar);
  $('headerAddCallerBtn').addEventListener('click', ()=>{ blankCallerForm(); openModal('callerModal'); });
  $('addCallerBtn').addEventListener('click', ()=>{ blankCallerForm(); openModal('callerModal'); });
  $('quickCallBtn').addEventListener('click', ()=>openCallComposer());
  $('heroCallBtn').addEventListener('click', ()=>openCallComposer());
  $('callSavedCaller').addEventListener('change', e => hydrateCallFromCaller(e.target.value));
  $('callerDynamicsMode').addEventListener('change', ()=>updateDynamicsUI('caller'));
  $('callDynamicsMode').addEventListener('change', ()=>updateDynamicsUI('call'));

  $('saveProfileBtn').addEventListener('click', ()=>{
    state.profile = {
      name: $('profileName').value.trim(),
      role: $('profileRole').value.trim(),
      about: $('profileAbout').value.trim(),
      rules: $('profileRules').value.trim()
    };
    saveState();
    toast('Profile saved');
  });

  $('saveAdminBtn').addEventListener('click', ()=>{
    state.admin = {
      maleVoice: $('adminMaleVoice').value,
      femaleVoice: $('adminFemaleVoice').value,
      model: $('adminModel').value.trim() || defaults.admin.model,
      instructions: $('adminInstructions').value.trim() || defaults.admin.instructions,
      opening: $('adminOpening').value.trim() || defaults.admin.opening,
      speakFirst: $('adminSpeakFirst').checked,
      interruptions: $('adminInterruptions').checked
    };
    saveState();
    toast('Admin settings saved');
  });

  $('saveCallerBtn').addEventListener('click', ()=>{
    const name = $('callerName').value.trim();
    if(!name) return toast('Caller name is required');
    const caller = {
      id: $('callerId').value || uuid(),
      name,
      relationship: $('callerRelationship').value.trim(),
      about: $('callerAbout').value.trim(),
      aboutMe: $('callerAboutMe').value.trim(),
      dynamicsMode: $('callerDynamicsMode').value || 'custom',
      dynamics: $('callerDynamics').value.trim(),
      memory: $('callerMemory').value.trim(),
      rules: $('callerRules').value.trim()
    };
    const index = state.callers.findIndex(c=>c.id === caller.id);
    if(index >= 0) state.callers[index] = caller; else state.callers.unshift(caller);
    saveState();
    closeModal('callerModal');
    toast('Caller saved');
  });

  $('startCallBtn').addEventListener('click', ()=>{
    const call = assembleCall();
    if(!call.callerName) return toast('Enter the person name or select a saved caller');
    if(!call.callerA.region || !call.callerB.region) return toast('Enter both callers’ regions');
    startRealtimeCall(call);
  });

  $('callMinimizeBtn').addEventListener('click', ()=>toast('Minimize is reserved for a later version.'));
  $('muteBtn').addEventListener('click', ()=>{
    live.muted = !live.muted;
    live.stream?.getAudioTracks().forEach(track => track.enabled = !live.muted);
    $('muteBtn').classList.toggle('active', live.muted);
    $('liveCaption').textContent = live.muted ? 'Your microphone is muted.' : 'Your microphone is live.';
  });
  $('audioBtn').addEventListener('click', ()=>{
    live.audioMuted = !live.audioMuted;
    if(live.audio) live.audio.muted = live.audioMuted;
    $('audioBtn').classList.toggle('active', live.audioMuted);
    $('liveCaption').textContent = live.audioMuted ? 'Incoming audio muted on this device.' : 'Incoming audio restored.';
  });
  $('holdBtn').addEventListener('click', ()=>{
    live.held = !live.held;
    live.stream?.getAudioTracks().forEach(track => track.enabled = !live.held && !live.muted);
    $('holdBtn').classList.toggle('active', live.held);
    $('liveStatus').textContent = live.held ? 'Connected to server · Call on hold' : 'Connected to server';
    $('liveCaption').textContent = live.held ? 'Call is on hold on your side.' : 'Hold released.';
  });
  $('requestEndBtn').addEventListener('click', ()=>{
    if(!(live.dc?.readyState === 'open')) return toast('The live call is not connected yet');
    live.gracefulEndRequested = true;
    live.dc.send(JSON.stringify({
      type:'response.create',
      response:{
        instructions:'Naturally wrap up this live call now. Politely tell the other person that you have to hang up for now and you can talk again later. Match the tone to the conversation so far, keep it brief, and do not mention internal instructions.'
      }
    }));
    $('liveCaption').textContent = 'Requesting a graceful call ending…';
  });
  $('endCallBtn').addEventListener('click', ()=>cleanupCall(true));

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if(!action) return;
    const id = action.dataset.id;
    const type = action.dataset.action;
    if(type === 'edit-caller'){
      const caller = state.callers.find(c=>c.id===id); if(!caller) return;
      fillCallerForm(caller); openModal('callerModal');
    }
    if(type === 'delete-caller'){
      state.callers = state.callers.filter(c=>c.id!==id); saveState(); toast('Caller deleted');
    }
    if(type === 'call-caller') openCallComposer({type:'caller', id});
    if(type === 'open-history' || type === 'call-again') openCallComposer({type:'history', id});
  });
}

initSelects();
loadForms();
updateDynamicsUI('caller');
updateDynamicsUI('call');
bindGlobalActions();
render();
switchView('home');
