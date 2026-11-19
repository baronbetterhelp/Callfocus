/* CallFocus V16.80 — independent client for the private API accounts tab. */
(()=>{'use strict';
  const root=document.getElementById('cfApiAccountsPanel');if(!root)return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v===null||v===undefined?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const cash=(v,c)=>`${esc(c)} ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const token=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
  let accounts=[],usage={},loading=false,savedBodyOverflow='',loaded=false;
  const safeDate=raw=>raw?new Date(raw+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not set';
  const safeTime=raw=>raw?new Date(raw).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  const today=()=>new Date().toISOString().slice(0,10);
  function dueInfo(a){if(!a.nextRenewal)return {text:'Date not set',tone:''};
    const d=Math.floor((Date.parse(a.nextRenewal+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000);
    return d<0?{text:`${Math.abs(d)} day${Math.abs(d)===1?'':'s'} overdue`,tone:'overdue'}:
      d===0?{text:'Due today',tone:'soon'}:d<=7?{text:`Due in ${d} day${d===1?'':'s'}`,tone:'soon'}:{text:`${d} days left`,tone:''};
  }
  function moneyLabel(a){return Number(a.billingAmount)>0?cash(a.billingAmount,a.billingCurrency):'Price not recorded';}
  function oneCard(a){const isLive=a.id.startsWith('el-'),u=usage[a.id]||{},due=dueInfo(a),ok=u.ok===true;
    const badge=isLive?(ok?'<span class="cf-api-chip">LIVE</span>':'<span class="cf-api-chip error">UNAVAILABLE</span>'):'<span class="cf-api-chip manual">MANUAL</span>';
    const stats=isLive?(!ok?`<p class="cf-api-account-error">${esc(u.error||'Provider data is currently unavailable.')} No balance is being estimated.</p>`:`
      <div class="cf-api-stat-grid"><div><small>Credits remaining</small><strong>${num(u.creditsRemaining)}</strong></div><div><small>Credits used / allowance</small><strong>${num(u.creditsUsed)} / ${num(u.creditsLimit)}</strong></div>
      <div><small>Saved voices / capacity</small><strong>${num(u.voiceSlotsUsed)} / ${num(u.voiceSlotsLimit)}</strong></div>
      <div><small>Voice creations this period</small><strong>${num(u.voiceCreationUsed)} / ${num(u.voiceCreationLimit)}</strong></div></div>
      <div class="cf-api-progress"><span style="width:${u.creditsLimit>0&&u.creditsUsed!=null?Math.min(100,Math.max(0,u.creditsUsed/u.creditsLimit*100)):0}%"></span></div>
      <div class="cf-api-account-meta">${esc(u.tier||'Unknown plan')} · ${esc(u.status||'Status not provided')} · Checked ${safeTime(u.checkedAt)}${u.creditResetAt?` · Credits reset ${safeTime(u.creditResetAt)}`:''}${u.nextInvoiceAmount!=null?` · Next provider invoice: ${cash(u.nextInvoiceAmount,u.nextInvoiceCurrency||'USD')}`:''}${u.hasOpenInvoices?' · Open invoice reported':''}</div>`)
      :`<div class="cf-api-stat-grid"><div><small>Last recorded balance</small><strong>${a.manualBalance===null?'Not entered':`${num(a.manualBalance)} ${esc(a.balanceUnit||'')}`}</strong></div><div><small>Balance status</small><strong style="font-size:14px">Manually updated</strong></div></div><div class="cf-api-account-meta">Last edited ${safeTime(a.updatedAt)}</div>`;
    return `<article class="cf-api-account" data-cf-api-card="${esc(a.id)}">
      <div class="cf-api-account-title"><div><h4>${esc(a.label)}</h4><small>${esc(a.provider)}</small></div>${badge}</div>
      ${stats}
      <div class="cf-api-account-date"><div><small>Next subscription payment</small><strong>${safeDate(a.nextRenewal)}</strong></div><span class="cf-api-due ${due.tone}">${esc(due.text)}</span></div>
      <div class="cf-api-account-meta">${moneyLabel(a)} · ${esc(a.billingCycle==='none'?'One-time':a.billingCycle)}${a.autoRenew?' · Auto-renew noted':' · Manual renewal'}${a.notes?` · ${esc(a.notes)}`:''}</div>
      <div class="cf-api-actions"><button class="btn btn-ghost" type="button" data-cf-api-edit="${esc(a.id)}">Edit billing details</button>${a.nextRenewal&&a.billingCycle!=='none'?`<button class="btn btn-ghost" type="button" data-cf-api-renew="${esc(a.id)}">Mark renewed</button>`:''}${!isLive?`<button class="btn btn-ghost" type="button" data-cf-api-delete="${esc(a.id)}">Remove</button>`:''}</div>
    </article>`;
  }
  function show(){const els=accounts.filter(a=>a.id.startsWith('el-')),others=accounts.filter(a=>!a.id.startsWith('el-'));
    $('cfApiElevenCards').innerHTML=els.length?els.map(oneCard).join(''):'<p class="cf-api-empty">No ElevenLabs records found.</p>';
    $('cfApiOtherCards').innerHTML=others.length?others.map(oneCard).join(''):'<p class="cf-api-empty">No additional subscriptions yet. Tap “Track another subscription” to add one.</p>';
    const due=accounts.filter(a=>a.nextRenewal&&dueInfo(a).tone).length;
    const connected=els.filter(a=>usage[a.id]?.ok).length;
    const totals={};for(const a of accounts){const amount=Number(a.billingAmount)||0,cycle=a.billingCycle,factor=cycle==='monthly'?1:cycle==='quarterly'?1/3:cycle==='annual'?1/12:0;
      totals[a.billingCurrency]=(totals[a.billingCurrency]||0)+amount*factor;}
    const estimate=Object.entries(totals).filter(([_,v])=>v>0).map(([code,v])=>cash(v,code)).join(' · ');
    $('cfApiOverview').innerHTML=`<div class="cf-api-overview-card"><span>Live ElevenLabs accounts</span><strong>${connected} / 6</strong><small>Connected, read-only usage reports</small></div>
      <div class="cf-api-overview-card"><span>Due or overdue (7 days)</span><strong>${due}</strong><small>Based on saved renewal dates</small></div>
      <div class="cf-api-overview-card"><span>Tracked subscriptions</span><strong>${accounts.length}</strong><small>${estimate?'Estimated monthly: '+estimate:'Add amounts to see monthly cost'}</small></div>`;
  }
  async function call(options={}){const response=await fetch('/api/admin/api-accounts',{...options,credentials:'same-origin',cache:'no-store',headers:{'X-CallFocus-Admin-Key':token(),...(options.body?{'Content-Type':'application/json'}:{})}});
    const body=await response.json().catch(()=>({}));if(!response.ok||body.ok!==true)throw Error(body.error||'Could not load account tracker.');return body;}
  async function refresh(){if(loading||!token())return;loading=true;const btn=$('cfApiRefreshAll'),before=btn.textContent;btn.disabled=true;btn.textContent='Refreshing live balances…';
    $('cfApiRefreshedAt').textContent='Querying all six provider accounts now…';
    try{const data=await call();accounts=Array.isArray(data.accounts)?data.accounts:[];usage=data.usage||{};loaded=true;show();$('cfApiRefreshedAt').textContent='Refreshed '+safeTime(data.refreshedAt)+'. Provider results are checked live; renewal dates are tracked separately.'}
    catch(e){$('cfApiRefreshedAt').textContent=e.message;}
    finally{btn.disabled=false;btn.textContent=before;loading=false;}
  }
  function showForm(id){const a=accounts.find(x=>x.id===id),fresh=!a,isLive=!fresh&&id.startsWith('el-');
    $('cfApiEditTitle').textContent=fresh?'Add subscription':isLive?`Account ${id.slice(3)} billing details`:'Edit subscription';
    $('cfApiEditId').value=a?.id||'custom-'+crypto.randomUUID();
    $('cfApiEditName').value=a?.label||'';$('cfApiEditProvider').value=a?.provider||'';$('cfApiEditProvider').disabled=isLive;
    $('cfApiEditAmount').value=a?.billingAmount??0;$('cfApiEditCurrency').value=a?.billingCurrency||'USD';
    $('cfApiEditCycle').value=a?.billingCycle||'monthly';$('cfApiEditRenewal').value=a?.nextRenewal||'';
    $('cfApiEditAutoRenew').checked=a?.autoRenew===true;
    $('cfApiEditBalance').value=a?.manualBalance??'';$('cfApiEditUnit').value=a?.balanceUnit||'';
    $('cfApiManualBalanceWrap').hidden=isLive;$('cfApiManualUnitWrap').hidden=isLive;
    $('cfApiEditNotes').value=a?.notes||'';$('cfApiFormFeedback').textContent='';
    savedBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';$('cfApiModal').hidden=false;
    $('cfApiEditName').focus();
  }
  function hideForm(){if($('cfApiModal').hidden)return;$('cfApiModal').hidden=true;document.body.style.overflow=savedBodyOverflow;}
  async function saveForm(e){e.preventDefault();const btn=$('cfApiSaveBtn');btn.disabled=true;const old=btn.textContent;btn.textContent='Saving…';$('cfApiFormFeedback').textContent='';
    const d={action:'save',id:$('cfApiEditId').value,label:$('cfApiEditName').value.trim(),provider:$('cfApiEditProvider').value.trim(),billingAmount:$('cfApiEditAmount').value,billingCurrency:$('cfApiEditCurrency').value.trim().toUpperCase(),billingCycle:$('cfApiEditCycle').value,nextRenewal:$('cfApiEditRenewal').value,autoRenew:$('cfApiEditAutoRenew').checked,manualBalance:$('cfApiEditBalance').value,balanceUnit:$('cfApiEditUnit').value.trim(),notes:$('cfApiEditNotes').value.trim()};
    try{await call({method:'POST',body:JSON.stringify(d)});hideForm();await refresh();}
    catch(e){$('cfApiFormFeedback').textContent=e.message;}finally{btn.disabled=false;btn.textContent=old;}
  }
  async function onCardClick(event){const edit=event.target.closest('[data-cf-api-edit]');if(edit){showForm(edit.dataset.cfApiEdit);return;}
    const renew=event.target.closest('[data-cf-api-renew]');if(renew){const id=renew.dataset.cfApiRenew,a=accounts.find(x=>x.id===id);if(!a||!confirm(`Mark ${a.label} as renewed? This advances the tracked date by ONE billing period, but does NOT pay the provider.`))return;
      renew.disabled=true;try{await call({method:'POST',body:JSON.stringify({action:'renew',id})});await refresh();}catch(e){alert(e.message);renew.disabled=false;}return;}
    const del=event.target.closest('[data-cf-api-delete]');if(del){const id=del.dataset.cfApiDelete,a=accounts.find(x=>x.id===id);if(!a||!confirm(`Remove ${a.label} from this subscription tracker? This does NOT cancel the provider subscription.`))return;
      del.disabled=true;try{await call({method:'POST',body:JSON.stringify({action:'delete',id})});await refresh();}catch(e){alert(e.message);del.disabled=false;}}
  }
  $('cfApiRefreshAll').addEventListener('click',refresh);
  $('cfApiAddAccount').addEventListener('click',()=>showForm(null));
  $('cfApiEditForm').addEventListener('submit',saveForm);
  $('cfApiElevenCards').addEventListener('click',onCardClick);$('cfApiOtherCards').addEventListener('click',onCardClick);
  $('cfApiModal').addEventListener('click',e=>{if(e.target.closest('[data-cf-api-close]'))hideForm();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('cfApiModal').hidden)hideForm();});
  document.querySelector('[data-admin-tab="api-accounts"]')?.addEventListener('click',()=>{refresh()});
  const gate=$('adminGate');if(gate)new MutationObserver(()=>{if(gate.classList.contains('hidden')&&!loaded&&document.querySelector('[data-admin-panel="api-accounts"]')?.classList.contains('active'))refresh()}).observe(gate,{attributes:true,attributeFilter:['class']});
  if(gate?.classList.contains('hidden')&&document.querySelector('[data-admin-panel="api-accounts"]')?.classList.contains('active'))refresh();
})();
