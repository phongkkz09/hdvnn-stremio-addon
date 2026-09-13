const cheerio = require('cheerio');
const axios = require('axios');

(async () => {
  try {
    const html = await axios.get('https://hdvnn.xyz/the-loai/hh-trung-quoc.html', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(html.data);
    
    const links = [];
    $('a[href*="/thong-tin-phim/"]').each((i, el) => {
      if (links.length < 5) {
        const href = $(el).attr('href');
        links.push({ original: href, match: href.match(/\/thong-tin-phim\/([^\/]+)\.html/) });
      }
    });
    
    console.log('Sample URLs:', JSON.stringify(links, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
