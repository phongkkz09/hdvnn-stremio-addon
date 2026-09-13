const axios = require('axios');

async function analyze() {
  const html = await axios.get('https://hdvnn.xyz/xem-phim/tien-nghich-episode-id-10157.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }).then(r => r.data);
  
  // Find API call parameters
  const apiPattern = /axios\.[a-z]+\(\s*['"]\/server\/ajax\/player['"][^)]*\)/gs;
  const matches = html.match(apiPattern);
  
  if (matches) {
    console.log('=== API CALLS ===');
    matches.forEach(m => {
      console.log(m.substring(0, 500));
      console.log('---');
    });
  }
  
  // Also find data being sent
  const dataPattern = /data\s*:\s*{[^}]*}/g;
  const dataMatches = html.match(dataPattern);
  
  if (dataMatches) {
    console.log('\n=== DATA SENT ===');
    dataMatches.slice(0, 3).forEach(m => console.log(m));
  }
}

analyze().catch(console.error);