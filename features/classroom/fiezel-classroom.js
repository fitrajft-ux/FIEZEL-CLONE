/**
 * m025-33 FIEZEL Classroom Tutor.
 *
 * Flow is Category -> Topic -> Classroom, per the Classroom design. Fiezel explains in
 * English neural voice while an Indonesian subtitle runs as comprehension scaffolding.
 * The Indonesian bundle is NOT required: subtitles are authored text, so the lesson is
 * fully usable with only the mandatory English engine downloaded.
 *
 * Deliberately kept as a pure state machine plus a renderer, with no direct DOM or
 * runtime imports, so it is unit-testable in Node without a browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelClassroom = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PHASES = ['category', 'topic', 'teach', 'quiz', 'summary'];

  function createSession(pack) {
    if (!pack || pack.schema !== 'fiezel-classroom-lessons-v1') throw new Error('classroom_pack_invalid');
    var state = { phase:'category', categoryId:null, lessonId:null, segmentIndex:0, questionIndex:0, attempts:0, correct:0, wrong:0, remediating:false, finished:false };
    function categories(){ return pack.categories.slice(); }
    function lessonsIn(categoryId){ return pack.lessons.filter(function(l){ return l.category===categoryId; }); }
    function lesson(){ if(!state.lessonId)return null; return pack.lessons.filter(function(l){return l.id===state.lessonId;})[0]||null; }
    function chooseCategory(id){ if(!pack.categories.some(function(c){return c.id===id;}))throw new Error('unknown_category');state.categoryId=id;state.phase='topic';return snapshot(); }
    function chooseLesson(id){ var found=pack.lessons.filter(function(l){return l.id===id;})[0];if(!found)throw new Error('unknown_lesson');state.lessonId=id;state.categoryId=found.category;state.phase='teach';state.segmentIndex=0;state.questionIndex=0;state.attempts=0;state.correct=0;state.wrong=0;state.remediating=false;state.finished=false;return snapshot(); }
    function currentSegment(){ var l=lesson();if(!l||state.phase!=='teach')return null;return l.segments[state.segmentIndex]||null; }
    function nextSegment(){ var l=lesson();if(!l||state.phase!=='teach')return snapshot();if(state.segmentIndex<l.segments.length-1)state.segmentIndex++;else state.phase='quiz';return snapshot(); }
    function currentQuestion(){ var l=lesson();if(!l||state.phase!=='quiz')return null;return l.questions[state.questionIndex]||null; }
    function advanceQuestion(){ var l=lesson();if(state.questionIndex<l.questions.length-1)state.questionIndex++;else{state.phase='summary';state.finished=true;} }
    function answer(optionIndex){ var q=currentQuestion();if(!q)throw new Error('no_active_question');state.attempts++;var right=Number(optionIndex)===Number(q.answerIndex);var wasRemediating=state.remediating;var result={correct:right,scored:!wasRemediating,feedback:right?q.explain:q.remediate,retry:false,advanced:false};if(right){if(!wasRemediating)state.correct++;state.remediating=false;advanceQuestion();result.advanced=true;}else if(!wasRemediating){state.wrong++;state.remediating=true;result.retry=true;}else{state.remediating=false;result.feedback=q.explain;advanceQuestion();result.advanced=true;}return{snapshot:snapshot(),result:result}; }
    function snapshot(){ var l=lesson();return{phase:state.phase,categoryId:state.categoryId,lessonId:state.lessonId,topic:l?l.topic:null,level:l?l.level:null,board:l?l.board:null,segmentIndex:state.segmentIndex,segmentCount:l?l.segments.length:0,questionIndex:state.questionIndex,questionCount:l?l.questions.length:0,correct:state.correct,wrong:state.wrong,attempts:state.attempts,remediating:state.remediating,finished:state.finished,scorePercent:(l&&l.questions.length)?Math.round((state.correct/l.questions.length)*100):0}; }
    function reset(){state.phase='category';state.categoryId=null;state.lessonId=null;state.segmentIndex=0;state.questionIndex=0;state.attempts=0;state.correct=0;state.wrong=0;state.remediating=false;state.finished=false;return snapshot();}
    return{phases:PHASES.slice(),categories:categories,lessonsIn:lessonsIn,lesson:lesson,chooseCategory:chooseCategory,chooseLesson:chooseLesson,currentSegment:currentSegment,nextSegment:nextSegment,currentQuestion:currentQuestion,answer:answer,snapshot:snapshot,reset:reset};
  }
  return Object.freeze({createSession:createSession,PHASES:PHASES.slice()});
}));
