// Створює редактора з логіном і паролем (або змінює пароль наявному).
// Використання: npm run create-editor -- <логін> [пароль]
// Якщо пароль не вказано — згенерується випадковий.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomBytes } from 'node:crypto';
import { loadEnv, adminHeaders } from './env.mjs';

const env = loadEnv();
const [login, passwordArg] = process.argv.slice(2);
if (!login || !/^[a-z0-9._-]{3,32}$/i.test(login)) {
    console.error('Використання: npm run create-editor -- <логін> [пароль]\nЛогін: 3–32 символи, латиниця, цифри, . _ -');
    process.exit(1);
}

// Домен беремо з config.js, щоб він збігався з тим, що використовує admin.html.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL('../config.js', import.meta.url), 'utf8'), sandbox);
const email = `${login.toLowerCase()}@${sandbox.window.APP_CONFIG.editorLoginDomain}`;
const password = passwordArg || randomBytes(9).toString('base64url');
const headers = adminHeaders(env);

async function findUser() {
    for (let page = 1; ; page++) {
        const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, { headers });
        const { users = [] } = await res.json();
        const hit = users.find(u => u.email?.toLowerCase() === email);
        if (hit || users.length < 200) return hit;
    }
}

let user = await findUser();
const res = user
    ? await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: 'PUT', headers, body: JSON.stringify({ password }) })
    : await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email, password, email_confirm: true }) });
if (!res.ok) {
    console.error(`Не вдалося ${user ? 'змінити пароль' : 'створити користувача'} (${res.status}):`, await res.text());
    process.exit(1);
}
user = await res.json();

const link = await fetch(`${env.SUPABASE_URL}/rest/v1/editors?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: user.id })
});
if (!link.ok) {
    console.error(`Не вдалося додати в editors (${link.status}):`, await link.text());
    process.exit(1);
}

console.log(`Логін:  ${login.toLowerCase()}`);
console.log(`Пароль: ${password}`);
