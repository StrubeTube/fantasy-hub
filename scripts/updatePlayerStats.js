const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use anon key for now
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSleeperStats() {
  try {
    console.log('Fetching 2024 season stats from Sleeper API...');
    const response = await fetch('https://api.sleeper.app/v1/stats/nfl/regular/2024');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const stats = await response.json();
    console.log(`Fetched stats for ${Object.keys(stats).length} players`);
    return stats;
  } catch (error) {
    console.error('Error fetching Sleeper stats:', error);
    throw error;
  }
}

async function updatePlayerStats() {
  try {
    // Fetch Sleeper stats
    const sleeperStats = await fetchSleeperStats();
    
    // Get all players from Supabase
    console.log('Fetching players from Supabase...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_id, name, position');
    
    if (playersError) {
      throw new Error(`Error fetching players: ${playersError.message}`);
    }
    
    console.log(`Found ${players.length} players in database`);
    
    // Prepare updates
    const updates = [];
    let updatedCount = 0;
    let skippedCount = 0;
    
    console.log('Processing players...');
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerStats = sleeperStats[player.player_id];
      
      // Show progress every 100 players
      if (i % 100 === 0) {
        console.log(`Progress: ${i}/${players.length} players processed`);
      }
      
      if (playerStats) {
        // Calculate 24_Finish (positional rank)
        const finish24 = playerStats.pos_rank_half_ppr || null;
        
        // Calculate 24_PPG (points per game)
        let ppg24 = null;
        if (playerStats.pts_half_ppr !== undefined && playerStats.gp && playerStats.gp > 0) {
          ppg24 = parseFloat((playerStats.pts_half_ppr / playerStats.gp).toFixed(2));
        }
        
        updates.push({
          player_id: player.player_id,
          '24_Finish': finish24,
          '24_PPG': ppg24
        });
        
        updatedCount++;
        
        // Log some examples for verification
        if (updatedCount <= 3) {
          console.log(`✅ Player: ${player.name} (${player.position})`);
          console.log(`  24_Finish: ${finish24}`);
          console.log(`  24_PPG: ${ppg24}`);
          console.log(`  Raw stats - pts_half_ppr: ${playerStats.pts_half_ppr}, gp: ${playerStats.gp}`);
          console.log('---');
        }
      } else {
        skippedCount++;
        if (skippedCount <= 3) {
          console.log(`❌ No stats found for player: ${player.name} (ID: ${player.player_id})`);
        }
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Players with stats found: ${updatedCount}`);
    console.log(`- Players without stats: ${skippedCount}`);
    
    if (updates.length > 0) {
      // Update players individually to avoid constraint issues
      console.log(`\nUpdating ${updates.length} players...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        
        // Show progress every 50 players
        if (i % 50 === 0) {
          console.log(`Progress: ${i}/${updates.length} players updated`);
        }
        
        const { error: updateError } = await supabase
          .from('players')
          .update({
            '24_Finish': update['24_Finish'],
            '24_PPG': update['24_PPG']
          })
          .eq('player_id', update.player_id);
        
        if (updateError) {
          console.error(`❌ Error updating player ${update.player_id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      console.log(`\n🎉 Update complete!`);
      console.log(`✅ Successfully updated: ${successCount} players`);
      console.log(`❌ Errors: ${errorCount} players`);
    } else {
      console.log('No updates to perform.');
    }
    
  } catch (error) {
    console.error('❌ Error updating player stats:', error);
    process.exit(1);
  }
}

// Run the update
updatePlayerStats(); 