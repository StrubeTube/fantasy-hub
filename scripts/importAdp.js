const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Path to the downloaded FantasyPros CSV
const CSV_PATH = path.join(__dirname, '..', 'fantasypros_adp.csv');

// Helper to normalize names (lowercase, remove punctuation/suffixes)
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // remove punctuation
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '') // remove suffixes
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  // Read and parse CSV
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  // Fetch all players from Supabase and build a normalized name -> player_id map
  const { data: dbPlayers, error: dbError } = await supabase.from('players').select('player_id, name');
  if (dbError) {
    console.error('Error fetching players from Supabase:', dbError.message);
    process.exit(1);
  }
  const nameToId = {};
  dbPlayers.forEach(p => {
    nameToId[normalizeName(p.name)] = p.player_id;
  });

  console.log('--- Sample normalized DB names ---');
  console.log(Object.keys(nameToId).slice(0, 20));

  console.log('--- Sample normalized CSV names ---');
  for (let i = 0; i < 20; i++) {
    const row = records[i];
    if (row && row.Player) {
      console.log(normalizeName(row.Player));
    }
  }

  let updated = 0, failed = 0;

  for (const row of records) {
    const name = row.Player?.trim();
    const adp = parseFloat(row.ADP);

    if (!name || isNaN(adp)) continue;

    const normName = normalizeName(name);
    const player_id = nameToId[normName];

    if (player_id) {
      // Update by player_id
      const { error } = await supabase
        .from('players')
        .update({ adp })
        .eq('player_id', player_id);
      if (error) {
        console.error(`Failed to update ${name}:`, error.message);
        failed++;
      } else {
        console.log(`Updated ${name} with ADP ${adp}`);
        updated++;
      }
    } else {
      console.warn(`No match found for ${name}`);
      failed++;
    }
  }

  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);
}

main();
