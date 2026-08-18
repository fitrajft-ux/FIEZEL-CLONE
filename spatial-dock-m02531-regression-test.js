'use strict';
const assert=require('assert');
const fs=require('fs');

const INDEX=fs.readFileSync('index.html','utf8');
const DOCK=fs.readFileSync('features/spatial-dock/spatial-dock.js','utf8');
const HOTFIX=fs.readFileSync('features/spatial-dock/spatial-dock-hotfix.js','utf8');
const HOTFIX_CSS=fs.readFileSync('features/spatial-dock/spatial-dock-hotfix.css','utf8');
const IDVOICE=fs.readFileSync('features/neural-voice/fiezel-indonesian-voice-bridge.js','utf8');
const LUCIDE=fs.readFileSync('lucide.min.js','utf8');
const SW=fs.readFileSync('sw.js','utf8');
const stripComments=src=>src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const IDVOICE_CODE=stripComments(IDVOICE);

// 1. The iPhone dock must expose five identifiable actions, not blank tap zones.
for(const label of ['Home','Learn','Tutor','Evidence','Me']) assert.ok(DOCK.includes('>'+label+'</span>'),`dock label ${label} missing`);
assert.match(HOTFIX_CSS,/bottomnav \.nav span\{display:block!important\}/,'mobile labels must override the old hidden-label rule');
assert.match(HOTFIX,/data-sd-nav=\\?"learn\\?"[\s\S]*book-a/,'Learn must be remapped to an icon present in the Lucide subset');
assert.match(HOTFIX,/data-sd-nav=\\?"me\\?"[\s\S]*settings-2/,'Me must be remapped to an icon present in the Lucide subset');
assert.ok(LUCIDE.includes('"book-a"'),'book-a icon missing from Lucide subset');
assert.ok(LUCIDE.includes('"settings-2"'),'settings-2 icon missing from Lucide subset');
assert.ok(!/style\.visibility\s*=\s*['"]visible/.test(HOTFIX),'hotfix must not bypass notification-locked navigation visibility');

// 2. Indonesian speech must be real local neural speech, not subtitle-only or browser TTS.
assert.ok(INDEX.indexOf('fiezel-indonesian-voice-bridge.js')>-1,'Indonesian voice bridge must load');
assert.ok(INDEX.indexOf('fiezel-indonesian-voice-bridge.js')<INDEX.indexOf('spatial-dock-hotfix.js'),'Indonesian bridge must load before Classroom hotfix');
assert.match(IDVOICE,/SOURCE_SHA='626340630e28358c5757484535a2c0fc0e62eee8'/,'APPS source commit must be pinned in the bridge');
assert.match(IDVOICE,/\/FIEZEL-APPS\/vendor\/sherpa-vits-id\//,'bridge must source the proven sibling Indonesian runtime');
assert.match(IDVOICE,/MODEL_ID='vits-piper-id_ID-news_tts-medium'/,'Indonesian neural model must be explicit');
assert.match(IDVOICE,/language:'id-ID'/,'status must identify Indonesian');
assert.match(IDVOICE,/lang:'id-ID'/,'speech request must identify Indonesian');
assert.match(IDVOICE,/allowFallback:false/,'Indonesian neural speech must never degrade to browser TTS');
assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(IDVOICE_CODE),'browser TTS is forbidden in executable Indonesian bridge code');
assert.match(IDVOICE,/totalBytes:TOTAL_BYTES/,'bundle size must be exposed to UI/status');
for(const bytes of ['109876','33227','2677','13474133','80939086']) assert.ok(IDVOICE.includes('bytes:'+bytes),`asset byte pin ${bytes} missing`);
assert.match(HOTFIX,/sdSubtitle/,'Classroom speech must read the authored Indonesian tutor line');
assert.match(HOTFIX,/Download suara Indonesia · 95 MB/,'Classroom must expose explicit Indonesian bundle download control');
assert.match(HOTFIX,/indo\.speak\(spoken/,'prepared Classroom speech must route through Indonesian neural service');

// 3. Installed PWA must retain this repair and the optional model across shell releases.
for(const asset of [
  './features/neural-voice/fiezel-indonesian-voice-bridge.js',
  './features/spatial-dock/spatial-dock-hotfix.css',
  './features/spatial-dock/spatial-dock-hotfix.js'
]) assert.ok(SW.includes("'"+asset+"'"),`hotfix shell asset not precached: ${asset}`);
assert.match(SW,/SW_REV='m025-30-hotfix-taskbar-id-voice-20260819-1'/,'hotfix must have a distinct shell revision');
assert.match(SW,/sherpa-vits-id/,'optional Indonesian neural bundle must be classified by the stable neural cache path');
assert.match(SW,/const CACHE=`fiezel-clone-v\$\{self\.FIEZEL_VERSION\}`/,'stable neural cache identity must remain unchanged');

console.log('FIEZEL m025-31 Spatial Dock + Indonesian neural voice regression: PASS');
