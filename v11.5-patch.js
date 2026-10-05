/* CallFocus V11.5 — unlimited-credit entitlement by account email */
(()=>{
  const state={unlimited:false,loaded:false,email:''};
  window.CallFocusEntitlements=state;

  function applyEntitlementUi(){
    document.documentElement.dataset.creditAccess=state.unlimited?'unlimited':'metered';
    try{window.CallFocusCredits?.render?.();}catch{}
    try{renderWorkspace();}catch{}
  }

  async function refreshEntitlement(){
    if(!account?.email){state.unlimited=false;state.loaded=true;state.email='';applyEntitlementUi();return state;}
    const email=String(account.email).trim().toLowerCase();
    state.email=email; state.loaded=false;
    try{
      const res=await fetch('/api/credit-entitlement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email}),cache:'no-store'});
      const payload=res.ok?await res.json():{};
      state.unlimited=payload?.unlimited===true;
    }catch{state.unlimited=false}
    state.loaded=true; applyEntitlementUi(); return state;
  }
  window.CallFocusEntitlements.refresh=refreshEntitlement;

  const previousSetSession=setSession;
  setSession=function(acc){const result=previousSetSession(acc);queueMicrotask(refreshEntitlement);return result;};
  const previousSignOut=signOut;
  signOut=function(){state.unlimited=false;state.loaded=true;state.email='';document.documentElement.dataset.creditAccess='metered';return previousSignOut();};

  if(account?.email) refreshEntitlement(); else applyEntitlementUi();
})();
