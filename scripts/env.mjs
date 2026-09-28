import { readFileSync } from 'node:fs';

// Мінімальний парсер .env, щоб не тягнути залежності.
export function loadEnv() {
    const env = { ...process.env };
    try {
        for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (m && !env[m[1]]) env[m[1]] = m[2];
        }
    } catch {}
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
        console.error('Потрібні SUPABASE_URL та SUPABASE_SECRET_KEY у .env');
        process.exit(1);
    }
    return env;
}

export function adminHeaders(env) {
    return {
        apikey: env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json'
    };
}
