const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 7000;

const BASE_URL = 'https://hdvnn.xyz';

// Middleware
app.use(cors());

// Manifest
const manifest = {
  id: 'com.hdvnn.addon',
  version: '1.0.0',
  name: 'HDvnn Movies',
  description: 'Vietnamese movies and anime from HDvnn.xyz',
  logo: 'https://hdvnn.xyz/favicon.ico',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie', 'series'],
  catalogs: [
    {
      type: 'movie',
      id: 'hdvnn_movies',
      name: 'HDvnn - Phim Lẻ',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }]
    },
    {
      type: 'series',
      id: 'hdvnn_series',
      name: 'HDvnn - Phim Bộ',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }]
    },
    {
      type: 'series',
      id: 'hdvnn_anime',
      name: 'HDvnn - Anime/HH Trung Quốc',
      extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }]
    }
  ],
  idPrefixes: ['hdvnn_']
};

// Helper: Fetch page with timeout
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Helper: Parse movie list from HTML
function parseMovieList(html) {
  const $ = cheerio.load(html);
  const movies = [];

  // Select movie items - adjust selector based on actual site structure
  $('.movie-item, .item, .film-item, [class*="movie"], [class*="film"]').each((i, el) => {
    try {
      const $el = $(el);
      const link = $el.find('a').first();
      const href = link.attr('href') || '';
      const title = link.attr('title') || link.text().trim();
      const poster = $el.find('img').attr('src') || '';
      
      if (href && title) {
        const slug = href.replace('/thong-tin-phim/', '').replace('.html', '');
        const id = `hdvnn_${slug}`;
        
        // Determine if series or movie based on episode count
        const epText = $el.text();
        const isSeries = /\d+\/\d+|\d+\/\?|\d+ tập/i.test(epText);
        
        movies.push({
          id: id,
          type: isSeries ? 'series' : 'movie',
          name: title.replace(/\d+\/\d+|\d+\/\?|VS-TM|TM|LT|4K/gi, '').trim(),
          poster: poster.startsWith('http') ? poster : BASE_URL + poster,
          posterShape: 'poster'
        });
      }
    } catch (e) {
      // Skip malformed entries
    }
  });

  // Fallback: try alternative selectors
  if (movies.length === 0) {
    const seenIds = new Set();
    $('a[href*="/thong-tin-phim/"]').each((i, el) => {
      try {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.attr('title') || $el.text().trim().split('\n')[0];
        const poster = $el.find('img').attr('src') || '';
        
        if (href && title) {
          // Handle both relative and absolute URLs
          // Extract slug from URL like: https://hdvnn.xyz/thong-tin-phim/quang-am-chi-ngoai.html
          let slug = href;
          const match = slug.match(/\/thong-tin-phim\/([^\/]+)\.html/);
          if (match && match[1]) {
            slug = match[1];
          } else {
            slug = slug.replace(/.*\/thong-tin-phim\//, '').replace(/\.html.*$/, '').replace(/\/$/, '');
          }
          
          const id = `hdvnn_${slug}`;
          
          if (!seenIds.has(id)) {
            seenIds.add(id);
            movies.push({
              id: id,
              type: 'series', // Default to series for Asian content sites
              name: title.replace(/\d+\/\d+|\d+\/\?|VS-TM|TM|LT|4K|Phút/gi, '').trim(),
              poster: poster.startsWith('http') ? poster : (poster ? BASE_URL + poster : ''),
              posterShape: 'poster'
            });
          }
        }
      } catch (e) {}
    });
  }

  return movies;
}

// Helper: Parse movie detail page
function parseMovieDetail(html, id) {
  const $ = cheerio.load(html);
  
  const title = $('h1').first().text().trim();
  const poster = $('img').first().attr('src') || '';
  const description = $('p, .description, .content, [class*="noi-dung"]').first().text().trim();
  
  // Extract year
  const yearMatch = html.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2024;
  
  // Extract genres
  const genres = [];
  $('a[href*="/the-loai/"]').each((i, el) => {
    genres.push($(el).text().trim());
  });
  
  // Check if series (has episodes)
  const episodes = [];
  $('a[href*="tap"], a[href*="episode"], .episode a, [class*="episode"] a').each((i, el) => {
    const epNum = parseInt($(el).text().trim());
    if (!isNaN(epNum)) {
      episodes.push(epNum);
    }
  });
  
  const isSeries = episodes.length > 0 || html.includes('Danh sách tập');
  
  return {
    id: id,
    type: isSeries ? 'series' : 'movie',
    name: title,
    poster: poster.startsWith('http') ? poster : BASE_URL + poster,
    description: description,
    year: year,
    genres: genres,
    posterShape: 'poster',
    runtime: isSeries ? `${episodes.length || '?'} episodes` : ''
  };
}

// Helper: Parse stream from episode page
async function getStreamUrl(slug, episode = null) {
  const url = episode 
    ? `${BASE_URL}/xem-phim/${slug}-${episode}.html`
    : `${BASE_URL}/xem-phim/${slug}.html`;
  
  const html = await fetchPage(url);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  
  // Look for video source in various formats
  let streamUrl = null;
  
  // Try to find video URL in script tags
  $('script').each((i, el) => {
    const script = $(el).html() || '';
    
    // Common patterns for video URLs
    const patterns = [
      /source:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i,
      /file:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i,
      /src:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i,
      /url:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i,
      /["']([^"']*(?:\.m3u8|\.mp4)[^"']*)["']/gi
    ];
    
    for (const pattern of patterns) {
      const match = script.match(pattern);
      if (match && match[1]) {
        streamUrl = match[1];
        break;
      }
    }
    
    if (streamUrl) return false;
  });
  
  // Check iframe sources
  if (!streamUrl) {
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('embed') || src.includes('player') || src.includes('video')) {
        streamUrl = src;
        return false;
      }
    });
  }
  
  // Check video element
  if (!streamUrl) {
    streamUrl = $('video source').attr('src') || $('video').attr('src');
  }
  
  return streamUrl;
}

// Routes

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// Catalog endpoint
app.get('/catalog/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const search = req.query.search;
  const skip = parseInt(req.query.skip) || 0;
  
  let url;
  if (search) {
    url = `${BASE_URL}/tim-kiem/${encodeURIComponent(search)}/`;
  } else if (id === 'hdvnn_movies') {
    url = `${BASE_URL}/phim-le/`;
  } else if (id === 'hdvnn_series') {
    url = `${BASE_URL}/phim-bo/`;
  } else if (id === 'hdvnn_anime') {
    url = `${BASE_URL}/the-loai/hh-trung-quoc.html`;
  } else {
    url = BASE_URL;
  }
  
  if (skip > 0) {
    url = url.replace(/\/$/, '') + `/page/${Math.floor(skip / 20) + 2}/`;
  }
  
  const html = await fetchPage(url);
  
  if (!html) {
    return res.json({ metas: [] });
  }
  
  const movies = parseMovieList(html);
  
  // Filter by type
  const filteredMovies = movies.filter(m => {
    if (type === 'movie') return m.type === 'movie';
    if (type === 'series') return m.type === 'series';
    return true;
  });
  
  res.json({ metas: filteredMovies.slice(0, 100) });
});

// Meta endpoint
app.get('/meta/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  
  if (!id.startsWith('hdvnn_')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const slug = id.replace('hdvnn_', '');
  const url = `${BASE_URL}/thong-tin-phim/${slug}.html`;
  
  const html = await fetchPage(url);
  
  if (!html) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const meta = parseMovieDetail(html, id);
  meta.type = type;
  
  res.json({ meta });
});

// Stream endpoint
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  
  if (!id.startsWith('hdvnn_')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const slug = id.replace('hdvnn_', '');
  
  // For series, try to get all episodes
  if (type === 'series') {
    const detailUrl = `${BASE_URL}/thong-tin-phim/${slug}.html`;
    const html = await fetchPage(detailUrl);
    
    if (!html) {
      return res.json({ streams: [] });
    }
    
    const $ = cheerio.load(html);
    const streams = [];
    
    // Get episode count from page
    const episodeLinks = [];
    $('a[href*="tap"], a[href*="episode"], .episode a, [class*="episode"] a').each((i, el) => {
      const epNum = parseInt($(el).text().trim());
      if (!isNaN(epNum) && !episodeLinks.includes(epNum)) {
        episodeLinks.push(epNum);
      }
    });
    
    // If no episode links found, check if there's episode list
    if (episodeLinks.length === 0) {
      // Try to find episode count in text
      const epMatch = html.match(/(\d+)\/\d+/);
      if (epMatch) {
        const total = parseInt(epMatch[2]) || parseInt(epMatch[1]);
        for (let i = 1; i <= total; i++) {
          episodeLinks.push(i);
        }
      }
    }
    
    // For now, provide links to watch on site
    // In production, you'd parse actual video URLs
    streams.push({
      name: `HDvnn - Xem trên web`,
      title: `Xem phim tại HDvnn.xyz`,
      externalUrl: `${BASE_URL}/thong-tin-phim/${slug}.html`
    });
    
    // Try to get direct stream
    const streamUrl = await getStreamUrl(slug, 1);
    if (streamUrl && (streamUrl.includes('.m3u8') || streamUrl.includes('.mp4'))) {
      streams.unshift({
        name: 'HDvnn - Server 1',
        title: 'Xem trực tiếp',
        url: streamUrl.startsWith('http') ? streamUrl : BASE_URL + streamUrl
      });
    }
    
    res.json({ streams });
  } else {
    // Movie
    const streams = [];
    
    // Try to get direct stream
    const streamUrl = await getStreamUrl(slug);
    if (streamUrl && (streamUrl.includes('.m3u8') || streamUrl.includes('.mp4'))) {
      streams.push({
        name: 'HDvnn - Server 1',
        title: 'Xem trực tiếp',
        url: streamUrl.startsWith('http') ? streamUrl : BASE_URL + streamUrl
      });
    }
    
    // Fallback to website
    streams.push({
      name: `HDvnn - Xem trên web`,
      title: `Xem phim tại HDvnn.xyz`,
      externalUrl: `${BASE_URL}/thong-tin-phim/${slug}.html`
    });
    
    res.json({ streams });
  }
});

// Install page
app.get('/', (req, res) => {
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const host = req.get('host');
  const installUrl = `${protocol}://${host}/manifest.json`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HDvnn Stremio Addon</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #e94560; }
        .install-btn { display: inline-block; background: #e94560; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; margin: 20px 0; }
        .install-btn:hover { background: #ff6b6b; }
        .info { background: #16213e; padding: 20px; border-radius: 8px; margin: 20px 0; }
        code { background: #0f3460; padding: 2px 8px; border-radius: 4px; }
        a { color: #e94560; }
      </style>
    </head>
    <body>
      <h1>🎬 HDvnn Stremio Addon</h1>
      <div class="info">
        <p><strong>Phim Việt, Anime, Hoạt hình Trung Quốc</strong></p>
        <p>Addon cho phép bạn xem phim từ HDvnn.xyz trực tiếp trên Stremio.</p>
      </div>
      
      <a href="stremio://${host}/manifest.json" class="install-btn">📱 Cài đặt vào Stremio</a>
      
      <h2>Hướng dẫn cài đặt</h2>
      <ol>
        <li>Nhấn nút "Cài đặt vào Stremio" ở trên</li>
        <li>Hoặc mở Stremio → Addons → Search → Dán URL: <code>${installUrl}</code></li>
        <li>Nhấn "Install"</li>
      </ol>
      
      <h2>Catalogs</h2>
      <ul>
        <li><strong>HDvnn - Phim Lẻ</strong>: Phim lẻ Việt Nam và quốc tế</li>
        <li><strong>HDvnn - Phim Bộ</strong>: Phim bộ, series</li>
        <li><strong>HDvnn - Anime/HH Trung Quốc</strong>: Anime Nhật Bản và hoạt hình Trung Quốc</li>
      </ul>
      
      <h2>Tính năng</h2>
      <ul>
        <li>✅ Tìm kiếm phim</li>
        <li>✅ Xem thông tin chi tiết</li>
        <li>✅ Streaming trực tiếp hoặc qua website</li>
        <li>✅ Hỗ trợ phim lẻ, phim bộ, anime</li>
      </ul>
      
      <p style="color: #888; margin-top: 30px;">Addon được phát triển để sử dụng cá nhân. Nội dung thuộc về HDvnn.xyz</p>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎬 HDvnn Stremio Addon running on port ${PORT}`);
  console.log(`📡 Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`🌐 Install page: http://localhost:${PORT}/`);
});
