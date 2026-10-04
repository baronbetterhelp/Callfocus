const ROOT_KEYS = {
  accounts: 'callfocus_accounts_v3',
  active: 'callfocus_active_account_v3',
  admin: 'callfocus_admin_global_v3'
};
const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const TIMEZONES = [
  ['Africa/Lagos','Nigeria / West Africa (Lagos)'],['America/Los_Angeles','US Pacific (Los Angeles)'],['America/Denver','US Mountain (Denver)'],['America/Chicago','US Central (Chicago)'],['America/New_York','US Eastern (New York)'],['America/Phoenix','Arizona (Phoenix)'],['America/Toronto','Canada Eastern (Toronto)'],['America/Vancouver','Canada Pacific (Vancouver)'],['Europe/London','United Kingdom (London)'],['Europe/Rome','Italy (Rome)'],['Europe/Paris','France (Paris)'],['Europe/Berlin','Germany (Berlin)'],['Asia/Dubai','UAE (Dubai)'],['Asia/Kolkata','India (Kolkata)'],['Asia/Tokyo','Japan (Tokyo)'],['Asia/Shanghai','China (Shanghai)'],['Australia/Sydney','Australia (Sydney)'],['Pacific/Auckland','New Zealand (Auckland)']
];
const DYNAMICS = {
  custom:{label:'Upload my own dynamics (Recommended)',description:'Your real relationship tone, boundaries and conversation style.',prompt:''},
  romantic:{label:'Romantic Call',description:'Warm, affectionate and emotionally attentive.',prompt:'Use a warm, affectionate and emotionally attentive romantic tone. Stay grounded in supplied relationship context and do not invent intimacy, history or promises.'},
  dating:{label:'Dating / Getting to Know Each Other',description:'Warm, interested and lightly flirtatious.',prompt:'Use a warm, interested and lightly flirtatious getting-to-know-you dynamic without assuming a deeper relationship than the context supports.'},
  friendship:{label:'Friendship Call',description:'Relaxed, familiar and friendly.',prompt:'Use a relaxed, friendly and familiar friendship dynamic. Respond naturally and do not invent shared history.'},
  business:{label:'Business Call',description:'Professional, clear and goal-focused.',prompt:'Use a professional, clear and goal-oriented business dynamic. Be efficient and courteous.'},
  client:{label:'Professional / Client Call',description:'Polished and client-safe.',prompt:'Use a polished professional-client dynamic with clear professional boundaries. Do not invent promises, policies or authority.'},
  family:{label:'Family Call',description:'Warm and familiar.',prompt:'Use a warm, familiar family dynamic while relying only on supplied relationship details.'},
  supportive:{label:'Supportive / Check-in Call',description:'Caring and attentive.',prompt:'Use a supportive, attentive check-in dynamic. Listen closely and ask gentle natural follow-ups.'},
  reconnecting:{label:'Reconnecting Call',description:'Warm but measured.',prompt:'Use a warm but measured reconnecting dynamic and let familiarity rebuild naturally.'},
  casual:{label:'Casual Call',description:'Light and easygoing.',prompt:'Use a light, easygoing casual-call dynamic and follow the other person’s lead.'},
  formal:{label:'Formal Call',description:'Respectful and restrained.',prompt:'Use a formal, respectful and composed dynamic with restrained language.'}
};
const DEFAULT_ADMIN = {
  maleVoice:'cedar', femaleVoice:'marin', model:'gpt-realtime-2.1',
  instructions:'Have a natural live spoken conversation using the supplied context. Do not read system context aloud. Keep replies natural, appropriately brief, emotionally aware and grounded in the facts provided. Never invent personal history, relationship milestones, promises or sensitive facts that were not supplied or established during the current call.',
  opening:'Start naturally as soon as the call connects. Use the relationship, current topic and both callers’ local times when relevant.',
  speakFirst:true, interruptions:true
};

let account = null;
let data = null;
let composerSeed = null;
let openThreadId = null;
let live = {pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,muted:false,audioMuted:false,held:false,current:null,transcript:'',graceful:false};

const $ = id => document.getElementById(id);
const jsonLoad = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const jsonSave = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials = (name='U') => (name.trim()[0] || 'U').toUpperCase();
function toast(message){ $('toast').textContent=message; $('toast').classList.remove('hidden'); clearTimeout(toast.t); toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2400); }
function fmtDuration(sec){ const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60; return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function fmtDate(iso){ try{return new Date(iso).toLocaleString();}catch{return iso;} }
function nowFor(tz){ try{return new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date());}catch{return new Date().toString();} }
function dataKey(){ return `callfocus_account_data_v3_${account.id}`; }
function getAdmin(){ return {...DEFAULT_ADMIN, ...jsonLoad(ROOT_KEYS.admin,{})}; }
function defaultData(){ return {profile:{name:account?.name||'',role:'',about:'',rules:''},settings:{preferredVoiceGender:'male',preferredDynamics:'custom',autoMemory:true,speakFirst:true},callers:[],history:[]}; }
function saveData(){ jsonSave(dataKey(), data); render(); }
async function hashText(text){ const bytes=new TextEncoder().encode(text); const digest=await crypto.subtle.digest('SHA-256',bytes); return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''); }

function initOptions(){
  const tz=TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  $('callerATimezone').innerHTML=tz; $('callerBTimezone').innerHTML=tz;
  const dyn=Object.entries(DYNAMICS).map(([v,d])=>`<option value="${v}">${d.label}</option>`).join('');
  $('callerDynamicsMode').innerHTML=dyn; $('callDynamicsMode').innerHTML=dyn; $('preferredDynamics').innerHTML=dyn;
}

function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  $('signupForm').classList.toggle('hidden',tab!=='signup'); $('signinForm').classList.toggle('hidden',tab!=='signin');
}
function scrollAuth(tab){ switchAuthTab(tab); $('authCard').scrollIntoView({behavior:'smooth',block:'center'}); }

async function createAccount(e){
  e.preventDefault();
  const name=$('signupName').value.trim(), email=$('signupEmail').value.trim().toLowerCase(), password=$('signupPassword').value, confirm=$('signupConfirm').value;
  if(!name||!email||!password) return toast('Complete all account fields');
  if(password.length<8) return toast('Use at least 8 characters for the password');
  if(password!==confirm) return toast('Passwords do not match');
  const accounts=jsonLoad(ROOT_KEYS.accounts,[]);
  if(accounts.some(a=>a.email===email)) return toast('An account with this email already exists on this device');
  const newAccount={id:uuid(),name,email,passwordHash:await hashText(password),createdAt:new Date().toISOString()};
  accounts.push(newAccount); jsonSave(ROOT_KEYS.accounts,accounts); jsonSave(ROOT_KEYS.active,newAccount.id); account=newAccount; data=defaultData(); jsonSave(dataKey(),data); enterApp(); toast('Account created');
}
async function signIn(e){
  e.preventDefault();
  const email=$('signinEmail').value.trim().toLowerCase(), password=$('signinPassword').value;
  const accounts=jsonLoad(ROOT_KEYS.accounts,[]); const found=accounts.find(a=>a.email===email);
  if(!found || found.passwordHash!==await hashText(password)) return toast('Email or password is incorrect');
  account=found; jsonSave(ROOT_KEYS.active,found.id); data={...defaultData(),...jsonLoad(`callfocus_account_data_v3_${found.id}`,defaultData())}; enterApp(); toast('Signed in');
}
function signOut(){ jsonSave(ROOT_KEYS.active,''); account=null; data=null; $('appShell').classList.add('hidden'); $('authShell').classList.remove('hidden'); $('headerAccountActions').classList.remove('hidden'); $('headerUser').classList.add('hidden'); $('accountPopover').classList.add('hidden'); switchAuthTab('signin'); window.scrollTo({top:0,behavior:'smooth'}); }
function restoreSession(){
  const active=jsonLoad(ROOT_KEYS.active,''); if(!active) return;
  const found=jsonLoad(ROOT_KEYS.accounts,[]).find(a=>a.id===active); if(!found) return;
  account=found; data={...defaultData(),...jsonLoad(`callfocus_account_data_v3_${found.id}`,defaultData())}; enterApp();
}

function enterApp(){
  $('authShell').classList.add('hidden'); $('appShell').classList.remove('hidden'); $('headerAccountActions').classList.add('hidden'); $('headerUser').classList.remove('hidden');
  $('headerAvatarBtn').textContent=initials(account.name); $('sidebarAvatar').textContent=initials(account.name); $('sidebarUserName').textContent=account.name; $('sidebarUserEmail').textContent=account.email; $('accountPopoverName').textContent=account.name; $('accountPopoverEmail').textContent=account.email;
  loadDataForms(); render(); switchView('home');
}
function loadDataForms(){
  $('profileName').value=data.profile.name||account.name; $('profileRole').value=data.profile.role||''; $('profileAbout').value=data.profile.about||''; $('profileRules').value=data.profile.rules||'';
  $('preferredVoiceGender').value=data.settings.preferredVoiceGender||'male'; $('preferredDynamics').value=data.settings.preferredDynamics||'custom'; $('autoMemory').checked=data.settings.autoMemory!==false; $('personalSpeakFirst').checked=data.settings.speakFirst!==false;
}

function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.querySelectorAll('.side-link[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('view-'+view)?.classList.add('active'); const names={home:['Dashboard','Home'],callers:['People','My callers'],history:['Conversation history','Recent calls'],profile:['Account profile','My profile'],settings:['Preferences','Settings']}; $('viewKicker').textContent=names[view]?.[0]||'Dashboard'; $('viewTitle').textContent=names[view]?.[1]||'Home'; closeMenu();
}
function openMenu(){ $('sidebar').classList.add('open'); $('mobileMenuBackdrop').classList.remove('hidden'); }
function closeMenu(){ $('sidebar').classList.remove('open'); $('mobileMenuBackdrop').classList.add('hidden'); }
function openModal(id){ $(id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closeModal(id){ $(id).classList.add('hidden'); if(document.querySelectorAll('.modal-backdrop:not(.hidden)').length===0 && $('callScreen').classList.contains('hidden')) document.body.style.overflow=''; }

function updateDynamics(scope){
  const mode=$(scope+'DynamicsMode').value||'custom', custom=$(scope+'DynamicsCustomWrap'), help=$(scope+'DynamicsHelp'), preset=DYNAMICS[mode]||DYNAMICS.custom; custom.classList.toggle('hidden',mode!=='custom'); help.classList.toggle('hidden',mode==='custom'); if(mode!=='custom') help.innerHTML=`<strong>${esc(preset.label)}</strong><br>${esc(preset.description)} Custom dynamics are still recommended when available.`;
}
function resolvedDynamics(mode,custom){ const p=DYNAMICS[mode]||DYNAMICS.custom; return mode==='custom'?(custom.trim()||'No custom dynamics were supplied. Use the saved context conservatively and do not invent relationship tone or history.'):`${p.label}: ${p.prompt}`; }

function render(){
  if(!data) return; const admin=getAdmin(); $('statCallers').textContent=data.callers.length; $('statCalls').textContent=data.history.length; $('statVoicePair').textContent=`${admin.maleVoice} / ${admin.femaleVoice}`; $('welcomeHeading').textContent=`Welcome back, ${(data.profile.name||account.name).split(' ')[0]}`;
  renderCallers(); renderThreads('historyList',data.history); renderThreads('homeRecentList',data.history.slice(0,4));
  $('callSavedCaller').innerHTML='<option value="">One-off / unsaved caller</option>'+data.callers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
}
function renderCallers(){
  $('callerList').innerHTML=data.callers.length?data.callers.map(c=>`<article class="caller-card"><div class="caller-avatar">${esc(initials(c.name))}</div><div><div class="caller-name">${esc(c.name)}</div><div class="caller-meta">${esc(c.relationship||'Saved caller')}</div><div class="caller-preview">${esc((c.memory||c.about||'No recent memory saved yet.').slice(0,150))}</div></div><div class="caller-actions"><button class="small-btn" data-action="call-caller" data-id="${c.id}">Call</button><button class="small-btn" data-action="edit-caller" data-id="${c.id}">Edit</button><button class="small-btn" data-action="delete-caller" data-id="${c.id}">Delete</button></div></article>`).join(''):`<div class="empty-state">No callers yet. Add someone once and CallFocus will reuse their saved information on future calls.</div>`;
}
function renderThreads(target,items){
  $(target).innerHTML=items.length?items.map(h=>`<article class="thread-item" data-thread-row="${h.id}"><div class="thread-avatar">${esc(initials(h.callerName))}</div><div><div class="thread-title">${esc(h.callerName||'Call')}</div><div class="thread-sub">${esc(h.title||'Untitled call')}</div><div class="thread-meta">${esc(h.topic||'Continued from saved context')} · ${esc(fmtDate(h.createdAt))} · ${esc(h.duration||'00:00')}</div></div><div class="thread-actions"><button class="small-btn" data-action="open-thread" data-id="${h.id}">Open</button><button class="small-btn" data-action="call-again" data-id="${h.id}">Call again</button></div></article>`).join(''):`<div class="empty-state">No previous calls yet. Completed calls will appear here as reusable conversation threads.</div>`;
}

function blankCaller(){ $('callerModalTitle').textContent='Add caller'; $('callerId').value=''; ['callerName','callerRelationship','callerAbout','callerAboutMe','callerDynamics','callerMemory','callerRules'].forEach(id=>$(id).value=''); $('callerDynamicsMode').value='custom'; updateDynamics('caller'); }
function editCaller(c){ $('callerModalTitle').textContent='Edit caller'; $('callerId').value=c.id; $('callerName').value=c.name||''; $('callerRelationship').value=c.relationship||''; $('callerAbout').value=c.about||''; $('callerAboutMe').value=c.aboutMe||''; $('callerDynamicsMode').value=c.dynamicsMode||'custom'; $('callerDynamics').value=c.dynamics||''; $('callerMemory').value=c.memory||''; $('callerRules').value=c.rules||''; updateDynamics('caller'); }
function saveCaller(){ const name=$('callerName').value.trim(); if(!name)return toast('Caller name is required'); const item={id:$('callerId').value||uuid(),name,relationship:$('callerRelationship').value.trim(),about:$('callerAbout').value.trim(),aboutMe:$('callerAboutMe').value.trim(),dynamicsMode:$('callerDynamicsMode').value||'custom',dynamics:$('callerDynamics').value.trim(),memory:$('callerMemory').value.trim(),rules:$('callerRules').value.trim()}; const i=data.callers.findIndex(c=>c.id===item.id); if(i>=0)data.callers[i]=item;else data.callers.unshift(item); saveData(); closeModal('callerModal'); toast('Caller saved'); }

function resetComposer(){
  composerSeed=null; $('callModalTitle').textContent='New call'; $('callSavedCaller').value=''; ['callTitle','callManualName','callManualRelationship','callTopic','callDynamics','callerARegion','callerBRegion','callOpeningOverride','callAboutCaller','callMemory','callRules'].forEach(id=>$(id).value=''); $('callAboutSelf').value=data.profile.about||''; $('callDynamicsMode').value=data.settings.preferredDynamics||'custom'; $('callerATimezone').value='Africa/Lagos'; $('callerBTimezone').value='America/New_York'; $('callVoiceGender').value=data.settings.preferredVoiceGender||'male'; $('callBriefFileName').textContent='TXT or MD'; updateDynamics('call');
}
function hydrateCaller(id){ const c=data.callers.find(x=>x.id===id); if(!c)return; $('callManualName').value=c.name||''; $('callManualRelationship').value=c.relationship||''; $('callAboutCaller').value=c.about||''; $('callAboutSelf').value=c.aboutMe||data.profile.about||''; $('callDynamicsMode').value=c.dynamicsMode||'custom'; $('callDynamics').value=c.dynamics||''; $('callMemory').value=c.memory||''; $('callRules').value=c.rules||''; updateDynamics('call'); }
function openComposer(seed=null){
  resetComposer(); composerSeed=seed;
  if(seed?.type==='caller'){ const c=data.callers.find(x=>x.id===seed.id); if(c){$('callModalTitle').textContent=`Call ${c.name}`; $('callSavedCaller').value=c.id; hydrateCaller(c.id);} }
  if(seed?.type==='history'){ const h=data.history.find(x=>x.id===seed.id); if(h){$('callModalTitle').textContent=`Continue with ${h.callerName}`; $('callSavedCaller').value=h.callerId||''; $('callTitle').value=h.title||''; $('callManualName').value=h.callerName||''; $('callManualRelationship').value=h.relationship||''; $('callTopic').value=''; $('callDynamicsMode').value=h.dynamicsMode||'custom'; $('callDynamics').value=h.rawDynamics||''; $('callerARegion').value=h.callerA?.region||''; $('callerBRegion').value=h.callerB?.region||''; $('callerATimezone').value=h.callerA?.timezone||'Africa/Lagos'; $('callerBTimezone').value=h.callerB?.timezone||'America/New_York'; $('callVoiceGender').value=h.voiceGender||data.settings.preferredVoiceGender||'male'; $('callAboutCaller').value=h.aboutCaller||''; $('callAboutSelf').value=h.aboutSelf||data.profile.about||''; $('callMemory').value=data.settings.autoMemory!==false?(h.memory||''):''; $('callRules').value=h.callerRules||''; updateDynamics('call');} }
  openModal('callModal');
}
function assembleCall(){
  const admin=getAdmin(), caller=data.callers.find(c=>c.id===$('callSavedCaller').value), gender=$('callVoiceGender').value, name=caller?.name||$('callManualName').value.trim(), rel=caller?.relationship||$('callManualRelationship').value.trim(); return {callerId:caller?.id||'',callerName:name,relationship:rel,title:$('callTitle').value.trim()||`${name||'Call'}`,topic:$('callTopic').value.trim(),callerA:{region:$('callerARegion').value.trim(),timezone:$('callerATimezone').value,localTime:nowFor($('callerATimezone').value)},callerB:{region:$('callerBRegion').value.trim(),timezone:$('callerBTimezone').value,localTime:nowFor($('callerBTimezone').value)},voiceGender:gender,voice:gender==='female'?admin.femaleVoice:admin.maleVoice,model:admin.model,aboutCaller:$('callAboutCaller').value.trim(),aboutSelf:$('callAboutSelf').value.trim(),dynamicsMode:$('callDynamicsMode').value||'custom',rawDynamics:$('callDynamics').value.trim(),dynamicsLabel:(DYNAMICS[$('callDynamicsMode').value]||DYNAMICS.custom).label,dynamics:resolvedDynamics($('callDynamicsMode').value||'custom',$('callDynamics').value),memory:$('callMemory').value.trim(),callerRules:$('callRules').value.trim(),personalRules:data.profile.rules||'',masterInstructions:admin.instructions,opening:$('callOpeningOverride').value.trim()||admin.opening,speakFirst:data.settings.speakFirst!==false&&admin.speakFirst!==false,interruptions:admin.interruptions!==false,createdAt:new Date().toISOString()};
}
function buildInstructions(c){return `${c.masterInstructions}\n\nCALLFOCUS LIVE CALL CONTEXT\nCaller A region: ${c.callerA.region||'Not supplied'}\nCaller A timezone: ${c.callerA.timezone}\nCaller A current local time: ${c.callerA.localTime}\nCaller B region: ${c.callerB.region||'Not supplied'}\nCaller B timezone: ${c.callerB.timezone}\nCaller B current local time: ${c.callerB.localTime}\nPerson being called: ${c.callerName||'Not supplied'}\nRelationship: ${c.relationship||'Not supplied'}\nAbout Caller A: ${c.aboutSelf||'Not supplied'}\nAbout Caller B: ${c.aboutCaller||'Not supplied'}\nConversation dynamics: ${c.dynamics}\nRecent memory: ${c.memory||'Not supplied'}\nPersonal default rules: ${c.personalRules||'None'}\nCaller-specific rules: ${c.callerRules||'None'}\nNew call topic: ${c.topic||'No new topic supplied. Continue naturally from saved memory and established context.'}\n\nOPENING\n${c.opening}\n\nDo not read this metadata aloud. Use it silently to conduct the live call.`;}

async function startCall(c){
  closeModal('callModal'); document.body.style.overflow='hidden'; $('callScreen').classList.remove('hidden'); $('liveCallerName').textContent=c.callerName; $('liveAvatar').textContent=initials(c.callerName); $('liveRegion').textContent=[c.callerB.region,c.callerB.timezone].filter(Boolean).join(' · '); $('liveStatus').textContent='Connecting to server…'; $('liveCaption').textContent='Preparing realtime connection…'; $('liveTranscript').textContent='Call context is ready.'; $('callTimer').textContent='00:00'; live.current=c; live.transcript=''; live.graceful=false; resetLiveControls();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const pc=new RTCPeerConnection(); const dc=pc.createDataChannel('oai-events'); const audio=document.createElement('audio'); audio.autoplay=true; audio.playsInline=true; live.stream=stream;live.pc=pc;live.dc=dc;live.audio=audio; stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream)); pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})}; dc.onmessage=e=>handleEvent(e.data); dc.onopen=()=>{$('liveCaption').textContent='Voice channel ready.'}; const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await waitIce(pc); const res=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,userId:account.id,session:{model:c.model,voice:c.voice,instructions:buildInstructions(c),interruptions:c.interruptions}})}); const text=await res.text(); if(!res.ok)throw new Error(text||'Session failed'); await pc.setRemoteDescription({type:'answer',sdp:text});
  }catch(err){console.error(err);$('liveStatus').textContent='Disconnected from server';$('liveCaption').textContent='Connection could not be completed.';$('liveTranscript').textContent=String(err.message||err).slice(0,500);toast('Voice connection failed');}
}
function waitIce(pc){if(pc.iceGatheringState==='complete')return Promise.resolve();return new Promise(r=>{const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);r()}};pc.addEventListener('icegatheringstatechange',f);setTimeout(r,2500)});}
function handleEvent(raw){let e;try{e=JSON.parse(raw)}catch{return}if(e.type==='session.created'){$('liveStatus').textContent='Connected to server';$('liveCaption').textContent='Call started.';startTimer();if(live.current?.speakFirst&&live.dc?.readyState==='open')setTimeout(()=>live.dc.send(JSON.stringify({type:'response.create',response:{instructions:`Begin the call now. ${live.current.opening}`}})),150)}if(e.type==='input_audio_buffer.speech_started')$('liveStatus').textContent='Connected to server · Listening';if(e.type==='input_audio_buffer.speech_stopped')$('liveStatus').textContent='Connected to server · Thinking';if(e.type==='response.created')$('liveStatus').textContent='Connected to server · Speaking';if(e.type==='response.done'){$('liveStatus').textContent=live.held?'Connected to server · On hold':'Connected to server';if(live.graceful){$('liveCaption').textContent='Call wrap-up delivered. End the call when ready.';live.graceful=false}}if(e.type==='response.output_audio_transcript.delta'&&e.delta){live.transcript+=e.delta;$('liveTranscript').textContent=live.transcript.slice(-1200)}if(e.type==='conversation.item.input_audio_transcription.completed'&&e.transcript)$('liveCaption').textContent=`Heard: ${e.transcript}`;if(e.type==='error'){$('liveStatus').textContent='Disconnected from server';$('liveCaption').textContent=e.error?.message||'Realtime error';}}
function startTimer(){clearInterval(live.timer);live.seconds=0;live.timer=setInterval(()=>{$('callTimer').textContent=fmtDuration(++live.seconds)},1000)}
function resetLiveControls(){live.muted=false;live.audioMuted=false;live.held=false;['muteBtn','audioBtn','holdBtn'].forEach(id=>$(id).classList.remove('active'));}
function saveHistory(c){data.history.unshift({id:uuid(),callerId:c.callerId,callerName:c.callerName,relationship:c.relationship,title:c.title,topic:c.topic,callerA:c.callerA,callerB:c.callerB,voiceGender:c.voiceGender,voice:c.voice,aboutCaller:c.aboutCaller,aboutSelf:c.aboutSelf,dynamicsMode:c.dynamicsMode,rawDynamics:c.rawDynamics,memory:c.memory,callerRules:c.callerRules,duration:fmtDuration(live.seconds),createdAt:new Date().toISOString()});data.history=data.history.slice(0,150);saveData();}
function cleanup(save=true){clearInterval(live.timer);if(save&&live.current)saveHistory(live.current);try{live.dc?.close()}catch{}try{live.stream?.getTracks().forEach(t=>t.stop())}catch{}try{live.pc?.close()}catch{}live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,muted:false,audioMuted:false,held:false,current:null,transcript:'',graceful:false};$('callScreen').classList.add('hidden');document.body.style.overflow='';render();}

function openThread(id){const h=data.history.find(x=>x.id===id);if(!h)return;openThreadId=id;$('threadModalTitle').textContent=h.callerName||'Call thread';$('threadDetail').innerHTML=`<div class="detail-row"><strong>Call name</strong><p>${esc(h.title||'Untitled call')}</p></div><div class="detail-row"><strong>Last call topic</strong><p>${esc(h.topic||'No new topic was supplied.')}</p></div><div class="detail-row"><strong>Relationship</strong><p>${esc(h.relationship||'Not supplied')}</p></div><div class="detail-row"><strong>Saved memory</strong><p>${esc(h.memory||'No saved memory')}</p></div><div class="detail-row"><strong>Last call</strong><p>${esc(fmtDate(h.createdAt))} · ${esc(h.duration||'00:00')}</p></div>`;openModal('threadModal');}

function saveProfile(){data.profile={name:$('profileName').value.trim()||account.name,role:$('profileRole').value.trim(),about:$('profileAbout').value.trim(),rules:$('profileRules').value.trim()};saveData();toast('Profile saved');}
function saveSettings(){data.settings={preferredVoiceGender:$('preferredVoiceGender').value,preferredDynamics:$('preferredDynamics').value,autoMemory:$('autoMemory').checked,speakFirst:$('personalSpeakFirst').checked};saveData();toast('Settings saved');}

function bind(){
  document.querySelectorAll('.auth-tab').forEach(b=>b.onclick=()=>switchAuthTab(b.dataset.authTab)); $('headerSignInBtn').onclick=()=>scrollAuth('signin'); $('headerCreateBtn').onclick=()=>scrollAuth('signup'); $('signupForm').onsubmit=createAccount; $('signinForm').onsubmit=signIn;
  document.querySelectorAll('.side-link[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view)); document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>switchView(b.dataset.viewTarget)); $('menuBtn').onclick=openMenu; $('mobileMenuBackdrop').onclick=closeMenu;
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  $('newCallTopBtn').onclick=()=>openComposer();$('homeNewCallBtn').onclick=()=>openComposer();$('addCallerTopBtn').onclick=()=>{blankCaller();openModal('callerModal')};$('addCallerBtn').onclick=()=>{blankCaller();openModal('callerModal')};
  $('saveCallerBtn').onclick=saveCaller;$('saveProfileBtn').onclick=saveProfile;$('saveSettingsBtn').onclick=saveSettings;$('signOutBtn').onclick=signOut;$('popoverSignOutBtn').onclick=signOut;$('popoverProfileBtn').onclick=()=>{switchView('profile');$('accountPopover').classList.add('hidden')};
  $('headerAvatarBtn').onclick=e=>{e.stopPropagation();$('accountPopover').classList.toggle('hidden')};document.addEventListener('click',e=>{if(!$('accountPopover').contains(e.target)&&e.target!==$('headerAvatarBtn'))$('accountPopover').classList.add('hidden')});
  $('callerDynamicsMode').onchange=()=>updateDynamics('caller');$('callDynamicsMode').onchange=()=>updateDynamics('call');$('callSavedCaller').onchange=e=>hydrateCaller(e.target.value);
  $('callBriefFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{$('callTopic').value=await file.text();$('callBriefFileName').textContent=file.name;}catch{toast('Could not read that file')}};
  $('startCallBtn').onclick=()=>{const c=assembleCall();if(!c.callerName)return toast('Enter the person name or select a saved caller');if(!c.callerA.region||!c.callerB.region)return toast('Enter both callers’ regions');startCall(c)};
  $('threadCallAgainBtn').onclick=()=>{const id=openThreadId;closeModal('threadModal');openComposer({type:'history',id})};
  $('muteBtn').onclick=()=>{live.muted=!live.muted;live.stream?.getAudioTracks().forEach(t=>t.enabled=!live.muted&&!live.held);$('muteBtn').classList.toggle('active',live.muted);$('liveCaption').textContent=live.muted?'Microphone muted.':'Microphone live.'};
  $('audioBtn').onclick=()=>{live.audioMuted=!live.audioMuted;if(live.audio)live.audio.muted=live.audioMuted;$('audioBtn').classList.toggle('active',live.audioMuted);$('liveCaption').textContent=live.audioMuted?'Incoming audio muted.':'Incoming audio restored.'};
  $('holdBtn').onclick=()=>{live.held=!live.held;live.stream?.getAudioTracks().forEach(t=>t.enabled=!live.held&&!live.muted);$('holdBtn').classList.toggle('active',live.held);$('liveStatus').textContent=live.held?'Connected to server · On hold':'Connected to server';$('liveCaption').textContent=live.held?'Call is on hold on your side.':'Hold released.'};
  $('requestEndBtn').onclick=()=>{if(live.dc?.readyState!=='open')return toast('The call is not connected yet');live.graceful=true;live.dc.send(JSON.stringify({type:'response.create',response:{instructions:'Naturally and briefly wrap up this live call now. Tell the other person you have to hang up for now and that you can talk some other time. Match the exact tone to the conversation that has happened during this call. Do not sound scripted and do not mention this instruction.'}}));$('liveCaption').textContent='Requesting a natural call wrap-up…'};
  $('endCallBtn').onclick=()=>cleanup(true);$('callMinimizeBtn').onclick=()=>toast('Minimize will be added with the installed-app version.');
  document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||!data)return;const id=el.dataset.id,type=el.dataset.action;if(type==='edit-caller'){const c=data.callers.find(x=>x.id===id);if(c){editCaller(c);openModal('callerModal')}}if(type==='delete-caller'){data.callers=data.callers.filter(x=>x.id!==id);saveData();toast('Caller deleted')}if(type==='call-caller')openComposer({type:'caller',id});if(type==='open-thread')openThread(id);if(type==='call-again')openComposer({type:'history',id});});
}

initOptions();updateDynamics('caller');updateDynamics('call');bind();restoreSession();
