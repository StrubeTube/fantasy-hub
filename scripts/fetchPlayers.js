const fs = require('fs');
const fetch = require('node-fetch').default;

async function fetchAndSavePlayers() {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    const data = await res.json();

    const filtered = Object.values(data)
      .filter((player) =>
        player.full_name &&
        player.team &&
        player.position &&
        player.status !== 'Inactive' &&
        ['QB', 'RB', 'WR', 'TE'].includes(player.position)
      )
      .map((p) => ({
    player_id: p.player_id,
    name: p.full_name,
    team: p.team ?? '',
    position: p.position ?? '',
    number: p.number ?? '',
    age: p.age ?? '',
    status: p.status ?? '',
    depth_chart_order: p.depth_chart_order ?? '',
  }));


    fs.writeFileSync('players.json', JSON.stringify(filtered, null, 2));
    console.log(`✅ Saved ${filtered.length} players to players.json`);
  } catch (err) {
    console.error('❌ Failed to fetch or save player data:', err);
  }
}

fetchAndSavePlayers();


