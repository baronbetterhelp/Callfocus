(()=>{
'use strict';
const $=id=>document.getElementById(id);
const token=localStorage.getItem('callfocus_server_session_v1')||'';
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ORDER=['overview','referrals','withdrawals','transactions'];
const panels={overview:'eaPanelOverview',referrals:'eaPanelReferrals',withdrawals:'eaPanelWithdrawals',transactions:'eaPanelTransactions'};
const lists={referrals:'eaReferralList',withdrawals:'eaWithdrawals',transactions:'eaTransactions'};
const moreBtns={referrals:'eaMoreReferrals',withdrawals:'eaMoreWithdrawals',transactions:'eaMoreTransactions'};
const pageState=Object.fromEntries(['referrals','withdrawals','transactions'].map(k=>[k,{offset:0,loaded:false,loading:false}]));
const fmt=n=>'₦'+(Math.max(0,Number(n)||0)/100).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});
const signedFmt=n=>(n<0?'-':'+')+fmt(Math.abs(Number(n)||0));
const dateLabel=iso=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})};
let current=null,active='overview';
function message(text){const node=$('eaMessage');node.textContent=text;node.classList.add('show')}
async function api(path,body){const res=await fetch('/api/affiliate/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await res.json().catch(()=>({}));if(!res.ok)throw Error(typeof d.error==='string'?d.error:'Could not complete the request.');return d}
async function copy(v){if(!v||v==='—')return;try{await navigator.clipboard.writeText(v);message('Copied successfully.')}catch{message('Copy manually: '+v)}}
function el(tag,cls,text){const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=String(text);return a}
function clear(node){node.replaceChildren()}
function empty(messageText){return el('p','ea-empty',messageText)}
function row({title,subtitle,amount,meta,status,tone}){
 const node=el('article','ea-entry');
 const detail=el('div','ea-entry-main');detail.append(el('strong','ea-entry-title',title),el('span','ea-entry-sub',subtitle));
 const right=el('div','ea-entry-side');
 if(amount!==undefined)right.append(el('strong','ea-entry-amount',amount));
 if(status)right.append(el('span','ea-status '+(tone||''),status));
 if(meta)right.append(el('small','ea-entry-meta',meta));
 node.append(detail,right);return node;
}
function nextWithdrawal(days){
 if(!days.length)return {label:'Not scheduled',detail:'No withdrawal day is configured'};
 const now=new Date();const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Lagos',year:'numeric',month:'numeric',day:'numeric',weekday:'long'}).formatToParts(now).map(x=>[x.type,x.value]));
 const today=DAYS.indexOf(parts.weekday);
 const delta=Array.from({length:7},(_,i)=>i).find(n=>days.includes((today+n)%7));
 if(delta===undefined)return {label:'Not scheduled',detail:'No eligible day available'};
 const future=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+delta,12));
 const detail=future.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'});
 return {label:delta===0?'Today':DAYS[(today+delta)%7],detail:'Next withdrawal request day · '+detail};
}
function tab(type,{focus=false}={}){
 if(!ORDER.includes(type))return;
 active=type;
 ORDER.forEach(k=>{
  const selected=k===type,button=document.querySelector('[data-ea-tab="'+k+'"]');
  button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  $(panels[k]).hidden=!selected;
 });
 const btn=document.querySelector('[data-ea-tab="'+type+'"]');
 btn.scrollIntoView({behavior:'auto',block:'nearest',inline:'nearest'});
 if(focus)btn.focus({preventScroll:true});
 if(type!=='overview'&&!pageState[type].loaded&&!pageState[type].loading)loadPage(type);
}
async function loadPage(type,append=false){
 const state=pageState[type];if(!state||state.loading)return;
 const root=$(lists[type]),more=$(moreBtns[type]);state.loading=true;
 more.disabled=true;more.textContent='Loading…';
 if(!append){state.offset=0;clear(root);root.append(empty('Loading '+(type==='referrals'?'your referred customers':type)+'…'))}
 try{
  const d=await api('history?type='+encodeURIComponent(type)+'&offset='+state.offset);
  if(!append)clear(root);
  for(const item of d.items||[]){
   let view;
   if(type==='referrals'){
    const short=String(item.invited_user_id||'').slice(-6).toUpperCase();
    const count=Number(item.deposits_count)||0;
    const status=count?'Funded · '+count+' deposit'+(count===1?'':'s'):'Not funded yet';
    view=row({title:'Referred customer ···'+short,subtitle:'Joined '+dateLabel(item.created_at)+' · '+status,amount:fmt(item.commission_kobo),meta:fmt(item.total_deposits_kobo)+' total verified deposits',tone:count?'earned':'',status:'Earned for you'});
   }else if(type==='withdrawals'){
    const status=String(item.status||'requested');
    view=row({title:'Withdrawal request',subtitle:'Requested '+dateLabel(item.requested_at)+(item.transfer_reference?' · Ref: '+item.transfer_reference:''),amount:fmt(item.amount_kobo),meta:status==='paid'?'Transfer confirmed':status==='rejected'?'Not paid':'Awaiting manual payout review',status:status[0].toUpperCase()+status.slice(1),tone:status});
   }else{
    const isCommission=item.kind==='commission';
    const status=String(item.status||'').toLowerCase();
    const title=isCommission?(status==='reversed'?'Commission reversed':'Referral commission'):'Withdrawal · '+status;
    const sub=isCommission?(fmt(item.gross_kobo)+' verified purchase · '+item.provider):(status==='rejected'?'Request declined':'Manual bank payout');
    view=row({title,subtitle:sub,amount:item.amount_kobo===0?fmt(0):signedFmt(item.amount_kobo),meta:dateLabel(item.occurred_at),status:status?status[0].toUpperCase()+status.slice(1):'',tone:status==='earned'?'earned':status});
   }
   root.append(view);
  }
  state.offset=Number(d.nextOffset)||state.offset;state.loaded=true;
  if(!root.children.length)root.append(empty(type==='referrals'?'No referred customers yet.':type==='withdrawals'?'No withdrawal requests yet.':'No transactions yet.'));
  more.hidden=!d.hasMore;
  more.textContent='Load more '+(type==='referrals'?'referrals':type==='withdrawals'?'requests':'transactions');
 }catch(e){
  if(!append)clear(root);
  root.append(empty('Could not load records: '+e.message));
  more.hidden=false;more.textContent='Try loading again';
 }finally{state.loading=false;more.disabled=false}
}
function render(d){
 current=d;const member=d.member;
 if(!member||member.status!=='approved'){
  $('eaPending').hidden=false;$('eaDashboard').hidden=true;$('eaApply').hidden=!!member;
  $('eaState').textContent=!member?'Apply to receive your own earning code after admin approval.':member.status==='pending'?'Application received. Your dashboard will open after approval.':'Application status: '+member.status+'. '+(member.note||'Contact support for details.');
  return;
 }
 $('eaPending').hidden=true;$('eaDashboard').hidden=false;
 const bal=d.balance||{},settings=d.settings||{};
 $('eaEarned').textContent=fmt(bal.earned);$('eaAvailable').textContent=fmt(bal.available);
 $('eaAvailableBadge').textContent=fmt(bal.available)+' available';
 $('eaReferred').textContent=Number(d.signupsCount)||0;
 $('eaDepositsCount').textContent=(Number(d.depositsCount)||0)+' verified deposits';
 $('eaReserved').textContent=fmt(bal.reserved)+' / '+fmt(bal.paid);
 $('eaCode').textContent=member.code||'—';
 $('eaOverviewRate').textContent=String(settings.ratePercent)+'% commission';
 $('eaRate').textContent='Current rate: '+settings.ratePercent+'% per verified deposit. Each commission uses the rate active when that payment was verified.';
 $('eaCounts').textContent=`${d.signupsCount||0} referred customers · ${d.depositsCount||0} verified deposits`;
 $('eaReferralCount').textContent=(d.signupsCount||0)+' referred';
 const days=(Array.isArray(settings.withdrawDays)?settings.withdrawDays:[settings.withdrawDay]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6);
 const next=nextWithdrawal(days);$('eaNextDay').textContent=settings.enabled?next.label:'Unavailable';$('eaNextDetail').textContent=settings.enabled?next.detail:'Withdrawals are currently disabled';
 const names=days.map(x=>DAYS[x]);
 const dayList=names.length===1?names[0]:names.length===2?names.join(' and '):names.slice(0,-1).join(', ')+', and '+names.at(-1);
 $('eaWithdrawRule').textContent='Requests: '+(dayList||'no selected days')+' (Nigeria time) · Minimum '+fmt(settings.minWithdrawKobo)+'. One pending request is allowed at a time. Transfers are manual.';
 const today=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Lagos',weekday:'long'}).format(new Date());
 const hasOpen=(d.withdrawals||[]).some(w=>['requested','approved'].includes(w.status));
 const eligible=!!settings.enabled&&names.includes(today)&&bal.available>=settings.minWithdrawKobo&&!hasOpen;
 $('eaWithdrawButton').disabled=!eligible;
 $('eaWithdrawButton').textContent=!settings.enabled?'Withdrawals unavailable':!names.includes(today)?'Available on selected days':hasOpen?'Request already pending':bal.available<settings.minWithdrawKobo?'Minimum balance not reached':'Submit withdrawal request';
 $('eaAmount').min=(settings.minWithdrawKobo/100).toFixed(2);$('eaAmount').max=(Math.max(0,bal.available)/100).toFixed(2);
}
async function refresh(){
 if(!token){$('eaState').textContent='Sign in to CallFocus to apply or view your partner earnings.';return}
 try{render(await api('status'))}catch(e){message(e.message);$('eaState').textContent='The earnings dashboard is currently unavailable.'}
}
$('eaApply').addEventListener('click',async()=>{try{render(await api('apply',{}));message('Application submitted for review.')}catch(e){message(e.message)}});
$('eaCopyCode').addEventListener('click',()=>copy(current?.member?.code||''));
$('eaCopyLink').addEventListener('click',()=>copy('https://callfocus.link/?ref='+encodeURIComponent(current?.member?.code||'')+'&signup=1'));
$('eaGoWithdraw').addEventListener('click',()=>tab('withdrawals'));
$('eaGoReferrals').addEventListener('click',()=>tab('referrals'));
for(const k of ['referrals','withdrawals','transactions'])$(moreBtns[k]).addEventListener('click',()=>loadPage(k,pageState[k].loaded));
document.querySelectorAll('[data-ea-tab]').forEach(button=>{
 button.addEventListener('click',()=>tab(button.dataset.eaTab));
 button.addEventListener('keydown',event=>{
  const index=ORDER.indexOf(button.dataset.eaTab);
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'||event.key==='Home'||event.key==='End'){
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?ORDER.length-1:(index+(event.key==='ArrowRight'?1:-1)+ORDER.length)%ORDER.length;
   tab(ORDER[next],{focus:true});
  }
 });
});
$('eaWithdrawForm').addEventListener('submit',async event=>{
 event.preventDefault();if(!confirm('Submit this withdrawal request for manual review?'))return;
 const btn=$('eaWithdrawButton');btn.disabled=true;
 try{
  const d=await api('withdraw',{amountNaira:$('eaAmount').value,bankName:$('eaBank').value,accountName:$('eaHolder').value,accountNumber:$('eaNumber').value,bankConsent:$('eaBankConsent').checked});
  render(d);message(d.notificationSent?'Withdrawal requested. Track it here.':'Withdrawal recorded. Notification email failed, but admin can still review the request.');
  $('eaWithdrawForm').reset();pageState.withdrawals.loaded=false;pageState.transactions.loaded=false;
  await loadPage('withdrawals');
 }catch(e){message(e.message);await refresh()}
});
refresh();
})();
