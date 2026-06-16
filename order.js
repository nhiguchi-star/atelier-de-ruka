document.addEventListener('DOMContentLoaded', () => {
  renderSnsLinks();
  setupForm();
});

function setupForm() {
  document.getElementById('js-order-form').addEventListener('submit', e => {
    e.preventDefault();

    const name    = document.getElementById('f-name').value.trim();
    const email   = document.getElementById('f-email').value.trim();
    const color   = document.getElementById('f-color').value.trim();
    const notes   = document.getElementById('f-notes').value.trim();
    const partsOther = document.getElementById('f-parts-other').value.trim();

    // チェックボックス（デザイン系統）
    const styles = [...document.querySelectorAll('#f-style-group input:checked')]
      .map(el => el.value).join('、') || '指定なし';

    // ラジオ（パーツ量）
    const partsAmount = document.querySelector('input[name="parts-amount"]:checked')?.value || '指定なし';

    // チェックボックス（希望パーツ）
    const parts = [...document.querySelectorAll('#f-parts-group input:checked')]
      .map(el => el.value);
    if (partsOther) parts.push(partsOther);
    const partsText = parts.join('、') || '指定なし';

    // ラジオ（サイズ）
    const size = document.querySelector('input[name="size"]:checked')?.value || '指定なし';

    const subject = `【オーダーのご依頼】${name} 様`;

    const body = [
      `${name} 様よりオーダーのご依頼がありました。`,
      '',
      '━━━━━━━━━━━━━━━━━',
      `■ お名前：${name}`,
      `■ メールアドレス：${email}`,
      '━━━━━━━━━━━━━━━━━',
      `■ ① ホイップの色：${color || '未記入'}`,
      `■ ② デザイン系統：${styles}`,
      `■ ③ パーツの量：${partsAmount}`,
      `■ ④ 希望パーツ：${partsText}`,
      `■ ⑤ サイズ：${size}`,
      '━━━━━━━━━━━━━━━━━',
      `■ その他・備考：`,
      notes || '（なし）',
      '',
      '━━━━━━━━━━━━━━━━━',
      '※ 参考画像がある場合は、このメールに返信する形でお送りください。',
    ].join('\n');

    const mailto = `mailto:${SITE_CONFIG.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    location.href = mailto;
  });
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
