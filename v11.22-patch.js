/* CallFocus V11.22 — Paystack wallet reconciliation follow-up */
(()=>{
  // V11.21 already owns the recovery UI. Force a few quiet recovery passes
  // after this build loads so Cloudflare KV has time to converge if the payment
  // and a browser data-sync happened almost simultaneously. Every pass is
  // server-verified and reference-idempotent, so an existing wallet purchase is
  // not added twice.
  async function run(){
    for(let i=0;i<40;i++){
      const fn=window.CallFocusPaystack?.recoverRecent;
      if(typeof fn==='function'){
        try{ await fn({quiet:true,force:true}); }catch{}
        return;
      }
      await new Promise(r=>setTimeout(r,250));
    }
  }
  [1800,8000,20000].forEach(ms=>setTimeout(run,ms));
})();
