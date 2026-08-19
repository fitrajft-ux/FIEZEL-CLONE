'use strict';
const assert=require('assert');
const lab=require('../features/neural-voice/fiezel-indonesian-human-prosody-lab.js');

assert.strictEqual(lab.version,'exp-id-human-prosody-v1');
const q=lab.plan('Menurut kamu, kenapa jawabannya bisa seperti itu?');
assert.ok(q.segments.length>0);
assert.strictEqual(q.segments[q.segments.length-1].contourHint,'rise');
const warm=lab.plan('Tenang, nggak apa-apa. Kita coba lagi pelan-pelan.');
assert.ok(warm.segments.some(s=>s.emotion==='reassuring'));

const calls=[];
lab.speakWith({speak:async(t,o)=>calls.push({t,o})},'Bagus! Coba jelaskan jawabanmu?',{style:'warm',pauseScale:0})
.then(result=>{
  assert.strictEqual(calls.length,result.segments.length);
  assert.ok(calls.every(x=>x.o.lang==='id-ID'));
  assert.ok(calls.every(x=>x.o.allowFallback===false));
  console.log('Indonesian Human Prosody Lab: PASS');
})
.catch(error=>{console.error(error);process.exit(1);});
