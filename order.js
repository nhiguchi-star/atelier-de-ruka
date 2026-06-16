// Supabaseクライアント初期化（参考画像のアップロードに使用）
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let selectedRefFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  renderSnsLinks();
  setupImageUpload();
  setupProductToggle();
  setupForm();
});

// 参考画像の選択UI
function setupImageUpload() {
  const zone    = document.getElementById('js-order-img-zone');
  const input   = document.getElementById('f-ref-image');
  const preview = document.getElementById('js-order-img-preview');
  const main    = document.getElementById('js-img-main');
  const sub     = document.getElementById('js-img-sub');

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', e => {
    handleRefFiles([...e.target.files], preview, main, sub, zone);
  });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('has-file'); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('has-file'); });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (files.length) handleRefFiles(files, preview, main, sub, zone);
  });
}

function handleRefFiles(files, preview, main, sub, zone) {
  if (files.length > 5) {
    alert('参考画像は5枚までです。最初の5枚を使用します。');
    files = files.slice(0, 5);
  }
  selectedRefFiles = files;
  zone.classList.add('has-file');
  main.textContent = `✓ ${files.length}枚選択済み`;
  sub.textContent = files.map(f => f.name).join('、');
  preview.innerHTML = '';
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = file.name;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// 参考画像をSupabase Storageにアップロードしてpublic URLを返す
async function uploadRefImage(file) {
  const ext      = file.name.split('.').pop().toLowerCase();
  const fileName = `order-refs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await db.storage
    .from('works')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = db.storage.from('works').getPublicUrl(fileName);
  return data.publicUrl;
}

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

function setupForm() {
  const submitBtn = document.getElementById('js-submit-btn');

  document.getElementById('js-order-form').addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    const name       = document.getElementById('f-name').value.trim();
    const email      = document.getElementById('f-email').value.trim();
    const color      = document.getElementById('f-color').value.trim();
    const notes      = document.getElementById('f-notes').value.trim();
    const partsOther = document.getElementById('f-parts-other').value.trim();

    const styles = [...document.querySelectorAll('#f-style-group input:checked')]
      .map(el => el.value).join('、') || '指定なし';
    const partsAmount = document.querySelector('input[name="parts-amount"]:checked')?.value || '指定なし';
    const parts = [...document.querySelectorAll('#f-parts-group input:checked')].map(el => el.value);
    if (partsOther) parts.push(partsOther);
    const partsText = parts.join('、') || '指定なし';
    const product   = document.querySelector('input[name="product"]:checked')?.value || '指定なし';
    const direction = document.querySelector('input[name="direction"]:checked')?.value || '指定なし';
    const shops = [...document.querySelectorAll('#f-shop-group input:checked')]
      .map(el => el.value).join('、') || '指定なし';

    const keychainTypes = ['トレカケース・キーホルダー', 'チェキサイズキーホルダー'];
    const needsDirection = !keychainTypes.includes(product);

    // 参考画像は必須
    if (!selectedRefFiles.length) {
      alert('参考画像を選択してください（必須）');
      submitBtn.disabled = false;
      return;
    }

    // 参考画像をすべてアップロード
    const imageUrls = [];
    submitBtn.textContent = `画像をアップロード中... (0/${selectedRefFiles.length})`;
    for (let i = 0; i < selectedRefFiles.length; i++) {
      try {
        const url = await uploadRefImage(selectedRefFiles[i]);
        imageUrls.push(url);
        submitBtn.textContent = `画像をアップロード中... (${i + 1}/${selectedRefFiles.length})`;
      } catch (err) {
        console.error('画像アップロード失敗:', err);
        alert('画像のアップロードに失敗しました。もう一度お試しください。');
        submitBtn.disabled = false;
        submitBtn.textContent = 'メールで送信する';
        return;
      }
    }

    submitBtn.textContent = 'メールを準備中...';

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
      `■ ⑤ 商品の種類：${product}`,
      needsDirection ? `■ ⑥ 向き：${direction}` : null,
      `■ 購入希望サイト：${shops}`,
      '━━━━━━━━━━━━━━━━━',
      '■ その他・備考：',
      notes || '（なし）',
      '',
      imageUrls.length ? imageUrls.map((url, i) => `■ 参考画像${imageUrls.length > 1 ? i + 1 : ''}：${url}`).join('\n') : null,
      '━━━━━━━━━━━━━━━━━',
    ].filter(line => line !== null).join('\n');

    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(SITE_CONFIG.orderEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');

    submitBtn.disabled = false;
    submitBtn.textContent = 'メールで送信する';
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
