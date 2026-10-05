/* CallFocus V11.27 — real URL routes, refresh-safe pages and browser back/forward */
(()=>{
  const ROUTES={
    home:'/',
    'voice-notes':'/voice-notes',
    credits:'/credits',
    callers:'/callers',
    recent:'/recent-calls',
    profile:'/profile',
    settings:'/settings'
  };
  const TITLES={
    home:'CallFocus — Context for every call',
    'voice-notes':'Voice Notes — CallFocus',
    credits:'Call & Voice Credits — CallFocus',
    callers:'My Callers — CallFocus',
    recent:'Recent Calls — CallFocus',
    profile:'My Profile — CallFocus',
    settings:'Account Settings — CallFocus'
  };
  const PROTECTED=new Set(['voice-notes','credits','callers','recent','profile','settings']);
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';

  let applyingUrl=false;
  let initialRouteApplied=false;
  let pendingViewerThread='';
  const previousShowView=typeof showView==='function'?showView:null;
  const previousSelectThread=typeof selectThread==='function'?selectThread:null;
  if(!previousShowView) return;

  function cleanPath(pathname=location.pathname){
    let p=String(pathname||'/').replace(/\/{2,}/g,'/');
    if(p.length>1) p=p.replace(/\/+$/,'');
    return p || '/';
  }

  function parseUrl(){
    const path=cleanPath();
    const params=new URLSearchParams(location.search);
    if(path==='/' || path==='/home') return {view:'home',mode:'page',threadId:''};
    if(path==='/voice-notes') return {view:'voice-notes',mode:'page',threadId:''};
    if(path==='/credits') return {view:'credits',mode:'page',threadId:''};
    if(path==='/callers') return {view:'callers',mode:'page',threadId:''};
    if(path==='/profile') return {view:'profile',mode:'page',threadId:''};
    if(path==='/settings') return {view:'settings',mode:'page',threadId:''};
    if(path==='/recent-calls') return {view:'recent',mode:'manage',threadId:params.get('thread')||''};
    const m=path.match(/^\/recent-calls\/([^/]+)$/);
    if(m) return {view:'recent',mode:'viewer',threadId:decodeURIComponent(m[1])};
    return {view:'home',mode:'unknown',threadId:''};
  }

  function pageUrl(view){ return ROUTES[view] || '/'; }
  function viewerUrl(id){ return `/recent-calls/${encodeURIComponent(String(id||''))}`; }
  function manageThreadUrl(id){ return id ? `/recent-calls?thread=${encodeURIComponent(String(id))}` : '/recent-calls'; }

  function setHistory(url,{replace=false,state={}}={}){
    const current=location.pathname+location.search+location.hash;
    if(current===url) return;
    try{ history[replace?'replaceState':'pushState']({...state,cfRoute:true},'',url); }catch{}
  }

  function setPageTitle(view,threadId=''){
    if(view==='recent' && threadId && typeof data!=='undefined' && data?.threads){
      const thread=data.threads.find(t=>String(t.id)===String(threadId));
      document.title=thread?.title ? `${thread.title} — CallFocus` : TITLES.recent;
      return;
    }
    document.title=TITLES[view]||TITLES.home;
  }

  function closeViewerChrome(){
    document.body.classList.remove('cf-chat-screen-open','cf-drawer-open');
    document.querySelector('.recent-list-panel')?.classList.remove('mobile-open');
    document.querySelector('.cf-conversation-backdrop')?.classList.remove('show');
    document.querySelector('.cf-v1124-drawer-shade')?.classList.remove('show');
  }

  function markViewerOpen(){
    document.body.classList.add('cf-chat-screen-open');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.querySelector('#page-recent .cf-chat-scroll')?.scrollTo?.({top:0,behavior:'instant'});
    }));
  }

  function routeWasActuallyOpened(view){
    try{return typeof activeView==='undefined' || activeView===view;}catch{return true;}
  }

  // Every existing CallFocus button that already calls showView now also receives
  // a real browser URL and a history entry. Existing feature-specific wrappers are preserved.
  showView=function(view,scroll=true){
    const requested=String(view||'home');
    const before=typeof activeView!=='undefined'?activeView:null;
    previousShowView(requested,scroll);

    if(!routeWasActuallyOpened(requested)) return;
    setPageTitle(requested);

    if(!applyingUrl){
      // Opening the normal Recent Calls workspace always has its own page URL.
      const url=pageUrl(requested);
      setHistory(url,{replace:false,state:{view:requested,from:before}});
    }
    ensureBackButtons();
  };

  if(previousSelectThread){
    selectThread=function(id){
      previousSelectThread(id);
      const threadId=String(id||'');
      setPageTitle('recent',threadId);
      if(applyingUrl) return;
      if(document.body.classList.contains('cf-chat-screen-open')){
        setHistory(viewerUrl(threadId),{state:{view:'recent',threadId,viewer:true}});
      }else if(typeof activeView!=='undefined' && activeView==='recent'){
        // Keep management-page selection refresh-safe without filling browser
        // history with every thread selection.
        setHistory(manageThreadUrl(threadId),{replace:true,state:{view:'recent',threadId,viewer:false}});
      }
    };
  }

  function ensureBackButtons(){
    const configs=[
      ['#page-callers .app-page-head','My Callers'],
      ['#page-recent .app-page-head','Recent Calls'],
      ['#page-profile .app-page-head','My Profile'],
      ['#page-settings .app-page-head','Account Settings']
    ];
    configs.forEach(([selector,label])=>{
      const head=document.querySelector(selector);
      if(!head || head.querySelector('[data-cf-route-back]')) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cf-route-back';
      btn.setAttribute('data-cf-route-back','');
      btn.setAttribute('aria-label',`Go back from ${label}`);
      btn.innerHTML='<span aria-hidden="true">‹</span>';
      head.prepend(btn);
    });
    document.getElementById('voiceNotesBackBtn')?.setAttribute('data-cf-route-back','');
    document.getElementById('creditBackBtn')?.setAttribute('data-cf-route-back','');
  }

  function safeBack(fallback='/'){
    // Browser back is now meaningful because each page receives a real history entry.
    if(history.length>1){
      history.back();
      return;
    }
    setHistory(fallback,{replace:true});
    applyUrlRoute({replaceUnknown:true});
  }

  function knownThread(id){
    return !!(id && typeof data!=='undefined' && data?.threads?.some(t=>String(t.id)===String(id)));
  }

  async function waitForServerSessionIfNeeded(route){
    if(!PROTECTED.has(route.view) || typeof account!=='undefined' && account) return;
    let hasToken=false;
    try{hasToken=!!localStorage.getItem(SERVER_TOKEN_KEY);}catch{}
    if(!hasToken) return;
    const start=Date.now();
    while(Date.now()-start<4500){
      if(typeof account!=='undefined' && account) return;
      try{if(window.CallFocusServerAccount?.isServerReady?.()) return;}catch{}
      await new Promise(r=>setTimeout(r,80));
    }
  }

  async function applyUrlRoute({replaceUnknown=false}={}){
    const route=parseUrl();
    if(route.mode==='unknown'){
      setHistory('/',{replace:true,state:{view:'home'}});
      route.view='home'; route.mode='page';
    }else if(cleanPath()==='/home'){
      setHistory('/',{replace:true,state:{view:'home'}});
    }

    await waitForServerSessionIfNeeded(route);
    applyingUrl=true;
    try{
      if(route.mode==='viewer') markViewerOpen(); else closeViewerChrome();
      previousShowView(route.view,false);
      if(!routeWasActuallyOpened(route.view)){
        if(route.mode==='viewer') pendingViewerThread=route.threadId;
        return;
      }

      if(route.view==='recent' && route.threadId && typeof account!=='undefined' && account){
        if(knownThread(route.threadId)){
          if(route.mode==='viewer') markViewerOpen();
          previousSelectThread?.(route.threadId);
        }else{
          // A deleted/old thread URL should never trap the user.
          closeViewerChrome();
          setHistory('/recent-calls',{replace:true,state:{view:'recent'}});
        }
      }
      setPageTitle(route.view,route.threadId);
      ensureBackButtons();
    }finally{
      applyingUrl=false;
      initialRouteApplied=true;
    }
  }

  // If a protected deep link opened before the async KV-backed session finished,
  // finish that exact URL after sign-in/session restoration instead of dropping
  // the user on a different page.
  const accountWatcher=setInterval(()=>{
    if(!(typeof account!=='undefined' && account)) return;
    const route=parseUrl();
    if(pendingViewerThread || (PROTECTED.has(route.view) && route.view!==(typeof activeView!=='undefined'?activeView:''))){
      pendingViewerThread='';
      applyUrlRoute();
    }
    if(initialRouteApplied && !pendingViewerThread) clearInterval(accountWatcher);
  },180);
  setTimeout(()=>clearInterval(accountWatcher),10000);

  window.addEventListener('popstate',()=>applyUrlRoute());

  // Back buttons use browser history first and a safe home fallback second.
  // Window capture runs before older document-level handlers so the old
  // hard-coded "Back to home" callbacks cannot fight the real router.
  window.addEventListener('click',e=>{
    const back=e.target.closest?.('[data-cf-route-back]');
    if(back){
      e.preventDefault();
      e.stopImmediatePropagation();
      safeBack('/');
      return;
    }

    const close=e.target.closest?.('[data-v1124-close-chat]');
    if(close){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeViewerChrome();
      // Closing the dedicated history viewer returns to Recent Calls, never
      // deletes data, and leaves a refreshable /recent-calls URL.
      setHistory('/recent-calls',{replace:true,state:{view:'recent'}});
      applyingUrl=true;
      try{previousShowView('recent',false);setPageTitle('recent');}finally{applyingUrl=false;}
      return;
    }

    const brand=e.target.closest?.('a.brand');
    if(brand && brand.getAttribute('href')==='/'){
      e.preventDefault();
      e.stopImmediatePropagation();
      showView('home');
    }
  },true);

  // Make the URL of the dedicated ChatGPT-style viewer explicit before the
  // legacy thread selector updates its content.
  document.addEventListener('click',e=>{
    const open=e.target.closest?.('[data-open-thread],[data-mobile-thread]');
    if(open){
      const id=open.dataset.openThread||open.dataset.mobileThread||'';
      if(id) pendingViewerThread=String(id);
      return;
    }
    const select=e.target.closest?.('[data-select-thread]');
    if(select && document.body.classList.contains('cf-chat-screen-open')){
      // selectThread wrapper will set the final deep URL.
      pendingViewerThread=String(select.dataset.selectThread||'');
    }
  },true);

  ensureBackButtons();
  applyUrlRoute({replaceUnknown:true});

  window.CallFocusRouter={
    routes:{...ROUTES},
    current:parseUrl,
    go:(view)=>showView(view),
    openThread:(id)=>{
      markViewerOpen();
      showView('recent');
      selectThread?.(id);
    }
  };
})();
