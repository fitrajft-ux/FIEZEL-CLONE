const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const app=read('app.js'),sw=read('sw.js'),index=read('index.html'),manifest=JSON.parse(read('manifest.json'));
const boot=read('features/neural-voice/fiezel-neural-voice-bootstrap.js');
const lock=JSON.parse(read('FIEZEL-CLONE-SOURCE-LOCK.json'));

assert.equal(manifest.name,'FIEZEL CLONE');
assert(index.includes('./clone-build.js'),'clone marker must load before app');
assert(sw.includes('fiezel-clone-v${self.FIEZEL_VERSION}'),'runtime cache must be clone namespaced');
assert(sw.includes('fiezel-clone-shell-${SW_REV}'),'shell cache must be clone namespaced');
assert(sw.includes("m025-29-clone-r1-known-good-neural-20260818-1"),'clone release marker must retain baseline m025 identity and clone generation');
assert(sw.includes("k.startsWith('fiezel-clone-shell-')"),'clone activation may delete only clone shell generations');
assert(!sw.includes("k.startsWith('fiezel-shell-')"),'clone must never delete production shell caches');

for(const forbidden of ["'fiezel-v4-state'","'fiezel-last-login-message'","'fiezel-remote-push'","'fiezel.seenAppVersion'"]){
  assert(!app.includes(forbidden),`production localStorage key leaked into clone app: ${forbidden}`);
}
assert(app.includes("'fiezel-clone-v4-state'"));
assert(boot.includes("'fiezel-clone-neural-voice-v1'"));
assert(boot.includes("'fiezel-clone-neural-voice-diagnostics-v1'"));

// Fatal m025-39 class: never substitute methods through Proxy over a frozen runtime.
for(const f of fs.readdirSync('features/neural-voice').filter(x=>x.endsWith('.js')).map(x=>'features/neural-voice/'+x)){
  const src=read(f);
  assert(!/FiezelVoiceRuntime\s*=\s*new\s+Proxy/.test(src),`global FiezelVoiceRuntime Proxy forbidden: ${f}`);
}
assert(!fs.existsSync('features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js'),'unstable global tutor voice patch must not be active in clone-r1');

// Known-good neural/listening engine bytes remain exactly pinned to OWNER successful snapshot.
for(const [f,meta] of Object.entries(lock.files)){
  assert.equal(sha(f),meta.cloneSha256||meta.sha256,`clone source drift: ${f}`);
  assert.equal(fs.statSync(f).size,meta.cloneBytes||meta.bytes,`clone source size drift: ${f}`);
}
console.log('FIEZEL CLONE recovery regression: PASS');
