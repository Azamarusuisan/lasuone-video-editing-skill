// Whole-stream scene-candidate scan plus explicitly sparse visual evidence.
import {readFile,writeFile,readdir,mkdir,access,stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.',import.meta.url));
const ffmpeg='/Users/stork/videos/cloudflareos-hero-loop/node_modules/ffmpeg-static/ffmpeg';
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
const run=(bin,args)=>new Promise((resolve,reject)=>{const p=spawn(bin,args);let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(log):reject(Error(log.slice(-1200))));});
const parseScenes=log=>[...log.matchAll(/pts_time:([\d.]+)\s+lavfi.scene_score=([\d.]+)/g)].map(m=>({time_s:Number(m[1]),score:Number(m[2])}));
const segmentInputArgs=(source,start,end)=>['-ss',String(Math.max(0,start-1)),'-t',String(end-Math.max(0,start-1)+1),'-copyts','-i',source];
const parsePts=log=>{const base=log.match(/config in time_base:\s*(\d+)\/(\d+)/);return [...log.matchAll(/\bn:\s*\d+\s+pts:\s*(\d+)\s+pts_time:([\d.]+)/g)].map(m=>base?Number(m[1])*Number(base[1])/Number(base[2]):Number(m[2]));};
const pointFile=t=>`frame_${String(Math.round(t*1000)).padStart(9,'0')}.jpg`;
const validPointFrame=(frame,t,file,size)=>{assert.equal(frame.file,file);assert.equal(frame.requested_s,t);assert(Number.isFinite(frame.time_s)&&frame.time_s>=t-.001&&frame.time_s<t+1,'Missing/out-of-range source PTS');assert(size>0,'Missing/empty frame');return frame;};
const overviewGrid=(duration,step)=>{assert(Number.isFinite(duration)&&duration>0,'Invalid duration');assert(Number.isFinite(step)&&step>0,'Invalid grid step');return Array.from({length:Math.ceil(duration/step)},(_,i)=>i*step).filter(t=>t<duration);};
class NoFrameAtSourceEnd extends Error{}
const extractPoint=async(source,out,t,persist=false)=>{
  const file=pointFile(t),meta=out+file+'.json';
  if(persist&&await exists(meta))return validPointFrame(JSON.parse(await readFile(meta,'utf8')),t,file,(await stat(out+file)).size);
  const log=await run(ffmpeg,['-hide_banner','-nostats',...segmentInputArgs(source,t,t+.1),'-map','0:v:0','-an','-vf',`select='gte(t,${t})',scale=960:-2,showinfo`,'-frames:v','1','-q:v','3','-y',out+file]);
  const pts=parsePts(log)[0],size=await stat(out+file).then(value=>value.size,error=>{if(error.code==='ENOENT')return 0;throw error;});
  if(pts===undefined&&size===0)throw new NoFrameAtSourceEnd('No decoded frame at source end');
  const frame=validPointFrame({file,requested_s:t,time_s:pts},t,file,size);if(persist)await writeFile(meta,JSON.stringify(frame));return frame;
};
const collectOverview=async(duration,step,getFrame)=>{const frames=[];for(const t of overviewGrid(duration,step)){try{frames.push(await getFrame(t));}catch(error){if(!(error instanceof NoFrameAtSourceEnd)||duration-t>1)throw error;frames.push({requested_s:t,time_s:null,file:null,status:'NO_FRAME_AT_SOURCE_END'});}}return frames;};
if(process.argv.includes('check')){assert.deepEqual(parseScenes('frame:0 pts:30 pts_time:1.001\nlavfi.scene_score=0.302'),[{time_s:1.001,score:Number('0.302')}]);assert.equal(parseScenes('').length,0);assert.deepEqual(segmentInputArgs('source.mkv',12,13),['-ss','11','-t','3','-copyts','-i','source.mkv']);assert.deepEqual(segmentInputArgs('source.mkv',0,1),['-ss','0','-t','2','-copyts','-i','source.mkv']);assert.deepEqual(parsePts('n: 0 pts: 12017 pts_time:12.017'),[12.017]);assert.deepEqual(parsePts('config in time_base: 1/1000\nn: 0 pts: 2694333 pts_time:2694.33'),[2694.333]);assert.deepEqual(parsePts(''),[]);assert.equal(pointFile(1.25),'frame_000001250.jpg');assert.deepEqual(overviewGrid(31,15),[0,15,30]);assert.deepEqual(overviewGrid(30,15),[0,15]);assert.throws(()=>overviewGrid(NaN,15));assert.throws(()=>overviewGrid(30,0));assert.deepEqual(validPointFrame({file:'frame.jpg',requested_s:2,time_s:2.005},2,'frame.jpg',1),{file:'frame.jpg',requested_s:2,time_s:2.005});assert.throws(()=>validPointFrame({file:'wrong.jpg',requested_s:2,time_s:2.005},2,'frame.jpg',1));assert.throws(()=>validPointFrame({file:'frame.jpg',requested_s:2,time_s:3},2,'frame.jpg',1));assert.throws(()=>validPointFrame({file:'frame.jpg',requested_s:2,time_s:2},2,'frame.jpg',0));assert.equal((await collectOverview(3,2,async t=>({file:pointFile(t),requested_s:t,time_s:t}))).length,2);assert.equal((await collectOverview(1,.5,async t=>{if(t===.5)throw new NoFrameAtSourceEnd();return {requested_s:t,time_s:t};}))[1].status,'NO_FRAME_AT_SOURCE_END');await assert.rejects(()=>collectOverview(1,.5,async()=>{throw Error('disk failure');}),/disk failure/);console.log('scene/PTS, sidecar validation, overview completion and bounded input checks passed');process.exit(0);}
const segmentMode=process.argv[2]==='--segment';
const pointsMode=process.argv[2]==='--points';
const ids=segmentMode||pointsMode?[process.argv[3]]:process.argv[2]==='--available'?(await readdir(root+'evidence/videos')).sort((a,b)=>(a==='R9yghVLgI4s'?-1:0)-(b==='R9yghVLgI4s'?-1:0)):process.argv.slice(2);
for(const id of ids){
  assert(/^[\w-]{11}$/.test(id),'Invalid video ID');const dir=root+'evidence/videos/'+id+'/';
  const source=(await readdir(dir)).find(f=>/^source\.(mkv|mp4|webm)$/.test(f));if(!source){console.log(id+' source not ready');continue;}
  if(pointsMode){
    const requested=[...new Set(process.argv.slice(4).map(Number))].sort((a,b)=>a-b);
    assert(requested.length>0&&requested.length<=200&&requested.every(t=>Number.isFinite(t)&&t>=0));
    const out=dir+'points/';await mkdir(out,{recursive:true});
    const capture=await exists(out+'capture.json')?JSON.parse(await readFile(out+'capture.json','utf8')):{video_id:id,evidence_type:'SELECTED_STATIC_POINTS_WITH_SOURCE_PTS',full_watch:false,timestamp_method:'First decoded source frame at or after requested time; source PTS preserved',frames:[]};
    for(const t of requested){
      if(capture.frames.some(f=>f.requested_s===t))continue;
      capture.frames.push(await extractPoint(dir+source,out,t));capture.frames.sort((a,b)=>a.time_s-b.time_s);
      await writeFile(out+'capture.json',JSON.stringify(capture,null,2));
    }
    await run(root+'analyze-frames',[out]);console.log(id+' selected source-PTS points ready: '+capture.frames.length);continue;
  }
  if(segmentMode){
    const start=Number(process.argv[4]),end=Number(process.argv[5]);assert(Number.isFinite(start)&&start>=0&&end>start&&end-start<=10);
    const out=dir+`dense_${start}_${end}/`;await mkdir(out,{recursive:true});
    if(!await exists(out+'capture.json')){
      // Bound the input: an output -to cannot stop decoding after select discards all later frames.
      const log=await run(ffmpeg,['-hide_banner','-nostats',...segmentInputArgs(dir+source,start,end),'-map','0:v:0','-an','-vf',`select='gte(t,${start})*lt(t,${end})',scale=960:-2,showinfo`,'-fps_mode','vfr','-q:v','3','-y',out+'frame_%05d.jpg']);
      const times=parsePts(log);
      const files=(await readdir(out)).filter(f=>/^frame_\d+\.jpg$/.test(f)).sort();assert.equal(files.length,times.length,'Timestamp/frame mismatch');assert(times.length>0&&times[0]>=start-.001);
      await writeFile(out+'capture.json',JSON.stringify({video_id:id,evidence_type:'ALL_DECODED_FRAMES_IN_LOCAL_SEGMENT',full_watch:false,requested_interval_s:[start,end],timestamp_method:'Source PTS preserved and read from FFmpeg showinfo',frames:files.map((file,i)=>({file,time_s:times[i]}))},null,2));
    }
    if(!await exists(out+'ocr.json'))await run(root+'analyze-frames',[out]);console.log(id+' dense frames ready: '+start+'-'+end);continue;
  }
  if(!await exists(dir+'scene_scan.json')){
    console.log(id+' complete-frame scene scan');
    const log=await run(ffmpeg,['-hide_banner','-nostats','-i',dir+source,'-map','0:v:0','-an','-vf',`scale=320:-2,select='gt(scene,0.18)',metadata=print:file=${dir}scene_candidates.txt`,'-fps_mode','vfr','-f','null','-']);
    const dm=log.match(/Duration: (\d+):(\d+):([\d.]+)/);const duration=dm?Number(dm[1])*3600+Number(dm[2])*60+Number(dm[3]):null;
    const candidates=parseScenes(await readFile(dir+'scene_candidates.txt','utf8'));
    await writeFile(dir+'scene_scan.json',JSON.stringify({video_id:id,source,method:'FFmpeg scene score on each decoded source frame, scaled to width 320',threshold:0.18,processed_interval_s:[0,duration],source_duration_s:duration,candidate_count:candidates.length,candidates,confirmed_cut_count:null,full_visual_review:false,limitations:'Camera motion, graphics and flashes can trigger candidates. Same-angle jump cuts and fades can be missed. Candidates are not a measured cut count.'},null,2));
  }
  const scan=JSON.parse(await readFile(dir+'scene_scan.json','utf8'));
  const step=scan.source_duration_s<=180?2:15;
  const legacy=dir+'overview/';
  if(await exists(legacy+'capture.json')){
    if(!await exists(legacy+'ocr.json'))await run(root+'analyze-frames',[legacy]);
    console.log(id+' existing legacy overview retained; reviewer confirmation required');continue;
  }
  const overview=dir+'overview_pts/';await mkdir(overview,{recursive:true});
  if(!await exists(overview+'capture.json')){
    console.log(id+' source-PTS whole-duration overview every '+step+'s');
    // ponytail: periodic input seeks avoid full sequential decode; this remains sparse evidence, not continuous viewing.
    const frames=await collectOverview(scan.source_duration_s,step,t=>extractPoint(dir+source,overview,t,true));
    await writeFile(overview+'capture.json',JSON.stringify({video_id:id,evidence_type:'PERIODIC_WHOLE_DURATION_SAMPLES_WITH_SOURCE_PTS',source_file:source,full_watch:false,sample_step_s:step,requested_grid:'0..<source_duration_s',timestamp_method:'First decoded source frame at or after requested_s; source PTS preserved separately as time_s',duration_s:scan.source_duration_s,complete:true,frames},null,2));
  }
  if(!await exists(overview+'ocr.json'))await run(root+'analyze-frames',[overview]);
  console.log(id+' scene evidence and overview ready; reviewer confirmation required');
}
