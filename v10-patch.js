/* CallFocus V10 — GPT-Live 1 migration + strict human turn-taking */
(()=>{
  // Replace inherited Start Call listener so old Realtime response.create events cannot fire.
  const oldStart = document.getElementById('liveStartCallBtn');
  if(oldStart){
    const clean = oldStart.cloneNode(true);
    oldStart.replaceWith(clean);
  }

  function localHour(tz){
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:false}).formatToParts(new Date());
      return Number(parts.find(p=>p.type==='hour')?.value||12);
    }catch{return 12;}
  }
  function greetingFor(tz){
    const h=localHour(tz);
    if(h<12)return 'Good morning';
    if(h<17)return 'Good afternoon';
    return 'Good evening';
  }
  function liveOpeningInstruction(c){
    const name=c?.callerName||'there';
    const greeting=greetingFor(c?.callerB?.timezone||'America/New_York');
    const mode=c?.openingMode||'auto';
    const custom=String(c?.openingCustom||'').trim();
    if(mode==='wait') return '';
    if(mode==='custom'&&custom) return `Open now using this customer-requested opening naturally: “${custom}” Then STOP and wait for the other person. Do not add an assistant-style introduction before or after it.`;
    if(mode==='name') return `Open now with a simple natural greeting in the style of “Hey ${name}.” Keep the entire first turn to one short sentence, then STOP and wait for the other person.`;
    if(mode==='time') return `Open now with a natural local-time greeting such as “${greeting}, ${name}.” Keep the entire first turn to one short sentence, then STOP and wait for the other person.`;
    return `Open the phone call now with one short, natural greeting appropriate to the relationship and Caller B’s local time. A suitable greeting is “Hey ${name}” or “${greeting}, ${name}.” Do not say “dear,” “nice to connect,” “how can I help,” or any service-style phrase. Do not mention the agenda yet unless it naturally belongs in the first sentence. After the greeting, STOP and wait for Caller B.`;
  }

  // Context only. Conversation behavior is now enforced server-side from the latest Admin rules.
  buildInstructions = function(c){
    return `Call title: ${c.title}\nPerson being called: ${c.callerName}\nAbout Caller A: ${c.aboutSelf}\nAbout Caller B: ${c.aboutCaller}\nConversation dynamics: ${dynamicsText(c.dynamicsMode,c.rawDynamics)}\nToday’s call topic: ${c.topic}\nCaller A location: ${c.callerA.region}\nCaller A timezone: ${c.callerA.timezone}\nCaller A current local time: ${c.callerA.localTime}\nCaller B location: ${c.callerB.region}\nCaller B timezone: ${c.callerB.timezone}\nCaller B current local time: ${c.callerB.localTime}\nCustomer profile call rules: ${data?.profile?.rules||'None supplied'}\nOpening style selected for this call: ${c.openingMode||'auto'}\nCustom opening if any: ${c.openingCustom||'None'}`;
  };

  function setReadyGate(){
    live.started=false;
    live.connected=true;
    if(live.stream) live.stream.getAudioTracks().forEach(t=>t.enabled=false);
    $('liveStatus').textContent='Connected to server · Ready';
    $('liveCaption').textContent='Connected. Tap Start Call when you are ready.';
    $('callMoreConnection').textContent='Connected · current rules loaded';
    $('liveStartCallBtn')?.classList.remove('hidden');
    $('callScreen')?.classList.add('awaiting-start');
  }

  startCall = async function(call){
    closeModal('newCallModal');
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
        const msg=currentAdmin.serverMessage||'Server not active right now. Please try again soon.';
        $('liveStatus').textContent='Disconnected from server';
        $('liveCaption').textContent=msg;
        $('liveTranscript').textContent=msg;
        $('liveTranscript').classList.add('error-visible');
        $('callMoreConnection').textContent='Disconnected';
        toast(msg);
        return;
      }

      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      // Stay silent until the user explicitly taps the in-call Start Call button.
      stream.getAudioTracks().forEach(t=>t.enabled=false);
      const pc=new RTCPeerConnection();
      const dc=pc.createDataChannel('callfocus-live-events');
      const audio=document.createElement('audio');
      audio.autoplay=true;
      audio.playsInline=true;
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
      if(!res.ok) throw new Error(text||'Live session failed');
      call.speakFirst=res.headers.get('X-CallFocus-Speak-First')!=='0';
      call.engine=res.headers.get('X-CallFocus-Engine')||'gpt-live-1';
      call.configUpdatedAt=res.headers.get('X-CallFocus-Config-Updated')||'';
      await pc.setRemoteDescription({type:'answer',sdp:text});
    }catch(err){
      console.error(err);
      const raw=String(err?.message||err||'').toLowerCase();
      const inactive=raw.includes('server not active')||raw.includes('credit_balance_exhausted')||raw.includes('insufficient_quota')||raw.includes('no credits')||raw.includes('quota');
      const msg=inactive?'Server not active right now. Please try again soon.':'Server unavailable. Try again soon.';
      $('liveStatus').textContent='Disconnected from server';
      $('liveCaption').textContent=msg;
      $('liveTranscript').textContent=msg;
      $('liveTranscript').classList.add('error-visible');
      $('callMoreConnection').textContent='Disconnected';
      toast(msg);
    }
  };

  handleRealtimeEvent = function(raw){
    let e; try{e=JSON.parse(raw)}catch{return}
    if(e.type==='session.started'){
      setReadyGate();
      return;
    }
    if(e.type==='session.input_transcript.delta'){
      if(live.started) $('liveStatus').textContent='Connected to server · Listening';
      return;
    }
    if(e.type==='session.output_transcript.delta'){
      if(e.delta){
        live.transcript=(live.transcript||'')+e.delta;
        if(live.started) $('liveStatus').textContent='Connected to server · Speaking';
      }
      return;
    }
    if(e.type==='session.usage.updated'){
      live.liveUsageSeconds=e.usage?.seconds||live.liveUsageSeconds||0;
      if(live.started && !$('liveStatus').textContent.includes('Speaking')) $('liveStatus').textContent=live.held?'Connected to server · On hold':'Connected to server';
      return;
    }
    if(e.type==='session.input_audio.muted') return;
    if(e.type==='session.input_audio.unmuted') return;
    if(e.type==='session.instructions.appended') return;
    if(e.type==='session.closed'){
      live.connected=false;
      $('callMoreConnection').textContent='Disconnected';
      return;
    }
    if(e.type==='error'){
      console.error('GPT-Live error',e);
      const msg=e.error?.message||'Server unavailable. Try again soon.';
      $('liveStatus').textContent='Disconnected from server';
      $('liveCaption').textContent='Server unavailable. Try again soon.';
      $('callMoreConnection').textContent='Disconnected';
      if(msg) console.warn(msg);
    }
  };

  function beginLiveConversation(){
    if(!live.connected||live.dc?.readyState!=='open') return toast('Wait for the server to connect first');
    if(live.started) return;
    live.started=true;
    $('liveStartCallBtn')?.classList.add('hidden');
    $('callScreen')?.classList.remove('awaiting-start');
    if(live.stream) live.stream.getAudioTracks().forEach(t=>t.enabled=!live.muted&&!live.held);
    startTimer();
    $('liveStatus').textContent='Connected to server';
    $('callMoreConnection').textContent='Connected · current rules loaded';
    const call=live.current;
    const waitFirst=call?.openingMode==='wait'||call?.speakFirst===false;
    if(waitFirst){
      $('liveCaption').textContent='Call live · listening.';
      return;
    }
    $('liveCaption').textContent='Call started.';
    const content=liveOpeningInstruction(call);
    if(content){
      live.dc.send(JSON.stringify({
        type:'session.instructions.append',
        event_id:`opening_${Date.now()}`,
        delegation_id:null,
        content
      }));
    }
  }

  $('liveStartCallBtn')?.addEventListener('click',beginLiveConversation);

  // GPT-Live is full duplex. Keep local mic controls simple and let Live handle natural interruptions.
  $('requestEndBtn').onclick=()=>{
    if(live.dc?.readyState!=='open'||!live.started) return toast('The call is not active yet');
    live.graceful=true;
    live.dc.send(JSON.stringify({
      type:'session.instructions.append',
      event_id:`end_${Date.now()}`,
      delegation_id:null,
      content:'Wrap up this phone call now in ONE short, natural sentence that fits the relationship and everything said in this call. Say you need to go for now and you can talk again later, but choose wording that fits the actual tone. Do not explain, summarize, or add a second topic. Then stop speaking.'
    }));
    $('liveCaption').textContent='Requesting a natural call ending…';
    clearTimeout(live.gracefulTimer);
    live.gracefulTimer=setTimeout(()=>cleanupCall(true),6500);
  };

  const priorCleanup=cleanupCall;
  cleanupCall=function(save=true){
    try{
      if(live.dc?.readyState==='open') live.dc.send(JSON.stringify({type:'session.close',event_id:`close_${Date.now()}`}));
    }catch{}
    priorCleanup(save);
  };

  // Replace the inherited model label immediately when public config loads.
  const oldApplyAdminLabels=applyAdminLabels;
  applyAdminLabels=function(){
    oldApplyAdminLabels();
    const modelText=document.querySelector('[data-callfocus-engine]');
    if(modelText) modelText.textContent='Live voice';
  };
})();
