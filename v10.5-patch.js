/* CallFocus V10.5 — composer-first Recent Calls + per-call copy details */
(()=>{
  function localHourV105(tz){
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:false}).formatToParts(new Date());
      return Number(parts.find(p=>p.type==='hour')?.value||12);
    }catch{return 12}
  }
  function timeGreetingV105(tz){const h=localHourV105(tz);return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
  function openingLabelV105(mode='auto'){
    return ({auto:'Smart natural greeting',name:'Hey + caller name',time:'Time-based greeting + caller name',custom:'Custom opening',wait:'Let the other person speak first'})[mode]||'Smart natural greeting';
  }
  function openingOptionsV105(selected='auto'){
    return [['auto','Smart natural greeting (Recommended)'],['name','Hey + caller name'],['time','Time-based greeting + caller name'],['custom','Custom opening'],['wait','Let the other person speak first']]
      .map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');
  }
  function copyTextV105(text){
    if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const area=document.createElement('textarea'); area.value=text; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select();
    try{document.execCommand('copy')}finally{area.remove()}
    return Promise.resolve();
  }
  function formatCallCopyV105(thread,call,index){
    const lines=[
      `CallFocus — ${thread.title || thread.callerName || 'Call'}`,
      `Call ${index+1}`,
      `Caller: ${thread.callerName || 'Not supplied'}`,
      `Date: ${dateLabel(call.createdAt)}`,
      `Duration: ${call.duration || '00:00'}`,
      `Status: ${call.connected===false?'Not connected':'Completed'}`,
      `Voice: ${(call.voiceGender||'male')==='female'?'Female':'Male'}`,
      `Opening: ${openingLabelV105(call.openingMode||'auto')}`,
      '',
      `Call details: ${call.topic || 'No specific topic supplied.'}`
    ];
    if(call.openingCustom) lines.push(`Custom opening: ${call.openingCustom}`);
    if((call.assistantTranscript||'').trim()) lines.push('',`Saved spoken output: ${call.assistantTranscript.trim()}`);
    return lines.join('\n');
  }
  function callEntryHTMLV105(thread,c,index){
    const duration=c.duration||'00:00';
    const voice=(c.voiceGender||'male')==='female'?'Female':'Male';
    const connected=c.connected===false?'Not connected':'Completed';
    const opening=openingLabelV105(c.openingMode||'auto');
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
        ${assistant?`<details class="cf-spoken-detail"><summary>Saved spoken output from this session</summary><p>${esc(assistant.slice(0,1800))}</p></details>`:''}
        <div class="cf-call-entry-actions"><button type="button" class="cf-copy-call-btn" data-copy-call-thread="${thread.id}" data-copy-call-index="${index}">⧉ <span>Copy call details</span></button></div>
      </div>
    </article>`;
  }

  // Override V9's thread detail so opening a conversation lands on the next-call
  // composer first. Saved context and history stay available farther down.
  renderThreadDetail=function(id){
    const t=data?.threads?.find(x=>x.id===id); if(!t)return;
    selectedThreadId=id;
    const dyn=DYNAMICS[t.dynamicsMode]||DYNAMICS.custom;
    const admin=loadAdmin();
    const calls=t.calls||[];
    const latest=lastCall(t);
    const openingMode=t.openingMode||latest?.openingMode||'auto';
    const openingCustom=t.openingCustom||latest?.openingCustom||'';
    const greeting=timeGreetingV105(t.callerB?.timezone||'America/New_York');

    $('threadDetailPanel').innerHTML=`
      <div class="cf-chat-thread">
        <header class="cf-chat-header">
          <button class="cf-conversation-switcher" type="button" data-v9-open-conversations>☰ <span>Recent calls</span></button>
          <div class="thread-detail-avatar">${esc(initials(t.callerName))}</div>
          <div class="cf-chat-heading"><h2>${esc(t.title)}</h2><span>${esc(t.callerName)} · ${calls.length} call${calls.length===1?'':'s'} · Last used ${esc(relativeTime(t.updatedAt))}</span></div>
        </header>

        <div class="cf-chat-scroll">
          <details class="thread-edit-details cf-thread-edit-card">
            <summary>Edit both callers or conversation dynamics <span>Optional</span></summary>
            <div class="form-grid two"><label>About you<textarea id="repeatAboutSelf" rows="4">${esc(t.aboutSelf||'')}</textarea></label><label>About caller<textarea id="repeatAboutCaller" rows="4">${esc(t.aboutCaller||'')}</textarea></label></div>
            <label>Dynamics type<select id="repeatDynamicsMode">${Object.entries(DYNAMICS).map(([v,d])=>`<option value="${v}" ${v===t.dynamicsMode?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label>
            <label>Custom dynamics<textarea id="repeatDynamics" rows="4">${esc(t.dynamics||'')}</textarea></label>
          </details>

          <details class="thread-edit-details cf-thread-edit-card">
            <summary>Edit last-used location or time zone <span>Optional</span></summary>
            <div class="form-grid two"><div class="location-card"><strong>Caller A</strong><label>Location<input id="repeatARegion" value="${esc(t.callerA?.region||'')}" /></label><label>Time zone<select id="repeatATimezone">${timezoneOptions(t.callerA?.timezone)}</select></label></div><div class="location-card"><strong>Caller B</strong><label>Location<input id="repeatBRegion" value="${esc(t.callerB?.region||'')}" /></label><label>Time zone<select id="repeatBTimezone">${timezoneOptions(t.callerB?.timezone)}</select></label></div></div>
          </details>

          <section class="cf-next-call-composer cf-primary-composer">
            <div class="cf-composer-title"><div><span>Continue this conversation</span><h3>What is new for today’s call?</h3></div><small>You normally only need to add this.</small></div>
            <label class="cf-topic-label">New conversation details<textarea id="repeatTopic" rows="5" placeholder="What do you want to discuss on this call?"></textarea></label>

            <div class="cf-repeat-voice">
              <div class="cf-repeat-opening-head"><strong>Voice for this call</strong><span>Change anytime</span></div>
              <div class="cf-repeat-voice-choice">
                <button type="button" class="cf-repeat-voice-option ${t.voiceGender!=='female'?'active':''}" data-repeat-voice="male"><span>Male</span><small>${esc(admin.maleVoice)}</small></button>
                <button type="button" class="cf-repeat-voice-option ${t.voiceGender==='female'?'active':''}" data-repeat-voice="female"><span>Female</span><small>${esc(admin.femaleVoice)}</small></button>
              </div>
              <input type="hidden" id="repeatVoiceGender" value="${esc(t.voiceGender||'male')}" />
              <div class="cf-repeat-voice-note">This changes only the next call. Your saved caller information stays intact.</div>
            </div>

            <div class="cf-repeat-opening">
              <div class="cf-repeat-opening-head"><strong>Call opening</strong><span>Optional</span></div>
              <label>Opening style<select id="repeatOpeningMode">${openingOptionsV105(openingMode)}</select></label>
              <label id="repeatOpeningCustomWrap" class="${openingMode==='custom'?'':'hidden'}">Custom opening<input id="repeatOpeningCustom" value="${esc(openingCustom)}" placeholder="Write exactly how you want the call to open" /></label>
              <div class="opening-preview" id="repeatOpeningPreview">${openingMode==='time'?`${greeting}, ${esc(t.callerName)}.`:openingMode==='name'?`Hey ${esc(t.callerName)}.`:openingMode==='wait'?'CallFocus will wait for the other person to speak first.':openingMode==='custom'&&openingCustom?esc(openingCustom):`CallFocus will choose a short, natural greeting such as “Hey ${esc(t.callerName)}” or “${greeting}, ${esc(t.callerName)}”, then pause and let the conversation develop.`}</div>
            </div>

            <button class="btn btn-primary large cf-repeat-call-button" data-repeat-call="${t.id}">Call ${esc(t.callerName)} again</button>
          </section>

          <section class="cf-after-composer-section">
            <div class="cf-thread-context-message">
              <div class="cf-context-title"><span>Saved caller context</span><small>Used automatically on the next call</small></div>
              <div class="thread-saved-grid cf-context-grid">
                <div class="saved-info-card"><strong>About you</strong><p>${esc(t.aboutSelf||'Not supplied')}</p></div>
                <div class="saved-info-card"><strong>About caller</strong><p>${esc(t.aboutCaller||'Not supplied')}</p></div>
                <div class="saved-info-card"><strong>Dynamics</strong><p>${esc(dyn.label)}</p></div>
                <div class="saved-info-card"><strong>Last-used setup</strong><p>${esc(t.callerA?.region||'—')} ↔ ${esc(t.callerB?.region||'—')} · ${esc(t.voiceGender||'male')} voice</p></div>
              </div>
            </div>
          </section>

          <section class="cf-history-section">
            <div class="cf-timeline-heading"><span>Call history</span><small>Oldest to newest · copy any call individually</small></div>
            <div class="cf-call-timeline">${calls.length?calls.map((c,i)=>callEntryHTMLV105(t,c,i)).join(''):`<div class="cf-no-call-history">No completed calls have been saved in this thread yet.</div>`}</div>
          </section>
        </div>
      </div>`;
    requestAnimationFrame(()=>{const scroller=$('threadDetailPanel')?.querySelector('.cf-chat-scroll');if(scroller)scroller.scrollTop=0;});
  };

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-copy-call-thread]'); if(!btn)return;
    const thread=data?.threads?.find(t=>t.id===btn.dataset.copyCallThread); if(!thread)return;
    const index=Number(btn.dataset.copyCallIndex); const call=thread.calls?.[index]; if(!call)return;
    const text=formatCallCopyV105(thread,call,index);
    try{
      await copyTextV105(text);
      btn.classList.add('copied');
      const span=btn.querySelector('span'); const old=span?.textContent||'Copy call details'; if(span)span.textContent='Copied';
      setTimeout(()=>{btn.classList.remove('copied');if(span)span.textContent=old},1400);
      toast('Call details copied');
    }catch{toast('Could not copy call details')}
  });

  // If the public theme has already loaded before this patch, keep it applied.
  try{applyGlobalTheme?.(loadAdmin().siteTheme)}catch{}
  if(typeof activeView!=='undefined'&&activeView==='recent'&&account) renderRecentThreads();
})();
