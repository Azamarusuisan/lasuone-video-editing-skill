// Research capture only: Hermes Chrome, an explicitly isolated signed-out target.
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const record = process.env.LASUONE_RECORD === '1';
const start = Number(process.env.LASUONE_START || 0);
const duration = Number(process.env.LASUONE_DURATION || 30);
assert(Number.isFinite(start) && start>=0 && Number.isFinite(duration) && duration>0 && duration<=45);
const validId = id => /^[\w-]{11}$/.test(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const parseTime = text => text.split(':').reduce((n, x) => n * 60 + Number(x), 0);
if (process.argv[2] === 'check') {
  assert(validId('luauPBapN7U')); assert(!validId('../anything'));
  assert.equal(parseTime('1:02:03'), 3723);
  console.log('capture input checks passed'); process.exit(0);
}
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find(t => t.type === 'page' && t.url === 'https://www.youtube.com/watch?v=luauPBapN7U');
if (!target) throw Error('Open the designated isolated research watch tab first.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {ws.onopen=resolve;ws.onerror=reject;});
let serial=0;
const pending = new Map();
ws.onmessage = event => {const msg=JSON.parse(event.data); const p=pending.get(msg.id); if(p){clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}};
const call = (method, params={}) => new Promise((resolve,reject) => {const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},45000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
const evaluate = async expression => {const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
try {
  const info=await call('Target.getTargetInfo');
  if(!info.targetInfo.browserContextId) throw Error('Refusing default browser context');
  if(await evaluate('!!document.querySelector("#avatar-btn")')) throw Error('Signed-in page: user takeover required');
  const ids=process.argv.slice(2);
  for(const id of ids){
    assert(validId(id), 'Invalid video id');
    const dir=root+'evidence/videos/'+id;
    await mkdir(dir,{recursive:true});
    const recordBase='segment_'+start+'_'+duration;
    try{await access(dir+'/'+(record?recordBase+'.json':'capture.json'));console.log(id+' already captured');continue;}catch{}
    if(!(await evaluate('location.href')).includes('v='+id)) await call('Page.navigate',{url:'https://www.youtube.com/watch?v='+id});
    let state;
    for(let i=0;i<100;i++){
      await sleep(1200);
      state=await evaluate(`(() => {const v=document.querySelector('video'),p=document.querySelector('#movie_player');if(v){v.muted=true;if(v.paused)v.play().catch(()=>{});}const skip=document.querySelector('.ytp-skip-ad-button');if(skip)skip.click();return {signedIn:!!document.querySelector('#avatar-btn'),ad:p?.classList.contains('ad-showing'),duration:v?.duration,ready:v?.readyState,playerText:p?.innerText.slice(0,300),title:document.title};})()`);
      if(state.signedIn) throw Error('Signed-in page: user takeover required');
      if(state.ready>=2&&!state.ad&&state.duration>0)break;
      if(i%15===0)console.log(id+' waiting for public playback '+JSON.stringify(state));
    }
    if(!state || state.ad || state.ready<2)throw Error('Playback unavailable for '+id);
    const metadata=await evaluate(`(() => {const v=document.querySelector('video');v.pause();return {title:document.title,duration_s:v.duration,width:v.videoWidth,height:v.videoHeight,description:document.querySelector('#description-inline-expander')?.innerText};})()`);
    if(record){
      console.log(id+' recording '+start+'s + '+duration+'s');
      const segment=await evaluate(`(async()=>{const v=document.querySelector('video');v.pause();if(${start}>=v.duration)throw Error('Start outside video');if(Math.abs(v.currentTime-${start})>.01){v.currentTime=${start};await new Promise(r=>v.addEventListener('seeked',r,{once:true}));}const tracks=v.captureStream().getAudioTracks();if(!tracks.length)throw Error('No audio track');const rec=new MediaRecorder(new MediaStream(tracks),{mimeType:'audio/webm;codecs=opus'}),chunks=[],frames=[];const c=document.createElement('canvas');c.width=64;c.height=36;const ctx=c.getContext('2d',{willReadFrequently:true});let previous=null,active=true;function sample(now,m){ctx.drawImage(v,0,0,64,36);const pixels=ctx.getImageData(0,0,64,36).data;let diff=0;for(let i=0;i<pixels.length;i+=4){if(previous)diff+=Math.abs(pixels[i]-previous[i])+Math.abs(pixels[i+1]-previous[i+1])+Math.abs(pixels[i+2]-previous[i+2]);}frames.push({media_time:m.mediaTime,presented_frames:m.presentedFrames,mean_rgb_difference:previous?diff/(64*36*3):null});previous=pixels;if(active)v.requestVideoFrameCallback(sample);}v.requestVideoFrameCallback(sample);rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();v.playbackRate=1;await v.play();const wall=performance.now();await new Promise(r=>setTimeout(r,${duration*1000}));v.pause();active=false;rec.stop();await done;const blob=new Blob(chunks,{type:'audio/webm'});const data=await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(blob);});return {start_requested:${start},end_s:v.currentTime,wall_elapsed_ms:performance.now()-wall,advertisement_at_end:document.querySelector('#movie_player').classList.contains('ad-showing'),playback_rate:v.playbackRate,frames,audio:data};})()`);
      await writeFile(dir+'/'+recordBase+'.webm',Buffer.from(segment.audio.split(',')[1],'base64'));delete segment.audio;
      await writeFile(dir+'/'+recordBase+'.json',JSON.stringify({video_id:id,source_type:'BROWSER_PLAYBACK_AUDIO_CAPTURE',audio_fidelity:'Browser-decoded stereo mix; not original stems',cut_metric:'Frame difference candidate signal only; camera motion and subtitles may cause false positives',...segment},null,2));
      console.log(id+' SEGMENT SAVED '+start+'-'+segment.end_s.toFixed(3));continue;
    }
    // ponytail: sparse samples describe only observed frames; full-rate scans are required for cut counts.
    const d=metadata.duration_s;
    const times=[0.15,2,5,8,12,16,20,25,29,40,60,90,...[.15,.25,.35,.45,.55,.65,.75,.85,.92].map(f=>Math.round(d*f)),d-30,d-15,d-3].filter((t,i,a)=>t>=0&&t<d&&a.indexOf(t)===i).sort((a,b)=>a-b);
    const frames=[];
    for(const t of times){
      const frame=await evaluate(`(async()=>{const v=document.querySelector('video');v.pause();const t=${t};if(Math.abs(v.currentTime-t)>.02){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{v.removeEventListener('seeked',done);reject(Error('seek timeout'));},15000);function done(){clearTimeout(timer);resolve();}v.addEventListener('seeked',done,{once:true});v.currentTime=t;});}await new Promise(r=>setTimeout(r,180));if(document.querySelector('#movie_player')?.classList.contains('ad-showing'))throw Error('Advertisement');const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return {requested_s:t,time_s:v.currentTime,width:v.videoWidth,height:v.videoHeight,jpeg:c.toDataURL('image/jpeg',.90)};})()`);
      const file='frame_'+String(Math.round(t*1000)).padStart(7,'0')+'.jpg';
      await writeFile(dir+'/'+file,Buffer.from(frame.jpeg.split(',')[1],'base64'));delete frame.jpeg;frames.push({...frame,file});
      if(frames.length%8===0)console.log(id+' frames '+frames.length+'/'+times.length);
    }
    await writeFile(dir+'/capture.json',JSON.stringify({video_id:id,url:'https://www.youtube.com/watch?v='+id,captured_at:new Date().toISOString(),evidence_type:'SPARSE_VISUAL_SAMPLES',full_watch:false,audio_analyzed:false,...metadata,frames},null,2));
    console.log(id+' CAPTURED '+frames.length+' frames, '+Math.round(d)+'s duration');
  }
} finally {ws.close();}
