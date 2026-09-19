// config.js — menyu tuzilmasi va boshlang'ich sozlamalar

export const NAV = [
  { id:'dashboard', label:"Bosh sahifa", icon:'home',   sub:"Umumiy ko'rsatkichlar" },
  { id:'bsb',       label:"BSB topshiriqlari", icon:'file', sub:"Fayllar va muddatlar" },
  { id:'chsb',      label:"CHSB imtihonlari",  icon:'award', sub:"Chorak nazorati" },
  { id:'exam',      label:"Onlayn testlar",    icon:'quiz',  sub:"Vaqtli test topshirish" },
  { id:'rating',    label:"Reyting",           icon:'trophy',sub:"O'quvchilar natijalari" },
  { id:'students',  label:"O'quvchilar",       icon:'users', sub:"Ro'yxat va ma'lumotlar" },
  { id:'submit',    label:"Ish topshirish",    icon:'upload',sub:"BSB / CHSB ishlarini yuborish" },
  { id:'contact',   label:"Bog'lanish",        icon:'phone', sub:"Murojaat kanallari" },
  { id:'admin',     label:"Boshqaruv",         icon:'shield',sub:"Ma'muriy panel", admin:true },
  { id:'settings',  label:"Sozlamalar",        icon:'gear',  sub:"Shaxsiy va tizim sozlamalari" }
];
