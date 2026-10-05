/* CallFocus V11.16 — delete individual Recent Call conversations */
(()=>{
  let pendingDeleteThreadId = null;

  function ensureDeleteConversationModal(){
    if(document.getElementById('deleteConversationModal')) return;
    const wrap=document.createElement('div');
    wrap.className='modal-backdrop hidden';
    wrap.id='deleteConversationModal';
    wrap.innerHTML=`
      <div class="modal small-modal cf-delete-conversation-modal" role="dialog" aria-modal="true" aria-labelledby="deleteConversationTitle">
        <div class="modal-head">
          <div>
            <span class="section-eyebrow danger-text">Delete conversation</span>
            <h2 id="deleteConversationTitle">Delete this call thread?</h2>
            <p id="deleteConversationMessage">This removes this conversation and its call history from Recent Calls.</p>
          </div>
          <button class="modal-close" type="button" data-delete-conversation-close aria-label="Close">×</button>
        </div>
        <div class="cf-delete-conversation-note">
          <strong>Your saved caller stays in My Callers.</strong>
          <span>You can still start a completely new conversation with that person later.</span>
        </div>
        <div class="form-actions end cf-delete-conversation-actions">
          <button class="btn btn-ghost" type="button" data-delete-conversation-close>Cancel</button>
          <button class="btn danger-button" type="button" id="confirmDeleteConversationBtn">Delete conversation</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.addEventListener('click',e=>{
      if(e.target===wrap || e.target.closest('[data-delete-conversation-close]')) closeDeleteConversationModal();
    });
    document.getElementById('confirmDeleteConversationBtn').addEventListener('click',confirmDeleteConversation);
  }

  function openDeleteConversationModal(threadId){
    const thread=data?.threads?.find(t=>t.id===threadId);
    if(!thread) return;
    if(live?.current?.threadId===threadId && (live.connected || live.dc?.readyState==='open')){
      toast('End the active call before deleting this conversation.');
      return;
    }
    ensureDeleteConversationModal();
    pendingDeleteThreadId=threadId;
    const title=document.getElementById('deleteConversationTitle');
    const msg=document.getElementById('deleteConversationMessage');
    if(title) title.textContent=`Delete “${thread.title || thread.callerName || 'this conversation'}”?`;
    if(msg) msg.textContent=`This permanently removes this Recent Calls thread and all ${thread.calls?.length || 0} saved call${(thread.calls?.length||0)===1?'':'s'} inside it from this CallFocus account.`;
    document.getElementById('deleteConversationModal')?.classList.remove('hidden');
    document.body.style.overflow='hidden';
  }

  function closeDeleteConversationModal(){
    document.getElementById('deleteConversationModal')?.classList.add('hidden');
    pendingDeleteThreadId=null;
    if(document.getElementById('callScreen')?.classList.contains('hidden')) document.body.style.overflow='';
  }

  function confirmDeleteConversation(){
    const id=pendingDeleteThreadId;
    if(!id || !data?.threads) return closeDeleteConversationModal();
    const thread=data.threads.find(t=>t.id===id);
    if(!thread) return closeDeleteConversationModal();

    data.threads=data.threads.filter(t=>t.id!==id);
    saveData();

    const remaining=sortedThreads();
    selectedThreadId=remaining[0]?.id || null;
    closeDeleteConversationModal();

    renderWorkspace();
    renderMobileRecents();
    renderRecentThreads();
    toast('Conversation deleted. Saved caller kept.');
  }

  function addDeleteButton(threadId){
    const panel=document.getElementById('threadDetailPanel');
    if(!panel) return;
    const header=panel.querySelector('.cf-chat-header') || panel.querySelector('.thread-detail-head');
    if(!header || header.querySelector('[data-delete-thread]')) return;

    header.classList.add('cf-thread-head-with-delete');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cf-thread-delete-btn';
    btn.dataset.deleteThread=threadId;
    btn.setAttribute('aria-label','Delete this conversation');
    btn.title='Delete conversation';
    btn.innerHTML='<span aria-hidden="true">⌫</span><b>Delete</b>';
    header.appendChild(btn);
  }

  if(typeof renderThreadDetail==='function'){
    const previousRenderThreadDetail=renderThreadDetail;
    renderThreadDetail=function(id){
      const result=previousRenderThreadDetail(id);
      addDeleteButton(id);
      return result;
    };
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-delete-thread]');
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openDeleteConversationModal(btn.dataset.deleteThread);
  },true);

  ensureDeleteConversationModal();
  if(typeof activeView!=='undefined' && activeView==='recent' && selectedThreadId) addDeleteButton(selectedThreadId);
})();
