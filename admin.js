// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let works = [];
let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadWorks();
  setupForm();
  setupDropZone();
});

// 作品一覧を取得
async function loadWorks() {
  const { data, error } = await db
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('取得に失敗しました: ' + error.message, 'error');
    renderList([]);
    return;
  }

  works = data || [];
  renderList(works);
  updateCategorySelect();
}

// 作品リストを描画
function renderList(list) {
  const container = document.getElementById('js-works-list');
  const counter = document.getElementById('js-works-count');
  counter.textContent = `（${list.length}件）`;

  if (!list.length) {
    container.innerHTML = '<div class="empty-state">まだ作品が登録されていません</div>';
    return;
  }

  container.innerHTML = list.map(w => `
    <div class="work-item" data-id="${w.id}">
      <div class="work-thumb">
        ${w.image_url
          ? `<img src="${esc(w.image_url)}" alt="${esc(w.title)}">`
          : '🌹'
        }
      </div>
      <div>
        <p class="work-info-title">${esc(w.title)}</p>
        <div class="work-info-meta">
          ${w.category ? `<span class="meta-badge">${esc(w.category)}</span>` : ''}
          ${w.price ? `<span>¥${Number(w.price).toLocaleString()}</span>` : ''}
          ${w.mercari_url ? `<a href="${esc(w.mercari_url)}" target="_blank" class="meta-link">🛍 メルカリ</a>` : ''}
          ${w.yahoo_url ? `<a href="${esc(w.yahoo_url)}" target="_blank" class="meta-link">🏷 ヤフーフリマ</a>` : ''}
          ${!w.mercari_url && !w.yahoo_url ? '<span class="meta-no-link">販売リンクなし</span>' : ''}
        </div>
      </div>
      <div class="work-actions">
        <button class="btn btn-danger delete-btn" data-id="${w.id}">削除</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteWork(Number(btn.dataset.id)));
  });
}

// カテゴリのセレクトボックスを更新
function updateCategorySelect() {
  const sel = document.getElementById('f-category-select');
  const cats = [...new Set(works.map(w => w.category).filter(Boolean))];
  sel.innerHTML = `
    <option value="">カテゴリなし</option>
    ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
    <option value="__new__">＋ 新しいカテゴリを追加</option>
  `;
}

// フォームのセットアップ
function setupForm() {
  const form = document.getElementById('js-add-form');
  const submitBtn = document.getElementById('js-submit-btn');
  const catSelect = document.getElementById('f-category-select');
  const catNew = document.getElementById('f-category-new');

  // 「＋ 新しいカテゴリ」選択時にテキスト入力を表示
  catSelect.addEventListener('change', () => {
    catNew.style.display = catSelect.value === '__new__' ? 'block' : 'none';
    if (catSelect.value === '__new__') catNew.focus();
  });

  // リセット時にテキスト入力を非表示
  form.addEventListener('reset', () => {
    catNew.style.display = 'none';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    const title = document.getElementById('f-title').value.trim();
    const sel = document.getElementById('f-category-select');
    const category = sel.value === '__new__'
      ? (document.getElementById('f-category-new').value.trim() || null)
      : (sel.value || null);
    const price = document.getElementById('f-price').value
      ? parseInt(document.getElementById('f-price').value, 10)
      : null;
    const description = document.getElementById('f-description').value.trim() || null;
    const mercariUrl = document.getElementById('f-mercari-url').value.trim() || null;
    const yahooUrl = document.getElementById('f-yahoo-url').value.trim() || null;

    // 画像のアップロード
    let imageUrl = null;
    if (selectedFile) {
      submitBtn.textContent = '画像をアップロード中...';
      try {
        imageUrl = await uploadImage(selectedFile);
      } catch (err) {
        showToast('画像のアップロードに失敗しました: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '追加する';
        return;
      }
    }

    submitBtn.textContent = '追加中...';
    const { error } = await db.from('works').insert({
      title, category, price, description, image_url: imageUrl,
      mercari_url: mercariUrl, yahoo_url: yahooUrl,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = '追加する';

    if (error) {
      showToast('追加に失敗しました: ' + error.message, 'error');
      return;
    }

    showToast('作品を追加しました！', 'success');
    form.reset();
    resetDropZone();
    await loadWorks();
  });
}

// ドラッグ＆ドロップゾーンのセットアップ
function setupDropZone() {
  const zone = document.getElementById('js-drop-zone');
  const fileInput = document.getElementById('f-image-file');

  // クリックでファイル選択ダイアログ
  zone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // ドラッグオーバー中のスタイル
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });

  // ドロップ時にファイルを処理
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    } else {
      showToast('画像ファイルを選択してください', 'error');
    }
  });
}

// ファイルを選択したときの処理
function handleFile(file) {
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('js-img-preview');
    preview.innerHTML = `<img src="${e.target.result}" alt="プレビュー">`;

    const zone = document.getElementById('js-drop-zone');
    zone.classList.add('has-file');
    zone.querySelector('.drop-zone-main').textContent = `✓ ${file.name}`;
    zone.querySelector('.drop-zone-sub').textContent = `${(file.size / 1024).toFixed(0)} KB`;
  };
  reader.readAsDataURL(file);
}

// Supabase Storage に画像をアップロードしてURLを返す
async function uploadImage(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await db.storage
    .from('works')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = db.storage.from('works').getPublicUrl(fileName);
  return data.publicUrl;
}

// ドロップゾーンをリセット
function resetDropZone() {
  selectedFile = null;
  document.getElementById('js-img-preview').innerHTML = '';
  document.getElementById('f-image-file').value = '';
  const zone = document.getElementById('js-drop-zone');
  zone.classList.remove('has-file');
  zone.querySelector('.drop-zone-main').textContent = 'ここにドラッグ＆ドロップ';
  zone.querySelector('.drop-zone-sub').textContent = 'またはクリックしてファイルを選択';
}

// 作品を削除
async function deleteWork(id) {
  if (!confirm('この作品を削除しますか？')) return;
  const { error } = await db.from('works').delete().eq('id', id);
  if (error) { showToast('削除に失敗しました', 'error'); return; }
  showToast('削除しました', 'success');
  await loadWorks();
}

// トースト通知を表示
function showToast(message, type = 'success') {
  const toast = document.getElementById('js-toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, 3000);
}

// XSS対策
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
