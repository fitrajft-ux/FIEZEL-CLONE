(function(root){
  'use strict';

  // FIEZEL diagnostics exporter (M-019)
  //
  // Tujuan: owner memakai FIEZEL dari ikon Home Screen (PWA standalone) dan tidak
  // punya Mac. Storage container standalone iOS terpisah dari tab Safari, dan tanpa
  // Mac tidak ada Web Inspector, jadi tidak ada cara membaca localStorage dari luar.
  // Panel ini membuat app mengekspor datanya sendiri.
  //
  // KONTRAK READ-ONLY: file ini tidak boleh menulis atau menghapus apa pun di
  // localStorage, CacheStorage, atau IndexedDB. Nilai token autentikasi tidak pernah
  // diekspor; panel hanya mencatat presence boolean dan origin non-secret.
  //
  // DIAG_BUILD adalah penanda deploy manual yang sekarang dijaga A7. Untuk setiap
  // product deploy, angka m025-N wajib naik tepat +1 dan SW_REV wajib membawa build
  // yang sama. Ini membedakan build baru aktif vs shell lama dari service worker.
  var DIAG_BUILD = 'm025-31';

  var KEY = 'fiezel-clone-neural-voice-diagnostics-v1';
  var Z = 2147483000;

  if (!root.document || root.__fiezelDiagPanel) return;
  root.__fiezelDiagPanel = true;

  function safe(fn, fallback) {
    try { return fn(); }
    catch (error) { return arguments.length > 1 ? fallback : 'ERR: ' + String(error && error.message || error); }
  }

  function collectPuterAuth() {
    return safe(function(){
      var puter = root.puter || null;
      var auth = puter && puter.auth;
      var signedIn = null;
      if (auth && typeof auth.isSignedIn === 'function') {
        var value = auth.isSignedIn();
        if (typeof value === 'boolean') signedIn = value;
      }
      return {
        loaded: !!puter,
        signedIn: signedIn,
        authAvailable: !!auth,
        workersLoaded: !!(puter && puter.workers),
        workersExecAvailable: !!(puter && puter.workers && typeof puter.workers.exec === 'function')
      };
    }, {loaded:false,signedIn:null,authAvailable:false,workersLoaded:false,workersExecAvailable:false});
  }

  function collect() {
    var runtime = root.FiezelVoiceRuntime || null;
    var raw = safe(function(){ return root.localStorage && root.localStorage.getItem(KEY); }, null);
    var parsed = null;
    if (raw) parsed = safe(function(){ return JSON.parse(raw); }, raw);
    var status = safe(function(){ return runtime && typeof runtime.status === 'function' ? runtime.status() : null; }, null);
    var diagnostics = safe(function(){ return runtime && typeof runtime.diagnostics === 'function' ? runtime.diagnostics() : null; }, null);
    var puterAuth = collectPuterAuth();
    return {
      diagBuild: DIAG_BUILD,
      appVersion: root.FIEZEL_VERSION || null,
      timestamp: new Date().toISOString(),
      origin: safe(function(){ return root.location && root.location.origin; }, null),
      path: safe(function(){ return root.location && root.location.pathname; }, null),
      standalone: !!safe(function(){ return root.navigator && root.navigator.standalone; }, false),
      userAgent: safe(function(){ return root.navigator && root.navigator.userAgent; }, null),
      crossOriginIsolated: !!root.crossOriginIsolated,
      runtimeStatus: status,
      runtimeDiagnostics: diagnostics,
      target: parsed,
      puterAuth: puterAuth,
      puterLoaded: puterAuth.loaded,
      puterWorkersLoaded: puterAuth.workersLoaded,
      swController: safe(function(){ return root.navigator && root.navigator.serviceWorker && root.navigator.serviceWorker.controller && root.navigator.serviceWorker.controller.scriptURL; }, null),
      storageEstimate: null,
      cacheInventory: null
    };
  }

  async function fillAsync(report) {
    report.storageEstimate = await safe(async function(){
      if (!root.navigator || !root.navigator.storage || typeof root.navigator.storage.estimate !== 'function') return {available:false};
      var result = await root.navigator.storage.estimate();
      var usage = Number(result && result.usage) || 0;
      var quota = Number(result && result.quota) || 0;
      return {available:true,usage:usage,quota:quota,remaining:Math.max(0,quota-usage)};
    }, {available:false});
    report.cacheInventory = await safe(async function(){
      if (!root.caches || typeof root.caches.keys !== 'function') return {available:false};
      var names = await root.caches.keys();
      var out = [];
      for (var i=0;i<names.length;i++) {
        var cache = await root.caches.open(names[i]);
        var requests = await cache.keys();
        var entries = [];
        for (var j=0;j<requests.length;j++) {
          var url = requests[j].url;
          if (!/\/(?:vendor\/kokoro-|vendor\/sherpa-vits|features\/neural-voice\/)/.test(url)) continue;
          var response = await cache.match(requests[j]);
          entries.push({url:url,contentLength:response && response.headers && response.headers.get('content-length'),contentType:response && response.headers && response.headers.get('content-type')});
        }
        if (entries.length) out.push({name:names[i],entryCount:entries.length,entries:entries});
      }
      return {available:true,caches:out};
    }, {available:false});
    return report;
  }

  function el(tag, attrs, text) {
    var node = root.document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){
      if (k === 'className') node.className = attrs[k];
      else if (k === 'dataset') Object.keys(attrs[k]).forEach(function(d){ node.setAttribute('data-'+d,attrs[k][d]); });
      else node[k] = attrs[k];
    });
    if (text != null) node.textContent = text;
    return node;
  }

  function mount() {
    if (root.document.getElementById && root.document.getElementById('fiezelDiagHost')) return;
    var host = el('div',{id:'fiezelDiagHost',dataset:{'diag-build':DIAG_BUILD}});
    var open = el('button',{id:'fiezelDiagOpen',type:'button'},'Diagnostics');
    var sheet = el('div',{id:'fiezelDiagSheet',className:'fiezel-diag-sheet'});
    var searchBar = el('div',{id:'fiezelDiagSearchBar',className:'fiezel-diag-search'});
    var search = el('input',{id:'fiezelDiagSearch',type:'search',placeholder:'Cari diagnostics',autocomplete:'off'});
    var previous = el('button',{type:'button'},'↑ Sebelumnya');
    var next = el('button',{type:'button'},'↓ Berikutnya');
    var count = el('span',{id:'fiezelDiagSearchCount'},'');
    searchBar.appendChild(search); searchBar.appendChild(previous); searchBar.appendChild(next); searchBar.appendChild(count);
    var text = el('textarea',{id:'fiezelDiagText',readOnly:true,spellcheck:false});
    var close = el('button',{type:'button'},'Tutup');
    sheet.appendChild(searchBar); sheet.appendChild(text); sheet.appendChild(close);
    host.appendChild(open); host.appendChild(sheet);
    root.document.body.appendChild(host);
    var hits=[],active=-1;
    function searchNow(step){
      var q=String(search.value||'').toLowerCase(); hits=[]; active=-1;
      if(!q){count.textContent='';return}
      var hay=String(text.value||'').toLowerCase(),at=0;
      while((at=hay.indexOf(q,at))>=0){hits.push(at);at+=Math.max(1,q.length)}
      if(!hits.length){count.textContent='0 hasil';return}
      if(typeof step==='number') active=((step%hits.length)+hits.length)%hits.length; else active=0;
      var start=hits[active]; text.focus(); text.setSelectionRange(start,start+q.length); count.textContent=(active+1)+'/'+hits.length;
    }
    search.addEventListener('input',function(){searchNow()});
    next.addEventListener('click',function(){searchNow(active+1)});
    previous.addEventListener('click',function(){searchNow(active-1)});
    open.addEventListener('click',async function(){sheet.classList.add('show');var report=await fillAsync(collect());text.value=JSON.stringify(report,null,2);searchNow()});
    close.addEventListener('click',function(){sheet.classList.remove('show')});
  }

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded',mount);
  else mount();
})(typeof globalThis!=='undefined'?globalThis:this);
