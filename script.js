// Full schedule script
const DAYS = ['mon','tue','wed','thu','fri'];
const DAY_NAMES = { mon:'Пн', tue:'Вт', wed:'Ср', thu:'Чт', fri:'Пт' };

const defaultData = {
  settings: { theme:'dark', baseTopWeekISO:'2025-09-01' },
  times: [
    { start:'08:00', end:'09:20' },
    { start:'09:30', end:'10:50' },
    { start:'11:00', end:'12:20' },
    { start:'12:40', end:'14:00' },
    { start:'14:10', end:'15:30' },
    { start:'15:40', end:'17:00' },
    { start:'17:10', end:'18:30' }
  ],
  template: {
    top: {
      mon: [ null,
        { type:'lec', title:'Адміністративне судочинство', teacher:'Сушко О.О.', place:'Соборна, 48' },
        { type:'lec', title:'Господарське право', teacher:'Калаченкова К.О.', place:'304' },
        { type:'lec', title:'Криміналістика', teacher:'Кавун С.М.', place:'313' }
      ],
      tue: [ null,null,null,null,
        { type:'lec', title:'СОП — Лідерство та командоутворення', teacher:'Середа Г.В.', place:'MS Teams' },
        { type:'prac', title:'СОП — Лідерство та командоутворення', teacher:'Середа Г.В.', place:'MS Teams' }
      ],
      wed: [ null, { type:'text', title:'Дисципліна з переліку' } ],
      thu: [ null,null,null,
        { type:'lec', title:'Корпоративне право', teacher:'Дорошенко Л.М.', place:'304' },
        { type:'lec', title:'Земельне право', teacher:'Бахур О.В.', place:'305' },
        { type:'lec', title:'Фінансове право', teacher:'Петренко Г.О.', place:'305' }
      ],
      fri: [ null,
        { type:'prac', title:'Адміністративне судочинство', teacher:'Сушко О.О.', place:'Соборна, 48' },
        { type:'prac', title:'Корпоративне право', teacher:'Дорошенко Л.М.', place:'121' },
        { type:'prac', title:'Фінансове право', teacher:'Петренко Г.О.', place:'305' },
        { type:'prac', title:'Криміналістика', teacher:'Кавун С.М.', place:'313' }
      ]
    },
    bottom: {
      mon: [ null,
        { type:'lec', title:'Адміністративне судочинство', teacher:'Сушко О.О.', place:'Соборна, 48' },
        { type:'lec', title:'Господарське право', teacher:'Калаченкова К.О.', place:'304' }
      ],
      tue: [ null,null,null,null,
        { type:'lec', title:'СОП — Лідерство та командоутворення', teacher:'Середа Г.В.', place:'MS Teams' },
        { type:'prac', title:'СОП — Лідерство та командоутворення', teacher:'Середа Г.В.', place:'MS Teams' }
      ],
      wed: [ null, { type:'text', title:'Дисципліна з переліку' } ],
      thu: [ null,null,null,
        { type:'lec', title:'Корпоративне право', teacher:'Дорошенко Л.М.', place:'304' },
        { type:'lec', title:'Земельне право', teacher:'Бахур О.В.', place:'305' },
        { type:'prac', title:'Земельне право', teacher:'Бахур О.В.', place:'307' }
      ],
      fri: [ null,
        { type:'prac', title:'Адміністративне судочинство', teacher:'Сушко О.О.', place:'Соборна, 48' },
        { type:'prac', title:'Корпоративне право', teacher:'Дорошенко Л.М.', place:'121' },
        { type:'prac', title:'Господарське право', teacher:'Калаченкова К.О.', place:'121' }
      ]
    }
  }
};

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function parseHMToDate(hm, baseDate){ if(!hm) return null; const [h,m]=hm.split(':').map(Number); const d=new Date(baseDate); d.setHours(h,m||0,0,0); return d; }
function isTopWeek(date){ const base=mondayOf(new Date(defaultData.settings.baseTopWeekISO||'2025-09-01')); const cur=mondayOf(date); const diffWeeks=Math.round((cur-base)/(7*24*3600*1000)); return diffWeeks%2===0; }
function getTimeFor(dayKey,pairIndex){ let idx=pairIndex; if(dayKey==='mon' && pairIndex>=1) idx=pairIndex+1; return defaultData.times[idx]||{start:'',end:''}; }
function getPairsForDay(dayKey,date){ const week=isTopWeek(date)?'top':'bottom'; const tpl=(defaultData.template[week]&&defaultData.template[week][dayKey])?defaultData.template[week][dayKey].slice():[]; return tpl; }

const grid=document.getElementById('weekGrid');
let currentMonday=mondayOf(new Date());
let nextUpdateTimer=null;

function formatDateShort(d){ return d.toLocaleDateString('uk-UA',{day:'2-digit',month:'2-digit'}); }
function updateWeekLabel(){ document.getElementById('weekLabel').textContent = isTopWeek(currentMonday)?'Верхній':'Нижній'; const start=new Date(currentMonday); const end=new Date(currentMonday.getTime()+4*86400000); document.getElementById('weekRange').textContent=`${formatDateShort(start)} — ${formatDateShort(end)}`; }

function render(withStagger=true){
  grid.innerHTML='';
  updateWeekLabel();
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const viewingCurrentWeek = mondayOf(today).getTime() === currentMonday.getTime();

  for(let i=0;i<DAYS.length;i++){
    const dKey=DAYS[i];
    const dayDate=new Date(currentMonday.getTime()+i*86400000);
    const card=document.createElement('div'); card.className='card';
    if(withStagger) card.style.animationDelay=`${i*0.06}s`;

    const head=document.createElement('div'); head.className='head';
    head.innerHTML=`<div><div class="day">${DAY_NAMES[dKey]}</div><div class="dateSmall">${formatDateShort(dayDate)}</div></div>`;
    card.appendChild(head);

    const pairs=getPairsForDay(dKey,dayDate).map((p,idx)=>({p,idx})).filter(x=>x.p);
    if(pairs.length===0){ const empty=document.createElement('div'); empty.className='muted'; empty.textContent='Вільний день 🎉'; card.appendChild(empty); grid.appendChild(card); continue; }

    let currentIdx=-1, nextIdx=-1;
    if(viewingCurrentWeek && sameDay(dayDate,today)){
      for(const v of pairs){
        const t=getTimeFor(dKey,v.idx); const st=parseHMToDate(t.start,now), en=parseHMToDate(t.end,now);
        if(st && en && now>=st && now<=en){ currentIdx=v.idx; break; }
      }
      if(currentIdx!==-1){ const after=pairs.find(v=>v.idx>currentIdx); nextIdx=after?after.idx:-1; }
      else{ const future=pairs.find(v=>{ const t=getTimeFor(dKey,v.idx); const st=parseHMToDate(t.start,now); return st && st>now; }); nextIdx=future?future.idx:-1; }
    }

    for(const v of pairs){
      const p=v.p, idx=v.idx; const t=getTimeFor(dKey,idx);
      const box=document.createElement('div'); box.className='pair'; box.dataset.day=dKey; box.dataset.index=idx;
      if(viewingCurrentWeek && sameDay(dayDate,today)){
        const st=parseHMToDate(t.start,now), en=parseHMToDate(t.end,now);
        if(en && now>en) box.classList.add('past');
        if(idx===currentIdx) box.classList.add('current');
        if(idx===nextIdx && currentIdx!==-1) box.classList.add('next');
        if(idx===nextIdx && currentIdx===-1) box.classList.add('upcoming');
      }
      const chip = p.type==='lec'?'<span class="chip lec">Лекція</span>':p.type==='prac'?'<span class="chip prac">Практика</span>':'<span class="chip textpair">Інфо</span>';
      box.innerHTML=`<div class="meta"><div>${t.start||''}–${t.end||''}</div>${chip}</div><h4>${p.title}</h4><div class="muted">${p.teacher||''}${p.place?(' • '+p.place):''}</div>`;
      if(box.classList.contains('next')){ const badge=document.createElement('div'); badge.className='badge'; badge.textContent='Наступна'; box.appendChild(badge); }
      card.appendChild(box);
    }

    if(viewingCurrentWeek && sameDay(dayDate,today)) card.classList.add('now');
    grid.appendChild(card);
  }

  // autoscroll
  if(mondayOf(new Date()).getTime() === currentMonday.getTime()){
    setTimeout(()=>{ const todayCard=document.querySelector('.card.now'); if(todayCard) todayCard.scrollIntoView({behavior:'smooth', block:'center'}); }, 120);
  }

  scheduleNextPreciseUpdate();
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

let animating=false;
function changeWeekAnimated(direction){
  if(animating) return;
  animating=true;
  grid.style.transition=`transform 360ms ease, opacity 300ms ease`;
  grid.style.transform=`translateX(${direction>0?'-40px':'40px'})`; grid.style.opacity='0';
  setTimeout(()=>{
    currentMonday.setDate(currentMonday.getDate()+direction*7);
    render(true);
    grid.style.transition='none'; grid.style.transform=`translateX(${direction>0?'40px':'-40px'})`; grid.style.opacity='0';
    requestAnimationFrame(()=>{
      grid.style.transition=`transform 360ms ease, opacity 300ms ease`;
      grid.style.transform='translateX(0)'; grid.style.opacity='1';
      setTimeout(()=>{ animating=false; }, 380);
    });
  }, 320);
}

document.getElementById('prevWeek').addEventListener('click', ()=>changeWeekAnimated(-1));
document.getElementById('nextWeek').addEventListener('click', ()=>changeWeekAnimated(1));
document.getElementById('todayBtn').addEventListener('click', ()=>{ currentMonday=mondayOf(new Date()); render(); });
document.getElementById('toggleTheme').addEventListener('click', ()=>{
  const cur = document.body.getAttribute('data-theme')==='light'?'light':'dark';
  const next = cur==='light'?'dark':'light';
  document.body.setAttribute('data-theme', next);
});

// swipe
let startX=0, startY=0;
document.addEventListener('touchstart', e=>{ if(e.changedTouches) { startX=e.changedTouches[0].screenX; startY=e.changedTouches[0].screenY; } }, {passive:true});
document.addEventListener('touchend', e=>{ if(!e.changedTouches) return; const dx=e.changedTouches[0].screenX - startX; const dy=e.changedTouches[0].screenY - startY; if(Math.abs(dx)<60 || Math.abs(dy)>Math.abs(dx)) return; if(dx>0) changeWeekAnimated(-1); else changeWeekAnimated(1); }, {passive:true});

// scheduling updates
function scheduleNextPreciseUpdate(){
  if(nextUpdateTimer){ clearTimeout(nextUpdateTimer); nextUpdateTimer=null; }
  const now=new Date();
  const todayKey = DAYS[(now.getDay()+6)%7];
  if(!todayKey){ const nd=new Date(now); nd.setDate(nd.getDate()+1); nd.setHours(0,1,0,0); nextUpdateTimer=setTimeout(()=>render(false), nd-now); return; }
  const pairs = getPairsForDay(todayKey, now);
  const candidates=[];
  pairs.forEach((p, idx)=>{ if(!p) return; const t=getTimeFor(todayKey, idx); if(t.start){ const st=parseHMToDate(t.start, now); if(st && st.getTime()>now.getTime()) candidates.push(st); } if(t.end){ const en=parseHMToDate(t.end, now); if(en && en.getTime()>now.getTime()) candidates.push(en); } });
  if(candidates.length===0){ const nd=new Date(now); nd.setDate(nd.getDate()+1); nd.setHours(0,1,0,0); candidates.push(nd); }
  candidates.sort((a,b)=>a.getTime()-b.getTime());
  const next=candidates[0]; if(!next) return;
  const delay=Math.max(200, next.getTime()-now.getTime());
  nextUpdateTimer=setTimeout(()=>render(false), delay);
}

render(true);

// register sw
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
