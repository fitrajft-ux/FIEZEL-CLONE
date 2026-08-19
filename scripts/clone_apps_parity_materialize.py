from pathlib import Path
import ast, hashlib, json, re, shutil

ROOT=Path('.')
APPS=Path('_apps')
SOURCE='d27046c9ab85654b9e0ea0520e9360643130ce49'
BASE='0aba4a5f9f3f4ec4511dee2698f811107e5a7198'
SW_REV='m025-48-clone-apps-parity-natural-beta-20260819-1'

ROOT_FILES=[
'app.js','style.css','version.js','VERSION.json','report-config.js','core-config.js',
'content-canary.js','content-promotion.js','content-canary-config.js','lucide.min.js',
'manifest.json','vocabulary-master.json','reading-bank.json','grammar-templates.json',
'favicon-64.png','apple-touch-icon.png','instagram.svg','creator-report-setup.html',
'creator-report-dashboard.html','fiezel-core-worker.js','fiezel-report-worker.js']
FEATURE_DIRS=['audio','classroom','daily-target','diagnostics','library','speaking-listening','tutor-classroom','ui']

for rel in ROOT_FILES:
    src=APPS/rel
    if not src.is_file(): raise SystemExit(f'missing APPS root file: {rel}')
    shutil.copy2(src,ROOT/rel)
for d in FEATURE_DIRS:
    src=APPS/'features'/d; dst=ROOT/'features'/d
    if not src.is_dir(): raise SystemExit(f'missing APPS feature dir: {d}')
    shutil.rmtree(dst,ignore_errors=True); shutil.copytree(src,dst)

(ROOT/'features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js').unlink(missing_ok=True)
shutil.rmtree(ROOT/'features/spatial-dock',ignore_errors=True)
(ROOT/'spatial-dock-m02531-regression-test.js').unlink(missing_ok=True)

# APPS app runtime, isolated only at CLONE local-state namespaces.
app=(APPS/'app.js').read_text()
for old,new in {
"'fiezel-v4-state'":"'fiezel-clone-v4-state'",
"'fiezel-last-login-message'":"'fiezel-clone-last-login-message'",
"'fiezel-remote-push'":"'fiezel-clone-remote-push'",
"'fiezel.seenAppVersion'":"'fiezel-clone.seenAppVersion'"}.items(): app=app.replace(old,new)
(ROOT/'app.js').write_text(app)

manifest=json.loads((APPS/'manifest.json').read_text())
manifest.update(name='FIEZEL CLONE',short_name='FIEZEL CLONE',description='FIEZEL CLONE — APPS-parity Personal English OS dengan neural voice eksperimen Natural Beta.')
(ROOT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'),ensure_ascii=False)+'\n')

# APPS shell/order with CLONE neural authority.
index=(APPS/'index.html').read_text()
index=index.replace('<script src="./version.js"></script>','<script src="./version.js"></script>\n  <script src="./clone-build.js"></script>')
index=re.sub(r'\n  <script src="\./features/neural-voice/[^"]+"></script>','',index)
index=index.replace('  <script src="./content-canary-config.js"></script>','''  <script src="./content-canary-config.js"></script>
  <!-- CLONE neural authority: pinned stable runtime + Natural Beta experiment. -->
  <script src="./features/neural-voice/fiezel-neural-voice-config.js"></script>
  <script src="./features/neural-voice/fiezel-kokoro-adapter.js"></script>
  <script src="./features/neural-voice/fiezel-sherpa-vits-adapter.js"></script>
  <script src="./features/neural-voice/fiezel-neural-voice.js"></script>
  <script src="./features/neural-voice/fiezel-web-audio-player.js"></script>
  <script src="./features/neural-voice/fiezel-neural-voice-bootstrap.js"></script>
  <script src="./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js"></script>
  <script src="./features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js"></script>
  <script src="./features/neural-voice/fiezel-neural-voice-audibility-fix.js"></script>''')
index=index.replace('  <script src="./features/diagnostics/fiezel-diagnostic-register.js"></script>','''  <script src="./features/diagnostics/fiezel-diagnostic-register.js"></script>
  <script src="./features/neural-voice/fiezel-diag-panel.js"></script>
  <script src="./features/neural-voice/fiezel-pipeline-device-probe.js"></script>''')
index=index.replace('  <script src="./features/tutor-classroom/fiezel-tutor-v3.js"></script>','''  <script src="./features/tutor-classroom/fiezel-tutor-v3.js"></script>
  <script src="./features/neural-voice/fiezel-indonesian-human-prosody-lab.js"></script>''')
index=index.replace('  <script src="./features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js"></script>\n','')
if 'spatial-dock' in index: raise SystemExit('index still contains spatial-dock')
(ROOT/'index.html').write_text(index)

# Bind Natural Beta to the APPS Tutor v3 DOM contract and current APPS asset authority.
labp=ROOT/'features/neural-voice/fiezel-indonesian-human-prosody-lab.js'; lab=labp.read_text()
lab=lab.replace('else if(root){root.FiezelIndonesianProsodyLab=api;root.FiezelIndonesianExpressiveVoice=api;api.install();}','else if(root){root.FiezelIndonesianProsodyLab=api;root.FiezelIndonesianExpressiveVoice=api;root.FiezelIndonesianVoice=api;api.install();}')
lab=re.sub(r"var SOURCE_SHA='[0-9a-f]{40}';",f"var SOURCE_SHA='{SOURCE}';",lab)
lab=lab.replace("function enabled(){try{return root.localStorage&&root.localStorage.getItem(ENABLE_KEY)==='1';}catch(_){return false;}}","function enabled(){try{var v=root.localStorage&&root.localStorage.getItem(ENABLE_KEY);return v!=='0';}catch(_){return true;}}")
lab=lab.replace('async function prepare(options){\n    var opts=','async function prepare(options){\n    setEnabled(true);\n    var opts=')
lab=lab.replace("function classroomActive(){try{return !!(root.document&&root.document.querySelector('.sd-classroom'));}catch(_){return false;}}","function classroomActive(){try{return !!(root.document&&root.document.querySelector('.classroom-v3'));}catch(_){return false;}}")
lab=lab.replace("function indonesianText(fallback){try{var n=root.document&&root.document.getElementById('sdSubtitle'),t=n&&clean(n.textContent);return t||clean(fallback);}catch(_){return clean(fallback);}}","function indonesianText(fallback){try{var n=root.document&&root.document.getElementById('tutorSubtitle'),t=n&&clean(n.textContent);return t||clean(fallback);}catch(_){return clean(fallback);}}")
lab=lab.replace('experimental:true,optIn:true,enabled:enabled(),ready:!!service','experimental:true,optIn:false,enabled:enabled(),prepared:preflightDone,ready:!!service')
labp.write_text(lab)

(ROOT/'clone-build.js').write_text("self.FIEZEL_CLONE_BUILD='clone-r3-apps-parity-natural-beta-20260819-1';\n"+f"self.FIEZEL_CLONE_APPS_SOURCE='{SOURCE}';\n")

# APPS service-worker behavior, isolated CLONE caches and CLONE neural shell.
sw=(APPS/'sw.js').read_text()
sw=sw.replace('const CACHE=`fiezel-v${self.FIEZEL_VERSION}`;',"const CACHE=`fiezel-clone-v${self.FIEZEL_VERSION}`;\nconst RECOVERY_BASELINE_MARKER='m025-29-clone-r1-known-good-neural-20260818-1';")
sw=re.sub(r"const SW_REV='[^']+';",f"const SW_REV='{SW_REV}';",sw)
sw=sw.replace('const SHELL_CACHE=`fiezel-shell-${SW_REV}`;','const SHELL_CACHE=`fiezel-clone-shell-${SW_REV}`;').replace("k.startsWith('fiezel-shell-')","k.startsWith('fiezel-clone-shell-')")
m=re.search(r'const ASSETS=(\[[^;]+\]);',sw)
if not m: raise SystemExit('APPS SW ASSETS not found')
assets=ast.literal_eval(m.group(1)); assets=[a for a in assets if not a.startswith('./features/neural-voice/') and a!='./features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js']
if './clone-build.js' not in assets: assets.insert(assets.index('./version.js')+1,'./clone-build.js')
for a in [
'./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-kokoro-adapter.js','./features/neural-voice/fiezel-sherpa-vits-adapter.js','./features/neural-voice/fiezel-neural-voice.js','./features/neural-voice/fiezel-web-audio-player.js','./features/neural-voice/fiezel-neural-voice-bootstrap.js','./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js','./features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js','./features/neural-voice/fiezel-neural-voice-audibility-fix.js','./features/neural-voice/fiezel-diag-panel.js','./features/neural-voice/fiezel-pipeline-device-probe.js','./features/neural-voice/fiezel-indonesian-human-prosody-lab.js']:
    if a not in assets: assets.append(a)
sw=sw[:m.start(1)]+repr(assets)+sw[m.end(1):]; (ROOT/'sw.js').write_text(sw)

# Hash ledger proves every non-neural APPS feature byte stayed exact.
exact=[]
for d in FEATURE_DIRS:
    for p in sorted((APPS/'features'/d).rglob('*')):
        if p.is_file():
            rel=p.relative_to(APPS).as_posix()
            if rel!='features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js': exact.append(rel)
exact += [x for x in ROOT_FILES if x not in ['app.js','style.css','manifest.json']]
# style.css is exact too; only app/manifest/index/sw are adapted.
exact.append('style.css')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
ledger={'schema':'fiezel-clone-apps-parity-v1','cloneBase':BASE,'appsSource':SOURCE,'mode':'apps-non-neural-exact-plus-clone-neural-experiment','adaptedFiles':{'app.js':'APPS runtime with CLONE localStorage namespace only','index.html':'APPS shell/order with CLONE neural script block + clone-build','manifest.json':'APPS manifest with CLONE identity','sw.js':'APPS service-worker semantics with CLONE cache namespace + CLONE neural assets','features/neural-voice/fiezel-indonesian-human-prosody-lab.js':'Natural Beta bound to APPS Tutor v3'},'excluded':['features/neural-voice/**','vendor/**','features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js'],'exactFiles':{rel:sha(APPS/rel) for rel in sorted(set(exact))}}
(ROOT/'FIEZEL-CLONE-APPS-PARITY.json').write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n')

# Natural Beta regression updated from Spatial Classroom to APPS Tutor v3.
(ROOT/'tests/indonesian-human-prosody-lab-test.js').write_text("""'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),LAB=path.join(ROOT,'features','neural-voice','fiezel-indonesian-human-prosody-lab.js');
const src=fs.readFileSync(LAB,'utf8'),lab=require(LAB),index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
assert.strictEqual(lab.version,'exp-id-human-prosody-v2'); assert.strictEqual(lab.sourceSha,'d27046c9ab85654b9e0ea0520e9360643130ce49'); assert.strictEqual(lab.modelId,'supertonic-3-int8-2026-05-11'); assert.strictEqual(lab.generationSteps,4); assert.strictEqual(lab.totalBytes,158889523); assert.strictEqual(lab.assets().length,11);
const ajar=lab.classify('Sekarang kita pelajari pola kalimat ini.'),hype=lab.classify('Keren banget!'); assert.strictEqual(ajar.sid,2); assert.strictEqual(ajar.intent,'ajar'); assert.strictEqual(hype.sid,5); assert.strictEqual(hype.intent,'hype');
const damaged=new Float32Array([0,2,NaN,-1.5]),guarded=lab.conditionSamples(damaged); assert.strictEqual(guarded.applied,true); assert.strictEqual(guarded.stats.clipping,true); assert.strictEqual(guarded.stats.nonFinite,1); assert.ok(Array.from(guarded.samples).every(Number.isFinite));
assert.match(src,/type:'generateWithConfig'/); assert.match(src,/numSteps:GENERATION_STEPS/); assert.match(src,/extra:\{lang:'id'\}/); assert.match(src,/natural_beta_fallback_stable/); assert.match(src,/\.classroom-v3/); assert.match(src,/getElementById\('tutorSubtitle'\)/); assert.match(src,/root\.FiezelIndonesianVoice=api/); assert.match(src,/prepared:preflightDone/); assert.ok(!/root\.speechSynthesis|SpeechSynthesisUtterance/.test(src)); assert.ok(!/\.resample\s*\(/.test(src));
const tutorAt=index.indexOf('./features/tutor-classroom/fiezel-tutor-v3.js'),labAt=index.indexOf('./features/neural-voice/fiezel-indonesian-human-prosody-lab.js'); assert.ok(tutorAt>=0&&labAt>tutorAt); assert.ok(!index.includes('fiezel-tutor-indonesian-voice-fix.js')); assert.ok(!index.includes('spatial-dock')); assert.match(sw,/SW_REV='m025-48-clone-apps-parity-natural-beta-20260819-1'/); assert.ok(sw.includes("'./features/neural-voice/fiezel-indonesian-human-prosody-lab.js'"));
console.log('Indonesian Human Prosody Lab · APPS Tutor v3 integration: PASS');
""")

(ROOT/'tests/apps-parity-classroom-test.js').write_text("""'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path'); const ROOT=path.join(__dirname,'..'); const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8'); const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex'); const ledger=JSON.parse(read('FIEZEL-CLONE-APPS-PARITY.json'));
assert.strictEqual(ledger.schema,'fiezel-clone-apps-parity-v1'); assert.strictEqual(ledger.appsSource,'d27046c9ab85654b9e0ea0520e9360643130ce49'); for(const [f,h] of Object.entries(ledger.exactFiles)){assert.ok(fs.existsSync(path.join(ROOT,f)),`missing APPS-parity file: ${f}`); assert.strictEqual(sha(f),h,`APPS-parity drift: ${f}`)}
const pack=JSON.parse(read('features/classroom/classroom-lessons-v1.json')); assert.strictEqual(pack.schema,'fiezel-classroom-lessons-v1'); assert.strictEqual(pack.version,'1.2.0'); assert.strictEqual(pack.categories.length,6); assert.strictEqual(pack.curriculum.lessonsByLevel.A1,35); const classroom=require(path.join(ROOT,'features/classroom/fiezel-classroom.js')); const s=classroom.createSession(pack); assert.strictEqual(s.categories().length,6); s.chooseCategory('grammar'); assert.ok(s.lessonsIn('grammar').length>=16);
const tutorSrc=read('features/tutor-classroom/fiezel-tutor-v3.js'); assert.match(tutorSrc,/fetch\('\.\/features\/classroom\/classroom-lessons-v1\.json'/); assert.match(tutorSrc,/root\.classroom = classroomV3/);
const index=read('index.html'),app=read('app.js'),sw=read('sw.js'); for(const asset of ['./features/audio/fiezel-soundtrack.js','./features/library/fiezel-library.js','./features/library/fiezel-library-ui.js','./features/classroom/fiezel-classroom.js','./features/tutor-classroom/fiezel-tutor-v3.js','./features/daily-target/fiezel-daily-target.js','./features/diagnostics/fiezel-diagnostic-bus.js']) assert.ok(index.includes(asset),`APPS runtime module not loaded: ${asset}`); assert.ok(index.includes('./clone-build.js')); assert.ok(index.includes('./features/neural-voice/fiezel-indonesian-human-prosody-lab.js')); assert.ok(!index.includes('spatial-dock')); assert.ok(!fs.existsSync(path.join(ROOT,'features/spatial-dock'))); assert.ok(!fs.existsSync(path.join(ROOT,'features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js')));
for(const forbidden of ["'fiezel-v4-state'","'fiezel-last-login-message'","'fiezel-remote-push'","'fiezel.seenAppVersion'"]) assert.ok(!app.includes(forbidden),`production storage key leaked: ${forbidden}`); assert.ok(app.includes("'fiezel-clone-v4-state'")); assert.ok(sw.includes('fiezel-clone-v${self.FIEZEL_VERSION}')); assert.ok(sw.includes('fiezel-clone-shell-${SW_REV}')); assert.ok(sw.includes("m025-29-clone-r1-known-good-neural-20260818-1")); assert.ok(!sw.includes("k.startsWith('fiezel-shell-')")); console.log(`FIEZEL CLONE APPS parity + Classroom load contract: PASS (${Object.keys(ledger.exactFiles).length} exact files)`);
""")

for rel in ['.github/workflows/quality.yml','recovery-quality.yml']:
    p=ROOT/rel; s=p.read_text().replace('          node spatial-dock-m02531-regression-test.js\n','')
    if 'node tests/apps-parity-classroom-test.js' not in s: s=s.replace('          node tests/indonesian-human-prosody-lab-test.js\n','          node tests/indonesian-human-prosody-lab-test.js\n          node tests/apps-parity-classroom-test.js\n')
    p.write_text(s)

# staging mechanism is self-erasing.
(ROOT/'.github/workflows/clone-apps-parity-materialize.yml').unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
