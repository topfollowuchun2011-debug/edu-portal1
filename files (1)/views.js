// views.js — foydalanuvchi ko'radigan bo'limlarni chizish
import { S, roster, ranked, level, allSubs, mySubs, myResults, taskById,
         classList, isStaff, myStudent, examTakers } from './store.js';
import { $, $$, esc, when, dateLabel, daysLeft, clamp, emptyState, fillSelect } from './utils.js';
import { ico } from './icons.js';

export function renderDashboard(){
  const a = S.anns[0];
  $('#dashBanner').innerHTML = a
    ? '<div class="banner"><span style="flex:none;margin-top:2px">'+ico('bell',24)+'</span><div><h3>'+esc(a.title)+'</h3><p>'+esc(a.body)+'</p><div class="when">'+when(a.createdAt)+'</div></div></div>'
    : '';

  const r = roster();
  const graded = r.filter(x => x.bsb || x.chsb);
  const avg = graded.length ? Math.round(graded.reduce((s,x)=>s+x.total,0)/graded.length) : 0;
  const pend = allSubs().filter(s => (s.status||'pending')==='pending').length;
  const open = S.tasks.filter(t => { const d = daysLeft(t.deadline); return d === null || d >= 0; }).length;

  const cards = [
    { lb:"O'quvchilar", vl:r.length, sub:S.settings.quarter, icon:'users', col:'var(--brand)', bg:'var(--brand-soft)' },
    { lb:"Faol topshiriqlar", vl:open, sub:S.tasks.length+" tadan", icon:'file', col:'var(--warn)', bg:'var(--warn-soft)' },
    { lb:"O'rtacha ball", vl:avg, sub:graded.length+" o'quvchi baholangan", icon:'chart', col:'var(--ok)', bg:'var(--ok-soft)' },
  ];
  if(isStaff()) cards.push({ lb:"Tekshiruv kutmoqda", vl:pend, sub:"yuborilgan ish", icon:'inbox', col:'var(--danger)', bg:'var(--danger-soft)' });
  $('#dashStats').innerHTML = cards.map(c =>
    '<div class="stat"><div class="ic" style="background:'+c.bg+';color:'+c.col+'">'+ico(c.icon,20)+'</div>'+
    '<div><div class="lb">'+esc(c.lb)+'</div><div class="vl">'+c.vl+'</div><div class="sub">'+esc(c.sub)+'</div></div></div>').join('');

  // subject averages
  const acc = {};
  r.forEach(st => Object.keys(st.subjects||{}).forEach(k => {
    const v = Number(st.subjects[k]); if(!isFinite(v)) return;
    (acc[k] = acc[k] || []).push(v);
  }));
  const subs = Object.keys(acc).map(k => ({ k, v: Math.round(acc[k].reduce((a,b)=>a+b,0)/acc[k].length) }))
                 .sort((a,b)=>b.v-a.v);
  $('#chartMeta').textContent = subs.length ? subs.length+' fan' : '';
  $('#subjectBars').innerHTML = subs.length
    ? subs.map(s => barRow(s.k, s.v)).join('')
    : emptyState('chart',"Hali baho kiritilmagan","Boshqaruv panelidan fan baholarini kiriting.");

  // class averages
  const cl = {};
  r.forEach(st => { if(st.total) (cl[st.className] = cl[st.className]||[]).push(st.total); });
  const cls = Object.keys(cl).map(k => ({ k, v: Math.round(cl[k].reduce((a,b)=>a+b,0)/cl[k].length) })).sort((a,b)=>b.v-a.v);
  $('#classBars').innerHTML = cls.length
    ? cls.map(c => barRow(c.k, c.v, cl[c.k].length+" o'quvchi")).join('')
    : emptyState('users',"Sinf ma'lumoti yo'q");

  // deadlines
  const soon = S.tasks.filter(t => t.deadline).map(t => ({t, d: daysLeft(t.deadline)}))
                .filter(x => x.d !== null && x.d >= 0).sort((a,b)=>a.d-b.d).slice(0,5);
  $('#dashDeadlines').innerHTML = soon.length ? soon.map(x =>
    '<div class="item"><div class="ic">'+ico(x.t.type==='chsb'?'award':'file')+'</div>'+
    '<div class="bd"><b>'+esc(x.t.title)+'</b><p>'+esc(x.t.subject||'')+'</p></div>'+
    '<span class="tag '+(x.d<=2?'bad':x.d<=5?'warn':'ok')+'">'+(x.d===0?'Bugun':x.d+' kun')+'</span></div>'
  ).join('') : emptyState('clock',"Yaqin muddat yo'q","Barcha topshiriqlar topshirilgan.");

  // activity feed
  const feed = [];
  allSubs().slice(0,6).forEach(s => {
    const t = taskById(s.taskId);
    feed.push({ at:s.at, icon:'upload', text:(isStaff()? s.studentName : 'Ish') + ' — ' + (t?t.title:'topshiriq'),
                sub: s.status==='graded' ? 'baholandi · '+s.score+' ball' : s.status==='returned' ? 'qaytarildi' : 'tekshiruvda' });
  });
  S.anns.slice(0,3).forEach(a => feed.push({ at:a.createdAt, icon:'bell', text:a.title, sub:"e'lon" }));
  S.tasks.slice(0,3).forEach(t => feed.push({ at:t.createdAt, icon:'file', text:t.title, sub:"yangi topshiriq" }));
  feed.sort((a,b)=>(b.at||0)-(a.at||0));
  $('#dashFeed').innerHTML = feed.length ? feed.slice(0,6).map(f =>
    '<div class="item"><div class="ic">'+ico(f.icon)+'</div><div class="bd"><b>'+esc(f.text)+'</b><p>'+esc(f.sub)+'</p></div>'+
    '<span class="dim">'+when(f.at)+'</span></div>').join('')
    : emptyState('inbox',"Harakatlar yo'q","Birinchi topshiriq qo'shilganda shu yerda ko'rinadi.");
}
export function barRow(label, v, note){
  return '<div class="bar-row"><span title="'+esc(label)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(label)+
    (note?'<br><span class="dim" style="font-size:.68rem">'+esc(note)+'</span>':'')+
    '</span><span class="bar-track"><i class="bar-fill" style="width:'+clamp(v,0,100)+'%"></i></span><b>'+v+'</b></div>';
}

export function renderRating(){
  const top = ranked().filter(x => x.total > 0).slice(0,3);
  $('#podium').innerHTML = top.length === 0 ? '' : top.map((s,i) =>
    '<div class="pod p'+(i+1)+'"><div class="rank g'+(i+1)+'" style="margin:0 auto 8px">'+(i+1)+'</div>'+
    '<div class="nm">'+esc(s.name)+'</div><div class="dim">'+esc(s.className)+'</div>'+
    '<div class="sc">'+s.total+'</div></div>').join('');

  fillSelect('#ratingClass', classList(), S.filters.ratingClass, 'Barcha sinflar');

  let rows = ranked().map((s,i) => Object.assign({rank:i+1}, s));
  const q = S.filters.rating.toLowerCase();
  if(q) rows = rows.filter(r => r.name.toLowerCase().includes(q));
  if(S.filters.ratingClass) rows = rows.filter(r => r.className === S.filters.ratingClass);

  const k = S.sort.key, dir = S.sort.dir === 'asc' ? 1 : -1;
  if(k !== 'total' || S.filters.rating || S.filters.ratingClass){
    rows.sort((a,b) => typeof a[k] === 'string' ? dir*a[k].localeCompare(b[k]) : dir*(a[k]-b[k]));
  }
  rows = rows.slice(0, Number(S.prefs.pageSize)||20);

  $('#ratingRows').innerHTML = rows.length ? rows.map(r => {
    const lv = level(r.total);
    const rk = r.rank <= 3 ? 'rank g'+r.rank : 'rank';
    return '<tr><td><span class="'+rk+'">'+r.rank+'</span></td>'+
      '<td><b>'+esc(r.name)+'</b>'+(r.id===S.me.id?' <span class="tag bsb">siz</span>':'')+'</td>'+
      '<td>'+esc(r.className)+'</td><td>'+r.bsb+'</td><td>'+r.chsb+'</td>'+
      '<td><b>'+r.total+'</b></td><td><span class="tag '+lv.c+'">'+lv.t+'</span></td></tr>';
  }).join('') : '<tr><td colspan="7">'+emptyState('trophy',"Natija topilmadi","Qidiruvni o'zgartirib ko'ring.")+'</td></tr>';
}



export function renderStudents(){
  fillSelect('#stClass', classList(), S.filters.studentClass, 'Barcha sinflar');
  let rows = roster().sort((a,b)=>a.name.localeCompare(b.name));
  const q = S.filters.student.toLowerCase();
  if(q) rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.className.toLowerCase().includes(q));
  if(S.filters.studentClass) rows = rows.filter(r => r.className === S.filters.studentClass);
  $('#stCount').textContent = rows.length + " ta yozuv";

  $('#studentRows').innerHTML = rows.length ? rows.map(r =>
    '<tr><td><div class="who"><span class="av-fb" style="width:30px;height:30px;font-size:.8rem">'+esc(r.name.charAt(0).toUpperCase())+'</span><b>'+esc(r.name)+'</b></div></td>'+
    '<td>'+esc(r.className)+'</td><td>'+r.bsb+'</td><td>'+r.chsb+'</td><td class="dim">'+when(r.joinedAt)+'</td>'+
    '<td style="text-align:right">'+(isStaff()
      ? '<button class="btn sm ghost" data-grade="'+esc(r.id)+'">Baholash</button> <button class="btn icon ghost" data-del-st="'+esc(r.id)+'" title="O\'chirish">'+ico('trash',15)+'</button>'
      : '')+'</td></tr>').join('')
    : '<tr><td colspan="6">'+emptyState('users',"O'quvchi topilmadi","Ro'yxatdan o'tgan o'quvchilar shu yerda ko'rinadi.")+'</td></tr>';
}

export function taskCard(t){
  const d = daysLeft(t.deadline);
  const chip = t.type === 'chsb' ? '<span class="tag chsb">CHSB</span>' : '<span class="tag bsb">BSB</span>';
  const due = t.deadline
    ? '<span class="tag '+(d===null?'':d<0?'bad':d<=2?'warn':'ok')+'">'+ico('clock',13)+(d===null?'—':d<0?'Muddat tugagan':dateLabel(t.deadline))+'</span>'
    : '';
  const mine = mySubs().filter(s => s.taskId === t.id);
  const last = mine[mine.length-1];
  const statusChip = last
    ? (last.status === 'graded' ? '<span class="tag ok">'+ico('check',13)+last.score+' ball</span>'
      : last.status === 'returned' ? '<span class="tag bad">Qayta ishlang</span>'
      : '<span class="tag warn">Tekshiruvda</span>')
    : '';
  const file = t.fileUrl
    ? '<a class="btn sm ghost" href="'+esc(t.fileUrl)+'" target="_blank" rel="noopener">'+ico('download',15)+'Fayl</a>'
    : '';
  return '<div class="card"><div class="card-h"><h3>'+esc(t.title)+'</h3>'+chip+'</div>'+
    '<div class="pad"><p class="muted" style="font-size:.86rem;min-height:38px">'+esc(t.about||'Tavsif kiritilmagan.')+'</p>'+
    '<div class="row" style="margin:12px 0">'+due+
      '<span class="tag">'+esc(t.subject||'Umumiy')+'</span>'+
      '<span class="tag">Maks '+(t.maxScore||100)+'</span>'+statusChip+'</div>'+
    '<div class="row">'+file+
      '<button class="btn sm" data-submit-for="'+esc(t.id)+'">'+ico('send',15)+'Ish yuborish</button>'+
      (isStaff()?'<button class="btn sm ghost" data-edit-task="'+esc(t.id)+'">'+ico('edit',15)+'</button>':'')+
    '</div></div></div>';
}

export function renderTasks(){
  fillSelect('#bsbSubject', S.settings.subjects, S.filters.bsbSubject, 'Barcha fanlar');
  let bsb = S.tasks.filter(t => t.type !== 'chsb');
  const q = S.filters.bsb.toLowerCase();
  if(q) bsb = bsb.filter(t => (t.title+' '+(t.subject||'')+' '+(t.about||'')).toLowerCase().includes(q));
  if(S.filters.bsbSubject) bsb = bsb.filter(t => t.subject === S.filters.bsbSubject);
  $('#bsbList').innerHTML = bsb.length ? bsb.map(taskCard).join('')
    : '<div class="card">'+emptyState('file',"BSB topshirig'i yo'q", isStaff()?"Yuqoridagi tugma orqali birinchisini qo'shing.":"O'qituvchi topshiriq qo'shganda shu yerda ko'rinadi.")+'</div>';

  const chsb = S.tasks.filter(t => t.type === 'chsb');
  $('#chsbList').innerHTML = chsb.length ? chsb.map(taskCard).join('')
    : '<div class="card">'+emptyState('award',"CHSB imtihoni yo'q","Chorak nazorati e'lon qilinmagan.")+'</div>';

  $('#newBsbBtn').style.display = isStaff() ? '' : 'none';
  $('#newChsbBtn').style.display = isStaff() ? '' : 'none';
}

export function renderExamView(){
  $('#newExamBtn').style.display = isStaff() ? '' : 'none';
  $('#examList').innerHTML = S.exams.length ? S.exams.map(ex => {
    const done = myResults().filter(r => r.examId === ex.id);
    const best = done.length ? Math.max.apply(null, done.map(r => r.percent)) : null;
    return '<div class="card"><div class="card-h"><h3>'+esc(ex.title)+'</h3><span class="tag chsb">Test</span></div>'+
      '<div class="pad"><div class="row" style="margin-bottom:12px">'+
        '<span class="tag">'+esc(ex.subject||'Umumiy')+'</span>'+
        '<span class="tag">'+((ex.questions||[]).length)+' savol</span>'+
        '<span class="tag">'+ico('clock',13)+(ex.minutes||15)+' daqiqa</span>'+
        (best !== null ? '<span class="tag ok">Eng yaxshi: '+best+'%</span>' : '')+
      '</div>'+
      '<button class="btn block" data-start-exam="'+esc(ex.id)+'">'+ico('quiz',16)+(done.length?'Qayta topshirish':'Testni boshlash')+'</button>'+
      '</div></div>';
  }).join('') : '<div class="card">'+emptyState('quiz',"Test yo'q","Onlayn testlar e'lon qilinmagan.")+'</div>';

  const mr = myResults();
  $('#myExamRows').innerHTML = mr.length
    ? mr.slice().reverse().map(r => {
        const ex = S.exams.find(e => e.id === r.examId);
        return '<tr><td><b>'+esc(r.title || (ex?ex.title:'Test'))+'</b></td><td class="dim">'+when(r.at)+'</td>'+
          '<td>'+r.correct+' / '+r.total+'</td>'+
          '<td><span class="tag '+(r.percent>=80?'ok':r.percent>=60?'warn':'bad')+'">'+r.percent+'%</span></td></tr>';
      }).join('')
    : '<tr><td colspan="4">'+emptyState('quiz',"Hali test topshirmagansiz")+'</td></tr>';
}

export function renderSubmit(){
  const opts = S.tasks.map(t => '<option value="'+esc(t.id)+'">'+esc((t.type==='chsb'?'CHSB · ':'BSB · ')+t.title)+'</option>').join('');
  const sel = $('#subTask'); const keep = sel.value;
  sel.innerHTML = opts || '<option value="">Topshiriq mavjud emas</option>';
  if(keep) sel.value = keep;
  $('#subBtn').disabled = !S.tasks.length || S.readOnly || !S.db;

  const list = mySubs().slice().reverse();
  $('#mySubCount').textContent = list.length ? list.length+' ta' : '';
  $('#mySubList').innerHTML = list.length ? list.map(s => {
    const t = taskById(s.taskId);
    const st = s.status || 'pending';
    const chip = st==='graded' ? '<span class="tag ok">'+s.score+' ball</span>'
      : st==='returned' ? '<span class="tag bad">Qaytarildi</span>' : '<span class="tag warn">Tekshiruvda</span>';
    return '<div class="item"><div class="ic">'+ico(st==='graded'?'check':'upload')+'</div>'+
      '<div class="bd"><b>'+esc(t?t.title:'O\'chirilgan topshiriq')+'</b>'+
      '<p>'+esc(s.note||'Izoh yo\'q')+'</p>'+
      (s.feedback?'<p style="color:var(--brand)">O\'qituvchi: '+esc(s.feedback)+'</p>':'')+
      '<p class="dim">'+when(s.at)+'</p></div>'+chip+'</div>';
  }).join('') : emptyState('upload',"Ish yuborilmagan","Chapdagi shakl orqali birinchi ishingizni yuboring.");
}

export function renderContact(){
  const colors = { telegram:'#2aa3e0', instagram:'#d6336c', phone:'var(--ok)', link:'var(--brand)' };
  $('#contactList').innerHTML = (S.settings.contacts||[]).map(c =>
    '<div class="card"><div class="pad" style="display:flex;gap:14px;align-items:center">'+
    '<div class="ic" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:'+(colors[c.kind]||'var(--brand)')+';color:#fff;flex:none">'+ico(c.kind==='phone'?'phone':'link',20)+'</div>'+
    '<div style="flex:1;min-width:0"><b>'+esc(c.label)+'</b><div class="dim">'+esc(c.value)+'</div></div>'+
    '<a class="btn sm ghost" href="'+esc(c.href)+'" target="_blank" rel="noopener">Ochish</a>'+
    '</div></div>').join('');
}

export function renderSettings(){
  $('#themeSel').value = S.prefs.theme;
  $('#densSel').value = String(S.prefs.pageSize);
  const st = myStudent();
  if(document.activeElement !== $('#pfName')) $('#pfName').value = (st && st.name) || S.me.name || '';
  if(document.activeElement !== $('#pfClass')) fillSelect('#pfClass', classList(), st && st.className);
  $('#orgCard').style.display = isStaff() ? '' : 'none';
  if(isStaff() && document.activeElement !== $('#ogName')){
    $('#ogName').value = S.settings.schoolName;
    $('#ogQuarter').value = S.settings.quarter;
    $('#ogClasses').value = (S.settings.classes||[]).join(', ');
    $('#ogSubjects').value = (S.settings.subjects||[]).join(', ');
  }
}
