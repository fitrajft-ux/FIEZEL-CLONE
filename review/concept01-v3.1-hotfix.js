/* Concept 01 / iPhone 12 Classroom interaction hotfix v3.1 */
(function(){
  window.classroom=function(){
    return `<div class="classroom-shell">
      <section class="classroom-voice-fixed" aria-label="Fiezel voice presence">
        <div class="classroom-voice-row">
          <div class="ai-orb" id="tutorOrb"></div>
          <div class="classroom-voice-info">
            <span class="kicker">FIEZEL CLASSROOM · TUTOR V3</span>
            <h2>Fiezel is ready.</h2>
            <p>Voice presence stays here while you move through the lesson.</p>
            <div class="voicewave" id="tutorWave">${'<i></i>'.repeat(17)}</div>
          </div>
        </div>
      </section>
      <section class="classroom-scroll" id="classroomScroll">
        <div class="between"><div><span class="kicker">TEACHING BEAT · B1</span><h1 style="margin-bottom:3px">Human teaching beat.</h1></div><span class="pill">B1</span></div>
        <div class="caption" id="caption">Tap Play explanation.</div>
        <div class="subtitle" id="subtitle">Subtitle Indonesia akan mengikuti isi penjelasan.</div>
        <div class="smartboard" id="board"><span class="kicker" style="color:#87b7ff">SMART BOARD</span><h2 id="boardTitle">Past event vs result now</h2><div class="formula" id="formula">I lost my key yesterday. ↔ I've lost my key.</div><div class="board-item" id="bi1">• finished past story</div><div class="board-item" id="bi2">• past action with a result connected to now</div></div>
        <div class="teacher-controls" style="margin-top:7px"><button onclick="askTutor()">💬 Ask</button><button onclick="confusedTutor()">⇄ Confused</button><button onclick="slowerTutor()">🐌 Slower</button><button onclick="startTutor()">↻ Replay</button></div>
        <div class="play-row"><button class="btn accent" onclick="startTutor()">▶ Play explanation</button><button class="btn soft" onclick="document.getElementById('classroomScroll').scrollTo({top:0,behavior:'smooth'})">↑ Lesson top</button></div>
      </section>
    </div>`;
  };
})();