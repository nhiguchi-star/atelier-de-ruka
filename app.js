// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allWorks = [];
let currentCategory = 'all';

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
  buildFilter();
  renderWorks(allWorks);
}

// カテゴリフィルターを生成
function buildFilter() {
  const bar = document.getElementById('js-filter-bar');
  const categories = ['all', ...new Set(allWorks.map(w => w.category).filter(Boolean))];

  bar.innerHTML = categories.map(c => {
    const isActive = c === currentCategory;
    return `<button class="filter-btn${isActive ? ' active' : ''}" data-cat="${esc(c)}">
      ${c === 'all' ? 'すべて' : esc(c)}
    </button>`;
  }).join('');

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentCategory = btn.dataset.cat;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    const filtered = currentCategory === 'all'
      ? allWorks
      : allWorks.filter(w => w.category === currentCategory);
    renderWorks(filtered);
  });
}

// 作品カードグリッドを描画
function renderWorks(works) {
  const grid = document.getElementById('js-works-grid');

  if (!works.length) {
    grid.innerHTML = '<p class="loading">作品はまだありません</p>';
    return;
  }

  grid.innerHTML = works.map(w => `
    <article class="work-card" data-id="${w.id}" tabindex="0" role="button" aria-label="${esc(w.title)}">
      ${w.image_url
        ? `<div class="card-img"><img src="${esc(w.image_url)}" alt="${esc(w.title)}" loading="lazy"></div>`
        : `<div class="card-img-placeholder">🌹</div>`
      }
      <div class="card-body">
        ${w.category ? `<span class="badge">${esc(w.category)}</span>` : ''}
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
  `).join('');

  grid.querySelectorAll('.work-card').forEach(card => {
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
