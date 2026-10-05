/* CallFocus V11.29 — definitive compact Recent Calls history list */
(()=>{
  const esc1129=value=>String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[ch]);

  function brief1129(value){
    let text=String(value||'').replace(/\s+/g,' ').trim();
    if(!text || /^(CALLFOCUS_CONFIG|CALLFOCUS_|CONFIG\b)/i.test(text)) return 'Call session';
    const max=112;
    if(text.length<=max) return text;
    let cut=text.slice(0,max+1);
    const space=cut.lastIndexOf(' ');
    if(space>72) cut=cut.slice(0,space);
    return `${cut.trim()}…`;
  }

  function dateTime1129(value){
    try{
      const d=new Date(value);
      if(Number.isNaN(d.getTime())) throw new Error('invalid');
      return {
        date:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d),
        time:new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(d)
      };
    }catch{
      return {date:'Date unavailable',time:''};
    }
  }

  function activeThread1129(id){
    const threadId=id || (typeof selectedThreadId!=='undefined'?selectedThreadId:'');
    return (typeof data!=='undefined'&&Array.isArray(data?.threads))
      ? data.threads.find(t=>String(t.id)===String(threadId))
      : null;
  }

  function compact1129(thread){
    if(!thread) return;
    const panel=document.getElementById('threadDetailPanel');
    const section=panel?.querySelector('.cf-history-section');
    const timeline=section?.querySelector('.cf-call-timeline');
    const heading=section?.querySelector('.cf-timeline-heading');
    if(!section||!timeline) return;

    if(heading){
      heading.innerHTML='<span>Recent calls</span><small>Date · time · duration · brief details</small>';
    }

    const calls=Array.isArray(thread.calls)?thread.calls:[];
    if(!calls.length){
      timeline.classList.add('cf-recents-list-v1129');
      timeline.innerHTML='<div class="cf-no-call-history">No completed calls have been saved in this conversation yet.</div>';
      timeline.dataset.v1129Compacted='1';
      return;
    }

    timeline.classList.add('cf-recents-list-v1129');
    timeline.innerHTML=calls.map((call,index)=>({call,index})).reverse().map(({call,index})=>{
      const dt=dateTime1129(call.createdAt);
      const duration=String(call.duration||'00:00');
      return `<article class="cf-recents-row-v1129">
        <div class="cf-recents-copy-v1129">
          <strong class="cf-recents-title-v1129">${esc1129(brief1129(call.topic))}</strong>
          <span class="cf-recents-number-v1129">Call ${index+1}</span>
          <div class="cf-recents-meta-v1129">
            <span>${esc1129(dt.date)}</span>
            ${dt.time?`<span>${esc1129(dt.time)}</span>`:''}
            <span>${esc1129(duration)}</span>
          </div>
        </div>
        <button type="button" class="cf-recents-copy-btn-v1129 cf-copy-call-btn" title="Copy call details" aria-label="Copy call details" data-copy-call-thread="${esc1129(thread.id)}" data-copy-call-index="${index}">⧉<span class="cf-recents-copy-label-v1129">Copy call details</span></button>
      </article>`;
    }).join('');
    timeline.dataset.v1129Compacted='1';
  }

  function schedule1129(id){
    const run=()=>compact1129(activeThread1129(id));
    requestAnimationFrame(run);
    setTimeout(run,0);
    setTimeout(run,120);
  }

  // Load last and wrap the final thread renderer so every open/re-open uses the compact list.
  if(typeof renderThreadDetail==='function'){
    const previous=renderThreadDetail;
    renderThreadDetail=function(id){
      previous(id);
      schedule1129(id);
    };
  }

  // Also wrap selection because routing/restoration can select a thread after account hydration.
  if(typeof selectThread==='function'){
    const previousSelect=selectThread;
    selectThread=function(id){
      const result=previousSelect(id);
      schedule1129(id);
      return result;
    };
  }

  // Defensive observer: if any later render paints the old large cards, compact it immediately.
  const panel=document.getElementById('threadDetailPanel');
  if(panel){
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      const timeline=panel.querySelector('.cf-call-timeline');
      if(!timeline) return;
      if(timeline.querySelector('.cf-call-entry') || !timeline.dataset.v1129Compacted){
        queued=true;
        requestAnimationFrame(()=>{
          queued=false;
          compact1129(activeThread1129());
        });
      }
    });
    observer.observe(panel,{childList:true,subtree:true});
  }

  schedule1129();
})();
