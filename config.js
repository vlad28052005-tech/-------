// Публічна конфігурація. Publishable-ключ можна світити у браузері:
// доступ до даних обмежують RLS-політики (див. supabase/schema.sql).
window.APP_CONFIG = {
    supabaseUrl: 'https://wgzqnzalquzwfutirvdu.supabase.co',
    supabaseKey: 'sb_publishable__na7VNVx8m_72xuAIPtAMQ_HM1aFoVd',
    // Редактори входять за логіном; Supabase Auth потребує email, тому логін
    // перетворюється на службову адресу login@<домен>. Листи на неї не надсилаються.
    editorLoginDomain: 'rozklad.local'
};
