/*
 * FIEZEL-CLONE Indonesian Human Prosody Lab (experimental, opt-in).
 *
 * Purpose: prepare Indonesian speech text into human-like phrase groups,
 * cadence hints, and emotion labels without touching the neural audio pipeline.
 *
 * This module intentionally does NOT patch FiezelIndonesianVoice automatically.
 * It does NOT resample PCM, modify pitch, create AudioContext, or alter cache/model
 * assets. It is safe to evaluate against the existing Indonesian bridge.
 */
(function(root,factory){
  var api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root)root.FiezelIndonesianProsodyLab=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  var VERSION='exp-id-human-prosody-v1';
  var STYLES={neutral:{speed:1,pause:145},warm:{speed:.98,pause:165},encouraging:{speed:1.02,pause:145},reassuring:{speed:.94,pause:185},excited:{speed:1.05,pause:125},serious:{speed:.96,pause:175},curious:{speed:.99,pause:155}};
  function clean(t){return String(t||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();}
  function emotion(t){
    t=String(t||'').toLowerCase();
    if(/(nggak apa|gak apa|tenang|pelan-pelan|coba lagi)/.test(t))return'reassuring';
    if(/(wah|keren|hebat|mantap|ayo|bagus banget|!)/.test(t))return'excited';
    if(/(kamu bisa|lanjut|bagus|betul|benar)/.test(t))return'encouraging';
    if(/(penting|ingat|hati-hati|jangan|harus)/.test(t))return'serious';
    if(/\?|\b(apa|kenapa|bagaimana|kapan|siapa|boleh|bisa)\b/.test(t))return'curious';
    return'warm';
  }
  function contour(t){
    if(/\?\s*$/.test(t))return'rise';
    if(/!\s*$/.test(t))return'lift-fall';
    if(/\b(tapi|namun|justru|meskipun)\b/i.test(t))return'contrast-lift';
    return'fall';
  }
  function plan(text,opt){
    opt=opt||{};
    var src=clean(text);
    var parts=(src.match(/[^.!?]+[.!?]?/g)||[]).map(clean).filter(Boolean);
    var segments=[];
    parts.forEach(function(p){
      p.split(/(?<=[,;:])\s+/).map(clean).filter(Boolean).forEach(function(x){
        var e=opt.style||emotion(x),s=STYLES[e]||STYLES.warm;
        segments.push({text:x,emotion:e,contourHint:contour(x),speed:s.speed,pauseAfterMs:s.pause});
      });
    });
    return Object.freeze({version:VERSION,language:'id-ID',sourceText:src,dspPolicy:'no-pitch-resample-no-pcm-mutation',segments:Object.freeze(segments)});
  }
  async function speakWith(voice,text,opt){
    var p=plan(text,opt);if(!voice||typeof voice.speak!=='function')throw new Error('indonesian_voice_api_missing');
    for(var i=0;i<p.segments.length;i++){
      var s=p.segments[i];
      await voice.speak(s.text,{lang:'id-ID',speed:s.speed,allowFallback:false,prosodyLab:VERSION,emotionHint:s.emotion,contourHint:s.contourHint});
      if(s.pauseAfterMs)await new Promise(function(r){setTimeout(r,s.pauseAfterMs);});
    }
    return p;
  }
  return Object.freeze({version:VERSION,plan:plan,speak:function(t,o){return speakWith(root.FiezelIndonesianVoice,t,o);},speakWith:speakWith});
}));