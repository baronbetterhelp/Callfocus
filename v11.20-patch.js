/* CallFocus V11.20 — Paystack checkout, verified wallet credit + reusable DVA */
(()=>{
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  let walletRefreshTimer=null;
  let checkoutBusy=false;
  let dvaBusy=false;

  function token(){ return localStorage.getItem(SERVER_TOKEN_KEY)||''; }
  function signedIn(){ return !!token() && typeof account!=='undefined' && !!account; }

  async function cfFetch(path, options={}){
    const headers=new Headers(options.headers||{});
    const t=token();
    if(t) headers.set('Authorization',`Bearer ${t}`);
    if(options.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json');
    return fetch(path,{...options,headers,cache:'no-store'});
  }

  async function readJson(res){
    try{return await res.json();}catch{return {};}
  }

  function applyWallet(wallet,{save=false}={}){
    if(!wallet||typeof account==='undefined'||!account||typeof data==='undefined'||!data) return;
    const currentRevision=Number(data?.wallet?.revision||0);
    const nextRevision=Number(wallet?.revision||0);
    if(nextRevision<currentRevision) return;
    data.wallet=wallet;
    try{
      if(typeof writeJSON==='function'&&typeof accountDataKey==='function') writeJSON(accountDataKey(account.id),data);
    }catch{}
    if(save){ try{if(typeof saveData==='function')saveData();}catch{} }
    try{window.CallFocusCredits?.render?.();}catch{}
    try{if(typeof renderAccountUI==='function')renderAccountUI();if(typeof renderWorkspace==='function')renderWorkspace();}catch{}
    renderDva(wallet?.paystackDva||null);
  }

  function setTransferStatus(message,type='info'){
    const el=document.getElementById('paystackTransferStatus');
    if(!el)return;
    if(!message){el.classList.add('hidden');el.textContent='';el.dataset.type='';return;}
    el.textContent=message;
    el.dataset.type=type;
    el.classList.remove('hidden');
  }

  function renderDva(dva){
    const empty=document.getElementById('paystackTransferEmpty');
    const ready=document.getElementById('paystackTransferReady');
    if(!empty||!ready)return;
    if(dva?.accountNumber){
      empty.classList.add('hidden');ready.classList.remove('hidden');
      const bank=document.getElementById('paystackDvaBank');
      const name=document.getElementById('paystackDvaName');
      const number=document.getElementById('paystackDvaNumber');
      const badge=document.getElementById('paystackModeBadge');
      if(bank)bank.textContent=dva.bankName||'Paystack virtual account';
      if(name)name.textContent=dva.accountName||'CallFocus customer';
      if(number)number.textContent=dva.accountNumber||'—';
      if(badge)badge.textContent=dva.testMode?'Paystack test':'Paystack live';
    }else{
      ready.classList.add('hidden');empty.classList.remove('hidden');
    }
  }

  async function refreshWallet({quiet=true}={}){
    if(!token())return null;
    let res,payload;
    try{res=await cfFetch('/api/paystack/wallet');payload=await readJson(res);}catch{return null;}
    if(!res.ok){ if(!quiet&&payload?.error) window.toast?.(payload.error); return null; }
    if(payload?.wallet) applyWallet(payload.wallet);
    const badge=document.getElementById('paystackModeBadge');
    if(badge) badge.textContent=payload?.testMode?'Paystack test':'Paystack live';
    return payload;
  }

  async function checkout(credits){
    if(checkoutBusy)return;
    if(!token()||typeof account==='undefined'||!account){
      try{window.showAuth?.('signin',null,'Sign in before purchasing CallFocus credits.');}catch{}
      return;
    }
    checkoutBusy=true;
    const btn=document.getElementById('creditCheckoutBtn');
    const oldHtml=btn?.innerHTML;
    if(btn){btn.disabled=true;btn.innerHTML='<span>Opening Paystack…</span><small>Secure checkout</small>';}
    try{
      const res=await cfFetch('/api/paystack/initialize',{method:'POST',body:JSON.stringify({credits})});
      const payload=await readJson(res);
      if(!res.ok) throw new Error(payload?.error||'Could not start Paystack checkout.');
      if(!payload?.authorizationUrl) throw new Error('Paystack did not return a checkout link.');
      sessionStorage.setItem('callfocus_paystack_reference',payload.reference||'');
      location.href=payload.authorizationUrl;
    }catch(err){
      window.toast?.(err?.message||'Could not start Paystack checkout.');
      checkoutBusy=false;
      if(btn){btn.disabled=false;if(oldHtml)btn.innerHTML=oldHtml;}
    }
  }

  async function verifyReturn(){
    const url=new URL(location.href);
    const isReturn=url.searchParams.get('paystack')==='return';
    const reference=url.searchParams.get('reference')||url.searchParams.get('trxref')||sessionStorage.getItem('callfocus_paystack_reference')||'';
    if(!isReturn&&!url.searchParams.get('reference')&&!url.searchParams.get('trxref'))return;
    if(!reference)return;

    for(let i=0;i<24&&(!token()||typeof account==='undefined'||!account||typeof data==='undefined'||!data);i++) await new Promise(r=>setTimeout(r,250));
    if(!token()){
      window.toast?.('Sign in to finish verifying your Paystack payment.');
      return;
    }
    window.toast?.('Verifying Paystack payment…');
    try{
      const res=await cfFetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
      const payload=await readJson(res);
      if(!res.ok) throw new Error(payload?.error||'Could not verify this payment.');
      if(payload?.wallet) applyWallet(payload.wallet,{save:false});
      if(payload?.transactionStatus==='success'){
        const credits=payload?.record?.credits;
        window.toast?.(payload?.credited
          ? `Payment verified${credits?` · ${credits} credits added`:''}`
          : 'Payment verified · your CallFocus balance is up to date');
      }else{
        window.toast?.('Paystack has not marked this payment successful yet.');
      }
      sessionStorage.removeItem('callfocus_paystack_reference');
      url.searchParams.delete('paystack');url.searchParams.delete('reference');url.searchParams.delete('trxref');
      history.replaceState({},'',url.pathname+url.search+url.hash);
      try{window.showView?.('credits',false);}catch{}
    }catch(err){window.toast?.(err?.message||'Could not verify the Paystack payment.');}
  }

  async function createDva(){
    if(dvaBusy)return;
    if(!token()||typeof account==='undefined'||!account){
      try{window.showAuth?.('signin',null,'Sign in before creating your Paystack transfer account.');}catch{}
      return;
    }
    dvaBusy=true;
    const btn=document.getElementById('paystackCreateDvaBtn');
    const old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Creating account…';}
    setTransferStatus('Creating your reusable Paystack transfer account…','info');
    try{
      const res=await cfFetch('/api/paystack/dva',{method:'POST',body:JSON.stringify({consent:true})});
      const payload=await readJson(res);
      if(!res.ok&&res.status!==202) throw new Error(payload?.error||'Could not create the transfer account.');
      if(payload?.wallet) applyWallet(payload.wallet);
      if(payload?.dva?.accountNumber){
        renderDva(payload.dva);setTransferStatus('Transfer account ready. You can reuse this account number for future top-ups.','success');
      }else{
        setTransferStatus(payload?.error||'Paystack is still preparing the transfer account. Try again shortly.','info');
      }
    }catch(err){setTransferStatus(err?.message||'Could not create the transfer account.','error');window.toast?.(err?.message||'Could not create the transfer account.');}
    finally{dvaBusy=false;if(btn){btn.disabled=false;btn.textContent=old||'Create transfer account';}}
  }

  async function copyDva(){
    const value=document.getElementById('paystackDvaNumber')?.textContent?.trim();
    if(!value||value==='—')return;
    try{await navigator.clipboard.writeText(value);window.toast?.('Account number copied');}
    catch{window.toast?.('Could not copy the account number');}
  }

  window.CallFocusPaystack={checkout,refreshWallet,createDva};

  document.getElementById('paystackCreateDvaBtn')?.addEventListener('click',createDva);
  document.getElementById('paystackCopyDvaBtn')?.addEventListener('click',copyDva);

  // Keep DVA bank transfers and webhook-added credits visible without forcing a refresh.
  function startWalletRefresh(){
    clearInterval(walletRefreshTimer);
    walletRefreshTimer=setInterval(()=>{if(document.visibilityState==='visible'&&token())refreshWallet({quiet:true});},20000);
  }
  window.addEventListener('focus',()=>refreshWallet({quiet:true}));
  window.addEventListener('pageshow',()=>refreshWallet({quiet:true}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshWallet({quiet:true});});

  setTimeout(()=>{refreshWallet({quiet:true});verifyReturn();startWalletRefresh();},500);
})();
