/* CallFocus V11 — polished contact cards + call-credit wallet + pricing prototype */
(()=>{
  const CREDIT_RULES = Object.freeze({
    secondsPer100Credits: 120,
    nairaPer100Credits: 1000,
    minimumPurchaseCredits: 300,
    starterSeconds: 90,
    lowCreditEndSeconds: 12
  });

  let selectedCreditAmount = 300;
  let creditBurnTimer = null;
  let creditBurnStartedAt = 0;
  let creditBurnStartBalance = 0;
  let creditEndRequested = false;
  let lastSavedCreditSecond = null;
  const UNLIMITED_SENTINEL_SECONDS = 86400;
  function isUnlimitedAccount(){ return !!window.CallFocusEntitlements?.unlimited; }

  const contactIcon = () => `
    <span class="cf-contact-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 12.1a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z" stroke="currentColor" stroke-width="1.65"/>
        <path d="M5.8 19c.9-3 3-4.6 6.2-4.6 1.7 0 3.1.4 4.2 1.2" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/>
        <path d="M17.2 14.7c.35-.45 1.02-.5 1.42-.1l.5.5c.28.28.32.7.13 1.03l-.46.82c-.1.18-.08.38.06.52l.95.95c.14.14.35.16.52.06l.82-.46c.33-.19.75-.15 1.03.13l.5.5c.4.4.35 1.07-.1 1.42l-.55.44c-.5.4-1.18.55-1.82.36-1.14-.32-2.18-1-3.06-1.88-.88-.88-1.56-1.92-1.88-3.06-.19-.64-.04-1.32.36-1.82l.4-.5Z" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;

  function normalizePhoneV11(value=''){
    const raw=String(value||'').trim();
    const digits=raw.replace(/\D/g,'');
    if(digits.length<8||digits.length>15) return '';
    return raw.startsWith('+')?`+${digits}`:digits;
  }

  function phoneKeyV11(value=''){ return String(value||'').replace(/\D/g,''); }
  function secondsForCredits(credits){ return Math.round((Number(credits)||0) * CREDIT_RULES.secondsPer100Credits / 100); }
  function creditsForSeconds(seconds){ return Math.max(0,(Number(seconds)||0) * 100 / CREDIT_RULES.secondsPer100Credits); }
  function nairaForCredits(credits){ return Math.round((Number(credits)||0) * CREDIT_RULES.nairaPer100Credits / 100); }
  function formatNaira(value){ return `₦${Math.max(0,Math.round(Number(value)||0)).toLocaleString('en-NG')}`; }
  function formatCredits(value){
    const n=Math.max(0,Number(value)||0);
    const rounded=Math.round(n*10)/10;
    return Number.isInteger(rounded)?String(rounded):rounded.toFixed(1);
  }
  function humanTime(seconds){
    const s=Math.max(0,Math.floor(Number(seconds)||0));
    const m=Math.floor(s/60), r=s%60;
    if(m<1) return `${r}s`;
    return `${m}m ${String(r).padStart(2,'0')}s`;
  }

  function ensureWallet(grantStarter=true){
    if(!account||!data) return null;
    if(!data.wallet){
      data.wallet={
        version:1,
        balanceSeconds:grantStarter?CREDIT_RULES.starterSeconds:0,
        starterGranted:!!grantStarter,
        starterGrantedAt:grantStarter?new Date().toISOString():null,
        starterGrantMode:grantStarter?'prototype_phone_capture':'none',
        purchases:[]
      };
      saveData();
    }
    if(!Number.isFinite(Number(data.wallet.balanceSeconds))) data.wallet.balanceSeconds=0;
    data.wallet.balanceSeconds=Math.max(0,Math.floor(Number(data.wallet.balanceSeconds)||0));
    data.wallet.purchases ||= [];
    return data.wallet;
  }

  function currentBalanceSeconds(){ return isUnlimitedAccount()?UNLIMITED_SENTINEL_SECONDS:(ensureWallet(true)?.balanceSeconds||0); }

  // Shared wallet API used by live calls and generated voice notes.
  // One wallet second equals one second of either live-call time or generated voice-note audio.
  function deductUsageSeconds(seconds, meta={}){
    if(!account||!data) return {ok:false, reason:'account'};
    if(isUnlimitedAccount()) return {ok:true, unlimited:true, deductedSeconds:0, balanceSeconds:UNLIMITED_SENTINEL_SECONDS, requestedSeconds:Math.max(0,Math.ceil(Number(seconds)||0))};
    const wallet=ensureWallet(true);
    const requested=Math.max(0,Math.ceil(Number(seconds)||0));
    if(!requested) return {ok:true, deductedSeconds:0, balanceSeconds:wallet.balanceSeconds};
    const before=Math.max(0,Math.floor(Number(wallet.balanceSeconds)||0));
    const deducted=Math.min(before,requested);
    wallet.balanceSeconds=Math.max(0,before-deducted);
    wallet.usage ||= [];
    wallet.usage.unshift({
      id:uuid(),
      type:String(meta.type||'usage'),
      seconds:deducted,
      credits:Math.round(creditsForSeconds(deducted)*10)/10,
      referenceId:meta.referenceId||null,
      createdAt:new Date().toISOString()
    });
    wallet.usage=wallet.usage.slice(0,250);
    saveData();
    renderCreditDock(); renderLiveCredit(); renderCreditPage(); renderSettingsCredit(); renderVoiceCredit();
    return {ok:deducted>=requested,deductedSeconds:deducted,balanceSeconds:wallet.balanceSeconds,requestedSeconds:requested};
  }

  function renderVoiceCredit(){
    const root=$('voiceNoteCreditBalance');
    const sub=$('voiceNoteCreditRate');
    if(!root) return;
    if(!account||!data){
      root.textContent='Sign in to use shared credits';
      if(sub) sub.textContent='50 credits = 1 minute';
      return;
    }
    if(isUnlimitedAccount()){ root.textContent='Unlimited credit · no time limit'; if(sub) sub.textContent='Unlimited for live calls and voice notes'; return; }
    const seconds=currentBalanceSeconds();
    root.textContent=`${formatCredits(creditsForSeconds(seconds))} credits · ${humanTime(seconds)} available`;
    if(sub) sub.textContent='Shared with live calls · 50 credits = 1 minute';
  }

  window.CallFocusCredits={
    currentBalanceSeconds,
    creditsForSeconds,
    secondsForCredits,
    formatCredits,
    humanTime,
    deductUsageSeconds,
    render:()=>{renderCreditDock();renderLiveCredit();renderCreditPage();renderSettingsCredit();renderVoiceCredit();},
    rules:CREDIT_RULES
  };

  function renderCreditDock(){
    const label=$('creditDockLabel'), balance=$('creditDockBalance'), action=$('creditDockAction');
    if(!label||!balance||!action) return;
    if(!account||!data){
      label.textContent='Starter call credit';
      balance.textContent='Get 1:30 free with a new mobile account';
      action.textContent='Create account';
      return;
    }
    if(isUnlimitedAccount()){ label.textContent='Call credit'; balance.textContent='Unlimited credit · no time limit'; action.textContent='Unlimited access'; action.classList.add('unlimited-credit-action'); return; }
    action.classList.remove('unlimited-credit-action');
    const wallet=ensureWallet(true);
    const credits=creditsForSeconds(wallet.balanceSeconds);
    label.textContent='Call credit';
    balance.textContent=`${formatCredits(credits)} credits · ${humanTime(wallet.balanceSeconds)} available`;
    action.textContent='Buy credits';
  }

  function renderLiveCredit(){
    if(!account||!data) return;
    if(isUnlimitedAccount()){ if($('liveCreditBalance')) $('liveCreditBalance').textContent='Unlimited'; if($('callMoreCredit')) $('callMoreCredit').textContent='Unlimited credit'; $('liveCreditPill')?.classList.remove('low-credit'); return; }
    const seconds=currentBalanceSeconds();
    const credits=formatCredits(creditsForSeconds(seconds));
    if($('liveCreditBalance')) $('liveCreditBalance').textContent=`${credits} credits · ${humanTime(seconds)}`;
    if($('callMoreCredit')) $('callMoreCredit').textContent=`${credits} credits · ${humanTime(seconds)} remaining`;
    const pill=$('liveCreditPill');
    if(pill){ pill.classList.toggle('low-credit',seconds>0&&seconds<=CREDIT_RULES.lowCreditEndSeconds); }
  }

  function renderCreditPage(){
    if(!account||!data) return;
    if(isUnlimitedAccount()){ if($('creditPageBalance')) $('creditPageBalance').textContent='Unlimited'; if($('creditPageTime')) $('creditPageTime').textContent='No call or voice-note time limit'; document.documentElement.dataset.creditAccess='unlimited'; return; }
    document.documentElement.dataset.creditAccess='metered';
    const wallet=ensureWallet(true), credits=creditsForSeconds(wallet.balanceSeconds);
    if($('creditPageBalance')) $('creditPageBalance').textContent=`${formatCredits(credits)} credits`;
    if($('creditPageTime')) $('creditPageTime').textContent=`${humanTime(wallet.balanceSeconds)} call time`;
    updateCreditCheckoutSummary();
  }

  function renderSettingsCredit(){
    if(!account) return;
    if($('settingsPhone')) $('settingsPhone').textContent=account.phone || 'Not added';
    if(isUnlimitedAccount()){ if($('settingsCreditBalance')) $('settingsCreditBalance').textContent='Unlimited credit'; return; }
    const sec=currentBalanceSeconds();
    if($('settingsCreditBalance')) $('settingsCreditBalance').textContent=`${formatCredits(creditsForSeconds(sec))} credits · ${humanTime(sec)}`;
  }

  function renderHomeSavedCallersV11(){
    const root=$('homeSavedCallers'); if(!root)return;
    if(!account||!data){root.innerHTML='';return;}
    const callers=(data.callers||[]).slice(-4).reverse();
    root.innerHTML=callers.length?callers.map(c=>{
      const dyn=DYNAMICS[c.dynamicsMode]||DYNAMICS.custom;
      return `<button class="home-saved-caller" type="button" data-home-caller="${esc(c.id)}">${contactIcon()}<span class="home-saved-caller-copy"><strong>${esc(c.name)}</strong><small>${esc(dyn.label)}</small></span><span class="home-saved-caller-arrow">›</span></button>`;
    }).join(''):`<div class="home-saved-empty">No saved callers yet. Your first caller will appear here automatically.</div>`;
  }

  // Replace the letter tiles on home Recent Calls with a cleaner phone/contact symbol.
  threadPreviewHTML=function(t){
    const last=lastCall(t);
    return `<button class="thread-preview-item" data-open-thread="${t.id}"><span class="thread-avatar cf-thread-contact-avatar">${contactIcon()}</span><span><strong>${esc(t.title)}</strong><span>${esc(t.callerName)} · ${esc(relativeTime(t.updatedAt))}</span></span><small>${esc(last?.topic||'Ready for the next call')}</small><b class="thread-arrow">›</b></button>`;
  };

  // Phone number is now part of signup. The actual OTP provider will be attached later.
  createAccount=async function(event){
    event.preventDefault();
    const name=$('signupName').value.trim();
    const email=$('signupEmail').value.trim().toLowerCase();
    const phone=normalizePhoneV11($('signupPhone')?.value||'');
    const password=$('signupPassword').value;
    const confirm=$('signupConfirm').value;
    if(!name||!email||!phone||!password||!confirm) return toast('Complete every account field, including your mobile number');
    if(password.length<8) return toast('Use at least 8 characters for your password');
    if(password!==confirm) return toast('Passwords do not match');
    const list=accounts();
    if(list.some(a=>a.email===email)) return toast('An account with that email already exists');
    if(list.some(a=>phoneKeyV11(a.phone)===phoneKeyV11(phone))) return toast('That mobile number is already attached to an account');
    const passwordRecord=await buildPasswordRecord(password);
    const acc={id:uuid(),name,email,phone,phoneVerified:false,...passwordRecord,createdAt:new Date().toISOString()};
    list.push(acc); writeJSON(ACCOUNTS_KEY,list); setSession(acc); ensureWallet(true); saveData();
    closeModal('authModal'); toast('Account created · starter call credit added'); runPendingAction();
  };
  if($('signupForm')) $('signupForm').onsubmit=createAccount;

  const priorRenderSettingsV11=renderSettings;
  renderSettings=function(){ priorRenderSettingsV11(); renderSettingsCredit(); };

  const priorRenderWorkspaceV11=renderWorkspace;
  renderWorkspace=function(){
    priorRenderWorkspaceV11();
    if(account&&data) ensureWallet(true);
    renderCreditDock(); renderLiveCredit(); renderHomeSavedCallersV11(); renderSettingsCredit(); renderVoiceCredit(); renderVoiceCredit();
  };

  const priorShowViewV11=showView;
  showView=function(view,scroll=true){
    if(view==='credits'&&!account){
      requireAccount({type:'route',route:'credits'},'Create an account or sign in to view your call credit and purchase call time.');
      return;
    }
    priorShowViewV11(view,scroll);
    if(view==='credits') renderCreditPage();
    if(view==='voice-notes') renderVoiceCredit();
  };

  function updateCreditCheckoutSummary(){
    const custom=$('customCreditAmount');
    let amount=Number(custom?.value||selectedCreditAmount||300);
    amount=Math.max(CREDIT_RULES.minimumPurchaseCredits,Math.round(amount/50)*50);
    selectedCreditAmount=amount;
    if($('customCreditMinutes')) $('customCreditMinutes').textContent=`${Math.round(secondsForCredits(amount)/60*10)/10} minutes`;
    if($('customCreditNaira')) $('customCreditNaira').textContent=formatNaira(nairaForCredits(amount));
    if($('creditCheckoutSummary')) $('creditCheckoutSummary').textContent=`${amount.toLocaleString()} credits · ${formatNaira(nairaForCredits(amount))}`;
  }

  function openCreditPaymentPlaceholder(){
    if(!account) return requireAccount({type:'route',route:'credits'},'Sign in before purchasing call credit.');
    if(isUnlimitedAccount()) return toast('This account already has unlimited CallFocus credit.');
    const input=$('customCreditAmount');
    let amount=Number(input?.value||selectedCreditAmount||300);
    if(amount<CREDIT_RULES.minimumPurchaseCredits) return toast('The minimum purchase is 300 credits');
    amount=Math.round(amount/50)*50;
    selectedCreditAmount=amount;
    if($('creditPaymentModalSummary')) $('creditPaymentModalSummary').textContent=`${amount.toLocaleString()} credits · ${formatNaira(nairaForCredits(amount))} · ${humanTime(secondsForCredits(amount))} call time`;
    openModal('creditPaymentModal');
  }

  function syncCreditBurn(){
    if(isUnlimitedAccount()){ if(live) live.creditSecondsUsed=0; renderLiveCredit(); return; }
    if(!creditBurnStartedAt||!account||!data) return;
    const wallet=ensureWallet(true);
    const elapsed=Math.max(0,Math.floor((Date.now()-creditBurnStartedAt)/1000));
    const next=Math.max(0,creditBurnStartBalance-elapsed);
    if(wallet.balanceSeconds!==next){
      wallet.balanceSeconds=next;
      live.creditSecondsUsed=Math.max(0,creditBurnStartBalance-next);
      if(lastSavedCreditSecond!==next){ lastSavedCreditSecond=next; saveData(); }
      renderCreditDock(); renderLiveCredit();
    }
    if(next>0&&next<=CREDIT_RULES.lowCreditEndSeconds&&!creditEndRequested&&live?.started){
      creditEndRequested=true;
      $('liveCaption').textContent='Low call credit · ending naturally…';
      try{$('requestEndBtn')?.click();}catch{}
    }
    if(next<=0&&live?.started){
      stopCreditBurn(false);
      $('liveCaption').textContent='Call credit exhausted.';
      setTimeout(()=>{ if(live?.started) cleanupCall(true); },250);
    }
  }

  function startCreditBurn(){
    stopCreditBurn(false);
    if(!account||!data||!live?.started) return;
    if(isUnlimitedAccount()){ live.creditSecondsUsed=0; renderLiveCredit(); return; }
    const wallet=ensureWallet(true);
    creditBurnStartBalance=wallet.balanceSeconds;
    creditBurnStartedAt=Date.now();
    creditEndRequested=false; lastSavedCreditSecond=wallet.balanceSeconds;
    live.creditSecondsUsed=0;
    renderLiveCredit();
    creditBurnTimer=setInterval(syncCreditBurn,500);
  }

  function stopCreditBurn(sync=true){
    if(sync) syncCreditBurn();
    clearInterval(creditBurnTimer); creditBurnTimer=null;
    creditBurnStartedAt=0; creditBurnStartBalance=0; creditEndRequested=false; lastSavedCreditSecond=null;
    if(account&&data){saveData();renderCreditDock();renderLiveCredit();renderCreditPage();}
  }

  const priorStartTimerV11=startTimer;
  startTimer=function(){ priorStartTimerV11(); startCreditBurn(); };

  const priorStartCallV11=startCall;
  startCall=async function(call){
    if(!account||!data) return priorStartCallV11(call);
    if(isUnlimitedAccount()){ renderLiveCredit(); return priorStartCallV11(call); }
    const seconds=currentBalanceSeconds();
    if(seconds<15){
      renderCreditDock();
      toast('Not enough call credit to start. Buy credits first.');
      return;
    }
    renderLiveCredit();
    return priorStartCallV11(call);
  };

  const priorSaveCompletedCallV11=saveCompletedCall;
  saveCompletedCall=function(){
    const threadId=live?.current?.threadId;
    const used=Math.max(0,Number(live?.creditSecondsUsed)||0);
    priorSaveCompletedCallV11();
    if(threadId&&data){
      const t=data.threads?.find(x=>x.id===threadId); const c=t?.calls?.[t.calls.length-1];
      if(c){ c.creditSecondsUsed=used; c.creditsUsed=Math.round(creditsForSeconds(used)*10)/10; c.unlimitedCredit=isUnlimitedAccount(); }
      saveData();
    }
  };

  const priorCleanupV11=cleanupCall;
  cleanupCall=function(save=true){ stopCreditBurn(true); return priorCleanupV11(save); };

  // UI interactions.
  $('creditDockAction')?.addEventListener('click',()=>{
    if(!account) return showAuth('signup',null,'Create an account with your mobile number to receive the starter 1:30 call credit.');
    if(isUnlimitedAccount()) return toast('This account has unlimited CallFocus credit.');
    showView('credits');
  });
  $('creditBackBtn')?.addEventListener('click',()=>showView('home'));
  $('creditCheckoutBtn')?.addEventListener('click',openCreditPaymentPlaceholder);
  qsa('[data-credit-package]').forEach(btn=>btn.addEventListener('click',()=>{
    selectedCreditAmount=Number(btn.dataset.creditPackage)||300;
    qsa('[data-credit-package]').forEach(b=>b.classList.toggle('active',b===btn));
    if($('customCreditAmount')) $('customCreditAmount').value=String(selectedCreditAmount);
    updateCreditCheckoutSummary();
  }));
  $('customCreditAmount')?.addEventListener('input',()=>{
    qsa('[data-credit-package]').forEach(b=>b.classList.remove('active'));
    updateCreditCheckoutSummary();
  });

  document.addEventListener('click',e=>{
    const callerBtn=e.target.closest('[data-home-caller]');
    if(callerBtn){
      const caller=data?.callers?.find(c=>c.id===callerBtn.dataset.homeCaller); if(!caller)return;
      const thread=findLatestThreadForCaller(caller.id);
      if(thread){showView('recent');selectThread(thread.id);}else{showView('callers');}
    }
  });

  // Initial migration for current prototype accounts: one starter balance so V11 can be tested immediately.
  if(account&&data) ensureWallet(true);
  renderCreditDock(); renderLiveCredit(); renderHomeSavedCallersV11(); renderSettingsCredit(); renderVoiceCredit();
  if(account&&data) renderWorkspace();
})();
