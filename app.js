// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allWorks = [];

document.addEventListener('DOMContentLoaded', async () => {
  applyConfig();
  await loadWorks();
  setupModal();
});

// SITE_CONFIGの内容をHTMLに反映
function applyConfig() {
  document.title = SITE_CONFIG.siteName;
  document.getElementById('js-site-title').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-footer-name').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-about-name').textContent = SITE_CONFIG.creatorName;
  document.getElementById('js-about-text').innerText = SITE_CONFIG.aboutText;
  renderSnsLinks();
  renderConnectLinks();

  document.getElementById('js-hero-title').textContent = SITE_CONFIG.tagline;
  document.getElementById('js-hero-sub').textContent = SITE_CONFIG.subTagline;
}

// 作品一覧をSupabaseから取得
async function loadWorks() {
  const grid = document.getElementById('js-works-grid');

  const { data, error } = await db
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    grid.innerHTML = '<p class="loading">作品の取得に失敗しました。config.jsの設定を確認してください。</p>';
    console.error('Supabase error:', error);
    return;
  }

  allWorks = data || [];
  renderByCategory(allWorks);
}

// カテゴリ別セクションを描画
function renderByCategory(works) {
  const container = document.getElementById('js-works-grid');

  if (!works.length) {
    container.innerHTML = '<p class="loading">作品はまだありません</p>';
    return;
  }

  // カテゴリ別にグループ化（登録順を維持）
  const groups = new Map();
  works.forEach(w => {
    const cat = w.category || 'その他';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(w);
  });

  const LIMIT = 6;

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

  attachCardEvents(container);

  // 「すべて見る」ボタン
  container.querySelectorAll('.category-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const grid = container.querySelector(`.category-grid[data-cat="${cat}"]`);
      const items = allWorks.filter(w => (w.category || 'その他') === cat);
      grid.innerHTML = items.map(w => cardHTML(w)).join('');
      attachCardEvents(grid);
      btn.remove();
    });
  });
}

// カードのHTML文字列を生成
function cardHTML(w) {
  return `
    <article class="work-card" data-id="${w.id}" tabindex="0" role="button" aria-label="${esc(w.title)}">
      ${w.image_url
        ? `<div class="card-img"><img src="${esc(w.image_url)}" alt="${esc(w.title)}" loading="lazy"></div>`
        : `<div class="card-img-placeholder">🌹</div>`
      }
      <div class="card-body">
        <h3 class="card-title">${esc(w.title)}</h3>
        ${w.description ? `<p class="card-desc">${esc(w.description)}</p>` : ''}
        ${w.price ? `<div class="card-price">¥${Number(w.price).toLocaleString()}</div>` : ''}
        ${(w.mercari_url || w.yahoo_url) ? `
          <div class="shop-links">
            ${w.mercari_url ? `<a href="${esc(w.mercari_url)}" target="_blank" rel="noopener" class="shop-btn" onclick="event.stopPropagation()">🛍 メルカリ</a>` : ''}
            ${w.yahoo_url ? `<a href="${esc(w.yahoo_url)}" target="_blank" rel="noopener" class="shop-btn" onclick="event.stopPropagation()">🏷 ヤフーフリマ</a>` : ''}
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

// カードにクリック・キーボードイベントを付与
function attachCardEvents(container) {
  container.querySelectorAll('.work-card').forEach(card => {
    const open = () => {
      const work = allWorks.find(w => w.id === Number(card.dataset.id));
      if (work) openModal(work);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

// モーダルのセットアップ
function setupModal() {
  const overlay = document.getElementById('js-modal-overlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(w) {
  const box = document.getElementById('js-modal-box');
  box.innerHTML = `
    ${w.image_url
      ? `<div class="modal-img"><img src="${esc(w.image_url)}" alt="${esc(w.title)}"></div>`
      : `<div class="modal-img-placeholder">🌹</div>`
    }
    <div class="modal-body">
      <button class="modal-close" id="js-modal-close">✕</button>
      ${w.category ? `<span class="badge">${esc(w.category)}</span>` : ''}
      <h2 class="modal-title">${esc(w.title)}</h2>
      ${w.description ? `<p class="modal-desc">${esc(w.description)}</p>` : ''}
      ${w.price ? `<p class="modal-price">¥${Number(w.price).toLocaleString()}</p>` : ''}
      ${(w.mercari_url || w.yahoo_url) ? `
        <div class="shop-links" style="margin-top:1rem;">
          ${w.mercari_url ? `<a href="${esc(w.mercari_url)}" target="_blank" rel="noopener" class="shop-btn shop-btn-lg">🛍 メルカリで購入する</a>` : ''}
          ${w.yahoo_url ? `<a href="${esc(w.yahoo_url)}" target="_blank" rel="noopener" class="shop-btn shop-btn-lg">🏷 ヤフーフリマで購入する</a>` : ''}
        </div>
      ` : ''}
    </div>
  `;
  document.getElementById('js-modal-close').addEventListener('click', closeModal);
  document.getElementById('js-modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('js-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
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

// XSS対策：HTML特殊文字をエスケープ
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
