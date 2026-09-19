// shell.js — yon menyu, mavzu (theme) va sahifalar orasida o'tish
import { S, hooks, allSubs, isStaff, myStudent } from './store.js';
import { NAV } from './config.js';
import { ico } from './icons.js';
import { $, $$, esc } from './utils.js';

export function renderNav(){
  const pend = allSubs().filter(s => (s.status||'pending') === 'pending').length;
  $('#railNav').innerHTML = NAV.filter(n => !n.admin || isStaff()).map(n => {
    const tail = (n.id === 'admin' && pend) ? '<span class="tail">'+pend+'</span>' : '';
    return '<button class="nav-a'+(S.view===n.id?' on':'')+'" data-go="'+n.id+'">'+ico(n.icon)+'<span>'+esc(n.label)+'</span>'+tail+'</button>';
  }).join('');
  $('#railMark').innerHTML = ico('cap',20);
  $('#railSchool').textContent = S.settings.schoolName;
  $('#bellBtn').innerHTML = ico('bell') + (S.anns.length ? '<span class="dot"></span>' : '');
  $('#themeBtn').innerHTML = ico(document.documentElement.getAttribute('data-theme')==='dark' ? 'sun' : 'moon');
  $('#burger').innerHTML = ico('menu');
}

export function avatarHTML(size){
  if(S.me.avatarUrl) return '<img class="avatar" src="'+esc(S.me.avatarUrl)+'" alt="" style="width:'+size+'px;height:'+size+'px">';
  const ch = (S.me.name || 'F').trim().charAt(0).toUpperCase();
  return '<span class="av-fb" style="width:'+size+'px;height:'+size+'px">'+esc(ch)+'</span>';
}
export function renderMe(){
  $('#meAv').innerHTML = avatarHTML(34);
  const st = myStudent();
  $('#meName').textContent = S.me.name || st && st.name || 'Mehmon';
  $('#meRole').textContent = S.readOnly ? "Faqat ko'rish"
    : isStaff() ? "Administrator"
    : st ? (st.className + " o'quvchisi") : "Ro'yxatdan o'tilmagan";
}

export function go(id){
  if(!NAV.some(n => n.id === id)) id = 'dashboard';
  if(id === 'admin' && !isStaff()) id = 'dashboard';
  S.view = id;
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-'+id));
  const n = NAV.find(x => x.id === id);
  $('#pageTitle').textContent = n.label;
  $('#pageSub').textContent = n.sub;
  $$('.nav-a').forEach(a => a.classList.toggle('on', a.dataset.go === id));
  $('#rail').classList.remove('open'); $('#drawerScrim').classList.remove('on');
  if(location.hash.slice(1) !== id) history.replaceState(null,'','#'+id);
  window.scrollTo(0,0);
  hooks.renderAll();
}

export function applyTheme(){
  const t = S.prefs.theme;
  if(t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const btn = $('#themeBtn');
  if(btn) btn.innerHTML = ico(effectiveDark() ? 'sun' : 'moon');
}
export function effectiveDark(){
  const t = document.documentElement.getAttribute('data-theme');
  if(t) return t === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
