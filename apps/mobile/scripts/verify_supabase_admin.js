require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testAccess() {
    console.log('Testing admin access...');
    // Try to fetch users, which usually requires higher privileges or RLS bypass
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
        console.error('Connection failed:', error.message);
    } else {
        console.log('Success! Admin access verified.');
        console.log('Found users:', data.length);
    }
}

testAccess();
