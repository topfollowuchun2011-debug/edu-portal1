// utils.js — kichik yordamchi funksiyalar (DOM, sana, toast, modal)
import { ico } from './icons.js';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function clamp(n,a,b){ n=Number(n); if(!isFinite(n)) n=a; return Math.max(a,Math.min(b,n)); }
export function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
export function debounce(fn,ms){ let t; return function(){ const a=arguments; clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms||220); }; }

export function when(ts){
  if(!ts) return '—';
  const d = new Date(ts), now = Date.now(), diff = (now - d.getTime())/1000;
  if(diff < 60) return 'hozir';
  if(diff < 3600) return Math.floor(diff/60)+' daqiqa oldin';
  if(diff < 86400) return Math.floor(diff/3600)+' soat oldin';
  if(diff < 604800) return Math.floor(diff/86400)+' kun oldin';
  return d.toLocaleDateString('uz-UZ',{day:'numeric',month:'short',year:'numeric'});
}
export function dateLabel(s){
  if(!s) return '—';
  const d = new Date(s); if(isNaN(d)) return '—';
  return d.toLocaleDateString('uz-UZ',{day:'numeric',month:'long'});
}
export function daysLeft(s){
  if(!s) return null;
  const d = new Date(s); if(isNaN(d)) return null;
  return Math.ceil((d.setHours(23,59,59) - Date.now())/86400000);
}

export function toast(title, body, kind){
  const el = document.createElement('div');
  el.className = 'toast ' + (kind||'');
  el.innerHTML = '<b>'+esc(title)+'</b>' + (body ? '<span>'+esc(body)+'</span>' : '');
  $('#toasts').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(16px)'; setTimeout(()=>el.remove(),250); }, 3800);
}

let _cfResolve = null;
export function resolveConfirm(v){ if(_cfResolve){ _cfResolve(v); _cfResolve = null; } }
export function confirmBox(title, body, yes){
  $('#cfTitle').textContent = title;
  $('#cfBody').textContent = body || '';
  $('#cfYes').textContent = yes || 'Tasdiqlash';
  $('#confirmScrim').classList.add('on');
  return new Promise(r => { _cfResolve = r; });
}
export function closeScrim(id){ $(id).classList.remove('on'); }

export function emptyState(icon, title, body){
  return '<div class="empty">'+ico(icon,30)+'<b>'+esc(title)+'</b>'+(body?esc(body):'')+'</div>';
}

export function fillSelect(sel, items, value, blank){
  const el = $(sel); if(!el) return;
  const cur = value != null ? value : el.value;
  el.innerHTML = (blank ? '<option value="">'+esc(blank)+'</option>' : '') +
    items.map(i => '<option value="'+esc(i)+'"'+(i===cur?' selected':'')+'>'+esc(i)+'</option>').join('');
}
