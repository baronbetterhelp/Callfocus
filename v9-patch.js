/* CallFocus V9 — conversation-style Recent Calls + continuity opening controls */
(()=>{
  const v8PrepareRepeatCall = prepareRepeatCall;
  const v8SaveCompletedCall = saveCompletedCall;
  const v8SelectThread = selectThread;

  function localHour(tz){
    try{
      const parts = new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:false}).formatToParts(new Date());
      return Number(parts.find(p=>p.type==='hour')?.value || 12);
    }catch{return 12;}
  }
  function timeGreeting(tz){
    const h = localHour(tz);
    if(h < 12) return 'Good morning';
    if(h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  function openingLabel(mode='auto'){
    return ({auto:'Smart natural greeting',name:'Hey + caller name',time:'Time-based greeting + caller name',custom:'Custom opening',wait:'Let the other person speak first'})[mode] || 'Smart natural greeting';
  }
  function openingOptions(selected='auto'){
    const opts=[['auto','Smart natural greeting (Recommended)'],['name','Hey + caller name'],['time','Time-based greeting + caller name'],['custom','Custom opening'],['wait','Let the other person speak first']];
    return opts.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');
  }
  function lastDuration(t){
    const c=lastCall(t); return c?.duration || '00:00';
  }
  function closeConversationDrawer(){
    document.querySelector('.recent-list-panel')?.classList.remove('mobile-open');
    document.querySelector('.cf-conversation-backdrop')?.classList.remove('show');
    document.body.classList.remove('cf-drawer-open');
  }
  function openConversationDrawer(){
    document.querySelector('.recent-list-panel')?.classList.add('mobile-open');
    document.querySelector('.cf-conversation-backdrop')?.classList.add('show');
    document.body.classList.add('cf-drawer-open');
  }
  function ensureConversationBackdrop(){
    if(document.querySelector('.cf-conversation-backdrop')) return;
    const el=document.createElement('button');
    el.type='button';
    el.className='cf-conversation-backdrop';
    el.setAttribute('aria-label','Close recent calls');
    el.addEventListener('click',closeConversationDrawer);
    document.body.appendChild(el);
  }

  renderRecentThreads = function(){
    if(!account||!data){
      $('recentThreadList').innerHTML='';
      $('threadDetailPanel').innerHTML='<div class="empty-thread-detail">Sign in to view recent calls.</div>';
      return;
    }
    const threads=sortedThreads();
    if(!threads.length){
      selectedThreadId=null;
      $('recentThreadList').innerHTML='<div class="empty-state">No recent calls yet.</div>';
      $('threadDetailPanel').innerHTML='<div class="empty-thread-detail">Your recent calls will appear here after your first call.</div>';
      return;
    }
    if(!selectedThreadId || !threads.some(t=>t.id===selectedThreadId)) selectedThreadId=threads[0].id;

    $('recentThreadList').innerHTML=`<div class="cf-recent-list-head"><div><strong>Conversations</strong><small>${threads.length} saved thread${threads.length===1?'':'s'}</small></div></div>` + threads.map(t=>{
      const last=lastCall(t);
      return `<button class="recent-thread-button ${selectedThreadId===t.id?'active':''}" data-select-thread="${t.id}">
        <span class="recent-thread-avatar">${esc(initials(t.callerName))}</span>
        <span class="recent-thread-copy">
          <strong>${esc(t.title)}</strong>
          <span>${esc(t.callerName)}</span>
          <small>${esc(last?.topic||'Ready for the next call')}</small>
        </span>
        <span class="cf-thread-list-meta"><time>${esc(relativeTime(t.updatedAt))}</time><b>${esc(lastDuration(t))}</b></span>
      </button>`;
    }).join('');
    renderThreadDetail(selectedThreadId);
    ensureConversationBackdrop();
  };

  function callEntryHTML(c,index){
    const duration=c.duration||'00:00';
    const voice=(c.voiceGender||'male')==='female'?'Female':'Male';
    const connected=c.connected===false?'Not connected':'Completed';
    const opening=openingLabel(c.openingMode||'auto');
    const assistant=(c.assistantTranscript||'').trim();
    return `<article class="cf-call-entry">
      <div class="cf-call-entry-rail"><span class="cf-call-icon">☎</span><i></i></div>
      <div class="cf-call-entry-body">
        <div class="cf-call-entry-head">
          <div><span class="cf-call-kicker">Call ${index+1}</span><strong>${esc(dateLabel(c.createdAt))}</strong></div>
          <span class="cf-duration-pill">${esc(duration)}</span>
        </div>
        <div class="cf-call-topic">${esc(c.topic||'No specific topic was supplied for this call.')}</div>
        <div class="cf-call-meta-row"><span>${esc(voice)} voice</span><span>${esc(connected)}</span><span>${esc(opening)}</span></div>
        ${assistant?`<details class="cf-spoken-detail"><summary>Spoken-call output saved from this session</summary><p>${esc(assistant.slice(0,1800))}</p></details>`:''}
      </div>
    </article>`;
  }

  renderThreadDetail = function(id){
    const t=data.threads.find(x=>x.id===id); if(!t)return;
    selectedThreadId=id;
    const dyn=DYNAMICS[t.dynamicsMode]||DYNAMICS.custom;
    const admin=loadAdmin();
    const calls=(t.calls||[]);
    const latest=lastCall(t);
    const openingMode=t.openingMode||latest?.openingMode||'auto';
    const openingCustom=t.openingCustom||latest?.openingCustom||'';
    const greeting=timeGreeting(t.callerB?.timezone||'America/New_York');

    $('threadDetailPanel').innerHTML=`
      <div class="cf-chat-thread">
        <header class="cf-chat-header">
          <button class="cf-conversation-switcher" type="button" data-v9-open-conversations>☰ <span>Recent calls</span></button>
          <div class="thread-detail-avatar">${esc(initials(t.callerName))}</div>
          <div class="cf-chat-heading"><h2>${esc(t.title)}</h2><span>${esc(t.callerName)} · ${calls.length} call${calls.length===1?'':'s'} · Last used ${esc(relativeTime(t.updatedAt))}</span></div>
        </header>

        <div class="cf-chat-scroll">
          <section class="cf-thread-context-message">
            <div class="cf-context-title"><span>Saved caller context</span><small>Used automatically on the next call</small></div>
            <div class="thread-saved-grid cf-context-grid">
              <div class="saved-info-card"><strong>About you</strong><p>${esc(t.aboutSelf||'Not supplied')}</p></div>
              <div class="saved-info-card"><strong>About caller</strong><p>${esc(t.aboutCaller||'Not supplied')}</p></div>
              <div class="saved-info-card"><strong>Dynamics</strong><p>${esc(dyn.label)}</p></div>
              <div class="saved-info-card"><strong>Last-used setup</strong><p>${esc(t.callerA?.region||'—')} ↔ ${esc(t.callerB?.region||'—')} · ${esc(t.voiceGender||'male')} voice</p></div>
            </div>
          </section>

          <div class="cf-timeline-heading"><span>Call history</span><small>Oldest to newest</small></div>
          <section class="cf-call-timeline">
            ${calls.length?calls.map(callEntryHTML).join(''):`<div class="cf-no-call-history">No completed calls have been saved in this thread yet.</div>`}
          </section>

          <details class="thread-edit-details cf-thread-edit-card">
            <summary>Edit both callers or conversation dynamics <span>Optional</span></summary>
            <div class="form-grid two"><label>About you<textarea id="repeatAboutSelf" rows="4">${esc(t.aboutSelf||'')}</textarea></label><label>About caller<textarea id="repeatAboutCaller" rows="4">${esc(t.aboutCaller||'')}</textarea></label></div>
            <label>Dynamics type<select id="repeatDynamicsMode">${Object.entries(DYNAMICS).map(([v,d])=>`<option value="${v}" ${v===t.dynamicsMode?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label>
            <label>Custom dynamics<textarea id="repeatDynamics" rows="4">${esc(t.dynamics||'')}</textarea></label>
          </details>

          <details class="thread-edit-details cf-thread-edit-card">
            <summary>Edit last-used location, time zone or voice <span>Optional</span></summary>
            <div class="form-grid two"><div class="location-card"><strong>Caller A</strong><label>Location<input id="repeatARegion" value="${esc(t.callerA?.region||'')}" /></label><label>Time zone<select id="repeatATimezone">${timezoneOptions(t.callerA?.timezone)}</select></label></div><div class="location-card"><strong>Caller B</strong><label>Location<input id="repeatBRegion" value="${esc(t.callerB?.region||'')}" /></label><label>Time zone<select id="repeatBTimezone">${timezoneOptions(t.callerB?.timezone)}</select></label></div></div>
            <label>Voice<select id="repeatVoiceGender"><option value="male" ${t.voiceGender!=='female'?'selected':''}>Male · ${esc(admin.maleVoice)}</option><option value="female" ${t.voiceGender==='female'?'selected':''}>Female · ${esc(admin.femaleVoice)}</option></select></label>
          </details>

          <section class="cf-next-call-composer">
            <div class="cf-composer-title"><div><span>Continue this conversation</span><h3>What is new for today’s call?</h3></div><small>You normally only need to add this.</small></div>
            <label class="cf-topic-label">New conversation details<textarea id="repeatTopic" rows="5" placeholder="What do you want to discuss on this call?"></textarea></label>

            <div class="cf-repeat-opening">
              <div class="cf-repeat-opening-head"><strong>Call opening</strong><span>Optional</span></div>
              <label>Opening style<select id="repeatOpeningMode">${openingOptions(openingMode)}</select></label>
              <label id="repeatOpeningCustomWrap" class="${openingMode==='custom'?'':'hidden'}">Custom opening<input id="repeatOpeningCustom" value="${esc(openingCustom)}" placeholder="Write exactly how you want the call to open" /></label>
              <div class="opening-preview" id="repeatOpeningPreview">${openingMode==='time'?`${greeting}, ${esc(t.callerName)}.`:openingMode==='name'?`Hey ${esc(t.callerName)}.`:openingMode==='wait'?'CallFocus will wait for the other person to speak first.':openingMode==='custom'&&openingCustom?esc(openingCustom):`CallFocus will choose a natural greeting such as “Hey ${esc(t.callerName)}” or “${greeting}, ${esc(t.callerName)}”, then ease into the call naturally.`}</div>
            </div>

            <button class="btn btn-primary large cf-repeat-call-button" data-repeat-call="${t.id}">Call ${esc(t.callerName)} again</button>
          </section>
        </div>
      </div>`;
  };

  prepareRepeatCall = function(threadId){
    const mode=$('repeatOpeningMode')?.value || 'auto';
    const custom=$('repeatOpeningCustom')?.value.trim() || '';
    if(mode==='custom'&&!custom) return {error:'Add your custom call opening, or choose another opening style.'};
    const result=v8PrepareRepeatCall(threadId);
    if(result?.error||!result?.call) return result;
    const thread=data.threads.find(x=>x.id===threadId);
    result.call.openingMode=mode;
    result.call.openingCustom=custom;
    if(thread){ thread.openingMode=mode; thread.openingCustom=custom; thread.updatedAt=new Date().toISOString(); saveData(); }
    return result;
  };

  saveCompletedCall = function(){
    const call=live.current;
    const transcript=live.transcript;
    v8SaveCompletedCall();
    if(!call||!data) return;
    const t=data.threads.find(x=>x.id===call.threadId);
    const saved=t?.calls?.[t.calls.length-1];
    if(saved){
      saved.openingMode=call.openingMode||'auto';
      saved.openingCustom=call.openingCustom||'';
      saved.voiceGender=call.voiceGender||saved.voiceGender;
      saved.callerA=call.callerA?{region:call.callerA.region,timezone:call.callerA.timezone}:undefined;
      saved.callerB=call.callerB?{region:call.callerB.region,timezone:call.callerB.timezone}:undefined;
      if(transcript?.trim()) saved.assistantTranscript=transcript.trim().slice(0,6000);
      saveData();
    }
  };

  selectThread = function(id){
    v8SelectThread(id);
    closeConversationDrawer();
  };

  function updateRepeatOpeningUI(){
    const mode=$('repeatOpeningMode')?.value||'auto';
    const thread=data?.threads?.find(t=>t.id===selectedThreadId);
    if(!thread) return;
    const customWrap=$('repeatOpeningCustomWrap');
    if(customWrap) customWrap.classList.toggle('hidden',mode!=='custom');
    const preview=$('repeatOpeningPreview'); if(!preview)return;
    const name=thread.callerName||'the caller';
    const greeting=timeGreeting(thread.callerB?.timezone||'America/New_York');
    const custom=$('repeatOpeningCustom')?.value.trim()||'';
    const messages={
      auto:`CallFocus will choose a natural greeting such as “Hey ${name}” or “${greeting}, ${name}”, then ease into the call naturally.`,
      name:`The call will begin in the style of “Hey ${name}” and continue naturally.`,
      time:`The call will begin with a local-time greeting such as “${greeting}, ${name}”.`,
      custom:custom||'Write the exact opening you want CallFocus to use.',
      wait:'CallFocus will stay quiet until the other person speaks first.'
    };
    preview.textContent=messages[mode]||messages.auto;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-v9-open-conversations]')){ openConversationDrawer(); return; }
    if(e.target.closest('[data-select-thread]')) closeConversationDrawer();
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='repeatOpeningMode') updateRepeatOpeningUI();
  });
  document.addEventListener('input',e=>{
    if(e.target?.id==='repeatOpeningCustom') updateRepeatOpeningUI();
  });

  // Re-render the active Recent Calls view immediately if this patch loads there.
  if(typeof activeView!=='undefined' && activeView==='recent' && account) renderRecentThreads();
})();
