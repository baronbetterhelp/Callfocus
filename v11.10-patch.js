/* CallFocus V11.10 — protect unsent Recent Calls composer text */
(()=>{
  const drafts=new Map();

  function draftKey(threadId){
    const accountId=window.account?.id || 'guest';
    return `${accountId}:${threadId || window.selectedThreadId || ''}`;
  }

  function captureCurrentDraft(){
    const field=document.getElementById('repeatTopic');
    if(!field || !window.selectedThreadId) return;
    drafts.set(draftKey(window.selectedThreadId),field.value);
  }

  function restoreDraft(threadId){
    const field=document.getElementById('repeatTopic');
    if(!field) return;
    const key=draftKey(threadId);
    if(drafts.has(key)) field.value=drafts.get(key);
  }

  // Keep the draft in memory whenever the customer types or pastes.
  document.addEventListener('input',e=>{
    if(e.target?.id==='repeatTopic' && window.selectedThreadId){
      drafts.set(draftKey(window.selectedThreadId),e.target.value);
    }
  },true);

  // Safeguard against any future workspace redraws from unrelated UI updates.
  if(typeof window.renderThreadDetail==='function'){
    const originalRenderThreadDetail=window.renderThreadDetail;
    window.renderThreadDetail=function(id){
      captureCurrentDraft();
      const result=originalRenderThreadDetail(id);
      restoreDraft(id);
      return result;
    };
  }

  // A successfully prepared call consumes the draft. Failed validation keeps it.
  if(typeof window.prepareRepeatCall==='function'){
    const originalPrepareRepeatCall=window.prepareRepeatCall;
    window.prepareRepeatCall=function(threadId){
      captureCurrentDraft();
      const result=originalPrepareRepeatCall(threadId);
      if(result?.call && !result?.error) drafts.delete(draftKey(threadId));
      return result;
    };
  }
})();
