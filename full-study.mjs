// Public research copies only. No authentication, cookies, or signed URL logs.
import {readFile,writeFile,mkdir,readdir,statfs} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.',import.meta.url));
const valid=id=>/^[\w-]{11}$/.test(id);
const priority=['R9yghVLgI4s','rUZ__0uKiMA','Z53j2cRj1C8','N2ecdYXYaXw'];
const readList=async type=>(await readFile(root+`evidence/all_public_${type}.jsonl`,'utf8')).trim().split('\n').map(JSON.parse);
const videos=[...(await readList('videos')).map(x=>({...x,format:'LONGFORM'})),...(await readList('shorts')).map(x=>({...x,format:'SHORTS'}))];
assert(videos.every(x=>valid(x.id)));assert.equal(new Set(videos.map(x=>x.id)).size,videos.length);
if(process.argv.includes('check')){assert(valid('R9yghVLgI4s'));assert(!valid('../bad'));assert.equal(videos.length,189);console.log('189 unique public IDs validated');process.exit(0);}
const selected=videos.filter(x=>process.argv[2]==='shorts'?x.format==='SHORTS':x.format==='LONGFORM').sort((a,b)=>(priority.includes(a.id)?priority.indexOf(a.id):-1e-4)-(priority.includes(b.id)?priority.indexOf(b.id):-1e-4));
selected.sort((a,b)=>Number(priority.includes(b.id))-Number(priority.includes(a.id)));
await writeFile(root+'evidence/VIDEO_CENSUS.json',JSON.stringify({channel_id:'UCKZYs8oGxqj_63DOCp1kCNQ',listed_at:new Date().toISOString(),total_unique:videos.length,longform_count:59,shorts_count:130,streams_tab:'NOT_PRESENT',longform_listing_duration_s:videos.filter(x=>x.format==='LONGFORM').reduce((s,x)=>s+x.duration,0),shorts_listing_duration_s:null,listing_is_not_watch_completion:true,videos},null,2));
for(const v of selected){
  const dir=root+'evidence/videos/'+v.id;await mkdir(dir,{recursive:true});
  const files=await readdir(dir);
  if(files.some(f=>/^source\.(mkv|mp4|webm)$/.test(f))){console.log(v.id+' source already present');continue;}
  if(files.some(f=>f.endsWith('.part'))){console.log(v.id+' partial download exists; leaving existing worker untouched');continue;}
  const disk=await statfs(root);if(disk.bavail*disk.bsize<40*1024**3)throw Error('Stopped: less than 40 GiB free');
  console.log(v.id+' downloading research copy: '+v.title);
  const args=['--ignore-config','--no-cache-dir','--no-playlist','--no-progress','--no-warnings','--socket-timeout','30','--retries','3','--fragment-retries','3','--js-runtimes','node:/Users/stork/.local/bin/node','--ffmpeg-location','/Users/stork/videos/cloudflareos-hero-loop/node_modules/ffmpeg-static/ffmpeg','-f','best[height<=720]/bestvideo[height<=720]+bestaudio','--merge-output-format','mkv','--print-to-file','after_move:%(.{id,title,duration,width,height,fps,upload_date,view_count,chapters,channel_id})j',dir+'/source_metadata.jsonl','-o',dir+'/source.%(ext)s','https://www.youtube.com/watch?v='+v.id];
  const result=await new Promise(resolve=>{const p=spawn(root+'.venv/bin/yt-dlp',args,{stdio:'ignore'});p.on('error',()=>resolve('PROCESS_ERROR'));p.on('exit',code=>resolve(code));});
  await writeFile(dir+'/download_status.json',JSON.stringify({video_id:v.id,status:result===0?'DOWNLOADED_NOT_YET_FULLY_REVIEWED':'DOWNLOAD_FAILED',exit_code:result,reuse_rights:'UNKNOWN',research_only:true,full_watch:false,updated_at:new Date().toISOString()},null,2));
  console.log(v.id+' download '+(result===0?'complete (not watch completion)':'failed; continuing other public items'));
}
