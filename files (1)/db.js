// db.js — Claude runtime imkoniyatlari, baza obunalari va yozish amallari
import { S, hooks, taskById, myStudent } from './store.js';
import { toast, sleep } from './utils.js';
import { applyTheme } from './shell.js';

export async function cap(name){
  for(let i=0;i<100;i++){
    if(window.claude && typeof window.claude.use === 'function'){
      try { return await window.claude.use(name); } catch(e){ return null; }
    }
    await sleep(100);
  }
  return null;
}

export function onErr(what){
  return e => {
    if(e && e.code === 'revoked'){ S.readOnly = true; hooks.renderAll(); return; }
    console.warn('db', what, e);
    toast("Ma'lumot olinmadi", what + " bo'yicha ulanish uzildi.", 'bad');
  };
}

export function subscribe(){
  const db = S.db;

  db.collection('students').onSnapshot(s => {
    S.students = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    S.ready = true; hooks.renderAll();
  }, onErr("O'quvchilar"));

  db.collection('grades').onSnapshot(s => {
    const m = {}; s.docs.forEach(d => m[d.id] = d.data());
    S.grades = m; hooks.renderAll();
  }, onErr("Baholar"));

  db.collection('tasks').orderBy('createdAt','desc').onSnapshot(s => {
    S.tasks = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    hooks.renderAll();
  }, onErr("Topshiriqlar"));

  db.collection('announcements').orderBy('createdAt','desc').limit(30).onSnapshot(s => {
    S.anns = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    hooks.renderAll();
  }, onErr("E'lonlar"));

  db.collection('exams').onSnapshot(s => {
    S.exams = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    hooks.renderAll();
  }, onErr("Testlar"));

  db.collection('submissions').onSnapshot(s => {
    S.subsDocs = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    hooks.renderAll();
  }, onErr("Yuborilgan ishlar"));

  db.doc('meta/settings').onSnapshot(s => {
    if(s.exists){
      const d = s.data();
      Object.keys(S.settings).forEach(k => { if(d[k] != null) S.settings[k] = d[k]; });
    }
    hooks.renderAll();
  }, onErr("Sozlamalar"));

  if(S.me.id){
    db.doc('data/users/'+S.me.id+'/prefs').get().then(s => {
      if(s.exists){ S.prefs = Object.assign(S.prefs, s.data()); applyTheme(); hooks.renderAll(); }
    }).catch(()=>{});
  }

  db.collection('examResults').onSnapshot(s => {
    S.results = s.docs.map(d => Object.assign({ id:d.id }, d.data()));
    hooks.renderAll();
  }, ()=>{});
}

export async function savePrefs(){
  if(!S.db || !S.me.id) return;
  try { await S.db.doc('data/users/'+S.me.id+'/prefs').set(S.prefs); } catch(e){}
}

export function guardWrite(){
  if(!S.db){ toast("Baza mavjud emas","Bu ko'rinishda yozib bo'lmaydi.",'bad'); return false; }
  if(S.readOnly){ toast("Faqat ko'rish huquqi","O'zgartirish kiritish uchun ruxsat so'rang.",'warn'); return false; }
  return true;
}
export async function writeSafe(fn, okMsg){
  try { await fn(); if(okMsg) toast(okMsg, '', 'ok'); return true; }
  catch(e){
    const c = e && e.code;
    if(c === 'invalid_argument'){ toast("Ruxsat yetarli emas","Bu amal uchun tahrirlash huquqi kerak.",'bad'); }
    else if(c === 'quota_exceeded') toast("Joy tugadi","Eski yozuvlarni o'chiring.",'bad');
    else if(c === 'resource_exhausted') toast("Juda tez","Biroz kutib qayta urinib ko'ring.",'warn');
    else toast("Saqlanmadi","Qaytadan urinib ko'ring.",'bad');
    console.warn(e); return false;
  }
}

export async function saveTask(id, data){
  if(!guardWrite()) return;
  const ref = id ? S.db.doc('tasks/'+id) : S.db.collection('tasks').doc();
  const body = Object.assign({ createdAt: Date.now(), createdBy: S.me.id || '' }, data);
  if(id){ const old = taskById(id); if(old){ body.createdAt = old.createdAt; body.createdBy = old.createdBy; } }
  await writeSafe(() => ref.set(body), id ? "Topshiriq yangilandi" : "Topshiriq qo'shildi");
}
export async function saveExam(id, data){
  if(!guardWrite()) return;
  const ref = id ? S.db.doc('exams/'+id) : S.db.collection('exams').doc();
  await writeSafe(() => ref.set(Object.assign({ createdAt: Date.now() }, data)), id ? "Test yangilandi" : "Test yaratildi");
}
export async function saveGrade(studentId, data){
  if(!guardWrite()) return;
  await writeSafe(() => S.db.doc('grades/'+studentId).set(Object.assign({ updatedAt: Date.now(), updatedBy: S.me.id||'' }, data)), "Baholar saqlandi");
}
export async function saveAnnouncement(title, body){
  if(!guardWrite()) return;
  await writeSafe(() => S.db.collection('announcements').add({ title, body, createdAt: Date.now(), by: S.me.id||'' }), "E'lon chiqarildi");
}
export async function saveSettings(patch){
  if(!guardWrite()) return;
  await writeSafe(() => S.db.doc('meta/settings').set(Object.assign({}, S.settings, patch)), "Sozlamalar saqlandi");
}
export async function removeDoc(path, msg){
  if(!guardWrite()) return;
  await writeSafe(() => S.db.doc(path).delete(), msg || "O'chirildi");
}

export async function saveMyProfile(name, className){
  if(!guardWrite()) return false;
  if(!S.me.id){ toast("Hisob aniqlanmadi","Tizimga kirgan holda qayta urinib ko'ring.",'bad'); return false; }
  const cur = myStudent();
  const body = { name, className, joinedAt: (cur && cur.joinedAt) || Date.now() };
  return await writeSafe(() => S.db.doc('students/'+S.me.id).set(body), "Profil saqlandi");
}

export async function writeMySubs(items){
  const st = myStudent();
  return await writeSafe(() => S.db.doc('submissions/'+S.me.id).set({
    studentId: S.me.id, name: (st && st.name) || S.me.name || 'O\'quvchi',
    className: (st && st.className) || '—', items, updatedAt: Date.now()
  }));
}

export async function reviewSubmission(owner, subId, patch){
  if(!guardWrite()) return;
  const doc = S.subsDocs.find(d => d.id === owner);
  if(!doc) return;
  const items = (doc.items||[]).map(it => it.id === subId ? Object.assign({}, it, patch, { gradedAt: Date.now() }) : it);
  const body = Object.assign({}, doc, { items, updatedAt: Date.now() });
  delete body.id;
  await writeSafe(() => S.db.doc('submissions/'+owner).set(body), "Baholandi");
}
