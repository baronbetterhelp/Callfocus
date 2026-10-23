/* CallFocus V16.33 — browser-local audio identification and WAV conversion. */
(()=>{'use strict';
 const types={mp3:'audio/mpeg',m4a:'audio/mp4',webm:'audio/webm',wav:'audio/wav',ogg:'audio/ogg',flac:'audio/flac',aac:'audio/aac'};
 const ascii=(bytes,start,length)=>String.fromCharCode(...bytes.slice(start,start+length));
 function signature(bytes){
   if(ascii(bytes,4,4)==='ftyp')return 'm4a';
   if(bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return 'webm';
   if(ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WAVE')return 'wav';
   if(ascii(bytes,0,4)==='OggS')return 'ogg';
   if(ascii(bytes,0,4)==='fLaC')return 'flac';
   if(ascii(bytes,0,3)==='ID3')return 'mp3';
   if(bytes[0]===0xff&&(bytes[1]&0xf6)===0xf0)return 'aac';
   if(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)return 'mp3';
   return null;
 }
 async function prepare(file){
   if(!file||!file.size)return null;
   const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
   const ext=signature(bytes);
   if(!ext)return null;
   const normalized=new File([file],`voice-upload.${ext}`,{type:types[ext],lastModified:Date.now()});
   return {file:normalized,format:ext.toUpperCase()};
 }
 function header(dv,size,rate){
   const put=(offset,text)=>{for(let i=0;i<text.length;i++)dv.setUint8(offset+i,text.charCodeAt(i))};
   put(0,'RIFF');dv.setUint32(4,size+36,true);put(8,'WAVE');put(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
   dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);put(36,'data');dv.setUint32(40,size,true);
 }
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 async function convert(file,onProgress=()=>{}){
   const AudioCtor=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtor)throw new Error('Audio conversion is not supported on this browser. Please record a sample instead.');
   if(!file||file.size<1)throw new Error('Select a recording first.');
   if(file.size>40*1024*1024)throw new Error('This file is too large to convert on your phone. Choose a shorter recording (under 40 MB).');
   let ctx,buffer;
   try{
     onProgress(5,'Reading audio…');
     ctx=new AudioCtor();
     const source=await file.arrayBuffer();
     onProgress(20,'Decoding audio…');
     buffer=await ctx.decodeAudioData(source);
     if(!Number.isFinite(buffer.duration)||buffer.duration<1)throw new Error('No usable recording was found.');
     if(buffer.duration>240)throw new Error('Choose an audio sample of up to 4 minutes for conversion.');
     const rate=24000,frames=Math.ceil(buffer.duration*rate),size=frames*2;
     if(size+44>16*1024*1024)throw new Error('The converted file would exceed the voice-upload limit. Choose a shorter sample.');
     const result=new ArrayBuffer(size+44),dv=new DataView(result);header(dv,size,rate);
     const channels=Array.from({length:Math.min(buffer.numberOfChannels,2)},(_,i)=>buffer.getChannelData(i));
     const srcRate=buffer.sampleRate,srcCount=buffer.length;
     onProgress(26,'Converting to WAV…');
     for(let start=0;start<frames;start+=24000){
       const end=Math.min(start+24000,frames);
       for(let i=start;i<end;i++){
         const pos=i*srcRate/rate,idx=Math.min(srcCount-1,Math.floor(pos)),after=Math.min(srcCount-1,idx+1),fraction=pos-idx;
         let amplitude=0;
         for(const channel of channels)amplitude+=channel[idx]*(1-fraction)+channel[after]*fraction;
         amplitude=Math.max(-1,Math.min(1,amplitude/channels.length));
         dv.setInt16(44+i*2,Math.round(amplitude<0?amplitude*32768:amplitude*32767),true);
       }
       onProgress(26+Math.round(72*end/frames),'Converting to WAV…');
       if(end<frames)await pause();
     }
     onProgress(100,'Conversion complete.');
     return new File([result],'voice-upload.wav',{type:'audio/wav',lastModified:Date.now()});
   }catch(err){
     if(/no usable|too large|exceed|Choose|Select|not supported/i.test(String(err?.message||'')))throw err;
     throw new Error('This audio could not be decoded by your browser. Try a different recording, export it as MP3/M4A, or use Record sample.');
   }finally{try{await ctx?.close()}catch{}}
 }
 window.CallFocusAudioConvert=Object.freeze({prepare,convert,signature});
})();
