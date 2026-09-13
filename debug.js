const cheerio = require('cheerio');
const axios = require('axios');

(async () => {
  const html = await axios.get('https://hdvnn.xyz/the-loai/hh-trung-quoc.html', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(html.data);
  
  let count = 0;
  $('a[href*="/thong-tin-phim/"]').each((i, el) => {
    if (count < 3) {
      const href = $(el).attr('href') || '';
      const match = href.match(/\/thong-tin-phim\/([^\/]+)\.html/);
      console.log('href:', href);
      console.log('match:', match ? match[1] : 'NO MATCH');
      console.log('---');
      count++;
    }
  });
})();
