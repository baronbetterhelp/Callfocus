/* CallFocus V11.11 — contextual natural call ending */
(()=>{
  const endBtn=document.getElementById('requestEndBtn');
  if(!endBtn) return;

  // Clearer label for customers.
  const endLabel=endBtn.querySelector('small');
  if(endLabel) endLabel.textContent='End naturally';
  endBtn.setAttribute('aria-label','End the call naturally');

  const relationshipHint=(call)=>{
    const mode=String(call?.dynamicsMode||'').toLowerCase();
    const raw=String(call?.rawDynamics||call?.dynamics||'').trim();
    if(mode==='romantic'||mode==='dating') return 'The relationship is warm/romantic. Affectionate wording such as “dear” is allowed only if it matches the conversation naturally.';
    if(mode==='business'||mode==='client'||mode==='formal') return 'The relationship is professional/formal. Do not use “dear”, pet names, romantic language, or overly casual wording.';
    if(mode==='friendship'||mode==='casual'||mode==='reconnecting') return 'The relationship is friendly/casual. Keep the ending easygoing and familiar without pet names unless already established.';
    if(mode==='family'||mode==='supportive') return 'The relationship is familiar/supportive. Keep the ending warm and caring without overdoing it.';
    return raw ? `Relationship dynamics supplied for this call: ${raw}` : 'Match the warmth and familiarity already established in this call.';
  };

  const approvedPatterns=`
Use the following as style patterns. Choose or naturally adapt ONE pattern to the relationship and what has happened in this call. Do not recite this list or mention that you are choosing a template.
1. Hey, I have to go for now, I need to take care of something real quick. I’ll talk to you later.
2. Hey dear, I have to run for a bit, something just came up that I need to handle. Talk to you later.
3. Hey, I’m going to have to get going now, I’ve got something I need to catch up on. We’ll talk later.
4. Hey dear, I need to step away for a little while and get something done. I’ll talk to you later.
5. Hey, I have to head out now, I’ve got a few things I need to take care of. Talk to you later.
6. Hey dear, I’m going to have to go now, I need to get something sorted out really quick. I’ll catch up with you later.
7. Hey, I need to get going for now, there’s something I need to handle before it gets too late. Talk to you later.
8. Hey dear, I’ve got to go take care of something for a bit. I’ll talk to you later when I’m free.
9. Hey, I’ll have to leave you for now, I’ve got something I need to finish up real quick. We’ll talk later.
10. Hey dear, I need to get off for now and catch up with a couple of things. I’ll talk to you later.
11. Hey, I’ve got to run now, I need to deal with something quickly. I’ll catch up with you later.
12. Hey dear, I’m going to have to go for now, I’ve got something I need to get done. Talk to you later.
13. Hey, I need to head off now and take care of something on my end. I’ll talk to you later.
14. Hey dear, I have to get going now, I need to catch up with something before I forget. I’ll talk to you later.
15. Hey, I’ve got something I need to take care of right now, so I’ll have to go for a bit. Talk to you later.`;

  function buildEndingInstructions(){
    const call=live?.current||{};
    const caller=String(call.callerName||'').trim();
    const topic=String(call.topic||'').trim();
    const nowContext=call?.callerA?.timezone ? `The caller's current local time context is ${nowInTimezone(call.callerA.timezone)}.` : '';
    return `
The customer pressed END NATURALLY. End this live phone call now with one realistic human closing turn.

IMPORTANT:
- Do NOT just say “okay bye”, “talk soon”, “goodbye”, or another bare sign-off.
- Give a believable, ordinary reason for needing to leave now, such as needing to take care of something, catch up with something, finish something, step away, head out, or handle something before it gets late.
- Keep the reason low-stakes and generic unless a specific real reason was already established in the conversation. Never invent emergencies, illness, family problems, appointments, work obligations, travel, or other concrete events that were not established.
- Make the whole ending a little fuller and natural: usually 2 short sentences, about 18–38 words.
- It must sound spontaneous, not like a scripted customer-service farewell.
- Match the relationship, warmth, vocabulary, and rhythm of the conversation that happened today.
- ${relationshipHint(call)}
- ${caller ? `You are ending the call with ${caller}. Use their name only if it sounds natural in the moment.` : ''}
- ${topic ? `Today's call context was: ${topic}. Do not summarize it; just let it subtly inform the tone.` : ''}
- ${nowContext}
- After this closing turn, do not ask a new question, introduce another topic, or continue speaking. Remain silent so CallFocus can close the connection.

${approvedPatterns}
`;
  }

  endBtn.onclick=()=>{
    if(live?.dc?.readyState!=='open'||!live?.started) return toast('The call is not active yet');
    if(live.graceful) return toast('The call is already ending naturally');

    live.graceful=true;
    live.gracefulSpoke=false;
    document.getElementById('liveStatus').textContent='Connected to server · Wrapping up';
    document.getElementById('liveCaption').textContent='Preparing a natural call ending…';

    const instructions=buildEndingInstructions();
    try{
      // Add the closing rule to the live context, then explicitly request a spoken response.
      live.dc.send(JSON.stringify({
        type:'session.instructions.append',
        event_id:`end_rule_${Date.now()}`,
        delegation_id:null,
        content:instructions
      }));

      live.dc.send(JSON.stringify({
        type:'response.create',
        response:{
          instructions:'End the call now. Produce exactly one natural spoken closing turn following the ending instructions just added. Include a believable everyday reason for leaving, then a natural promise to talk later. Do not ask a question.'
        }
      }));
    }catch(err){
      console.error('CallFocus natural-end error',err);
      live.graceful=false;
      return toast('Could not request a natural ending. Try again.');
    }

    // Existing V10.4 transcript watcher will close after the spoken ending.
    try{
      clearTimeout(live.gracefulTimer);
      live.gracefulTimer=setTimeout(()=>{
        if(live?.graceful) cleanupCall(true);
      },15000);
    }catch{}
  };
})();
