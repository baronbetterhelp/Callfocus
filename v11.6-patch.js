/* CallFocus V11.6 — live unlimited-credit entitlement refresh */
(()=>{
  let refreshing=false;
  async function refreshUnlimitedAccess(){
    if(refreshing) return;
    const ent=window.CallFocusEntitlements;
    if(!ent?.refresh) return;
    refreshing=true;
    try{ await ent.refresh(); }catch{} finally{ refreshing=false; }
  }
  window.addEventListener('pageshow',refreshUnlimitedAccess);
  window.addEventListener('focus',refreshUnlimitedAccess);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') refreshUnlimitedAccess(); });
  setTimeout(refreshUnlimitedAccess,350);
  setInterval(()=>{ if(document.visibilityState==='visible') refreshUnlimitedAccess(); },15000);
})();
