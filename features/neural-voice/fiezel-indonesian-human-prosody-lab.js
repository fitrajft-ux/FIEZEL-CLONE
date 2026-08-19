/*
 * FIEZEL-CLONE Indonesian Human Prosody Lab v2 (experimental, opt-in).
 *
 * Stable Indonesian Piper remains authoritative and untouched. This lab reads the
 * already-proven Supertonic 3 runtime from sibling FIEZEL-APPS, performs inference
 * locally in a dedicated one-thread WASM worker, and is used only when the learner
 * explicitly enables Natural Beta in Classroom.
 *
 * Safety invariants:
 * - FIEZEL-APPS is read-only; this file never writes to that repository/path.
 * - no browser speechSynthesis fallback inside this lab;
 * - no pitch resampling / PCM pitch manipulation;
 * - Supertonic uses 4 denoising steps and Indonesian reading rules;
 * - stable CLONE voice remains the automatic fallback if the lab fails.
 */
(function(root,factory){
  var api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root){
    root.FiezelIndonesianProsodyLab=api;
    root.FiezelIndonesianExpressiveVoice=api;
    api.install();
  }
}(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  var VERSION='exp-id-human-prosody-v2';
  var SOURCE_SHA='480f8bb707ee9ec36b25b08ceefc2fe2f03c463e';
  var MODEL_ID='supertonic-3-int8-2026-05-11';
  var EXPECTED_SPEAKERS=10;
  var GENERATION_STEPS=4;
  var ENABLE_KEY='fiezel-clone-indonesian-natural-beta-v1';
  var DIAG_KEY='fiezel-clone-neural-voice-diagnostics-v1';
  var REMOTE_PATH='/FIEZEL-APPS/vendor/supertonic-3/';
  var ASSETS=Object.freeze([
    {name:'sherpa-onnx-wasm-main-tts.js',bytes:79421},
    {name:'sherpa-onnx-tts.js',bytes:33227},
    {name:'sherpa-onnx-tts.worker.js',bytes:4709},
    {name:'sherpa-onnx-wasm-main-tts.wasm',bytes:13476398},
    {name:'duration_predictor.int8.onnx',bytes:3700147},
    {name:'text_encoder.int8.onnx',bytes:36416150},
    {name:'vector_estimator.int8.onnx',bytes:78400833},
    {name:'vocoder.int8.onnx',bytes:25991073},
    {name:'tts.json',bytes:8253},
    {name:'unicode_indexer.bin',bytes:262144},
    {name:'voice.bin',bytes:517168}
  ]);
  var TOTAL_BYTES=ASSETS.reduce(function(sum,a){return sum+a.bytes;},0);
  var HYPE_RE=/(^|[\s,.!?])(keren|mantap|hebat|bagus|gas|yeay|wih|sip|top|selamat|halo|haloo|hai|hei|yuk|ayo|semangat|nice|good job|well done|awesome)(?=$|[\s,.!?])/i;

  var worker=null,pending=null,readyPromise=null,service=null,player=null,lastError='',installed=false;
  var progressListeners=[];

  function clean(text){return String(text==null?'':text).replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();}
  function remoteBase(){
    var origin=(root.location&&root.location.origin)||'https://fitrajft-ux.github.io';
    return new URL(REMOTE_PATH,origin+'/');
  }
  function remoteUrl(name){return new URL(name,remoteBase()).href;}
  function diag(entry){
    try{
      var list=JSON.parse(root.localStorage&&root.localStorage.getItem(DIAG_KEY)||'[]');
      list.push(Object.assign({t:Date.now(),v:String(root.FIEZEL_VERSION||'5.19.0'),engine:'supertonic-3-clone-lab',source:SOURCE_SHA},entry||{}));
      root.localStorage&&root.localStorage.setItem(DIAG_KEY,JSON.stringify(list.slice(-200)));
    }catch(_){}
  }
  function emitProgress(detail){
    var payload=Object.assign({engine:'supertonic-3',model:MODEL_ID,totalBytes:TOTAL_BYTES},detail||{});
    progressListeners.slice().forEach(function(fn){try{fn(payload);}catch(_){}});
    try{root.dispatchEvent&&root.dispatchEvent(new CustomEvent('fiezel-indonesian-natural-progress',{detail:payload}));}catch(_){}
  }
  function enabled(){try{return root.localStorage&&root.localStorage.getItem(ENABLE_KEY)==='1';}catch(_){return false;}}
  function setEnabled(value){
    try{root.localStorage&&root.localStorage.setItem(ENABLE_KEY,value?'1':'0');}catch(_){}
    diag({phase:'natural_beta_toggle',enabled:!!value});
    refreshUi();
    return !!value;
  }
  function classify(text){
    var line=clean(text),words=line?line.split(/\s+/).length:0;
    var hype=(HYPE_RE.test(line)&&words<=14)||(/!$/.test(line)&&words<=8);
    return Object.freeze({intent:hype?'hype':'ajar',sid:hype?5:2,speed:hype?1.18:1.12,label:hype?'Tutor hype':'Tutor ceria'});
  }
  function plan(text,options){
    var opts=options||{},line=clean(text),persona=classify(line);
    var requested=typeof opts.speed==='number'&&opts.speed>0?opts.speed:1;
    var engineSpeed=Math.min(1.18,Math.max(.75,requested*persona.speed));
    return Object.freeze({
      version:VERSION,language:'id-ID',sourceText:line,engine:'supertonic-3',model:MODEL_ID,
      sourceSha:SOURCE_SHA,intent:persona.intent,sid:persona.sid,speed:engineSpeed,
      generationSteps:GENERATION_STEPS,dspPolicy:'no-pitch-resample-no-pcm-pitch-mutation'
    });
  }

  async function preflight(){
    if(typeof root.fetch!=='function')throw new Error('natural_beta_fetch_unavailable');
    diag({phase:'natural_beta_preflight_start',assetCount:ASSETS.length,totalBytes:TOTAL_BYTES});
    for(var i=0;i<ASSETS.length;i++){
      var asset=ASSETS[i],response=await root.fetch(remoteUrl(asset.name),{method:'HEAD',cache:'no-store',credentials:'same-origin'});
      if(!response||!response.ok)throw new Error('natural_beta_asset_unavailable:'+asset.name+':'+(response&&response.status));
      var length=Number(response.headers&&response.headers.get&&response.headers.get('content-length'))||0;
      if(length&&length!==asset.bytes)throw new Error('natural_beta_asset_size_mismatch:'+asset.name+':'+length);
      emitProgress({phase:'preflight',completed:i+1,total:ASSETS.length,path:asset.name});
    }
    diag({phase:'natural_beta_preflight_ready'});
    return true;
  }

  function settle(kind,value){if(!pending)return;var p=pending;pending=null;p[kind](value);}
  function destroyWorker(reason){
    if(pending)settle('reject',new Error(reason||'natural_beta_worker_stopped'));
    try{worker&&worker.terminate();}catch(_){}
    worker=null;readyPromise=null;
  }
  function initializeWorker(){
    if(readyPromise)return readyPromise;
    readyPromise=new Promise(function(resolve,reject){
      if(typeof root.Worker!=='function'){reject(new Error('natural_beta_worker_unavailable'));return;}
      var settled=false,started=Date.now();
      try{worker=new root.Worker(remoteUrl('sherpa-onnx-tts.worker.js'));}catch(error){reject(error);return;}
      worker.onmessage=function(event){
        var d=event&&event.data||{};
        if(d.type==='sherpa-onnx-tts-progress'){
          emitProgress({phase:'worker_loading',status:String(d.status||'')});
          return;
        }
        if(d.type==='sherpa-onnx-tts-ready'){
          var speakers=Number(d.numSpeakers)||0;
          if(!settled){
            settled=true;
            if(speakers!==EXPECTED_SPEAKERS){reject(new Error('natural_beta_speaker_count_mismatch:'+speakers));return;}
            diag({phase:'natural_beta_worker_ready',elapsedMs:Date.now()-started,numSpeakers:speakers});
            resolve(true);
          }
          return;
        }
        if(d.type==='sherpa-onnx-tts-result'){
          settle('resolve',{samples:d.samples,sampleRate:Number(d.sampleRate)||44100});
          return;
        }
        if(d.type==='error'){
          var error=new Error(String(d.message||'natural_beta_worker_error'));
          if(pending)settle('reject',error);else if(!settled){settled=true;reject(error);}
        }
      };
      worker.onerror=function(event){
        var error=new Error('natural_beta_worker_failed:'+String(event&&event.message||'error'));
        if(pending)settle('reject',error);
        if(!settled){settled=true;reject(error);}
      };
    }).catch(function(error){destroyWorker('natural_beta_init_reset');throw error;});
    return readyPromise;
  }

  function createAdapter(){
    return Object.freeze({
      kind:'supertonic-3-clone-lab',modelId:MODEL_ID,defaultVoice:'id_natural',
      initialize:initializeWorker,
      generate:function(text,options){
        var p=plan(text,options||{}),started=Date.now();
        return initializeWorker().then(function(){
          if(pending)throw new Error('neural_generation_busy');
          return new Promise(function(resolve,reject){
            pending={resolve:resolve,reject:reject};
            try{
              worker.postMessage({
                type:'generateWithConfig',text:p.sourceText,
                genConfig:{sid:p.sid,speed:p.speed,numSteps:GENERATION_STEPS,extra:{lang:'id'}}
              });
            }catch(error){pending=null;reject(error);}
          });
        }).then(function(out){
          var samples=out.samples,count=samples&&typeof samples.length==='number'?samples.length:0;
          if(!count)throw new Error('natural_beta_empty_audio');
          diag({phase:'natural_beta_generate_ready',elapsedMs:Date.now()-started,samples:count,sampleRate:out.sampleRate,sid:p.sid,intent:p.intent,speed:p.speed,generationSteps:GENERATION_STEPS});
          return{audio:samples,sampling_rate:out.sampleRate,voice:'id_natural',sid:p.sid,intent:p.intent};
        });
      },
      listVoices:function(){return Promise.resolve(['id_natural','tutor_ajar','tutor_hype']);},
      stop:function(){if(pending)destroyWorker('natural_beta_generation_stopped');},
      release:function(){destroyWorker('natural_beta_released');},
      getBackendState:function(){return Object.freeze({id:readyPromise?'supertonic-3-wasm-worker':'uninitialized',device:'wasm-simd-worker',dtype:'int8',numThreads:1});}
    });
  }

  function inspectSamples(samples){
    var peak=0,nonFinite=0;
    for(var i=0;i<samples.length;i++){
      var n=Number(samples[i]);
      if(!Number.isFinite(n)){nonFinite++;continue;}
      var a=n<0?-n:n;if(a>peak)peak=a;
    }
    return{peak:peak,nonFinite:nonFinite,clipping:peak>1};
  }
  function conditionSamples(samples){
    var stats=inspectSamples(samples);
    if(!stats.nonFinite&&!stats.clipping)return{samples:samples,stats:stats,applied:false};
    var scale=stats.clipping?0.98/stats.peak:1,out=new Float32Array(samples.length);
    for(var i=0;i<samples.length;i++){
      var n=Number(samples[i]);out[i]=Number.isFinite(n)?n*scale:0;
    }
    return{samples:out,stats:stats,applied:true};
  }

  function createPlayer(){
    var Ctor=root.AudioContext||root.webkitAudioContext,source=null,gainNode=null;
    function context(){if(!Ctor)return null;if(!root.__fiezelWebAudioContext)root.__fiezelWebAudioContext=new Ctor();return root.__fiezelWebAudioContext;}
    function stopNode(node,gain,ctx){
      if(!node)return;
      try{
        if(gain&&gain.gain&&ctx){
          var now=Number(ctx.currentTime)||0;
          if(gain.gain.cancelScheduledValues)gain.gain.cancelScheduledValues(now);
          if(gain.gain.setValueAtTime)gain.gain.setValueAtTime(Number(gain.gain.value)||1,now);
          if(gain.gain.linearRampToValueAtTime){gain.gain.linearRampToValueAtTime(0,now+.018);setTimeout(function(){try{node.stop();}catch(_){}},28);return;}
        }
      }catch(_){}
      try{node.stop();}catch(_){}
    }
    async function play(raw){
      if(!Ctor)throw new Error('Web Audio API unavailable');
      var input=raw&&raw.audio instanceof Float32Array?raw.audio:(raw&&raw.data instanceof Float32Array?raw.data:null);
      if(!input||!input.length)throw new Error('natural_beta_audio_payload_invalid');
      var rate=Number(raw.sampling_rate||raw.sampleRate||raw.sample_rate)||44100,guard=conditionSamples(input),samples=guard.samples;
      var ctx=context();if(!ctx)throw new Error('Web Audio API unavailable');
      if(ctx.state==='suspended'&&ctx.resume)try{await ctx.resume();}catch(_){}
      if(source)stopNode(source,gainNode,ctx);
      var buffer=ctx.createBuffer(1,samples.length,rate);buffer.copyToChannel(samples,0);
      var local=ctx.createBufferSource(),g=ctx.createGain?ctx.createGain():null;
      local.buffer=buffer;source=local;gainNode=g;
      if(g){
        local.connect(g);g.connect(ctx.destination);
        try{
          var now=Number(ctx.currentTime)||0,duration=samples.length/rate;
          g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(1,now+.006);
          if(duration>.02){g.gain.setValueAtTime(1,now+duration-.008);g.gain.linearRampToValueAtTime(0,now+duration);}
        }catch(_){}
      }else local.connect(ctx.destination);
      diag({phase:'natural_beta_playback_start',modelSampleRate:rate,audioContextSampleRate:Number(ctx.sampleRate)||null,browserResampleExpected:Number(ctx.sampleRate)!==rate,clippingDetected:guard.stats.clipping,nonFiniteCount:guard.stats.nonFinite,pcmPeak:guard.stats.peak,guardApplied:guard.applied});
      var resolveDone,finished=false,done=new Promise(function(resolve){resolveDone=resolve;});
      function finish(){if(finished)return;finished=true;if(source===local){source=null;gainNode=null;}resolveDone();diag({phase:'natural_beta_playback_done'});}
      local.onended=finish;local.start();
      setTimeout(finish,Math.max(1000,Math.round(samples.length/rate*1000)+2500));
      return{done:done,stop:function(){stopNode(local,g,ctx);}};
    }
    return Object.freeze({play:play,stop:function(){if(source){stopNode(source,gainNode,context());source=null;gainNode=null;}}});
  }

  async function initialize(){
    if(service)return service;
    if(!root.FiezelNeuralVoice||!root.FiezelNeuralVoiceConfig)throw new Error('natural_beta_runtime_modules_missing');
    await initializeWorker();
    var adapter=createAdapter();player=createPlayer();
    service=root.FiezelNeuralVoice.createVoiceService({config:root.FiezelNeuralVoiceConfig,adapter:adapter,env:root,playAudio:player.play,generationTimeoutMs:30000});
    service.__naturalAdapter=adapter;
    return service;
  }

  async function prepare(options){
    var opts=options||{},listener=typeof opts.onProgress==='function'?opts.onProgress:null;
    if(listener)progressListeners.push(listener);
    lastError='';
    try{await preflight();await initialize();diag({phase:'natural_beta_ready'});return status();}
    catch(error){lastError=String(error&&error.message||error);diag({phase:'natural_beta_error',error:lastError});throw error;}
    finally{if(listener)progressListeners=progressListeners.filter(function(fn){return fn!==listener;});refreshUi();}
  }
  async function speak(text,options){
    var live=await initialize(),opts=options||{},line=clean(text);
    if(!line)return{provider:'supertonic-3-clone-lab',skipped:true};
    return live.speak(line,{voice:'id_natural',speed:typeof opts.speed==='number'?opts.speed:1,lang:'id-ID',allowFallback:false});
  }
  function stop(){try{service&&service.stop&&service.stop();}catch(_){}try{service&&service.__naturalAdapter&&service.__naturalAdapter.stop&&service.__naturalAdapter.stop();}catch(_){}try{player&&player.stop&&player.stop();}catch(_){} }
  async function release(){stop();try{service&&service.__naturalAdapter&&service.__naturalAdapter.release&&service.__naturalAdapter.release();}catch(_){}service=null;player=null;}
  function status(){return Object.freeze({version:VERSION,engine:'supertonic-3',model:MODEL_ID,sourceSha:SOURCE_SHA,language:'id-ID',experimental:true,optIn:true,enabled:enabled(),ready:!!service,error:lastError,totalBytes:TOTAL_BYTES,assetCount:ASSETS.length,generationSteps:GENERATION_STEPS,numThreads:1,pitchResample:false});}

  function classroomActive(){try{return !!(root.document&&root.document.querySelector('.sd-classroom'));}catch(_){return false;}}
  function indonesianText(fallback){try{var n=root.document&&root.document.getElementById('sdSubtitle'),t=n&&clean(n.textContent);return t||clean(fallback);}catch(_){return clean(fallback);}}
  function patchRuntime(){
    var base=root.FiezelVoiceRuntime;
    if(!base||typeof base.speak!=='function'||base.__indonesianNaturalBetaPatched)return false;
    var wrapped=Object.assign({},base,{
      speak:async function(text,options){
        if(classroomActive()&&enabled()){
          try{return await speak(indonesianText(text),options||{});}
          catch(error){diag({phase:'natural_beta_fallback_stable',error:String(error&&error.message||error)});}
        }
        return base.speak(text,options||{});
      },
      stop:function(){stop();try{return base.stop&&base.stop();}catch(_){}},
      release:async function(){await release();try{return base.release?await base.release():undefined;}catch(_){}},
      __indonesianNaturalBetaPatched:true
    });
    try{root.FiezelVoiceRuntime=Object.freeze(wrapped);return true;}catch(_){return false;}
  }

  function refreshUi(){
    if(!root.document)return;
    var control=root.document.querySelector('.sd-id-natural-control');if(!control)return;
    var button=control.querySelector('button'),note=control.querySelector('small'),s=status();
    control.dataset.ready=String(s.ready);control.dataset.enabled=String(s.enabled);
    if(button){
      button.disabled=false;
      button.textContent=s.ready?(s.enabled?'Natural Beta · ON':'Natural Beta · OFF'):'Aktifkan Natural Beta · 159 MB';
    }
    if(note)note.textContent=s.ready?(s.enabled?'Supertonic aktif · fallback tetap neural lokal CLONE.':'Supertonic siap · mode stabil tetap aktif.'):(lastError?'Natural Beta gagal: '+lastError:'Opsional · on-device · Supertonic 3 · tanpa pitch DSP.');
  }
  function ensureUi(){
    if(!root.document||!classroomActive())return;
    var copy=root.document.querySelector('.sd-voice-copy');if(!copy||copy.querySelector('.sd-id-natural-control')){refreshUi();return;}
    var control=root.document.createElement('div');control.className='sd-id-voice-control sd-id-natural-control';
    control.innerHTML='<button type="button">Aktifkan Natural Beta · 159 MB</button><small>Opsional · on-device · Supertonic 3 · tanpa pitch DSP.</small>';
    copy.appendChild(control);
    var button=control.querySelector('button');
    button.addEventListener('click',async function(){
      if(service){setEnabled(!enabled());if(enabled())try{await speak('Nah, sekarang suara tutor Natural Beta sudah aktif.',{speed:1});}catch(error){lastError=String(error&&error.message||error);}refreshUi();return;}
      button.disabled=true;button.textContent='Memeriksa model…';setEnabled(true);
      try{
        await prepare({onProgress:function(p){if(p.phase==='preflight')button.textContent='Cek model '+p.completed+'/'+p.total;else if(p.phase==='worker_loading')button.textContent='Memuat Natural Beta…';}});
        await speak('Nah, sekarang suara tutor Natural Beta sudah aktif.',{speed:1});
      }catch(error){lastError=String(error&&error.message||error);setEnabled(false);}
      finally{button.disabled=false;refreshUi();}
    });
    refreshUi();
  }
  function install(){
    if(installed)return true;installed=true;
    patchRuntime();ensureUi();
    try{
      var app=root.document&&root.document.getElementById('app');
      if(app&&root.MutationObserver){var observer=new root.MutationObserver(function(){patchRuntime();ensureUi();});observer.observe(app,{childList:true,subtree:true});}
      root.addEventListener&&root.addEventListener('pageshow',function(){patchRuntime();ensureUi();});
    }catch(_){}
    diag({phase:'natural_beta_lab_installed',enabled:enabled()});
    return true;
  }

  return Object.freeze({
    version:VERSION,sourceSha:SOURCE_SHA,modelId:MODEL_ID,totalBytes:TOTAL_BYTES,generationSteps:GENERATION_STEPS,
    assets:function(){return ASSETS.map(function(a){return Object.assign({},a);});},
    classify:classify,plan:plan,inspectSamples:inspectSamples,conditionSamples:conditionSamples,
    enabled:enabled,setEnabled:setEnabled,status:status,preflight:preflight,prepare:prepare,initialize:initialize,speak:speak,stop:stop,release:release,install:install
  });
}));