// files.js — CSV eksport va rasmni o'qish
import { S, ranked, level } from './store.js';
import { toast } from './utils.js';

export async function exportCSV(){
  const rows = [['O\'rin','Ism','Sinf','BSB','CHSB','Umumiy','Daraja']];
  ranked().forEach((r,i) => rows.push([i+1, r.name, r.className, r.bsb, r.chsb, r.total, level(r.total).t]));
  const csv = '\ufeff' + rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const name = 'EduPortal-reyting-' + new Date().toISOString().slice(0,10) + '.csv';
  if(S.downloads){
    try { const r = await S.downloads.save({ filename:name, data:csv });
      if(r.status === 'saved') toast("Yuklab olindi", name, 'ok');
      return;
    } catch(e){ if(e && e.code === 'cancelled') return; }
  }
  toast("Yuklab bo'lmadi","Bu ko'rinishda fayl saqlash mavjud emas.",'warn');
}

export function readImage(file){
  return new Promise((res, rej) => {
    if(file.size > 180*1024) return rej(new Error('big'));
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(file);
  });
}
