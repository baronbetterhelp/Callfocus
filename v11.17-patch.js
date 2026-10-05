/* CallFocus V11.17 — server-backed accounts + one-time Workers.dev migration */
(()=>{
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  const CANONICAL_ORIGIN='https://callfocus.link';
  const LEGACY_HOST='callfocus.baronbetterhelp.workers.dev';
  const isLegacyHost=location.hostname===LEGACY_HOST;
  const isCustomHost=location.hostname==='callfocus.link'||location.hostname==='www.callfocus.link';
  let serverToken=localStorage.getItem(SERVER_TOKEN_KEY)||'';
  let syncTimer=null;
  let syncInFlight=false;
  let pendingSync=false;
  let serverReady=false;

  function legacySnapshot(){
    try{
      const id=localStorage.getItem(SESSION_KEY);
      if(!id) return null;
      const acc=accounts().find(a=>a.id===id);
      if(!acc) return null;
      const saved=readJSON(accountDataKey(acc.id),defaultData(acc.name));
      return {account:acc,data:saved};
    }catch{return null;}
  }

  function cacheServerUser(user){
    try{
      const list=accounts();
      const idx=list.findIndex(a=>a.id===user.id||String(a.email||'').toLowerCase()===String(user.email||'').toLowerCase());
      if(idx>=0) list[idx]={...list[idx],...user}; else list.push({...user});
      writeJSON(ACCOUNTS_KEY,list);
    }catch{}
  }

  function clearEntitlement(){
    try{
      if(window.CallFocusEntitlements){
        window.CallFocusEntitlements.unlimited=false;
        window.CallFocusEntitlements.loaded=true;
        window.CallFocusEntitlements.email='';
      }
      document.documentElement.dataset.creditAccess='metered';
      window.CallFocusCredits?.render?.();
    }catch{}
  }

  function setServerSession(user,serverData,token,{render=true}={}){
    if(token){serverToken=token;localStorage.setItem(SERVER_TOKEN_KEY,token);}
    account={...user};
    data=(serverData&&typeof serverData==='object')?serverData:defaultData(user?.name||'');
    data.profile ||= defaultData(user?.name||'').profile;
    data.profile.name ||= user?.name||'';
    data.callers ||= [];
    data.threads ||= [];
    cacheServerUser(account);
    localStorage.setItem(SESSION_KEY,account.id);
    writeJSON(accountDataKey(account.id),data);
    serverReady=true;
    if(render){renderAccountUI();renderWorkspace();}
    try{window.CallFocusEntitlements?.refresh?.();}catch{}
  }

  async function serverFetch(path,options={}){
    const headers=new Headers(options.headers||{});
    if(serverToken) headers.set('Authorization',`Bearer ${serverToken}`);
    if(options.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json');
    return fetch(path,{...options,headers,cache:'no-store'});
  }

  async function readPayload(res){
    let body={};
    try{body=await res.json();}catch{}
    return body;
  }

  async function syncNow(){
    if(!serverToken||!account||!data||syncInFlight){pendingSync=!!serverToken;return;}
    syncInFlight=true;pendingSync=false;
    try{
      const res=await serverFetch('/api/account/data',{method:'PUT',body:JSON.stringify({data})});
      if(res.status===401){serverToken='';localStorage.removeItem(SERVER_TOKEN_KEY);return;}
      if(res.ok){
        const payload=await readPayload(res);
        if(payload?.user) account={...account,...payload.user};
      }
    }catch{}
    finally{
      syncInFlight=false;
      if(pendingSync) scheduleSync(250);
    }
  }

  function scheduleSync(delay=2200){
    if(!serverToken||!account||!data)return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncNow,delay);
  }

  // From this point onward every existing CallFocus feature can keep calling
  // saveData(). It still gets an instant local cache, while KV sync happens in
  // the background so callers, threads, profile and wallet follow the account.
  saveData=function(){
    if(!account||!data)return;
    try{writeJSON(accountDataKey(account.id),data);}catch{}
    renderAccountUI();renderWorkspace();
    scheduleSync();
  };

  setSession=function(acc){
    const cached=readJSON(accountDataKey(acc.id),defaultData(acc.name));
    setServerSession(acc,cached,serverToken);
  };

  async function createAccountServer(event){
    event?.preventDefault?.();
    const name=$('signupName').value.trim();
    const email=$('signupEmail').value.trim().toLowerCase();
    const phone=String($('signupPhone')?.value||'').trim();
    const password=$('signupPassword').value;
    const confirm=$('signupConfirm').value;
    if(!name||!email||!phone||!password||!confirm)return toast('Complete every account field, including your mobile number');
    if(password.length<8)return toast('Use at least 8 characters for your password');
    if(password!==confirm)return toast('Passwords do not match');
    let res,payload;
    try{
      res=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,password}),cache:'no-store'});
      payload=await readPayload(res);
    }catch{return toast('Could not create the account right now. Try again.');}
    if(!res.ok)return toast(payload?.error||'Could not create the account');
    setServerSession(payload.user,payload.data,payload.token);
    closeModal('authModal');toast('Account created · starter call credit added');runPendingAction();
  }

  async function migrateSnapshot(snapshot,{redirect=true}={}){
    if(!snapshot?.account?.email||!snapshot?.account?.passwordHash) throw new Error('Old account data is incomplete.');
    const res=await fetch('/api/auth/migrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),cache:'no-store'});
    const payload=await readPayload(res);
    if(!res.ok) throw new Error(payload?.error||'Could not transfer the old account.');
    setServerSession(payload.user,payload.data,payload.token);
    if(redirect){
      const returnTo=new URLSearchParams(location.search).get('return');
      const target=(returnTo==='https://www.callfocus.link'||returnTo==='https://callfocus.link')?returnTo:CANONICAL_ORIGIN;
      location.replace(`${target}/#cf_session=${encodeURIComponent(payload.token)}`);
    }
    return payload;
  }

  async function signInServer(event){
    event?.preventDefault?.();
    const email=$('signinEmail').value.trim().toLowerCase();
    const password=$('signinPassword').value;
    if(!email||!password)return toast('Enter your email and password');
    let res,payload;
    try{
      res=await fetch('/api/auth/signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
      payload=await readPayload(res);
    }catch{return toast('Could not sign in right now. Try again.');}

    // When the old Workers.dev site is opened for migration, an account that
    // has never reached the server can still be verified locally, transferred,
    // and handed off to the new callfocus.link domain.
    if(!res.ok&&payload?.code==='account_not_found'&&isLegacyHost){
      try{
        const localAcc=accounts().find(a=>String(a.email||'').toLowerCase()===email);
        if(localAcc&&await verifyPassword(localAcc,password)){
          const localData=readJSON(accountDataKey(localAcc.id),defaultData(localAcc.name));
          await migrateSnapshot({account:localAcc,data:localData},{redirect:new URLSearchParams(location.search).get('migrate')==='1'});
          if(new URLSearchParams(location.search).get('migrate')!=='1'){
            closeModal('authModal');toast('Account moved to secure server storage');renderWorkspace();
          }
          return;
        }
      }catch(err){return toast(err?.message||'Could not transfer the old account');}
    }
    if(!res.ok){
      if(payload?.code==='account_not_found'&&isCustomHost){
        $('transferLegacyAccountBtn')?.classList.remove('hidden');
        $('legacyTransferNote')?.classList.remove('hidden');
      }
      return toast(payload?.error||'Could not sign in');
    }
    setServerSession(payload.user,payload.data,payload.token);
    closeModal('authModal');toast('Signed in');runPendingAction();
  }

  signOut=async function(){
    const oldToken=serverToken;
    serverToken='';serverReady=false;
    localStorage.removeItem(SERVER_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    if(oldToken){
      try{await fetch('/api/auth/signout',{method:'POST',headers:{Authorization:`Bearer ${oldToken}`},cache:'no-store'});}catch{}
    }
    account=null;data=null;selectedThreadId=null;clearEntitlement();
    try{closeMobileMenu();$('headerAccountDropdown').classList.add('hidden');}catch{}
    showView('home',false);renderAccountUI();renderWorkspace();toast('Signed out');
  };

  deleteAccount=async function(){
    if(!account)return;
    if($('deleteConfirmInput').value.trim()!=='DELETE')return toast('Type DELETE to confirm');
    let res;
    try{res=await serverFetch('/api/account',{method:'DELETE'});}catch{return toast('Could not delete the account right now');}
    if(!res.ok){const payload=await readPayload(res);return toast(payload?.error||'Could not delete the account');}
    const oldId=account.id;
    try{
      const list=accounts().filter(a=>a.id!==oldId);
      writeJSON(ACCOUNTS_KEY,list);
      localStorage.removeItem(accountDataKey(oldId));
    }catch{}
    serverToken='';serverReady=false;localStorage.removeItem(SERVER_TOKEN_KEY);localStorage.removeItem(SESSION_KEY);
    account=null;data=null;selectedThreadId=null;clearEntitlement();closeModal('deleteAccountModal');showView('home',false);renderAccountUI();renderWorkspace();toast('Account deleted');
  };

  restoreSession=async function(){
    if(!serverToken){account=null;data=null;renderAccountUI();renderWorkspace();return false;}
    try{
      const res=await serverFetch('/api/auth/session',{method:'GET'});
      const payload=await readPayload(res);
      if(!res.ok)throw new Error(payload?.error||'Session expired');
      setServerSession(payload.user,payload.data,serverToken);
      return true;
    }catch{
      serverToken='';localStorage.removeItem(SERVER_TOKEN_KEY);localStorage.removeItem(SESSION_KEY);account=null;data=null;renderAccountUI();renderWorkspace();return false;
    }
  };

  function consumeHandoffToken(){
    const hash=String(location.hash||'');
    const match=hash.match(/(?:^#|&)cf_session=([^&]+)/);
    if(!match)return false;
    serverToken=decodeURIComponent(match[1]);
    localStorage.setItem(SERVER_TOKEN_KEY,serverToken);
    try{history.replaceState(null,'',location.pathname+location.search);}catch{}
    return true;
  }

  async function transferLegacyAccount(){
    if(isLegacyHost){
      const snapshot=legacySnapshot();
      if(snapshot){
        try{await migrateSnapshot(snapshot,{redirect:true});}catch(err){toast(err?.message||'Could not transfer the account');}
        return;
      }
      showAuth('signin',null,'Sign in to your old CallFocus account once. We will securely move it to callfocus.link.');
      return;
    }
    location.href=`https://${LEGACY_HOST}/?migrate=1&return=${encodeURIComponent(CANONICAL_ORIGIN)}`;
  }

  async function bootServerAccount(){
    consumeHandoffToken();

    if(isCustomHost){
      $('transferLegacyAccountBtn')?.classList.remove('hidden');
      $('legacyTransferNote')?.classList.remove('hidden');
    }

    if(serverToken){await restoreSession();return;}

    // Quietly move an already-signed-in local account into KV whenever the user
    // visits the old Worker address after installing this update.
    if(isLegacyHost){
      const snapshot=legacySnapshot();
      if(snapshot){
        try{
          const migrating=new URLSearchParams(location.search).get('migrate')==='1';
          await migrateSnapshot(snapshot,{redirect:migrating});
          if(!migrating){toast('Account secured for callfocus.link');}
          return;
        }catch(err){
          if(new URLSearchParams(location.search).get('migrate')==='1') toast(err?.message||'Could not transfer the old account');
        }
      }
      if(new URLSearchParams(location.search).get('migrate')==='1'){
        showAuth('signin',null,'Sign in to your old CallFocus account once. We will securely move it to callfocus.link.');
        return;
      }
    }

    // On the new domain, do not treat old per-origin localStorage as the source
    // of truth. The server session is authoritative from V11.17 onward.
    if(isCustomHost){
      account=null;data=null;localStorage.removeItem(SESSION_KEY);renderAccountUI();renderWorkspace();
    }
  }

  createAccount=createAccountServer;
  signIn=signInServer;
  if($('signupForm'))$('signupForm').onsubmit=createAccount;
  if($('signinForm'))$('signinForm').onsubmit=signIn;
  if($('dropdownSignOutBtn'))$('dropdownSignOutBtn').onclick=signOut;
  if($('confirmDeleteAccountBtn'))$('confirmDeleteAccountBtn').onclick=deleteAccount;
  $('transferLegacyAccountBtn')?.addEventListener('click',transferLegacyAccount);

  // Keep the newest account state on the server when Safari backgrounds/closes.
  window.addEventListener('pagehide',()=>{
    if(!serverToken||!account||!data)return;
    try{
      fetch('/api/account/data',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${serverToken}`},body:JSON.stringify({data}),keepalive:true,cache:'no-store'}).catch(()=>{});
    }catch{}
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')syncNow();});

  window.CallFocusServerAccount={
    sync:syncNow,
    transferLegacyAccount,
    isServerReady:()=>serverReady,
    hasSession:()=>!!serverToken
  };

  bootServerAccount();
})();
