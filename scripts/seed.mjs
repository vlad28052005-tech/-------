// Заливає data/schedules.js у таблицю schedules.
// За замовчуванням не чіпає групи, які вже є в базі; `--force` перезаписує їх.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadEnv, adminHeaders } from './env.mjs';

const env = loadEnv();
const force = process.argv.includes('--force');

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL('../data/schedules.js', import.meta.url), 'utf8'), sandbox);
const rows = sandbox.window.LOCAL_SCHEDULES;

const res = await fetch(`${env.SUPABASE_URL}/rest/v1/schedules?on_conflict=course,group_code`, {
    method: 'POST',
    headers: {
        ...adminHeaders(env),
        Prefer: `resolution=${force ? 'merge' : 'ignore'}-duplicates,return=representation`
    },
    body: JSON.stringify(rows)
});

if (!res.ok) {
    console.error(`Помилка ${res.status}:`, await res.text());
    process.exit(1);
}
const written = await res.json();
console.log(`Записано ${written.length} з ${rows.length} груп${force ? '' : ' (наявні пропущено, --force щоб перезаписати)'}.`);
