const axios = require('axios');

async function analyze() {
  const html = await axios.get('https://hdvnn.xyz/xem-phim/tien-nghich-episode-id-10157.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }).then(r => r.data);
  
  // Find SourceVideo assignment and API calls
  const patterns = [
    /SourceVideo\s*=\s*[^\n;]+/g,
    /var\s+SourceVideo\s*=\s*[^\n;]+/g,
    /axios\.[a-z]+\([^)]*\)/g,
    /"\/api\/[^"]*"/g,
    /url:\s*['"][^'"]*[']/g,
    /endpoint:\s*['"][^'"]*[']/g
  ];
  
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      console.log('=== Pattern:', pattern.toString(), '===');
      matches.slice(0, 5).forEach(m => console.log(m));
    }
  }
}

analyze().catch(console.error);