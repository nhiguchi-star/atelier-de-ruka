document.addEventListener('DOMContentLoaded', () => {
  renderSnsLinks();
  setupProductToggle();
  setupLineBtns();
  setupForm();
});

// 商品選択時に「向き」セクションを表示/非表示
function setupProductToggle() {
  const keychainTypes = ['トレカケース・キーホルダー', 'チェキサイズキーホルダー'];
  document.querySelectorAll('input[name="product"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const section = document.getElementById('f-direction-section');
      const isKeychain = keychainTypes.includes(radio.value);
      section.style.display = isKeychain ? 'none' : 'block';
      document.querySelectorAll('input[name="direction"]').forEach(r => r.checked = false);
    });
  });
}

// LINE IDを元にバナーボタンのリンクをページ読み込み時に設定
function setupLineBtns() {
  const lineId  = SITE_CONFIG.lineOfficialId || '';
  const isReady = lineId && lineId !== '@your-line-id';
  const bannerBtn = document.getElementById('js-line-banner-btn');
  if (!bannerBtn) return;
  if (isReady) {
    bannerBtn.href = `https://line.me/R/ti/p/${encodeURIComponent(lineId)}`;
  } else {
    bannerBtn.classList.add('not-ready');
    bannerBtn.textContent = '準備中';
  }
}

// LINEモーダルのボタンイベントを一度だけ登録
function setupLineModal() {
  const modal    = document.getElementById('js-line-modal');
  const copyBtn  = document.getElementById('js-line-copy-btn');
  const closeBtn = document.getElementById('js-line-modal-close');

  copyBtn.addEventListener('click', () => {
    const text = document.getElementById('js-line-modal-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ コピーしました！';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '📋 テキストをコピーする';
        copyBtn.classList.remove('copied');
      }, 3000);
    });
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function setupForm() {
  const submitBtn = document.getElementById('js-submit-btn');
  setupLineModal();

  document.getElementById('js-order-form').addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    const color       = document.getElementById('f-color').value.trim();
    const notes       = document.getElementById('f-notes').value.trim();
    const partsOther  = document.getElementById('f-parts-other').value.trim();

    const styleChecked = [...document.querySelectorAll('#f-style-group input:checked')];
    const styles       = styleChecked.map(el => el.value).join('、');
    const partsAmount  = document.querySelector('input[name="parts-amount"]:checked')?.value || '';
    const partsChecked = [...document.querySelectorAll('#f-parts-group input:checked')].map(el => el.value);
    if (partsOther) partsChecked.push(partsOther);
    const partsText  = partsChecked.join('、');
    const product    = document.querySelector('input[name="product"]:checked')?.value || '';
    const direction  = document.querySelector('input[name="direction"]:checked')?.value || '';
    const shop       = document.querySelector('input[name="shop"]:checked')?.value || '';

    const keychainTypes  = ['トレカケース・キーホルダー', 'チェキサイズキーホルダー'];
    const needsDirection = !keychainTypes.includes(product);

    // 全項目必須チェック
    if (!styleChecked.length) {
      alert('②デザイン系統を1つ以上選択してください');
      submitBtn.disabled = false;
      return;
    }
    if (!partsAmount) {
      alert('③パーツの量を選択してください');
      submitBtn.disabled = false;
      return;
    }
    if (!partsText) {
      alert('④希望パーツを1つ以上選択してください（チェックボックスまたは自由記入）');
      submitBtn.disabled = false;
      return;
    }
    if (!product) {
      alert('⑤商品の種類を選択してください');
      submitBtn.disabled = false;
      return;
    }
    if (needsDirection && !direction) {
      alert('⑥向きを選択してください');
      submitBtn.disabled = false;
      return;
    }
    if (!shop) {
      alert('購入を希望する販売サイトを選択してください');
      submitBtn.disabled = false;
      return;
    }

    // LINEに送るメッセージテキストを組み立て
    const lineText = [
      '【オーダーのご依頼】',
      '━━━━━━━━━━━━━',
      `■ ① ホイップの色：${color || '未記入'}`,
      `■ ② デザイン系統：${styles}`,
      `■ ③ パーツの量：${partsAmount}`,
      `■ ④ 希望パーツ：${partsText}`,
      `■ ⑤ 商品の種類：${product}`,
      needsDirection ? `■ ⑥ 向き：${direction}` : null,
      `■ 購入希望サイト：${shop}`,
      '━━━━━━━━━━━━━',
      '■ 参考画像：このメッセージの後にLINEで送ります',
      '━━━━━━━━━━━━━',
      notes ? `■ その他・備考：\n${notes}` : '■ その他・備考：（なし）',
    ].filter(l => l !== null).join('\n');

    // LINE友達追加ボタンのURLを設定
    const lineId  = SITE_CONFIG.lineOfficialId || '';
    const isReady = lineId && lineId !== '@your-line-id';
    const addBtn  = document.getElementById('js-line-add-btn');
    if (isReady) {
      addBtn.href = `https://line.me/R/ti/p/${encodeURIComponent(lineId)}`;
      addBtn.classList.remove('not-ready');
      addBtn.textContent = '💬 LINEを友達追加してメッセージを送る';
    } else {
      addBtn.href = '#';
      addBtn.classList.add('not-ready');
      addBtn.textContent = '💬 LINE公式アカウント（準備中）';
    }

    // モーダルにテキストをセットして表示
    document.getElementById('js-line-modal-text').textContent = lineText;
    document.getElementById('js-line-modal').classList.add('open');

    submitBtn.disabled = false;
    submitBtn.textContent = 'LINEで依頼する';
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
