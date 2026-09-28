(() => {
'use strict';

if (!window.supabase || !window.APP_CONFIG) {
    document.getElementById('loadingView').textContent = 'Не вдалося завантажити бібліотеку Supabase. Перевірте інтернет і оновіть сторінку.';
    return;
}

const { supabaseUrl, supabaseKey, editorLoginDomain } = window.APP_CONFIG;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Логін ↔ службовий email у Supabase Auth (див. config.js).
const loginToEmail = (login) => login.includes('@') ? login : `${login.toLowerCase()}@${editorLoginDomain}`;
const emailToLogin = (email) => email.endsWith(`@${editorLoginDomain}`) ? email.slice(0, -editorLoginDomain.length - 1) : email;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = { mon: 'Понеділок', tue: 'Вівторок', wed: 'Середа', thu: 'Четвер', fri: 'П\'ятниця', sat: 'Субота' };
const WEEK_NAMES = { top: 'верхній', bottom: 'нижній' };
const TYPES = [['', '— порожньо —'], ['lec', 'Лекція'], ['prac', 'Практика'], ['info', 'Інфо']];
const DEFAULT_TIMES = [
    { start: '08:00', end: '09:30' }, { start: '09:40', end: '11:10' }, { start: '11:20', end: '12:50' },
    { start: '13:10', end: '14:40' }, { start: '14:50', end: '16:20' }, { start: '16:30', end: '18:00' }
];

const $ = (id) => document.getElementById(id);

let rows = [];          // усі групи з бази
let current = null;     // рядок, що редагується (глибока копія)
let isNew = false;
let dirty = false;
let week = 'top';

// ---------- утиліти ----------

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function mondayOf(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    d.setHours(0, 0, 0, 0);
    return d;
}

function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Приводимо дані до повної форми, щоб редактору не доводилось перевіряти undefined.
function normalizeData(data) {
    const d = clone(data || {});
    d.settings = { baseTopWeekISO: toISODate(mondayOf(new Date())), ...(d.settings || {}) };
    d.times = Array.isArray(d.times) && d.times.length ? d.times : clone(DEFAULT_TIMES);
    d.template = d.template || {};
    for (const w of ['top', 'bottom']) {
        d.template[w] = d.template[w] || {};
        for (const day of DAYS) d.template[w][day] = Array.isArray(d.template[w][day]) ? d.template[w][day] : [];
    }
    return d;
}

// Прибираємо порожні хвости днів, щоб у базі не лежали масиви з null.
function compactData(data) {
    const d = clone(data);
    for (const w of ['top', 'bottom']) {
        for (const day of DAYS) {
            const arr = d.template[w][day].map(p => (p && p.type) ? {
                type: p.type, title: (p.title || '').trim(), teacher: (p.teacher || '').trim(), place: (p.place || '').trim()
            } : null);
            while (arr.length && !arr[arr.length - 1]) arr.pop();
            d.template[w][day] = arr;
        }
    }
    return d;
}

function setStatus(text, kind = '') {
    const el = $('status');
    el.textContent = text;
    el.className = kind || 'muted';
}

function markDirty() {
    dirty = true;
    setStatus('Є незбережені зміни');
}

function show(view) {
    for (const id of ['loginView', 'loadingView', 'editorView']) $(id).classList.toggle('hidden', id !== view);
    $('saveBar').classList.toggle('hidden', view !== 'editorView');
    $('userBox').classList.toggle('hidden', view === 'loginView' || view === 'loadingView');
}

// ---------- авторизація ----------

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return show('loginView');
    await enterEditor(session.user);
}

$('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginError').textContent = '';
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginToEmail($('login').value.trim()), password: $('password').value });
    if (error) {
        $('loginError').textContent = error.message === 'Invalid login credentials' ? 'Невірний логін або пароль' : error.message;
        return;
    }
    show('loadingView');
    await enterEditor(data.user);
});

$('logoutBtn').addEventListener('click', async () => {
    if (dirty && !confirm('Є незбережені зміни. Все одно вийти?')) return;
    dirty = false;
    await supabase.auth.signOut();
    show('loginView');
});

async function enterEditor(user) {
    $('userEmail').textContent = emailToLogin(user.email);
    const { data: editor, error } = await supabase.from('editors').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error || !editor) {
        show('loginView');
        $('loginError').textContent = error ? `Помилка: ${error.message}` : 'Цей акаунт не має прав редагувати розклад.';
        await supabase.auth.signOut();
        return;
    }
    await loadRows();
    show('editorView');
    const last = localStorage.getItem('admin_last_group');
    selectRow(rows.find(r => r.id === last) || rows[0] || null);
}

// ---------- список груп ----------

async function loadRows() {
    const { data, error } = await supabase.from('schedules').select('*').order('sort_order').order('course').order('group_code');
    if (error) {
        setStatus(`Не вдалося завантажити групи: ${error.message}`, 'err');
        rows = [];
        return;
    }
    rows = data;
    renderPicker();
}

function renderPicker() {
    const opts = rows.map(r => `<option value="${r.id}">${escapeHtml(r.course_label)} — ${escapeHtml(r.group_label)}${r.is_published ? '' : ' (приховано)'}</option>`);
    if (isNew) opts.push(`<option value="__new">★ Нова група (не збережено)</option>`);
    $('groupPicker').innerHTML = opts.join('');
    $('groupPicker').value = isNew ? '__new' : (current?.id || '');
}

$('groupPicker').addEventListener('change', (e) => {
    if (dirty && !confirm('Є незбережені зміни. Відкинути їх?')) {
        renderPicker();
        return;
    }
    selectRow(rows.find(r => r.id === e.target.value) || null);
});

function selectRow(row) {
    if (!row) return startNew();
    isNew = false;
    current = clone(row);
    current.data = normalizeData(current.data);
    dirty = false;
    localStorage.setItem('admin_last_group', row.id);
    renderAll();
    setStatus(`Останні зміни: ${new Date(row.updated_at).toLocaleString('uk-UA')}`);
}

function startNew(base = null) {
    isNew = true;
    codesTouched = false;
    current = {
        course: '',
        course_label: base?.course_label || '',
        group_code: '',
        group_label: '',
        sort_order: 0,
        is_published: true,
        data: normalizeData(base ? base.data : null)
    };
    autofillCodes();
    dirty = true;
    renderAll();
    setStatus('Нова група — вкажіть курс і назву групи та збережіть');
    $(current.course_label ? 'f-group-label' : 'f-course-label').focus();
}

// ---------- автоматичні коди для нової групи ----------

let codesTouched = false; // якщо редактор сам змінив коди — більше їх не перезаписуємо

function courseCodeFromLabel(label) {
    const existing = rows.find(r => r.course_label.toLowerCase() === label.toLowerCase());
    if (existing) return existing.course;
    const digits = label.match(/\d+/);
    if (/магістр/i.test(label)) return digits ? `magistr-${digits[0]}` : 'magistr';
    if (digits) return digits[0];
    return label.toLowerCase().replace(/\s+/g, '-');
}

function groupCodeFromLabel(label) {
    return label.replace(/^\s*(під)?група\s*/i, '').replace(/\s+/g, '').toUpperCase() || label.trim().toUpperCase();
}

function sortOrderFor(course) {
    const same = rows.filter(r => r.course === course);
    if (same.length) return Math.max(...same.map(r => r.sort_order)) + 1;
    return (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 10;
}

function autofillCodes() {
    if (!isNew || codesTouched) return;
    current.course = current.course_label ? courseCodeFromLabel(current.course_label) : '';
    current.group_code = current.group_label ? groupCodeFromLabel(current.group_label) : '';
    current.sort_order = sortOrderFor(current.course);
    $('f-course').value = current.course;
    $('f-group').value = current.group_code;
    $('f-sort').value = current.sort_order;
}

$('newGroupBtn').addEventListener('click', () => {
    if (dirty && !confirm('Є незбережені зміни. Відкинути їх?')) return;
    startNew();
});

$('duplicateBtn').addEventListener('click', () => {
    if (!current) return;
    if (dirty && !isNew && !confirm('Є незбережені зміни. Дублювати групу разом з ними?')) return;
    startNew(clone(current));
});

// ---------- рендер форми ----------

function renderAll() {
    renderPicker();
    $('f-course').value = current.course;
    $('f-course-label').value = current.course_label;
    $('f-group').value = current.group_code;
    $('f-group-label').value = current.group_label;
    $('f-sort').value = current.sort_order;
    $('f-published').checked = current.is_published;
    $('courseOptions').innerHTML = [...new Set(rows.map(r => r.course_label))].map(l => `<option value="${escapeHtml(l)}">`).join('');
    $('deleteBtn').disabled = isNew;
    updatePreviewLink();
    renderParity();
    renderTimes();
    renderDays();
}

function updatePreviewLink() {
    // Посилання на теку, а не на index.html: сервери перенаправляють /index.html → / і гублять параметри.
    const page = location.protocol === 'file:' ? 'index.html' : './';
    const link = $('previewLink');
    link.href = `${page}?course=${encodeURIComponent(current.course)}&group=${encodeURIComponent(current.group_code)}`;
    link.title = current.is_published ? 'Відкрити розклад цієї групи (збережену версію)' : 'Група прихована — студенти її не бачать, перегляд теж покаже, що розкладу немає';
}

// Парність тижнів зберігається як «понеділок першого верхнього тижня». Редактору простіше
// відповісти, який тиждень зараз, — з цього й обчислюємо дату.
function isTopNow() {
    const base = mondayOf(new Date(current.data.settings.baseTopWeekISO));
    const weeks = Math.round((mondayOf(new Date()) - base) / (7 * 86400000));
    return ((weeks % 2) + 2) % 2 === 0;
}

function renderParity() {
    const top = isTopNow();
    document.querySelectorAll('#parityTabs .tab').forEach(t => t.classList.toggle('active', (t.dataset.parity === 'top') === top));
    const mon = mondayOf(new Date());
    const sat = new Date(mon.getTime() + 5 * 86400000);
    const fmt = (d) => d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    $('weekHint').textContent = `Поточний тиждень ${fmt(mon)}–${fmt(sat)}. Далі верхній і нижній чергуються автоматично.`;
}

$('parityTabs').addEventListener('click', (e) => {
    const parity = e.target.dataset.parity;
    if (!parity || (parity === 'top') === isTopNow()) return;
    const mon = mondayOf(new Date());
    if (parity === 'bottom') mon.setDate(mon.getDate() - 7);
    current.data.settings.baseTopWeekISO = toISODate(mon);
    renderParity();
    markDirty();
});

$('f-course-label').addEventListener('input', (e) => {
    current.course_label = e.target.value.trim();
    autofillCodes();
    updatePreviewLink();
    markDirty();
});
$('f-group-label').addEventListener('input', (e) => {
    current.group_label = e.target.value.trim();
    autofillCodes();
    updatePreviewLink();
    markDirty();
});
for (const [id, key] of [['f-course', 'course'], ['f-group', 'group_code']]) {
    $(id).addEventListener('input', (e) => {
        codesTouched = true;
        current[key] = e.target.value.trim();
        updatePreviewLink();
        markDirty();
    });
}
$('f-sort').addEventListener('input', (e) => { codesTouched = true; current.sort_order = Number(e.target.value) || 0; markDirty(); });
$('f-published').addEventListener('change', (e) => { current.is_published = e.target.checked; updatePreviewLink(); markDirty(); });

function renderTimes() {
    const last = current.data.times.length - 1;
    $('timesList').innerHTML = current.data.times.map((t, i) => `
        <div class="time-row">
            <span class="num">${i + 1}</span>
            <input type="time" value="${escapeHtml(t.start)}" data-time="${i}" data-edge="start" aria-label="Початок ${i + 1} пари">
            <input type="time" value="${escapeHtml(t.end)}" data-time="${i}" data-edge="end" aria-label="Кінець ${i + 1} пари">
            ${i === last && last > 0 ? `<button class="btn small danger" data-remove-time="${i}" title="Прибрати останню пару">✕</button>` : '<span></span>'}
        </div>`).join('');
}

$('timesList').addEventListener('input', (e) => {
    const i = e.target.dataset.time;
    if (i === undefined) return;
    current.data.times[i][e.target.dataset.edge] = e.target.value;
    renderDays();
    markDirty();
});

$('timesList').addEventListener('click', (e) => {
    const i = e.target.dataset.removeTime;
    if (i === undefined) return;
    // Прибираємо лише останню пару, тож час і номери інших пар не зсуваються.
    const idx = current.data.times.length - 1;
    const busy = [];
    for (const w of ['top', 'bottom']) for (const d of DAYS) {
        if (current.data.template[w][d].slice(idx).some(Boolean)) busy.push(`${DAY_NAMES[d]} (${WEEK_NAMES[w]})`);
    }
    if (busy.length && !confirm(`На ${idx + 1} парі є заняття: ${busy.join(', ')}. Прибрати пару разом із ними?`)) return;
    current.data.times.pop();
    for (const w of ['top', 'bottom']) for (const d of DAYS) current.data.template[w][d].length = Math.min(current.data.template[w][d].length, idx);
    renderTimes();
    renderDays();
    markDirty();
});

$('addTimeBtn').addEventListener('click', () => {
    const last = current.data.times[current.data.times.length - 1];
    let next = { start: '', end: '' };
    if (last?.end) {
        const [h, m] = last.end.split(':').map(Number);
        const start = h * 60 + m + 10, end = start + 90;
        const fmt = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
        next = { start: fmt(start), end: fmt(end) };
    }
    current.data.times.push(next);
    renderTimes();
    renderDays();
    markDirty();
});

function renderDays() {
    const other = week === 'top' ? 'bottom' : 'top';
    $('copyWeekBtn').textContent = `Скопіювати ${WEEK_NAMES[week]} → ${WEEK_NAMES[other]}`;
    const times = current.data.times;
    $('daysList').innerHTML = DAYS.map(day => {
        const pairs = current.data.template[week][day];
        const count = Math.max(times.length, pairs.length);
        let slots = '';
        for (let i = 0; i < count; i++) {
            const p = pairs[i];
            const t = times[i] || {};
            const type = p?.type || '';
            slots += `
                <div class="slot${type ? '' : ' empty'}" data-day="${day}" data-idx="${i}">
                    <div class="when"><b>${i + 1} пара</b><br>${escapeHtml(t.start || '—')}–${escapeHtml(t.end || '—')}</div>
                    <select data-field="type" data-type="${type}" aria-label="Тип">${TYPES.map(([v, l]) => `<option value="${v}"${v === type ? ' selected' : ''}>${l}</option>`).join('')}</select>
                    <input class="f-title" data-field="title" placeholder="Предмет" value="${escapeHtml(p?.title)}">
                    <input class="f-teacher" data-field="teacher" placeholder="Викладач" value="${escapeHtml(p?.teacher)}">
                    <input class="f-place" data-field="place" placeholder="Аудиторія / посилання" value="${escapeHtml(p?.place)}">
                </div>`;
        }
        const filled = pairs.filter(Boolean).length;
        return `
            <div class="day">
                <div class="day-head">
                    <strong>${DAY_NAMES[day]} <span class="muted">· ${filled ? `${filled} пар` : 'вихідний'}</span></strong>
                    ${filled ? `<button class="btn small" data-clear-day="${day}">Очистити день</button>` : ''}
                </div>
                ${slots}
            </div>`;
    }).join('');
}

document.querySelectorAll('#weekTabs .tab').forEach(tab => tab.addEventListener('click', () => {
    week = tab.dataset.week;
    document.querySelectorAll('#weekTabs .tab').forEach(t => t.classList.toggle('active', t === tab));
    renderDays();
}));

$('daysList').addEventListener('input', (e) => {
    const slot = e.target.closest('.slot');
    const field = e.target.dataset.field;
    if (!slot || !field || field === 'type') return;
    const p = current.data.template[week][slot.dataset.day][slot.dataset.idx];
    if (p) { p[field] = e.target.value; markDirty(); }
});

$('daysList').addEventListener('change', (e) => {
    const slot = e.target.closest('.slot');
    if (!slot || e.target.dataset.field !== 'type') return;
    const arr = current.data.template[week][slot.dataset.day];
    const idx = Number(slot.dataset.idx);
    while (arr.length <= idx) arr.push(null);
    const type = e.target.value;
    if (!type) arr[idx] = null;
    else if (arr[idx]) arr[idx].type = type;
    else arr[idx] = { type, title: '', teacher: '', place: '' };
    renderDays();
    markDirty();
    if (type) document.querySelector(`.slot[data-day="${slot.dataset.day}"][data-idx="${idx}"] .f-title`)?.focus();
});

$('daysList').addEventListener('click', (e) => {
    const day = e.target.dataset.clearDay;
    if (!day || !confirm(`Очистити ${DAY_NAMES[day].toLowerCase()} (${WEEK_NAMES[week]} тиждень)?`)) return;
    current.data.template[week][day] = [];
    renderDays();
    markDirty();
});

$('copyWeekBtn').addEventListener('click', () => {
    const other = week === 'top' ? 'bottom' : 'top';
    if (!confirm(`Замінити весь ${WEEK_NAMES[other]} тиждень копією ${WEEK_NAMES[week] === 'верхній' ? 'верхнього' : 'нижнього'}?`)) return;
    current.data.template[other] = clone(current.data.template[week]);
    markDirty();
    setStatus(`Скопійовано в ${WEEK_NAMES[other]} тиждень — не забудьте зберегти`);
});

// ---------- JSON ----------

$('jsonRefreshBtn').addEventListener('click', () => {
    $('jsonBox').value = JSON.stringify(compactData(current.data), null, 2);
});
$('jsonDetails').addEventListener('toggle', (e) => {
    if (e.target.open) $('jsonRefreshBtn').click();
});
$('jsonApplyBtn').addEventListener('click', () => {
    let parsed;
    try { parsed = JSON.parse($('jsonBox').value); } catch (err) {
        return setStatus(`Некоректний JSON: ${err.message}`, 'err');
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.template) {
        return setStatus('JSON має містити щонайменше поле "template"', 'err');
    }
    current.data = normalizeData(parsed);
    renderAll();
    markDirty();
});

// ---------- збереження ----------

function validate() {
    if (!current.course_label || !current.group_label) return 'Вкажіть курс і назву групи';
    if (!current.course || !current.group_code) return 'Порожній код курсу або групи (розділ «Технічні поля»)';
    const bad = current.data.times.findIndex(t => !/^\d{2}:\d{2}$/.test(t.start) || !/^\d{2}:\d{2}$/.test(t.end) || t.start >= t.end);
    if (bad !== -1) return `Перевірте час ${bad + 1} пари`;
    for (const w of ['top', 'bottom']) {
        for (const d of DAYS) {
            const i = current.data.template[w][d].findIndex(p => p && !(p.title || '').trim());
            if (i !== -1) return `${DAY_NAMES[d]}, ${WEEK_NAMES[w]} тиждень, ${i + 1} пара: немає назви предмета`;
        }
    }
    return null;
}

async function save() {
    const problem = validate();
    if (problem) return setStatus(problem, 'err');

    $('saveBtn').disabled = true;
    setStatus('Зберігаю…');
    const payload = {
        course: current.course,
        course_label: current.course_label,
        group_code: current.group_code,
        group_label: current.group_label,
        sort_order: current.sort_order,
        is_published: current.is_published,
        data: compactData(current.data)
    };
    const query = isNew
        ? supabase.from('schedules').insert(payload)
        : supabase.from('schedules').update(payload).eq('id', current.id);
    const { data, error } = await query.select().single();
    $('saveBtn').disabled = false;

    if (error) {
        const msg = error.code === '23505' ? 'Група з таким кодом курсу і групи вже існує' : error.message;
        return setStatus(`Не збережено: ${msg}`, 'err');
    }
    isNew = false;
    dirty = false;
    const i = rows.findIndex(r => r.id === data.id);
    if (i === -1) rows.push(data); else rows[i] = data;
    rows.sort((a, b) => a.sort_order - b.sort_order);
    selectRow(data);
    setStatus(`Збережено о ${new Date().toLocaleTimeString('uk-UA')}`, 'ok');
}

$('saveBtn').addEventListener('click', save);
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && current) {
        e.preventDefault();
        save();
    }
});

$('deleteBtn').addEventListener('click', async () => {
    if (isNew || !current) return;
    if (!confirm(`Видалити «${current.course_label} — ${current.group_label}»? Це не можна скасувати.`)) return;
    const { error } = await supabase.from('schedules').delete().eq('id', current.id);
    if (error) return setStatus(`Не видалено: ${error.message}`, 'err');
    rows = rows.filter(r => r.id !== current.id);
    dirty = false;
    selectRow(rows[0] || null);
    setStatus('Групу видалено', 'ok');
});

window.addEventListener('beforeunload', (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

init().catch(err => {
    show('loginView');
    $('loginError').textContent = `Не вдалося підключитися до Supabase: ${err.message}`;
});

})();
