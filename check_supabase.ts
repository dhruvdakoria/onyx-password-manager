import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
    const [k, ...v] = line.split('=');
    if (k && v) acc[k] = v.join('=').trim().replace(/^"([^"]+)"$/, '$1');
    return acc;
}, {} as Record<string, string>);

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
    const { data: userConfig } = await supabase.from('vault_config').select('*').limit(1);
    console.log("Existing columns in vault_config:", userConfig ? Object.keys(userConfig[0] || {}) : null);

    const { error: err1 } = await supabase.rpc('exec_sql', { query: `ALTER TABLE vault_config ADD COLUMN failed_attempts INT DEFAULT 0, ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;` });
    console.log("Alter table via RPC error:", err1?.message);

    const { data, error } = await supabase.from('vault_config').update({ failed_attempts: 1, locked_until: new Date().toISOString() }).neq('clerk_user_id', 'dummy');
    console.log("Update new columns error:", error?.message);
}
main();
