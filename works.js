// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allWorks = [];
const LIMIT = 9;

document.addEventListener('DOMContentLoaded', async () => {
  applyConfig();
  await loadWorks();
});

function applyConfig() {
  document.title = `作品一覧 — ${SITE_CONFIG.siteName}`;
  renderSnsLinks();
}

// 全作品を取得
async function loadWorks() {
  const container = document.getElementById('js-works-container');

  const { data, error } = await db
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="loading">取得に失敗しました</p>';
    return;
  }

  allWorks = data || [];
  renderByCategory(allWorks);
}

// カテゴリ別セクションを描画
function renderByCategory(works) {
  const container = document.getElementById('js-works-container');

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

  container.innerHTML = [...groups.entries()].map(([cat, items]) => `
    <div class="category-section">
      <div class="category-header">
        <div class="category-header-left">
          <h3 class="category-name">${esc(cat)}</h3>
          <span class="category-count">${items.length}点</span>
        </div>
        ${items.length > LIMIT
          ? `<button class="category-more-btn" data-cat="${esc(cat)}">すべて見る（${items.length}点）</button>`
          : ''}
      </div>
      <div class="category-grid" data-cat="${esc(cat)}">
        ${items.slice(0, LIMIT).map(w => cardHTML(w)).join('')}
      </div>
    </div>
  `).join('');

  // 「すべて見る」ボタン
  container.querySelectorAll('.category-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const grid = container.querySelector(`.category-grid[data-cat="${cat}"]`);
      const items = allWorks.filter(w => (w.category || 'その他') === cat);
      grid.innerHTML = items.map(w => cardHTML(w)).join('');
      btn.remove();
    });
  });
}

// カードHTML（<a>タグで詳細ページへ）
function cardHTML(w) {
  return `
    <a class="work-card" href="work.html?id=${w.id}" aria-label="${esc(w.title)}">
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

// フッターSNSリンク
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
      <a href="${esc(SITE_CONFIG.sns[item.key])}" target="_blank" rel="noopener noreferrer" class="sns-link">
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
