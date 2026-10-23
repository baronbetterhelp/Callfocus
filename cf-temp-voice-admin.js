/* CallFocus V16.34. Protected, deliberately initiated removal of previous customer voice library. */
(()=>{'use strict';
 const button=document.getElementById('cfTempVoicePurge');
 const status=document.getElementById('cfTempVoicePurgeStatus');
 if(!button||!status)return;
 const adminToken=()=>localStorage.getItem('callfocus_admin_session_v158')||sessionStorage.getItem('callfocus_admin_key')||'';
 button.addEventListener('click',async()=>{
   if(!window.confirm('Permanently delete EVERY saved cloned voice made through CallFocus? Customers will no longer be able to select those voices. This cannot be undone.'))return;
   const confirmation=window.prompt('To permanently delete historical customer clones, type DELETE ALL CALLFOCUS VOICES');
   if(confirmation!=='DELETE ALL CALLFOCUS VOICES'){status.textContent='No voices were deleted. Confirmation cancelled.';return}
   button.disabled=true;
   let cursor='',pages=0,deleted=0,scanned=0,failed=0;
   try{
    do{
     const response=await fetch('/api/admin/elevenlabs/purge',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CallFocus-Admin-Key':adminToken()},body:JSON.stringify({confirm:confirmation,cursor})});
     const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Cleanup failed (${response.status})`);
     pages++;deleted+=Number(data.deleted||0);failed+=Number(data.failed||0);scanned+=Number(data.scanned||0);
     status.textContent=`Cleanup running: ${scanned} customer records scanned, ${deleted} provider voices deleted${failed?', '+failed+' pending retry':''}.`;
     cursor=data.done?'':String(data.cursor||'');
     if(!data.done&&!cursor)throw Error('Cleanup could not continue because the server did not return a page cursor.');
     if(pages>500)throw Error('Cleanup paused after 500 pages. Contact support.');
    }while(cursor);
    status.textContent=`Cleanup finished. ${deleted} former customer voices deleted. ${failed} deletions need another retry. No unrelated workspace voices were targeted.`;
   }catch(error){status.textContent=`Cleanup stopped after ${deleted} successful deletions: ${String(error?.message||error)}. Retry to handle remaining records.`}
   finally{button.disabled=false}
 });
})();
