/* CallFocus V10.2 — call retry, setup return, better connection diagnostics */
(()=>{
  let lastFailedCall=null;
  let lastFailureReason='';

  function hideFailureActions(){
    $('callFailureActions')?.classList.add('hidden');
  }
  function showFailureActions(){
    $('callFailureActions')?.classList.remove('hidden');
  }
  function destroyTransport(){
    try{ live.dc?.close(); }catch{}
    try{ live.stream?.getTracks().forEach(t=>t.stop()); }catch{}
    try{ live.pc?.close(); }catch{}
    live.dc=null; live.stream=null; live.pc=null; live.audio=null;
    live.connected=false; live.started=false;
    clearInterval(live.timer); live.timer=null;
    clearTimeout(live.gracefulTimer); live.gracefulTimer=null;
  }
  function failCall(call,msg,reason=''){
    lastFailedCall=call||live.current||null;
    lastFailureReason=reason||'';
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
  }

  function restoreRepeatDraft(call){
    if(!call?.threadId) return;
    showView('recent');
    selectedThreadId=call.threadId;
    renderRecentThreads();
    requestAnimationFrame(()=>{
      const topic=$('repeatTopic'); if(topic) topic.value=call.topic||'';
      const opening=$('repeatOpeningMode'); if(opening) opening.value=call.openingMode||'auto';
      const custom=$('repeatOpeningCustom'); if(custom) custom.value=call.openingCustom||'';
      const voice=$('repeatVoiceGender'); if(voice) voice.value=call.voiceGender||'male';
      document.querySelectorAll('.cf-repeat-voice-option').forEach(btn=>btn.classList.toggle('active',btn.dataset.repeatVoice===(call.voiceGender||'male')));
      if(typeof updateRepeatOpeningUI==='function') updateRepeatOpeningUI();
      const scroller=document.querySelector('.cf-chat-scroll'); if(scroller) scroller.scrollTop=Math.max(0,scroller.scrollHeight-900);
    });
  }

  function returnToSetup(call){
    $('callScreen').classList.add('hidden');
    $('activeCallBar').classList.add('hidden');
    hideFailureActions();
    document.body.style.overflow='';
    if(call?.mode==='repeat'){
      restoreRepeatDraft(call);
    }else{
      openModal('newCallModal');
    }
  }

  // Fully replace cleanup so ending a call returns to the exact setup it came from.
  cleanupCall=function(save=true){
    const call=live.current;
    clearInterval(live.timer);
    clearTimeout(live.gracefulTimer);
    if(save&&call) saveCompletedCall();
    try{ if(live.dc?.readyState==='open') live.dc.send(JSON.stringify({type:'session.close',event_id:`close_${Date.now()}`})); }catch{}
    destroyTransport();
    live={pc:null,dc:null,stream:null,audio:null,timer:null,seconds:0,connected:false,started:false,muted:false,speakerOn:true,held:false,graceful:false,current:null,transcript:'',gracefulTimer:null,minimized:false,moreOpen:false};
    if(data) saveData();
    renderWorkspace();
    returnToSetup(call);
  };

  // Replace V10 startCall so failures offer Retry and expose only safe server messages to customers.
  startCall=async function(call){
    closeModal('newCallModal');
    hideFailureActions();
    lastFailedCall=null; lastFailureReason='';
    document.body.style.overflow='hidden';
    $('callScreen').classList.remove('hidden');
    $('liveCallerName').textContent=call.callerName;
    $('liveAvatar').textContent=initials(call.callerName);
    $('liveRegion').textContent=[call.callerB.region,call.callerB.timezone].filter(Boolean).join(' · ');
    $('liveStatus').textContent='Connecting to server…';
    $('liveTranscript').textContent='';
    $('liveTranscript').classList.remove('error-visible');
    $('liveCaption').textContent='Preparing live voice connection…';
    $('callTimer').textContent='00:00';
    $('callMoreTitle').textContent=call.title||call.callerName;
    $('callMoreTopic').textContent=call.topic||'No new topic supplied';
    $('callMoreConnection').textContent='Connecting';
    $('callMorePanel').classList.add('hidden');
    $('liveStartCallBtn')?.classList.add('hidden');
    live.current=call;
    live.transcript='';
    live.connected=false;
    live.started=false;
    live.graceful=false;
    live.liveUsageSeconds=0;
    live.seconds=0;
    clearTimeout(live.gracefulTimer);
    resetCallControls();

    try{
      const currentAdmin=await refreshPublicConfig();
      call.voice=call.voiceGender==='female'?currentAdmin.femaleVoice:currentAdmin.maleVoice;
      call.model='gpt-live-1';
      call.opening=currentAdmin.opening;
      call.speakFirst=currentAdmin.speakFirst!==false;
      call.interruptions=currentAdmin.interruptions!==false;
      if(currentAdmin.serverOnline===false){
        return failCall(call,currentAdmin.serverMessage||'Server not active right now. Please try again soon.','admin_offline');
      }

      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      stream.getAudioTracks().forEach(t=>t.enabled=false);
      const pc=new RTCPeerConnection();
      const dc=pc.createDataChannel('callfocus-live-events');
      const audio=document.createElement('audio');
      audio.autoplay=true; audio.playsInline=true;
      live.stream=stream; live.pc=pc; live.dc=dc; live.audio=audio;
      stream.getAudioTracks().forEach(t=>pc.addTrack(t,stream));
      pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})};
      dc.onopen=()=>{$('liveCaption').textContent='Voice channel connected. Waiting for session…'};
      dc.onmessage=e=>handleRealtimeEvent(e.data);
      dc.onerror=()=>{$('liveCaption').textContent='Voice connection error.'};

      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const res=await fetch('/api/session',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sdp:pc.localDescription.sdp,userId:account.id,session:{voiceGender:call.voiceGender,contextInstructions:buildInstructions(call)}})
      });
      const text=await res.text();
      if(!res.ok){
        const reason=res.headers.get('X-CallFocus-Error-Code')||`http_${res.status}`;
        console.warn('CallFocus session start failed:',reason);
        throw Object.assign(new Error(text||'Live session failed'),{callFocusReason:reason});
      }
      call.speakFirst=res.headers.get('X-CallFocus-Speak-First')!=='0';
      call.engine=res.headers.get('X-CallFocus-Engine')||'gpt-live-1';
      call.configUpdatedAt=res.headers.get('X-CallFocus-Config-Updated')||'';
      await pc.setRemoteDescription({type:'answer',sdp:text});
    }catch(err){
      console.error(err);
      const raw=String(err?.message||err||'').toLowerCase();
      const reason=err?.callFocusReason||'';
      const inactive=raw.includes('server not active')||raw.includes('credit')||raw.includes('quota')||reason.includes('credit')||reason.includes('quota');
      const msg=inactive?'Server not active right now. Please try again soon.':'Server unavailable. Try again soon.';
      failCall(call,msg,reason);
    }
  };

  // Add retry behavior for failed connections.
  $('callRetryBtn')?.addEventListener('click',()=>{
    const call=lastFailedCall||live.current;
    if(!call) return toast('No call is available to retry');
    destroyTransport();
    $('liveTranscript').classList.remove('error-visible');
    $('liveTranscript').textContent='';
    hideFailureActions();
    startCall(call);
  });

  $('callBackSetupBtn')?.addEventListener('click',()=>{
    const call=lastFailedCall||live.current;
    if(call && data){
      try{ live.current=call; saveCompletedCall(); }catch{}
    }
    destroyTransport();
    live.current=null;
    returnToSetup(call);
  });

  // If GPT-Live closes unexpectedly before a real call starts, expose retry instead of leaving a dead screen.
  const previousHandle=handleRealtimeEvent;
  handleRealtimeEvent=function(raw){
    let parsed; try{parsed=JSON.parse(raw)}catch{}
    previousHandle(raw);
    if(parsed?.type==='session.closed' && !live.started && live.current){
      failCall(live.current,'Server unavailable. Try again soon.','session_closed_before_start');
    }
    if(parsed?.type==='error' && live.current){
      const code=parsed.error?.code||parsed.error?.type||'live_session_error';
      failCall(live.current,'Server unavailable. Try again soon.',code);
    }
  };
})();
