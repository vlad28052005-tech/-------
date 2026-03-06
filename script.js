document.addEventListener('DOMContentLoaded', () => {

    // --- БЕЗПЕЧНА РОБОТА З ПАМ'ЯТТЮ ---
    function safeSetItem(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { console.warn("Пам'ять заблокована"); }
    }

    function safeGetItem(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    // 🔥 АУДІО-ВІЗУАЛЬНИЙ ДЗЕН: Taptic Engine
    function playHaptic() {
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    }

    // Слухаємо всі кліки по кнопках і даємо вібровідгук
    document.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.btn') || e.target.closest('.roulette-trigger') || e.target.closest('.theme-btn') || e.target.closest('.close-btn') || e.target.closest('.brand')) {
            playHaptic();
        }
    }, { passive: true });

    // 🔥 Звук для рулетки (Синтезатор)
    function playRouletteSound() {
        try {
            const ctx = new(window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
    }

    // --- НАЛАШТУВАННЯ ТА БАЗА ДАНИХ ---
    let defaultData = null;
    const groupMap = { "А": "a", "A": "a", "Б": "b", "В": "v", "B": "v", "Г": "g", "Д": "d" };
    const themeBgColors = {
        'university': '#F2EBE1',
        'dark': '#0f172a',
        'light': '#f8fafc',
        'oled': '#000000',
        'rapunzel': '#F5EEFF',
        'ferrari': '#111111',
        'redbull': '#001021',
        'slytherin': '#060a08'
    };

    function applyThemeColorToPhone(theme) {
        const metaThemeColor = document.getElementById('meta-theme-color');
        if (metaThemeColor && themeBgColors[theme]) {
            metaThemeColor.setAttribute('content', themeBgColors[theme]);
        }
    }

    async function loadSchedule(course, group) {
        const fileGroup = groupMap[group] || "v";
        const url = `./Group/${course}/${course}-${fileGroup}.json`;
        const cacheKey = `saved_schedule_${course}_${group}`;

        try {
            const response = await fetch(`${url}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('NOT_FOUND');
            defaultData = await response.json();
            safeSetItem(cacheKey, JSON.stringify(defaultData));
            render(true);
        } catch (error) {
            console.error("Помилка мережі:", error);
            const cachedData = safeGetItem(cacheKey);
            if (cachedData) {
                try {
                    defaultData = JSON.parse(cachedData);
                    render(true);
                    return;
                } catch (e) {}
            }
            const grid = document.getElementById('weekGrid');
            if (!grid) return;
            if (!navigator.onLine || error.message !== 'NOT_FOUND') {
                grid.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted); grid-column: 1 / -1; background: var(--card); border-radius: 20px; border: 1px solid var(--border);"><h3 style="margin-bottom: 8px;">Немає зв'язку 📶</h3><p>Перевірте інтернет та оновіть сторінку.</p></div>`;
            } else {
                grid.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--muted); grid-column: 1 / -1; background: var(--card); border-radius: 20px; border: 1px solid var(--border);"><h3 style="margin-bottom: 8px;">Ой, розкладу ще немає 😢</h3><p>Розклад для ${course} курсу, групи ${group} ще не додано в базу.</p></div>`;
            }
        }
    }

    const savedTheme = safeGetItem('schedule_theme') || 'university';
    document.documentElement.setAttribute('data-theme', savedTheme);
    applyThemeColorToPhone(savedTheme);

    const savedCourse = safeGetItem('user_course');
    const savedGroup = safeGetItem('user_group');

    function updateHeaderTitle(course, group) {
        const brandElement = document.getElementById('secretTitle');
        if (brandElement && course && group) {
            brandElement.innerHTML = `<span id="displayCourse">${course} курс</span>, <span id="displayGroup">Група ${group}</span>`;
        }
    }

    const welcomeModal = document.getElementById('welcomeModal');
    if (!savedCourse || !savedGroup) {
        if (welcomeModal) {
            welcomeModal.style.display = 'flex';
            setTimeout(() => welcomeModal.classList.add('active'), 10);
        }
    } else {
        updateHeaderTitle(savedCourse, savedGroup);
        loadSchedule(savedCourse, savedGroup);
    }

    const saveOnboardingBtn = document.getElementById('saveOnboardingBtn');
    if (saveOnboardingBtn) {
        saveOnboardingBtn.addEventListener('click', () => {
            const courseSelect = document.getElementById('courseSelect');
            const groupSelect = document.getElementById('groupSelect');
            const courseVal = courseSelect ? courseSelect.value : null;
            const groupVal = groupSelect ? groupSelect.value : null;

            if (courseVal && groupVal) {
                safeSetItem('user_course', courseVal);
                safeSetItem('user_group', groupVal);
                updateHeaderTitle(courseVal, groupVal);
                if (welcomeModal) {
                    welcomeModal.classList.remove('active');
                    setTimeout(() => welcomeModal.style.display = 'none', 300);
                }
                loadSchedule(courseVal, groupVal);
            } else {
                alert("Будь ласка, оберіть курс та групу!");
            }
        });
    }

    const settingsModal = document.getElementById('settingsModal');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const changeGroupBtn = document.getElementById('changeGroupBtn');
    const forceUpdateBtn = document.getElementById('forceUpdateBtn');

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            if (settingsModal) { settingsModal.style.display = 'flex';
                setTimeout(() => settingsModal.classList.add('active'), 10); }
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) { settingsModal.classList.remove('active');
                setTimeout(() => settingsModal.style.display = 'none', 300); }
        });
    }
    if (changeGroupBtn) {
        changeGroupBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.classList.remove('active');
            setTimeout(() => {
                if (settingsModal) settingsModal.style.display = 'none';
                if (welcomeModal) { welcomeModal.style.display = 'flex';
                    setTimeout(() => welcomeModal.classList.add('active'), 10); }
            }, 300);
        });
    }
    if (forceUpdateBtn) {
        forceUpdateBtn.addEventListener('click', () => { window.location.href = window.location.href.split('?')[0] + '?v=' + new Date().getTime(); });
    }

    const slytherinThemeBtn = document.getElementById('slytherinThemeBtn');
    if (slytherinThemeBtn && (safeGetItem('slytherin_unlocked') === 'true' || savedTheme === 'slytherin')) {
        slytherinThemeBtn.style.display = 'block';
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newTheme = e.target.getAttribute('data-set-theme');
            if (!newTheme) return;
            document.documentElement.setAttribute('data-theme', newTheme);
            safeSetItem('schedule_theme', newTheme);
            applyThemeColorToPhone(newTheme);
            if (newTheme === 'slytherin') setSlytherinTitle();
            else updateHeaderTitle(safeGetItem('user_course') || '4', safeGetItem('user_group') || 'В');
            if (settingsModal) { settingsModal.classList.remove('active');
                setTimeout(() => settingsModal.style.display = 'none', 300); }
        });
    });

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
        if (!defaultData || !defaultData.settings) return true;
        const base = mondayOf(new Date(defaultData.settings.baseTopWeekISO || '2026-02-16'));
        const cur = mondayOf(date);
        return Math.round((cur - base) / (7 * 24 * 3600 * 1000)) % 2 === 0;
    }

    function getTimeFor(dayKey, pairIndex) {
        if (!defaultData || !defaultData.times) return { start: '', end: '' };
        return defaultData.times[pairIndex] || { start: '', end: '' };
    }

    function getPairsForDay(dayKey, date) {
        if (!defaultData || !defaultData.template) return [];
        const week = isTopWeek(date) ? 'top' : 'bottom';
        return (defaultData.template[week] && defaultData.template[week][dayKey]) ? defaultData.template[week][dayKey].slice() : [];
    }

    const grid = document.getElementById('weekGrid');
    let currentMonday = mondayOf(new Date());
    let nextUpdateTimer = null;
    let countdownInterval = null;

    function formatDateShort(d) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); }

    function updateWeekLabel() {
        const lbl = document.getElementById('weekLabel');
        const rng = document.getElementById('weekRange');
        if (lbl) lbl.textContent = isTopWeek(currentMonday) ? 'Верхній' : 'Нижній';
        const start = new Date(currentMonday);
        const end = new Date(currentMonday.getTime() + 4 * 86400000);
        if (rng) rng.textContent = `${formatDateShort(start)} — ${formatDateShort(end)}`;
    }

    function render(withStagger = true) {
        if (!defaultData || !grid) return;
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

            let prevEnd = null; // Для розрахунку вікон

            for (const v of pairs) {
                const p = v.p,
                    idx = v.idx;
                const t = getTimeFor(dKey, idx);

                // 🔥 ІНТЕЛЕКТУАЛЬНА ПІДСВІТКА "ВІКОН"
                if (prevEnd && t.start) {
                    const peDate = parseHMToDate(prevEnd, now);
                    const csDate = parseHMToDate(t.start, now);
                    if (peDate && csDate) {
                        const diffMs = csDate - peDate;
                        if (diffMs > 20 * 60000) { // Якщо вікно більше 20 хвилин
                            const diffMins = Math.round(diffMs / 60000);
                            const h = Math.floor(diffMins / 60);
                            const m = diffMins % 60;
                            const gapStr = h > 0 ? `${h} год ${m > 0 ? m + ' хв' : ''}` : `${m} хв`;

                            const gapEl = document.createElement('div');
                            gapEl.className = 'free-window';
                            gapEl.innerHTML = `☕ Вікно: ${gapStr}`;
                            card.appendChild(gapEl);
                        }
                    }
                }
                prevEnd = t.end;

                const box = document.createElement('div');
                box.className = 'pair';
                box.dataset.day = dKey;
                box.dataset.index = idx;

                let chipTimerHtml = '';
                let rouletteBtnHtml = `<div class="roulette-trigger" title="Студентська рулетка">🎲</div>`;

                if (viewingCurrentWeek && sameDay(dayDate, today)) {
                    const en = parseHMToDate(t.end, now);
                    if (en && now > en) { box.classList.add('past');
                        rouletteBtnHtml = ''; }
                    if (idx === currentIdx) {
                        box.classList.add('current');
                        chipTimerHtml = `<span class="chip timer-chip" id="liveTimer" data-end="${t.end}">⏳ Рахую...</span>`;
                    }
                    if (idx === nextIdx && currentIdx !== -1) box.classList.add('next');
                    if (idx === nextIdx && currentIdx === -1) box.classList.add('upcoming');
                }

                let chip = p.type === 'lec' ? '<span class="chip lec">Лекція</span>' : p.type === 'prac' ? '<span class="chip prac">Практика</span>' : '<span class="chip textpair">Інфо</span>';
                chip += chipTimerHtml;

                let placeHtml = '';
                if (p.place) { placeHtml = ` • <span>${p.place}</span>`; }

                box.innerHTML = `<div class="meta"><div style="display:flex;gap:6px;align-items:center;">${chip}</div><div style="display:flex;align-items:center;">${t.start||''} – ${t.end||''}${rouletteBtnHtml}</div></div><h4>${p.title}</h4><div class="muted">${p.teacher||''}${placeHtml}</div>`;

                if (box.classList.contains('next')) {
                    const badge = document.createElement('div');
                    badge.className = 'badge';
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
                if (todayCard) {
                    // Плавний скрол з урахуванням планшетного режиму
                    todayCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 120);
        }

        startLiveTimer();
        scheduleNextPreciseUpdate();
    }

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
                    render(false);
                }
            }
        }, 1000);
    }

    let animating = false;

    function changeWeekAnimated(direction) {
        if (animating || !grid) return;
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

    const prevWeekBtn = document.getElementById('prevWeek');
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => changeWeekAnimated(-1));

    const nextWeekBtn = document.getElementById('nextWeek');
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => changeWeekAnimated(1));

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentMonday = mondayOf(new Date());
            render(true);
        });
    }

    let startX = 0,
        startY = 0;
    document.addEventListener('touchstart', e => {
        if (e.changedTouches) { startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY; }
    }, { passive: true });
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

    // 🔥 ФІКС НІЧНОГО БАГУ (АВТО-ПЕРЕМИКАННЯ ДНЯ РІВНО О 00:00)
    function scheduleMidnightRefresh() {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        const msUntilMidnight = midnight - now;
        setTimeout(() => {
            currentMonday = mondayOf(new Date());
            render(false);
            scheduleMidnightRefresh();
        }, msUntilMidnight);
    }
    scheduleMidnightRefresh();

    // 🪄 Пасхалка Слизерину
    const brandElement = document.getElementById('secretTitle');
    let clickCount = 0;
    let clickTimer = null;

    function setSlytherinTitle() {
        if (!brandElement) return;
        const crestUrl = './Slytherin.png';
        brandElement.innerHTML = `<img src="${crestUrl}" alt="Slytherin Crest" class="brand-crest"><span id="displayCourse">${safeGetItem('user_course')||'4'} курс</span>, <span id="displayGroup">Група ${safeGetItem('user_group')||'В'}</span>`;
    }

    if (savedTheme === 'slytherin') { setSlytherinTitle(); }

    if (brandElement) {
        brandElement.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            if (clickCount === 5) {
                safeSetItem('slytherin_unlocked', 'true');
                const slythBtn = document.getElementById('slytherinThemeBtn');
                if (slythBtn) slythBtn.style.display = 'block';
                document.documentElement.setAttribute('data-theme', 'slytherin');
                safeSetItem('schedule_theme', 'slytherin');
                applyThemeColorToPhone('slytherin');
                setSlytherinTitle();
                clickCount = 0;
            } else {
                clickTimer = setTimeout(() => { clickCount = 0; }, 400);
            }
        });
    }

    // 🔗 Логіка QR-коду
    const qrBtn = document.getElementById('qrBtn');
    const qrModal = document.getElementById('qrModal');
    const closeQr = document.getElementById('closeQr');
    const qrImage = document.getElementById('qrImage');

    if (qrBtn && qrModal && closeQr && qrImage) {
        qrBtn.addEventListener('click', () => {
            const currentUrl = window.location.href.split('#')[0].split('?')[0];
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
            if (settingsModal) { settingsModal.classList.remove('active');
                setTimeout(() => settingsModal.style.display = 'none', 300); }
            setTimeout(() => { qrModal.style.display = 'flex';
                setTimeout(() => qrModal.classList.add('active'), 10); }, 300);
        });
        closeQr.addEventListener('click', () => {
            qrModal.classList.remove('active');
            setTimeout(() => qrModal.style.display = 'none', 300);
        });
    }

    // 🔥 ЛОГІКА ПОШИРЕННЯ
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const course = safeGetItem('user_course') || '4';
            const group = safeGetItem('user_group') || 'В';
            const cleanUrl = window.location.href.split('#')[0].split('?')[0];
            const shareUrl = `${cleanUrl}?course=${course}&group=${group.toLowerCase()}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                const originalText = copyLinkBtn.innerHTML;
                copyLinkBtn.innerHTML = "✅ Скопійовано!";
                copyLinkBtn.style.background = "rgba(16, 185, 129, 0.2)";
                setTimeout(() => { copyLinkBtn.innerHTML = originalText;
                    copyLinkBtn.style.background = "rgba(16, 185, 129, 0.1)"; }, 2000);
            });
        });
    }

    // 🎲 ЛОГІКА РУЛЕТКИ
    const rouletteModal = document.getElementById('rouletteModal');
    const closeRoulette = document.getElementById('closeRoulette');
    const spinRouletteBtn = document.getElementById('spinRouletteBtn');
    const rouletteIcon = document.getElementById('rouletteIcon');
    const rouletteResult = document.getElementById('rouletteResult');
    const rouletteDesc = document.getElementById('rouletteDesc');

    const roulettePhrases = [
        "Йди, бо не допустять до сесії 😤", "Спи, це всього лиш лекція 😴",
        "Спитай у старости, чи є відмітка 📱", "Сьогодні можна пропустити 🤫",
        "Збирайся, кава сама себе не вип'є ☕", "Йди, можливо сьогодні щось цікаве 🤓",
        "5 хвилин ганьби і ти в ліжку 🛌"
    ];

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.roulette-trigger');
        if (btn && rouletteModal) {
            rouletteResult.textContent = "Йти чи не йти?";
            rouletteDesc.textContent = "Натисни кнопку, щоб доля вирішила за тебе";
            rouletteIcon.textContent = "🎲";
            rouletteModal.style.display = 'flex';
            setTimeout(() => rouletteModal.classList.add('active'), 10);
        }
    });

    if (closeRoulette) {
        closeRoulette.addEventListener('click', () => {
            rouletteModal.classList.remove('active');
            setTimeout(() => rouletteModal.style.display = 'none', 300);
        });
    }

    if (spinRouletteBtn) {
        spinRouletteBtn.addEventListener('click', () => {
            playRouletteSound(); // 🔥 Запускаємо звук
            rouletteIcon.classList.remove('spin-anim');
            void rouletteIcon.offsetWidth;
            rouletteIcon.classList.add('spin-anim');

            rouletteResult.textContent = "Доля думає...";
            rouletteDesc.textContent = "Крутимо кубик...";

            setTimeout(() => {
                const random = Math.floor(Math.random() * roulettePhrases.length);
                rouletteResult.textContent = roulettePhrases[random];
                rouletteDesc.textContent = "Рішення прийнято!";
                const emojiList = ["🎲", "🎱", "🎯", "🔮"];
                rouletteIcon.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
            }, 600);
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
            setTimeout(() => e.target.style.display = 'none', 300);
        }
    });

    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }

});