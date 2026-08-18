/* FIEZEL hotfix m025-31 — optional Indonesian neural voice for CLONE.
 * Source authority: FIEZEL-APPS@626340630e28358c5757484535a2c0fc0e62eee8
 * Model: vits-piper-id_ID-news_tts-medium, single speaker, id-ID.
 *
 * The 94.6 MB model remains hosted by the sibling FIEZEL-APPS Pages app. On explicit
 * learner request we fetch those exact five runtime assets, cache them under local
 * CLONE URLs in the stable CLONE neural cache, then run them through a local Worker.
 * No browser speechSynthesis fallback is permitted.
 */
(function(root){
  'use strict';
  if(!root || !root.document || root.FiezelIndonesianVoice) return;

  var SOURCE_SHA='626340630e28358c5757484535a2c0fc0e62eee8';
  var STATUS_KEY='fiezel-clone-indonesian-voice-v1';
  var SCHEMA='fiezel-indonesian-voice-status-v1';
  var VERSION=String(root.FIEZEL_VERSION||'5.19.0');
  var CACHE_NAME='fiezel-clone-v'+VERSION;
  var VOICE_ID='id_natural';
  var MODEL_ID='vits-piper-id_ID-news_tts-medium';
  var LOCAL_BASE=new URL('../../vendor/sherpa-vits-id/',(root.document.currentScript&&root.document.currentScript.src)||root.location.href);
  var REMOTE_BASE=new URL('/FIEZEL-APPS/vendor/sherpa-vits-id/',root.location.origin+'/');
  var ASSETS=Object.freeze([
    {name:'sherpa-onnx-wasm-main-tts.js',bytes:109876},
    {name:'sherpa-onnx-tts.js',bytes:33227},
    {name:'sherpa-onnx-tts.worker.js',bytes:2677},
    {name:'sherpa-onnx-wasm-main-tts.wasm',bytes:13474133},
    {name:'sherpa-onnx-wasm-main-tts.data',bytes:80939086}
  ]);
  var TOTAL_BYTES=94558999;
  var adapter=null,service=null,readyPromise=null,preparePromise=null,lastError='';

  function diag(entry){
    try{
      var key='fiezel-neural-voice-diagnostics-v1';
      var list=JSON.parse(root.localStorage.getItem(key)||'[]');
      list.push(Object.assign({t:Date.now(),v:VERSION,engine:'sherpa-vits-id',source:SOURCE_SHA},entry||{}));
      root.localStorage.setItem(key,JSON.stringify(list.slice(-200)));
    }catch(_){}
  }
  function readPrepared(){
    try{var v=JSON.parse(root.localStorage.getItem(STATUS_KEY)||'null');return !!(v&&v.schema===SCHEMA&&v.version===VERSION&&v.prepared===true);}catch(_){return false;}
  }
  function writePrepared(value){
    try{root.localStorage.setItem(STATUS_KEY,JSON.stringify({schema:SCHEMA,version:VERSION,prepared:value===true,preparedAt:value?Date.now():0,source:SOURCE_SHA}));}catch(_){}
  }
  function controlled(){return !!(root.navigator&&root.navigator.serviceWorker&&root.navigator.serviceWorker.controller);}
  function status(){
    return Object.freeze({schema:SCHEMA,version:VERSION,engine:'sherpa-vits-id',model:MODEL_ID,voice:VOICE_ID,language:'id-ID',optional:true,prepared:readPrepared(),ready:!!service,reloadRequired:readPrepared()&&!controlled(),error:lastError,totalBytes:TOTAL_BYTES,sourceSha:SOURCE_SHA});
  }

  async function cacheAssets(onProgress){
    if(!('caches' in root)) throw new Error('cache_storage_unavailable');
    var cache=await root.caches.open(CACHE_NAME);
    for(var i=0;i<ASSETS.length;i++){
      var asset=ASSETS[i];
      var localUrl=new URL(asset.name,LOCAL_BASE).href;
      var hit=await cache.match(localUrl);
      if(!hit){
        var remoteUrl=new URL(asset.name,REMOTE_BASE).href;
        var response=await root.fetch(remoteUrl,{credentials:'same-origin',cache:'no-store'});
        if(!response||!response.ok) throw new Error('indonesian_asset_failed:'+asset.name+':'+(response&&response.status));
        var length=Number(response.headers&&response.headers.get&&response.headers.get('content-length'))||0;
        if(length&&length!==asset.bytes) throw new Error('indonesian_asset_size_mismatch:'+asset.name+':'+length);
        await cache.put(localUrl,response.clone());
      }
      if(typeof onProgress==='function'){
        try{onProgress({completed:i+1,total:ASSETS.length,path:asset.name,percent:Math.round(((i+1)/ASSETS.length)*100)});}catch(_){}
      }
    }
    return true;
  }
  async function verifyCached(){
    if(!('caches' in root)) return false;
    try{
      var cache=await root.caches.open(CACHE_NAME);
      for(var i=0;i<ASSETS.length;i++) if(!(await cache.match(new URL(ASSETS[i].name,LOCAL_BASE).href))) return false;
      return true;
    }catch(_){return false;}
  }

  function createAdapter(){
    var worker=null,pending=null,initPromise=null,numSpeakers=0,sampleRate=0;
    function settle(kind,value){if(!pending)return;var p=pending;pending=null;p[kind](value);}
    function initialize(){
      if(initPromise) return initPromise;
      initPromise=new Promise(function(resolve,reject){
        if(typeof root.Worker!=='function'){reject(new Error('sherpa_worker_unavailable'));return;}
        var settled=false;
        try{worker=new root.Worker(new URL('sherpa-onnx-tts.worker.js',LOCAL_BASE).href);}catch(e){reject(e);return;}
        worker.onmessage=function(event){
          var d=(event&&event.data)||{};
          if(d.type==='sherpa-onnx-tts-ready'){
            numSpeakers=Number(d.numSpeakers)||0;
            if(!settled){settled=true;if(numSpeakers!==1){reject(new Error('indonesian_speaker_count_mismatch:'+numSpeakers));return;}resolve(api);}
          }else if(d.type==='sherpa-onnx-tts-result'){
            sampleRate=Number(d.sampleRate)||sampleRate;settle('resolve',{samples:d.samples,sampleRate:sampleRate});
          }else if(d.type==='error'){
            var err=new Error(String(d.message||'sherpa_worker_error'));if(pending)settle('reject',err);else if(!settled){settled=true;reject(err);}
          }
        };
        worker.onerror=function(event){var err=new Error('sherpa_worker_failed:'+String((event&&event.message)||'error'));if(pending)settle('reject',err);if(!settled){settled=true;reject(err);}};
      }).catch(function(error){initPromise=null;try{worker&&worker.terminate();}catch(_){}worker=null;throw error;});
      return initPromise;
    }
    function generate(text,options){
      var opts=options||{};var requested=typeof opts.speed==='number'&&opts.speed>0?opts.speed:1;var speed=Math.min(1.6,Math.max(.4,.85*requested));
      return initialize().then(function(){
        if(pending) throw new Error('neural_generation_busy');
        return new Promise(function(resolve,reject){pending={resolve:resolve,reject:reject};try{worker.postMessage({type:'generate',text:String(text||''),sid:0,speed:speed});}catch(e){pending=null;reject(e);}});
      }).then(function(out){var samples=out.samples,count=samples&&typeof samples.length==='number'?samples.length:0;if(!count)throw new Error('sherpa_empty_audio');return{audio:samples,sampling_rate:out.sampleRate,voice:VOICE_ID,sid:0};});
    }
    function stop(){if(pending)settle('reject',new Error('neural_generation_stopped'));}
    function release(){stop();try{worker&&worker.terminate();}catch(_){}worker=null;initPromise=null;}
    var api=Object.freeze({kind:'sherpa-vits-id',architecture:'sherpa-onnx-v1.13.5-vits-piper-wasm-worker',modelId:MODEL_ID,voiceSids:Object.freeze({id_natural:0}),defaultVoice:VOICE_ID,initialize:initialize,generate:generate,listVoices:function(){return Promise.resolve([VOICE_ID]);},stop:stop,release:release,getBackendState:function(){return Object.freeze({id:initPromise?'sherpa-vits-wasm-worker':'uninitialized',device:'wasm-simd-worker',dtype:'fp32'});}});
    return api;
  }

  function initialize(){
    if(readyPromise) return readyPromise;
    readyPromise=(async function(){
      if(!controlled()) throw new Error('indonesian_voice_reload_required');
      if(!root.FiezelNeuralVoice||!root.FiezelWebAudioPlayer) throw new Error('indonesian_runtime_modules_missing');
      adapter=createAdapter();
      await adapter.initialize();
      var player=root.FiezelWebAudioPlayer.createPlayer(root);
      service=root.FiezelNeuralVoice.createVoiceService({config:root.FiezelNeuralVoiceConfig,adapter:adapter,env:root,playAudio:player.play,generationTimeoutMs:30000});
      diag({phase:'indonesian_ready',model:MODEL_ID});
      return service;
    })().catch(function(error){readyPromise=null;service=null;try{adapter&&adapter.release();}catch(_){}adapter=null;lastError=String((error&&error.message)||error);diag({phase:'indonesian_init_error',error:lastError});throw error;});
    return readyPromise;
  }

  function prepare(options){
    if(preparePromise) return preparePromise;
    var opts=options||{};lastError='';
    preparePromise=(async function(){diag({phase:'indonesian_prepare_start'});await cacheAssets(opts.onProgress);if(!(await verifyCached()))throw new Error('indonesian_cache_verify_failed');writePrepared(true);if(controlled())await initialize();diag({phase:'indonesian_prepared',reloadRequired:!controlled()});return status();})().catch(function(error){lastError=String((error&&error.message)||error);writePrepared(false);diag({phase:'indonesian_prepare_error',error:lastError});throw error;}).finally(function(){preparePromise=null;});
    return preparePromise;
  }
  async function speak(text,options){
    if(!readPrepared()) throw new Error('indonesian_voice_not_downloaded');
    if(!controlled()) throw new Error('indonesian_voice_reload_required');
    var live=await initialize();var opts=options||{};
    return live.speak(String(text||''),{voice:VOICE_ID,speed:typeof opts.speed==='number'?opts.speed:1,lang:'id-ID',allowFallback:false});
  }
  function stop(){try{service&&service.stop&&service.stop();}catch(_){}try{adapter&&adapter.stop&&adapter.stop();}catch(_){} }
  async function release(){stop();try{adapter&&adapter.release&&adapter.release();}catch(_){}adapter=null;service=null;readyPromise=null;}

  root.FiezelIndonesianVoice=Object.freeze({schema:SCHEMA,voiceId:VOICE_ID,modelId:MODEL_ID,sourceSha:SOURCE_SHA,status:status,prepare:prepare,speak:speak,stop:stop,release:release,verifyCached:verifyCached,assets:function(){return ASSETS.map(function(a){return Object.assign({},a);});}});
})(typeof globalThis!=='undefined'?globalThis:this);
