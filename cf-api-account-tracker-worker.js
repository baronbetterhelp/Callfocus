// CallFocus V16.80 — admin-only subscription calendar and provider usage monitor.
// Read-only provider requests. Never exposes, stores, or changes provider credentials.
const API_ACCOUNT_IDS = Array.from({length:6}, (_,i)=>`el-${i+1}`);
const nowISO=()=>new Date().toISOString();
const asText=(v,n=180)=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n);
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const bad=(message,status=400)=>reply({ok:false,error:message},status);
const dateOK=(v)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00.000Z'))&&new Date(v+'T00:00:00.000Z').toISOString().slice(0,10)===v;
function price(v){const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=10000000&&/^\d+(?:\.\d{1,2})?$/.test(String(v))?n:null}
const dbFor=env=>env.CALLFOCUS_WALLET_DB;
async function prepare(env){const db=dbFor(env);if(!db)throw Error('CallFocus D1 wallet binding is unavailable.');
  await db.prepare(`CREATE TABLE IF NOT EXISTS cf_api_account_tracker (
    id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    billing_amount REAL NOT NULL DEFAULT 0,
    billing_currency TEXT NOT NULL DEFAULT 'USD',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    next_renewal TEXT,
    auto_renew INTEGER NOT NULL DEFAULT 0,
    manual_balance REAL,
    balance_unit TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  // Assign the six accounts stable IDs, independently of booking assignment or provider metadata.
  const stamp=nowISO();for(let i=1;i<=6;i++){
    await db.prepare(`INSERT OR IGNORE INTO cf_api_account_tracker
      (id,provider,label,billing_amount,billing_currency,billing_cycle,created_at,updated_at)
      VALUES (?,?,?,0,'USD','monthly',?,?)`).bind(`el-${i}`,'ElevenLabs',`ElevenLabs Account ${i}`,stamp,stamp).run();
  }
  return db;
}
function getKey(env,index){const variable=index===1?'ELEVENLABS_PERMANENT_API_KEY':`ELEVENLABS_PERMANENT_${index}_API_KEY`;return String(env[variable]||'').trim()}
function count(v){return Number.isSafeInteger(v)&&v>=0?v:null}
async function providerUsage(env,index){const key=getKey(env,index);if(!key)return {ok:false,error:'API key not configured in Cloudflare',checkedAt:nowISO()};
  try{
    const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key,'Accept':'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!response.ok)return {ok:false,error:`Provider subscription API returned HTTP ${response.status}`,checkedAt:nowISO()};
    const d=await response.json();if(!d||typeof d!=='object')throw Error('Invalid response');
    const used=count(d.character_count),limit=count(d.character_limit);
    if(used===null||limit===null)return {ok:false,error:'Provider did not return a usable balance.',checkedAt:nowISO()};
    const slotsUsed=count(d.voice_slots_used),slotsLimit=count(d.voice_limit);
    const operationsUsed=count(d.voice_add_edit_counter),operationsLimit=count(d.max_voice_add_edits);
    const reset=count(d.next_character_count_reset_unix);
    const amount=count(d.next_invoice?.amount_due_cents);
    return {ok:true,checkedAt:nowISO(),tier:asText(d.tier,40),status:asText(d.status,40),
      creditsUsed:used,creditsLimit:limit,creditsRemaining:used===null||limit===null?null:Math.max(0,limit-used),
      voiceSlotsUsed:slotsUsed,voiceSlotsLimit:slotsLimit,voiceCreationUsed:operationsUsed,voiceCreationLimit:operationsLimit,
      creditResetAt:reset&&reset>0?new Date(reset*1000).toISOString():null,
      nextInvoiceAmount:amount===null?null:amount/100,nextInvoiceCurrency:asText(d.currency||'USD',5).toUpperCase(),
      hasOpenInvoices:d.has_open_invoices===true,cloningAllowed:d.can_use_instant_voice_cloning!==false};
  }catch{return {ok:false,error:'Provider did not respond. Retry Refresh All.',checkedAt:nowISO()};}
}
function out(row){return {id:row.id,provider:row.provider,label:row.label,billingAmount:Number(row.billing_amount)||0,billingCurrency:row.billing_currency,billingCycle:row.billing_cycle,
  nextRenewal:row.next_renewal||'',autoRenew:row.auto_renew===1,manualBalance:row.manual_balance==null?null:Number(row.manual_balance),balanceUnit:row.balance_unit||'',notes:row.notes||'',updatedAt:row.updated_at};}
function cycleNext(value,cycle){const d=new Date(value+'T12:00:00.000Z');if(!Number.isFinite(+d))return null;const inc={monthly:1,quarterly:3,annual:12}[cycle];if(!inc)return null;
 const origin=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+inc);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(origin,last));return d.toISOString().slice(0,10);}
function readInput(body,existing,creating){
  const id=asText(body.id,85);
  const isOfficial=API_ACCOUNT_IDS.includes(id);
  if(creating&&isOfficial)return {error:'Cannot create a duplicate provider account.'};
  if(!isOfficial&&!/^custom-[a-z0-9-]{8,70}$/.test(id))return {error:'Invalid tracking account ID.'};
  if(!creating&&!existing)return {error:'Account not found.'};
  const label=asText(body.label,80);if(label.length<2)return {error:'Enter a clear account name.'};
  const provider=isOfficial?'ElevenLabs':asText(body.provider,60);
  if(provider.length<2)return {error:'Enter the provider name.'};
  const amount=price(body.billingAmount);if(amount===null)return {error:'Enter a valid amount with up to 2 decimal places.'};
  const currency=asText(body.billingCurrency,5).toUpperCase();if(!/^[A-Z]{3}$/.test(currency))return {error:'Enter a valid 3-letter currency code.'};
  const cycle=asText(body.billingCycle,20);if(!['monthly','quarterly','annual','none'].includes(cycle))return {error:'Select a valid billing cycle.'};
  const next=asText(body.nextRenewal,10);if(next&&!dateOK(next))return {error:'Choose a valid next billing date.'};
  const manual=isOfficial||body.manualBalance===''||body.manualBalance==null?null:price(body.manualBalance);
  if(!isOfficial&&body.manualBalance!==''&&body.manualBalance!=null&&manual===null)return {error:'Enter a valid manually tracked balance.'};
  const unit=isOfficial?'':asText(body.balanceUnit,24);
  const notes=asText(body.notes,500);
  return {id,provider,label,amount,currency,cycle,next,auto:body.autoRenew===true?1:0,manual,unit,notes};
}
async function handleApiAccounts(request,env){
  if(!['GET','POST'].includes(request.method))return bad('Method not allowed.',405);
  let db;try{db=await prepare(env)}catch{return bad('API account tracking database could not be initialized. Check D1 binding.',503)}
  if(request.method==='GET'){
    let records;try{records=(await db.prepare('SELECT * FROM cf_api_account_tracker ORDER BY CASE WHEN id LIKE \'el-%\' THEN 0 ELSE 1 END, id ASC').all()).results||[];}catch{return bad('Could not read the subscription calendar.',503)}
    const providerResults=await Promise.all(API_ACCOUNT_IDS.map((id,index)=>providerUsage(env,index+1)));
    const usage=Object.fromEntries(API_ACCOUNT_IDS.map((id,index)=>[id,providerResults[index]]));
    return reply({ok:true,refreshedAt:nowISO(),accounts:records.map(out),usage});
  }
  let body;try{body=await request.json()}catch{return bad('Invalid request data.')}
  const action=asText(body?.action,20),id=asText(body?.id,85);
  if(!['save','delete','renew'].includes(action))return bad('Invalid account action.');
  let original;try{original=await db.prepare('SELECT * FROM cf_api_account_tracker WHERE id=?').bind(id).first()}catch{return bad('Unable to check account.',503)}
  if(action==='delete'){
    if(API_ACCOUNT_IDS.includes(id))return bad('The six connected ElevenLabs accounts cannot be deleted.',403);
    if(!original)return bad('Account not found.',404);
    await db.prepare('DELETE FROM cf_api_account_tracker WHERE id=?').bind(id).run();return reply({ok:true,deleted:id});
  }
  if(action==='renew'){
    if(!original)return bad('Account not found.',404);
    if(!dateOK(original.next_renewal||''))return bad('Set a valid renewal date first.');
    const next=cycleNext(original.next_renewal,original.billing_cycle);
    if(!next)return bad('Set a monthly, quarterly, or annual cycle first.');
    const result=await db.prepare('UPDATE cf_api_account_tracker SET next_renewal=?,updated_at=? WHERE id=? AND next_renewal=?').bind(next,nowISO(),id,original.next_renewal).run();
    if(!result.meta?.changes)return bad('The renewal date changed elsewhere. Refresh before retrying.',409);
    return reply({ok:true,id,nextRenewal:next,note:'Marked renewed in the tracker only. No external payment was made.'});
  }
  const data=readInput(body,original,!original);if(data.error)return bad(data.error);
  if(!original){
    const total=await db.prepare("SELECT COUNT(*) AS n FROM cf_api_account_tracker WHERE id LIKE 'custom-%'").first();
    if(Number(total?.n||0)>=80)return bad('Maximum of 80 additional tracked accounts reached.',409);
  }
  const stamp=nowISO();
  await db.prepare(`INSERT INTO cf_api_account_tracker
    (id,provider,label,billing_amount,billing_currency,billing_cycle,next_renewal,auto_renew,manual_balance,balance_unit,notes,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
    provider=excluded.provider,label=excluded.label,billing_amount=excluded.billing_amount,billing_currency=excluded.billing_currency,
    billing_cycle=excluded.billing_cycle,next_renewal=excluded.next_renewal,auto_renew=excluded.auto_renew,
    manual_balance=excluded.manual_balance,balance_unit=excluded.balance_unit,notes=excluded.notes,updated_at=excluded.updated_at`)
    .bind(data.id,data.provider,data.label,data.amount,data.currency,data.cycle,data.next||null,data.auto,data.manual,data.unit||null,data.notes,stamp,stamp).run();
  return reply({ok:true,id:data.id});
}
export {handleApiAccounts};
