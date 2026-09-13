const axios = require('axios');
const cheerio = require('cheerio');

async function analyze() {
  const html = await axios.get('https://hdvnn.xyz/xem-phim/tien-nghich-episode-id-10157.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }).then(r => r.data);
  
  const $ = cheerio.load(html);
  
  // Get all script tags
  const scripts = [];
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (content.length > 50) {
      scripts.push(content);
    }
  });
  
  // Find loadVideo function
  for (const script of scripts) {
    if (script.includes('loadVideo')) {
      console.log('=== FOUND loadVideo ===');
      const start = script.indexOf('loadVideo');
      const snippet = script.substring(start, start + 2000);
      console.log(snippet);
      break;
    }
  }
}

analyze().catch(console.error);