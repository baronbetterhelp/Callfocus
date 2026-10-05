/* CallFocus V11.18 — account signup repair, password visibility, email verification + password reset */
(()=>{
  const $v=id=>document.getElementById(id);
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  let pendingSignup=null;
  let resetEmail='';
  const POST_SIGNUP_HOME_KEY='callfocus_post_signup_home_v1';

  // V11.34: a newly-created account must land at the top of the main Home hero,
  // never halfway down on the signed-in workspace section. This flag survives only
  // the signup navigation and is consumed immediately on the new page load.
  let postSignupHome=false;
  try{
    postSignupHome=sessionStorage.getItem(POST_SIGNUP_HOME_KEY)==='1';
    if(postSignupHome)sessionStorage.removeItem(POST_SIGNUP_HOME_KEY);
  }catch{}
  function forcePostSignupHome(){
    if(!postSignupHome)return;
    try{history.scrollRestoration='manual';}catch{}
    try{history.replaceState({callfocus:true},'', '/');}catch{}
    try{if(typeof showView==='function')showView('home',false);}catch{}
    try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch{try{window.scrollTo(0,0);}catch{}}
  }
  if(postSignupHome){
    forcePostSignupHome();
    requestAnimationFrame(forcePostSignupHome);
    setTimeout(forcePostSignupHome,80);
    setTimeout(forcePostSignupHome,350);
    window.addEventListener('load',()=>{forcePostSignupHome();setTimeout(forcePostSignupHome,120);},{once:true});
  }

  function setBusy(button,busy,label){
    if(!button)return;
    if(!button.dataset.idleText)button.dataset.idleText=button.textContent.trim();
    button.disabled=!!busy;
    button.classList.toggle('is-busy',!!busy);
    button.textContent=busy?(label||'Please wait…'):button.dataset.idleText;
  }

  async function readJson(res){
    try{return await res.json();}catch{return {};}
  }

  function authStatus(message,type='info',target='authModal'){
    const modal=$v(target);
    if(!modal)return;
    let line=modal.querySelector('.auth-status-line');
    if(!line){
      line=document.createElement('div');
      line.className='auth-status-line';
      const card=modal.querySelector('.modal');
      card?.appendChild(line);
    }
    line.textContent=String(message||'');
    line.dataset.type=type;
    line.classList.toggle('hidden',!message);
  }

  function storeSessionAndReload(token,message='Account ready',goHome=false){
    if(!token){toast?.('Account created, but the session could not be started.');return;}
    localStorage.setItem(SERVER_TOKEN_KEY,token);
    try{
      sessionStorage.setItem('callfocus_post_auth_notice',message);
      if(goHome)sessionStorage.setItem(POST_SIGNUP_HOME_KEY,'1');
    }catch{}
    if(goHome){location.replace('/');return;}
    location.reload();
  }

  function normalizeCode(input){
    return String(input||'').replace(/\D/g,'').slice(0,6);
  }

  document.querySelectorAll('.password-eye').forEach(button=>{
    button.addEventListener('click',()=>{
      const input=$v(button.dataset.passwordTarget);
      if(!input)return;
      const show=input.type==='password';
      input.type=show?'text':'password';
      button.classList.toggle('active',show);
      button.setAttribute('aria-label',show?'Hide password':'Show password');
    });
  });

  async function requestSignup({resend=false}={}){
    const form=$v('signupForm');
    const submit=$v('signupSubmitBtn')||form?.querySelector('button[type="submit"]');
    const name=$v('signupName')?.value.trim()||'';
    const email=$v('signupEmail')?.value.trim().toLowerCase()||'';
    const phone=$v('signupPhone')?.value.trim()||'';
    const password=$v('signupPassword')?.value||'';
    const confirm=$v('signupConfirm')?.value||'';
    if(!name||!email||!phone||!password||!confirm){toast('Complete every account field');return;}
    if(password.length<8){toast('Use at least 8 characters for your password');return;}
    if(password!==confirm){toast('Passwords do not match');return;}

    pendingSignup={name,email,phone,password};
    setBusy(submit,true,resend?'Resending…':'Creating…');
    authStatus('', 'info', 'authModal');
    try{
      const res=await fetch('/api/auth/signup/request',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(pendingSignup),
        cache:'no-store'
      });
      const payload=await readJson(res);
      if(!res.ok){
        const msg=payload?.error||`Could not create the account (HTTP ${res.status}).`;
        authStatus(msg,'error','authModal');
        toast(msg);
        return;
      }
      if(payload.verificationRequired){
        $v('verificationEmailDisplay').textContent=email;
        $v('signupVerificationCode').value='';
        closeModal('authModal');
        openModal('emailVerifyModal');
        setTimeout(()=>$v('signupVerificationCode')?.focus(),150);
        if(resend)toast('A new verification code was sent');
        return;
      }
      if(payload.token){
        storeSessionAndReload(payload.token,payload.notice||'Account created',true);
        return;
      }
      const msg='The account service returned an incomplete response. Please try again.';
      authStatus(msg,'error','authModal');toast(msg);
    }catch(err){
      const msg='Could not reach the CallFocus account server. Please try again.';
      authStatus(msg,'error','authModal');toast(msg);
    }finally{setBusy(submit,false);}
  }

  async function verifySignup(){
    if(!pendingSignup?.email){
      closeModal('emailVerifyModal');
      showAuth('signup');
      toast('Enter your account details again to request a new code');
      return;
    }
    const code=normalizeCode($v('signupVerificationCode')?.value);
    if(code.length!==6){toast('Enter the 6-digit verification code');return;}
    const button=$v('verifySignupCodeBtn');
    setBusy(button,true,'Verifying…');
    authStatus('', 'info', 'emailVerifyModal');
    try{
      const res=await fetch('/api/auth/signup/verify',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:pendingSignup.email,code}),cache:'no-store'
      });
      const payload=await readJson(res);
      if(!res.ok){
        const msg=payload?.error||'Could not verify that code.';
        authStatus(msg,'error','emailVerifyModal');toast(msg);return;
      }
      storeSessionAndReload(payload.token,'Email verified · account created',true);
    }catch{
      const msg='Could not reach the verification service. Try again.';
      authStatus(msg,'error','emailVerifyModal');toast(msg);
    }finally{setBusy(button,false);}
  }

  $v('signupForm').onsubmit=e=>{e.preventDefault();requestSignup();};
  window.createAccount=e=>{e?.preventDefault?.();requestSignup();};
  $v('verifySignupCodeBtn')?.addEventListener('click',verifySignup);
  $v('resendSignupCodeBtn')?.addEventListener('click',()=>requestSignup({resend:true}));
  $v('signupVerificationCode')?.addEventListener('input',e=>{e.target.value=normalizeCode(e.target.value);});

  function openPasswordReset(){
    const existing=$v('signinEmail')?.value.trim()||'';
    $v('passwordResetEmail').value=existing;
    $v('passwordResetRequestStep').classList.remove('hidden');
    $v('passwordResetVerifyStep').classList.add('hidden');
    $v('passwordResetTitle').textContent='Reset your password';
    $v('passwordResetCopy').textContent='Enter the email address on your CallFocus account. We will send a 6-digit reset code.';
    authStatus('', 'info', 'passwordResetModal');
    openModal('passwordResetModal');
    setTimeout(()=>$v('passwordResetEmail')?.focus(),150);
  }

  async function sendResetCode(){
    const email=$v('passwordResetEmail')?.value.trim().toLowerCase()||'';
    if(!email){toast('Enter your account email address');return;}
    const button=$v('sendPasswordResetBtn');
    setBusy(button,true,'Sending…');
    authStatus('', 'info', 'passwordResetModal');
    try{
      const res=await fetch('/api/auth/password-reset/request',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email}),cache:'no-store'
      });
      const payload=await readJson(res);
      if(!res.ok){
        const msg=payload?.error||'Could not send the reset code.';
        authStatus(msg,'error','passwordResetModal');toast(msg);return;
      }
      resetEmail=email;
      $v('passwordResetRequestStep').classList.add('hidden');
      $v('passwordResetVerifyStep').classList.remove('hidden');
      $v('passwordResetTitle').textContent='Check your email';
      $v('passwordResetCopy').textContent=`Enter the 6-digit code sent to ${email}, then choose a new password.`;
      $v('passwordResetCode').value='';
      setTimeout(()=>$v('passwordResetCode')?.focus(),150);
    }catch{
      const msg='Could not reach the password reset service. Try again.';
      authStatus(msg,'error','passwordResetModal');toast(msg);
    }finally{setBusy(button,false);}
  }

  async function completeReset(){
    const email=resetEmail||$v('passwordResetEmail')?.value.trim().toLowerCase()||'';
    const code=normalizeCode($v('passwordResetCode')?.value);
    const password=$v('passwordResetNew')?.value||'';
    const confirm=$v('passwordResetConfirm')?.value||'';
    if(code.length!==6){toast('Enter the 6-digit reset code');return;}
    if(password.length<8){toast('Use at least 8 characters for your new password');return;}
    if(password!==confirm){toast('Passwords do not match');return;}
    const button=$v('completePasswordResetBtn');
    setBusy(button,true,'Updating…');
    authStatus('', 'info', 'passwordResetModal');
    try{
      const res=await fetch('/api/auth/password-reset/verify',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code,password}),cache:'no-store'
      });
      const payload=await readJson(res);
      if(!res.ok){
        const msg=payload?.error||'Could not reset the password.';
        authStatus(msg,'error','passwordResetModal');toast(msg);return;
      }
      storeSessionAndReload(payload.token,'Password updated · signed in');
    }catch{
      const msg='Could not reach the password reset service. Try again.';
      authStatus(msg,'error','passwordResetModal');toast(msg);
    }finally{setBusy(button,false);}
  }

  $v('forgotPasswordBtn')?.addEventListener('click',openPasswordReset);
  $v('sendPasswordResetBtn')?.addEventListener('click',sendResetCode);
  $v('completePasswordResetBtn')?.addEventListener('click',completeReset);
  $v('resendPasswordResetBtn')?.addEventListener('click',()=>{
    if(resetEmail)$v('passwordResetEmail').value=resetEmail;
    $v('passwordResetRequestStep').classList.remove('hidden');
    $v('passwordResetVerifyStep').classList.add('hidden');
    $v('passwordResetTitle').textContent='Send another reset code';
  });
  $v('passwordResetCode')?.addEventListener('input',e=>{e.target.value=normalizeCode(e.target.value);});

  // V11.18 intentionally removes the old Workers.dev transfer UI. New accounts
  // are server-backed and can sign in from any device after creation.
  $v('transferLegacyAccountBtn')?.remove();
  $v('legacyTransferNote')?.remove();

  try{
    const notice=sessionStorage.getItem('callfocus_post_auth_notice');
    if(notice){sessionStorage.removeItem('callfocus_post_auth_notice');setTimeout(()=>toast(notice),500);}
  }catch{}
})();
