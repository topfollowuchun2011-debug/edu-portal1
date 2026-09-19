// store.js — ilovaning umumiy holati va undan kelib chiquvchi hisob-kitoblar

import { clamp } from './utils.js';

export const S = {
  db:null, user:null, assets:null, downloads:null,
  me:{id:null,name:'',avatarUrl:'',color:''},
  canEdit:false, canWrite:null, isOwner:false,
  ready:false, readOnly:false,
  students:[], grades:{}, tasks:[], anns:[], exams:[], subsDocs:[], results:[],
  settings:{ schoolName:"EduPortal maktabi", quarter:"1-chorak",
             classes:["9-A","9-B","9-V","9-G"],
             subjects:["Matematika","Fizika","Informatika","Ona tili","Ingliz tili","Kimyo","Biologiya","Tarix"],
             contacts:[
               {kind:"telegram",label:"Telegram admin",value:"@weloce_admin",href:"https://t.me/weloce_admin"},
               {kind:"instagram",label:"Instagram",value:"@utzb1",href:"https://instagram.com/utzb1"},
               {kind:"phone",label:"Telefon",value:"+998 88 559 35 36",href:"tel:+998885593536"}
             ] },
  prefs:{ theme:'system', pageSize:20 },
  view:'dashboard', adminTab:'queue',
  sort:{ key:'total', dir:'desc' },
  filters:{ rating:'', ratingClass:'', student:'', studentClass:'', bsb:'', bsbSubject:'', grade:'', queue:'pending' }
};

/* Modullar orasida aylanma import bo'lmasligi uchun umumiy ilmoq. */
export const hooks = { renderAll(){} };

export function gradeOf(id){
  const g = S.grades[id] || {};
  return { bsb: clamp(g.bsb||0,0,100), chsb: clamp(g.chsb||0,0,100), subjects: g.subjects || {} };
}
export function totalOf(id){ const g = gradeOf(id); return Math.round((g.bsb + g.chsb)/2); }

export function level(total){
  if(total >= 90) return { t:"A'lochi", c:'ok' };
  if(total >= 80) return { t:"Zukko", c:'bsb' };
  if(total >= 70) return { t:"Intiluvchan", c:'warn' };
  if(total >= 60) return { t:"Faol", c:'' };
  return { t:"Ishtirokchi", c:'' };
}

export function roster(){
  return S.students.map(st => {
    const g = gradeOf(st.id);
    return { id:st.id, name:st.name||'Nomsiz', className:st.className||'—',
             joinedAt:st.joinedAt||0, bsb:g.bsb, chsb:g.chsb,
             subjects:g.subjects, total: Math.round((g.bsb+g.chsb)/2) };
  });
}
export function ranked(){
  return roster().sort((a,b) => b.total - a.total || a.name.localeCompare(b.name));
}
export function myStudent(){ return S.students.find(s => s.id === S.me.id) || null; }
export function mySubs(){
  const d = S.subsDocs.find(x => x.id === S.me.id);
  return (d && d.items) || [];
}
export function allSubs(){
  const out = [];
  S.subsDocs.forEach(d => (d.items||[]).forEach(it => out.push(Object.assign({}, it, {
    owner:d.id, studentName:d.name||'—', className:d.className||'—' }))));
  return out.sort((a,b) => (b.at||0) - (a.at||0));
}
export function myResults(){
  const d = S.results.find(r => r.id === S.me.id);
  return (d && d.items) || [];
}
export function examTakers(examId){
  let n = 0;
  S.results.forEach(r => { if((r.items||[]).some(i => i.examId === examId)) n++; });
  return n;
}
export function taskById(id){ return S.tasks.find(t => t.id === id) || null; }
export function classList(){
  const set = new Set(S.settings.classes||[]);
  S.students.forEach(s => s.className && set.add(s.className));
  return Array.from(set).sort();
}

export function isStaff(){ return S.canEdit || S.isOwner; }
