document.addEventListener('DOMContentLoaded', () => {
  document.title = `作家について — ${SITE_CONFIG.siteName}`;
  document.getElementById('js-site-title').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-footer-name').textContent = SITE_CONFIG.siteName;
  document.getElementById('js-about-name').textContent = SITE_CONFIG.creatorName;
  renderSnsLinks();
});

// フッターSNSリンク
function renderSnsLinks() {
  const container = document.getElementById('js-sns-links');
  if (!container || !SITE_CONFIG.sns) return;
  const items = [
    { key: 'youtube',   label: 'YouTube',      icon: '▶' },
    { key: 'instagram', label: 'Instagram',     icon: '📸' },
    { key: 'tiktok',    label: 'TikTok',        icon: '🎵' },
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
