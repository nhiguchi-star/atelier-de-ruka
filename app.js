// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allWorks = [];
const LIMIT_HOME = 4;
const CAT_LIMIT = 3;

document.addEventListener('DOMContentLoaded', async () => {
  applyConfig();
  await loadWorks();
});

// SITE_CONFIGの内容をHTMLに反映
function applyConfig() {
  document.title = SITE_CONFIG.siteName;
  document.getElementById('js-site-title').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-footer-name').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-about-name').textContent = SITE_CONFIG.creatorName;
  renderSnsLinks();
  renderConnectLinks();
  document.getElementById('js-hero-title').textContent = SITE_CONFIG.tagline;
  document.getElementById('js-hero-sub').textContent = SITE_CONFIG.subTagline;
}

// 作品一覧をSupabaseから取得
async function loadWorks() {
  const container = document.getElementById('js-works-grid');

  const { data, error } = await db
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="loading">作品の取得に失敗しました</p>';
    return;
  }

  allWorks = data || [];
  renderHome(allWorks);
}

// ホーム用：最大3カテゴリ×4枚プレビュー
function renderHome(works) {
  const container = document.getElementById('js-works-grid');

  if (!works.length) {
    container.innerHTML = '<p class="loading">作品はまだありません</p>';
    return;
  }

  const groups = new Map();
  works.forEach(w => {
    const cat = w.category || 'その他';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(w);
  });

  const cats = [...groups.entries()].slice(0, CAT_LIMIT);

  const sectionsHTML = cats.map(([cat, items]) => `
    <div class="category-section">
      <div class="category-header">
        <div class="category-header-left">
          <h3 class="category-name">${esc(cat)}</h3>
          <span class="category-count">${items.length}点</span>
        </div>
      </div>
      <div class="category-grid">
        ${items.slice(0, LIMIT_HOME).map(w => cardHTML(w)).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = sectionsHTML + `
    <div class="view-all-wrap">
      <a href="works.html" target="_blank" class="view-all-btn">作品一覧をすべて見る →</a>
    </div>
  `;
}

// カードHTML（<a>タグで詳細ページへ）
function cardHTML(w) {
  return `
    <a class="work-card" href="work.html?id=${w.id}" target="_blank" aria-label="${esc(w.title)}">
      ${w.image_url
        ? `<div class="card-img"><img src="${esc(w.image_url)}" alt="${esc(w.title)}" loading="lazy"></div>`
        : `<div class="card-img-placeholder">🌹</div>`
      }
      <div class="card-body">
        <h3 class="card-title">${esc(w.title)}</h3>
        ${w.price ? `<div class="card-price">¥${Number(w.price).toLocaleString()}</div>` : ''}
      </div>
    </a>
  `;
}

// ページ中央のSNS・ショップボタンを描画
function renderConnectLinks() {
  const container = document.getElementById('js-connect-links');
  if (!container || !SITE_CONFIG.sns) return;

  const items = [
    { key: 'youtube',   label: 'YouTube',      icon: '▶',  sub: '制作動画を公開中' },
    { key: 'instagram', label: 'Instagram',     icon: '🌸', sub: '作品・日常を更新中' },
    { key: 'mercari',   label: 'Mercari',       icon: '🛍', sub: '作品を購入する' },
    { key: 'yahoo',     label: 'Yahoo フリマ', icon: '🏷', sub: '作品を購入する' },
  ];

  container.innerHTML = items
    .filter(item => SITE_CONFIG.sns[item.key])
    .map(item => `
      <a href="${esc(SITE_CONFIG.sns[item.key])}"
         target="_blank" rel="noopener noreferrer"
         class="connect-btn">
        <span class="connect-btn-icon">${item.icon}</span>
        <span class="connect-btn-label">${item.label}</span>
        <span class="connect-btn-sub">${item.sub}</span>
      </a>
    `).join('');
}

// フッターのSNSリンクを描画
function renderSnsLinks() {
  const container = document.getElementById('js-sns-links');
  if (!container || !SITE_CONFIG.sns) return;

  const items = [
    { key: 'youtube',   label: 'YouTube',      icon: '▶' },
    { key: 'instagram', label: 'Instagram',     icon: '📸' },
    { key: 'mercari',   label: 'Mercari',       icon: '🛍' },
    { key: 'yahoo',     label: 'Yahoo フリマ', icon: '🏷' },
  ];

  container.innerHTML = items
    .filter(item => SITE_CONFIG.sns[item.key])
    .map(item => `
      <a href="${esc(SITE_CONFIG.sns[item.key])}"
         target="_blank" rel="noopener noreferrer"
         class="sns-link">
        <span>${item.icon}</span>${item.label}
      </a>
    `).join('');
}

// XSS対策
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
