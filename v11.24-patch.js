/* CallFocus V11.24 — close active Recent Calls chat */
(()=>{
  function addCloseChatButtonV1124(){
    const panel=document.getElementById('threadDetailPanel');
    if(!panel) return;
    const header=panel.querySelector('.cf-chat-header') || panel.querySelector('.thread-detail-head');
    if(!header || header.querySelector('[data-close-thread-chat]')) return;

    header.classList.add('cf-thread-head-with-close');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cf-thread-close-btn';
    btn.dataset.closeThreadChat='';
    btn.setAttribute('aria-label','Close this conversation');
    btn.title='Close conversation';
    btn.innerHTML='<span aria-hidden="true">×</span><b>Close</b>';
    header.appendChild(btn);
  }

  function showConversationListV1124(){
    const listPanel=document.querySelector('.recent-list-panel');
    const backdrop=document.querySelector('.cf-conversation-backdrop');
    if(window.matchMedia('(max-width:1000px)').matches){
      listPanel?.classList.add('mobile-open');
      backdrop?.classList.add('show');
      document.body.classList.add('cf-drawer-open');
    }
  }

  function closeThreadChatV1124(){
    try{ selectedThreadId=null; }catch{}

    document.querySelectorAll('.recent-thread-button.active').forEach(el=>el.classList.remove('active'));
    const panel=document.getElementById('threadDetailPanel');
    if(panel){
      panel.innerHTML=`<div class="empty-thread-detail cf-closed-thread-state">
        <div><strong>Conversation closed</strong><span>Select a recent call to open another conversation.</span></div>
      </div>`;
    }

    showConversationListV1124();
    const recentPage=document.getElementById('page-recent');
    if(recentPage) recentPage.scrollIntoView({block:'start',behavior:'smooth'});
  }

  if(typeof renderThreadDetail==='function'){
    const previousRenderThreadDetail=renderThreadDetail;
    renderThreadDetail=function(id){
      const result=previousRenderThreadDetail(id);
      requestAnimationFrame(addCloseChatButtonV1124);
      return result;
    };
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-close-thread-chat]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    closeThreadChatV1124();
  },true);

  requestAnimationFrame(addCloseChatButtonV1124);
})();
