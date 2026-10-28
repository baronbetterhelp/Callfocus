/* CallFocus V16.45: limited permanent cloned-voice booking. Independent of the original OpenAI engine. */
const SLOT_KEY='callfocus:permanent-voice:settings:v1';
const DEF={enabled:false,popupEnabled:false,forceFull:false,slotLimit:30,minimumCredits:1000,primaryLimit:30,secondaryLimit:30,secondaryEnabled:false,eventDate:'',bookingOpensAt:'',bookingClosesAt:'',headline:'Limited permanent voice cloning slots',message:'Book one of our limited permanent voice slots. Once your voice is created, it is saved for your future cloned calls and voice notes.',fullMessage:'All permanent voice cloning slots are filled. Join our Telegram channel to be the first to know when the next slots open.',telegramUrl:'https://t.me/callfocus',revision:1};
const j=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const err=(text,status=400)=>j({ok:false,error:text},status);
const sql=env=>{if(!env.CALLFOCUS_WALLET_DB?.prepare)throw Error('VOICE_SLOTS_D1_NOT_CONFIGURED');return env.CALLFOCUS_WALLET_DB};
async function settings(env){if(!env.CALLFOCUS_CONFIG)throw Error('VOICE_SETTINGS_KV_UNAVAILABLE');const s=await env.CALLFOCUS_CONFIG.get(SLOT_KEY,{type:'json'});return {...DEF,...(s&&typeof s==='object'?s:{})};}
async function row(db,userId){return db.prepare('SELECT user_id,booked_at,state,voice_id,voice_name,created_at,provider_pool FROM cf_permanent_voice_slots WHERE user_id=?').bind(userId).first()}
async function tally(db){const r=await db.prepare('SELECT COUNT(*) AS n FROM cf_permanent_voice_slots').first();return Number(r?.n||0)}
async function poolCounts(db){const r=await db.prepare("SELECT provider_pool,COUNT(*) n,SUM(CASE WHEN voice_id IS NOT NULL THEN 1 ELSE 0 END) created FROM cf_permanent_voice_slots GROUP BY provider_pool").all();const result={primary:{reserved:0,created:0},secondary:{reserved:0,created:0}};for(const x of (r.results||[])){if(result[x.provider_pool])result[x.provider_pool]={reserved:Number(x.n||0),created:Number(x.created||0)}}return result}
// Only explicitly provisioned, paid accounts may be configured here. Never mix voice IDs across accounts.
const poolKey=(env,pool)=>String(pool==='secondary'?env.ELEVENLABS_PERMANENT_2_API_KEY||'':env.ELEVENLABS_PERMANENT_API_KEY||'').trim();
const poolAgent=(env,pool)=>String(pool==='secondary'?env.ELEVENLABS_PERMANENT_2_AGENT_ID||'':env.ELEVENLABS_PERMANENT_AGENT_ID||'').trim();
const poolLimit=(s,pool)=>pool==='secondary'?s.secondaryLimit:s.primaryLimit;
const effectiveLimit=s=>Math.min(s.slotLimit,s.primaryLimit+(s.secondaryEnabled?s.secondaryLimit:0));
async function subscription(env,pool){const key=poolKey(env,pool);if(!key)return {ok:false,error:'API key not configured.'};try{const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(10000)});if(!r.ok)return {ok:false,error:'Subscription check failed (HTTP '+r.status+').'};const d=await r.json();return {ok:true,tier:String(d.tier||''),voiceSlotsUsed:Number(d.voice_slots_used??0),voiceSlotLimit:Number(d.voice_limit??0),monthlyCreationUsed:d.voice_add_edit_counter??null,monthlyCreationLimit:d.max_voice_add_edits??null,canClone:d.can_use_instant_voice_cloning!==false,status:d.status||''}}catch{return {ok:false,error:'Subscription service unavailable.'}}}
function availablePoolSlots(s,counts,pool,provider){if(!provider?.ok||!provider.canClone||['canceled','expired'].includes(provider.status))return 0;const c=counts[pool];const providerFree=Math.max(0,provider.voiceSlotLimit-provider.voiceSlotsUsed-(c.reserved-c.created));return Math.max(0,Math.min(poolLimit(s,pool)-c.reserved,providerFree));}
function reservationTotals(s,counts){const cap=effectiveLimit(s);const reserved=counts.primary.reserved+counts.secondary.reserved;return {capacity:cap,reserved,remaining:Math.max(0,cap-reserved)}}
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
 const n=Number(x.slotLimit),minimumCredits=Number(x.minimumCredits),primaryLimit=Number(x.primaryLimit),secondaryLimit=Number(x.secondaryLimit);
 if(!Number.isSafeInteger(n)||n<1||n>160)throw Error('Slot capacity must be between 1 and 160. The subscribed ElevenLabs plan must support that many saved voices.');
 if(!Number.isSafeInteger(primaryLimit)||primaryLimit<1||primaryLimit>160||!Number.isSafeInteger(secondaryLimit)||secondaryLimit<1||secondaryLimit>160)throw Error('Each account quota must be between 1 and 160, and must not exceed its provider subscription.');
 if(typeof x.secondaryEnabled!=='boolean')throw Error('Select whether the second voice account is enabled.');
 if(!Number.isSafeInteger(minimumCredits)||minimumCredits<0||minimumCredits>1000000)throw Error('Minimum available credits must be between 0 and 1,000,000.');
 const eventDate=safeText(x.eventDate,10);if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw Error('Enter a valid event date.');
 const bookingOpensAt=safeText(x.bookingOpensAt,16),bookingClosesAt=safeText(x.bookingClosesAt,16);
 const openMs=bookingDateMs(bookingOpensAt),closeMs=bookingDateMs(bookingClosesAt);
 if(openMs!==null&&closeMs!==null&&closeMs<=openMs)throw Error('Booking closing time must be later than opening time (Nigeria time).');
 const telegramUrl=safeText(x.telegramUrl,300);if(!/^https:\/\/t\.me\/[A-Za-z0-9_+\-/]{3,}$/.test(telegramUrl))throw Error('Provide a valid Telegram channel link (https://t.me/...).');
 for(const k of ['headline','message','fullMessage'])if(!safeText(x[k],k==='headline'?100:350))throw Error('Complete all customer-facing messages.');
 return {...DEF,enabled:x.enabled,popupEnabled:x.popupEnabled,forceFull:x.forceFull,slotLimit:n,primaryLimit,secondaryLimit,secondaryEnabled:x.secondaryEnabled,minimumCredits,eventDate,bookingOpensAt,bookingClosesAt,headline:safeText(x.headline,100),message:safeText(x.message,350),fullMessage:safeText(x.fullMessage,350),telegramUrl,revision:previous.revision+1};
}
function publicView(s,count,record,counts=null){const phase=bookingPhase(s);const capacity=effectiveLimit(s);return {ok:true,enabled:s.enabled,popupEnabled:s.popupEnabled,slotLimit:capacity,booked:count,remaining:Math.max(0,capacity-count),full:s.forceFull===true||count>=capacity,minimumCredits:s.minimumCredits,eventDate:s.eventDate,bookingOpensAt:s.bookingOpensAt||'',bookingClosesAt:s.bookingClosesAt||'',bookingPhase:phase,canBookNow:s.enabled&&phase==='open'&&!s.forceFull&&count<s.slotLimit,headline:s.headline,message:s.message,fullMessage:s.fullMessage,telegramUrl:s.telegramUrl,revision:s.revision,me:record?{state:record.state,bookedAt:record.booked_at,voiceName:record.voice_name||null,hasSavedVoice:record.state==='ready'}:null}}
async function slotVoiceForUser(env,userId){const v=await row(sql(env),userId);return v?.state==='ready'&&/^[A-Za-z0-9_-]{8,120}$/.test(String(v.voice_id||''))?{voiceId:v.voice_id,name:v.voice_name||'My permanent voice',persistent:true,providerPool:v.provider_pool||'primary'}:null}
// CallFocus stores the spendable wallet as seconds. Its shared rate is
// 100 credits per minute, or 0.6 seconds per credit. Booking is free; this
// only checks the customer's CURRENT available credits, including any unused
// starter/referral credits, without deducting or changing wallet balances.
async function userAvailableCredits(env,user,helpers){
 const d=await helpers.customerData(env,user.id,user.name);
 const wallet=helpers.normalizeWallet(d.wallet||{});
 const seconds=Math.max(0,Math.floor(Number(wallet.balanceSeconds)||0));
 return Math.floor(seconds*100/60 + 1e-9);
}
async function customer(req,env,helpers){
 if(!['GET','POST'].includes(req.method))return err('Method not allowed.',405);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Bookings are not configured yet. Ask the administrator to complete the setup.',503)}
 const auth=await helpers.auth(req,env);const u=auth?.user||null;
 let count,record,counts;try{counts=await poolCounts(db);count=counts.primary.reserved+counts.secondary.reserved;record=u?await row(db,u.id):null}catch{return err('The voice-slot database is not ready. Run the included SQL setup first.',503)}
 if(!u)return err('Sign in to view permanent voice-cloning slots.',401);
 if(req.method==='GET'){
  // Show the same server-authoritative, CURRENT available wallet balance on the booking popup.
  // Never use total deposits, historical purchases, or browser-reported credits.
  let availableCredits=null;
  try{availableCredits=await userAvailableCredits(env,u,helpers)}catch{}
  return j({...publicView(s,count,record),signedIn:true,availableCredits});
 }
 if(record)return j({...publicView(s,count,record),alreadyBooked:true});
 if(!s.enabled)return err('Voice-slot booking is currently closed.',403);
 const phase=bookingPhase(s);
 if(phase==='upcoming')return err('Bookings have not opened yet. Check the announced opening time (Nigeria time).',403);
 if(phase==='ended')return err('Bookings have closed for this release. Join our Telegram channel for the next opening.',403);
 if(s.forceFull===true||count>=effectiveLimit(s))return err(s.fullMessage,409);
 let availableCredits;
 try{availableCredits=await userAvailableCredits(env,u,helpers)}
 catch{return err('Could not verify your current CallFocus credit balance. Please try again.',503)}
 if(availableCredits<s.minimumCredits)return err(`Booking requires at least ${s.minimumCredits.toLocaleString('en-NG')} available credits. Your current balance is ${availableCredits.toLocaleString('en-NG')} credits.`,402);
 try{
  if(bookingPhase(s)!=='open')return err('The booking window has closed or has not opened yet.',403);
  const now=new Date().toISOString();
  // One atomic INSERT statement: SQLite/D1 serializes writers, count check prevents overbooking, PK enforces one slot/customer.
  // Account 1 is filled first; account 2 begins ONLY when enabled and its own paid subscription is verified.
  // Provider-free capacity is reduced by already reserved, not-yet-created voices.
  // The database INSERT rechecks pool counts atomically so concurrent bookings cannot claim the last slot twice.
  const primary=await subscription(env,'primary');
  const secondary=s.secondaryEnabled&&poolKey(env,'secondary')&&poolAgent(env,'secondary')?await subscription(env,'secondary'):null;
  // Never silently move customers from a temporarily unreachable primary to the other account.
  // Overflow begins only when primary reservations have filled its configured quota,
  // or when a successful live provider check confirms no further primary capacity.
  const primaryExhausted=counts.primary.reserved>=s.primaryLimit||(primary.ok&&availablePoolSlots(s,counts,'primary',primary)===0);
  if(!primary.ok&&!primaryExhausted)return err('The primary voice account cannot be verified right now. Bookings are temporarily paused.',503);
  const choices=['primary',...(s.secondaryEnabled&&primaryExhausted?['secondary']:[])];
  let booked=null,created=false;
  for(const pool of choices){
    const provider=pool==='primary'?primary:secondary;
    if(!availablePoolSlots(s,counts,pool,provider))continue;
    const result=await db.prepare(`INSERT INTO cf_permanent_voice_slots(user_id,booked_at,state,updated_at,provider_pool)
      SELECT ?,?,'booked',?,? WHERE
        (SELECT COUNT(*) FROM cf_permanent_voice_slots) < ?
        AND (SELECT COUNT(*) FROM cf_permanent_voice_slots WHERE provider_pool=?) < ?
        ON CONFLICT(user_id) DO NOTHING`).bind(u.id,now,now,pool,effectiveLimit(s),pool,Math.min(poolLimit(s,pool),Math.max(0,provider.voiceSlotLimit-provider.voiceSlotsUsed+counts[pool].created))).run();
    booked=await row(db,u.id);if(booked){created=!!result.meta?.changes;break;}
  }
  if(!booked)return err('All currently connected voice-account slots are reserved or unavailable. Join the Telegram channel for the next opening.',409);
  return j({...publicView(s,await tally(db),booked),alreadyBooked:!created});
 }catch(e){console.warn('Voice slot booking failed',String(e.message||e).slice(0,130));return err('Could not reserve a slot. Please try again.',503)}
}
async function admin(req,env){
 if(!['GET','POST'].includes(req.method))return err('Method not allowed.',405);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Voice-slot storage is not ready. Run the D1 migration.',503)}
 let count;try{count=await tally(db)}catch{return err('Voice-slot table is missing. Run permanent-voice-slots.sql in the callfocus-wallet D1 database.',503)}
 if(req.method==='GET'){
  const rows=await db.prepare('SELECT user_id,booked_at,state,voice_name,created_at,provider_pool FROM cf_permanent_voice_slots ORDER BY booked_at DESC LIMIT 100').all();
  const counts=await poolCounts(db);
  const primary=await subscription(env,'primary');
  const secondary=await subscription(env,'secondary');
  const provider={apiKeyConfigured:!!poolKey(env,'primary'),agentConfigured:!!poolAgent(env,'primary'),connected:primary.ok,...(primary.ok?{tier:primary.tier,voiceSlotsUsed:primary.voiceSlotsUsed,voiceSlotLimit:primary.voiceSlotLimit,monthlyCreationUsed:primary.monthlyCreationUsed,monthlyCreationLimit:primary.monthlyCreationLimit}:{error:primary.error})};
  const pools={primary:{...primary,apiKeyConfigured:!!poolKey(env,'primary'),agentConfigured:!!poolAgent(env,'primary'),reserved:counts.primary.reserved,created:counts.primary.created,quota:s.primaryLimit,remaining:availablePoolSlots(s,counts,'primary',primary)},secondary:{...secondary,apiKeyConfigured:!!poolKey(env,'secondary'),agentConfigured:!!poolAgent(env,'secondary'),enabled:s.secondaryEnabled,reserved:counts.secondary.reserved,created:counts.secondary.created,quota:s.secondaryLimit,remaining:s.secondaryEnabled?availablePoolSlots(s,counts,'secondary',secondary):0}};
  return j({ok:true,settings:s,booked:count,remaining:Math.max(0,effectiveLimit(s)-count),effectiveLimit:effectiveLimit(s),provider,pools,bookings:rows.results||[]});
 }
 let body;try{body=await req.json()}catch{return err('Invalid settings JSON.')}
 let next;try{next=parseSettings(body,s)}catch(e){return err(e.message)}
 const counts=await poolCounts(db);
 if(next.slotLimit<count||effectiveLimit(next)<count)return err(`You have ${count} occupied reservations. Total capacity cannot be reduced below that number.`,409);
 if(next.primaryLimit<counts.primary.reserved||next.secondaryLimit<counts.secondary.reserved)return err('An account quota cannot be reduced below the number of reservations already assigned to that account.',409);
 if(!next.secondaryEnabled&&counts.secondary.reserved>0)return err('Account 2 already has reservations. It must remain enabled so these customers are not stranded.',409);
 if(next.secondaryEnabled){if(!poolKey(env,'secondary')||!poolAgent(env,'secondary'))return err('Set both encrypted Account 2 API key and agent ID before enabling overflow.',409);
 const cap=await subscription(env,'secondary');if(!cap.ok||!cap.canClone||cap.voiceSlotLimit<next.secondaryLimit)return err('Account 2 has not passed subscription verification, or its provider slot limit is below the configured quota.',409)}
 try{await env.CALLFOCUS_CONFIG.put(SLOT_KEY,JSON.stringify(next));return j({ok:true,settings:next,booked:count,remaining:Math.max(0,effectiveLimit(next)-count)})}catch{return err('Could not save settings.',503)}
}

async function createSavedVoice(req,env,helpers){
 if(req.method!=='POST')return err('Method not allowed.',405);
 const a=await helpers.auth(req,env);if(!a)return err('Sign in first.',401);
 let db,s;try{db=sql(env);s=await settings(env)}catch{return err('Saved voice storage is not ready.',503)}
 // Existing reservations remain eligible even after new bookings close.
 // The independent voice-cloning availability switch in _worker.js gates creation.
 if(s.eventDate&&new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())<s.eventDate)return err(`Permanent voice creation opens on ${s.eventDate}. Your booking stays reserved.`,409);
 
 const v=await row(db,a.user.id);if(!v)return err('Book a permanent voice-cloning slot first.',403);
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
 // Enforce provider physical voice capacity and monthly add/edit allowance before claiming booking.
 let cap;try{const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(10000)});if(!r.ok)return err('Could not check the assigned voice-account subscription (HTTP '+r.status+'). Cloning is paused.',503);cap=await r.json()}catch{return err('Unable to verify your assigned voice-account capacity. Try again later.',503)}
 if(cap.can_use_instant_voice_cloning===false)return err('Your subscribed provider plan does not allow instant voice cloning.',409);
 if(Number.isFinite(Number(cap.voice_limit))&&Number.isFinite(Number(cap.voice_slots_used))&&Number(cap.voice_slots_used)>=Number(cap.voice_limit))return err('All provider voice-storage slots are occupied.',409);
 if(cap.max_voice_add_edits!=null&&Number(cap.voice_add_edit_counter)>=Number(cap.max_voice_add_edits))return err('The monthly provider voice-creation allowance is exhausted.',409);
 const token=crypto.randomUUID(),now=new Date().toISOString();
 try{const claim=await db.prepare("UPDATE cf_permanent_voice_slots SET state='creating',create_token=?,create_started_at=?,updated_at=? WHERE user_id=? AND state IN ('booked','failed') AND voice_id IS NULL").bind(token,now,now,a.user.id).run();if(!claim.meta?.changes)return err('This voice slot is already being prepared.',409)}catch{return err('Could not reserve your voice creation attempt.',503)}
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

export {createSavedVoice,settings as slotSettings,customer as slotCustomer,admin as slotAdmin,slotVoiceForUser,publicView as slotPublicView,sql as slotDB,row as slotRow,userAvailableCredits};
