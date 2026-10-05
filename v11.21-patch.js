/* CallFocus V11.21 — recover successful Paystack payments when callback/webhook was missed */
(()=>{
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  const RECOVERY_STAMP_KEY='callfocus_paystack_recovery_v1121';
  let recoveryBusy=false;

  function token(){ return localStorage.getItem(SERVER_TOKEN_KEY)||''; }
  async function readJson(res){ try{return await res.json();}catch{return {};} }

  async function cfFetch(path, options={}){
    const headers=new Headers(options.headers||{});
    const t=token();
    if(t) headers.set('Authorization',`Bearer ${t}`);
    if(options.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json');
    return fetch(path,{...options,headers,cache:'no-store'});
  }

  function applyRecoveredWallet(wallet){
    if(!wallet||typeof account==='undefined'||!account||typeof data==='undefined'||!data)return;
    const currentRevision=Number(data?.wallet?.revision||0);
    const nextRevision=Number(wallet?.revision||0);
    if(nextRevision<currentRevision)return;
    data.wallet=wallet;
    try{ if(typeof writeJSON==='function'&&typeof accountDataKey==='function') writeJSON(accountDataKey(account.id),data); }catch{}
    try{ window.CallFocusCredits?.render?.(); }catch{}
    try{ if(typeof renderAccountUI==='function')renderAccountUI(); if(typeof renderWorkspace==='function')renderWorkspace(); }catch{}
  }

  async function recoverRecent({quiet=true,force=false}={}){
    if(recoveryBusy||!token())return null;
    const now=Date.now();
    if(!force){
      const last=Number(sessionStorage.getItem(RECOVERY_STAMP_KEY)||0);
      if(last&&now-last<30000)return null;
    }
    recoveryBusy=true;
    try{
      const res=await cfFetch('/api/paystack/recover',{method:'POST'});
      const payload=await readJson(res);
      if(!res.ok) throw new Error(payload?.error||'Could not recover recent Paystack payments.');
      sessionStorage.setItem(RECOVERY_STAMP_KEY,String(Date.now()));
      if(payload?.wallet) applyRecoveredWallet(payload.wallet);
      const recovered=Array.isArray(payload?.recovered)?payload.recovered:[];
      if(recovered.length){
        const credits=recovered.reduce((sum,r)=>sum+(Number(r?.credits)||0),0);
        window.toast?.(`Payment verified${credits?` · ${credits} credits added`:''}`);
        try{ window.showView?.('credits',false); }catch{}
      }else if(!quiet){
        window.toast?.('Your Paystack payment history is already up to date.');
      }
      return payload;
    }catch(err){
      if(!quiet)window.toast?.(err?.message||'Could not recover recent Paystack payments.');
      return null;
    }finally{ recoveryBusy=false; }
  }

  window.CallFocusPaystack=window.CallFocusPaystack||{};
  window.CallFocusPaystack.recoverRecent=recoverRecent;

  async function recoverWhenAccountReady(){
    // Server auth restoration happens after page scripts load. Wait for the same
    // account object used by the credits UI, then recover once automatically.
    for(let i=0;i<48;i++){
      if(token()&&typeof account!=='undefined'&&account&&typeof data!=='undefined'&&data){
        await recoverRecent({quiet:true});
        return;
      }
      await new Promise(r=>setTimeout(r,250));
    }
  }

  // V11.20 may verify a normal callback first. V11.21 runs shortly afterwards,
  // and the server idempotency marker guarantees the same reference cannot credit twice.
  setTimeout(recoverWhenAccountReady,1100);

  window.addEventListener('focus',()=>{
    if(token())recoverRecent({quiet:true});
  });
})();
