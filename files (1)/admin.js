// admin.js — boshqaruv panelini chizish
import { S, roster, allSubs, taskById, isStaff, examTakers } from './store.js';
import { $, esc, when, dateLabel, emptyState } from './utils.js';
import { ico } from './icons.js';

export function renderAdmin(){
  if(!isStaff()) return;
  $('#adminWho').textContent = S.isOwner ? 'Egasi' : 'Tahrirchi';

  // queue
  let q = allSubs();
  if(S.filters.queue) q = q.filter(s => (s.status||'pending') === S.filters.queue);
  $('#queueList').innerHTML = q.length ? q.map(s => {
    const t = taskById(s.taskId);
    const st = s.status || 'pending';
    const chip = st==='graded' ? '<span class="tag ok">'+s.score+' ball</span>'
      : st==='returned' ? '<span class="tag bad">Qaytarilgan</span>' : '<span class="tag warn">Yangi</span>';
    return '<div class="item"><div class="ic">'+ico('inbox')+'</div>'+
      '<div class="bd"><b>'+esc(s.studentName)+' · '+esc(s.className)+'</b>'+
      '<p>'+esc(t?t.title:'topshiriq o\'chirilgan')+' — '+esc(s.note||'izohsiz')+'</p>'+
      '<p class="dim">'+when(s.at)+'</p></div>'+chip+
      '<button class="btn sm" data-review="'+esc(s.owner)+'|'+esc(s.id)+'">Ko\'rish</button></div>';
  }).join('') : emptyState('inbox',"Navbat bo'sh","Bu holatda ish yo'q.");

  // grades
  let g = roster().sort((a,b)=>a.name.localeCompare(b.name));
  if(S.filters.grade) g = g.filter(r => r.name.toLowerCase().includes(S.filters.grade.toLowerCase()));
  $('#gradeRows').innerHTML = g.length ? g.map(r => {
    const sc = Object.keys(r.subjects||{}).length;
    return '<tr><td><b>'+esc(r.name)+'</b></td><td>'+esc(r.className)+'</td>'+
      '<td>'+r.bsb+'</td><td>'+r.chsb+'</td><td class="dim">'+(sc?sc+' fan':'—')+'</td>'+
      '<td style="text-align:right"><button class="btn sm ghost" data-grade="'+esc(r.id)+'">'+ico('edit',14)+'Tahrirlash</button></td></tr>';
  }).join('') : '<tr><td colspan="6">'+emptyState('users',"O'quvchi yo'q")+'</td></tr>';

  // tasks
  $('#taskRows').innerHTML = S.tasks.length ? S.tasks.map(t => {
    const cnt = allSubs().filter(s => s.taskId === t.id).length;
    return '<tr><td><b>'+esc(t.title)+'</b></td>'+
      '<td><span class="tag '+(t.type==='chsb'?'chsb':'bsb')+'">'+(t.type==='chsb'?'CHSB':'BSB')+'</span></td>'+
      '<td>'+esc(t.subject||'—')+'</td><td class="dim">'+dateLabel(t.deadline)+'</td><td>'+cnt+'</td>'+
      '<td style="text-align:right"><button class="btn sm ghost" data-edit-task="'+esc(t.id)+'">'+ico('edit',14)+'</button> '+
      '<button class="btn icon ghost" data-del-task="'+esc(t.id)+'">'+ico('trash',14)+'</button></td></tr>';
  }).join('') : '<tr><td colspan="6">'+emptyState('file',"Topshiriq yo'q")+'</td></tr>';

  // exams
  $('#examRows').innerHTML = S.exams.length ? S.exams.map(ex => {
    return '<tr><td><b>'+esc(ex.title)+'</b></td><td>'+esc(ex.subject||'—')+'</td>'+
      '<td>'+((ex.questions||[]).length)+'</td><td>'+(ex.minutes||15)+' daq</td>'+
      '<td class="dim">'+examTakers(ex.id)+'</td>'+
      '<td style="text-align:right"><button class="btn sm ghost" data-edit-exam="'+esc(ex.id)+'">'+ico('edit',14)+'</button> '+
      '<button class="btn icon ghost" data-del-exam="'+esc(ex.id)+'">'+ico('trash',14)+'</button></td></tr>';
  }).join('') : '<tr><td colspan="6">'+emptyState('quiz',"Test yo'q")+'</td></tr>';

  // announcements
  $('#annList').innerHTML = S.anns.length ? S.anns.map(a =>
    '<div class="item"><div class="ic">'+ico('bell')+'</div><div class="bd"><b>'+esc(a.title)+'</b>'+
    '<p>'+esc(a.body)+'</p><p class="dim">'+when(a.createdAt)+'</p></div>'+
    '<button class="btn icon ghost" data-del-ann="'+esc(a.id)+'">'+ico('trash',14)+'</button></div>').join('')
    : emptyState('bell',"E'lon yo'q");
}
