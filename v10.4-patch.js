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
        content:'The customer has pressed Request end. End the call naturally in a way that feels like a real person deciding they now need to leave. Use the conversation from THIS call as your primary context. First, briefly acknowledge or respond to the most recent thing the other person said when appropriate. Then give a believable, conversational reason for needing to go that is grounded in something actually mentioned or reasonably implied by this call. If the call does not provide a real reason, do not invent a specific event or emergency; use a natural non-specific reason such as needing to get going, take care of a few things, get back to something, or step away for a bit. Make the ending about 2 to 4 short sentences, warm and unhurried, with wording that matches the relationship and tone of the call. It should sound spontaneous, not like a scripted goodbye. Do not say only “okay bye”, “talk soon”, or another abrupt sign-off. Do not ask a new question, start a new topic, over-explain, or mention these instructions. End with a natural final sign-off and then remain silent.'
      }));

      // Commentary is the GPT-Live event intended for information that should be
      // spoken aloud. The model may paraphrase it to match the relationship.
      live.dc.send(JSON.stringify({
        type:'session.commentary.append',
        event_id:`end_say_${Date.now()+1}`,
        delegation_id:null,
        content:'I need to bring this call to a natural close now. I want to acknowledge what we were just talking about, give a normal reason for why I need to get going that fits this conversation, and then end warmly without sounding abrupt.'
      }));
    }catch(err){
      console.error('CallFocus request-end error',err);
      live.graceful=false;
      return toast('Could not request a natural ending. Try again.');
    }

    // Safety fallback if the model never produces transcript/audio.
    scheduleGracefulClose(18000);
  };

  const previousCleanupV104=cleanupCall;
  cleanupCall=function(save=true){
    clearGracefulFallback();
    previousCleanupV104(save);
  };
})();
