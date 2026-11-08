/* CallFocus V16.75: monthly voice subscriptions for new AND existing slot owners.
 * First renewal dates are anchored to each original slot booking timestamp
 * (booked_at), never to migration/deployment date. No automatic credit debits.
 * All external provider actions remain on the assigned account, never on OpenAI voices. */
const DAYS=86400000, PERIOD_DAYS=30, GRACE_DAYS=7;
const dbFor=env=>{if(!env.CALLFOCUS_WALLET_DB?.prepare)throw Error('D1_UNAVAILABLE');return env.CALLFOCUS_WALLET_DB};
const nowIso=()=>new Date().toISOString();
const isoAdd=(date,days)=>new Date(Date.parse(date)+days*DAYS).toISOString();
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(s,status=400)=>json({ok:false,error:s},status);
const poolSecret=(env,pool)=>{let index=pool==='primary'?1:pool==='secondary'?2:pool==='tertiary'?3:/^pool(?:[4-9]|10)$/.test(pool)?Number(pool.slice(4)):0;return index?String(env[index===1?'ELEVENLABS_PERMANENT_API_KEY':`ELEVENLABS_PERMANENT_${index}_API_KEY`]||'').trim():''};
const validPool=pool=>['primary','secondary','tertiary',...Array.from({length:7},(_,i)=>`pool${i+4}`)].includes(pool);
function view(sub,now=Date.now()){
 if(!sub)return {state:'unavailable',canUseVoice:false,mayRenew:false,message:'Subscription status unavailable.'};
 if(sub.status==='legacy')return {state:'grandfathered',canUseVoice:true,mayRenew:false,message:'Monthly renewal transition is pending for this existing slot. No renewal will be charged until it is activated.'};
 if(sub.status==='releasing'||sub.status==='released')return {state:sub.status,canUseVoice:false,mayRenew:false,message:'This expired slot is being released or has been released.'};
 const until=Date.parse(sub.paid_through),grace=Date.parse(sub.grace_until);
 if(!Number.isFinite(until)||!Number.isFinite(grace))return {state:'unavailable',canUseVoice:false,mayRenew:false,message:'Subscription dates need review.'};
 const active=until>now,graceActive=!active&&grace>now;
 const dueSoon=until-now<=GRACE_DAYS*DAYS;
 return {state:active?'active':graceActive?'grace':'overdue',canUseVoice:active,mayRenew:dueSoon,
   paidThrough:sub.paid_through,graceUntil:sub.grace_until,
   message:active?`Monthly voice access active until ${sub.paid_through.slice(0,10)}.`:graceActive?`Your cloned voice is paused. Renew by ${sub.grace_until.slice(0,10)} to keep the slot.`:'Your renewal is over seven days late. Renew before Admin releases this slot.'};
}
async function subscriptionForUser(env,userId){const s=await dbFor(env).prepare('SELECT * FROM cf_permanent_voice_subscriptions WHERE user_id=?').bind(userId).first();return view(s)}
async function startSubscriptionIfPurchased(db,record){
 if(!record?.purchase_id)return;
 const p=await db.prepare('SELECT state FROM cf_permanent_voice_slot_purchases WHERE purchase_id=? AND user_id=?').bind(record.purchase_id,record.user_id).first();
 if(p?.state!=='paid')return;
 const bookedAt=Date.parse(record.booked_at||'');
 if(!Number.isFinite(bookedAt))throw Error('Original slot booking date missing or invalid; manual review required.');
 const started=new Date(bookedAt).toISOString();
 // The first renewal always uses the ORIGINAL booking date, not the later payment confirmation date.
 await db.prepare(`INSERT OR IGNORE INTO cf_permanent_voice_subscriptions(user_id,provider_pool,status,started_at,paid_through,grace_until,created_at,updated_at)
 VALUES (?,?,'active',?,?,?,?,?)`).bind(record.user_id,record.provider_pool||'primary',started,isoAdd(started,PERIOD_DAYS),isoAdd(started,PERIOD_DAYS+GRACE_DAYS),nowIso(),nowIso()).run();
 // Previously released users can buy a completely NEW slot. No old cloned voice is reused.
 await db.prepare(`UPDATE cf_permanent_voice_subscriptions SET provider_pool=?,status='active',started_at=?,paid_through=?,grace_until=?,last_renewal_id=NULL,updated_at=?
 WHERE user_id=? AND status='released' AND EXISTS(SELECT 1 FROM cf_permanent_voice_slots v WHERE v.user_id=? AND v.purchase_id IS NOT NULL AND v.booked_at>=(SELECT released_at FROM cf_permanent_voice_monthly_release_audit a WHERE a.user_id=v.user_id ORDER BY released_at DESC LIMIT 1))`)
 .bind(record.provider_pool||'primary',started,isoAdd(started,PERIOD_DAYS),isoAdd(started,PERIOD_DAYS+GRACE_DAYS),nowIso(),record.user_id,record.user_id).run();
 // If V16.74 had already marked a booking as legacy, activate it once the original purchase settles.
 // Never overwrite already-active paid time or an in-progress provider release.
 await db.prepare(`UPDATE cf_permanent_voice_subscriptions
 SET provider_pool=?,status='active',started_at=?,paid_through=?,grace_until=?,last_renewal_id=NULL,updated_at=?
 WHERE user_id=? AND status='legacy'`)
 .bind(record.provider_pool||'primary',started,isoAdd(started,PERIOD_DAYS),isoAdd(started,PERIOD_DAYS+GRACE_DAYS),nowIso(),record.user_id).run();
}
async function userWallet(env,user,helpers){const data=await helpers.customerData(env,user.id,user.name);const wallet=helpers.normalizeWallet(data.wallet||{});return {data,wallet}}
const receiptId=id=>'voice-renewal:'+id;
const receiptPresent=(w,p)=>Array.isArray(w.usage)&&w.usage.some(x=>x.id===receiptId(p.id)&&x.type==='permanent_voice_renewal'&&Number(x.seconds)===Number(p.price_seconds));
async function finalize(db,p){
 const t=nowIso();
 const out=await db.batch([
  db.prepare(`UPDATE cf_permanent_voice_subscriptions SET paid_through=?,grace_until=?,last_renewal_id=?,updated_at=?
  WHERE user_id=? AND status='active' AND paid_through=?`).bind(p.next_paid_through,isoAdd(p.next_paid_through,GRACE_DAYS),p.id,t,p.user_id,p.prior_paid_through),
  db.prepare(`UPDATE cf_permanent_voice_renewal_payments SET state='paid',paid_at=COALESCE(paid_at,?),claim_at=NULL
  WHERE id=? AND state='charging' AND EXISTS(SELECT 1 FROM cf_permanent_voice_subscriptions WHERE user_id=? AND last_renewal_id=?)`).bind(t,p.id,p.user_id,p.id)
 ]);
 if(Number(out[0]?.meta?.changes||0)!==1||Number(out[1]?.meta?.changes||0)!==1)throw Error('Could not confirm renewal. Payment requires manual verification; do not pay twice.');
}
async function renew(req,env,helpers,price){
 if(req.method!=='POST')return fail('Method not allowed.',405);
 const auth=await helpers.auth(req,env);if(!auth?.user)return fail('Sign in to renew.',401);
 const user=auth.user,db=dbFor(env);
 let sub,record;try{
  sub=await db.prepare('SELECT * FROM cf_permanent_voice_subscriptions WHERE user_id=?').bind(user.id).first();
  record=await db.prepare('SELECT purchase_id,provider_pool FROM cf_permanent_voice_slots WHERE user_id=?').bind(user.id).first();
 }catch{return fail('Run the V16.74 subscription SQL migration first.',503)}
 if(!sub||!record)return fail('No active monthly voice slot was found. Buy a slot first.',404);
 if(sub.status==='legacy')return fail('Monthly renewal is being enabled for existing slots. No payment is due until your transition is activated.',409);
 if(sub.status!=='active')return fail('This slot is being released or was released. Contact CallFocus before making a payment.',409);
 const state=view(sub);if(!state.mayRenew)return fail('Your next renewal is not due yet. Renewals open seven days before expiry.',409);
 const seconds=Number(price)*60/100;
 if(!Number.isInteger(seconds)||seconds<1)return fail('Renewal price is not configured correctly.',503);
 // Exactly one invoice per prior paid-through boundary, even on rapid repeat taps.
 let payment=await db.prepare('SELECT * FROM cf_permanent_voice_renewal_payments WHERE user_id=? AND prior_paid_through=?').bind(user.id,sub.paid_through).first();
 if(!payment){
  const t=nowIso(),current=Date.now(),prior=Date.parse(sub.paid_through),endOfGrace=Date.parse(sub.grace_until);
  // Renewals made before the original 7-day grace ends remain on the original 30-day billing cycle.
  // Later renewals (only if Admin has not released the slot) restart at the payment date; no back-charge.
  const basis=new Date(current<=endOfGrace?prior:current).toISOString(),id=crypto.randomUUID();
  await db.prepare(`INSERT OR IGNORE INTO cf_permanent_voice_renewal_payments(id,user_id,prior_paid_through,next_paid_through,price_credits,price_seconds,state,created_at)
   SELECT ?,?,?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM cf_permanent_voice_subscriptions WHERE user_id=? AND status='active' AND paid_through=?)`)
  .bind(id,user.id,sub.paid_through,isoAdd(basis,PERIOD_DAYS),price,seconds,t,user.id,sub.paid_through).run();
  payment=await db.prepare('SELECT * FROM cf_permanent_voice_renewal_payments WHERE user_id=? AND prior_paid_through=?').bind(user.id,sub.paid_through).first();
 }
 if(!payment)return fail('This subscription has changed. Refresh and try again.',409);
 if(payment.state==='paid')return json({ok:true,alreadyPaid:true,subscription:await subscriptionForUser(env,user.id)});
 let snapshot;try{snapshot=await userWallet(env,user,helpers)}catch{return fail('Unable to verify your CallFocus credit balance.',503)}
 // Lost response after a successful KV debit: reconcile the SAME invoice.
 if(receiptPresent(snapshot.wallet,payment)){
  try{if(payment.state==='pending')await db.prepare("UPDATE cf_permanent_voice_renewal_payments SET state='charging',claim_at=? WHERE id=? AND state='pending'").bind(nowIso(),payment.id).run();await finalize(db,payment);return json({ok:true,alreadyPaid:true,subscription:await subscriptionForUser(env,user.id)})}
  catch{return fail('Payment was received, but renewal needs verification. Do not pay again.',503)}
 }
 if(payment.state==='charging')return fail('An earlier renewal needs payment verification. No second debit was attempted.',409);
 if(Number(snapshot.wallet.balanceSeconds)<Number(payment.price_seconds))return fail(`Renewal costs ${payment.price_credits} credits. Add credits to your wallet before renewing.`,402);
 // Claim only if subscription has not been selected for release.
 const claim=await db.prepare(`UPDATE cf_permanent_voice_renewal_payments SET state='charging',claim_at=? WHERE id=? AND state='pending'
 AND EXISTS(SELECT 1 FROM cf_permanent_voice_subscriptions WHERE user_id=? AND status='active' AND paid_through=?)`)
 .bind(nowIso(),payment.id,user.id,sub.paid_through).run();
 if(claim.meta?.changes!==1)return fail('Renewal already in progress or this slot is being released. Refresh before paying.',409);
 try{snapshot=await userWallet(env,user,helpers)}catch{return fail('Renewal is pending verification. Do not submit another payment.',503)}
 if(!receiptPresent(snapshot.wallet,payment)){
  if(Number(snapshot.wallet.balanceSeconds)<Number(payment.price_seconds)){
   await db.prepare("UPDATE cf_permanent_voice_renewal_payments SET state='pending',claim_at=NULL WHERE id=? AND state='charging'").bind(payment.id).run();
   return fail('Insufficient wallet credits. No renewal charge was made.',402);
  }
  snapshot.wallet.balanceSeconds-=Number(payment.price_seconds);
  snapshot.wallet.revision=Math.max(0,Number(snapshot.wallet.revision)||0)+1;
  snapshot.wallet.usage.unshift({id:receiptId(payment.id),type:'permanent_voice_renewal',referenceId:payment.id,
    seconds:payment.price_seconds,credits:payment.price_credits,createdAt:nowIso(),note:'30-day monthly cloned voice renewal'});
  snapshot.wallet.usage=snapshot.wallet.usage.slice(0,250);snapshot.data.wallet=snapshot.wallet;
  try{await env.CALLFOCUS_CONFIG.put(`customer:data:${user.id}`,JSON.stringify(snapshot.data))}catch{return fail('Renewal payment is awaiting verification. Do not pay again.',503)}
 }
 let check;try{check=await userWallet(env,user,helpers)}catch{return fail('Your renewal debit was submitted but final verification is pending. Do not pay again.',503)}
 if(!receiptPresent(check.wallet,payment))return fail('Your renewal receipt is awaiting confirmation. Do not pay again.',503);
 try{await finalize(db,payment)}catch{return fail('Your renewal charge was recorded. Subscription activation needs review. Do not pay again.',503)}
 return json({ok:true,chargedCredits:payment.price_credits,subscription:await subscriptionForUser(env,user.id)});
}
async function adminReport(db,now=nowIso()){
 const rows=await db.prepare(`SELECT v.provider_pool pool, COUNT(*) total,
 SUM(CASE WHEN s.status='legacy' THEN 1 ELSE 0 END) grandfathered,
 SUM(CASE WHEN s.status='active' AND s.paid_through>? THEN 1 ELSE 0 END) subscribed,
 SUM(CASE WHEN s.status='active' AND s.paid_through<=? AND s.grace_until>? THEN 1 ELSE 0 END) grace,
 SUM(CASE WHEN s.status='active' AND s.grace_until<=? THEN 1 ELSE 0 END) eligible,
 SUM(CASE WHEN s.status='releasing' THEN 1 ELSE 0 END) releasing,
 SUM(CASE WHEN s.user_id IS NULL THEN 1 ELSE 0 END) untracked
 FROM cf_permanent_voice_slots v LEFT JOIN cf_permanent_voice_subscriptions s ON s.user_id=v.user_id
 GROUP BY v.provider_pool`).bind(now,now,now,now).all();
 const pools={};for(let i=1;i<=10;i++){const pool=i===1?'primary':i===2?'secondary':i===3?'tertiary':`pool${i}`;
  const r=(rows.results||[]).find(x=>x.pool===pool)||{};pools[pool]={account:i,total:Number(r.total||0),subscribed:Number(r.subscribed||0),grace:Number(r.grace||0),eligible:Number(r.eligible||0),grandfathered:Number(r.grandfathered||0),releasing:Number(r.releasing||0),untracked:Number(r.untracked||0)};
 }
 const sums=Object.values(pools).reduce((a,p)=>{for(const key of ['total','subscribed','grace','eligible','grandfathered','releasing','untracked'])a[key]=(a[key]||0)+p[key];return a},{});
 const due=await db.prepare(`SELECT v.user_id,v.provider_pool,s.paid_through,s.grace_until,
 CASE WHEN s.status='releasing' THEN 'releasing' WHEN s.grace_until<=? THEN 'eligible' ELSE 'grace' END AS status
 FROM cf_permanent_voice_slots v JOIN cf_permanent_voice_subscriptions s ON v.user_id=s.user_id
 WHERE (s.status='active' AND s.paid_through<=?) OR s.status='releasing'
 ORDER BY s.grace_until ASC LIMIT 200`).bind(now,now).all();
 return {periodDays:PERIOD_DAYS,graceDays:GRACE_DAYS,pools,totals:sums,due:(due.results||[])};
}
async function releaseExpired(req,env){
 if(req.method!=='POST')return fail('Method not allowed.',405);
 let input;try{input=await req.json()}catch{return fail('Invalid release request.')}
 const pool=String(input?.pool||'');const count=Number(input?.count);
 if(!validPool(pool)||!Number.isSafeInteger(count)||count<1||count>12)return fail('Choose an account and 1–12 overdue slots per release.');
 if(input?.confirm!=='RELEASE EXPIRED VOICES')return fail('Type RELEASE EXPIRED VOICES to confirm deleting overdue saved voices.');
 const db=dbFor(env),t=nowIso();
 const rows=await db.prepare(`SELECT v.user_id,v.provider_pool,v.voice_id,v.state,v.booked_at,s.grace_until,s.status
 FROM cf_permanent_voice_slots v JOIN cf_permanent_voice_subscriptions s ON s.user_id=v.user_id
 WHERE v.provider_pool=? AND s.grace_until<=? AND s.status IN ('active','releasing')
 AND v.state NOT IN ('creating','verification')
 AND NOT EXISTS(SELECT 1 FROM cf_permanent_voice_renewal_payments p WHERE p.user_id=v.user_id AND p.state='charging')
 ORDER BY s.grace_until ASC LIMIT ?`).bind(pool,t,count).all();
 const candidates=rows.results||[];let released=0,failed=0,details=[];
 for(const record of candidates){
  const locked=await db.prepare(`UPDATE cf_permanent_voice_subscriptions SET status='releasing',updated_at=?
    WHERE user_id=? AND grace_until<=? AND status IN ('active','releasing')
    AND NOT EXISTS(SELECT 1 FROM cf_permanent_voice_renewal_payments WHERE user_id=? AND state='charging')`)
  .bind(nowIso(),record.user_id,nowIso(),record.user_id).run();
  if(Number(locked.meta?.changes||0)!==1){failed++;continue}
  if(record.voice_id){
   const key=poolSecret(env,record.provider_pool);
   if(!key){await db.prepare("UPDATE cf_permanent_voice_subscriptions SET status='active' WHERE user_id=? AND status='releasing'").bind(record.user_id).run();failed++;details.push('Account credentials unavailable; saved voice retained.');continue}
   let response;try{response=await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(record.voice_id)}`,{method:'DELETE',headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)})}catch{failed++;details.push('Voice deletion could not be verified; held for retry.');continue}
   if(!response.ok&&response.status!==404){await db.prepare("UPDATE cf_permanent_voice_subscriptions SET status='active' WHERE user_id=? AND status='releasing'").bind(record.user_id).run();failed++;details.push('Voice deletion rejected (HTTP '+response.status+'); voice retained.');continue}
  }
  // Remove provider storage first. Only then release the booking, preserving a D1 audit.
  try{
   const result=await db.batch([
    db.prepare(`INSERT OR IGNORE INTO cf_permanent_voice_monthly_release_audit(user_id,provider_pool,voice_id,booked_at,grace_until,released_at)
    VALUES (?,?,?,?,?,?)`).bind(record.user_id,record.provider_pool,record.voice_id,record.booked_at,record.grace_until,nowIso()),
    db.prepare(`DELETE FROM cf_permanent_voice_slots WHERE user_id=? AND provider_pool=? AND state NOT IN ('creating','verification') AND voice_id IS ?
       AND EXISTS(SELECT 1 FROM cf_permanent_voice_subscriptions WHERE user_id=? AND status='releasing')`).bind(record.user_id,record.provider_pool,record.voice_id,record.user_id),
    db.prepare(`UPDATE cf_permanent_voice_subscriptions SET status='released',updated_at=? WHERE user_id=? AND status='releasing' AND NOT EXISTS(SELECT 1 FROM cf_permanent_voice_slots WHERE user_id=?)`).bind(nowIso(),record.user_id,record.user_id)
   ]);
   if(Number(result[1]?.meta?.changes||0)!==1||Number(result[2]?.meta?.changes||0)!==1){failed++;details.push('Database release incomplete; check audit before retry.');continue}
   released++;
  }catch{failed++;details.push('Database release needs review; do not reassign until reconciled.')}
 }
 return json({ok:true,requested:count,eligibleFound:candidates.length,released,failed,
   message:`Released ${released} expired slot(s) from Account ${pool==='primary'?1:pool==='secondary'?2:pool==='tertiary'?3:pool.slice(4)}. ${failed} need review. Refresh and use existing website availability controls to publish slots when provider capacity is verified.`,details:details.slice(0,6)});
}
export {subscriptionForUser,startSubscriptionIfPurchased,renew,adminReport,releaseExpired,view};
