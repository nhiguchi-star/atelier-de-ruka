// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  applyConfig();
  await loadWork();
});

function applyConfig() {
  renderSnsLinks();
}

// URLの?idから作品を取得して表示
async function loadWork() {
  const id = new URLSearchParams(location.search).get('id');
  const container = document.getElementById('js-work-detail');

  if (!id) {
    container.innerHTML = '<p class="loading">作品が見つかりません</p>';
    return;
  }

  const { data, error } = await db
    .from('works')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    container.innerHTML = '<p class="loading">作品が見つかりません</p>';
    return;
  }

  document.title = `${data.title} — ${SITE_CONFIG.siteName}`;
  renderWork(data);
}

// 作品詳細を描画
function renderWork(w) {
  const container = document.getElementById('js-work-detail');
  container.innerHTML = `
    <a href="works.html" class="back-btn">← 作品一覧に戻る</a>
    <div class="work-detail-grid">
      <div class="work-detail-img-wrap">
        ${w.image_url
          ? `<img src="${esc(w.image_url)}" alt="${esc(w.title)}" class="work-detail-img">`
          : `<div class="work-detail-img-placeholder">🌹</div>`
        }
      </div>
      <div class="work-detail-info">
        ${w.category ? `<span class="badge">${esc(w.category)}</span>` : ''}
        <h1 class="work-detail-title">${esc(w.title)}</h1>
        ${w.price ? `<p class="work-detail-price">¥${Number(w.price).toLocaleString()}</p>` : ''}
        ${w.description ? `<p class="work-detail-desc">${esc(w.description)}</p>` : ''}
        <div class="work-detail-shops">
          ${SITE_CONFIG.sns.mercari ? `<a href="${esc(SITE_CONFIG.sns.mercari)}" target="_blank" rel="noopener" class="shop-btn-detail">🛍 メルカリで購入する</a>` : ''}
          ${SITE_CONFIG.sns.yahoo ? `<a href="${esc(SITE_CONFIG.sns.yahoo)}" target="_blank" rel="noopener" class="shop-btn-detail">🏷 ヤフーフリマで購入する</a>` : ''}
        </div>
        <div class="share-wrap">
          <p class="share-label">この作品をシェア</p>
          <div class="share-buttons">
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(w.title + ' — Atelier de Ruka')}&url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener" class="share-btn share-btn-x">𝕏 でシェア</a>
            <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener" class="share-btn share-btn-line">LINE でシェア</a>
            <button onclick="shareToApp('Instagram')" class="share-btn share-btn-instagram">📸 Instagram</button>
            <button onclick="shareToApp('TikTok')" class="share-btn share-btn-tiktok">🎵 TikTok</button>
          </div>
        </div>
      </div>
    </div>
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

// Instagram / TikTok シェア（システムシェアシート or URLコピー）
function shareToApp(platform) {
  const url = location.href;
  const title = document.title;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      showCopyToast(platform);
    }).catch(() => {
      prompt('URLをコピーして' + platform + 'に貼り付けてください', url);
    });
  }
}

// コピー完了トースト表示
function showCopyToast(platform) {
  let toast = document.getElementById('js-copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'js-copy-toast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = 'URLをコピーしました！' + platform + 'に貼り付けてシェアしてください';
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// XSS対策
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
