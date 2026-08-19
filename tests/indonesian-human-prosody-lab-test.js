'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const ROOT=path.join(__dirname,'..');
const LAB_PATH=path.join(ROOT,'features','neural-voice','fiezel-indonesian-human-prosody-lab.js');
const src=fs.readFileSync(LAB_PATH,'utf8');
const lab=require(LAB_PATH);
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const stable=fs.readFileSync(path.join(ROOT,'features','neural-voice','fiezel-indonesian-voice-bridge.js'),'utf8');
const quality=fs.readFileSync(path.join(ROOT,'.github','workflows','quality.yml'),'utf8');
const recovery=fs.readFileSync(path.join(ROOT,'recovery-quality.yml'),'utf8');

// Engine identity and exact read-only APPS source authority.
assert.strictEqual(lab.version,'exp-id-human-prosody-v2');
assert.strictEqual(lab.sourceSha,'480f8bb707ee9ec36b25b08ceefc2fe2f03c463e');
assert.strictEqual(lab.modelId,'supertonic-3-int8-2026-05-11');
assert.strictEqual(lab.generationSteps,4);
assert.strictEqual(lab.totalBytes,158889523);
assert.strictEqual(lab.assets().length,11);
assert.match(src,/\/FIEZEL-APPS\/vendor\/supertonic-3\//);
assert.match(src,/SOURCE_SHA='480f8bb707ee9ec36b25b08ceefc2fe2f03c463e'/);

// Human-register routing uses the two proven Supertonic speaker registers.
const ajar=lab.classify('Sekarang kita pelajari pola kalimat ini.');
assert.strictEqual(ajar.sid,2);
assert.strictEqual(ajar.intent,'ajar');
const hype=lab.classify('Keren banget!');
assert.strictEqual(hype.sid,5);
assert.strictEqual(hype.intent,'hype');
const p=lab.plan('Nah, kita lanjut ya.',{speed:1});
assert.strictEqual(p.language,'id-ID');
assert.strictEqual(p.generationSteps,4);
assert.strictEqual(p.dspPolicy,'no-pitch-resample-no-pcm-pitch-mutation');
assert.ok(p.speed>=0.75&&p.speed<=1.18);

// The m025-45 crackle class stays guarded without touching clean PCM.
const clean=new Float32Array([0,.2,-.9]);
const untouched=lab.conditionSamples(clean);
assert.strictEqual(untouched.applied,false);
assert.strictEqual(untouched.samples,clean);
const damaged=new Float32Array([0,2,NaN,-1.5]);
const guarded=lab.conditionSamples(damaged);
assert.strictEqual(guarded.applied,true);
assert.strictEqual(guarded.stats.clipping,true);
assert.strictEqual(guarded.stats.nonFinite,1);
assert.ok(Array.from(guarded.samples).every(Number.isFinite));
assert.ok(Math.max(...Array.from(guarded.samples).map(Math.abs))<=0.981);

// Supertonic owns native prosody: Indonesian language + four denoising steps, no pitch DSP.
assert.match(src,/type:'generateWithConfig'/);
assert.match(src,/numSteps:GENERATION_STEPS/);
assert.match(src,/extra:\{lang:'id'\}/);
assert.match(src,/__indonesianNaturalBetaPatched/);
assert.match(src,/natural_beta_fallback_stable/);
assert.match(src,/Aktifkan Natural Beta · 159 MB/);
assert.match(src,/modelSampleRate/);
assert.match(src,/audioContextSampleRate/);
assert.match(src,/clippingDetected/);
assert.ok(!/root\.speechSynthesis|SpeechSynthesisUtterance/.test(src),'Natural Beta must not use browser TTS');
assert.ok(!/\.resample\s*\(/.test(src),'Natural Beta must not pitch-resample PCM');

// Recovery boundary: the existing stable Indonesian Piper bridge is untouched and remains available.
assert.match(stable,/MODEL_ID='vits-piper-id_ID-news_tts-medium'/);
assert.match(stable,/root\.FiezelIndonesianVoice=Object\.freeze/);
assert.ok(!stable.includes('supertonic-3'),'stable Indonesian bridge must remain independent from Natural Beta');

// Load Natural Beta only after the final Spatial Classroom hotfix has installed its stable wrapper.
const hotfixAt=index.indexOf('./features/spatial-dock/spatial-dock-hotfix.js');
const labAt=index.indexOf('./features/neural-voice/fiezel-indonesian-human-prosody-lab.js');
assert.ok(hotfixAt>=0&&labAt>hotfixAt,'Natural Beta must load after the stable Spatial Classroom runtime');
assert.match(sw,/SW_REV='m025-32-indonesian-natural-beta-20260819-1'/);
assert.ok(sw.includes("'./features/neural-voice/fiezel-indonesian-human-prosody-lab.js'"),'Natural Beta shell file must be revisioned/pre-cached');
assert.ok(!sw.includes("'/FIEZEL-APPS/vendor/supertonic-3/"),'CLONE shell must not duplicate the Supertonic model bundle');

// Both normal and recovery suites must execute this exact regression gate.
for(const suite of [quality,recovery])assert.ok(suite.includes('node tests/indonesian-human-prosody-lab-test.js'),'Natural Beta regression must run in every release gate');

console.log('Indonesian Human Prosody Lab v2: PASS');
