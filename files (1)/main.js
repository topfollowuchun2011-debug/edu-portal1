// main.js — barcha modullarni bog'laydi va ilovani ishga tushiradi
import { S, hooks, isStaff, myStudent, mySubs, taskById } from './store.js';
import { NAV } from './config.js';
import { $, $$, esc, uid, toast, debounce, confirmBox, closeScrim,
         resolveConfirm, fillSelect } from './utils.js';
import { ico } from './icons.js';
import { cap, subscribe, savePrefs, guardWrite, writeSafe, saveAnnouncement,
         saveSettings, saveMyProfile, writeMySubs, removeDoc } from './db.js';
import { renderNav, renderMe, go, applyTheme, effectiveDark } from './shell.js';
import { renderDashboard, renderRating, renderStudents, renderTasks,
         renderExamView, renderSubmit, renderContact, renderSettings } from './views.js';
import { renderAdmin } from './admin.js';
import { taskDialog, gradeDialog, examDialog, reviewDialog, runFormSave } from './modals.js';
import { EX, startExam, paintExam, finishExam } from './exam.js';
import { exportCSV, readImage } from './files.js';

/* ── Ishga tushirish ────────────────────────────── */
export async function boot(){
  applyTheme();
  renderNav();
  paintSkeletons();
  wire();

  const [db, user, assets, downloads] = await Promise.all([
    cap('db'), cap('user'), cap('assets'), cap('downloads')
  ]);
  S.db = db; S.user = user; S.assets = assets; S.downloads = downloads;

  if(user){
    const me = await user.me();
    S.me = { id: me.id, name: me.name || '', avatarUrl: me.avatarUrl, color: me.color };
    S.isOwner = me.isOwner; S.canEdit = me.canEdit;
    S.canWrite = await user.can('data.write');
  }
  S.readOnly = !S.me.id;
  renderNav();
  renderMe();

  if(!db){
    S.ready = true;
    toast("Baza ulanmadi", "Sahifa faqat ko'rish rejimida ishlamoqda.", 'warn');
    renderAll();
    return;
  }
  subscribe();
}

export function paintSkeletons(){
  $('#dashStats').innerHTML = [0,0,0].map(()=>'<div class="stat"><div class="ic skel" style="border-radius:11px"></div><div style="flex:1"><div class="skel" style="width:60%"></div><div class="skel" style="width:40%;height:22px;margin-top:8px"></div></div></div>').join('');
  $('#subjectBars').innerHTML = [0,0,0,0].map(()=>'<div class="skel" style="height:16px"></div>').join('');
  $('#classBars').innerHTML = [0,0,0].map(()=>'<div class="skel" style="height:16px"></div>').join('');
}

let _rafPending = false;
function renderAll(){
  if(_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(() => {
    _rafPending = false;
    try {
      renderNav(); renderMe();
      renderDashboard(); renderRating(); renderStudents();
      renderTasks(); renderExamView(); renderSubmit();
      renderContact(); renderSettings();
      if(isStaff()) renderAdmin();
      maybeOnboard();
    } catch(e){ console.error(e); }
  });
}

let _onboardShown = false;
function maybeOnboard(){
  if(_onboardShown || !S.ready || !S.db || S.readOnly || !S.me.id) return;
  if(myStudent()) return;
  if(isStaff()) return;   // staff need not appear in the roster
  _onboardShown = true;
  $('#obName').value = S.me.name || '';
  fillSelect('#obClass', classList());
  $('#onboardScrim').classList.add('on');
}

function wire(){

  // --- navigation ---
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-go]');
    if(nav){ go(nav.dataset.go); return; }
  });
  $('#burger').addEventListener('click', () => {
    $('#rail').classList.toggle('open');
    $('#drawerScrim').classList.toggle('on', $('#rail').classList.contains('open'));
  });
  $('#drawerScrim').addEventListener('click', () => {
    $('#rail').classList.remove('open'); $('#drawerScrim').classList.remove('on');
  });
  $('#meCard').addEventListener('click', () => go('settings'));
  $('#bellBtn').addEventListener('click', () => {
    if(!S.anns.length){ toast("Bildirishnoma yo'q","Yangi e'lon chiqqanda shu yerda ko'rinadi."); return; }
    $('#vwTitle').textContent = "E'lonlar";
    $('#vwSub').textContent = S.anns.length + " ta xabar";
    $('#vwBody').innerHTML = S.anns.map(a =>
      '<div class="item"><div class="ic">'+ico('bell')+'</div><div class="bd"><b>'+esc(a.title)+'</b><p>'+esc(a.body)+'</p><p class="dim">'+when(a.createdAt)+'</p></div></div>').join('');
    $('#vwFoot').innerHTML = '<button class="btn ghost" onclick="document.getElementById(\'viewScrim\').classList.remove(\'on\')">Yopish</button>';
    $('#viewScrim').classList.add('on');
  });
  $('#themeBtn').addEventListener('click', () => {
    S.prefs.theme = effectiveDark() ? 'light' : 'dark';
    applyTheme(); renderNav(); savePrefs();
  });
  window.addEventListener('hashchange', () => go(location.hash.slice(1) || 'dashboard'));

  // --- filters ---
  const bind = (sel, key, ev) => { const el = $(sel); if(el) el.addEventListener(ev||'input', debounce(() => { S.filters[key] = el.value; renderAll(); }, 160)); };
  bind('#ratingSearch','rating'); bind('#ratingClass','ratingClass','change');
  bind('#stSearch','student');    bind('#stClass','studentClass','change');
  bind('#bsbSearch','bsb');       bind('#bsbSubject','bsbSubject','change');
  bind('#gradeSearch','grade');   bind('#qFilter','queue','change');

  $$('#v-rating th.sortable').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    S.sort = { key:k, dir: S.sort.key === k && S.sort.dir === 'desc' ? 'asc' : 'desc' };
    renderRating();
  }));

  // --- admin tabs ---
  $('#adminTabs').addEventListener('click', e => {
    const t = e.target.closest('.tab'); if(!t) return;
    S.adminTab = t.dataset.at;
    $$('#adminTabs .tab').forEach(x => x.classList.toggle('on', x === t));
    $$('.atab').forEach(x => x.style.display = (x.id === 'at-'+S.adminTab) ? '' : 'none');
  });

  // --- create buttons ---
  $('#newBsbBtn').addEventListener('click', () => taskDialog('bsb'));
  $('#newChsbBtn').addEventListener('click', () => taskDialog('chsb'));
  $('#adminNewTask').addEventListener('click', () => taskDialog('bsb'));
  $('#newExamBtn').addEventListener('click', () => examDialog());
  $('#adminNewExam').addEventListener('click', () => examDialog());
  $('#csvBtn').addEventListener('click', exportCSV);

  // --- delegated actions ---
  document.addEventListener('click', async e => {
    let b;
    if(b = e.target.closest('[data-edit-task]')) return taskDialog(null, b.dataset.editTask);
    if(b = e.target.closest('[data-edit-exam]')) return examDialog(b.dataset.editExam);
    if(b = e.target.closest('[data-grade]'))     return gradeDialog(b.dataset.grade);
    if(b = e.target.closest('[data-start-exam]'))return startExam(b.dataset.startExam);
    if(b = e.target.closest('[data-review]')){
      const [o, i] = b.dataset.review.split('|'); return reviewDialog(o, i);
    }
    if(b = e.target.closest('[data-submit-for]')){
      go('submit'); setTimeout(() => { $('#subTask').value = b.dataset.submitFor; $('#subNote').focus(); }, 60);
      return;
    }
    if(b = e.target.closest('[data-del-task]')){
      const t = taskById(b.dataset.delTask);
      if(await confirmBox("Topshiriqni o'chirish", (t?t.title:'')+" o'chiriladi. Yuborilgan ishlar saqlanib qoladi.", "O'chirish"))
        removeDoc('tasks/'+b.dataset.delTask, "Topshiriq o'chirildi");
      return;
    }
    if(b = e.target.closest('[data-del-exam]')){
      if(await confirmBox("Testni o'chirish","Test va uning savollari o'chiriladi.","O'chirish"))
        removeDoc('exams/'+b.dataset.delExam, "Test o'chirildi");
      return;
    }
    if(b = e.target.closest('[data-del-ann]')){
      if(await confirmBox("E'lonni o'chirish","Bu e'lon barcha foydalanuvchilardan yo'qoladi.","O'chirish"))
        removeDoc('announcements/'+b.dataset.delAnn, "E'lon o'chirildi");
      return;
    }
    if(b = e.target.closest('[data-del-st]')){
      const st = S.students.find(s => s.id === b.dataset.delSt);
      if(await confirmBox("O'quvchini o'chirish",(st?st.name:'')+" ro'yxatdan chiqariladi.","O'chirish")){
        await removeDoc('students/'+b.dataset.delSt, "O'quvchi o'chirildi");
        await writeSafe(() => S.db.doc('grades/'+b.dataset.delSt).delete());
      }
      return;
    }
    // exam option pick
    if(b = e.target.closest('[data-pick]')){
      if(!EX.ex) return;
      EX.answers[EX.idx] = +b.dataset.pick; paintExam(); return;
    }
  });

  // --- modal plumbing ---
  $('#fmCancel').addEventListener('click', () => closeScrim('#formScrim'));
  $('#fmSave').addEventListener('click', () => { if(runFormSave() !== false) closeScrim('#formScrim'); });
  $('#fmForm').addEventListener('submit', e => e.preventDefault());
  $('#cfNo').addEventListener('click', () => { closeScrim('#confirmScrim'); resolveConfirm(false); });
  $('#cfYes').addEventListener('click', () => { closeScrim('#confirmScrim'); resolveConfirm(true); });
  $$('.scrim').forEach(sc => sc.addEventListener('mousedown', e => {
    if(e.target !== sc) return;
    if(sc.id === 'examScrim' || sc.id === 'onboardScrim') return;
    sc.classList.remove('on');
    if(sc.id === 'confirmScrim') resolveConfirm(false);
  }));
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    $$('.scrim.on').forEach(sc => { if(sc.id !== 'examScrim' && sc.id !== 'onboardScrim') sc.classList.remove('on'); });
  });

  // --- exam controls ---
  $('#exNext').addEventListener('click', () => {
    if(!EX.ex) return;
    if(EX.idx === EX.ex.questions.length-1) finishExam(false);
    else { EX.idx++; paintExam(); }
  });
  $('#exPrev').addEventListener('click', () => { if(EX.idx > 0){ EX.idx--; paintExam(); } });
  $('#exQuit').addEventListener('click', async () => {
    if(await confirmBox("Testni tark etish","Javoblaringiz saqlanmaydi.","Chiqish")){
      clearInterval(EX.timer); EX.ex = null; closeScrim('#examScrim');
    }
  });

  // --- forms ---
  $('#onboardForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await saveMyProfile($('#obName').value.trim(), $('#obClass').value);
    if(ok){ closeScrim('#onboardScrim'); toast("Xush kelibsiz!", "Endi topshiriqlarni ko'rishingiz mumkin.", 'ok'); }
  });

  $('#profForm').addEventListener('submit', async e => {
    e.preventDefault();
    await saveMyProfile($('#pfName').value.trim(), $('#pfClass').value);
  });

  $('#orgForm').addEventListener('submit', e => {
    e.preventDefault();
    const split = v => v.split(',').map(x => x.trim()).filter(Boolean);
    saveSettings({
      schoolName: $('#ogName').value.trim() || 'EduPortal',
      quarter: $('#ogQuarter').value,
      classes: split($('#ogClasses').value),
      subjects: split($('#ogSubjects').value)
    });
  });

  $('#annForm').addEventListener('submit', async e => {
    e.preventDefault();
    const t = $('#annT').value.trim(), b = $('#annB').value.trim();
    if(!t || !b) return;
    await saveAnnouncement(t, b);
    $('#annT').value = ''; $('#annB').value = '';
  });

  $('#themeSel').addEventListener('change', () => { S.prefs.theme = $('#themeSel').value; applyTheme(); renderNav(); savePrefs(); });
  $('#densSel').addEventListener('change', () => { S.prefs.pageSize = +$('#densSel').value; renderRating(); savePrefs(); });

  $('#subForm').addEventListener('submit', async e => {
    e.preventDefault();
    if(!guardWrite()) return;
    if(!myStudent()){ toast("Avval profil","Sozlamalarda ism va sinfingizni saqlang.",'warn'); go('settings'); return; }
    const taskId = $('#subTask').value;
    if(!taskId) return;
    const btn = $('#subBtn'); btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
    let image = '';
    const f = $('#subFile').files[0];
    $('#subFileErr').classList.remove('show');
    if(f){
      try { image = await readImage(f); }
      catch(err){
        $('#subFileErr').textContent = "Rasm 180 KB dan katta. Havola sifatida yuboring.";
        $('#subFileErr').classList.add('show');
        btn.disabled = false; btn.textContent = 'Ishni yuborish'; return;
      }
    }
    const items = mySubs().concat([{
      id: uid(), taskId, note: $('#subNote').value.trim(), link: $('#subLink').value.trim(),
      image, at: Date.now(), status:'pending', score:null, feedback:''
    }]).slice(-60);
    const ok = await writeMySubs(items);
    btn.disabled = false; btn.textContent = 'Ishni yuborish';
    if(ok){
      toast("Ish yuborildi","O'qituvchi tekshirgach natija ko'rinadi.",'ok');
      $('#subNote').value = ''; $('#subLink').value = ''; $('#subFile').value = '';
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if(S.prefs.theme === 'system'){ applyTheme(); renderNav(); } });
}

hooks.renderAll = renderAll;
if(location.hash.slice(1)) S.view = location.hash.slice(1);
boot().catch(e => { console.error(e); toast("Yuklashda xato","Sahifani yangilang.",'bad'); });
