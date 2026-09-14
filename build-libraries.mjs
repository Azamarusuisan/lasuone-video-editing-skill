// Curated observations, not automatic style inference from arbitrary OCR text.
import {readFile,writeFile,access,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('.',import.meta.url));
const json=async p=>JSON.parse(await readFile(root+p,'utf8'));
const save=async(p,data)=>writeFile(root+p,JSON.stringify(data,null,2)+'\n');
const exists=async p=>{try{await access(root+p);return true;}catch{return false;}};
const asrRepetitions=segments=>{
  const runs=[];let current=null;
  for(const s of segments){
    const text=s.text.trim();
    if(current&&current.text===text){current.count++;current.to_ms=s.offsets.to;}
    else{if(current&&current.text&&current.count>=5)runs.push(current);current={text,count:1,from_ms:s.offsets.from,to_ms:s.offsets.to};}
  }
  if(current&&current.text&&current.count>=5)runs.push(current);
  return runs;
};
const validateOverviewReview=async(id,review,capture,newPts,hasFrame)=>{
  assert.equal(review.video_id,id);assert.equal(review.full_continuous_visual_review,false);assert.equal(review.direct_audio_review,false);
  const frames=capture.frames.filter(frame=>frame.file!==null);
  assert.equal(review.reviewed_frame_count,frames.length);
  if(newPts){
    assert.equal(review.review_type,'MANUAL_REVIEW_OF_PERIODIC_WHOLE_DURATION_SOURCE_PTS_SAMPLES');
    assert.equal(capture.evidence_type,'PERIODIC_WHOLE_DURATION_SAMPLES_WITH_SOURCE_PTS');assert.equal(capture.complete,true);
    assert(Array.isArray(review.reviewed_frames));assert.equal(review.reviewed_frames.length,frames.length);
    for(const frame of frames){const checked=review.reviewed_frames.find(item=>item.file===frame.file);assert(checked);assert.equal(checked.requested_s,frame.requested_s);assert.equal(checked.time_s,frame.time_s);assert(Number.isFinite(frame.requested_s));assert(Number.isFinite(frame.time_s));assert(frame.time_s>=frame.requested_s-.001&&frame.time_s<frame.requested_s+1);assert(await hasFrame(frame.file),'Missing reviewed source-PTS frame');}
  }else{
    assert.equal(review.review_type,'MANUAL_REVIEW_OF_PERIODIC_WHOLE_DURATION_SAMPLES');
    assert.equal(review.timestamp_uncertainty_s,capture.sample_step_s/2);
  }
};
const assertReviewedTimes=(review,times)=>{for(const time of times)assert(review.reviewed_frames.some(frame=>frame.time_s===time),`Missing reviewed source PTS ${time}`);};
assert.equal(asrRepetitions(Array.from({length:5},(_,i)=>({text:'same',offsets:{from:i*100,to:(i+1)*100}})))[0].count,5);
assert.equal(asrRepetitions(Array.from({length:4},(_,i)=>({text:'same',offsets:{from:i*100,to:(i+1)*100}}))).length,0);
assert.deepEqual(asrRepetitions([]),[]);
if(process.argv.includes('check')){const capture={evidence_type:'PERIODIC_WHOLE_DURATION_SAMPLES_WITH_SOURCE_PTS',complete:true,frames:[{file:'a.jpg',requested_s:0,time_s:0},{file:'b.jpg',requested_s:15,time_s:15.01}]},review={video_id:'video',review_type:'MANUAL_REVIEW_OF_PERIODIC_WHOLE_DURATION_SOURCE_PTS_SAMPLES',reviewed_frame_count:2,reviewed_frames:capture.frames,full_continuous_visual_review:false,direct_audio_review:false};await validateOverviewReview('video',review,capture,true,async()=>true);assertReviewedTimes(review,[0,15.01]);assert.throws(()=>assertReviewedTimes(review,[15]));await assert.rejects(()=>validateOverviewReview('video',review,{...capture,complete:false},true,async()=>true));await assert.rejects(()=>validateOverviewReview('video',{...review,reviewed_frames:review.reviewed_frames.slice(1)},capture,true,async()=>true));console.log('ASR repetition and legacy/source-PTS overview review checks passed');process.exit(0);}
const meta={version:'0.1-observed-samples',status:'LEARNING_IN_PROGRESS_NOT_PRODUCTION_READY',channel_id:'UCKZYs8oGxqj_63DOCp1kCNQ',scope:'ALL_189_PUBLIC_VIDEOS_FULL_LENGTH_TARGET',compiled_at:new Date().toISOString()};
// time, observed style, explicitly selected OCR rows. A row can be imperfect OCR.
const observations={
luauPBapN7U:[[8,'W_GOTHIC',[9]],[16,'MINCHO_RED_GLOW',[7]],[40,'WHITE_YELLOW_INLINE',[11]],[60,'W_GOTHIC',[5]],[240,'W_BOLD_MINCHO',[8]],[880,'W_MINCHO_LARGE',[5]]],
'3B5q6DXJNcE':[[5,'ROUND_WHITE',[2]],[12,'W_GOTHIC',[0]],[16,'W_BOLD_MINCHO',[1]],[197,'W_GOTHIC',[6]],[852,'MINCHO_BLUE_GLOW',[1]]],
gpnPgXXrPwk:[[5,'W_MINCHO',[1]],[8,'W_MINCHO',[1]],[12,'W_MINCHO',[1]],[187,'W_BOLD_MINCHO',[1]],[311,'W_MINCHO',[2]]],
AqcEeAHJo8c:[[8,'GOTHIC_RED',[0,1]],[12,'GOTHIC_YELLOW',[2]],[16,'GRADIENT_NAME',[1]],[364,'GOTHIC_GREEN_STROKE',[2]],[1576,'GOTHIC_PURPLE_STROKE',[2]]],
HBiRgIIzSR4:[[5,'B_MINCHO_WHITE_GLOW',[5]],[12,'B_MINCHO_WHITE_GLOW',[1]],[16,'B_MINCHO_WHITE_GLOW',[1]],[484,'GOLD_MONEY',[3]]],
'8LyhF_w2vo8':[[16,'B_MINCHO_WHITE_GLOW',[2]],[264,'POKER_BLUE',[0]],[440,'POKER_BLUE',[17]],[792,'BLUE_GREEN_INFO',[2,3]]],
JogL0RWGkXc:[[16,'B_MINCHO_WHITE_GLOW',[1]],[1045,'POKER_BLUE',[0]]],
k5GIOKkoAc4:[[16,'B_MINCHO_WHITE_GLOW',[1]],[671,'POKER_RED',[0]]],
t0QQnSsbMjY:[[16,'B_MINCHO_WHITE_GLOW',[2]],[597,'POKER_RED',[0]]],
E2KvTtptb7Y:[[294,'POKER_ORANGE',[0]],[412,'POKER_RED',[0]],[530,'POKER_YELLOW',[0]],[766,'POKER_WHITE',[3]]],
j6dt3zbPjfE:[[16,'B_MINCHO_WHITE_GLOW',[3]],[129,'POKER_ORANGE',[0]],[302,'POKER_ORANGE',[0]],[560,'B_MINCHO_WHITE_GLOW',[4]]],
ehJssPk1s7Q:[[2,'W_BOLD_MINCHO',[23]],[8,'W_BOLD_MINCHO',[28]],[147,'W_BOLD_MINCHO',[30]],[635,'YELLOW_BOLD_MINCHO',[38]]],
IlXtl0Hq_As:[[2,'W_BOLD_GOTHIC',[4]],[8,'W_BOLD_GOTHIC',[16]],[16,'W_BOLD_GOTHIC',[13]]],
UE2SSdiQCUM:[[5,'W_GOTHIC',[1]],[188,'MINCHO_PURPLE_GLOW',[1]]],
upFzFNjC1kk:[[2,'WHITE_YELLOW_INLINE',[4]],[5,'WHITE_YELLOW_INLINE',[4]],[12,'W_GOTHIC',[4]],[16,'REPORT_TITLE',[4,5]]],
'ss1IFQqav-8':[[5,'BLACK_YELLOW_GOTHIC',[0]],[8,'BLACK_YELLOW_GOTHIC_RED_WORD',[1]],[12,'BLACK_YELLOW_MINCHO',[0]],[421,'POINT_BOX',[1,2,3]],[757,'W_BOLD_MINCHO',[1]]],
fenmCOzaygE:[[2,'W_GOTHIC',[0]],[5,'W_GOTHIC',[0]],[8,'W_GOTHIC',[0]],[218,'W_GOTHIC',[2]]],
MyVnNIgfBS8:[[5,'W_GOTHIC',[1]],[8,'W_GOTHIC',[1]],[12,'BRUSH_WHITE',[0]],[90,'SLIDE_CAPTION',[27]]],
YINy5jM1p7M:[[5,'W_GOTHIC',[0]],[8,'W_GOTHIC',[0]],[116,'W_GOTHIC',[0,1]]],
ftcX4PmRTLs:[[5,'MINCHO_PURPLE_GLOW',[1]],[8,'MINCHO_PURPLE_GLOW',[2]],[12,'W_MINCHO',[1]],[631,'W_MINCHO',[6]]],
u1Gz_kTbc9g:[[5,'SERIOUS_BAND_MINCHO',[2]],[8,'SERIOUS_BAND_MINCHO',[3]],[12,'SERIOUS_BAND_MINCHO',[2]],[185,'SERIOUS_BAND_MINCHO',[6]]],
'pOUrvKX-9Rs':[[5,'W_BOLD_MINCHO',[0]],[8,'W_BOLD_MINCHO',[0]],[12,'BLACK_YELLOW_GOTHIC',[0]],[16,'YELLOW_MINCHO_RED_SLATE',[0]]],
Q1ydGCm90R8:[[8,'W_MINCHO_LARGE',[1]],[12,'GOTHIC_GREEN_STROKE',[2]],[447,'RED_BLACK_RETORT',[4]]],
'51UBRypjCPw':[[2,'W_MINCHO',[0]],[12,'W_MINCHO',[0]],[90,'EXPERIMENT_FRAME_CAPTION',[3]],[140,'EXPERIMENT_FRAME_CAPTION',[4]]],
'dC-UoCnsa2Q':[[8,'BLACK_YELLOW_GOTHIC',[0]],[16,'BLACK_YELLOW_GOTHIC',[0]],[223,'BLACK_YELLOW_GOTHIC',[0]]],
'Uieu_JqrI-8':[[0.15,'SHORT_YELLOW_CARD',[0,1]],[2,'SHORT_BLACK_BAND',[0]],[8,'SHORT_BLACK_BAND',[0]],[37,'SHORT_BLACK_BAND_YELLOW',[0]],[40,'SHORT_BLACK_BAND',[0]]],
CEf_sKZk6d8:[[2,'SHORT_GREEN_BELOW',[1,2,3]],[12,'SHORT_YELLOW_BELOW',[7,8]],[60,'SHORT_RED_YELLOW_INSIDE',[0,1]],[90,'GOLD_MONEY',[0]]],
vmCVh6ft97I:[[0.15,'SHORT_YELLOW_ON_BLACK',[0]],[12,'SHORT_YELLOW_BELOW',[3]],[51.521,'GOLD_MONEY',[1]]],
gDkJ105rFjo:[[2,'SHORT_WHITE_BLUE',[0,1,2]],[5,'SHORT_BLUE_YELLOW',[0,1]],[8,'SHORT_BLUE_YELLOW_BUBBLE',[0]],[51.521,'SHORT_WHITE_BLUE',[0,1,2,3]]],
WPjhmOMImg8:[[0.15,'SHORT_INTERVIEW_TITLE',[0,1]],[2,'SHORT_BILINGUAL',[2,3]],[12,'SHORT_BILINGUAL',[2,3]],[38,'SHORT_BILINGUAL',[2,3,4,5]]]
};
const samples=[];
for(const [id,points] of Object.entries(observations)){
  const capture=await json(`evidence/videos/${id}/capture.json`),ocr=await json(`evidence/videos/${id}/ocr.json`);
  for(const [time,style,rows] of points){
    const f=ocr.find(f=>Math.abs(f.time_s-time)<.002);assert(f,`${id} missing frame ${time}`);
    const texts=rows.map(i=>{assert(f.text[i],`${id} ${time} row ${i}`);return f.text[i];});
    const frame=capture.frames.find(x=>x.file===f.file);assert(frame);
    const portrait=frame.height>frame.width,W=portrait?1080:1920,H=portrait?1920:1080;
    samples.push({sample_id:`${id}_${Math.round(f.time_s*1000)}`,video_id:id,time_s:f.time_s,reference_video:`https://www.youtube.com/watch?v=${id}&t=${Math.floor(f.time_s)}`,evidence_frame:`evidence/videos/${id}/${f.file}`,observation_type:'VISUALLY_REVIEWED_STATIC_SUBTITLE_SAMPLE',style_id:style,source_resolution:[frame.width,frame.height],reference_canvas:[W,H],text_excerpt_ocr_unverified:texts.map(x=>x.text).join(' ').slice(0,12),ocr_rows:rows,ocr_line_boxes:texts.map(x=>({raw_bbox_xywh_normalized_top_left:x.bbox_xywh_normalized_top_left,raw_bbox_xywh_reference_px:x.bbox_xywh_normalized_top_left.map((v,i)=>Math.round(v*(i%2?H:W))),ocr_confidence:x.ocr_confidence})),nominal_font_size_px:null,glyph_height_px:null,stroke_width_px:null,tracking_px:null,line_spacing_px:null,enter_duration_frames:null,hold_duration_frames:null,exit_duration_frames:null,se_offset_frames:null,confidence:'MEDIUM',geometry_status:'RAW_OCR_BOX_NOT_VERIFIED_GLYPH_OR_FONT_METRICS',warning:'OCR boxes can include background/shadow and overestimate height. Static samples do not measure subtitle density, duration, animation, or cuts.'});
  }
}
assert(samples.length>=100);assert.equal(new Set(samples.map(x=>x.sample_id)).size,samples.length);
samples.find(x=>x.sample_id==='luauPBapN7U_8000').manual_geometry_estimate={basis:'Visual estimate on original 1280x720 frame, scaled 1.5x; no font match',canvas:[1920,1080],glyph_height_px_range:[72,84],glyph_bottom_margin_px_range:[60,75],center_x_px_range:[945,975],dark_edge_px_range:[3,7],confidence:'MEDIUM',nominal_font_size_px:null};
const subtitles={...meta,sample_count:samples.length,video_count:Object.keys(observations).length,unique_display_event_count:null,sampling_note:'Some samples are repeated holds or continuations. Do not treat sample count as independent subtitle-event count. All samples are partial-video evidence.',samples};
await save('SUBTITLE_STYLE_DATABASE.json',subtitles);
const candidateSets={
GOTHIC:['ヒラギノ角ゴシック','游ゴシック','Noto Sans JP'],
MINCHO:['ヒラギノ明朝 ProN','游明朝','Noto Serif JP'],
ROUND:['ヒラギノ丸ゴ ProN','丸フォーク','Zen Maru Gothic'],
BRUSH:['衡山毛筆フォント','青柳衡山フォント','白舟行書'],
LATIN:['Arial','Helvetica','Noto Sans']
};
const styleIds=[...new Set(samples.map(x=>x.style_id))];
const minchos=new Set(['GRADIENT_NAME','REPORT_TITLE']);
const styles=styleIds.map(id=>{const family=id.includes('MINCHO')||minchos.has(id)?'MINCHO':id==='ROUND_WHITE'?'ROUND':id==='BRUSH_WHITE'?'BRUSH':'GOTHIC';return {style_id:id,classification:family,font_family:null,candidates:candidateSets[family],font_exact_match_confidence_percent:0,confidence_meaning:'No exact font has been established. 0 is not a measured probability that all candidates are wrong.',candidate_comparison_status:'UNTESTED_CANDIDATES_NOT_IDENTIFIED_FONTS',weight:null,width_scale:null,tracking_px:null,line_spacing_px:null,nominal_size_px:null,rights_status:'UNKNOWN',production_approved:false,reference_samples:samples.filter(x=>x.style_id===id).map(x=>x.sample_id),family_classification_confidence:'MEDIUM'};});
await save('FONT_STYLE_LIBRARY.json',{...meta,measurement_warning:'Neither OCR line height nor visible glyph height is a nominal font size. Compare あ/さ/き/digits/Latin/punctuation before choosing a licensed substitute.',styles});
const ref=(id,time)=>({video_id:id,time_s:time,url:`https://www.youtube.com/watch?v=${id}&t=${Math.floor(time)}`});
const speaker=(id,name,notes,refs)=>({speaker_id:id,display_name:name,identity_basis:'Explicit on-screen introduction/name or text; not inferred solely from face or voice',notes,subtitle_color:null,voice_identity_verified:false,cut_frequency:null,speech_duration_distribution:null,confidence:'MEDIUM',references:refs});
await save('SPEAKER_STYLE_DATABASE.json',{...meta,profiles:[speaker('LASUONE','ラスワン','長尺の通常白字幕と過去回の黒字白光彩を分ける。WSOPの自分のアクションは赤、Shortsバカラの発話は緑の例。固定の全チャンネル話者色を作らない。',[ref('luauPBapN7U',8),ref('k5GIOKkoAc4',671),ref('CEf_sKZk6d8',2)]),speaker('HAYASHI','林社長','長尺で肩書き紹介。Shortsの明示ラベル付き発話は黄。',[ref('YINy5jM1p7M',2),ref('CEf_sKZk6d8',12),ref('vmCVh6ft97I',12)]),speaker('STAFF_UNRESOLVED','スタッフ','通常字幕の上の小ラベル。別回のスタッフを同一人物と確定しない。',[ref('luauPBapN7U',60)]),speaker('NONO','のの（娘）','人物名タグと買い目の桃色を分けて管理。',[ref('UE2SSdiQCUM',8),ref('UE2SSdiQCUM',440)]),speaker('YUTO','ゆうと（息子）','人物名タグ、自由研究カード、買い目青。未成年への推奨・金銭行動をこちらから付加しない。',[ref('upFzFNjC1kk',12),ref('upFzFNjC1kk',155)]),speaker('BRYN_KENNEY','Bryn Kenney','動画内タイトルに明示。対談の英日字幕は言語別レイヤー。',[ref('WPjhmOMImg8',0.15),ref('WPjhmOMImg8',38)])]});
const audio=[];
for(const id of await readdir(root+'evidence/videos')){for(const file of ['full_audio_measurements.json','segment_0_30_measurements.json'])if(await exists(`evidence/videos/${id}/${file}`))audio.push({video_id:id,evidence_file:`evidence/videos/${id}/${file}`,...await json(`evidence/videos/${id}/${file}`)});}
await save('BGM_RULES.json',{...meta,identification_status:'NOT_IDENTIFIED',limitations:'Full/partial decoded-mix loudness does not identify BGM, its isolated gain, BPM, EQ, compressor, original master, or ducking. No direct auditory genre judgments have been made.',categories:['INTRO','TALK','COMEDY','CASINO','TENSION','BIG_BET','RESULT','WIN','LOSE','SERIOUS','EMOTIONAL','ENDING'].map(category=>({category,track:null,bpm:null,genre:null,instruments:null,energy:null,start_rule:null,end_rule:null,ducking_amount_db:null,fade_in_s:null,fade_out_s:null,references:[],confidence:'UNKNOWN',production_approved:false})),measured_mix_evidence:audio,rights_rule:'Unknown tracks are never reused. Licensed replacements require style evidence and license records.'});
await save('SE_RULES.json',{...meta,identification_status:'NOT_IDENTIFIED',categories:['TELOP','RETORT','SURPRISE','MISTAKE','WIN','LOSE','BIG_BET','MONEY','TRANSITION','LAUGH','UNEASE','COUNT','RESULT'].map(category=>({category,asset:null,trigger:null,do_not_use_conditions:null,offset_frames:null,timing_relation:null,gain_db:null,duration_s:null,bgm_balance:null,references:[],confidence:'UNKNOWN'})),warning:'Do not populate SE timing or genre from silent screenshots or loudness alone.'});
const census=await json('evidence/VIDEO_CENSUS.json');
await save('ASSET_LIBRARY.json',{...meta,future_skill_packaging:{user_requested:true,include_asset_inventory_and_rights:true,research_archive_separate_from_production_assets:true,bundle_unknown_assets_as_production_ready:false,redistribution_permission_required:true,local_relative_paths_and_integrity_checks_required:true,packaging_agent:'gpt-5.6-sol',status:'PLANNED_AFTER_LEARNING_NOT_INSTALLED'},categories:['PEOPLE','CASINO','POKER','BACCARAT','HORSE_RACING','BOAT_RACING','MONEY','COMPANIES','LOCATIONS','HOTELS','NEWS','SOCIAL_MEDIA','LOGOS','MAPS','REACTION','MEMES','BGM','SE','BACKGROUNDS','GRAPHICS','PAST_CHANNEL_CLIPS'],procurement_priority:['USER_PROVIDED','USER_OWNED','PERMITTED_CHANNEL_ARCHIVE','OFFICIAL_DISTRIBUTION','LICENSED','CREATIVE_COMMONS','GENERATED'],rights_status_enum:['USER_OWNED','LICENSED','OFFICIAL_PRESS','CREATIVE_COMMONS','PERMITTED_CHANNEL_ARCHIVE','GENERATED','UNKNOWN'],assets:census.videos.map(v=>({asset_name:v.id,category:'PAST_CHANNEL_CLIPS',title_from_listing:v.title,source:`https://www.youtube.com/watch?v=${v.id}`,rights_status:'UNKNOWN',usage_reason:'編集判断を調べる研究参照。制作利用の許諾ではない。',related_keywords:[],usage_example:'タイムコード付き編集ルールの証拠',aspect_ratio:null,resolution:null,production_approved:false,research_only:true,license_document:null})),generated_assets:[],note:'Official distribution/press availability is not blanket permission; inspect the specific terms. No downloaded clip or character/meme art has been cleared for reuse.'});
const common={...meta,type:'EDIT_DECISION_TEMPLATE_NOT_RENDERABLE_NLE_PROJECT',production_enabled:false,unmeasured_values_must_not_be_filled_with_generic_defaults:true,decision_fields:['SPEAKER','SOURCE_TIMECODE_IN','SOURCE_TIMECODE_OUT','TEXT','EMOTION','IMPORTANCE','SUBTITLE_TYPE','ASSET_NEEDED','BGM','SE','CUT','ZOOM','REFERENCE','CONFIDENCE','REASON'],cut_interval_s:null,punch_in_scale:null,se_gain_db:null,export_preset:null};
const sixMReferenceTimes=[360.026,945.027];assertReviewedTimes(await json('evidence/videos/6MmoXPWO9Mg/overview_pts/review.json'),sixMReferenceTimes);
await save('LONGFORM_TEMPLATE.json',{...common,profile_selection:['LATEST_SAME_FORMAT','LATEST','SAME_SPEAKER','SAME_SERIES','POPULAR','OLDER'],variants:[{id:'RECENT_KOREA_BACCARAT',references:[ref('luauPBapN7U',8),ref('gpnPgXXrPwk',12)],observed_structure:'場所・日付またはスタッフの会話→目的説明→勝負／会話→収支・近況。境界尺は計測待ち。',subtitle_profiles:['W_GOTHIC','W_MINCHO','W_BOLD_MINCHO']},{id:'WSOP_2025',references:[ref('8LyhF_w2vo8',16),ref('j6dt3zbPjfE',129)],observed_structure:'冒頭説明カード→日別進行→大会／ハンド→日常→結果。既存説明文を権利・事実確認なしに複製しない。',subtitle_profiles:['B_MINCHO_WHITE_GLOW','POKER_RED','POKER_BLUE']},{id:'RACE',references:[ref('UE2SSdiQCUM',440),ref('upFzFNjC1kk',155)],observed_structure:'買い目・出走表・人物リアクションPIPとレース画面を分離。'},{id:'SERIOUS',references:[ref('u1Gz_kTbc9g',185),ref('ftcX4PmRTLs',631)],observed_structure:'テーマ・質問と回答を整理し、同フォーマットの字幕を参照。無音や遅いテンポを未計測のまま決めない。'},{id:'INTERVIEW_SERIOUS_Q',references:[{...ref('qSnFoc6bJ7g',75.008),timestamp_basis:'SOURCE_PTS'},{...ref('qSnFoc6bJ7g',135.002),timestamp_basis:'SOURCE_PTS'},{...ref('qSnFoc6bJ7g',240.006),timestamp_basis:'SOURCE_PTS'}],evidence:'evidence/videos/qSnFoc6bJ7g/overview_pts/review.json',observed_structure:'取材の通常会話、重い告白、質問カード、要点強調を別レイヤーとして扱う暫定例。',timing_values_s:null,generalization:'LOW',production_approved:false},{id:'R9_MIXED_NON_HOLDEM_GAMES',references:[{...ref('R9yghVLgI4s',5700),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5},{...ref('R9yghVLgI4s',6135),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5}],evidence:'evidence/videos/R9yghVLgI4s/overview/review_progress.json',observed_structure:'麻雀とカジノ側対戦のUltimate系を対人NLHE／FLHEとは別形式として保持する。',timing_values_s:null,generalization:'LOW',production_approved:false},{id:'LOCATION_INTERVIEW_6M',references:sixMReferenceTimes.map(time=>({...ref('6MmoXPWO9Mg',time),timestamp_basis:'SOURCE_PTS'})),evidence:'evidence/videos/6MmoXPWO9Mg/overview_pts/review.json',observed_structure:'ロケと林さん対談を実戦から分け、実物カードの説明に実戦HUDを付けず、後半の英語白／日本語黄の二層対談を通常Podcast／Shortsから分ける。',timing_values_s:null,translation_verified:false,generalization:'LOW',production_approved:false}],las_vegas_compilation_ids:['R9yghVLgI4s','rUZ__0uKiMA','Z53j2cRj1C8','N2ecdYXYaXw'],compilation_analysis:'PENDING_FULL_LENGTH_REVIEW'});
await save('SHORTS_TEMPLATE.json',{...common,canvas:[1080,1920],safe_zone_px:null,variants:[{id:'HORIZONTAL_BACCARAT_IN_PORTRAIT',references:[ref('CEf_sKZk6d8',12),ref('vmCVh6ft97I',12)],layout:'黒背景、横動画の幅を維持、字幕はその下。',subtitle_profiles:['SHORT_GREEN_BELOW','SHORT_YELLOW_BELOW','GOLD_MONEY']},{id:'COMEDY_DIALOGUE',references:[ref('gDkJ105rFjo',2)],layout:'人物と相手表現、中央大型字幕、1〜4行。キャラクター権利未確認。',subtitle_profiles:['SHORT_WHITE_BLUE','SHORT_BLUE_YELLOW_BUBBLE']},{id:'BILINGUAL_INTERVIEW',references:[ref('WPjhmOMImg8',38)],layout:'上部タイトル／横対談／暗い下段に英語白と日本語黄／拡大ぼかし背景。',subtitle_profiles:['SHORT_BILINGUAL']},{id:'RECENT_BLACK_BAND_EXPERIMENT',references:[ref('Uieu_JqrI-8',8)],layout:'縦実写、下寄り黒帯字幕、冒頭黄カード。1本だけの暫定例。',subtitle_profiles:['SHORT_BLACK_BAND']},{id:'SHORTS_PHYSICAL_BOARD_BACCARAT',references:[ref('N1YKZdA9-CI',0)],evidence:'evidence/videos/N1YKZdA9-CI/overview_pts/review.json',layout:'縦実写で本人が物理的なスケッチブックを提示し、黄系字幕を実写へ直接重ねる暫定例。',generalization:'LOW',production_approved:false},{id:'SHORTS_BACCARAT_MEME_SANDWICH',references:[ref('RXuQ5dOJUOo',0)],evidence:'evidence/videos/RXuQ5dOJUOo/overview_pts/review.json',layout:'切り抜き・複製・キャラクター矩形・文字による演出の間に、白い小型字幕箱付きの縦実写の実戦を置く暫定例。',generalization:'LOW',production_approved:false},{id:'SHORTS_AI_EDITING_PROMO_EXAMPLE',references:[ref('8eiOy6oJ4m4',0)],evidence:'evidence/videos/8eiOy6oJ4m4/overview_pts/review.json',layout:'黒余白を伴う横実写に小型発話字幕、中央説明カード・要点表示・終端CTAを分ける暫定例。',generalization:'LOW',production_approved:false}],hook_rule:'初秒の問い・題材表示は確認。結果先見せやループを全Shorts共通にしない。'});
await save('PODCAST_TEMPLATE.json',{...common,variants:[{episode:1,video_id:'IlXtl0Hq_As',intro:'立ち姿＋ボード、白太ゴシック字幕',main:'2ショット、選定本編サンプルは字幕なし',references:[ref('IlXtl0Hq_As',8),ref('IlXtl0Hq_As',175)]},{episode:2,video_id:'ehJssPk1s7Q',main:'2ショット、白太明朝に黒い縁、黄の強調例',references:[ref('ehJssPk1s7Q',147),ref('ehJssPk1s7Q',635)]}],preferred_provisional_reference:'ehJssPk1s7Q',style_update_confirmed:false,reason:'公開2話だけであり3動画の更新条件未達。字幕密度を平均化しない。',camera_switches_per_min:null,subtitle_coverage_percent:null});
await save('GAMBLING_TENSION_TEMPLATE.json',{...common,states:['BET','WAIT','RESULT','REACTION'],state_durations_s:null,variants:[{game:'BACCARAT',references:[ref('luauPBapN7U',720),ref('HBiRgIIzSR4',290)],fields:['BET_SIDE','BET_AMOUNT','CURRENCY','BANKER_CARDS','PLAYER_CARDS','BANKER_POINT','PLAYER_POINT','WIN_LOSE_PUSH','GROSS_RETURN','NET_PROFIT','BANKROLL'],layout:'BANKER/PLAYERカード・点数は下左右。トーナメントの横長パネルは別レイアウト。'},{game:'POKER',references:[ref('k5GIOKkoAc4',671),ref('E2KvTtptb7Y',412),ref('j6dt3zbPjfE',129)],fields:['ACTIVE_PLAYERS','POSITION','KNOWN_HOLE_CARDS','ACTION','ACTION_AMOUNT','BOARD_BY_STREET','POT','BLINDS_ANTE','WINNER'],layout:'左にプレイヤー、右下にボード・Pot・Blinds、上に機能色付きアクション説明。',visibility_rule:'見えていないカードを事実として補完しない。ポット更新とアクション順は音声／映像の裏取りが必要。'},{game:'POKER_MULTIWAY_AND_LIMIT_BRANCHES',references:[{...ref('R9yghVLgI4s',1492),timestamp_basis:'SOURCE_PTS',evidence:'evidence/videos/R9yghVLgI4s/points/review.json'},{...ref('R9yghVLgI4s',3120),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5},{...ref('R9yghVLgI4s',3525),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5}],evidence:'evidence/videos/R9yghVLgI4s/overview/review_progress.json',fields:['RESULT_BY_PARTICIPANT','HAND_MADE','HAND_WIN_CONFIRMED','BETTING_STRUCTURE','BLINDS','LIMIT'],rules:['CHOPを参加者別に保持する','役成立と勝利確定を分離する','NLHEのBlinds欄とFLHEのLimit欄を混ぜない'],timing_values_s:null,settlement_amounts:null,generalization:'LOW',production_approved:false},{game:'LEGACY_BACCARAT_VERTICAL_HUD',references:[{...ref('Z53j2cRj1C8',12000),timestamp_basis:'SELECTED_POINT_REQUEST'},{...ref('R9yghVLgI4s',360),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5},{...ref('R9yghVLgI4s',2175),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5}],evidence:['evidence/videos/Z53j2cRj1C8/points/review.json','evidence/videos/R9yghVLgI4s/overview/review_progress.json'],layout:'旧バカラのBANKER/PLAYER縦積みHUDには右下例と左下例があり、左右を固定しない。',timing_values_s:null,generalization:'LOW',production_approved:false},{game:'MAHJONG',references:[{...ref('R9yghVLgI4s',5700),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5},{...ref('R9yghVLgI4s',5805),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5}],evidence:'evidence/videos/R9yghVLgI4s/overview/review_progress.json',fields:['SHANTEN','HAND','DORA','POINTS','SETTLEMENT','CURRENCY'],layout:'ポーカー／バカラHUDへ変換せず、麻雀の役・状態・精算を別管理する。',timing_values_s:null,payout:null,generalization:'LOW',production_approved:false},{game:'ULTIMATE_CASINO_TABLE_GAME',references:[{...ref('R9yghVLgI4s',6135),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5},{...ref('R9yghVLgI4s',6270),timestamp_basis:'NOMINAL_OVERVIEW_GRID',timestamp_uncertainty_s:7.5}],evidence:'evidence/videos/R9yghVLgI4s/overview/review_progress.json',fields:['ANTE','BLIND','PLAY','PLAYER_CARDS','BOARD','DEALER_RESULT','PAYOUT'],layout:'カジノ側との対戦を対人NLHE／FLHEのPot・席順・Blinds表示から分離する。',timing_values_s:null,payout:null,generalization:'LOW',production_approved:false}],money_checks:['払戻と純利益を区別','通貨と換算時点を明示','本人と同行者の収支を混ぜない','BET・収支・残高の字幕とグラフィックを照合','後続訂正を元表示へ紐づける','推定・以上などの限定を保持する','矛盾するBET額と損失額は原因確認まで確定しない'],cut_rules_not_yet_learned:['待ちの残尺','結果直前の無音','リアクション保持尺','笑い後の間','ズーム倍率と速度'],broll_policy:'勝負へ集中する場面の情報追加は慎重に判断する（ユーザー指定）。実測頻度は未確定。'});
// Inventory completion and watch completion are deliberately separate.
const coverage=[];
for(const v of census.videos){
  const dir=`evidence/videos/${v.id}/`;const files=await exists(dir)?await readdir(root+dir):[];
  const legacyReview=await exists(dir+'overview/review.json')?await json(dir+'overview/review.json'):null;
  const ptsReview=await exists(dir+'overview_pts/review.json')?await json(dir+'overview_pts/review.json'):null;
  if(legacyReview)await validateOverviewReview(v.id,legacyReview,await json(dir+'overview/capture.json'),false,async()=>true);
  if(ptsReview)await validateOverviewReview(v.id,ptsReview,await json(dir+'overview_pts/capture.json'),true,file=>exists(dir+'overview_pts/'+file));
  const review=ptsReview??legacyReview,reviewDir=ptsReview?'overview_pts':'overview';
  const accessStatus=files.includes('access_status.json')?await json(dir+'access_status.json'):null;
  let asrQuality=null;const asrCandidates=[];
  for(const candidate of ['full_audio_asr.json','full_audio_asr_no_context.json'].filter(f=>files.includes(f))){
    let quality;
    try{
      const transcript=(await json(dir+candidate)).transcription;assert(Array.isArray(transcript));
      const repetitions=asrRepetitions(transcript);
      quality={candidate,status:repetitions.length?'REPETITION_FLAGS_REQUIRE_REVIEW':'UNVERIFIED_NO_LONG_EXACT_REPETITION_FOUND',segment_count:transcript.length,flagged_segment_count:repetitions.reduce((sum,r)=>sum+r.count,0),max_exact_repeat_count:Math.max(0,...repetitions.map(r=>r.count)),verified_transcript:false,repetition_runs:repetitions,warning:'Five identical adjacent segments trigger review, not automatic deletion. Genuine repetition can occur. Absence of flags does not establish ASR accuracy.'};
    }catch{quality={candidate,status:'PARSE_FAILED_OR_INCOMPLETE',verified_transcript:false};}
    const evidence=dir+candidate.replace(/\.json$/,'_quality.json');await save(evidence,quality);
    asrCandidates.push({candidate,status:quality.status,evidence,verified_transcript:false});
    if(candidate==='full_audio_asr.json')asrQuality=quality;
  }
  const points=await exists(dir+'points/review.json')?await json(dir+'points/review.json'):null;
  if(points){
    const capture=await json(dir+'points/capture.json');assert.equal(points.video_id,v.id);assert.equal(points.review_type,'MANUAL_SELECTED_STATIC_POINTS');assert.equal(points.full_continuous_visual_review,false);
    assert.equal(new Set(points.reviewed_requested_s).size,points.reviewed_requested_s.length);
    for(const t of points.reviewed_requested_s){const frame=capture.frames.find(f=>f.requested_s===t);assert(frame&&await exists(dir+'points/'+frame.file),'Missing reviewed point');}
  }
  coverage.push({video_id:v.id,format:v.format,listing_duration_s:v.duration??null,source_downloaded:files.some(f=>/^source\.(mkv|mp4|webm)$/.test(f)),access_status:accessStatus?.status??'NO_ACCESS_RESTRICTION_RECORDED',static_capture:files.includes('capture.json'),subtitle_sample_count:samples.filter(s=>s.video_id===v.id).length,full_stream_scene_scan:files.includes('scene_scan.json'),full_stream_audio_measurement:files.includes('full_audio_measurements.json'),full_asr:asrCandidates.length>0,asr_candidates:asrCandidates,asr_quality:asrQuality?{status:asrQuality.status,evidence:dir+'full_audio_asr_quality.json'}:null,whole_duration_sparse_review:review?{evidence:dir+reviewDir+'/review.json',frame_count:review.reviewed_frame_count,timestamp_basis:ptsReview?'ACTUAL_SOURCE_PTS':'NOMINAL_GRID_WITH_UNCERTAINTY',timestamp_uncertainty_s:ptsReview?null:review.timestamp_uncertainty_s,sample_gaps_unreviewed:true}:null,selected_points_review:points?{evidence:dir+'points/review.json',frame_count:points.reviewed_requested_s.length}:null,full_manual_visual_review:false,full_manual_listening:false,style_review_status:review?'WHOLE_DURATION_SPARSE_SAMPLES_NOT_CONTINUOUS':points?'SELECTED_STATIC_POINTS_NOT_CONTINUOUS':Object.hasOwn(observations,v.id)?'PARTIAL_STATIC_SAMPLES':'NOT_REVIEWED'});
}
await save('evidence/COVERAGE.json',{...meta,full_watch_completed_count:0,definitions:'Download / machine scan / ASR / static samples / continuous audiovisual review are different states. No video is certified fully watched yet.',videos:coverage});
console.log(`Validated and saved ${samples.length} curated subtitle frames from ${Object.keys(observations).length} videos; full-watch count remains 0.`);
