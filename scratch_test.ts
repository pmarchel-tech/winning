import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runDiagnostics() {
  console.log("\n--- Running Supabase Diagnostics ---");
  
  // Test 1: Query public.wins
  console.log("\n1. Testing query from 'wins' table...");
  const { data: winsData, error: winsErr } = await supabase.from('wins').select('*').limit(1);
  if (winsErr) {
    console.error("❌ Failed to query 'wins' table:", winsErr);
  } else {
    console.log("✅ Successfully queried 'wins' table. Rows found:", winsData.length);
  }

  // Test 2: Query public.tags
  console.log("\n2. Testing query from 'tags' table...");
  const { data: tagsData, error: tagsErr } = await supabase.from('tags').select('*').limit(1);
  if (tagsErr) {
    console.error("❌ Failed to query 'tags' table:", tagsErr);
  } else {
    console.log("✅ Successfully queried 'tags' table. Rows found:", tagsData.length);
  }

  // Test 3: Try to insert a dummy win (without being authenticated, using anonymous key)
  console.log("\n3. Testing insert dummy win (anonymous/no auth)...");
  const dummyWinId = 'win_test_' + Math.random().toString(36).substr(2, 9);
  const { error: insertErr } = await supabase.from('wins').insert({
    id: dummyWinId,
    user_id: 'test_user_id',
    text: 'Diagnostics Test Win',
    tags: ['#TEST'],
    created_at: new Date().toISOString(),
    starred: false,
    pinned: false,
    is_habit_mode: false,
    is_be_do_have: false
  });
  if (insertErr) {
    console.error("❌ Failed to insert dummy win:", insertErr);
  } else {
    console.log("✅ Successfully inserted dummy win! (Note: if this succeeded, RLS is likely disabled or misconfigured to allow public inserts)");
    // Cleanup if insert succeeded
    await supabase.from('wins').delete().eq('id', dummyWinId);
  }

  // Test 4: Check RLS status by checking if it fails with specific policy error
  console.log("\n--- Diagnostics Complete ---");
}

runDiagnostics();
