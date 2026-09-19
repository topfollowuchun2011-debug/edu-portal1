# EduPortal — ta'lim boshqaruv tizimi

BSB/CHSB topshiriqlari, baholar, reyting, onlayn testlar va ish topshirish tizimi.
Kod haqiqiy loyihalardagidek bo'laklarga ajratilgan: har bir fayl bitta vazifani bajaradi.

## Loyiha tuzilmasi

```
index.html            — faqat HTML tuzilma (belgilar), na uslub na skript ichida
css/
  base.css            — ranglar (CSS o'zgaruvchilar), shriftlar, reset, qorong'i rejim
  layout.css          — sahifa karkasi: yon menyu, yuqori panel, kontent maydoni
  components.css      — tugma, forma, karta, jadval, tag, modal, toast, test oynasi
  responsive.css      — telefon/planshet moslashuvi va chop etish uslublari
js/
  icons.js            — barcha SVG ikonkalar
  config.js           — menyu tuzilmasi (NAV)
  utils.js            — kichik yordamchilar: $, esc, sana, toast, confirm
  store.js            — ilovaning umumiy holati (S) va hisob-kitoblar (reyting, o'rtacha)
  db.js               — baza: ulanish, obunalar (realtime), yozish amallari
  shell.js            — yon menyu, mavzu almashtirish, sahifalar orasida o'tish
  views.js            — foydalanuvchi bo'limlarini chizish
  admin.js            — boshqaruv panelini chizish
  modals.js           — forma oynalari va dialoglar
  exam.js             — onlayn test: taymer, savollar, natija
  files.js            — CSV eksport, rasm o'qish
  main.js             — hammasini bog'laydi, hodisalarni ulaydi, ishga tushiradi
```

## Ishga tushirish

Fayllar ES modullar (`import`/`export`) bilan ishlaydi, shuning uchun `index.html` ni
to'g'ridan-to'g'ri ikki marta bosib ochsangiz brauzer modullarni bloklaydi.
Kichik server oching:

```bash
cd site
python3 -m http.server 8000
```

So'ng brauzerda `http://localhost:8000` ni oching.

Muqobil variantlar: VS Code'dagi **Live Server** kengaytmasi, `npx serve`, yoki
GitHub Pages / Netlify / Vercel ga yuklash.

## Modullar bir-biriga qanday bog'langan

```
                 icons.js
                     ↓
       config.js  utils.js
                     ↓
                  store.js  ←─ umumiy holat (S) va hooks
                  ↙      ↘
             shell.js    db.js        ← db shell'dan applyTheme oladi
                  ↘      ↙
        views.js  admin.js  modals.js  exam.js  files.js
                       ↘   ↓   ↙
                        main.js        ← hammasini import qiladi
```

Aylanma import bo'lmasligi uchun `store.js` dagi `hooks` obyekti ishlatiladi:
`main.js` unga `renderAll` ni yozadi, boshqa modullar esa `hooks.renderAll()` ni
chaqiradi. Shuning uchun `db.js` `main.js` ni import qilishi shart emas.

## Baza

`db.js` Claude artifact runtime'idagi hujjat bazasi bilan ishlaydi. Kolleksiyalar:

| Yo'l | Nima saqlanadi | Kim yozadi |
|---|---|---|
| `students/<id>` | ism, sinf | o'quvchi — faqat o'zinikini |
| `grades/<id>` | BSB, CHSB, fan baholari | faqat admin |
| `tasks/<id>` | BSB/CHSB topshiriqlari | faqat admin |
| `exams/<id>` | test savollari | faqat admin |
| `announcements/<id>` | e'lonlar | faqat admin |
| `submissions/<id>` | yuborilgan ishlar | o'quvchi yozadi, admin baholaydi |
| `examResults/<id>` | test natijalari | o'quvchi — faqat o'zinikini |
| `meta/settings` | muassasa sozlamalari | faqat admin |
| `data/users/<id>/prefs` | shaxsiy sozlamalar | faqat egasi |

Ruxsatlar server tomonda tekshiriladi — o'quvchi o'z bahosini o'zgartira olmaydi.

## Boshqa serverga ko'chirish

Agar Claude o'rniga o'z backend'ingizni ishlatmoqchi bo'lsangiz, **faqat `db.js` ni**
qayta yozing. Qolgan fayllar o'zgarishsiz qoladi — ular bazaga to'g'ridan-to'g'ri
murojaat qilmaydi.

`db.js` tashqariga chiqaradigan funksiyalar: `subscribe`, `saveTask`, `saveExam`,
`saveGrade`, `saveAnnouncement`, `saveSettings`, `saveMyProfile`, `writeMySubs`,
`reviewSubmission`, `removeDoc`, `savePrefs`.
