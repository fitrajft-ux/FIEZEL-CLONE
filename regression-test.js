const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const V=JSON.parse(fs.readFileSync(path.join(root,'vocabulary-master.json'),'utf8'));
const grammarRuntime=gm=>{const out={};for(const t of (gm.templates||[])){const opts=t.options||[];const reasons=opts.map((o,i)=>i===t.correctIndex?'Correct':((t.distractors||[]).find(d=>d.option===o)?.whyFails||'Distractor invalid'));(out[t.subskill]??=[]).push([t.stem,opts,t.correctIndex,t.explanation?.rule||t.pedagogicalObjective,reasons,t.cefr]);}return out};
const GM=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8'));const G=grammarRuntime(GM);const R=JSON.parse(fs.readFileSync(path.join(root,'reading-bank.json'),'utf8'));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

assert(/const APP_VERSION=self\.FIEZEL_VERSION/.test(app)&&fs.readFileSync(path.join(root,'version.js'),'utf8').includes(`'${VERSION}'`),'runtime version matches VERSION.json');
assert(html.indexOf('https://js.puter.com/v2/')>=0&&html.indexOf('https://js.puter.com/v2/')<html.indexOf('./version.js'),'Puter.js must load before FIEZEL runtime scripts');
assert(/async function askFiezelAI/.test(app)&&/coreWorkerExec\('\/api\/ai\/chat'/.test(app)&&!/puter\.ai\.chat\(/.test(app),'Core-only Puter AI gateway missing or direct bypass present');
assert(/function openAILoading/.test(app)&&/function renderAIResult/.test(app)&&/function renderAIError/.test(app),'AI modal states missing');
assert(/id="aiExplainBtn"/.test(app)&&/id="aiWord"/.test(app),'AI entry buttons missing');
assert(/window\.explainWithAI=explainWithAI/.test(app)&&/window\.explainWordWithAI=explainWordWithAI/.test(app),'AI handlers are not exposed');
assert(/esc\(text\)\.replace/.test(app)&&/esc\(aiErrorMessage\(err\)\)/.test(app),'AI response or error is not escaped');
assert(/FIEZEL_AI_TIMEOUT_MS=30000/.test(app)&&/currentAIRequest\(id,epoch\)/.test(app)&&/id="aiRetry"/.test(app),'AI resilience guards are missing');
assert(/q\.explain\?\.avoid/.test(app)&&/q\.explain\?\.memory/.test(app)&&/distractor-breakdown/.test(app),'natural feedback dropped explanation fields');
assert(/\.ai-btn/.test(css)&&/@keyframes aiBounce/.test(css),'AI visual states missing');
assert(/adaptiveReady/.test(app),'adaptive readiness state missing');
assert(/nextReview&&x\.nextReview<=Date\.now\(\)&&x\.mastery<80/.test(app),'review due must exclude mastered cards');
assert(/function markMastered/.test(app)&&/b\.nextReview=0/.test(app),'mastered cards do not clear review schedule');
assert(/function bindSwipe/.test(app)&&/touchstart/.test(app)&&/touchend/.test(app),'swipe controller missing');
assert(/flash-inner/.test(app)&&/rotateY/.test(css),'3D flip implementation missing');
assert(!/id="previous"/.test(app)&&!/id="next"/.test(app.split('function flashcards')[1]?.split('function reviewVocab')[0]||''),'flashcards still expose previous/next buttons');
assert(/function getDiagnosticProfile/.test(app)&&/weakTargets/.test(app),'adaptive diagnostic profile missing');
assert(/function setConfidence/.test(app)&&/confidenceHistory/.test(app),'confidence calibration missing');
// m025-46: the brief is pinned by what renders it, not by a shouting copy string.
// The all-caps kicker was removed as a design decision; the ring, the target and the
// function are the feature. This is a stricter marker than the label it replaces.
assert(/function dailyBrief/.test(app)&&/mission-ring/.test(app)&&/MEANINGFUL_ATTEMPTS/.test(app),'daily learning brief missing');
assert(/Peta Belajar & Lab/.test(app)&&/Lab Kesalahan/.test(app)&&/Linimasa Kelemahan/.test(app),'learning map/labs missing');
assert(/Jaringan Kekeliruan Kosakata/.test(app)&&/Peta Skill Reading/.test(app),'skill/confusion maps missing');
assert(/Laporan Diagnostik/.test(app)&&/Dibuat oleh Fitrarustqi/.test(app),'diagnostic/creator product surface missing');
assert(/GRAMMAR_SESSION_SIZE=25/.test(app)&&/buildGrammarLessonQuestions/.test(app),'25-question grammar lesson contract missing');
assert(/getCelestialState/.test(app)&&/playFeedbackSound/.test(app)&&/showAnswerBurst/.test(app),'realtime sky or answer feedback system missing');
assert(/if\(!state\.adaptiveReady\)return \[\]/.test(app),'adaptive pool must be locked before diagnosis');
assert(/passage:\{id:r\.id/.test(app),'reading questions do not carry their passage');
assert(/q\.passage\?card\(.*TEKS BACAAN/s.test(app),'quiz renderer does not show passage with reading question');
assert(/state\.adaptiveReady=diagnosticEvidenceReady\(state\)/.test(app),'adaptive readiness must be evidence-based');
assert(/window\.__getFiezelState/.test(app),'test state hook missing');
assert(V.length===1765,'active vocabulary master count changed unexpectedly');
assert(V.filter(v=>v.status==='complete').length===1765,'active vocabulary contains incomplete records');
assert(V.some(v=>v.level==='C2'&&v.status==='complete'),'C2 vocabulary is missing');
assert(Object.keys(G).length===129,'grammar skills changed unexpectedly');
assert(R.length===300,'reading bank unexpectedly reduced');
for(const r of R)for(const q of r.qs||[]){assert(Array.isArray(q[1])&&q[1].length>=2,'reading question has too few options');const opts=q[1].map(x=>String(x).trim().toLowerCase());assert(new Set(opts).size===opts.length,`duplicate reading options in ${r.id}`);assert(Number.isInteger(q[2])&&q[2]>=0&&q[2]<q[1].length,`invalid reading answer in ${r.id}`)}

const elements={};
function element(id){return elements[id] ||= {id,innerHTML:'',textContent:'',onclick:null,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){}};}
const document={baseURI:'http://localhost/',getElementById:element,querySelector(){return null},querySelectorAll(){return []},createElement(){return {className:'',textContent:'',disabled:false,onclick:null,classList:{add(){},remove(){},toggle(){}},append(){},addEventListener(){}}}};
const store={};
const localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};const Notification=function(title,options){this.title=title;this.options=options;this.close=()=>{};};Notification.permission='granted';Notification.requestPermission=async()=>Notification.permission;
const fetch=async url=>{const file=String(url).split('/').pop();return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
const ctx={console,Notification,self:null,document,localStorage,fetch,location:{href:'http://localhost/'},window:{},Date,Math,URL,setTimeout,clearTimeout};
ctx.window=ctx;ctx.self=ctx;ctx.window.scrollTo=()=>{};ctx.window.speechSynthesis={cancel(){},speak(){}};ctx.window.SpeechSynthesisUtterance=function(text){this.text=text};
vm.createContext(ctx);vm.runInContext(app,ctx,{filename:'app.js'});
setTimeout(()=>{
 try{
  const st=ctx.__getFiezelState();
  assert(st.totalAnswered===0&&!st.adaptiveReady,'new user is not cleanly initialized');
  assert(Object.keys(st.vocab).length===0,'new user has seeded vocabulary mastery/review');
  ctx.go('vocab'); assert(/Review Due \(0\)/.test(elements.app.innerHTML),'new user should have zero Review Due');

  const v=V.find(x=>x.status==='complete');
  st.vocab[v.id]={correct:0,total:0,streak:0,mastery:0,nextReview:0};
  ctx.updateMastery('vocab',v.id,true);
  assert(st.vocab[v.id].mastery<80&&st.vocab[v.id].nextReview>Date.now(),'a single correct answer must not instantly mark a new card mastered');
  st.vocab[v.id].nextReview=Date.now()-1000;
  assert(Object.values(st.vocab).filter(x=>x.nextReview<=Date.now()&&x.mastery<80).length===1,'due review setup failed');
  ctx.markMastered('vocab',v.id);
  assert(st.vocab[v.id].mastery===100&&st.vocab[v.id].nextReview===0,'mastering a card must remove it from Review Due');

  // Before diagnosis: no adaptive questions.
  st.adaptiveReady=false; assert(ctx.buildAdaptivePool(12).length===0,'adaptive questions appeared before diagnosis');
  // Simulate a diagnosis/profile with weaknesses across vocabulary, grammar and reading.
  const vv=V.find(x=>x.level==='A1'&&x.status==='complete')||v;
  const skills=Object.keys(G).slice(0,3); const rrs=R.slice(0,3); const skill=skills[0]; const rr=rrs[0];
  st.vocab[vv.id]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  for(const sk of skills)st.grammar[sk]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  for(const r of rrs)st.reading[r.id]={correct:1,total:4,streak:0,mastery:25,nextReview:Date.now()+1000};
  st.totalAnswered=150; st.adaptiveReady=true;
  const pool=ctx.buildAdaptivePool(12); assert(pool.length===12,'adaptive pool does not produce 12 questions');
  const domains=new Set(pool.map(x=>x.domain)); assert(domains.has('vocab')&&domains.has('grammar')&&domains.has('reading'),'adaptive pool does not mix all diagnosed domains');
  const grammarQs=pool.filter(x=>x.domain==='grammar'); assert(grammarQs.length&&grammarQs.some(x=>skills.includes(x.skill)),'adaptive grammar does not target weak skill');
  const readingQ=pool.find(x=>x.domain==='reading'); assert(readingQ&&readingQ.passage&&readingQ.passage.id,'adaptive reading lost passage context');
  ctx.renderQuiz([readingQ],'adaptive'); assert(/TEKS BACAAN/.test(elements.app.innerHTML),'reading passage is not rendered with adaptive question');
  console.log('FIEZEL regression checks: PASS');
  console.log(JSON.stringify({adaptive:pool.length,placement:st.totalAnswered,placementDifficulty:ctx.__getPlacementDifficultyCounts?ctx.__getPlacementDifficultyCounts():null,levelSourceCounts:ctx.__getLevelSourceCounts?ctx.__getLevelSourceCounts():null,newUserReviewDue:0,adaptiveLockedBeforeDiagnosis:true,readingPassageAttached:true}));
 }catch(e){console.error(e);process.exitCode=1}
},20);
