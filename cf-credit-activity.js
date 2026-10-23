/* CallFocus V16.25: Read-only latest activity preview on the Credits page. */
(() => {
  'use strict';
  const page = document.getElementById('page-credits');
  const list = document.getElementById('cfCreditRecentRows');
  if (!page || !list) return;
  const token = () => { try { return String(localStorage.getItem('callfocus_server_session_v1') || '').trim(); } catch { return ''; } };
  const active = () => page.classList.contains('active');
  const formatCredits = n => Number(n).toLocaleString('en-NG', {maximumFractionDigits:1}) + 'c';
  const valid = v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number.isFinite(Number(v)) : false;
  const timeValue = row => {
    const value = row?.createdAt || row?.updatedAt || row?.at;
    const date = typeof value === 'number' ? value : Date.parse(value || '');
    return Number.isFinite(date) ? date : 0;
  };
  const rowTime = ms => ms ? new Date(ms).toLocaleDateString('en-NG', {day:'numeric',month:'short'}) : 'Date unavailable';
  const shortAmount = row => {
    if (valid(row.credits)) return formatCredits(Math.abs(Number(row.credits)));
    if (valid(row.seconds)) return Math.round(Math.abs(Number(row.seconds))) + 's';
    return '';
  };
  const labelFor = (type, kind) => {
    if (kind === 'purchase') return 'Credit deposit';
    const labels = {
      admin_credit_grant:'Credit added',admin_bulk_credit_gift:'Credit gift',
      admin_balance_reset:'Balance adjustment',referral_reward:'Referral reward',
      live_call:'Voice call',voice_note:'Voice note',video_charge:'Image to Video',
      video_refund:'Video refund',wallet_adjustment:'Balance adjustment'
    };
    return labels[type] || 'Credit usage';
  };
  function recent(wallet) {
    const purchases = Array.isArray(wallet?.purchases) ? wallet.purchases : [];
    const usage = Array.isArray(wallet?.usage) ? wallet.usage : [];
    const entries = [];
    for (const row of purchases) {
      if (!row || typeof row !== 'object') continue;
      entries.push({label:'Credit deposit',direction:'in',time:timeValue(row),amount:valid(row.amountNaira)&&Number(row.amountNaira)>0?'₦'+Number(row.amountNaira).toLocaleString('en-NG',{maximumFractionDigits:2}):shortAmount(row)});
    }
    const additions = new Set(['admin_credit_grant','admin_bulk_credit_gift','referral_reward','video_refund']);
    for (const row of usage) {
      if (!row || typeof row !== 'object') continue;
      const type = String(row.type || '').toLowerCase();
      entries.push({label:labelFor(type,'usage'),direction:additions.has(type)?'in':'out',time:timeValue(row),amount:shortAmount(row)});
    }
    return entries.filter(e=>e.time>0).sort((a,b)=>b.time-a.time).slice(0,3);
  }
  const message = text => { list.replaceChildren();const p=document.createElement('p');p.className='cf-credit-recent-empty';p.textContent=text;list.append(p);list.setAttribute('aria-busy','false'); };
  function draw(wallet) {
    const items=recent(wallet);
    if (!items.length) {message('No activity yet. Deposits and service usage will appear here.');return;}
    const nodes=items.map(entry=>{
      const el=document.createElement('div');el.className='cf-credit-activity-row'+(entry.direction==='out'?' is-out':'');
      const badge=document.createElement('div');badge.className='cf-credit-activity-mark';badge.setAttribute('aria-hidden','true');badge.textContent=entry.direction==='in'?'+':'−';
      const copy=document.createElement('div');copy.className='cf-credit-activity-copy';
      const name=document.createElement('b');name.textContent=entry.label;
      const date=document.createElement('small');date.textContent=rowTime(entry.time);copy.append(name,date);
      const amount=document.createElement('div');amount.className='cf-credit-activity-value';amount.textContent=(entry.direction==='in'?'+':'−')+(entry.amount||'Activity');
      el.append(badge,copy,amount);return el;
    });
    list.replaceChildren(...nodes);list.setAttribute('aria-busy','false');
  }
  let last=0,lastToken='',loading=false;
  async function refresh(force=false) {
    if (!active() || loading) return;
    const auth=token();
    if (!auth) {lastToken='';last=0;message('Sign in to see your latest activity.');return;}
    if (!force && auth===lastToken && Date.now()-last<30000) return;
    lastToken=auth;loading=true;list.setAttribute('aria-busy','true');
    try {
      const response=await fetch('/api/account/data', {method:'GET',headers:{Authorization:'Bearer '+auth},cache:'no-store'});
      if (!response.ok) throw new Error('Could not load account activity');
      const payload=await response.json();
      if (auth!==token()) {message('Account changed. Refresh to view your activity.');return;}
      if (!payload?.data?.wallet) throw new Error('History unavailable');
      draw(payload.data.wallet);last=Date.now();
    } catch {message('Activity is temporarily unavailable. View transaction history for details.');}
    finally {loading=false;}
  }
  new MutationObserver(()=>{if(active())refresh(true);}).observe(page,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())refresh();});
  window.addEventListener('pageshow',()=>refresh());
  window.addEventListener('focus',()=>refresh());
  window.setInterval(()=>{if(!document.hidden&&active())refresh();},45000);
  refresh(true);
})();
