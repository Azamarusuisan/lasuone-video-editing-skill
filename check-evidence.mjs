// Read-only cross-file checks; passing does not certify visual/audio review.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
const file=p=>path.join(root,p);
const read=p=>JSON.parse(fs.readFileSync(file(p),'utf8'));
const exists=p=>fs.existsSync(file(p));
const nonempty=p=>assert(fs.statSync(file(p)).size>0,p);
const pkg='skill-draft/lasuone-editing';
const manifest=read(pkg+'/references/learning/manifest.json');
assert.equal(manifest.files.length,13);
for(const entry of manifest.files){
  const source=fs.readFileSync(file(entry.source_relative_path)),copy=fs.readFileSync(file(pkg+'/'+entry.path));
  assert(source.equals(copy),entry.path+' differs from root');
  assert.equal(createHash('sha256').update(copy).digest('hex'),entry.sha256,entry.path);
}
const coverage=read('evidence/COVERAGE.json'),snapshot=read(pkg+'/references/snapshot.json');
assert.equal(snapshot.learning.coverage_compiled_at,coverage.compiled_at);
assert.equal(coverage.videos.length,189);
assert.equal(new Set(coverage.videos.map(v=>v.video_id)).size,189);
assert.equal(coverage.full_watch_completed_count,snapshot.learning.full_length_reviewed_video_count);
for(const id of ['R9yghVLgI4s','rUZ__0uKiMA','Z53j2cRj1C8']){
  const dir='evidence/videos/'+id+'/overview/',review=read(dir+'review_progress.json'),capture=read(dir+'capture.json');
  const saved=snapshot.learning.review_progress_auxiliary[id];
  assert.equal(capture.frames.length,review.total_overview_frames);
  assert.equal(saved.reviewed_grid_frames,review.reviewed_frame_count);
  assert.deepEqual(saved.reviewed_nominal_grid_s,review.reviewed_nominal_grid_s);
  assert.equal(saved.continuous_visual_review,review.full_continuous_visual_review);
  assert.equal(saved.direct_audio_review,review.direct_audio_review);
  assert.equal(new Set(review.reviewed_sheet_numbers).size,review.reviewed_sheet_numbers.length);
  const reviewed=review.reviewed_sheet_numbers.flatMap(n=>{
    assert(Number.isInteger(n)&&n>0&&n<=Math.ceil(capture.frames.length/6));
    nonempty(dir+'sheet_'+String(n).padStart(2,'0')+'.jpg');
    return capture.frames.slice((n-1)*6,n*6);
  });
  assert.equal(reviewed.length,review.reviewed_frame_count);
  assert.deepEqual([reviewed[0].time_s,reviewed.at(-1).time_s],review.reviewed_nominal_grid_s);
  for(const frame of reviewed)nonempty(dir+frame.file);
  if('next_sheet' in saved)assert.equal(saved.next_sheet,review.next_sheet);
}
const continuous=read('evidence/CONTINUOUS_INTERVAL_OBSERVATIONS.json');
let eventPoints=0,eventWindows=0,frameCount=0;
for(const interval of continuous.intervals){
  const capture=read(interval.evidence_directory+'capture.json'),frames=capture.frames;
  assert.equal(capture.video_id,interval.video_id);
  assert.equal(frames.length,interval.decoded_frames_visually_reviewed);
  assert.equal(frames[0].time_s,interval.source_pts_first_s);
  assert.equal(frames.at(-1).time_s,interval.source_pts_last_s);
  for(const [index,frame] of frames.entries()){
    assert(Number.isFinite(frame.time_s)&&frame.time_s>=0);
    if(index)assert(frame.time_s>frames[index-1].time_s);
    nonempty(interval.evidence_directory+frame.file);
  }
  for(const event of interval.events){
    if(event.frame_file){
      const frame=frames.find(f=>f.file===event.frame_file);
      assert(frame,'missing event frame: '+event.frame_file);
      assert.equal(frame.time_s,event.time_s,interval.video_id+' event PTS');
      eventPoints++;
    }else{
      assert(Array.isArray(event.time_window_s)&&event.time_window_s.length===2,'missing event point/window');
      const [start,end]=event.time_window_s;
      assert(Number.isFinite(start)&&Number.isFinite(end)&&start<=end);
      for(const time of [start,end])assert(frames.some(f=>f.time_s===time),'event window endpoint missing from capture: '+time);
      eventWindows++;
    }
  }
  frameCount+=frames.length;
}
assert.equal(snapshot.learning.continuous_interval_observations,continuous.intervals.length);
assert.equal(snapshot.learning.continuous_interval_reviewed_frames,frameCount);
const six=read('evidence/videos/6MmoXPWO9Mg/overview_pts/capture.json');
assert.equal(six.frames.filter(f=>f.file).length,76);
assert.deepEqual(six.frames.filter(f=>!f.file),[{requested_s:1140,time_s:null,file:null,status:'NO_FRAME_AT_SOURCE_END'}]);
const live={source:0,scene_scan:0,audio_measurement:0,asr_videos:0,asr_files:0,overview_capture:0,overview_ocr:0};
const missingSource=[],missingScan=[],missingOverview=[];
for(const video of coverage.videos){
  const dir='evidence/videos/'+video.video_id,files=exists(dir)?fs.readdirSync(file(dir)):[];
  const source=files.find(f=>/^source\.(mkv|mp4|webm)$/.test(f));
  if(source){nonempty(dir+'/'+source);live.source++;}else missingSource.push(video.video_id);
  if(files.includes('scene_scan.json')){
    const scan=read(dir+'/scene_scan.json');
    assert.equal(scan.video_id,video.video_id);
    assert.equal(scan.candidate_count,scan.candidates.length);
    live.scene_scan++;
  }else if(source)missingScan.push(video.video_id);
  if(files.includes('full_audio_measurements.json')){read(dir+'/full_audio_measurements.json');live.audio_measurement++;}
  const asrs=files.filter(f=>/^full_audio_asr(?:_no_context)?\.json$/.test(f));
  for(const name of asrs){const asr=read(dir+'/'+name);assert(Array.isArray(asr.transcription)&&asr.transcription.length>0);live.asr_files++;}
  if(asrs.length)live.asr_videos++;
  const overview=['overview','overview_pts'].find(n=>exists(dir+'/'+n+'/capture.json'));
  if(overview){
    read(dir+'/'+overview+'/capture.json');live.overview_capture++;
    if(exists(dir+'/'+overview+'/ocr.json')){read(dir+'/'+overview+'/ocr.json');live.overview_ocr++;}
  }else if(source)missingOverview.push(video.video_id);
}
console.log(JSON.stringify({status:'PASS',checked_at:new Date().toISOString(),package_files_byte_equal:13,
  continuous_intervals:continuous.intervals.length,continuous_frames:frameCount,event_points:eventPoints,event_windows:eventWindows,
  live,missing_source:missingSource,missing_scene_scan_count:missingScan.length,missing_scene_scan_first_10:missingScan.slice(0,10),
  missing_overview_count:missingOverview.length,coverage_saved_scene_scan:coverage.videos.filter(v=>v.full_stream_scene_scan).length,
  coverage_compiled_at:coverage.compiled_at,full_watch_completed_count:coverage.full_watch_completed_count,
  meaning:'File/reference integrity only; ASR accuracy, visual/audio review and production readiness are not certified.'},null,2));
