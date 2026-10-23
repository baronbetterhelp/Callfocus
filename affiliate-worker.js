/* CallFocus V16.35 Earn Referrals. Dedicated D1 financial ledger.
 * Never processes payouts directly; all transfers are manual after admin review.
 */
const money = n => Math.max(0, Math.round(Number(n)||0));
const now = () => new Date().toISOString();
const json = (value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const bad = (message,status=400)=>json({ok:false,error:message},status);
const config = db => db.prepare('SELECT * FROM affiliate_settings WHERE id=1').first();
// Separate repeatable migration keeps the original weekday column intact for backwards compatibility.
// Until that migration runs, read-only customer checks safely preserve the original single day.
async function withdrawDaysMask(db,setup){
 const oldDay=Number(setup?.weekday);
 const fallback=1 << (Number.isInteger(oldDay)&&oldDay>=0&&oldDay<=6?oldDay:5);
 try{
  const item=await db.prepare('SELECT days_mask FROM affiliate_withdrawal_days WHERE id=1').first();
  const mask=Number(item?.days_mask);
  return Number.isInteger(mask)&&mask>=1&&mask<=127?mask:fallback;
 }catch(error){
  if(/no such table.*affiliate_withdrawal_days/i.test(String(error?.message||error)))return fallback;
  throw error;
 }
}
const activeDays=mask=>[1,2,3,4,5,6,0].filter(day=>(mask&(1<<day))!==0);
const safe = v=>String(v||'').trim();
const BANK_RE = /^[0-9]{10,20}$/;
const newCode = ()=>'EARN'+Array.from(crypto.getRandomValues(new Uint8Array(7)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
async function sha(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function lagosWeekday(){const w=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Lagos',weekday:'short'}).format(new Date());return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(w)}
async function audit(db,actor,action,id,detail='') { await db.prepare('INSERT INTO affiliate_audit (id,actor,action,subject_id,details,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,id,String(detail).slice(0,450),now()).run() }
const failDb=()=>bad('Earn Referrals is being configured. Contact support if you need access.',503);
async function memberFor(db,id){return db.prepare('SELECT * FROM affiliate_members WHERE user_id=?').bind(id).first()}
async function balances(db,id){return db.prepare(`SELECT
 COALESCE((SELECT SUM(commission_kobo) FROM affiliate_commissions WHERE affiliate_id=? AND status='earned'),0) earned,
 COALESCE((SELECT SUM(amount_kobo) FROM affiliate_withdrawals WHERE affiliate_id=? AND status='paid'),0) paid,
 COALESCE((SELECT SUM(amount_kobo) FROM affiliate_withdrawals WHERE affiliate_id=? AND status IN ('requested','approved')),0) reserved`).bind(id,id,id).first()}
export async function resolveEarnReferral(env,code){
 const db=env.AFFILIATE_DB;if(!db)return null;
 return db.prepare("SELECT user_id,referral_code FROM affiliate_members WHERE referral_code=? AND status='approved'").bind(safe(code).toUpperCase()).first();
}
export async function affiliateLinkSignup(env,inviteeId,member,code){
 const db=env.AFFILIATE_DB;if(!db || !member)return;
 await db.prepare('INSERT OR IGNORE INTO affiliate_signups(invited_user_id,affiliate_id,referral_code,created_at) VALUES(?,?,?,?)').bind(inviteeId,member.user_id,code,now()).run();
}
// payment *already verified and credited* by the original CallFocus checkout.
// Inserting by provider/reference is idempotent even after repeated webhooks.
export async function affiliateRecordPurchase(env,inviteeId,purchase){
 const db=env.AFFILIATE_DB;if(!db || !inviteeId || !purchase)return {skipped:true};
 const provider=safe(purchase.provider).toLowerCase(), reference=safe(purchase.reference||purchase.id);
 const amount=money(Number(purchase.amountNaira)*100);
 if(!provider||!reference||!amount||!['paystack','korapay','pocketfi','flutterwave','manual_bank_transfer'].includes(provider))return {skipped:true};
 const setup=await config(db);if(!setup?.enabled)return {skipped:true};
 const rate=money(setup.rate_bps);const value=Math.round(amount*rate/10000);
 const result=await db.prepare(`INSERT OR IGNORE INTO affiliate_commissions
 (id,affiliate_id,invited_user_id,provider,payment_reference,gross_kobo,rate_bps,commission_kobo,created_at)
 SELECT ?,s.affiliate_id,?,?,?, ?,?,?,? FROM affiliate_signups s
 JOIN affiliate_members a ON a.user_id=s.affiliate_id AND a.status='approved'
 WHERE s.invited_user_id=? AND s.affiliate_id!=?`).bind(
 crypto.randomUUID(),inviteeId,provider,reference,amount,rate,value,now(),inviteeId,inviteeId).run();
 return {recorded:(result.meta?.changes||0)>0};
}
async function publicStatus(db,userId){
 const [member,setup,bal] = await Promise.all([memberFor(db,userId),config(db),balances(db,userId)]);
 const withdrawDays=activeDays(await withdrawDaysMask(db,setup));
 let activity=[],withdrawals=[],signups=[],lifetimeSignups=0,lifetimePurchases=0;
 if(member?.status==='approved'){
  const [cs,ws,ss,sc,pc]=await Promise.all([
   db.prepare('SELECT id,gross_kobo,commission_kobo,rate_bps,created_at FROM affiliate_commissions WHERE affiliate_id=? AND status=? ORDER BY created_at DESC LIMIT 30').bind(userId,'earned').all(),
   db.prepare('SELECT id,amount_kobo,status,requested_at,updated_at,decision_note,transfer_reference FROM affiliate_withdrawals WHERE affiliate_id=? ORDER BY requested_at DESC LIMIT 20').bind(userId).all(),
   db.prepare('SELECT created_at FROM affiliate_signups WHERE affiliate_id=? ORDER BY created_at DESC LIMIT 30').bind(userId).all(),
   db.prepare('SELECT COUNT(*) AS n FROM affiliate_signups WHERE affiliate_id=?').bind(userId).first(),
   db.prepare("SELECT COUNT(*) AS n FROM affiliate_commissions WHERE affiliate_id=? AND status='earned'").bind(userId).first()
  ]);
  activity=cs.results||[];withdrawals=ws.results||[];signups=ss.results||[];lifetimeSignups=sc?.n||0;lifetimePurchases=pc?.n||0;
 }
 return {ok:true,member:member?{status:member.status,code:member.referral_code,appliedAt:member.created_at,note:member.reviewed_note}:null,
 settings:{enabled:!!setup.enabled,ratePercent:setup.rate_bps/100,withdrawDay:setup.weekday,withdrawDays,minWithdrawKobo:setup.min_withdraw_kobo},
 balance:{earned:bal.earned||0,paid:bal.paid||0,reserved:bal.reserved||0,available:Math.max(0,(bal.earned||0)-(bal.paid||0)-(bal.reserved||0))},
 commissionHistory:activity,withdrawals,signupsCount:lifetimeSignups,depositsCount:lifetimePurchases};
}
async function readBody(request){try{return await request.json()}catch{return null}}
export async function affiliateCustomerApi(request,env,auth,notify){
 const db=env.AFFILIATE_DB;if(!db)return failDb();
 const user=await auth(request,env);if(!user?.user?.id)return bad('Please sign in first.',401);
 const id=user.user.id,path=new URL(request.url).pathname;
 if(path==='/api/affiliate/status' && request.method==='GET')return json(await publicStatus(db,id));
 if(path==='/api/affiliate/history' && request.method==='GET'){
  const partner=await memberFor(db,id);
  if(partner?.status!=='approved')return bad('Partner approval is required to view earnings history.',403);
  const params=new URL(request.url).searchParams;
  const type=safe(params.get('type'));
  const rawOffset=Number(params.get('offset')||0);
  if(!Number.isSafeInteger(rawOffset)||rawOffset<0||rawOffset>1000000)return bad('Invalid history page.');
  const limit=25;
  let query,results;
  if(type==='referrals'){
   query=`SELECT s.invited_user_id,s.created_at,
      COUNT(c.id) AS deposits_count,
      COALESCE(SUM(c.gross_kobo),0) AS total_deposits_kobo,
      COALESCE(SUM(c.commission_kobo),0) AS commission_kobo,
      MAX(c.created_at) AS last_deposit_at
     FROM affiliate_signups s
     LEFT JOIN affiliate_commissions c ON c.affiliate_id=s.affiliate_id
       AND c.invited_user_id=s.invited_user_id AND c.status='earned'
     WHERE s.affiliate_id=?
     GROUP BY s.invited_user_id,s.created_at
     ORDER BY s.created_at DESC,s.invited_user_id DESC LIMIT ? OFFSET ?`;
   results=await db.prepare(query).bind(id,limit+1,rawOffset).all();
  }else if(type==='withdrawals'){
   query=`SELECT id,amount_kobo,status,requested_at,updated_at,transfer_reference,decision_note
     FROM affiliate_withdrawals WHERE affiliate_id=?
     ORDER BY requested_at DESC,id DESC LIMIT ? OFFSET ?`;
   results=await db.prepare(query).bind(id,limit+1,rawOffset).all();
  }else if(type==='transactions'){
   query=`SELECT * FROM (
      SELECT 'commission' AS kind,id,created_at AS occurred_at,
       CASE WHEN status='earned' THEN commission_kobo ELSE 0 END AS amount_kobo,
       gross_kobo,provider,status,invited_user_id AS related_user
      FROM affiliate_commissions WHERE affiliate_id=?
      UNION ALL
      SELECT 'withdrawal' AS kind,id,requested_at AS occurred_at,
       CASE WHEN status IN ('requested','approved','paid') THEN -amount_kobo ELSE 0 END AS amount_kobo,
       0 AS gross_kobo,'manual transfer' AS provider,status,'' AS related_user
      FROM affiliate_withdrawals WHERE affiliate_id=?
     ) ORDER BY occurred_at DESC,id DESC LIMIT ? OFFSET ?`;
   results=await db.prepare(query).bind(id,id,limit+1,rawOffset).all();
  }else return bad('Unknown history view.');
  const rows=results.results||[];
  return json({ok:true,type,items:rows.slice(0,limit),nextOffset:rawOffset+Math.min(rows.length,limit),hasMore:rows.length>limit});
 }

 if(path==='/api/affiliate/apply' && request.method==='POST'){
  const setup=await config(db);if(!setup?.enabled)return bad('Applications are currently closed.',403);
  const previous=await memberFor(db,id);if(previous)return bad(previous.status==='pending'?'Your application is already awaiting approval.':'Your application is already recorded.',409);
  await db.prepare("INSERT INTO affiliate_members (user_id,display_name,email,status,created_at) VALUES (?,?,?,?,?)").bind(id,safe(user.user.name).slice(0,120),safe(user.user.email).slice(0,180),'pending',now()).run();
  await audit(db,id,'application_submitted',id);
  return json(await publicStatus(db,id));
 }
 if(path==='/api/affiliate/withdraw' && request.method==='POST'){
  const member=await memberFor(db,id);if(member?.status!=='approved')return bad('Only approved partners can request a withdrawal.',403);
  const setup=await config(db);if(!setup?.enabled)return bad('Withdrawals are temporarily unavailable.',403);
  if(((await withdrawDaysMask(db,setup))&(1<<lagosWeekday()))===0)return bad('Withdrawal requests are unavailable today. Check your dashboard for the selected withdrawal days (Nigeria time).',403);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setup.notification_email||''))return bad('Withdrawal requests are not configured yet. Contact support.',503);
  const body=await readBody(request);if(!body)return bad('Invalid request.');
  if(body.bankConsent!==true)return bad('Confirm that you are authorized to receive payment to this bank account.');
  const amount=money(Number(body.amountNaira)*100);
  const bank=safe(body.bankName).slice(0,90),holder=safe(body.accountName).slice(0,120),number=safe(body.accountNumber).replace(/[\s-]/g,'');
  if(amount<setup.min_withdraw_kobo)return bad('Requested amount is below the minimum withdrawal.',400);
  if(amount>100000000000)return bad('Withdrawal amount is too large.',400);
  if(bank.length<2||holder.length<3||!BANK_RE.test(number))return bad('Enter a bank name, account holder name, and valid account number.',400);
  const token=crypto.randomUUID()+crypto.randomUUID();const hash=await sha(token);const expires=Math.floor(Date.now()/1000)+60*60*48;
  const payoutId=crypto.randomUUID(),requested=now();
  try{
   const result=await db.prepare(`INSERT INTO affiliate_withdrawals
 (id,affiliate_id,amount_kobo,bank_name,account_name,account_number,status,requested_at,updated_at,email_token_hash,email_token_expires)
 SELECT ?,?,?,?,?,?,'requested',?,?,?,? WHERE
 (SELECT COALESCE(SUM(commission_kobo),0) FROM affiliate_commissions WHERE affiliate_id=? AND status='earned') -
 (SELECT COALESCE(SUM(amount_kobo),0) FROM affiliate_withdrawals WHERE affiliate_id=? AND status IN ('requested','approved','paid')) >= ?
 AND NOT EXISTS (SELECT 1 FROM affiliate_withdrawals WHERE affiliate_id=? AND status IN ('requested','approved'))`).bind(
 payoutId,id,amount,bank,holder,number,requested,requested,hash,expires,id,id,amount,id).run();
   if(!result.meta?.changes)return bad('Insufficient available earnings or another withdrawal is already pending.',409);
  }catch(err){if(/UNIQUE|constraint/i.test(String(err)))return bad('You already have an open withdrawal request.',409);throw err}
  await audit(db,id,'withdrawal_requested',payoutId,String(amount));
  let notified=false;
  try{
   const link=new URL('/affiliate-payout-review',request.url);link.searchParams.set('id',payoutId);link.searchParams.set('token',token);
   // Token only authorizes a specific review. GET never approves or transfers money.
   await notify(env,{to:setup.notification_email,subject:'CallFocus · Withdrawal request · '+payoutId.slice(0,8),
     text:`Partner ${safe(user.user.name)} (${safe(user.user.email)}) requests ₦${(amount/100).toFixed(2)}.\nBank: ${bank}\nAccount name: ${holder}\nAccount number: ${number}\nReview and confirm AFTER making the manual bank transfer: ${link.toString()}\nThe link does not send money. Confirm Payment Sent records it as Paid and notifies the customer.`,
     html:`<h2>Withdrawal request</h2><p>Amount: ₦${(amount/100).toFixed(2)}</p><p><a href="${link.toString()}">Review payment status securely</a></p><p>Transfer the money manually before selecting Confirm Payment Sent. This link does not send money.</p>`});
   notified=true;
  }catch(error){console.error('Affiliate withdrawal notification failed',error?.message||error)}
  await db.prepare('UPDATE affiliate_withdrawals SET notification_status=? WHERE id=?').bind(notified?'sent':'failed',payoutId).run();
  return json({...(await publicStatus(db,id)),notificationSent:notified});
 }
 return bad('Method not allowed.',405);
}
async function sendPaidNotification(env,db,withdrawalId,notify){
 if(typeof notify!=='function')return {sent:false,error:'Email service is not available.'};
 const row=await db.prepare(`SELECT w.id,w.amount_kobo,w.status,w.transfer_reference,m.email
  FROM affiliate_withdrawals w JOIN affiliate_members m ON m.user_id=w.affiliate_id
  WHERE w.id=?`).bind(withdrawalId).first();
 if(!row||row.status!=='paid')return {sent:false,error:'Withdrawal is not paid.'};
 const recipient=safe(row.email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return {sent:false,error:'Customer has no valid email.'};
 const amount=(row.amount_kobo/100).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});
 const reference=safe(row.transfer_reference);
 const safeRef=reference.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=`Your CallFocus Earn Referrals withdrawal of ₦${amount} has been marked Paid after the manual bank transfer.${reference?'\nTransfer reference: '+reference:''}\nSign in to your Earn Referrals dashboard to view the updated status.`;
 const html=`<h2>Withdrawal payment confirmed</h2><p>We have marked your Earn Referrals withdrawal of <strong>₦${amount}</strong> as <strong>Paid</strong> after the manual bank transfer.</p>${reference?'<p>Transfer reference: '+safeRef+'</p>':''}<p>Sign in to CallFocus to check your dashboard.</p>`;
 try{
  await notify(env,{to:recipient,subject:'CallFocus · Your withdrawal has been paid',text,html});
  try{await audit(db,'system','withdrawal_paid_email_sent',withdrawalId)}catch{}
  return {sent:true};
 }catch(error){
  console.error('Affiliate payout customer notification failed',safe(error?.message||error));
  try{await audit(db,'system','withdrawal_paid_email_failed',withdrawalId,safe(error?.message||error))}catch{}
  return {sent:false,error:'Confirmation email could not be sent; payout status is already Paid.'};
 }
}
export async function affiliateAdminApi(request,env,authorized,notify){
 if(!await authorized(request,env))return bad('Admin sign-in required.',401);
 const db=env.AFFILIATE_DB;if(!db)return failDb();
 const path=new URL(request.url).pathname;
 if(path==='/api/admin/affiliate'&&request.method==='GET'){
  const params=new URL(request.url).searchParams;
  const appOffset=Math.min(100000,Math.max(0,Number.parseInt(params.get('appsOffset')||'0',10)||0));
  const payoutOffset=Math.min(100000,Math.max(0,Number.parseInt(params.get('payoutsOffset')||'0',10)||0));
  const [settings,applications,payouts,stats,appCount,payoutCount]=await Promise.all([
   config(db),
   db.prepare("SELECT * FROM affiliate_members ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC LIMIT 80 OFFSET ?").bind(appOffset).all(),
   db.prepare("SELECT w.*,m.display_name,m.email FROM affiliate_withdrawals w LEFT JOIN affiliate_members m ON m.user_id=w.affiliate_id ORDER BY CASE w.status WHEN 'requested' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, w.requested_at DESC LIMIT 80 OFFSET ?").bind(payoutOffset).all(),
   db.prepare('SELECT COUNT(*) total, COALESCE(SUM(commission_kobo),0) earned FROM affiliate_commissions').first(),
   db.prepare('SELECT COUNT(*) AS n FROM affiliate_members').first(),
   db.prepare('SELECT COUNT(*) AS n FROM affiliate_withdrawals').first()
  ]);
  settings.withdrawDays=activeDays(await withdrawDaysMask(db,settings));
  return json({ok:true,settings,applications:applications.results||[],withdrawals:payouts.results||[],stats,totalApplications:appCount?.n||0,totalWithdrawals:payoutCount?.n||0});
 }
 if(path==='/api/admin/affiliate/settings'&&request.method==='POST'){
  const b=await readBody(request);if(!b)return bad('Invalid settings.');
  const percent=Number(b.ratePercent),minimum=Number(b.minimumNaira);
  const withdrawDays=b.withdrawDays;
  if(!Array.isArray(withdrawDays)||withdrawDays.length<1||withdrawDays.length>7||
   withdrawDays.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(withdrawDays).size!==withdrawDays.length){
   return bad('Select at least one valid withdrawal day (Monday through Sunday).');
  }
  if(!Number.isFinite(percent)||percent<0||percent>100||!Number.isFinite(minimum)||minimum<100||minimum>100000000)return bad('Enter a valid percentage (0–100) and minimum withdrawal amount.');
  const mask=withdrawDays.reduce((value,day)=>value|(1<<day),0);
  const firstDay=withdrawDays[0];
  const email=safe(b.notificationEmail).slice(0,180);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return bad('Enter a valid notification email address.');
  const timestamp=now();
  try{
   // D1 batch uses one database transaction, keeping the settings and weekday mask together.
   await db.batch([
    db.prepare('UPDATE affiliate_settings SET rate_bps=?,weekday=?,min_withdraw_kobo=?,notification_email=?,enabled=?,updated_at=? WHERE id=1').bind(
     Math.round(percent*100),firstDay,Math.round(minimum*100),email,b.enabled?1:0,timestamp),
    db.prepare('INSERT INTO affiliate_withdrawal_days (id,days_mask,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET days_mask=excluded.days_mask,updated_at=excluded.updated_at').bind(mask,timestamp)
   ]);
  }catch(error){
   if(/no such table.*affiliate_withdrawal_days/i.test(String(error?.message||error)))return bad('Please run the V16.37 withdrawal-days SQL setup in the callfocus-affiliates D1 Console before saving.',503);
   throw error;
  }
  await audit(db,'admin','settings_updated','affiliate_settings',`rate=${percent},days=${withdrawDays.join(',')},min=${minimum}`);
  return json({ok:true,withdrawDays:activeDays(mask)});
 }
 if(path==='/api/admin/affiliate/action'&&request.method==='POST'){
  const b=await readBody(request);if(!b)return bad('Invalid action.');
  const action=safe(b.action),id=safe(b.id);
  if(!id||!['approve_member','reject_member','suspend_member','approve_payout','reject_payout','mark_paid','resend_paid_email'].includes(action))return bad('Unknown action.');
  if(action==='resend_paid_email'){
   const result=await sendPaidNotification(env,db,id,notify);
   return json({ok:result.sent,emailSent:result.sent,message:result.sent?'Payment confirmation emailed.':result.error},result.sent?200:502);
  }
  if(action==='approve_member'){
   const m=await memberFor(db,id);if(!m||m.status!=='pending')return bad('Only pending applications can be approved.',409);
   let approved=false;
   for(let n=0;n<6;n++){
    try{const r=await db.prepare("UPDATE affiliate_members SET status='approved',referral_code=?,reviewed_at=?,reviewed_note='' WHERE user_id=? AND status='pending'").bind(newCode(),now(),id).run();approved=(r.meta?.changes||0)===1;break}catch(err){if(!/UNIQUE/i.test(String(err)))throw err}
   }
   if(!approved)return bad('Could not assign a unique referral code.',409);
  } else if(['reject_member','suspend_member'].includes(action)){
   const next=action==='reject_member'?'rejected':'suspended';
   const r=await db.prepare('UPDATE affiliate_members SET status=?,reviewed_at=?,reviewed_note=? WHERE user_id=? AND status IN (\'pending\',\'approved\')').bind(next,now(),safe(b.note).slice(0,240),id).run();
   if(!r.meta?.changes)return bad('Application status has changed. Refresh to continue.',409);
  } else {
   const prior=await db.prepare('SELECT * FROM affiliate_withdrawals WHERE id=?').bind(id).first();if(!prior)return bad('Withdrawal not found.',404);
   const target={approve_payout:'approved',reject_payout:'rejected',mark_paid:'paid'}[action];
   const allowed=action==='mark_paid'?'approved':'requested';
   if(action==='mark_paid' && safe(b.transferReference).length<4)return bad('Enter the bank-transfer reference before marking this withdrawal paid.');
   const r=await db.prepare('UPDATE affiliate_withdrawals SET status=?,updated_at=?,decision_note=?,transfer_reference=?,email_token_hash=NULL WHERE id=? AND status=?').bind(target,now(),safe(b.note).slice(0,220),action==='mark_paid'?safe(b.transferReference).slice(0,120):prior.transfer_reference,id,allowed).run();
   if(!r.meta?.changes)return bad('Withdrawal status has changed. Refresh before trying again.',409);
  }
  await audit(db,'admin',action,id,safe(b.note).slice(0,180));
  if(action==='mark_paid'){
   const sent=await sendPaidNotification(env,db,id,notify);
   return json({ok:true,status:'paid',emailSent:sent.sent,message:sent.sent?'Marked Paid. Customer confirmation email sent.':'Marked Paid. Customer email could not be sent; use Resend confirmation in Admin.'});
  }
  return json({ok:true});
 }
 return bad('Method not allowed.',405);
}
export async function affiliateEmailReview(request,env,notify){
 const db=env.AFFILIATE_DB;if(!db)return failDb();
 const url=new URL(request.url);let id='',token='';
 let body=null;
 if(request.method==='GET'){id=safe(url.searchParams.get('id'));token=safe(url.searchParams.get('token'))}
 else if(request.method==='POST'){body=await readBody(request);id=safe(body?.id);token=safe(body?.token);}
 else return bad('Method not allowed.',405);
 if(!id||token.length<30)return bad('Review link is invalid.',403);
 const row=await db.prepare('SELECT * FROM affiliate_withdrawals WHERE id=? AND email_token_hash=? AND email_token_expires>?').bind(id,await sha(token),Math.floor(Date.now()/1000)).first();
 if(!row)return bad('This review link has expired or has already been used.',403);
 if(request.method==='GET')return json({ok:true,id:row.id,status:row.status,amountKobo:row.amount_kobo,bankName:row.bank_name,accountName:row.account_name,accountNumber:row.account_number,requestedAt:row.requested_at});
 const action=safe(body?.action);if(!['confirm_paid','reject'].includes(action))return bad('Choose Confirm Payment Sent or Reject.');
 // This is a manual-transfer acknowledgement. It never initiates a bank transfer.
 // The one-time token is consumed by the conditional UPDATE to avoid double payout confirmation.
 const transferReference=safe(body?.transferReference).slice(0,120);
 const nextStatus=action==='confirm_paid'?'paid':'rejected';
 const result=await db.prepare("UPDATE affiliate_withdrawals SET status=?,updated_at=?,email_token_hash=NULL,decision_note=?,transfer_reference=? WHERE id=? AND status='requested' AND email_token_hash=? AND email_token_expires>?").bind(nextStatus,now(),safe(body?.note).slice(0,220),action==='confirm_paid'?transferReference:row.transfer_reference,id,await sha(token),Math.floor(Date.now()/1000)).run();
 if(!result.meta?.changes)return bad('This request has already been reviewed.',409);
 await audit(db,'email_link','review_'+action,id);
 if(action==='confirm_paid'){
  const sent=await sendPaidNotification(env,db,id,notify);
  return json({ok:true,status:'paid',emailSent:sent.sent,message:sent.sent?'Payment marked Paid. The customer confirmation email was sent.':'Payment marked Paid on the customer dashboard. Email notification failed. You can resend it from Admin → Earn Referrals.'});
 }
 return json({ok:true,status:'rejected',message:'Withdrawal rejected. No payment has been recorded.'});
}
