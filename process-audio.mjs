import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('./evidence/videos/',import.meta.url));
const ffmpeg='/Users/stork/videos/cloudflareos-hero-loop/node_modules/ffmpeg-static/ffmpeg';
const whisper='/Users/stork/.cache/hyperframes/whisper/whisper.cpp/build/bin/whisper-cli';
const model='/Users/stork/.cache/hyperframes/whisper/models/ggml-large-v3-turbo.bin';
const asrTarget=(base,noContext)=>({output:base+(noContext?'_asr_no_context':'_asr'),args:noContext?['-mc','0']:[]});
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
const run=(program,args)=>new Promise((resolve,reject)=>{const child=spawn(program,args);let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error(program+' failed: '+out.slice(-1000))));});
const loudness=log=>{const tail=log.slice(log.lastIndexOf('Summary:'));const n=p=>{const m=tail.match(p);return m?Number(m[1]):null;};return {integrated_lufs:n(/I:\s+(-?[\d.]+) LUFS/),loudness_range_lu:n(/LRA:\s+([\d.]+) LU/),true_peak_dbfs:n(/Peak:\s+(-?[\d.]+) dBFS/)};};
if(process.argv.includes('check')){assert.deepEqual(loudness('noise I: 10 LUFS Summary: I: -17.4 LUFS LRA: 3.3 LU Peak: -1.7 dBFS'),{integrated_lufs:-17.4,loudness_range_lu:3.3,true_peak_dbfs:-1.7});assert.equal(loudness('unknown').integrated_lufs,null);assert.deepEqual(asrTarget('full_audio',true),{output:'full_audio_asr_no_context',args:['-mc','0']});assert.deepEqual(asrTarget('full_audio',false),{output:'full_audio_asr',args:[]});console.log('audio parser and separate ASR candidate checks passed');process.exit(0);}
const requested=process.argv.slice(2).filter(x=>/^[\w-]{11}$/.test(x));
for(const id of (await readdir(root)).sort((a,b)=>(a==='R9yghVLgI4s'?-1:0)-(b==='R9yghVLgI4s'?-1:0))){
  if(requested.length&&!requested.includes(id))continue;
  const dir=root+id+'/';
  if(process.argv.includes('--full')){
    const source=(await readdir(dir)).find(f=>/^source\.(mkv|mp4|webm)$/.test(f));if(!source)continue;
    const base=dir+'full_audio';
    const asr=asrTarget(base,process.argv.includes('--no-context'));
    if(!await exists(base+'_measurements.json')){
      console.log(id+' measuring complete decoded audio stream');
      const log=await run(ffmpeg,['-hide_banner','-nostats','-i',dir+source,'-map','0:a:0','-af','ebur128=peak=true:framelog=verbose,silencedetect=noise=-35dB:d=0.3','-ar','16000','-ac','1','-y',base+'.wav']);
      const starts=[...log.matchAll(/silence_start: ([\d.]+)/g)].map(m=>Number(m[1]));
      const ends=[...log.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map(m=>({end_s:Number(m[1]),duration_s:Number(m[2])}));
      const match=log.match(/Duration: (\d+):(\d+):([\d.]+)/);const length=match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):null;
      await writeFile(base+'_measurements.json',JSON.stringify({video_id:id,scope:'ENTIRE_DOWNLOADED_YOUTUBE_DECODED_MIX',duration_s:length,processed_interval_s:[0,length],...loudness(log),silence_threshold_db:-35,silence_min_s:0.3,silence_starts_s:starts,silence_ends:ends,original_master_lufs:null,original_stem_levels:null,full_manual_listening:false,bgm_genre:null,se_identification:null,warning:'Silencedetect measures the mixed track, not speech pauses. No claims about source EQ/compression or isolated BGM levels.'},null,2));
    }
    if(process.argv.includes('--asr')&&!await exists(asr.output+'.json')){console.log(id+' full ASR (unverified)');await run(whisper,['-m',model,'-f',base+'.wav','-l','ja',...asr.args,'-oj','-of',asr.output]);}
    console.log(id+' full audio machine analysis complete; manual review pending');continue;
  }
  for(const file of (await readdir(dir)).filter(f=>/^segment_\d+_\d+\.webm$/.test(f))){
    const base=dir+file.slice(0,-5);
    const asr=asrTarget(base,process.argv.includes('--no-context'));
    if(!await exists(base+'_measurements.json')){
      const log=await run(ffmpeg,['-hide_banner','-nostats','-i',base+'.webm','-af','ebur128=peak=true:framelog=verbose','-f','null','-']);
      const tail=log.slice(log.lastIndexOf('Summary:'));
      const measured=loudness(log);
      const segment=JSON.parse(await readFile(base+'.json','utf8'));
      const gaps=segment.frames.slice(1).map((f,i)=>f.media_time-segment.frames[i].media_time);
      const ordered=[...gaps].sort((a,b)=>a-b);
      const candidates=segment.frames.filter(f=>f.mean_rgb_difference>25).map(f=>({time_s:f.media_time,mean_rgb_difference:f.mean_rgb_difference}));
      await writeFile(base+'_measurements.json',JSON.stringify({video_id:id,source:file,scope:'SAMPLED_BROWSER_DECODED_MIX_ONLY',original_video_integrated_lufs:null,original_stem_levels:null,sample_integrated_lufs:measured.integrated_lufs,sample_loudness_range_lu:measured.loudness_range_lu,sample_true_peak_dbfs:measured.true_peak_dbfs,rendered_frames:segment.frames.length,median_frame_interval_s:ordered[Math.floor(ordered.length/2)]??null,max_frame_gap_s:gaps.length?Math.max(...gaps):null,scene_change_candidates:candidates,confirmed_cut_count:null,summary:tail},null,2));
    }
    if(process.argv.includes('--asr')&&!await exists(asr.output+'.json')){
      if(!await exists(base+'.wav'))await run(ffmpeg,['-hide_banner','-loglevel','error','-i',base+'.webm','-ar','16000','-ac','1',base+'.wav']);
      await run(whisper,['-m',model,'-f',base+'.wav','-l','ja',...asr.args,'-oj','-of',asr.output]);
    }
    console.log(id+' '+file+' measured'+(await exists(asr.output+'.json')?' and transcribed (unverified ASR)':''));
  }
}
