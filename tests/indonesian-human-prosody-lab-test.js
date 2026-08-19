'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const LAB_PATH=path.join(__dirname,'..','features','neural-voice','fiezel-indonesian-human-prosody-lab.js');
const src=fs.readFileSync(LAB_PATH,'utf8');
const lab=require(LAB_PATH);

assert.strictEqual(lab.version,'exp-id-human-prosody-v2');
assert.strictEqual(lab.sourceSha,'480f8bb707ee9ec36b25b08ceefc2fe2f03c463e');
assert.strictEqual(lab.modelId,'supertonic-3-int8-2026-05-11');
assert.strictEqual(lab.generationSteps,4);
assert.strictEqual(lab.totalBytes,158889523);
assert.strictEqual(lab.assets().length,11);

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

assert.match(src,/\/FIEZEL-APPS\/vendor\/supertonic-3\//);
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

console.log('Indonesian Human Prosody Lab v2: PASS');
