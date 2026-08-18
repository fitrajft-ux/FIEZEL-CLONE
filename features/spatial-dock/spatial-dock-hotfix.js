/* m025-31 Spatial Dock regression hotfix.
 * - makes all five dock actions visible on iPhone even with the Lucide subset build;
 * - routes Classroom tutor speech to the optional Indonesian neural bundle when prepared;
 * - exposes an explicit ~95 MB download/test control instead of silently falling back.
 */
(function(root){
  'use strict';
  if(!root||!root.document||root.__fiezelSpatialHotfix31)return;
  root.__fiezelSpatialHotfix31=true;

  var baseRuntime=root.FiezelVoiceRuntime;
  var observer=null;

  function icons(){try{root.lucide&&root.lucide.createIcons&&root.lucide.createIcons({attrs:{'stroke-width':1.8,'aria-hidden':'true'}});}catch(_){} }
  function repairDock(){
    var nav=root.document.querySelector('.bottomnav');if(!nav)return;
    var learn=nav.querySelector('[data-sd-nav="learn"] [data-lucide]');
    var me=nav.querySelector('[data-sd-nav="me"] [data-lucide]');
    if(learn&&learn.tagName&&learn.tagName.toLowerCase()==='i')learn.setAttribute('data-lucide','book-a');
    if(me&&me.tagName&&me.tagName.toLowerCase()==='i')me.setAttribute('data-lucide','settings-2');
    nav.querySelectorAll('.nav').forEach(function(button){var label=button.querySelector('span');if(label)label.style.display='block';});
    icons();
  }

  function classroomActive(){try{return !!root.document.querySelector('.sd-classroom');}catch(_){return false;}}
  function indonesianText(fallback){
    try{var node=root.document.getElementById('sdSubtitle');var text=node&&String(node.textContent||'').trim();return text||String(fallback||'').trim();}catch(_){return String(fallback||'').trim();}
  }
  function indoStatus(){try{return root.FiezelIndonesianVoice&&root.FiezelIndonesianVoice.status?root.FiezelIndonesianVoice.status():null;}catch(_){return null;}}

  async function classroomSpeak(text,options){
    var opts=options||{};
    if(!classroomActive()){
      if(!baseRuntime||typeof baseRuntime.speak!=='function')throw new Error('neural_runtime_missing');
      return baseRuntime.speak(text,opts);
    }
    var spoken=indonesianText(text),indo=root.FiezelIndonesianVoice,status=indoStatus();
    if(spoken&&indo&&typeof indo.speak==='function'&&status&&status.prepared){
      try{return await indo.speak(spoken,{speed:typeof opts.speed==='number'?opts.speed:1,lang:'id-ID',allowFallback:false});}
      catch(error){
        var hint=root.document.getElementById('sdVoiceHint');if(hint)hint.textContent='Suara Indonesia perlu dimuat ulang. Teks pembelajaran tetap aman.';
        throw error;
      }
    }
    if(!baseRuntime||typeof baseRuntime.speak!=='function')throw new Error('neural_runtime_missing');
    return baseRuntime.speak(text,Object.assign({},opts,{allowFallback:false}));
  }
  function classroomStop(){
    if(classroomActive()){try{root.FiezelIndonesianVoice&&root.FiezelIndonesianVoice.stop&&root.FiezelIndonesianVoice.stop();}catch(_){} }
    try{if(baseRuntime&&typeof baseRuntime.stop==='function')return baseRuntime.stop();}catch(_){}
  }
  if(baseRuntime){
    try{root.FiezelVoiceRuntime=Object.freeze(Object.assign({},baseRuntime,{speak:classroomSpeak,stop:classroomStop,__spatialIndonesianPatched:true}));}catch(_){}
  }

  function updateVoiceControl(control){
    if(!control)return;
    var status=indoStatus(),button=control.querySelector('button'),note=control.querySelector('small');
    var ready=!!(status&&status.prepared);control.dataset.ready=String(ready);
    if(ready){
      if(button){button.disabled=false;button.textContent=status.reloadRequired?'Buka ulang untuk aktifkan':'Tes suara Indonesia';}
      if(note)note.textContent=status.reloadRequired?'Model sudah terunduh. Tutup lalu buka lagi FIEZEL satu kali.':'Tutor neural Indonesia siap.';
    }else{
      if(button){button.disabled=false;button.textContent='Download suara Indonesia · 95 MB';}
      if(note)note.textContent='Opsional · neural lokal · tanpa browser TTS.';
    }
  }
  function ensureVoiceControl(){
    repairDock();
    if(!classroomActive())return;
    var copy=root.document.querySelector('.sd-voice-copy');if(!copy||copy.querySelector('.sd-id-voice-control'))return;
    var control=root.document.createElement('div');control.className='sd-id-voice-control';
    control.innerHTML='<button type="button">Download suara Indonesia · 95 MB</button><small>Opsional · neural lokal · tanpa browser TTS.</small>';
    copy.appendChild(control);updateVoiceControl(control);
    var button=control.querySelector('button');
    button.addEventListener('click',async function(){
      var indo=root.FiezelIndonesianVoice;if(!indo)return;
      var status=indoStatus();
      if(status&&status.prepared){
        if(status.reloadRequired){root.location.reload();return;}
        button.disabled=true;button.textContent='Memutar…';
        try{await indo.speak('Halo Jahran. Suara tutor bahasa Indonesia sudah aktif.',{speed:.92});}
        catch(e){var note=control.querySelector('small');if(note)note.textContent='Tes gagal: '+String((e&&e.message)||e);}
        finally{button.disabled=false;updateVoiceControl(control);}return;
      }
      button.disabled=true;button.textContent='Menyiapkan 0%';
      try{
        await indo.prepare({onProgress:function(p){button.textContent='Menyiapkan '+String(p.percent||0)+'%';}});
        updateVoiceControl(control);
        var after=indoStatus();
        if(after&&!after.reloadRequired){await indo.speak('Halo Jahran. Suara tutor bahasa Indonesia sudah aktif.',{speed:.92});}
      }catch(e){var note=control.querySelector('small');if(note)note.textContent='Download gagal: '+String((e&&e.message)||e);button.disabled=false;updateVoiceControl(control);}
    });
  }

  function refresh(){repairDock();ensureVoiceControl();}
  function observe(){
    var app=root.document.getElementById('app');if(!app||!root.MutationObserver)return;
    observer=new root.MutationObserver(function(){if(typeof root.requestAnimationFrame==='function')root.requestAnimationFrame(refresh);else setTimeout(refresh,16);});
    try{observer.observe(app,{childList:true,subtree:true});}catch(_){}
  }
  refresh();observe();
  root.addEventListener('pageshow',refresh);
})(typeof globalThis!=='undefined'?globalThis:this);
