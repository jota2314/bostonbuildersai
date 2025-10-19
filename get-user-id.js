// Run this script to get your user ID
// Usage: node get-user-id.js YOUR_EMAIL_HERE

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserId(email) {
  try {
    // Get user by email
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    const user = data.users.find(u => u.email === email);

    if (user) {
      console.log('\n✅ Found your user!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', user.email);
      console.log('User ID:', user.id);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\nAdd this to your .env.local file:');
      console.log(`JORGE_USER_ID=${user.id}`);
      console.log('\n');
    } else {
      console.log('❌ No user found with email:', email);
      console.log('\nAvailable users:');
      data.users.forEach(u => {
        console.log('-', u.email);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.log('Usage: node get-user-id.js YOUR_EMAIL_HERE');
  console.log('Example: node get-user-id.js jorgebetancurf@gmail.com');
  process.exit(1);
}

getUserId(email);
