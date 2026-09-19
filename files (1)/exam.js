// exam.js — onlayn test jarayoni (taymer, savollar, natija)
import { S, myResults } from './store.js';
import { $, esc, clamp, closeScrim } from './utils.js';
import { ico } from './icons.js';
import { writeSafe } from './db.js';

export const EX = { ex:null, idx:0, answers:[], endsAt:0, timer:null };
export function startExam(id){
  const ex = S.exams.find(e => e.id === id); if(!ex || !(ex.questions||[]).length) return;
  EX.ex = ex; EX.idx = 0; EX.answers = new Array(ex.questions.length).fill(-1);
  EX.endsAt = Date.now() + (ex.minutes||15)*60000;
  $('#exTitle').textContent = ex.title;
  $('#examScrim').classList.add('on');
  paintExam();
  clearInterval(EX.timer);
  EX.timer = setInterval(tickExam, 500);
}
export function tickExam(){
  const left = Math.max(0, EX.endsAt - Date.now());
  const m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
  const el = $('#exTimer');
  el.textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  el.classList.toggle('low', left < 60000);
  if(left <= 0) finishExam(true);
}
export function paintExam(){
  const q = EX.ex.questions[EX.idx];
  $('#exProg').style.width = ((EX.idx+1)/EX.ex.questions.length*100)+'%';
  $('#exBody').innerHTML = '<div class="dim" style="margin-bottom:6px">'+(EX.idx+1)+' / '+EX.ex.questions.length+'</div>'+
    '<h3 style="margin-bottom:14px">'+esc(q.q)+'</h3>'+
    q.options.map((o,j) => '<div class="q-opt'+(EX.answers[EX.idx]===j?' sel':'')+'" data-pick="'+j+'">'+
      '<span class="k">'+String.fromCharCode(65+j)+'</span><span>'+esc(o)+'</span></div>').join('');
  $('#exPrev').disabled = EX.idx === 0;
  $('#exNext').textContent = EX.idx === EX.ex.questions.length-1 ? 'Yakunlash' : 'Keyingisi';
}
export async function finishExam(auto){
  clearInterval(EX.timer);
  const ex = EX.ex; if(!ex) return;
  const total = ex.questions.length;
  const correct = ex.questions.reduce((n,q,i) => n + (EX.answers[i] === q.answer ? 1 : 0), 0);
  const percent = Math.round(correct/total*100);
  closeScrim('#examScrim');
  EX.ex = null;

  if(S.db && S.me.id && !S.readOnly){
    const items = myResults().concat([{ examId:ex.id, title:ex.title, correct, total, percent, at:Date.now() }]).slice(-40);
    await writeSafe(() => S.db.doc('examResults/'+S.me.id).set({ items, updatedAt: Date.now() }));
  }

  $('#vwTitle').textContent = auto ? 'Vaqt tugadi' : 'Test yakunlandi';
  $('#vwSub').textContent = ex.title;
  $('#vwBody').innerHTML =
    '<div style="text-align:center;padding:10px 0 18px">'+
    '<div class="vl" style="font-family:\'Plus Jakarta Sans\';font-style:italic;font-weight:800;font-size:2.6rem;color:'+(percent>=80?'var(--ok)':percent>=60?'var(--warn)':'var(--danger)')+'">'+percent+'%</div>'+
    '<div class="muted">'+correct+' / '+total+' to\'g\'ri javob</div></div>'+
    ex.questions.map((q,i) => {
      const ok = EX.answers[i] === q.answer;
      return '<div class="item" style="padding:10px 0"><div class="ic" style="background:'+(ok?'var(--ok-soft)':'var(--danger-soft)')+';color:'+(ok?'var(--ok)':'var(--danger)')+'">'+ico(ok?'check':'x',16)+'</div>'+
        '<div class="bd"><b>'+esc(q.q)+'</b><p>To\'g\'ri javob: '+esc(q.options[q.answer])+'</p></div></div>';
    }).join('');
  $('#vwFoot').innerHTML = '<button class="btn" id="vwOk">Yopish</button>';
  $('#viewScrim').classList.add('on');
  $('#vwOk').onclick = () => closeScrim('#viewScrim');
}
