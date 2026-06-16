// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = 'kamen555';

let works = [];
let selectedFile = null;
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
});

// パスワード認証のセットアップ
function setupAuth() {
  // セッション中にすでに認証済みならそのまま開く
  if (sessionStorage.getItem('adminAuth') === '1') {
    document.getElementById('js-auth-overlay').style.display = 'none';
    initAdmin();
    return;
  }

  document.getElementById('js-auth-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('js-auth-input').value;
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', '1');
      document.getElementById('js-auth-overlay').style.display = 'none';
      initAdmin();
    } else {
      document.getElementById('js-auth-error').textContent = 'パスワードが違います';
      document.getElementById('js-auth-input').value = '';
      document.getElementById('js-auth-input').focus();
    }
  });
}

// 認証後に管理機能を初期化
async function initAdmin() {
  await loadWorks();
  setupForm();
  setupDropZone();
}

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
        <button class="btn btn-ghost edit-btn" data-id="${w.id}">編集</button>
        <button class="btn btn-danger delete-btn" data-id="${w.id}">削除</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const work = works.find(w => w.id === Number(btn.dataset.id));
      if (work) startEdit(work);
    });
  });

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

  // カテゴリ変更時：新規入力表示 ＋ そのカテゴリの説明文を自動入力
  catSelect.addEventListener('change', () => {
    catNew.style.display = catSelect.value === '__new__' ? 'block' : 'none';
    if (catSelect.value === '__new__') {
      catNew.focus();
      return;
    }
    // 既存カテゴリなら、そのカテゴリの最新作品から説明文を引用
    if (catSelect.value) {
      const match = works.find(w => w.category === catSelect.value && w.description);
      if (match) document.getElementById('f-description').value = match.description;
    }
  });

  // リセット時にテキスト入力を非表示・編集モード解除
  form.addEventListener('reset', () => {
    catNew.style.display = 'none';
    if (editingId) cancelEdit();
  });

  // キャンセルボタン
  document.getElementById('js-cancel-btn').addEventListener('click', () => {
    cancelEdit();
    form.reset();
    resetDropZone();
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

    if (editingId) {
      // 更新モード
      submitBtn.textContent = '更新中...';
      const updates = { title, category, price, description, mercari_url: mercariUrl, yahoo_url: yahooUrl };
      if (imageUrl) updates.image_url = imageUrl;

      const { error } = await db.from('works').update(updates).eq('id', editingId);
      submitBtn.disabled = false;
      if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); submitBtn.textContent = '更新する'; return; }
      showToast('更新しました！', 'success');
      cancelEdit();
    } else {
      // 追加モード
      submitBtn.textContent = '追加中...';
      const { error } = await db.from('works').insert({
        title, category, price, description, image_url: imageUrl,
        mercari_url: mercariUrl, yahoo_url: yahooUrl,
      });
      submitBtn.disabled = false;
      submitBtn.textContent = '追加する';
      if (error) { showToast('追加に失敗しました: ' + error.message, 'error'); return; }
      showToast('作品を追加しました！', 'success');
      form.reset();
      resetDropZone();
    }

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

// 編集モードを開始
function startEdit(work) {
  editingId = work.id;

  document.getElementById('f-title').value = work.title || '';
  document.getElementById('f-price').value = work.price || '';
  document.getElementById('f-description').value = work.description || '';
  document.getElementById('f-mercari-url').value = work.mercari_url || '';
  document.getElementById('f-yahoo-url').value = work.yahoo_url || '';

  // カテゴリをセレクトに反映
  const sel = document.getElementById('f-category-select');
  const catNew = document.getElementById('f-category-new');
  const match = [...sel.options].find(o => o.value === work.category);
  if (work.category && match) {
    sel.value = work.category;
    catNew.style.display = 'none';
  } else if (work.category) {
    sel.value = '__new__';
    catNew.value = work.category;
    catNew.style.display = 'block';
  } else {
    sel.value = '';
    catNew.style.display = 'none';
  }

  // 既存画像をプレビュー表示
  if (work.image_url) {
    const preview = document.getElementById('js-img-preview');
    preview.innerHTML = `<img src="${esc(work.image_url)}" alt="現在の画像">`;
    const zone = document.getElementById('js-drop-zone');
    zone.classList.add('has-file');
    zone.querySelector('.drop-zone-main').textContent = '画像を変更する場合はドロップ';
    zone.querySelector('.drop-zone-sub').textContent = '変更しない場合はそのまま更新';
  }

  document.getElementById('js-form-title').textContent = '作品を編集';
  document.getElementById('js-submit-btn').textContent = '更新する';
  document.getElementById('js-cancel-btn').style.display = 'inline-block';

  document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 編集モードを終了
function cancelEdit() {
  editingId = null;
  document.getElementById('js-form-title').textContent = '新しい作品を追加';
  document.getElementById('js-submit-btn').textContent = '追加する';
  document.getElementById('js-cancel-btn').style.display = 'none';
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
