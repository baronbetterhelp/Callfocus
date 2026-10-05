/* CallFocus V11.12 — reliable natural call ending for GPT-Live */
(()=>{
  const endBtn=document.getElementById('requestEndBtn');
  if(!endBtn) return;

  const label=endBtn.querySelector('small');
  if(label) label.textContent='End naturally';
  endBtn.setAttribute('aria-label','End this call naturally');

  let endRuleId='';
  let endSpeakId='';
  let commentarySent=false;
  let fallbackCloseTimer=null;
  let fallbackCommentaryTimer=null;

  const clearEndTimers=()=>{
    clearTimeout(fallbackCloseTimer);
    clearTimeout(fallbackCommentaryTimer);
    fallbackCloseTimer=null;
    fallbackCommentaryTimer=null;
  };

  const relationHint=(call)=>{
    const mode=String(call?.dynamicsMode||'').toLowerCase();
    const dynamics=String(call?.rawDynamics||call?.dynamics||'').toLowerCase();
    const combined=`${mode} ${dynamics}`;
    if(/romantic|dating|lover|relationship|partner/.test(combined)) return 'Warm or affectionate wording is okay if it already fits this relationship. Do not force pet names.';
    if(/business|client|professional|formal|work/.test(combined)) return 'Keep the ending friendly but professional. Do not use pet names or romantic wording.';
    if(/friend|casual|reconnect/.test(combined)) return 'Keep the ending relaxed, familiar and easygoing.';
    return 'Match the warmth and familiarity already established in this call.';
  };

  function compactEndingRule(){
    const call=live?.current||{};
    const caller=String(call.callerName||'').trim();
    const topic=String(call.topic||'').trim();
    const relation=relationHint(call);
    const language=String(call?.callLanguage||'English').trim()||'English';
    return [
      `The customer pressed END NATURALLY. Immediately end this phone call with one believable human closing turn spoken entirely in ${language}.`,
      'Give an ordinary low-stakes reason for needing to leave now, such as needing to take care of something, finish something, step away, head out, or catch up with something.',
      'Use about 2 short sentences, roughly 18 to 40 words. Do not give a bare “bye” or “talk soon”.',
      'Do not invent emergencies, illness, appointments, family problems, travel, work obligations, or any specific event that was not established in the conversation.',
      relation,
      caller ? `You are speaking with ${caller}. Use the name only if it sounds natural.` : '',
      topic ? 'Let the conversation that happened today influence the tone, but do not summarize the call.' : '',
      'After the closing turn, do not ask a question or start a new topic. Stop speaking so the call can close.'
    ].filter(Boolean).join(' ');
  }

  function sendCommentary(){
    if(commentarySent || live?.dc?.readyState!=='open' || !live?.graceful) return;
    commentarySent=true;
    endSpeakId=`cf_end_say_${Date.now()}`;
    live._cfNaturalEndIds=live._cfNaturalEndIds||new Set();
    live._cfNaturalEndIds.add(endSpeakId);
    try{
      live.dc.send(JSON.stringify({
        type:'session.commentary.append',
        event_id:endSpeakId,
        delegation_id:null,
        content:`Speak this closing entirely in ${String(live?.current?.callLanguage||'English')}. Convey naturally that I need to get going for now because I have something ordinary I need to take care of on my end, and that I will talk to the person later. Match the relationship and the conversation we just had. Do not switch languages.`
      }));
      const caption=document.getElementById('liveCaption');
      if(caption) caption.textContent='Ending the call naturally…';
    }catch(err){
      console.error('CallFocus natural-end commentary error',err);
      live.graceful=false;
      const caption=document.getElementById('liveCaption');
      if(caption) caption.textContent='Could not prepare the natural ending. Try again.';
    }
  }

  // Intercept only errors caused by our natural-ending control. OpenAI Live errors
  // are recoverable and do not necessarily mean the session disconnected.
  const previousHandleV1112=handleRealtimeEvent;
  handleRealtimeEvent=function(raw){
    let event=null;
    try{ event=JSON.parse(raw); }catch{}

    const clientEventId=event?.client_event_id || event?.error?.client_event_id || event?.error?.event_id || '';
    const isOurEndError=event?.type==='error' && live?._cfNaturalEndIds?.has(clientEventId);

    if(isOurEndError){
      console.warn('CallFocus natural-ending event rejected',event?.error||event);
      // Do not let older handlers incorrectly turn a recoverable client-event error
      // into “Server unavailable”. If the rule append failed, still attempt the short
      // commentary fallback so the caller hears a natural ending.
      if(clientEventId===endRuleId && !commentarySent) sendCommentary();
      return;
    }

    previousHandleV1112(raw);

    if(!event || !live?.graceful) return;

    if(event.type==='session.instructions.appended' && event.client_event_id===endRuleId){
      clearTimeout(fallbackCommentaryTimer);
      fallbackCommentaryTimer=null;
      sendCommentary();
    }

    if(event.type==='session.commentary.appended' && event.client_event_id===endSpeakId){
      const caption=document.getElementById('liveCaption');
      if(caption) caption.textContent='Ending the call naturally…';
    }
  };

  endBtn.onclick=()=>{
    if(live?.dc?.readyState!=='open' || !live?.started) return toast('The call is not active yet');
    if(live.graceful) return toast('The call is already ending naturally');

    clearEndTimers();
    commentarySent=false;
    live.graceful=true;
    live.gracefulSpoke=false;
    live._cfNaturalEndIds=new Set();

    const status=document.getElementById('liveStatus');
    const caption=document.getElementById('liveCaption');
    if(status) status.textContent='Connected to server · Wrapping up';
    if(caption) caption.textContent='Preparing a natural call ending…';

    endRuleId=`cf_end_rule_${Date.now()}`;
    live._cfNaturalEndIds.add(endRuleId);

    try{
      live.dc.send(JSON.stringify({
        type:'session.instructions.append',
        event_id:endRuleId,
        delegation_id:null,
        content:compactEndingRule()
      }));
    }catch(err){
      console.error('CallFocus natural-end rule error',err);
      live.graceful=false;
      return toast('Could not request a natural ending. Try again.');
    }

    // If the acknowledgement is delayed on the Live timeline, send the spoken
    // commentary shortly afterward rather than failing the call.
    fallbackCommentaryTimer=setTimeout(()=>sendCommentary(),1200);

    // V10.4 closes shortly after the final assistant transcript fragment. This is
    // only a safety timeout in case playback/transcript completion is never reported.
    fallbackCloseTimer=setTimeout(()=>{
      if(live?.graceful) cleanupCall(true);
    },18000);
  };

  const previousCleanupV1112=cleanupCall;
  cleanupCall=function(save=true){
    clearEndTimers();
    previousCleanupV1112(save);
  };
})();
