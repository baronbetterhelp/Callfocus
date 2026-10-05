/* CallFocus V11.25 — keep the conversation viewer pinned to its real top on iOS */
(()=>{
  function resetConversationScrollV1125(){
    if(!document.body.classList.contains('cf-chat-screen-open')) return;
    const scroller=document.querySelector('#page-recent .cf-chat-scroll');
    if(!scroller) return;
    scroller.scrollTop=0;
  }

  /* Re-run after the legacy Recent Calls render has finished and after iOS has
     resolved its visual viewport. */
  document.addEventListener('click',e=>{
    if(!e.target.closest('[data-open-thread],[data-mobile-thread],[data-select-thread]')) return;
    requestAnimationFrame(()=>requestAnimationFrame(resetConversationScrollV1125));
  },true);

  window.visualViewport?.addEventListener('resize',()=>{
    if(document.body.classList.contains('cf-chat-screen-open')){
      document.documentElement.style.setProperty('--cf-v1125-vvh',`${window.visualViewport.height}px`);
    }
  });
})();
