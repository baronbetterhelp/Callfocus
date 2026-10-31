/* CallFocus V16.45: limited permanent cloned-voice booking. Independent of the original OpenAI engine. */
const SLOT_KEY='callfocus:permanent-voice:settings:v1';
const SLOT_PRICE_CREDITS=1000;
const SLOT_PRICE_SECONDS=600;
const SLOT_RECEIPT_PREFIX='permanent-slot:';
const DEF={enabled:false,popupEnabled:false,forceFull:false,slotLimit:30,minimumCredits:1000,primaryLimit:30,secondaryLimit:30,secondaryEnabled:false,primaryAcceptNew:true,secondaryAcceptNew:true,tertiaryLimit:30,tertiaryEnabled:false,releaseQuota:0,releaseId:'',eventDate:'',bookingOpensAt:'',bookingClosesAt:'',headline:'Limited permanent voice cloning slots',message:'Buy a permanent voice-cloning slot for 1,000 credits. Your saved voice can then be reused for cloned calls and voice notes.',fullMessage:'All permanent voice cloning slots are filled. Join our Telegram channel to be the first to know when the next slots open.',telegramUrl:'https://t.me/callfocus',revision:1};
const j=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const err=(text,status=400)=>j({ok:false,error:text},status);
const sql=env=>{if(!env.CALLFOCUS_WALLET_DB?.prepare)throw Error('VOICE_SLOTS_D1_NOT_CONFIGURED');return env.CALLFOCUS_WALLET_DB};
async function settings(env){if(!env.CALLFOCUS_CONFIG)throw Error('VOICE_SETTINGS_KV_UNAVAILABLE');const s=await env.CALLFOCUS_CONFIG.get(SLOT_KEY,{type:'json'});return {...DEF,...(s&&typeof s==='object'?s:{}),minimumCredits:SLOT_PRICE_CREDITS};}
async function row(db,userId){return db.prepare('SELECT user_id,booked_at,state,voice_id,voice_name,created_at,provider_pool,purchase_id FROM cf_permanent_voice_slots WHERE user_id=?').bind(userId).first()}
async function tally(db){const r=await db.prepare('SELECT COUNT(*) AS n FROM cf_permanent_voice_slots').first();return Number(r?.n||0)}
// Internal account order is stable. Existing voice IDs never change provider.
const POOLS=['primary','secondary','tertiary',...Array.from({length:7},(_,i)=>`pool${i+4}`)];
const poolIndex=pool=>POOLS.indexOf(pool);
const poolKey=(env,pool)=>{const i=poolIndex(pool);if(i<0)return '';return String(env[i===0?'ELEVENLABS_PERMANENT_API_KEY':`ELEVENLABS_PERMANENT_${i+1}_API_KEY`]||'').trim()};
const poolAgent=(env,pool)=>{const i=poolIndex(pool);if(i<0)return '';return String(env[i===0?'ELEVENLABS_PERMANENT_AGENT_ID':`ELEVENLABS_PERMANENT_${i+1}_AGENT_ID`]||'').trim()};
async function poolCounts(db){
 const result=Object.fromEntries(POOLS.map(id=>[id,{reserved:0,created:0,pending:0}]));
 const rows=await db.prepare("SELECT provider_pool,COUNT(*) n,SUM(CASE WHEN voice_id IS NOT NULL THEN 1 ELSE 0 END) created,SUM(CASE WHEN voice_id IS NULL AND state IN ('booked','failed') THEN 1 ELSE 0 END) pending FROM cf_permanent_voice_slots GROUP BY provider_pool").all();
 for(const r of rows.results||[])if(result[r.provider_pool])result[r.provider_pool]={reserved:Number(r.n||0),created:Number(r.created||0),pending:Number(r.pending||0)};
 return result;
}
const totalReserved=counts=>POOLS.reduce((n,p)=>n+(counts[p]?.reserved||0),0);
const totalCreated=counts=>POOLS.reduce((n,p)=>n+(counts[p]?.created||0),0);
const totalPending=counts=>POOLS.reduce((n,p)=>n+(counts[p]?.pending||0),0);
const effectiveLimit=s=>s.slotLimit;
async function subscription(env,pool){const key=poolKey(env,pool);if(!key)return {ok:false,error:'Account credentials not configured.'};try{const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(10000)});if(!r.ok)return {ok:false,error:'Subscription check failed (HTTP '+r.status+').'};const d=await r.json();return {ok:true,tier:String(d.tier||''),voiceSlotsUsed:Number(d.voice_slots_used??0),voiceSlotLimit:Number(d.voice_limit??0),monthlyCreationUsed:d.voice_add_edit_counter??null,monthlyCreationLimit:d.max_voice_add_edits??null,canClone:d.can_use_instant_voice_cloning!==false,status:d.status||''}}catch{return {ok:false,error:'Subscription service unavailable.'}}}
async function capacities(env){
 const results=await Promise.all(POOLS.map(async id=>[id,await subscription(env,id)]));
 return Object.fromEntries(results);
}
function freeInPool(cap,count){
 if(!cap?.ok||cap.canClone===false||!Number.isFinite(cap.voiceSlotLimit)||cap.voiceSlotLimit<1)return 0;
 const physical=Math.max(0,cap.voiceSlotLimit-Math.max(cap.voiceSlotsUsed,count.created)-(count.reserved-count.created));
 const ops=cap.monthlyCreationLimit===null||cap.monthlyCreationLimit===undefined?Infinity:Math.max(0,Number(cap.monthlyCreationLimit)-Number(cap.monthlyCreationUsed||0)-count.pending);
 return Math.max(0,Math.floor(Math.min(physical,ops)));
}
function physicalFree(caps,counts){return POOLS.reduce((n,p)=>n+freeInPool(caps[p],counts[p]),0)}
async function bookedInRelease(db,id){if(!id)return 0;const r=await db.prepare('SELECT COUNT(*) AS n FROM cf_permanent_voice_slots WHERE release_id=?').bind(id).first();return Number(r?.n||0)}
async function available(db,s,counts,caps){
 const issued=await bookedInRelease(db,s.releaseId);
 const budget=Math.max(0,Number(s.releaseQuota||0)-issued);
 return {issued,budget,remaining:Math.max(0,Math.min(budget,s.slotLimit-totalReserved(counts),physicalFree(caps,counts)))};
}
// Never blindly reassign READY, CREATING or VERIFICATION rows. Only an uncreated,
// idle booking can move, and never to an account unable to honour its reservation.
async function rebalance(db,env,counts,caps){
 const moves=[];
 for(let i=0;i<POOLS.length;i++){
  const from=POOLS[i],info=counts[from],cap=caps[from];
  if(!info?.pending||!cap?.ok)continue;
  const physical=cap.voiceSlotLimit-Math.max(cap.voiceSlotsUsed,info.created);
  let overflow=Math.max(0,info.reserved-info.created-Math.max(0,physical));
  if(cap.monthlyCreationLimit!=null)overflow=Math.max(overflow,info.pending-Math.max(0,Number(cap.monthlyCreationLimit)-Number(cap.monthlyCreationUsed||0)));
  while(overflow>0){
   const to=POOLS.slice(i+1).find(q=>freeInPool(caps[q],counts[q])>0);
   if(!to)break;
   const result=await db.prepare(`UPDATE cf_permanent_voice_slots SET provider_pool=?,updated_at=?
     WHERE user_id=(SELECT user_id FROM cf_permanent_voice_slots WHERE provider_pool=? AND state IN ('booked','failed') AND voice_id IS NULL ORDER BY booked_at ASC LIMIT 1)
     AND provider_pool=? AND state IN ('booked','failed') AND voice_id IS NULL
     RETURNING user_id`).bind(to,new Date().toISOString(),from,from).first();
   if(!result)break;
   counts[from].reserved--;counts[from].pending--;counts[to].reserved++;counts[to].pending++;
   moves.push({from,to});overflow--;
  }
 }
 return moves;
}
const safeText=(s,max)=>String(s||'').trim().slice(0,max);
// These admin fields are Lagos-local wall-clock times, not browser-local or UTC.
// Nigeria does not observe daylight-saving time: WAT = UTC+01:00.
function bookingDateMs(value){
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Enter a valid booking date and time.');
 const ms=Date.parse(value+':00+01:00');
 if(!Number.isFinite(ms)||new Date(ms+3600000).toISOString().slice(0,16)!==value)throw Error('Enter a real calendar date and time.');
 return ms;
}
function bookingPhase(s,nowMs=Date.now()){
 const opens=bookingDateMs(s.bookingOpensAt||'');
 const closes=bookingDateMs(s.bookingClosesAt||'');
 if(opens!==null&&nowMs<opens)return 'upcoming';
 if(closes!==null&&nowMs>=closes)return 'ended';
 return 'open';
}
function parseSettings(x,previous){
 if(typeof x?.enabled!=='boolean'||typeof x?.popupEnabled!=='boolean'||typeof x?.forceFull!=='boolean')throw Error('Select both availability switches.');
 const n=Number(x.slotLimit),minimumCredits=SLOT_PRICE_CREDITS;
 if(!Number.isSafeInteger(n)||n<1||n>1000)throw Error('Slot capacity must be between 1 and 1000.');

 const eventDate=safeText(x.eventDate,10);if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw Error('Enter a valid event date.');
 const bookingOpensAt=safeText(x.bookingOpensAt,16),bookingClosesAt=safeText(x.bookingClosesAt,16);
 const openMs=bookingDateMs(bookingOpensAt),closeMs=bookingDateMs(bookingClosesAt);
 if(openMs!==null&&closeMs!==null&&closeMs<=openMs)throw Error('Booking closing time must be later than opening time (Nigeria time).');
 const telegramUrl=safeText(x.telegramUrl,300);if(!/^https:\/\/t\.me\/[A-Za-z0-9_+\-/]{3,}$/.test(telegramUrl))throw Error('Provide a valid Telegram channel link (https://t.me/...).');
 for(const k of ['headline','message','fullMessage'])if(!safeText(x[k],k==='headline'?100:350))throw Error('Complete all customer-facing messages.');
 return {...DEF,enabled:x.enabled,popupEnabled:x.popupEnabled,forceFull:x.forceFull,slotLimit:n,releaseQuota:previous.releaseQuota||0,releaseId:previous.releaseId||'',minimumCredits,eventDate,bookingOpensAt,bookingClosesAt,headline:safeText(x.headline,100),message:safeText(x.message,350),fullMessage:safeText(x.fullMessage,350),telegramUrl,revision:previous.revision+1};
}
function publicView(s,count,record,remaining=0){const phase=bookingPhase(s);const capacity=effectiveLimit(s);return {ok:true,enabled:s.enabled,popupEnabled:s.popupEnabled,slotLimit:capacity,booked:count,remaining,full:s.forceFull===true||remaining<=0,minimumCredits:SLOT_PRICE_CREDITS,purchasePrice:SLOT_PRICE_CREDITS,bookingIsPaid:true,eventDate:s.eventDate,bookingOpensAt:s.bookingOpensAt||'',bookingClosesAt:s.bookingClosesAt||'',bookingPhase:phase,canBookNow:s.enabled&&phase==='open'&&!s.forceFull&&remaining>0,headline:s.headline,message:s.message,fullMessage:s.fullMessage,telegramUrl:s.telegramUrl,revision:s.revision,me:record?{state:record.state,bookedAt:record.booked_at,voiceName:record.voice_name||null,hasSavedVoice:record.state==='ready',purchasePending:record.purchasePending===true,purchased:record.purchased===true,grandfathered:!record.purchase_id}:null}}
async function slotVoiceForUser(env,userId){const v=await row(sql(env),userId);return v?.state==='ready'&&/^[A-Za-z0-9_-]{8,120}$/.test(String(v.voice_id||''))?{voiceId:v.voice_id,name:v.voice_name||'My permanent voice',persistent:true,providerPool:v.provider_pool||'primary'}:null}
// A newly purchased reservation is not usable until the wallet debit is verified.
// Older reservations have no purchase ID and are grandfathered without a retroactive charge.
async function purchase(db,purchaseId){return purchaseId?db.prepare('SELECT * FROM cf_permanent_voice_slot_purchases WHERE purchase_id=?').bind(purchaseId).first():null}
const receiptId=id=>SLOT_RECEIPT_PREFIX+id;
function hasReceipt(wallet,id,type='permanent_voice_slot_purchase'){
 return (wallet.usage||[]).some(v=>v.id===receiptId(id)&&v.type===type&&Number(v.seconds)===SLOT_PRICE_SECONDS);
}
async function paidRecord(db,record){
 if(!record||!record.purchase_id)return record;
 const p=await purchase(db,record.purchase_id);
 return {...record,purchased:p?.state==='paid',purchasePending:p?.state!=='paid'};
}
// The existing CallFocus spendable wallet uses seconds (100 credits per minute).
// Purchase receipts are unique in D1 AND in the server wallet ledger. A failed
// verification stays blocked and is reconciled on retry rather than charging again.
async function userAvailableCredits(env,user,helpers){
 const d=await helpers.customerData(env,user.id,user.name);
 const wallet=helpers.normalizeWallet(d.wallet||{});
 const seconds=Math.max(0,Math.floor(Number(wallet.balanceSeconds)||0));
 return Math.floor(seconds*100/60+1e-9);
}
async function cancelUnpaidPurchase(db,record){
 if(!record?.purchase_id)return;
 await db.batch([
  db.prepare("DELETE FROM cf_permanent_voice_slots WHERE user_id=? AND purchase_id=? AND state='booked' AND voice_id IS NULL AND EXISTS(SELECT 1 FROM cf_permanent_voice_slot_purchases WHERE purchase_id=? AND state='pending')").bind(record.user_id,record.purchase_id,record.purchase_id),
  db.prepare("UPDATE cf_permanent_voice_slot_purchases SET state='cancelled' WHERE purchase_id=? AND state='pending'").bind(record.purchase_id)
 ]);
}
async function settlePurchase(db,env,user,helpers,record){
 const id=record?.purchase_id;
 if(!id)return {ok:true,grandfathered:true};
 let payment=await purchase(db,id);
 if(!payment||payment.user_id!==user.id||payment.state==='cancelled')return {ok:false,error:'This purchase needs review. No additional credits have been deducted.',status:409};
 if(payment.state==='paid')return {ok:true,alreadyPaid:true};
 let data,wallet;
 try{data=await helpers.customerData(env,user.id,user.name);wallet=helpers.normalizeWallet(data.wallet||{})}
 catch{return {ok:false,error:'Unable to verify your wallet. Your slot purchase is pending; please retry.',status:503}}
 // A KV write can succeed even if its HTTP response is lost. Reconcile before
 // acquiring a new D1 charge claim, never subtract again when receipt exists.
 if(hasReceipt(wallet,id)){
  try{await db.prepare("UPDATE cf_permanent_voice_slot_purchases SET state='paid',paid_at=COALESCE(paid_at,?),claim_at=NULL WHERE purchase_id=? AND user_id=? AND state IN ('pending','charging')").bind(new Date().toISOString(),id,user.id).run()}
  catch{return {ok:false,error:'Your payment was recorded. Final confirmation is pending; retry without purchasing again.',status:503}}
  return {ok:true,alreadyPaid:true};
 }
 // Once a charge was claimed, no further debit is automatically attempted.
 // Repeated requests only reconcile the existing wallet receipt above. If the
 // earlier write was interrupted, manual review is safer than a double debit.
 if(payment.state==='charging')
  return {ok:false,error:'Your slot payment needs verification. No additional debit will be attempted. Check your balance and contact CallFocus if it remains pending.',status:409};
 const available=Math.max(0,Math.floor(Number(wallet.balanceSeconds)||0));
 if(available<SLOT_PRICE_SECONDS){
  if(payment.state==='pending')await cancelUnpaidPurchase(db,record);
  return {ok:false,error:`Buying a permanent voice slot costs ${SLOT_PRICE_CREDITS} credits. Your current balance is ${Math.floor(available*100/60)} credits. Top up to buy a slot.`,status:402};
 }
 const now=new Date().toISOString();
 const claimed=await db.prepare("UPDATE cf_permanent_voice_slot_purchases SET state='charging',claim_at=? WHERE purchase_id=? AND user_id=? AND state='pending'")
  .bind(now,id,user.id).run();
 if(claimed.meta?.changes!==1)return {ok:false,error:'This slot purchase is being processed. Retry shortly.',status:409};
 // Re-read after the claim. Never charge from the stale pre-claim wallet snapshot.
 try{data=await helpers.customerData(env,user.id,user.name);wallet=helpers.normalizeWallet(data.wallet||{})}
 catch{return {ok:false,error:'The wallet could not be verified after reserving the purchase. Retry shortly.',status:503}}
 if(!hasReceipt(wallet,id)){
  if(Number(wallet.balanceSeconds)<SLOT_PRICE_SECONDS){
   await db.prepare("UPDATE cf_permanent_voice_slot_purchases SET state='pending',claim_at=NULL WHERE purchase_id=? AND state='charging'").bind(id).run();
   return {ok:false,error:'Your wallet has insufficient credits. Your purchase is not yet complete.',status:402};
  }
  const credits=SLOT_PRICE_CREDITS;
  wallet.balanceSeconds-=SLOT_PRICE_SECONDS;
  wallet.revision=Math.max(0,Number(wallet.revision)||0)+1;
  wallet.usage.unshift({id:receiptId(id),type:'permanent_voice_slot_purchase',referenceId:id,seconds:SLOT_PRICE_SECONDS,credits,createdAt:now,note:'Permanent voice-cloning slot purchase'});
  wallet.usage=wallet.usage.slice(0,250);
  data.wallet=wallet;
  try{await env.CALLFOCUS_CONFIG.put(`customer:data:${user.id}`,JSON.stringify(data))}
  catch{return {ok:false,error:'Your purchase is pending verification. Do not pay again; retry shortly.',status:503}}
 }
 // Verify a committed receipt before allowing voice creation.
 let confirmed;
 try{confirmed=helpers.normalizeWallet((await helpers.customerData(env,user.id,user.name)).wallet||{})}catch{}
 if(!confirmed||!hasReceipt(confirmed,id))return {ok:false,error:'Your wallet purchase is awaiting confirmation. Retry shortly; do not pay again.',status:503};
 try{await db.prepare("UPDATE cf_permanent_voice_slot_purchases SET state='paid',paid_at=COALESCE(paid_at,?),claim_at=NULL WHERE purchase_id=? AND user_id=? AND state='charging'").bind(new Date().toISOString(),id,user.id).run()}
 catch{return {ok:false,error:'Your credits were recorded, but purchase confirmation is pending. Retry; you will not be charged twice.',status:503}}
 return {ok:true,chargedCredits:SLOT_PRICE_CREDITS,remainingCredits:Math.floor(Math.max(0,Number(confirmed.balanceSeconds))*100/60)};
}
async function customer(req,env,helpers){
 if(!['GET','POST'].includes(req.method))return err('Method not allowed.',405);
 const auth=await helpers.auth(req,env),u=auth?.user||null;
 if(!u)return err('Sign in to view permanent voice-cloning slots.',401);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Bookings are not configured yet.',503)}
 let counts,record,caps,availability;
 try{
  counts=await poolCounts(db);record=await paidRecord(db,await row(db,u.id));
  caps=await capacities(env);availability=await available(db,s,counts,caps);
 }catch{return err('The slot purchase system is not ready. Apply the V16.58 SQL migration.',503)}
 if(req.method==='GET'){
  let availableCredits=null;try{availableCredits=await userAvailableCredits(env,u,helpers)}catch{}
  return j({...publicView(s,totalReserved(counts),record,availability.remaining),signedIn:true,availableCredits});
 }
 // An interrupted charge can be resumed using its SAME purchase ID. Existing
 // free bookings remain grandfathered and are never charged retroactively.
 if(record){
  if(record.purchase_id&&!record.purchased){
   const settled=await settlePurchase(db,env,u,helpers,record);
   if(!settled.ok)return err(settled.error,settled.status);
   record=await paidRecord(db,await row(db,u.id));
  }
  return j({...publicView(s,totalReserved(counts),record,availability.remaining),alreadyBooked:true,chargedCredits:0});
 }
 if(!s.enabled)return err('Voice-slot purchases are currently closed.',403);
 if(bookingPhase(s)!=='open')return err('Slot purchases have not opened yet or have closed.',403);
 if(s.forceFull||availability.remaining<=0)return err(s.fullMessage,409);
 const credits=await userAvailableCredits(env,u,helpers).catch(()=>null);
 if(credits===null)return err('Could not verify your wallet balance.',503);
 if(credits<SLOT_PRICE_CREDITS)return err(`Buying a permanent voice slot costs ${SLOT_PRICE_CREDITS} credits. Your current balance is ${credits}.`,402);
 const banned=await db.prepare('SELECT 1 AS blocked FROM cf_permanent_voice_release_audit WHERE user_id=? AND release_id=? LIMIT 1').bind(u.id,s.releaseId).first();
 if(banned)return err('Your previous reservation was released by Admin. This release is reserved for other customers.',409);
 try{
  let booked=null,created=false;
  const now=new Date().toISOString();
  for(const pool of POOLS){
   if(freeInPool(caps[pool],counts[pool])<=0)continue;
   const purchaseId=crypto.randomUUID();
   const out=await db.batch([
    db.prepare(`INSERT INTO cf_permanent_voice_slots(user_id,booked_at,state,updated_at,provider_pool,release_id,purchase_id)
      SELECT ?,?,'booked',?,?,?,? WHERE
      (SELECT COUNT(*) FROM cf_permanent_voice_slots) < ?
      AND (SELECT COUNT(*) FROM cf_permanent_voice_slots WHERE release_id=?) < ?
      AND (SELECT COUNT(*) FROM cf_permanent_voice_slots WHERE provider_pool=?) < ?
      AND NOT EXISTS(SELECT 1 FROM cf_permanent_voice_release_audit WHERE user_id=? AND release_id=?)
      ON CONFLICT(user_id) DO NOTHING`).bind(u.id,now,now,pool,s.releaseId,purchaseId,s.slotLimit,s.releaseId,s.releaseQuota,pool,
       Math.floor(caps[pool].voiceSlotLimit-Math.max(0,caps[pool].voiceSlotsUsed-counts[pool].created)),u.id,s.releaseId),
    db.prepare(`INSERT INTO cf_permanent_voice_slot_purchases(purchase_id,user_id,price_credits,price_seconds,state,created_at)
      SELECT purchase_id,user_id,?,?, 'pending',? FROM cf_permanent_voice_slots WHERE user_id=? AND purchase_id=?`)
      .bind(SLOT_PRICE_CREDITS,SLOT_PRICE_SECONDS,now,u.id,purchaseId)
   ]);
   booked=await row(db,u.id);
   if(booked){created=Number(out?.[0]?.meta?.changes||0)===1;break}
  }
  if(!booked)return err(s.fullMessage,409);
  const settled=await settlePurchase(db,env,u,helpers,booked);
  if(!settled.ok)return err(settled.error,settled.status);
  const paid=await paidRecord(db,await row(db,u.id));
  const freshCounts=await poolCounts(db),freshAvailable=await available(db,s,freshCounts,caps);
  return j({...publicView(s,totalReserved(freshCounts),paid,freshAvailable.remaining),alreadyBooked:!created,chargedCredits:created?SLOT_PRICE_CREDITS:0,remainingCredits:settled.remainingCredits??null});
 }catch(e){console.warn('Voice slot purchase failed',String(e?.message||e).slice(0,150));return err('Could not confirm slot purchase. Check your balance and retry; a pending purchase is never charged twice.',503)}
}
async function admin(req,env){
 if(!['GET','POST'].includes(req.method))return err('Method not allowed.',405);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Voice-slot storage is not ready.',503)}
 let counts;try{counts=await poolCounts(db)}catch{return err('Run the V16.57 D1 migration first.',503)}
 if(req.method==='GET'){
  const caps=await capacities(env);
  // New accounts automatically receive only eligible, uncreated reservations
  // stranded by a full earlier account. Saved voices never migrate.
  let moved=[];try{moved=await rebalance(db,env,counts,caps)}catch(e){console.warn('Pending rebalance deferred',String(e))}
  const a=await available(db,s,counts,caps);
  const rows=await db.prepare('SELECT user_id,booked_at,state,voice_name,created_at,provider_pool FROM cf_permanent_voice_slots ORDER BY booked_at DESC LIMIT 100').all();
  const pools=Object.fromEntries(POOLS.map((pool,i)=>[pool,{...caps[pool],index:i+1,reserved:counts[pool].reserved,created:counts[pool].created,pending:counts[pool].pending,available:freeInPool(caps[pool],counts[pool]),apiKeyConfigured:!!poolKey(env,pool),agentConfigured:!!poolAgent(env,pool)}]));
  const purchaseStats=await db.prepare("SELECT COUNT(*) AS n FROM cf_permanent_voice_slot_purchases WHERE state='paid'").first();
  const eligibleLegacy=await db.prepare("SELECT COUNT(*) AS n FROM cf_permanent_voice_slots WHERE purchase_id IS NULL AND voice_id IS NULL AND state IN ('booked','failed')").first();
  return j({ok:true,paidPurchases:Number(purchaseStats?.n||0),settings:s,booked:totalReserved(counts),created:totalCreated(counts),pending:totalReserved(counts)-totalCreated(counts),reclaimable:Number(eligibleLegacy?.n||0),total:s.slotLimit,remaining:a.remaining,physicalAvailable:physicalFree(caps,counts),releaseQuota:s.releaseQuota||0,releaseUsed:a.issued,pools,rebalanceCount:moved.length,bookings:rows.results||[]});
 }
 let body;try{body=await req.json()}catch{return err('Invalid settings JSON.')}
 let next;try{next=parseSettings(body,s)}catch(e){return err(e.message)}
 if(next.slotLimit<totalReserved(counts))return err(`There are ${totalReserved(counts)} reserved voices. The total capacity cannot be lower.`,409);
 try{await env.CALLFOCUS_CONFIG.put(SLOT_KEY,JSON.stringify(next));return j({ok:true,settings:next})}catch{return err('Could not save settings.',503)}
}
// Admin-only explicit reclaim and release. Reservations are reclaimed only if needed
// for requested fresh availability. Every removed booking is written to an audit table
// in the SAME atomic D1 batch; READY/CREATING/VERIFICATION records are untouchable.
async function releasePending(req,env){
 if(req.method!=='POST')return err('Method not allowed.',405);
 let x;try{x=await req.json()}catch{return err('Invalid JSON.',400)}
 const wanted=Number(x?.count);
 if(!Number.isSafeInteger(wanted)||wanted<1||wanted>1000)return err('Enter between 1 and 1000 slots.',400);
 if(x?.confirm!=='RELEASE UNCREATED SLOTS')return err('Type RELEASE UNCREATED SLOTS to confirm.',400);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Slot settings unavailable.',503)}
 if(wanted>s.slotLimit)return err('The release cannot exceed your total slots.',409);
 const counts=await poolCounts(db),caps=await capacities(env);
 const free=Math.max(0,Math.min(s.slotLimit-totalReserved(counts),physicalFree(caps,counts)));
 const required=Math.max(0,wanted-free);
 // Reclaim only from an account whose reported physical and monthly creation
 // capacity can actually be returned to the public. Canceling a booking on an
 // already physically exhausted account would create a misleading free slot.
 const reclaimableByPool=Object.fromEntries(POOLS.map(pool=>{
  const cap=caps[pool],count=counts[pool];
  if(!cap?.ok||cap.canClone===false)return [pool,0];
  const spare=Math.max(0,Math.floor(cap.voiceSlotLimit-Math.max(cap.voiceSlotsUsed,count.created)));
  const monthly=cap.monthlyCreationLimit==null?Infinity:Math.max(0,Math.floor(Number(cap.monthlyCreationLimit)-Number(cap.monthlyCreationUsed||0)));
  return [pool,Math.min(count.pending,spare,monthly)];
 }));
 const legacyRows=await db.prepare("SELECT provider_pool,COUNT(*) AS n FROM cf_permanent_voice_slots WHERE purchase_id IS NULL AND voice_id IS NULL AND state IN ('booked','failed') GROUP BY provider_pool").all();
 const legacy=Object.fromEntries((legacyRows.results||[]).map(r=>[r.provider_pool,Number(r.n||0)]));
 for(const pool of POOLS)reclaimableByPool[pool]=Math.min(reclaimableByPool[pool],legacy[pool]||0);
 const reclaimable=Object.values(reclaimableByPool).reduce((n,v)=>n+v,0);
 if(required>reclaimable)return err(`Only ${reclaimable} legacy unpaid reservations can be safely reclaimed. Purchased slots are protected from cancellation without a refund. ${free} slots are unassigned.`,409);
 const releaseId=crypto.randomUUID(),now=new Date().toISOString();
 let reclaimed=0;
 if(required){
  const candidates=[];
  for(const pool of POOLS){
   const limit=reclaimableByPool[pool];if(limit<=0)continue;
   const rows=await db.prepare(`SELECT user_id,booked_at FROM cf_permanent_voice_slots
      WHERE provider_pool=? AND voice_id IS NULL AND purchase_id IS NULL AND state IN ('booked','failed') ORDER BY booked_at ASC LIMIT ?`).bind(pool,limit).all();
   candidates.push(...(rows.results||[]));
  }
  const ids=candidates.sort((a,b)=>a.booked_at.localeCompare(b.booked_at)).slice(0,required).map(r=>r.user_id);
  if(ids.length!==required)return err('Reservation counts changed. Refresh before releasing.',409);
  const sqlIds=ids.map(()=>'?').join(',');
  // These statements execute as one transaction in D1. No saved voice or
  // in-flight creation can be removed because of the guarded DELETE.
  const statements=[
   db.prepare(`INSERT INTO cf_permanent_voice_release_audit (release_id,user_id,booked_at,provider_pool,released_at)
    SELECT ?,user_id,booked_at,provider_pool,? FROM cf_permanent_voice_slots
    WHERE user_id IN (${sqlIds}) AND state IN ('booked','failed') AND voice_id IS NULL AND purchase_id IS NULL`).bind(releaseId,now,...ids),
   db.prepare(`DELETE FROM cf_permanent_voice_slots WHERE user_id IN (${sqlIds}) AND state IN ('booked','failed') AND voice_id IS NULL AND purchase_id IS NULL`).bind(...ids)
  ];
  let out;try{out=await db.batch(statements)}catch{return err('Release failed; no customer records should have changed. Refresh and check.',503)}
  reclaimed=Number(out?.[1]?.meta?.changes||0);
  if(reclaimed!==required)return err('The release was interrupted by changing reservations. Refresh before continuing.',503);
 }
 const next={...s,releaseId,releaseQuota:wanted,revision:Number(s.revision||0)+1};
 try{await env.CALLFOCUS_CONFIG.put(SLOT_KEY,JSON.stringify(next))}catch{return err(`Reclaimed ${reclaimed} bookings but could not publish slots. Keep bookings paused and retry the release.`,503)}
 return j({ok:true,requested:wanted,reclaimed,opened:wanted,message:`${wanted} slots released. ${reclaimed} idle bookings were reclaimed; no saved voices or active creations were removed.`});
}

// Admin-only repair for customers still waiting to create a voice. Never move an existing voice,
// an ambiguous in-progress create, or a verification-required voice. Provider credentials do not
// travel with customers: their D1 provider_pool determines future voice creation and calls.
async function reassignPending(req,env){
 if(req.method!=='POST')return err('Method not allowed.',405);
 let data;try{data=await req.json()}catch{return err('Invalid JSON.',400)}
 const from=String(data?.from||'');const to=String(data?.to||'tertiary');
 const wanted=Number(data?.count??1);
 if(!['primary','secondary'].includes(from)||to!=='tertiary')return err('Select Account 1 or Account 2 as the source and Account 3 as the destination.');
 if(!Number.isSafeInteger(wanted)||wanted<1||wanted>30)return err('Select 1–30 pending reservations to move.');
 if(data?.confirm!=='MOVE UNCREATED VOICES')return err('Type the exact confirmation phrase to move pending reservations.');
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Voice-slot storage is unavailable.',503)}
 if(!s.tertiaryEnabled)return err('Enable Account 3 before moving reservations.',409);
 if(!poolKey(env,'tertiary')||!poolAgent(env,'tertiary'))return err('Account 3 API key and Agent ID must be configured first.',409);
 const cap=await subscription(env,'tertiary');if(!cap.ok)return err('Account 3 must pass its subscription check before reassignment.',409);
 const before=await poolCounts(db);
 // Account 3 needs room for BOTH its already reserved uncreated voices and any moved bookings.
 // Never shift customers into another full provider, even though new BOOKINGS remain admin-controlled.
 const providerFree=Math.max(0,cap.voiceSlotLimit-cap.voiceSlotsUsed-(before.tertiary.reserved-before.tertiary.created));
 const operationsFree=cap.monthlyCreationLimit==null?Infinity:Math.max(0,Number(cap.monthlyCreationLimit)-Number(cap.monthlyCreationUsed||0));
 const maxMoves=Math.min(wanted,providerFree,operationsFree);
 if(!cap.canClone||!Number.isFinite(cap.voiceSlotLimit)||cap.voiceSlotLimit<1||maxMoves<1)return err('Account 3 has no verified free voice-storage and monthly creation capacity for reassignment. Keep existing reservations until capacity is available.',409);
 const moves=[];
 for(let i=0;i<maxMoves;i++){
  let result;
  try{result=await db.prepare(`UPDATE cf_permanent_voice_slots SET provider_pool='tertiary', updated_at=?
   WHERE user_id=(SELECT user_id FROM cf_permanent_voice_slots
    WHERE provider_pool=? AND state IN ('booked','failed') AND voice_id IS NULL
    ORDER BY booked_at ASC LIMIT 1)
   AND provider_pool=? AND state IN ('booked','failed') AND voice_id IS NULL
   AND (SELECT COUNT(*) FROM cf_permanent_voice_slots WHERE provider_pool='tertiary') < ?
   RETURNING user_id`).bind(new Date().toISOString(),from,from,cap.voiceSlotLimit).first()}
  catch(e){return err('Reassignment stopped after '+moves.length+' changes. Verify the D1 migration and refresh.',503)}
  if(!result?.user_id)break;
  moves.push(result.user_id);
 }
 return j({ok:true,moved:moves.length,requested:wanted,from,to,remainingToMove:wanted-moves.length,
  message:moves.length?'Pending reservations were reassigned. Saved voices and active creations were not touched.':'No eligible pending reservations or available Account 3 booking quota.'});
}

async function createSavedVoice(req,env,helpers){
 if(req.method!=='POST')return err('Method not allowed.',405);
 const a=await helpers.auth(req,env);if(!a)return err('Sign in first.',401);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Saved voice storage is not ready.',503)}
 // Existing reservations remain eligible even after new bookings close.
 // The independent voice-cloning availability switch in _worker.js gates creation.
 if(s.eventDate&&new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())<s.eventDate)return err(`Permanent voice creation opens on ${s.eventDate}. Your booking stays reserved.`,409);
 
 const counts=await poolCounts(db),caps=await capacities(env);
 try{await rebalance(db,env,counts,caps)}catch{}
 const v=await row(db,a.user.id);if(!v)return err('Buy a permanent voice-cloning slot first.',403);
 if(v.purchase_id){const payment=await purchase(db,v.purchase_id);if(!payment||payment.state!=='paid')return err('Complete the 1,000-credit slot purchase before creating your voice. Open the slot popup and tap Complete purchase.',402);}
 const pool=v.provider_pool||'primary';const key=poolKey(env,pool);
 if(!key)return err('The voice account assigned to your booking has not been configured. Your reservation is safe.',503);
 if(v.state==='ready')return err('You already have a permanently saved voice.',409);
 if(v.state==='creating'||v.state==='verification')return err('Your voice is being processed or needs verification. Contact support before retrying.',409);
 let form;try{form=await req.formData()}catch{return err('Upload your own voice recording.')}
 const f=form.get('audio'),name=safeText(form.get('name'),65);
 if(!name||name.length<2)return err('Enter a voice name.');
 if(form.get('consent')!=='yes'||form.get('adult')!=='yes')return err('Only adults may clone their own voices with explicit consent.',400);
 if(!(f instanceof File)||f.size<2000||f.size>16*1024*1024)return err('Upload a recording between 2 KB and 16 MB.');
 // Lightweight file signature validation rather than trusting extensions.
 const head=new Uint8Array(await f.slice(0,16).arrayBuffer());const text=(start,len)=>String.fromCharCode(...head.slice(start,start+len));
 if(!(text(0,4)==='RIFF'||text(0,4)==='OggS'||text(0,4)==='fLaC'||text(0,3)==='ID3'||text(4,4)==='ftyp'||head[0]===0x1a&&head[1]===0x45||head[0]===0xff))return err('Unsupported voice recording format. Upload MP3, M4A, WEBM, WAV, OGG or FLAC.');
 // Provider physical storage and monthly operation limits apply ONLY to creating a saved voice, not to booking a place.
 let cap;try{const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(10000)});if(!r.ok)return err('Could not check the assigned voice-account subscription (HTTP '+r.status+'). Cloning is paused.',503);cap=await r.json()}catch{return err('Unable to verify your assigned voice-account capacity. Try again later.',503)}
 if(cap.can_use_instant_voice_cloning===false)return err('Your subscribed provider plan does not allow instant voice cloning.',409);
 if(Number.isFinite(Number(cap.voice_limit))&&Number.isFinite(Number(cap.voice_slots_used))&&Number(cap.voice_slots_used)>=Number(cap.voice_limit))return err('All provider voice-storage slots are occupied.',409);
 if(cap.max_voice_add_edits!=null&&Number(cap.voice_add_edit_counter)>=Number(cap.max_voice_add_edits))return err('The monthly provider voice-creation allowance is exhausted.',409);
 const token=crypto.randomUUID(),now=new Date().toISOString();
 try{const claim=await db.prepare("UPDATE cf_permanent_voice_slots SET state='creating',create_token=?,create_started_at=?,updated_at=? WHERE user_id=? AND state IN ('booked','failed') AND voice_id IS NULL AND provider_pool=?").bind(token,now,now,a.user.id,pool).run();if(!claim.meta?.changes)return err('This voice slot is already being prepared.',409)}catch{return err('Could not reserve your voice creation attempt.',503)}
 const providerForm=new FormData();providerForm.set('name',`CF-${a.user.id.slice(0,12)} ${name}`);providerForm.append('files',f,'voice-sample.'+String(f.name||'sample.mp3').split('.').pop().slice(0,5));
 let response;try{response=await fetch('https://api.elevenlabs.io/v1/voices/add',{method:'POST',headers:{'xi-api-key':key},body:providerForm,signal:AbortSignal.timeout(65000)})}catch{
  // Ambiguous timeout: do not retry automatically; provider might have created a clone.
  return err('The provider did not confirm creation. Your booking is safe; contact CallFocus before attempting again to avoid duplicate voice creation.',502);
 }
 if(!response.ok){let reason='Voice creation was rejected. Your booking remains reserved.';try{const b=await response.json();reason=safeText(b?.detail?.message||b?.error?.message||reason,260)}catch{}
   if(response.status<500)await db.prepare("UPDATE cf_permanent_voice_slots SET state='failed',create_token=NULL,updated_at=? WHERE user_id=? AND create_token=? AND state='creating'").bind(new Date().toISOString(),a.user.id,token).run();
   // HTTP 5xx is ambiguous: keep the creation claim and require manual reconciliation to prevent a duplicate provider clone.
   return err(response.status>=500?'Voice provider returned an uncertain error. Your reservation is safe. Contact CallFocus before retrying.':reason,response.status===429?429:response.status>=500?502:409);
 }
 const data=await response.json().catch(()=>({})),voiceId=String(data.voice_id||'');
 if(!/^[A-Za-z0-9_-]{8,120}$/.test(voiceId))return err('Provider response could not be verified. Your booking remains reserved for review.',502);
 const state=data.requires_verification===true?'verification':'ready';
 try{await db.prepare("UPDATE cf_permanent_voice_slots SET state=?,voice_id=?,voice_name=?,create_token=NULL,created_at=?,updated_at=? WHERE user_id=? AND create_token=? AND state='creating'").bind(state,voiceId,name,new Date().toISOString(),new Date().toISOString(),a.user.id,token).run()}
 catch{return err('Voice was created but the saved record needs administrator recovery. Do not retry.',503)}
 return j({ok:true,state,voiceName:name,hasSavedVoice:state==='ready',message:state==='ready'?'Your permanent voice is saved and ready for future calls and voice notes.':'Your voice requires additional provider verification. It will not be recreated automatically.'});
}

export {createSavedVoice,settings as slotSettings,customer as slotCustomer,admin as slotAdmin,slotVoiceForUser,publicView as slotPublicView,sql as slotDB,row as slotRow,userAvailableCredits,reassignPending,releasePending};
