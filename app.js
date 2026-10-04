const $ = (id) => document.getElementById(id);
const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const ACCOUNTS_KEY = 'callfocus_accounts_v4';
const SESSION_KEY = 'callfocus_session_v4';
const ADMIN_KEY = 'callfocus_admin_global_v4';
const LEGACY_ADMIN_KEY = 'callfocus_admin_global_v3';
const VOICES = ['alloy','ash','ballad','coral','echo','sage','shimmer','verse','marin','cedar'];
const TIMEZONES = [
  ['Africa/Lagos','Nigeria / West Africa (Lagos)'],['America/Los_Angeles','US Pacific (Los Angeles)'],['America/Denver','US Mountain (Denver)'],['America/Chicago','US Central (Chicago)'],['America/New_York','US Eastern (New York)'],['America/Phoenix','Arizona (Phoenix)'],['America/Toronto','Canada Eastern (Toronto)'],['America/Vancouver','Canada Pacific (Vancouver)'],['Europe/London','United Kingdom (London)'],['Europe/Rome','Italy (Rome)'],['Europe/Paris','France (Paris)'],['Europe/Berlin','Germany (Berlin)'],['Asia/Dubai','UAE (Dubai)'],['Asia/Kolkata','India (Kolkata)'],['Asia/Tokyo','Japan (Tokyo)'],['Asia/Shanghai','China (Shanghai)'],['Australia/Sydney','Australia (Sydney)'],['Pacific/Auckland','New Zealand (Auckland)']
];
const DYNAMICS = {
  custom:{label:'Upload my own dynamics (Recommended)',description:'Describe the real tone, relationship patterns, boundaries and conversational style.',prompt:''},
  romantic:{label:'Romantic Call',description:'Warm, affectionate and emotionally attentive.',prompt:'Use a warm, affectionate and emotionally attentive romantic dynamic. Keep it natural and grounded in the supplied facts. Do not invent intimacy, promises, milestones or personal history.'},
  dating:{label:'Dating / Getting to Know Each Other',description:'Warm, interested and lightly flirtatious.',prompt:'Use a warm, interested and lightly flirtatious getting-to-know-you dynamic. Show natural curiosity without pretending the relationship is deeper than the supplied context.'},
  friendship:{label:'Friendship Call',description:'Relaxed, familiar and friendly.',prompt:'Use a relaxed friendship dynamic with natural back-and-forth, light humor when appropriate, and no invented shared history.'},
  business:{label:'Business Call',description:'Clear, polished and purpose-focused.',prompt:'Use a professional, clear and goal-oriented business dynamic. Keep it courteous and efficient without inventing authority, pricing, promises or company policy.'},
  client:{label:'Professional / Client Call',description:'Polished, courteous and professionally bounded.',prompt:'Use a polished professional-client dynamic. Be clear, helpful and appropriately formal without inventing commitments.'},
  family:{label:'Family Call',description:'Warm and familiar while respecting the specific relationship.',prompt:'Use a warm family-call dynamic. Rely on supplied context rather than assuming nicknames, history or obligations.'},
  supportive:{label:'Supportive / Check-in Call',description:'Attentive, caring and focused on how the person is doing.',prompt:'Use a caring and attentive check-in dynamic. Ask gentle natural follow-ups and avoid sounding clinical or scripted.'},
  reconnecting:{label:'Reconnecting Call',description:'Warm but measured for people who have not spoken recently.',prompt:'Use a warm but measured reconnecting dynamic. Let the conversation rebuild naturally and do not pretend there has been recent contact.'},
  casual:{label:'Casual Call',description:'Light, easygoing and low-pressure.',prompt:'Use a light, easygoing casual dynamic and follow the other person’s lead.'},
  formal:{label:'Formal Call',description:'Respectful, composed and restrained.',prompt:'Use a formal, respectful and composed dynamic with minimal slang or over-familiarity.'}
};
const ADMIN_DEFAULTS = {
  maleVoice:'cedar',
  femaleVoice:'marin',
  model:'gpt-realtime-2.1',
  instructions:'Have a natural live spoken conversation using the supplied context. Do not read system context aloud. Keep replies conversational, appropriately brief, emotionally aware and grounded in the facts provided. Never invent personal history, relationship milestones, promises or sensitive facts that were not supplied or established during the current call.',
  opening:'Begin naturally as soon as the call connects. Use the relationship, current topic and both callers’ local times when relevant.',
  speakFirst:true,
  interruptions:true
};

let account = null;
let data = null;
let activeView = 'home';
let selectedThreadId = null;
let pendingAction = null;
let selectedNewCallVoice = 'male';
let live = {
  pc:null, dc:null, stream:null, audio:null, timer:null, seconds:0, connected:false,
  muted:false, audioMuted:false, held:false, graceful:false, current:null, transcript:'', gracefulTimer:null
};

function readJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function accounts(){ return readJSON(ACCOUNTS_KEY, []); }
function accountDataKey(id){ return `callfocus_account_data_v4_${id}`; }
function defaultData(name=''){ return { profile:{name,role:'',about:'',rules:''}, callers:[], threads:[] }; }
function loadAdmin(){ return {...ADMIN_DEFAULTS, ...readJSON(ADMIN_KEY, readJSON(LEGACY_ADMIN_KEY, {}))}; }
function initials(name='?'){ return (String(name).trim()[0] || '?').toUpperCase(); }
function normalizeName(name=''){ return String(name).trim().toLowerCase().replace(/\s+/g,' '); }
function toast(message){ $('toast').textContent = message; $('toast').classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(()=>$('toast').classList.add('hidden'), 2400); }
function fmtDuration(seconds=0){ const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60; return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function nowInTimezone(tz){ try { return new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date()); } catch { return new Date().toString(); } }
function relativeTime(iso){
  if(!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.floor(diff/60000));
  if(min < 1) return 'Just now'; if(min < 60) return `${min}m ago`;
  const hr = Math.floor(min/60); if(hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr/24); if(day === 1) return 'Yesterday'; if(day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
function dateLabel(iso){ try { return new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}); } catch { return iso || ''; } }
async function sha256(text){ const bytes=new TextEncoder().encode(text); const digest=await crypto.subtle.digest('SHA-256',bytes); return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function sortedThreads(){ return [...(data?.threads || [])].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)); }
function lastCall(thread){ return thread?.calls?.length ? thread.calls[thread.calls.length-1] : null; }
function dynamicsText(mode, custom){ const preset=DYNAMICS[mode]||DYNAMICS.custom; return mode==='custom' ? (String(custom||'').trim() || 'No custom dynamics were supplied. Use the saved caller information conservatively without inventing relationship history or tone.') : `${preset.label}: ${preset.prompt}`; }

function initOptions(){
  const tz = TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  $('newCallATimezone').innerHTML = tz; $('newCallBTimezone').innerHTML = tz;
  const dyn = Object.entries(DYNAMICS).map(([v,d])=>`<option value="${v}">${d.label}</option>`).join('');
  $('newCallDynamicsMode').innerHTML = dyn; $('callerDynamicsMode').innerHTML = dyn;
  $('newCallATimezone').value = 'Africa/Lagos'; $('newCallBTimezone').value = 'America/New_York';
  updateDynamicsUI('newCall'); updateDynamicsUI('caller');
}
function updateDynamicsUI(scope){
  const mode = $(scope+'DynamicsMode').value || 'custom';
  const wrap = $(scope+'DynamicsCustomWrap');
  const help = $(scope+'DynamicsHelp');
  const preset = DYNAMICS[mode] || DYNAMICS.custom;
  wrap.classList.toggle('hidden', mode !== 'custom');
  help.classList.toggle('hidden', mode === 'custom');
  if(mode !== 'custom') help.innerHTML = `<strong>${esc(preset.label)}</strong><br>${esc(preset.description)} This is a general fallback. Custom dynamics are still recommended whenever you know the real relationship context.`;
}
function applyAdminLabels(){
  const admin = loadAdmin();
  $('maleVoiceLabel').textContent = admin.maleVoice;
  $('femaleVoiceLabel').textContent = admin.femaleVoice;
  if($('homeVoicePair')) $('homeVoicePair').textContent = `${admin.maleVoice} / ${admin.femaleVoice}`;
}

function motionInit(){
  const page = $('pageRoot');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!reduce) requestAnimationFrame(()=>page.classList.add('motion-ready'));
  const nodes = qsa('[data-reveal]');
  if(reduce || !('IntersectionObserver' in window)){ nodes.forEach(n=>n.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }),{threshold:.12,rootMargin:'0px 0px -2% 0px'});
  nodes.forEach(n=>{ n.classList.add('reveal-pending'); observer.observe(n); });
  let ticking=false;
  const syncParallax=()=>{ if(ticking)return; ticking=true; requestAnimationFrame(()=>{ const y=Math.min(window.scrollY||0,900), mobile=innerWidth<=620; page.style.setProperty('--cf-bg-shift',`${Math.round(y*(mobile?.018:.035))}px`); page.style.setProperty('--cf-copy-shift',`${Math.round(y*(mobile?-.006:-.012))}px`); page.style.setProperty('--cf-geo-shift',`${Math.round(y*(mobile?.012:.022))}px`); ticking=false; }); };
  syncParallax(); window.addEventListener('scroll',syncParallax,{passive:true});
}

function openModal(id){ $(id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closeModal(id){ $(id).classList.add('hidden'); if(qsa('.modal-backdrop:not(.hidden)').length===0 && $('callScreen').classList.contains('hidden')) document.body.style.overflow=''; }
function switchAuthTab(tab){ qsa('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab)); $('signupForm').classList.toggle('hidden',tab!=='signup'); $('signinForm').classList.toggle('hidden',tab!=='signin'); }
function showAuth(tab='signup', action=null, message=''){ pendingAction=action; switchAuthTab(tab); $('authModalTitle').textContent=tab==='signin'?'Sign in to CallFocus':'Create your CallFocus account'; $('authModalMessage').textContent=message || 'Your saved callers and recent call threads stay attached to this account.'; openModal('authModal'); }

function requireAccount(action, message){ if(account) return true; showAuth('signup',action,message || 'Create an account or sign in to save your caller context and recent call threads.'); return false; }
function runPendingAction(){ const action=pendingAction; pendingAction=null; if(!action)return; setTimeout(()=>{ if(action.type==='newcall') openNewCall(); if(action.type==='addcaller') openCallerModal(); if(action.type==='route') showView(action.route); if(action.type==='thread') { showView('recent'); selectThread(action.id); } },100); }

function setSession(acc){ account=acc; localStorage.setItem(SESSION_KEY,acc.id); data=readJSON(accountDataKey(acc.id),defaultData(acc.name)); if(!data.profile) data.profile=defaultData(acc.name).profile; data.profile.name ||= acc.name; data.callers ||= []; data.threads ||= []; saveData(); }
function saveData(){ if(!account||!data)return; writeJSON(accountDataKey(account.id),data); renderAccountUI(); renderWorkspace(); }
function restoreSession(){ const id=localStorage.getItem(SESSION_KEY); if(!id){ account=null; data=null; renderAccountUI(); renderWorkspace(); return; } const acc=accounts().find(a=>a.id===id); if(!acc){localStorage.removeItem(SESSION_KEY);account=null;data=null;renderAccountUI();renderWorkspace();return;} setSession(acc); }
async function createAccount(event){
  event.preventDefault(); const name=$('signupName').value.trim(),email=$('signupEmail').value.trim().toLowerCase(),password=$('signupPassword').value,confirm=$('signupConfirm').value;
  if(!name||!email||!password) return toast('Complete all account fields');
  if(password.length<8) return toast('Password must be at least 8 characters');
  if(password!==confirm) return toast('Passwords do not match');
  const list=accounts(); if(list.some(a=>a.email===email)) return toast('An account already exists for that email');
  const acc={id:uuid(),name,email,passwordHash:await sha256(password),createdAt:new Date().toISOString()}; list.push(acc); writeJSON(ACCOUNTS_KEY,list); setSession(acc); closeModal('authModal'); toast('Account created'); runPendingAction();
}
async function signIn(event){
  event.preventDefault(); const email=$('signinEmail').value.trim().toLowerCase(),password=$('signinPassword').value; const acc=accounts().find(a=>a.email===email); if(!acc)return toast('Account not found'); if(await sha256(password)!==acc.passwordHash)return toast('Incorrect password'); setSession(acc); closeModal('authModal'); toast('Signed in'); runPendingAction();
}
function signOut(){ localStorage.removeItem(SESSION_KEY); account=null; data=null; selectedThreadId=null; closeMobileMenu(); $('headerAccountDropdown').classList.add('hidden'); showView('home',false); renderAccountUI(); renderWorkspace(); toast('Signed out'); }
function deleteAccount(){ if(!account)return; if($('deleteConfirmInput').value.trim()!=='DELETE')return toast('Type DELETE to confirm'); const list=accounts().filter(a=>a.id!==account.id); writeJSON(ACCOUNTS_KEY,list); localStorage.removeItem(accountDataKey(account.id)); localStorage.removeItem(SESSION_KEY); account=null;data=null;selectedThreadId=null;closeModal('deleteAccountModal');showView('home',false);renderAccountUI();renderWorkspace();toast('Account deleted'); }

function renderAccountUI(){
  const guest=!account;
  $('guestHeaderActions').classList.toggle('hidden',!guest); $('headerAccountMenu').classList.toggle('hidden',guest);
  if(account){ $('headerAccountAvatar').textContent=initials(account.name); $('headerAccountLabel').textContent=(data?.profile?.name||account.name).split(' ')[0]; $('dropdownName').textContent=data?.profile?.name||account.name; $('dropdownEmail').textContent=account.email; }
  renderMobileAccount();
  $('customerHomePanel').classList.toggle('hidden',guest);
}
function renderMobileAccount(){
  if(!account){ $('mobileAccountBlock').innerHTML=`<div class="mobile-account-profile"><div class="mobile-account-avatar">C</div><div><strong>Browsing as guest</strong><small>Create an account when you are ready to save callers or place a call.</small></div></div><div class="mobile-account-actions"><button class="btn btn-ghost" data-mobile-auth="signin">Sign in</button><button class="btn btn-primary" data-mobile-auth="signup">Create account</button></div>`; }
  else { $('mobileAccountBlock').innerHTML=`<div class="mobile-account-profile"><div class="mobile-account-avatar">${esc(initials(data?.profile?.name||account.name))}</div><div><strong>${esc(data?.profile?.name||account.name)}</strong><small>${esc(account.email)}</small></div></div><div class="mobile-account-actions"><button class="btn btn-ghost" data-mobile-account="settings">Account settings</button><button class="btn btn-primary" data-mobile-account="signout">Sign out</button></div>`; }
}
function renderWorkspace(){
  applyAdminLabels(); renderHomeThreads(); renderCallers(); renderRecentThreads(); renderMobileRecents(); renderProfile(); renderSettings();
}
function renderHomeThreads(){
  if(!account||!data){ $('homeRecentThreads').innerHTML=''; return; }
  $('homeCallerCount').textContent=data.callers.length; $('homeThreadCount').textContent=data.threads.length;
  const hour=new Date().getHours(); $('customerGreeting').textContent=`Good ${hour<12?'morning':hour<18?'afternoon':'evening'}, ${(data.profile.name||account.name).split(' ')[0]}.`;
  const threads=sortedThreads().slice(0,4); $('homeRecentThreads').innerHTML=threads.length?threads.map(threadPreviewHTML).join(''):`<div class="empty-state">Your recent call threads will appear here after your first call.</div>`;
}
function threadPreviewHTML(t){ const last=lastCall(t); return `<button class="thread-preview-item" data-open-thread="${t.id}"><span class="thread-avatar">${esc(initials(t.callerName))}</span><span><strong>${esc(t.title)}</strong><span>${esc(t.callerName)} · ${esc(relativeTime(t.updatedAt))}</span></span><small>${esc(last?.topic||'Ready for the next call')}</small><b class="thread-arrow">›</b></button>`; }
function renderCallers(){
  if(!account||!data){ $('callerGrid').innerHTML=''; return; }
  $('callerGrid').innerHTML=data.callers.length?data.callers.map(c=>`<article class="caller-card"><div class="caller-avatar">${esc(initials(c.name))}</div><div><h3>${esc(c.name)}</h3><p>${esc((c.aboutCaller||'No caller details yet').slice(0,150))}</p><span class="caller-dynamics-chip">${esc((DYNAMICS[c.dynamicsMode]||DYNAMICS.custom).label)}</span></div><div class="caller-actions"><button class="btn btn-primary" data-caller-call="${c.id}">Call</button><button class="btn btn-ghost" data-caller-edit="${c.id}">Edit</button><button class="btn btn-ghost" data-caller-delete="${c.id}">Delete</button></div></article>`).join(''):`<div class="empty-state">No callers saved yet. Add a caller or start a completely new call.</div>`;
}
function renderRecentThreads(){
  if(!account||!data){ $('recentThreadList').innerHTML=''; $('threadDetailPanel').innerHTML='<div class="empty-thread-detail">Sign in to view recent calls.</div>'; return; }
  const threads=sortedThreads(); $('recentThreadList').innerHTML=threads.length?threads.map(t=>{const last=lastCall(t);return `<button class="recent-thread-button ${selectedThreadId===t.id?'active':''}" data-select-thread="${t.id}"><span class="recent-thread-avatar">${esc(initials(t.callerName))}</span><span class="recent-thread-copy"><strong>${esc(t.title)}</strong><span>${esc(t.callerName)}</span><small>${esc(last?.topic||'No recent topic')}</small></span><time class="recent-thread-time">${esc(relativeTime(t.updatedAt))}</time></button>`}).join(''):`<div class="empty-state">No recent calls yet.</div>`;
  if(selectedThreadId && threads.some(t=>t.id===selectedThreadId)) renderThreadDetail(selectedThreadId); else if(threads.length){ selectedThreadId=threads[0].id; renderRecentThreads(); } else $('threadDetailPanel').innerHTML='<div class="empty-thread-detail">Your recent calls will appear here after your first call.</div>';
}
function renderMobileRecents(){
  const list=$('mobileRecentList'); if(!account||!data){ list.innerHTML='<div class="empty-state" style="border:0;border-radius:0;padding:18px">Sign in to see your recent calls.</div>'; return; }
  const threads=sortedThreads(); list.innerHTML=threads.length?threads.map(t=>`<button class="mobile-recent-item" data-mobile-thread="${t.id}"><span class="mobile-recent-avatar">${esc(initials(t.callerName))}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.callerName)} · ${esc(relativeTime(t.updatedAt))}</small></span></button>`).join(''):`<div class="empty-state" style="border:0;border-radius:0;padding:18px">No recent calls yet.</div>`;
}
function renderProfile(){ if(!account||!data)return; $('profileName').value=data.profile.name||account.name; $('profileRole').value=data.profile.role||''; $('profileAbout').value=data.profile.about||''; $('profileRules').value=data.profile.rules||''; }
function renderSettings(){ if(!account)return; $('settingsName').textContent=data?.profile?.name||account.name; $('settingsEmail').textContent=account.email; $('settingsCreated').textContent=dateLabel(account.createdAt); }

function renderThreadDetail(id){
  const t=data.threads.find(x=>x.id===id); if(!t)return; selectedThreadId=id; const last=lastCall(t); const dyn=DYNAMICS[t.dynamicsMode]||DYNAMICS.custom; const admin=loadAdmin();
  $('threadDetailPanel').innerHTML=`<div class="thread-detail"><div class="thread-detail-head"><div class="thread-detail-avatar">${esc(initials(t.callerName))}</div><div><h2>${esc(t.title)}</h2><span>${esc(t.callerName)} · Last used ${esc(relativeTime(t.updatedAt))}</span></div></div><div class="thread-saved-grid"><div class="saved-info-card"><strong>About you</strong><p>${esc(t.aboutSelf||'Not supplied')}</p></div><div class="saved-info-card"><strong>About caller</strong><p>${esc(t.aboutCaller||'Not supplied')}</p></div><div class="saved-info-card"><strong>Dynamics</strong><p>${esc(dyn.label)}</p></div><div class="saved-info-card"><strong>Last call setup</strong><p>${esc(t.callerA.region||'—')} ↔ ${esc(t.callerB.region||'—')} · ${esc(t.voiceGender||'male')}</p></div></div><div class="repeat-call-box"><div><h3>What is new for today’s call?</h3><p>This is normally the only thing you need to add before calling again.</p></div><label>New conversation details<textarea id="repeatTopic" rows="5" placeholder="What do you want to discuss on this call?"></textarea></label><button class="btn btn-primary large" data-repeat-call="${t.id}">Call ${esc(t.callerName)} again</button></div><details class="thread-edit-details"><summary>Edit both callers or conversation dynamics (optional)</summary><div class="form-grid two"><label>About you<textarea id="repeatAboutSelf" rows="4">${esc(t.aboutSelf||'')}</textarea></label><label>About caller<textarea id="repeatAboutCaller" rows="4">${esc(t.aboutCaller||'')}</textarea></label></div><label>Dynamics type<select id="repeatDynamicsMode">${Object.entries(DYNAMICS).map(([v,d])=>`<option value="${v}" ${v===t.dynamicsMode?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label><label>Custom dynamics<textarea id="repeatDynamics" rows="4">${esc(t.dynamics||'')}</textarea></label></details><details class="thread-edit-details"><summary>Edit last-used location, time zone or voice (optional)</summary><div class="form-grid two"><div class="location-card"><strong>Caller A</strong><label>Location<input id="repeatARegion" value="${esc(t.callerA.region||'')}" /></label><label>Time zone<select id="repeatATimezone">${timezoneOptions(t.callerA.timezone)}</select></label></div><div class="location-card"><strong>Caller B</strong><label>Location<input id="repeatBRegion" value="${esc(t.callerB.region||'')}" /></label><label>Time zone<select id="repeatBTimezone">${timezoneOptions(t.callerB.timezone)}</select></label></div></div><label>Voice<select id="repeatVoiceGender"><option value="male" ${t.voiceGender!=='female'?'selected':''}>Male · ${esc(admin.maleVoice)}</option><option value="female" ${t.voiceGender==='female'?'selected':''}>Female · ${esc(admin.femaleVoice)}</option></select></label></details><div class="thread-edit-details"><summary style="cursor:default">Call history in this thread</summary><div class="thread-history-mini">${(t.calls||[]).slice().reverse().slice(0,8).map(c=>`<div class="call-history-line"><span>${esc(c.topic||'No topic supplied')}</span><span>${esc(dateLabel(c.createdAt))} · ${esc(c.duration||'00:00')}</span></div>`).join('')||'<div class="call-history-line"><span>No completed calls saved yet.</span></div>'}</div></div></div>`;
}
function timezoneOptions(selected){ return TIMEZONES.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${esc(l)}</option>`).join(''); }
function selectThread(id){ if(!account)return; selectedThreadId=id; renderRecentThreads(); }

function showView(view, scroll=true){
  if(['callers','recent','profile','settings'].includes(view) && !account){ requireAccount({type:'route',route:view},'Create an account or sign in to open your saved CallFocus workspace.'); return; }
  activeView=view; qsa('.page-view').forEach(p=>p.classList.toggle('active',p.dataset.view===view)); qsa('.nav-anchor').forEach(n=>n.classList.toggle('active',n.dataset.route===view));
  closeMobileMenu(); $('headerAccountDropdown').classList.add('hidden');
  if(view==='recent') renderRecentThreads(); if(view==='profile')renderProfile(); if(view==='settings')renderSettings();
  if(scroll) window.scrollTo({top:0,behavior:'smooth'});
}
function openMobileMenu(){ $('mobileMenuWrap').classList.remove('hidden'); $('mobileMenuBtn').setAttribute('aria-expanded','true'); $('mobileMenuBtn').querySelector('.menu-glyph').textContent='×'; renderMobileAccount(); renderMobileRecents(); }
function closeMobileMenu(){ $('mobileMenuWrap').classList.add('hidden'); $('mobileMenuBtn').setAttribute('aria-expanded','false'); $('mobileMenuBtn').querySelector('.menu-glyph').textContent='☰'; }

function resetNewCallForm(){
  $('newCallForm').reset(); $('newCallAboutSelf').value=data?.profile?.about||''; $('newCallDynamicsMode').value='custom'; $('newCallDynamics').value=''; $('newCallATimezone').value='Africa/Lagos'; $('newCallBTimezone').value='America/New_York'; selectedNewCallVoice='male'; $('newCallVoiceGender').value='male'; qsa('.voice-option').forEach(b=>b.classList.toggle('active',b.dataset.voice==='male')); updateDynamicsUI('newCall'); applyAdminLabels();
}
function openNewCall(prefillCaller=null){
  if(!requireAccount({type:'newcall'},'Create an account or sign in before placing a call. Your caller details and recent-call thread will then be saved to your account.'))return;
  resetNewCallForm();
  if(prefillCaller){ $('newCallPersonName').value=prefillCaller.name||''; $('newCallAboutSelf').value=prefillCaller.aboutSelf||data.profile.about||''; $('newCallAboutCaller').value=prefillCaller.aboutCaller||''; $('newCallDynamicsMode').value=prefillCaller.dynamicsMode||'custom'; $('newCallDynamics').value=prefillCaller.dynamics||''; updateDynamicsUI('newCall'); }
  openModal('newCallModal');
}
function openCallerModal(caller=null){
  if(!requireAccount({type:'addcaller'},'Create an account or sign in before saving a caller.'))return;
  $('callerForm').reset(); $('callerId').value=caller?.id||''; $('callerModalTitle').textContent=caller?'Edit caller':'Add caller'; $('callerName').value=caller?.name||''; $('callerAboutSelf').value=caller?.aboutSelf||data.profile.about||''; $('callerAboutCaller').value=caller?.aboutCaller||''; $('callerDynamicsMode').value=caller?.dynamicsMode||'custom'; $('callerDynamics').value=caller?.dynamics||''; updateDynamicsUI('caller'); openModal('callerModal');
}
function saveCallerFromForm(event){
  event.preventDefault(); const name=$('callerName').value.trim(); if(!name)return toast('Caller name is required'); const item={id:$('callerId').value||uuid(),name,aboutSelf:$('callerAboutSelf').value.trim(),aboutCaller:$('callerAboutCaller').value.trim(),dynamicsMode:$('callerDynamicsMode').value,dynamics:$('callerDynamics').value.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; const index=data.callers.findIndex(c=>c.id===item.id); if(index>=0){item.createdAt=data.callers[index].createdAt;data.callers[index]=item}else data.callers.unshift(item); saveData(); closeModal('callerModal');toast('Caller saved');
}
function deleteCaller(id){ data.callers=data.callers.filter(c=>c.id!==id); saveData(); toast('Caller deleted'); }
function findLatestThreadForCaller(callerId){ return sortedThreads().find(t=>t.callerId===callerId); }

function createOrUpdateCallerFromCall(call){
  let caller = call.callerId ? data.callers.find(c=>c.id===call.callerId) : null;
  if(!caller){ caller={id:uuid(),name:call.callerName,aboutSelf:call.aboutSelf,aboutCaller:call.aboutCaller,dynamicsMode:call.dynamicsMode,dynamics:call.rawDynamics,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; data.callers.unshift(caller); }
  else Object.assign(caller,{name:call.callerName,aboutSelf:call.aboutSelf,aboutCaller:call.aboutCaller,dynamicsMode:call.dynamicsMode,dynamics:call.rawDynamics,updatedAt:new Date().toISOString()});
  call.callerId=caller.id; return caller;
}
function createThreadFromNewCall(call){
  const t={id:uuid(),title:call.title,callerId:call.callerId,callerName:call.callerName,aboutSelf:call.aboutSelf,aboutCaller:call.aboutCaller,dynamicsMode:call.dynamicsMode,dynamics:call.rawDynamics,callerA:{region:call.callerA.region,timezone:call.callerA.timezone},callerB:{region:call.callerB.region,timezone:call.callerB.timezone},voiceGender:call.voiceGender,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),calls:[]}; data.threads.unshift(t); call.threadId=t.id; selectedThreadId=t.id; return t;
}
function prepareNewCall(){
  const admin=loadAdmin(); const call={mode:'new',threadId:'',callerId:'',title:$('newCallTitle').value.trim(),callerName:$('newCallPersonName').value.trim(),aboutSelf:$('newCallAboutSelf').value.trim(),aboutCaller:$('newCallAboutCaller').value.trim(),dynamicsMode:$('newCallDynamicsMode').value,rawDynamics:$('newCallDynamics').value.trim(),topic:$('newCallTopic').value.trim(),callerA:{region:$('newCallARegion').value.trim(),timezone:$('newCallATimezone').value,localTime:nowInTimezone($('newCallATimezone').value)},callerB:{region:$('newCallBRegion').value.trim(),timezone:$('newCallBTimezone').value,localTime:nowInTimezone($('newCallBTimezone').value)},voiceGender:selectedNewCallVoice,voice:selectedNewCallVoice==='female'?admin.femaleVoice:admin.maleVoice,model:admin.model,instructions:admin.instructions,opening:admin.opening,speakFirst:admin.speakFirst!==false,interruptions:admin.interruptions!==false};
  if(!call.title||!call.callerName||!call.aboutSelf||!call.aboutCaller||!call.topic||!call.callerA.region||!call.callerB.region) return {error:'Complete all seven call sections before starting.'};
  if(call.dynamicsMode==='custom'&&!call.rawDynamics) return {error:'Add your conversation dynamics, or choose a preset.'};
  createOrUpdateCallerFromCall(call); createThreadFromNewCall(call); saveData(); return {call};
}
function prepareRepeatCall(threadId){
  const t=data.threads.find(x=>x.id===threadId); if(!t)return {error:'Call thread not found'}; const topic=$('repeatTopic')?.value.trim(); if(!topic)return {error:'Add what today’s call is about.'};
  const aboutSelf=$('repeatAboutSelf')?.value.trim() ?? t.aboutSelf, aboutCaller=$('repeatAboutCaller')?.value.trim() ?? t.aboutCaller, dynamicsMode=$('repeatDynamicsMode')?.value || t.dynamicsMode, rawDynamics=$('repeatDynamics')?.value.trim() ?? t.dynamics, aRegion=$('repeatARegion')?.value.trim()||t.callerA.region, bRegion=$('repeatBRegion')?.value.trim()||t.callerB.region, aTz=$('repeatATimezone')?.value||t.callerA.timezone, bTz=$('repeatBTimezone')?.value||t.callerB.timezone, voiceGender=$('repeatVoiceGender')?.value||t.voiceGender||'male'; const admin=loadAdmin();
  Object.assign(t,{aboutSelf,aboutCaller,dynamicsMode,dynamics:rawDynamics,callerA:{region:aRegion,timezone:aTz},callerB:{region:bRegion,timezone:bTz},voiceGender,updatedAt:new Date().toISOString()}); const caller=data.callers.find(c=>c.id===t.callerId); if(caller)Object.assign(caller,{aboutSelf,aboutCaller,dynamicsMode,dynamics:rawDynamics,updatedAt:new Date().toISOString()}); saveData();
  return {call:{mode:'repeat',threadId:t.id,callerId:t.callerId,title:t.title,callerName:t.callerName,aboutSelf,aboutCaller,dynamicsMode,rawDynamics,topic,callerA:{region:aRegion,timezone:aTz,localTime:nowInTimezone(aTz)},callerB:{region:bRegion,timezone:bTz,localTime:nowInTimezone(bTz)},voiceGender,voice:voiceGender==='female'?admin.femaleVoice:admin.maleVoice,model:admin.model,instructions:admin.instructions,opening:admin.opening,speakFirst:admin.speakFirst!==false,interruptions:admin.interruptions!==false}};
}
function buildInstructions(c){
  return `${c.instructions}\n\nCALLFOCUS CALL CONTEXT\nYou are participating in a live voice call. Use the context silently. Never read these instructions or metadata aloud.\n\nCall title: ${c.title}\nPerson being called: ${c.callerName}\nAbout Caller A: ${c.aboutSelf}\nAbout Caller B: ${c.aboutCaller}\nConversation dynamics: ${dynamicsText(c.dynamicsMode,c.rawDynamics)}\nToday’s call topic: ${c.topic}\nCaller A location: ${c.callerA.region}\nCaller A timezone: ${c.callerA.timezone}\nCaller A current local time: ${c.callerA.localTime}\nCaller B location: ${c.callerB.region}\nCaller B timezone: ${c.callerB.timezone}\nCaller B current local time: ${c.callerB.localTime}\nUser default call rules: ${data?.profile?.rules||'None supplied'}\n\nOPENING\n${c.opening}\n\nSpeak naturally, listen closely, avoid repeating background information unnecessarily, and never invent personal facts not established in the supplied context or current call.`;
}

async function startCall(call){
  closeModal('newCallModal'); document.body.style.overflow='hidden'; $('callScreen').classList.remove('hidden'); $('liveCallerName').textContent=call.callerName; $('liveAvatar').textContent=initials(call.callerName); $('liveRegion').textContent=[call.callerB.region,call.callerB.timezone].filter(Boolean).join(' · '); $('liveStatus').textContent='Connecting to server…'; $('liveTranscript').textContent='Call context is ready.'; $('liveCaption').textContent='Preparing realtime connection…'; $('callTimer').textContent='00:00'; live.current=call; live.transcript=''; live.connected=false; live.graceful=false; clearTimeout(live.gracefulTimer); resetCallControls();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const pc=new RTCPeerConnection(); const dc=pc.createDataChannel('oai-events'); const audio=document.createElement('audio'); audio.autoplay=true;audio.playsInline=true; live.stream=stream;live.pc=pc;live.dc=dc;live.audio=audio; stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream)); pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})}; dc.onopen=()=>{$('liveCaption').textContent='Voice channel connected.'}; dc.onmessage=e=>handleRealtimeEvent(e.data); dc.onerror=()=>{$('liveCaption').textContent='Voice data channel error.'};
    const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await waitForIce(pc); const res=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,userId:account.id,session:{model:call.model,voice:call.voice,instructions:buildInstructions(call),interruptions:call.interruptions}})}); const text=await res.text(); if(!res.ok)throw new Error(text||'Realtime session failed'); await pc.setRemoteDescription({type:'answer',sdp:text});
  }catch(err){ console.error(err); $('liveStatus').textContent='Disconnected from server'; $('liveCaption').textContent='The call could not connect.'; $('liveTranscript').textContent=String(err.message||err).slice(0,700); toast('Voice connection failed'); }
}
function waitForIce(pc){ if(pc.iceGatheringState==='complete')return Promise.resolve(); return new Promise(resolve=>{const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);resolve();}};pc.addEventListener('icegatheringstatechange',f);setTimeout(resolve,2500);}); }
function handleRealtimeEvent(raw){
  let e; try{e=JSON.parse(raw)}catch{return}
  if(e.type==='session.created'){ live.connected=true; $('liveStatus').textContent='Connected to server'; $('liveCaption').textContent='Call started.'; startTimer(); if(live.current?.speakFirst&&live.dc?.readyState==='open')setTimeout(()=>live.dc.send(JSON.stringify({type:'response.create',response:{instructions:`Begin the call now. ${live.current.opening}`}})),140); }
  if(e.type==='input_audio_buffer.speech_started')$('liveStatus').textContent='Connected to server · Listening';
  if(e.type==='input_audio_buffer.speech_stopped')$('liveStatus').textContent='Connected to server · Thinking';
  if(e.type==='response.created')$('liveStatus').textContent='Connected to server · Speaking';
  if(e.type==='response.done'){ $('liveStatus').textContent=live.held?'Connected to server · On hold':'Connected to server'; if(live.graceful){ $('liveCaption').textContent='Natural call ending delivered. Ending call…'; live.graceful=false; clearTimeout(live.gracefulTimer); live.gracefulTimer=setTimeout(()=>cleanupCall(true),5000); } }
  if(e.type==='response.output_audio_transcript.delta'&&e.delta){ live.transcript+=e.delta; $('liveTranscript').textContent=live.transcript.slice(-1200); }
  if(e.type==='conversation.item.input_audio_transcription.completed'&&e.transcript)$('liveCaption').textContent=`Heard: ${e.transcript}`;
  if(e.type==='error'){ $('liveStatus').textContent='Disconnected from server'; $('liveCaption').textContent=e.error?.message||'Realtime error'; }
}
function startTimer(){ clearInterval(live.timer);live.seconds=0;live.timer=setInterval(()=>{$('callTimer').textContent=fmtDuration(++live.seconds)},1000); }
function resetCallControls(){ live.muted=false;live.audioMuted=false;live.held=false;['muteBtn','audioBtn','holdBtn'].forEach(id=>$(id).classList.remove('active')); }
function saveCompletedCall(){ if(!live.current||!data)return; const t=data.threads.find(x=>x.id===live.current.threadId); if(!t)return; t.updatedAt=new Date().toISOString(); t.calls ||= []; t.calls.push({id:uuid(),topic:live.current.topic,createdAt:new Date().toISOString(),duration:fmtDuration(live.seconds),voiceGender:live.current.voiceGender,connected:live.connected}); saveData(); }
function cleanupCall(save=true){ clearInterval(live.timer);clearTimeout(live.gracefulTimer);if(save&&live.current)saveCompletedCall();try{live.dc?.close()}catch{}try{live.stream?.getTracks().forEach(t=>t.stop())}catch{}try{live.pc?.close()}catch{}live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,connected:false,muted:false,audioMuted:false,held:false,graceful:false,current:null,transcript:'',gracefulTimer:null};$('callScreen').classList.add('hidden');document.body.style.overflow='';renderWorkspace(); if(activeView==='recent')renderRecentThreads(); }

function saveProfile(){ if(!account)return; data.profile={name:$('profileName').value.trim()||account.name,role:$('profileRole').value.trim(),about:$('profileAbout').value.trim(),rules:$('profileRules').value.trim()}; const list=accounts(); const idx=list.findIndex(a=>a.id===account.id); if(idx>=0){list[idx].name=data.profile.name;account.name=data.profile.name;writeJSON(ACCOUNTS_KEY,list);} saveData();toast('Profile saved'); }

function bind(){
  $('mobileMenuBtn').onclick=()=>$('mobileMenuWrap').classList.contains('hidden')?openMobileMenu():closeMobileMenu();
  $('mobileMenuWrap').onclick=e=>{ if(e.target===$('mobileMenuWrap'))closeMobileMenu(); };
  $('headerSignInBtn').onclick=()=>showAuth('signin'); $('headerCreateBtn').onclick=()=>showAuth('signup');
  $('headerAccountTrigger').onclick=e=>{e.stopPropagation();$('headerAccountDropdown').classList.toggle('hidden');$('headerAccountTrigger').setAttribute('aria-expanded',String(!$('headerAccountDropdown').classList.contains('hidden')))};
  document.addEventListener('click',e=>{ if(!$('headerAccountDropdown').classList.contains('hidden')&&!$('headerAccountDropdown').contains(e.target)&&!$('headerAccountTrigger').contains(e.target))$('headerAccountDropdown').classList.add('hidden'); });
  qsa('.nav-anchor').forEach(b=>b.onclick=()=>showView(b.dataset.route)); qsa('[data-route]').filter(b=>!b.classList.contains('nav-anchor')).forEach(b=>b.onclick=()=>showView(b.dataset.route));
  $('heroHowBtn').onclick=()=>$('how-it-works').scrollIntoView({behavior:'smooth'}); ['heroNewCallBtn','customerNewCallBtn','bottomNewCallBtn'].forEach(id=>$(id).onclick=()=>openNewCall()); $('continuityRecentBtn').onclick=()=>showView('recent');
  $('headerAccountDropdown').addEventListener('click',e=>{const btn=e.target.closest('[data-account-route]');if(btn)showView(btn.dataset.accountRoute)}); $('dropdownSignOutBtn').onclick=signOut;
  $('signupForm').onsubmit=createAccount; $('signinForm').onsubmit=signIn; qsa('.auth-tab').forEach(b=>b.onclick=()=>switchAuthTab(b.dataset.authTab)); qsa('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close)); qsa('.modal-backdrop').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
  $('newCallDynamicsMode').onchange=()=>updateDynamicsUI('newCall'); $('callerDynamicsMode').onchange=()=>updateDynamicsUI('caller'); qsa('.voice-option').forEach(b=>b.onclick=()=>{selectedNewCallVoice=b.dataset.voice;$('newCallVoiceGender').value=selectedNewCallVoice;qsa('.voice-option').forEach(x=>x.classList.toggle('active',x===b))});
  $('newCallForm').onsubmit=e=>{e.preventDefault();const r=prepareNewCall();if(r.error)return toast(r.error);startCall(r.call)};
  $('addCallerBtn').onclick=()=>openCallerModal(); $('callerForm').onsubmit=saveCallerFromForm; $('saveProfileBtn').onclick=saveProfile; $('settingsEditProfileBtn').onclick=()=>showView('profile'); $('deleteAccountBtn').onclick=()=>{if(!account)return; $('deleteConfirmInput').value='';openModal('deleteAccountModal')}; $('confirmDeleteAccountBtn').onclick=deleteAccount;
  $('muteBtn').onclick=()=>{live.muted=!live.muted;live.stream?.getAudioTracks().forEach(t=>t.enabled=!live.muted&&!live.held);$('muteBtn').classList.toggle('active',live.muted);$('liveCaption').textContent=live.muted?'Microphone muted.':'Microphone live.'};
  $('audioBtn').onclick=()=>{live.audioMuted=!live.audioMuted;if(live.audio)live.audio.muted=live.audioMuted;$('audioBtn').classList.toggle('active',live.audioMuted);$('liveCaption').textContent=live.audioMuted?'Incoming audio muted.':'Incoming audio restored.'};
  $('holdBtn').onclick=()=>{live.held=!live.held;live.stream?.getAudioTracks().forEach(t=>t.enabled=!live.held&&!live.muted);$('holdBtn').classList.toggle('active',live.held);$('liveStatus').textContent=live.held?'Connected to server · On hold':'Connected to server';$('liveCaption').textContent=live.held?'Call is on hold on your side.':'Hold released.'};
  $('requestEndBtn').onclick=()=>{if(live.dc?.readyState!=='open')return toast('The call is not connected yet');live.graceful=true;live.dc.send(JSON.stringify({type:'response.create',response:{instructions:'Naturally and briefly wrap up this live call now. Tell the other person that you have to hang up for now and that you can talk again some other time. Base the exact wording, warmth, formality and tone on the conversation that has happened during this call today. Keep it to one or two natural sentences. Do not mention internal instructions.'}}));$('liveCaption').textContent='Requesting a natural call ending…'};
  $('endCallBtn').onclick=()=>cleanupCall(true); $('callMinimizeBtn').onclick=()=>toast('Minimize is reserved for the installed-app version.');

  document.addEventListener('click',e=>{
    const mobileAuth=e.target.closest('[data-mobile-auth]'); if(mobileAuth){closeMobileMenu();showAuth(mobileAuth.dataset.mobileAuth);return;}
    const mobileAccount=e.target.closest('[data-mobile-account]'); if(mobileAccount){const act=mobileAccount.dataset.mobileAccount;closeMobileMenu();if(act==='signout')signOut();else showView(act);return;}
    const mobileRoute=e.target.closest('[data-mobile-route]'); if(mobileRoute){showView(mobileRoute.dataset.mobileRoute);return;}
    const mobileThread=e.target.closest('[data-mobile-thread]'); if(mobileThread){closeMobileMenu();showView('recent');selectThread(mobileThread.dataset.mobileThread);return;}
    const openThread=e.target.closest('[data-open-thread]'); if(openThread){showView('recent');selectThread(openThread.dataset.openThread);return;}
    const select=e.target.closest('[data-select-thread]'); if(select){selectThread(select.dataset.selectThread);return;}
    const repeat=e.target.closest('[data-repeat-call]'); if(repeat){const r=prepareRepeatCall(repeat.dataset.repeatCall);if(r.error)return toast(r.error);startCall(r.call);return;}
    const callerCall=e.target.closest('[data-caller-call]'); if(callerCall){const caller=data.callers.find(c=>c.id===callerCall.dataset.callerCall);if(!caller)return;const thread=findLatestThreadForCaller(caller.id);if(thread){showView('recent');selectThread(thread.id);}else openNewCall(caller);return;}
    const callerEdit=e.target.closest('[data-caller-edit]'); if(callerEdit){const caller=data.callers.find(c=>c.id===callerEdit.dataset.callerEdit);if(caller)openCallerModal(caller);return;}
    const callerDelete=e.target.closest('[data-caller-delete]'); if(callerDelete){deleteCaller(callerDelete.dataset.callerDelete);return;}
  });
}

initOptions(); bind(); restoreSession(); applyAdminLabels(); renderWorkspace(); motionInit(); showView('home',false);
