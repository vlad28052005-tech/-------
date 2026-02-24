// Конфігурація розкладу та даних
const defaultData = {
    settings: { baseTopWeekISO: '2026-02-16' },
    times: [
        { start: '08:00', end: '09:20' }, // I
        { start: '09:30', end: '10:50' }, // II
        { start: '11:00', end: '12:20' }, // III
        { start: '12:40', end: '14:00' }, // IV
        { start: '14:10', end: '15:30' }, // V
        { start: '15:40', end: '17:00' }, // VI
        { start: '17:10', end: '18:30' } // VII
    ],
    template: {
        top: {
            mon: [],
            tue: [null, null,
                { type: 'lec', title: 'Міжнародний захист прав людини', teacher: 'Турченко О. Г.', place: '304, Грушевського, 2' },
                { type: 'prac', title: 'Господарсько-процесуальне право (з 03.03)', teacher: 'Бахур О. В.', place: '303, Грушевського, 2' },
                { type: 'lec', title: 'Фінансове право (з 03.03)', teacher: 'Петренко Г. О.', place: '305, Грушевського, 2' }
            ],
            wed: [
                { type: 'lec', title: 'Фінансове право (01.04.2026)', teacher: 'Петренко Г. О.', place: '305, Грушевського, 2' },
                { type: 'lec', title: 'Господарське право', teacher: 'Калаченкова К. О.', place: '313, Грушевського, 2' },
                { type: 'lec', title: 'Господарсько-процесуальне право', teacher: 'Бахур О. В.', place: '313, Грушевського, 2' },
                { type: 'lec', title: 'Аграрне право', teacher: 'Калаченкова К. О.', place: '313, Грушевського, 2' }
            ],
            thu: [],
            fri: [null, null, null,
                { type: 'lec', title: 'Криміналістика (загальна; тактика)', teacher: 'Кавун С. М.', place: '304, Грушевського, 2' },
                { type: 'prac', title: 'Аграрне право', teacher: 'Калаченкова К. О.', place: '121, Грушевського, 2' }
            ]
        },
        bottom: {
            mon: [],
            tue: [null,
                { type: 'prac', title: 'Міжнародний захист прав людини', teacher: 'Турченко О. Г.', place: '315, Грушевського, 2' },
                { type: 'lec', title: 'Міжнародний захист прав людини', teacher: 'Турченко О. Г.', place: '304, Грушевського, 2' },
                { type: 'prac', title: 'Господарсько-процесуальне право', teacher: 'Бахур О. В.', place: '303, Грушевського, 2' },
                { type: 'lec', title: 'Фінансове право', teacher: 'Петренко Г. О.', place: '305, Грушевського, 2' },
                { type: 'prac', title: 'Господарське право', teacher: 'Калаченкова К. О.', place: '121, Грушевського, 2' }
            ],
            wed: [null,
                { type: 'lec', title: 'Господарське право', teacher: 'Калаченкова К. О.', place: '313, Грушевського, 2' },
                { type: 'lec', title: 'Господарсько-процесуальне право', teacher: 'Бахур О. В.', place: '313, Грушевського, 2' },
                { type: 'lec', title: 'Аграрне право', teacher: 'Калаченкова К. О.', place: '313, Грушевського, 2' },
                { type: 'prac', title: 'Фінансове право', teacher: 'Петренко Г. О.', place: '121, Грушевського, 2' }
            ],
            thu: [],
            fri: [null, null, null,
                { type: 'lec', title: 'Криміналістика (загальна; тактика)', teacher: 'Кавун С. М.', place: '304, Грушевського, 2' },
                { type: 'prac', title: 'Аграрне право', teacher: 'Калаченкова К. О.', place: '121, Грушевського, 2' },
                { type: 'prac', title: 'Криміналістика (Лаб) - В1', teacher: 'Кавун С. М.', place: '116, Грушевського, 2' },
                { type: 'prac', title: 'Криміналістика (Лаб) - В2', teacher: 'Кавун С. М.', place: '116, Грушевського, 2' }
            ]
        }
    }
};

const savedTheme = localStorage.getItem('schedule_theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_NAMES = { mon: 'Понеділок', tue: 'Вівторок', wed: 'Середа', thu: 'Четвер', fri: 'П\'ятниця' };

function mondayOf(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function parseHMToDate(hm, baseDate) {
    if (!hm) return null;
    const [h, m] = hm.split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(h, m || 0, 0, 0);
    return d;
}

function isTopWeek(date) {
    const base = mondayOf(new Date(defaultData.settings.baseTopWeekISO || '2026-02-16'));
    const cur = mondayOf(date);
    return Math.round((cur - base) / (7 * 24 * 3600 * 1000)) % 2 === 0;
}

function getTimeFor(dayKey, pairIndex) { return defaultData.times[pairIndex] || { start: '', end: '' }; }

function getPairsForDay(dayKey, date) {
    const week = isTopWeek(date) ? 'top' : 'bottom';
    return (defaultData.template[week] && defaultData.template[week][dayKey]) ? defaultData.template[week][dayKey].slice() : [];
}

const grid = document.getElementById('weekGrid');
let currentMonday = mondayOf(new Date());
let nextUpdateTimer = null;
let countdownInterval = null; // Змінна для живого таймера

function formatDateShort(d) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); }

function updateWeekLabel() {
    document.getElementById('weekLabel').textContent = isTopWeek(currentMonday) ? 'Верхній' : 'Нижній';
    const start = new Date(currentMonday);
    const end = new Date(currentMonday.getTime() + 4 * 86400000);
    document.getElementById('weekRange').textContent = `${formatDateShort(start)} — ${formatDateShort(end)}`;
}

function render(withStagger = true) {
    grid.innerHTML = '';
    updateWeekLabel();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const viewingCurrentWeek = mondayOf(today).getTime() === currentMonday.getTime();
    let cardsRendered = 0;

    for (let i = 0; i < DAYS.length; i++) {
        const dKey = DAYS[i];
        const dayDate = new Date(currentMonday.getTime() + i * 86400000);
        const pairs = getPairsForDay(dKey, dayDate).map((p, idx) => ({ p, idx })).filter(x => x.p);

        if (pairs.length === 0) continue;

        const card = document.createElement('div');
        card.className = 'card';
        if (withStagger) card.style.animationDelay = `${cardsRendered * 0.08}s`;
        cardsRendered++;

        const head = document.createElement('div');
        head.className = 'head';
        head.innerHTML = `<div><div class="day">${DAY_NAMES[dKey]}</div><div class="dateSmall">${formatDateShort(dayDate)}</div></div>`;
        card.appendChild(head);

        let currentIdx = -1,
            nextIdx = -1;
        if (viewingCurrentWeek && sameDay(dayDate, today)) {
            for (const v of pairs) {
                const t = getTimeFor(dKey, v.idx);
                const st = parseHMToDate(t.start, now),
                    en = parseHMToDate(t.end, now);
                if (st && en && now >= st && now <= en) { currentIdx = v.idx; break; }
            }
            if (currentIdx !== -1) {
                const after = pairs.find(v => v.idx > currentIdx);
                nextIdx = after ? after.idx : -1;
            } else {
                const future = pairs.find(v => {
                    const t = getTimeFor(dKey, v.idx);
                    const st = parseHMToDate(t.start, now);
                    return st && st > now;
                });
                nextIdx = future ? future.idx : -1;
            }
        }

        for (const v of pairs) {
            const p = v.p,
                idx = v.idx;
            const t = getTimeFor(dKey, idx);
            const box = document.createElement('div');
            box.className = 'pair';
            box.dataset.day = dKey;
            box.dataset.index = idx;

            let chipTimerHtml = ''; // Для живого таймера

            if (viewingCurrentWeek && sameDay(dayDate, today)) {
                const en = parseHMToDate(t.end, now);
                if (en && now > en) box.classList.add('past');
                if (idx === currentIdx) {
                    box.classList.add('current');
                    // Додаємо бейдж таймера
                    chipTimerHtml = `<span class="chip timer-chip" id="liveTimer" data-end="${t.end}">⏳ Рахую...</span>`;
                }
                if (idx === nextIdx && currentIdx !== -1) box.classList.add('next');
                if (idx === nextIdx && currentIdx === -1) box.classList.add('upcoming');
            }

            let chip = p.type === 'lec' ? '<span class="chip lec">Лекція</span>' : p.type === 'prac' ? '<span class="chip prac">Практика</span>' : '<span class="chip textpair">Інфо</span>';
            chip += chipTimerHtml; // Додаємо таймер до інших бейджів, якщо він є

            box.innerHTML = `<div class="meta"><div style="display:flex;gap:6px;">${chip}</div><div>${t.start||''} – ${t.end||''}</div></div><h4>${p.title}</h4><div class="muted">${p.teacher||''}${p.place?(' • '+p.place):''}</div>`;

            if (box.classList.contains('next')) {
                const badge = document.createElement('div');
                badge.className = 'badge';
                badge.textContent = '';
                box.appendChild(badge);
            }
            card.appendChild(box);
        }

        if (viewingCurrentWeek && sameDay(dayDate, today)) card.classList.add('now');
        grid.appendChild(card);
    }

    if (mondayOf(new Date()).getTime() === currentMonday.getTime()) {
        setTimeout(() => {
            const todayCard = document.querySelector('.card.now');
            if (todayCard) todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
    }

    startLiveTimer(); // Запускаємо оновлення таймера щосекунди
    scheduleNextPreciseUpdate();
}

// Функція для оновлення таймера
function startLiveTimer() {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const timerEl = document.getElementById('liveTimer');
        if (!timerEl) return;

        const endStr = timerEl.getAttribute('data-end');
        if (!endStr) return;

        const now = new Date();
        const end = parseHMToDate(endStr, now);

        if (end) {
            const diffMs = end - now;
            if (diffMs > 0) {
                const mins = Math.floor(diffMs / 60000);
                timerEl.textContent = `⏳ ${mins} хв до кінця`;
            } else {
                timerEl.textContent = `⏳ Закінчилась`;
                render(false); // Перемальовуємо розклад, бо пара закінчилась
            }
        }
    }, 1000); // Оновлюємо кожну секунду (щоб хвилина перемикалась рівно вчасно)
}

let animating = false;

function changeWeekAnimated(direction) {
    if (animating) return;
    animating = true;
    grid.style.transition = `transform 360ms ease, opacity 300ms ease`;
    grid.style.transform = `translateX(${direction>0?'-40px':'40px'})`;
    grid.style.opacity = '0';
    setTimeout(() => {
        currentMonday.setDate(currentMonday.getDate() + direction * 7);
        render(true);
        grid.style.transition = 'none';
        grid.style.transform = `translateX(${direction>0?'40px':'-40px'})`;
        grid.style.opacity = '0';
        requestAnimationFrame(() => {
            grid.style.transition = `transform 360ms ease, opacity 300ms ease`;
            grid.style.transform = 'translateX(0)';
            grid.style.opacity = '1';
            setTimeout(() => { animating = false; }, 380);
        });
    }, 320);
}

document.getElementById('prevWeek').addEventListener('click', () => changeWeekAnimated(-1));
document.getElementById('nextWeek').addEventListener('click', () => changeWeekAnimated(1));
document.getElementById('todayBtn').addEventListener('click', () => { currentMonday = mondayOf(new Date());
    render(); });
document.getElementById('toggleTheme').addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('schedule_theme', next);
});

let startX = 0,
    startY = 0;
document.addEventListener('touchstart', e => { if (e.changedTouches) { startX = e.changedTouches[0].screenX;
        startY = e.changedTouches[0].screenY; } }, { passive: true });
document.addEventListener('touchend', e => {
    if (!e.changedTouches) return;
    const dx = e.changedTouches[0].screenX - startX;
    const dy = e.changedTouches[0].screenY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) changeWeekAnimated(-1);
    else changeWeekAnimated(1);
}, { passive: true });

function scheduleNextPreciseUpdate() {
    if (nextUpdateTimer) { clearTimeout(nextUpdateTimer);
        nextUpdateTimer = null; }
    const now = new Date();
    const todayKey = DAYS[(now.getDay() + 6) % 7];
    if (!todayKey) {
        const nd = new Date(now);
        nd.setDate(nd.getDate() + 1);
        nd.setHours(0, 1, 0, 0);
        nextUpdateTimer = setTimeout(() => render(false), nd - now);
        return;
    }
    const pairs = getPairsForDay(todayKey, now);
    const candidates = [];
    pairs.forEach((p, idx) => {
        if (!p) return;
        const t = getTimeFor(todayKey, idx);
        if (t.start) { const st = parseHMToDate(t.start, now); if (st && st.getTime() > now.getTime()) candidates.push(st); }
        if (t.end) { const en = parseHMToDate(t.end, now); if (en && en.getTime() > now.getTime()) candidates.push(en); }
    });
    if (candidates.length === 0) {
        const nd = new Date(now);
        nd.setDate(nd.getDate() + 1);
        nd.setHours(0, 1, 0, 0);
        candidates.push(nd);
    }
    candidates.sort((a, b) => a.getTime() - b.getTime());
    const next = candidates[0];
    if (!next) return;
    const delay = Math.max(200, next.getTime() - now.getTime());
    nextUpdateTimer = setTimeout(() => render(false), delay);
}

render(true);

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }