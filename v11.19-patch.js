/* CallFocus V11.19 — account reliability + auth message cleanup */
(()=>{
  const $=id=>document.getElementById(id);
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';

  function clearAuthStatus(){
    const line=$('authModal')?.querySelector('.auth-status-line');
    if(line){ line.textContent=''; line.classList.add('hidden'); }
  }
  function showAuthStatus(message,type='error'){
    const modal=$('authModal'); if(!modal)return;
    let line=modal.querySelector('.auth-status-line');
    if(!line){ line=document.createElement('div'); line.className='auth-status-line'; modal.querySelector('.modal')?.appendChild(line); }
    line.textContent=String(message||''); line.dataset.type=type; line.classList.toggle('hidden',!message);
  }
  document.querySelectorAll('.auth-tab').forEach(btn=>btn.addEventListener('click',()=>setTimeout(clearAuthStatus,0)));

  const signin=$('signinForm');
  if(signin){
    signin.onsubmit=async e=>{
      e.preventDefault(); clearAuthStatus();
      const email=$('signinEmail')?.value.trim().toLowerCase()||'';
      const password=$('signinPassword')?.value||'';
      if(!email||!password){ window.toast?.('Enter your email and password'); return; }
      const button=signin.querySelector('button[type="submit"]');
      const idle=button?.textContent||'Sign in';
      if(button){button.disabled=true;button.textContent='Signing in…';}
      try{
        const res=await fetch('/api/auth/signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
        let payload={}; try{payload=await res.json();}catch{}
        if(!res.ok){
          const msg=payload?.error||`Could not sign in (HTTP ${res.status}).`;
          showAuthStatus(msg,'error'); window.toast?.(msg); return;
        }
        if(!payload?.token){ const msg='The account service did not return a session. Please try again.'; showAuthStatus(msg,'error'); window.toast?.(msg); return; }
        localStorage.setItem(SERVER_TOKEN_KEY,payload.token);
        try{sessionStorage.setItem('callfocus_post_auth_notice','Signed in');}catch{}
        location.reload();
      }catch{
        const msg='Could not reach the CallFocus account server. Please try again.';
        showAuthStatus(msg,'error'); window.toast?.(msg);
      }finally{ if(button){button.disabled=false;button.textContent=idle;} }
    };
  }
})();
