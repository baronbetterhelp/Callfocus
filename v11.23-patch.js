/* CallFocus V11.23 — compact ChatGPT-style call history */
(()=>{
  function escapeHtmlV1123(value){
    return String(value ?? '').replace(/[&<>'"]/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[ch]);
  }

  function briefCallDetailsV1123(value){
    let text=String(value||'').replace(/\s+/g,' ').trim();
    if(!text || /^(CALLFOCUS_CONFIG|CALLFOCUS_|CONFIG\b)/i.test(text)) return 'Call session';
    const max=112;
    if(text.length<=max) return text;
    let cut=text.slice(0,max+1);
    const lastSpace=cut.lastIndexOf(' ');
    if(lastSpace>72) cut=cut.slice(0,lastSpace);
    return `${cut.trim()}…`;
  }

  function callDateTimeV1123(value){
    try{
      const d=new Date(value);
      if(Number.isNaN(d.getTime())) return {date:'Date unavailable',time:''};
      return {
        date:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d),
        time:new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(d)
      };
    }catch{return {date:'Date unavailable',time:''}}
  }

  function renderCompactHistoryV1123(thread){
    const section=document.querySelector('.cf-history-section');
    const timeline=section?.querySelector('.cf-call-timeline');
    const heading=section?.querySelector('.cf-timeline-heading');
    if(!section||!timeline||!thread) return;

    if(heading){
      heading.innerHTML='<span>Recent calls</span><small>Date · time · duration · brief details</small>';
    }

    const calls=Array.isArray(thread.calls)?thread.calls:[];
    if(!calls.length){
      timeline.innerHTML='<div class="cf-no-call-history">No completed calls have been saved in this conversation yet.</div>';
      return;
    }

    // ChatGPT-style recents: newest activity first, without exposing full call prompts/transcripts.
    const entries=calls.map((call,index)=>({call,index})).reverse();
    timeline.innerHTML=entries.map(({call,index})=>{
      const dt=callDateTimeV1123(call.createdAt);
      const duration=String(call.duration||'00:00');
      const brief=briefCallDetailsV1123(call.topic);
      return `<article class="cf-compact-call-row">
        <div class="cf-compact-call-main">
          <div class="cf-compact-call-title-row">
            <strong class="cf-compact-call-brief">${escapeHtmlV1123(brief)}</strong>
            <span class="cf-compact-call-number">Call ${index+1}</span>
          </div>
          <div class="cf-compact-call-meta">
            <span>${escapeHtmlV1123(dt.date)}</span>
            ${dt.time?`<span>${escapeHtmlV1123(dt.time)}</span>`:''}
            <span>${escapeHtmlV1123(duration)}</span>
          </div>
        </div>
        <button type="button" class="cf-compact-copy-btn cf-copy-call-btn" title="Copy call details" aria-label="Copy call details" data-copy-call-thread="${escapeHtmlV1123(thread.id)}" data-copy-call-index="${index}">⧉<span class="cf-copy-label">Copy call details</span></button>
      </article>`;
    }).join('');
  }

  const previousRenderThreadDetail=typeof renderThreadDetail==='function'?renderThreadDetail:null;
  if(previousRenderThreadDetail){
    renderThreadDetail=function(id){
      previousRenderThreadDetail(id);
      const thread=(typeof data!=='undefined'&&data?.threads||[]).find(t=>t.id===id);
      requestAnimationFrame(()=>{
        // Only compact the call history inside the dedicated ChatGPT-style viewer.
        // The normal Recent Calls management page must keep the full next-call
        // composer, saved caller context, edit controls and original history.
        if(document.body.classList.contains('cf-chat-screen-open')){
          renderCompactHistoryV1123(thread);
        }
      });
    };

    // If a thread was already on screen before this patch loaded, compact it as well.
    requestAnimationFrame(()=>{
      if(typeof selectedThreadId!=='undefined'&&selectedThreadId){
        const thread=(typeof data!=='undefined'&&data?.threads||[]).find(t=>t.id===selectedThreadId);
        if(document.body.classList.contains('cf-chat-screen-open')){
          renderCompactHistoryV1123(thread);
        }
      }
    });
  }
})();
