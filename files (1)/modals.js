// modals.js — forma oynalari va dialoglar
import { S, taskById, gradeOf } from './store.js';
import { $, $$, esc, clamp, toast, when, closeScrim } from './utils.js';
import { ico } from './icons.js';
import { saveTask, saveExam, saveGrade, reviewSubmission } from './db.js';

let _fmSave = null;
export function runFormSave(){ return _fmSave ? _fmSave() : true; }
export function openForm(cfg){
  $('#fmTitle').textContent = cfg.title;
  $('#fmSub').textContent = cfg.sub || '';
  $('#fmSave').textContent = cfg.saveLabel || 'Saqlash';
  $('#fmForm').innerHTML = cfg.fields.map(f => fieldHTML(f)).join('') + (cfg.extra||'');
  _fmSave = cfg.onSave;
  $('#formScrim').classList.add('on');
  const first = $('#fmForm .inp'); if(first) setTimeout(()=>first.focus(),60);
  if(cfg.after) cfg.after();
}
export function fieldHTML(f){
  const id = 'f_'+f.name;
  let ctrl;
  if(f.type === 'textarea') ctrl = '<textarea class="inp" id="'+id+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea>';
  else if(f.type === 'select') ctrl = '<select class="inp" id="'+id+'">'+(f.options||[]).map(o => {
      const val = typeof o === 'string' ? o : o.v, lab = typeof o === 'string' ? o : o.l;
      return '<option value="'+esc(val)+'"'+(String(val)===String(f.value)?' selected':'')+'>'+esc(lab)+'</option>';
    }).join('')+'</select>';
  else if(f.type === 'raw') return f.html;
  else ctrl = '<input class="inp" id="'+id+'" type="'+(f.type||'text')+'" value="'+esc(f.value==null?'':f.value)+'" placeholder="'+esc(f.placeholder||'')+'"'+(f.attrs||'')+'>';
  return '<div class="field"><label for="'+id+'">'+esc(f.label)+'</label>'+ctrl+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'')+'</div>';
}
export function fv(name){ const el = $('#f_'+name); return el ? el.value.trim() : ''; }

export function taskDialog(type, id){
  const t = id ? taskById(id) : null;
  openForm({
    title: t ? 'Topshiriqni tahrirlash' : (type==='chsb' ? 'Yangi CHSB imtihoni' : 'Yangi BSB topshirig\'i'),
    sub: "O'quvchilar bu topshiriqni ro'yxatdan ko'radi va ish yuboradi.",
    fields: [
      { name:'title', label:'Nomi', value:t&&t.title, placeholder:'Matematika — 1-BSB' },
      { name:'subject', label:'Fan', type:'select', value:t&&t.subject, options:S.settings.subjects },
      { name:'about', label:'Tavsif', type:'textarea', value:t&&t.about, placeholder:'Qaysi mavzular qamrab olingan' },
      { name:'deadline', label:'Topshirish muddati', type:'date', value:t&&t.deadline },
      { name:'maxScore', label:'Maksimal ball', type:'number', value:(t&&t.maxScore)||100, attrs:' min="1" max="100"' },
      { name:'fileUrl', label:'Fayl havolasi', value:t&&t.fileUrl, placeholder:'https://…', hint:'Yoki quyidan fayl yuklang.' },
      { name:'_up', type:'raw', html: S.assets
          ? '<div class="field"><label for="taskUp">Fayl yuklash</label><input class="inp" type="file" id="taskUp"><div class="hint" id="taskUpMsg">PDF, rasm yoki hujjat. 20 MB gacha.</div></div>'
          : '<div class="hint" style="margin-bottom:12px">Fayl yuklash bu ko\'rinishda mavjud emas — havoladan foydalaning.</div>' }
    ],
    after(){
      const up = $('#taskUp'); if(!up) return;
      up.addEventListener('change', async () => {
        const f = up.files[0]; if(!f) return;
        $('#taskUpMsg').textContent = 'Yuklanmoqda…';
        try {
          const r = await S.assets.upload(f);
          $('#f_fileUrl').value = r.url;
          $('#taskUpMsg').textContent = f.name + ' yuklandi.';
        } catch(e){ $('#taskUpMsg').textContent = 'Yuklab bo\'lmadi. Havola kiriting.'; }
      });
    },
    onSave(){
      const title = fv('title');
      if(!title){ toast("Nomi kerak","Topshiriq nomini kiriting.",'warn'); return false; }
      saveTask(id, { type: t ? t.type : type, title, subject: fv('subject'), about: fv('about'),
        deadline: fv('deadline'), maxScore: clamp(fv('maxScore')||100,1,100), fileUrl: fv('fileUrl'),
        fileName: '' });
      return true;
    }
  });
}

export function gradeDialog(studentId){
  const st = S.students.find(s => s.id === studentId); if(!st) return;
  const g = gradeOf(studentId);
  const subs = S.settings.subjects;
  openForm({
    title: st.name,
    sub: st.className + " · fan baholari 0–100 oralig'ida",
    fields: [
      { name:'bsb', label:'BSB umumiy balli', type:'number', value:g.bsb, attrs:' min="0" max="100"' },
      { name:'chsb', label:'CHSB umumiy balli', type:'number', value:g.chsb, attrs:' min="0" max="100"' },
      { name:'_subs', type:'raw', html:'<label style="display:block;font-size:.79rem;font-weight:600;color:var(--ink-2);margin-bottom:8px">Fan baholari</label><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'+
        subs.map(s => '<div><div class="hint" style="margin:0 0 4px">'+esc(s)+'</div><input class="inp" data-sub="'+esc(s)+'" type="number" min="0" max="100" value="'+esc(g.subjects[s]!=null?g.subjects[s]:'')+'"></div>').join('')+'</div>' }
    ],
    onSave(){
      const subjects = {};
      $$('#fmForm [data-sub]').forEach(i => { if(i.value !== '') subjects[i.dataset.sub] = clamp(i.value,0,100); });
      saveGrade(studentId, { bsb: clamp(fv('bsb')||0,0,100), chsb: clamp(fv('chsb')||0,0,100), subjects });
      return true;
    }
  });
}

export function examDialog(id){
  const ex = id ? S.exams.find(e => e.id === id) : null;
  let qs = ex ? JSON.parse(JSON.stringify(ex.questions||[])) : [{ q:'', options:['','',''], answer:0 }];
  function qHTML(){
    return qs.map((q,i) =>
      '<div class="card pad" style="margin-bottom:10px;box-shadow:none">'+
      '<div class="spread" style="margin-bottom:8px"><b>'+(i+1)+'-savol</b>'+
      (qs.length>1?'<button type="button" class="btn icon ghost" data-qdel="'+i+'">'+ico('trash',14)+'</button>':'')+'</div>'+
      '<input class="inp" data-q="'+i+'" placeholder="Savol matni" value="'+esc(q.q)+'" style="margin-bottom:8px">'+
      q.options.map((o,j) =>
        '<div class="row" style="margin-bottom:6px;flex-wrap:nowrap">'+
        '<input type="radio" name="ans'+i+'" data-ans="'+i+'|'+j+'"'+(q.answer===j?' checked':'')+' style="flex:none">'+
        '<input class="inp" data-opt="'+i+'|'+j+'" placeholder="'+String.fromCharCode(65+j)+' variant" value="'+esc(o)+'"></div>').join('')+
      '</div>').join('');
  }
  function sync(){
    $$('#qWrap [data-q]').forEach(i => qs[+i.dataset.q].q = i.value);
    $$('#qWrap [data-opt]').forEach(i => { const [a,b] = i.dataset.opt.split('|'); qs[+a].options[+b] = i.value; });
    $$('#qWrap [data-ans]').forEach(i => { if(i.checked){ const [a,b] = i.dataset.ans.split('|'); qs[+a].answer = +b; } });
  }
  function repaint(){ $('#qWrap').innerHTML = qHTML(); }
  openForm({
    title: ex ? 'Testni tahrirlash' : 'Yangi onlayn test',
    sub: "Har bir savolda to'g'ri javobni belgilang.",
    fields: [
      { name:'title', label:'Test nomi', value:ex&&ex.title, placeholder:'1-chorak yakuniy testi' },
      { name:'subject', label:'Fan', type:'select', value:ex&&ex.subject, options:S.settings.subjects },
      { name:'minutes', label:'Vaqt (daqiqa)', type:'number', value:(ex&&ex.minutes)||15, attrs:' min="1" max="180"' },
      { name:'_qs', type:'raw', html:'<label style="display:block;font-size:.79rem;font-weight:600;color:var(--ink-2);margin-bottom:8px">Savollar</label><div id="qWrap"></div><button type="button" class="btn sm ghost" id="addQ">'+ico('plus',14)+'Savol qo\'shish</button>' }
    ],
    after(){
      repaint();
      $('#addQ').addEventListener('click', () => { sync(); qs.push({ q:'', options:['','',''], answer:0 }); repaint(); });
      $('#qWrap').addEventListener('click', e => {
        const b = e.target.closest('[data-qdel]'); if(!b) return;
        sync(); qs.splice(+b.dataset.qdel,1); repaint();
      });
    },
    onSave(){
      sync();
      const title = fv('title');
      const clean = qs.filter(q => q.q.trim() && q.options.filter(o=>o.trim()).length >= 2);
      if(!title || !clean.length){ toast("To'liq emas","Nom va kamida bitta to'liq savol kerak.",'warn'); return false; }
      saveExam(id, { title, subject: fv('subject'), minutes: clamp(fv('minutes')||15,1,180),
        questions: clean.map(q => ({ q:q.q.trim(), options:q.options.map(o=>o.trim()).filter(Boolean), answer:clamp(q.answer,0,q.options.length-1) })),
        takers: (ex && ex.takers) || 0 });
      return true;
    }
  });
}

export function reviewDialog(owner, subId){
  const doc = S.subsDocs.find(d => d.id === owner); if(!doc) return;
  const s = (doc.items||[]).find(i => i.id === subId); if(!s) return;
  const t = taskById(s.taskId);
  $('#vwTitle').textContent = (doc.name||'O\'quvchi') + ' — ' + (t ? t.title : 'topshiriq');
  $('#vwSub').textContent = (doc.className||'') + ' · ' + when(s.at);
  $('#vwBody').innerHTML =
    '<div class="field"><label>O\'quvchi izohi</label><div class="card pad" style="box-shadow:none">'+esc(s.note||'Izoh yo\'q')+'</div></div>'+
    (s.link ? '<div class="field"><label>Havola</label><a href="'+esc(s.link)+'" target="_blank" rel="noopener" class="btn sm ghost">'+ico('link',14)+'Ochish</a></div>' : '')+
    (s.image ? '<div class="field"><label>Biriktirilgan rasm</label><img src="'+esc(s.image)+'" alt="" style="max-width:100%;border-radius:12px;border:1px solid var(--line)"></div>' : '')+
    '<div class="field"><label for="rvScore">Ball (0–'+((t&&t.maxScore)||100)+')</label><input class="inp" id="rvScore" type="number" min="0" max="'+((t&&t.maxScore)||100)+'" value="'+(s.score!=null?s.score:'')+'"></div>'+
    '<div class="field"><label for="rvFb">Izoh</label><textarea class="inp" id="rvFb" placeholder="O\'quvchiga tavsiya">'+esc(s.feedback||'')+'</textarea></div>';
  $('#vwFoot').innerHTML =
    '<button class="btn ghost" id="rvClose">Yopish</button>'+
    '<button class="btn ghost" id="rvReturn">Qaytarish</button>'+
    '<button class="btn ok" id="rvGrade">Baholash</button>';
  $('#viewScrim').classList.add('on');
  $('#rvClose').onclick = () => closeScrim('#viewScrim');
  $('#rvReturn').onclick = async () => {
    await reviewSubmission(owner, subId, { status:'returned', feedback: $('#rvFb').value.trim() });
    closeScrim('#viewScrim');
  };
  $('#rvGrade').onclick = async () => {
    const sc = clamp($('#rvScore').value||0, 0, (t&&t.maxScore)||100);
    await reviewSubmission(owner, subId, { status:'graded', score: sc, feedback: $('#rvFb').value.trim() });
    closeScrim('#viewScrim');
  };
}
