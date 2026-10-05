/* CallFocus V11.24 — ChatGPT-style full-screen recent-call viewer */
(()=>{
  let previousViewV1124='home';
  let previousScrollYV1124=0;

  function chatScreenV1124(){ return document.getElementById('page-recent'); }
  function shadeV1124(){ return document.querySelector('.cf-v1124-drawer-shade'); }

  function ensureChatChromeV1124(){
    const page=chatScreenV1124();
    if(!page) return;

    if(!shadeV1124()){
      const shade=document.createElement('button');
      shade.type='button';
      shade.className='cf-v1124-drawer-shade';
      shade.setAttribute('aria-label','Close conversation list');
      shade.addEventListener('click',()=>closeDrawerV1124());
      page.appendChild(shade);
    }

    const header=page.querySelector('.cf-chat-header');
    if(header && !header.querySelector('[data-v1124-close-chat]')){
      const close=document.createElement('button');
      close.type='button';
      close.className='cf-v1124-chat-close';
      close.setAttribute('data-v1124-close-chat','');
      close.setAttribute('aria-label','Close call history');
      close.innerHTML='<span aria-hidden="true">×</span><b>Close</b>';
      header.appendChild(close);
    }
  }

  function closeDrawerV1124(){
    document.querySelector('.recent-list-panel')?.classList.remove('mobile-open');
    document.querySelector('.cf-conversation-backdrop')?.classList.remove('show');
    document.body.classList.remove('cf-drawer-open');
    shadeV1124()?.classList.remove('show');
  }

  function openChatScreenV1124(){
    if(!account || !data) return;
    if(!document.body.classList.contains('cf-chat-screen-open')){
      previousViewV1124=(typeof activeView!=='undefined' && activeView)?activeView:'home';
      previousScrollYV1124=window.scrollY||0;
    }
    document.body.classList.add('cf-chat-screen-open');
    requestAnimationFrame(()=>{
      ensureChatChromeV1124();
      chatScreenV1124()?.querySelector('.cf-chat-scroll')?.scrollTo({top:0,behavior:'instant'});
    });
  }

  function closeChatScreenV1124(){
    closeDrawerV1124();
    document.body.classList.remove('cf-chat-screen-open');
    const destination=previousViewV1124==='recent'?'home':previousViewV1124;
    if(typeof showView==='function') showView(destination||'home',false);
    requestAnimationFrame(()=>window.scrollTo(0,previousScrollYV1124||0));
  }

  // V11.23 already compacts each call to date, time, duration and a short summary.
  // This wrapper only upgrades the navigation into a dedicated full-screen conversation viewer.
  const previousRenderThreadDetailV1124=typeof renderThreadDetail==='function'?renderThreadDetail:null;
  if(previousRenderThreadDetailV1124){
    renderThreadDetail=function(id){
      previousRenderThreadDetailV1124(id);
      requestAnimationFrame(()=>{
        ensureChatChromeV1124();
        if(document.body.classList.contains('cf-chat-screen-open')){
          chatScreenV1124()?.querySelector('.cf-chat-scroll')?.scrollTo({top:0,behavior:'instant'});
        }
      });
    };
  }

  // Capture home/mobile Recent Call clicks before the legacy handler changes views.
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open-thread]');
    const mobile=e.target.closest('[data-mobile-thread]');
    if(open || mobile){
      openChatScreenV1124();
      return; // let the existing CallFocus handler select the thread normally
    }

    if(e.target.closest('[data-v9-open-conversations]')){
      requestAnimationFrame(()=>shadeV1124()?.classList.add('show'));
      return;
    }

    if(e.target.closest('[data-select-thread]')){
      shadeV1124()?.classList.remove('show');
      return;
    }

    if(e.target.closest('[data-v1124-close-chat]')){
      e.preventDefault();
      e.stopPropagation();
      closeChatScreenV1124();
    }
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && document.body.classList.contains('cf-chat-screen-open')) closeChatScreenV1124();
  });
})();
