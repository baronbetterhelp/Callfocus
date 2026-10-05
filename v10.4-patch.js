/* CallFocus V10.4 — reliable Request End + calmer voice pacing UX */
(()=>{
  let gracefulFallback=null;

  function clearGracefulFallback(){
    clearTimeout(gracefulFallback);
    gracefulFallback=null;
  }

  function scheduleGracefulClose(ms=3600){
    clearGracefulFallback();
    gracefulFallback=setTimeout(()=>{
      gracefulFallback=null;
      if(live?.graceful) cleanupCall(true);
    },ms);
  }

  // GPT-Live context appends do not expose a per-turn "done" event. We therefore
  // watch the goodbye transcript and close a short moment after its final fragment.
  const previousHandleV104=handleRealtimeEvent;
  handleRealtimeEvent=function(raw){
    let event=null;
    try{ event=JSON.parse(raw); }catch{}
    previousHandleV104(raw);

    if(!live?.graceful||!event)return;

    if(event.type==='session.output_transcript.delta'&&event.delta){
      live.gracefulSpoke=true;
      $('liveStatus').textContent='Connected to server · Wrapping up';
      $('liveCaption').textContent='Ending the call naturally…';
      // Reset after every transcript fragment so we do not cut the goodbye short.
      scheduleGracefulClose(3600);
    }

    if(event.type==='session.commentary.appended'){
      $('liveCaption').textContent='Ending the call naturally…';
    }

    if(event.type==='session.closed') clearGracefulFallback();
  };

  $('requestEndBtn').onclick=()=>{
    if(live?.dc?.readyState!=='open'||!live?.started) return toast('The call is not active yet');
    if(live.graceful) return toast('Call ending is already in progress');

    live.graceful=true;
    live.gracefulSpoke=false;
    $('liveStatus').textContent='Connected to server · Wrapping up';
    $('liveCaption').textContent='Requesting a natural call ending…';

    try{
      // First constrain the next spoken turn.
      live.dc.send(JSON.stringify({
        type:'session.instructions.append',
        event_id:`end_rule_${Date.now()}`,
        delegation_id:null,
        content:'The customer has chosen to end this call. Your very next spoken turn must be exactly one brief, natural goodbye that fits the relationship and the conversation so far. Do not ask a question, introduce a new topic, summarize the call, or keep talking afterward. After the goodbye, remain silent.'
      }));

      // Commentary is the GPT-Live event intended for information that should be
      // spoken aloud. The model may paraphrase it to match the relationship.
      live.dc.send(JSON.stringify({
        type:'session.commentary.append',
        event_id:`end_say_${Date.now()+1}`,
        delegation_id:null,
        content:'I need to get going for now, but we can talk again later.'
      }));
    }catch(err){
      console.error('CallFocus request-end error',err);
      live.graceful=false;
      return toast('Could not request a natural ending. Try again.');
    }

    // Safety fallback if the model never produces transcript/audio.
    scheduleGracefulClose(10000);
  };

  const previousCleanupV104=cleanupCall;
  cleanupCall=function(save=true){
    clearGracefulFallback();
    previousCleanupV104(save);
  };
})();
