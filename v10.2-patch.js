/* CallFocus V10.2 — retry, automatic setup return, and draft preservation */
(()=>{
  let lastFailedCall=null;
  let failureReturnTimer=null;
  let retrying=false;

  const cloneCall=c=>c?{...c,callerA:{...(c.callerA||{})},callerB:{...(c.callerB||{})}}:null;

  function hideFailureActions(){$('callFailureActions')?.classList.add('hidden')}
  function showFailureActions(){$('callFailureActions')?.classList.remove('hidden')}

  function destroyTransport(){
    clearInterval(live.timer); live.timer=null;
    clearTimeout(live.gracefulTimer); live.gracefulTimer=null;
    try{live.dc?.close()}catch{}
    try{live.stream?.getTracks().forEach(t=>t.stop())}catch{}
    try{live.pc?.close()}catch{}
    live.dc=null; live.stream=null; live.pc=null; live.audio=null;
    live.connected=false; live.started=false;
  }

  function restoreThreadSetup(call,{showRetry=false}={}){
    if(!call?.threadId||!account)return;
    selectedThreadId=call.threadId;
    showView('recent');
    selectThread(call.threadId);
    requestAnimationFrame(()=>{
      const set=(id,value)=>{const el=$(id);if(el&&value!=null)el.value=value};
      set('repeatTopic',call.topic||'');
      set('repeatAboutSelf',call.aboutSelf||'');
      set('repeatAboutCaller',call.aboutCaller||'');
      set('repeatDynamicsMode',call.dynamicsMode||'custom');
      set('repeatDynamics',call.rawDynamics||'');
      set('repeatARegion',call.callerA?.region||'');
      set('repeatATimezone',call.callerA?.timezone||'America/New_York');
      set('repeatBRegion',call.callerB?.region||'');
      set('repeatBTimezone',call.callerB?.timezone||'America/New_York');
      set('repeatVoiceGender',call.voiceGender||'male');
      set('repeatOpeningMode',call.openingMode||'auto');
      set('repeatOpeningCustom',call.openingCustom||'');
      document.querySelectorAll('.cf-repeat-voice-option').forEach(btn=>btn.classList.toggle('active',btn.dataset.repeatVoice===(call.voiceGender||'male')));
      try{$('repeatOpeningMode')?.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
      if(showRetry) injectThreadRetry(call);
      const scroller=document.querySelector('.cf-chat-scroll'); if(scroller)scroller.scrollTop=Math.max(0,scroller.scrollHeight-920);
    });
  }

  function injectThreadRetry(call){
    document.getElementById('cfThreadRetryBanner')?.remove();
    const composer=document.querySelector('.cf-next-call-composer'); if(!composer)return;
    const box=document.createElement('div');
    box.id='cfThreadRetryBanner'; box.className='cf-thread-retry-banner';
    box.innerHTML='<div><strong>That call could not connect.</strong><span>Your call setup has been kept exactly as it was.</span></div><button type="button">Try again</button>';
    box.querySelector('button').onclick=()=>retryCall(call);
    composer.prepend(box);
  }

  function returnToSetup(call,{failed=false}={}){
    $('callScreen').classList.add('hidden');
    $('activeCallBar').classList.add('hidden');
    hideFailureActions();
    document.body.style.overflow='';
    if(call?.threadId) restoreThreadSetup(call,{showRetry:failed});
    else openModal('newCallModal');
  }

  function failCall(call,msg,reason=''){
    const failed=cloneCall(call||live.current);
    lastFailedCall=failed;
    live.connected=false; live.started=false;
    $('liveStatus').textContent='Disconnected from server';
    $('liveCaption').textContent=msg;
    $('liveTranscript').textContent=msg;
    $('liveTranscript').classList.add('error-visible');
    $('callMoreConnection').textContent='Disconnected';
    $('liveStartCallBtn')?.classList.add('hidden');
    showFailureActions();
    destroyTransport();
    toast(msg);
    clearTimeout(failureReturnTimer);
    // Keep the failed screen visible briefly, then return to the same setup automatically.
    failureReturnTimer=setTimeout(()=>{
      failureReturnTimer=null;
      if(!failed)return;
      live.current=failed;
      try{saveCompletedCall()}catch{}
      live.current=null;
      if(data)saveData();
      renderWorkspace();
      returnToSetup(failed,{failed:true});
    },3000);
    if(reason)console.warn('CallFocus failure reason:',reason);
  }

  async function retryCall(call=lastFailedCall){
    if(!call||retrying)return;
    retrying=true;
    clearTimeout(failureReturnTimer); failureReturnTimer=null;
    document.getElementById('cfThreadRetryBanner')?.remove();
    hideFailureActions();
    destroyTransport();
    try{await startCall(cloneCall(call))}finally{retrying=false}
  }

  // Ending any call always returns to that call's setup/thread instead of Home.
  cleanupCall=function(save=true){
    clearTimeout(failureReturnTimer); failureReturnTimer=null;
    const call=cloneCall(live.current||lastFailedCall);
    if(save&&live.current){try{saveCompletedCall()}catch{}}
    try{if(live.dc?.readyState==='open')live.dc.send(JSON.stringify({type:'session.close',event_id:`close_${Date.now()}`}))}catch{}
    destroyTransport();
    live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,connected:false,started:false,muted:false,speakerOn:true,held:false,graceful:false,current:null,transcript:'',gracefulTimer:null,minimized:false,moreOpen:false};
    if(data)saveData();
    renderWorkspace();
    const failed=!!lastFailedCall && call?.threadId===lastFailedCall?.threadId;
    returnToSetup(call,{failed});
    if(!failed)lastFailedCall=null;
  };

  // V10 connection setup with customer-safe errors and retry state.
  startCall=async function(call){
    clearTimeout(failureReturnTimer); failureReturnTimer=null;
    document.getElementById('cfThreadRetryBanner')?.remove();
    closeModal('newCallModal');
    hideFailureActions();
    document.body.style.overflow='hidden';
    $('callScreen').classList.remove('hidden');
    $('liveCallerName').textContent=call.callerName;
    $('liveAvatar').textContent=initials(call.callerName);
    $('liveRegion').textContent=[call.callerB.region,call.callerB.timezone].filter(Boolean).join(' · ');
    $('liveStatus').textContent='Connecting to server…';
    $('liveTranscript').textContent=''; $('liveTranscript').classList.remove('error-visible');
    $('liveCaption').textContent='Preparing live voice connection…'; $('callTimer').textContent='00:00';
    $('callMoreTitle').textContent=call.title||call.callerName; $('callMoreTopic').textContent=call.topic||'No new topic supplied';
    $('callMoreConnection').textContent='Connecting'; $('callMorePanel').classList.add('hidden'); $('liveStartCallBtn')?.classList.add('hidden');
    live.current=call; live.transcript=''; live.connected=false; live.started=false; live.graceful=false; live.liveUsageSeconds=0; live.seconds=0; resetCallControls();

    try{
      const currentAdmin=await refreshPublicConfig();
      call.voice=call.voiceGender==='female'?currentAdmin.femaleVoice:currentAdmin.maleVoice;
      call.model='gpt-live-1'; call.opening=currentAdmin.opening; call.speakFirst=currentAdmin.speakFirst!==false; call.interruptions=currentAdmin.interruptions!==false;
      if(currentAdmin.serverOnline===false) return failCall(call,currentAdmin.serverMessage||'Server not active right now. Please try again soon.','admin_offline');

      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      stream.getAudioTracks().forEach(t=>t.enabled=false);
      const pc=new RTCPeerConnection(); const dc=pc.createDataChannel('callfocus-live-events'); const audio=document.createElement('audio'); audio.autoplay=true; audio.playsInline=true;
      live.stream=stream; live.pc=pc; live.dc=dc; live.audio=audio;
      stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream));
      pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})};
      dc.onopen=()=>{$('liveCaption').textContent='Voice channel connected. Waiting for session…'};
      dc.onmessage=e=>handleRealtimeEvent(e.data); dc.onerror=()=>{$('liveCaption').textContent='Voice connection error.'};

      const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await waitForIce(pc);
      const res=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,userId:account.id,session:{voiceGender:call.voiceGender,contextInstructions:buildInstructions(call)}})});
      const text=await res.text();
      if(!res.ok){const reason=res.headers.get('X-CallFocus-Error-Code')||`http_${res.status}`;throw Object.assign(new Error(text||'Live session failed'),{callFocusReason:reason})}
      call.speakFirst=res.headers.get('X-CallFocus-Speak-First')!=='0'; call.engine=res.headers.get('X-CallFocus-Engine')||'gpt-live-1'; call.configUpdatedAt=res.headers.get('X-CallFocus-Config-Updated')||'';
      await pc.setRemoteDescription({type:'answer',sdp:text});
    }catch(err){
      console.error(err);
      const raw=String(err?.message||err||'').toLowerCase(); const reason=err?.callFocusReason||'';
      const inactive=raw.includes('server not active')||raw.includes('credit')||raw.includes('quota')||reason.includes('credit')||reason.includes('quota');
      failCall(call,inactive?'Server not active right now. Please try again soon.':'Server unavailable. Try again soon.',reason);
    }
  };

  $('callRetryBtn')?.addEventListener('click',()=>retryCall());
  $('callBackSetupBtn')?.addEventListener('click',()=>{
    clearTimeout(failureReturnTimer); failureReturnTimer=null;
    const call=cloneCall(lastFailedCall||live.current); if(!call)return;
    if(live.current){try{saveCompletedCall()}catch{}}
    destroyTransport(); live.current=null; if(data)saveData(); renderWorkspace(); returnToSetup(call,{failed:true});
  });

  const previousHandle=handleRealtimeEvent;
  handleRealtimeEvent=function(raw){
    let parsed;try{parsed=JSON.parse(raw)}catch{}
    previousHandle(raw);
    if(parsed?.type==='session.started'){
      clearTimeout(failureReturnTimer); failureReturnTimer=null; lastFailedCall=null; hideFailureActions(); document.getElementById('cfThreadRetryBanner')?.remove();
    }
    if(parsed?.type==='session.closed'&&!live.started&&live.current)failCall(live.current,'Server unavailable. Try again soon.','session_closed_before_start');
    if(parsed?.type==='error'&&live.current)failCall(live.current,'Server unavailable. Try again soon.',parsed.error?.code||parsed.error?.type||'live_session_error');
  };
})();
