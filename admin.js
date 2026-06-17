// Supabaseクライアント初期化
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PASSWORD = 'kamen555';
const MAX_ENTRIES = 5;

let works = [];
let editingId = null;
// 各エントリーの選択ファイル（インデックス = エントリー番号）
let entryFiles = [null];

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
});

// パスワード認証
function setupAuth() {
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

async function initAdmin() {
  await loadWorks();
  setupForm();
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
  refreshAllCategorySelects();
}

// カテゴリ別グループ化してリストを描画
function renderList(list) {
  const container = document.getElementById('js-works-list');
  const counter = document.getElementById('js-works-count');
  counter.textContent = `（${list.length}件）`;

  if (!list.length) {
    container.innerHTML = '<div class="empty-state">まだ作品が登録されていません</div>';
    return;
  }

  // カテゴリでグループ化
  const grouped = {};
  list.forEach(w => {
    const cat = w.category || 'カテゴリなし';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(w);
  });

  // カテゴリなしを最後に、あとは名前順
  const cats = Object.keys(grouped).sort((a, b) => {
    if (a === 'カテゴリなし') return 1;
    if (b === 'カテゴリなし') return -1;
    return a.localeCompare(b, 'ja');
  });

  container.innerHTML = cats.map(cat => `
    <div class="category-section">
      <div class="category-header">
        <div class="category-header-left">
          <span class="category-name">🌹 ${esc(cat)}</span>
          <span class="category-count">${grouped[cat].length}件</span>
        </div>
        ${cat !== 'カテゴリなし' ? `
        <button class="btn btn-ghost cat-rename-btn" data-cat="${esc(cat)}" style="font-size:0.75rem; padding:0.25rem 0.7rem;">
          ✏️ 名前を変更
        </button>` : ''}
      </div>
      <div class="category-works">
        ${grouped[cat].map(w => `
          <div class="work-item" data-id="${w.id}">
            <div class="work-thumb">
              ${w.image_url ? `<img src="${esc(w.image_url)}" alt="${esc(w.title)}">` : '🌹'}
            </div>
            <div>
              <p class="work-info-title">${esc(w.title)}</p>
              <div class="work-info-meta">
                ${w.price ? `<span>¥${Number(w.price).toLocaleString()}</span>` : ''}
                <span class="meta-date">${new Date(w.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            <div class="work-actions">
              <button class="btn btn-ghost edit-btn" data-id="${w.id}">編集</button>
              <button class="btn btn-danger delete-btn" data-id="${w.id}">削除</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.cat-rename-btn').forEach(btn => {
    btn.addEventListener('click', () => startCategoryRename(btn));
  });
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

// カテゴリ名インライン編集を開始
function startCategoryRename(btn) {
  const oldName = btn.dataset.cat;
  const header = btn.closest('.category-header');
  const left = header.querySelector('.category-header-left');

  // すでに編集中なら何もしない
  if (header.querySelector('.cat-rename-input')) return;

  left.innerHTML = `
    <input class="cat-rename-input" value="${esc(oldName)}" style="
      font-size:0.88rem; font-weight:700; color:var(--rose);
      border:1px solid var(--rose-light); border-radius:6px;
      padding:0.25rem 0.6rem; width:180px; background:var(--bg-card);">
    <button class="btn btn-primary cat-rename-save" style="font-size:0.75rem; padding:0.25rem 0.8rem;">保存</button>
    <button class="btn btn-ghost cat-rename-cancel" style="font-size:0.75rem; padding:0.25rem 0.7rem;">キャンセル</button>
  `;
  btn.style.display = 'none';

  const input = header.querySelector('.cat-rename-input');
  input.focus();
  input.select();

  header.querySelector('.cat-rename-save').addEventListener('click', async () => {
    const newName = input.value.trim();
    if (!newName) { showToast('カテゴリ名を入力してください', 'error'); return; }
    if (newName === oldName) { await loadWorks(); return; }
    try {
      await renameCategory(oldName, newName);
      showToast(`「${oldName}」→「${newName}」に変更しました`, 'success');
      await loadWorks();
    } catch (err) {
      showToast('変更に失敗: ' + err.message, 'error');
    }
  });

  header.querySelector('.cat-rename-cancel').addEventListener('click', () => loadWorks());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') header.querySelector('.cat-rename-save').click();
    if (e.key === 'Escape') loadWorks();
  });
}

// カテゴリ名を一括変更（同カテゴリの全作品を更新）
async function renameCategory(oldName, newName) {
  const ids = works.filter(w => w.category === oldName).map(w => w.id);
  if (!ids.length) return;
  const { error } = await db.from('works').update({ category: newName }).in('id', ids);
  if (error) throw error;
}

// 現在登録済みカテゴリ一覧を返す
function getCategories() {
  return [...new Set(works.map(w => w.category).filter(Boolean))];
}

// 全エントリーのカテゴリセレクトをDBの最新カテゴリで更新
function refreshAllCategorySelects() {
  const cats = getCategories();
  document.querySelectorAll('[id^="f-category-select-"]').forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = `
      <option value="">カテゴリなし</option>
      ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
      <option value="__new__">＋ 新しいカテゴリを追加</option>
    `;
    if (currentVal) sel.value = currentVal;
  });
}

// エントリーブロックのHTMLを生成（動的）
function createEntryBlockHTML(idx) {
  const cats = getCategories();
  return `
    <div class="entry-block" id="entry-block-${idx}">
      ${idx > 0 ? `
        <div class="entry-divider"></div>
        <div class="entry-block-header">
          <span class="entry-block-num">作品 ${idx + 1}</span>
          <button type="button" class="btn btn-danger remove-entry-btn" data-idx="${idx}"
            style="padding:0.3rem 0.8rem; font-size:0.78rem;">✕ 削除</button>
        </div>
      ` : ''}
      <div class="form-grid">
        <div class="form-group full">
          <label>タイトル <span class="required">*</span></label>
          <input type="text" id="f-title-${idx}" placeholder="例：フラワーピアス">
        </div>
        <div class="form-group">
          <label>カテゴリ</label>
          <select id="f-category-select-${idx}">
            <option value="">カテゴリなし</option>
            ${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
            <option value="__new__">＋ 新しいカテゴリを追加</option>
          </select>
          <input type="text" id="f-category-new-${idx}" placeholder="新しいカテゴリ名を入力"
            style="display:none; margin-top:0.35rem;">
        </div>
        <div class="form-group">
          <label>価格（円）</label>
          <input type="number" id="f-price-${idx}" placeholder="例：1500" min="0">
        </div>
        <div class="form-group full">
          <label>説明文</label>
          <textarea id="f-description-${idx}" placeholder="素材・サイズ・こだわりポイントなど"></textarea>
        </div>
        <div class="form-group full">
          <label>画像</label>
          <div id="js-drop-zone-${idx}" class="drop-zone">
            <input type="file" id="f-image-file-${idx}" accept="image/*" hidden>
            <div class="drop-zone-icon">🌹</div>
            <p class="drop-zone-main">ここにドラッグ＆ドロップ</p>
            <p class="drop-zone-sub">またはクリックしてファイルを選択</p>
          </div>
          <div class="img-preview" id="js-img-preview-${idx}"></div>
          <div class="img-resize-ctrl" id="js-resize-ctrl-${idx}" style="display:none;">
            <span class="resize-orig-size" id="js-resize-orig-${idx}"></span>
            <div class="resize-inputs">
              <label>幅 <input type="number" id="js-resize-w-${idx}" min="100" max="6000" step="10"> px</label>
              <span class="resize-sep">×</span>
              <label>高さ <input type="number" id="js-resize-h-${idx}" min="100" max="6000" step="10"> px</label>
              <label><input type="checkbox" id="js-resize-lock-${idx}" checked> 比率固定</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// エントリーのドロップゾーンを初期化
function setupEntryDropZone(idx) {
  const zone = document.getElementById(`js-drop-zone-${idx}`);
  const fileInput = document.getElementById(`f-image-file-${idx}`);
  if (!zone || !fileInput) return;

  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(idx, file);
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(idx, file);
    else showToast('画像ファイルを選択してください', 'error');
  });
}

// エントリーのカテゴリ連動リスナーを初期化
function setupEntryListeners(idx) {
  const catSelect = document.getElementById(`f-category-select-${idx}`);
  const catNew = document.getElementById(`f-category-new-${idx}`);
  if (!catSelect) return;

  catSelect.addEventListener('change', () => {
    catNew.style.display = catSelect.value === '__new__' ? 'block' : 'none';
    if (catSelect.value === '__new__') { catNew.focus(); return; }
    if (catSelect.value) fillDescriptionTemplate(catSelect.value, idx);
  });
  catNew.addEventListener('input', () => {
    const name = catNew.value.trim();
    if (name) fillDescriptionTemplate(name, idx);
  });
}

// 画像ファイルを選択したときの処理
function handleFile(idx, file) {
  entryFiles[idx] = file;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    document.getElementById(`js-img-preview-${idx}`).innerHTML =
      `<img src="${dataUrl}" alt="プレビュー">`;
    const zone = document.getElementById(`js-drop-zone-${idx}`);
    zone.classList.add('has-file');
    zone.querySelector('.drop-zone-main').textContent = `✓ ${file.name}`;
    zone.querySelector('.drop-zone-sub').textContent = `${(file.size / 1024).toFixed(0)} KB`;

    // 画像の実寸を取得してリサイズコントロールを表示
    const img = new Image();
    img.onload = () => {
      const ctrl = document.getElementById(`js-resize-ctrl-${idx}`);
      if (!ctrl) return;
      const wInput = document.getElementById(`js-resize-w-${idx}`);
      const hInput = document.getElementById(`js-resize-h-${idx}`);
      const origLabel = document.getElementById(`js-resize-orig-${idx}`);
      const ratio = img.naturalWidth / img.naturalHeight;
      ctrl.dataset.ratio = ratio;
      origLabel.textContent = `元サイズ: ${img.naturalWidth} × ${img.naturalHeight} px`;
      wInput.value = img.naturalWidth;
      hInput.value = img.naturalHeight;
      ctrl.style.display = 'block';

      wInput.oninput = () => {
        if (document.getElementById(`js-resize-lock-${idx}`)?.checked) {
          hInput.value = Math.round(parseInt(wInput.value) / ratio) || '';
        }
      };
      hInput.oninput = () => {
        if (document.getElementById(`js-resize-lock-${idx}`)?.checked) {
          wInput.value = Math.round(parseInt(hInput.value) * ratio) || '';
        }
      };
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Canvasで画像をリサイズしてFileオブジェクトを返す
function resizeImageFile(file, width, height) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg', 0.92
      );
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

// エントリーのドロップゾーンをリセット
function resetEntryDropZone(idx) {
  entryFiles[idx] = null;
  const preview = document.getElementById(`js-img-preview-${idx}`);
  if (preview) preview.innerHTML = '';
  const fi = document.getElementById(`f-image-file-${idx}`);
  if (fi) fi.value = '';
  const zone = document.getElementById(`js-drop-zone-${idx}`);
  if (!zone) return;
  zone.classList.remove('has-file', 'drag-over');
  zone.querySelector('.drop-zone-main').textContent = 'ここにドラッグ＆ドロップ';
  zone.querySelector('.drop-zone-sub').textContent = 'またはクリックしてファイルを選択';
  const ctrl = document.getElementById(`js-resize-ctrl-${idx}`);
  if (ctrl) ctrl.style.display = 'none';
}

// 「もう1件追加」ボタンの表示状態を更新
function updateAddEntryButton() {
  const btn = document.getElementById('js-add-entry-btn');
  if (!btn) return;
  if (editingId || entryFiles.length >= MAX_ENTRIES) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'block';
    btn.textContent = `＋ もう1件追加（${entryFiles.length} / ${MAX_ENTRIES}件）`;
  }
}

// フォーム全体のセットアップ
function setupForm() {
  const form = document.getElementById('js-add-form');
  const container = document.getElementById('js-entries-container');

  // 最初のエントリーを描画
  container.innerHTML = createEntryBlockHTML(0);
  setupEntryDropZone(0);
  setupEntryListeners(0);
  updateAddEntryButton();

  // もう1件追加ボタン
  document.getElementById('js-add-entry-btn').addEventListener('click', () => {
    if (editingId || entryFiles.length >= MAX_ENTRIES) return;
    const idx = entryFiles.length;
    entryFiles.push(null);

    const wrap = document.createElement('div');
    wrap.innerHTML = createEntryBlockHTML(idx);
    const block = wrap.firstElementChild;
    container.appendChild(block);

    setupEntryDropZone(idx);
    setupEntryListeners(idx);

    // 削除ボタンのリスナー
    block.querySelector('.remove-entry-btn').addEventListener('click', () => {
      block.remove();
      entryFiles.splice(idx, 1);
      updateAddEntryButton();
    });

    updateAddEntryButton();
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // フォームリセット時
  form.addEventListener('reset', () => {
    entryFiles = [null];
    container.querySelectorAll('.entry-block').forEach((b, i) => { if (i > 0) b.remove(); });
    resetEntryDropZone(0);
    if (editingId) cancelEdit();
    updateAddEntryButton();
  });

  // キャンセルボタン
  document.getElementById('js-cancel-btn').addEventListener('click', () => {
    cancelEdit();
    form.reset();
  });

  // 送信処理
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = document.getElementById('js-submit-btn');
    submitBtn.disabled = true;

    if (editingId) {
      await handleEditSubmit(submitBtn);
    } else {
      await handleBatchSubmit(submitBtn);
    }

    await loadWorks();
  });
}

// 編集モードの送信
async function handleEditSubmit(submitBtn) {
  const title = getVal('f-title-0');
  if (!title) { showToast('タイトルを入力してください', 'error'); submitBtn.disabled = false; return; }

  const category = getCatVal(0);
  const price = getNumVal('f-price-0');
  const description = getVal('f-description-0') || null;

  let imageUrl = null;
  if (entryFiles[0]) {
    submitBtn.textContent = '画像をアップロード中...';
    try {
      const rw = parseInt(document.getElementById('js-resize-w-0')?.value);
      const rh = parseInt(document.getElementById('js-resize-h-0')?.value);
      const fileToUpload = (rw > 0 && rh > 0)
        ? await resizeImageFile(entryFiles[0], rw, rh)
        : entryFiles[0];
      imageUrl = await uploadImage(fileToUpload);
    }
    catch (err) {
      showToast('画像アップロードに失敗: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = '更新する';
      return;
    }
  }

  submitBtn.textContent = '更新中...';
  const updates = { title, category, price, description };
  if (imageUrl) updates.image_url = imageUrl;

  const { error } = await db.from('works').update(updates).eq('id', editingId);
  submitBtn.disabled = false;
  if (error) { showToast('更新に失敗: ' + error.message, 'error'); submitBtn.textContent = '更新する'; return; }
  if (category && description) saveCategoryTemplate(category, description);
  showToast('更新しました！', 'success');
  cancelEdit();
  document.getElementById('js-add-form').reset();
}

// まとめて追加モードの送信
async function handleBatchSubmit(submitBtn) {
  const container = document.getElementById('js-entries-container');
  const blocks = [...container.querySelectorAll('.entry-block')];

  // タイトルがあるエントリーだけ処理
  const targets = blocks
    .map(b => parseInt(b.id.replace('entry-block-', ''), 10))
    .filter(idx => getVal(`f-title-${idx}`));

  if (!targets.length) {
    showToast('タイトルを入力してください', 'error');
    submitBtn.disabled = false;
    return;
  }

  let ok = 0;
  for (let i = 0; i < targets.length; i++) {
    const idx = targets[i];
    const title = getVal(`f-title-${idx}`);
    submitBtn.textContent = `登録中... (${i + 1}/${targets.length}件)`;

    const category = getCatVal(idx);
    const price = getNumVal(`f-price-${idx}`);
    const description = getVal(`f-description-${idx}`) || null;

    let imageUrl = null;
    if (entryFiles[idx]) {
      try {
        const rw = parseInt(document.getElementById(`js-resize-w-${idx}`)?.value);
        const rh = parseInt(document.getElementById(`js-resize-h-${idx}`)?.value);
        const fileToUpload = (rw > 0 && rh > 0)
          ? await resizeImageFile(entryFiles[idx], rw, rh)
          : entryFiles[idx];
        imageUrl = await uploadImage(fileToUpload);
      }
      catch (err) { showToast(`「${title}」の画像アップロードに失敗`, 'error'); continue; }
    }

    const { error } = await db.from('works').insert({ title, category, price, description, image_url: imageUrl });
    if (error) { showToast(`「${title}」の追加に失敗: ${error.message}`, 'error'); continue; }
    if (category && description) saveCategoryTemplate(category, description);
    ok++;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = '追加する';

  if (ok > 0) {
    showToast(`${ok}件の作品を追加しました！`, 'success');
    // エントリーを1件にリセット
    entryFiles = [null];
    container.querySelectorAll('.entry-block').forEach((b, i) => { if (i > 0) b.remove(); });
    document.getElementById('js-add-form').reset();
    resetEntryDropZone(0);
    updateAddEntryButton();
  }
}

// フィールド値取得ヘルパー
function getVal(id) { return (document.getElementById(id)?.value || '').trim(); }
function getNumVal(id) { const v = getVal(id); return v ? parseInt(v, 10) : null; }
function getCatVal(idx) {
  const sel = document.getElementById(`f-category-select-${idx}`);
  if (!sel) return null;
  return sel.value === '__new__' ? (getVal(`f-category-new-${idx}`) || null) : (sel.value || null);
}

// 編集モード開始
function startEdit(work) {
  editingId = work.id;

  // 余分なエントリーを1件に戻す
  const container = document.getElementById('js-entries-container');
  container.querySelectorAll('.entry-block').forEach((b, i) => { if (i > 0) b.remove(); });
  entryFiles = [null];

  document.getElementById('f-title-0').value = work.title || '';
  document.getElementById('f-price-0').value = work.price || '';
  document.getElementById('f-description-0').value = work.description || '';

  const sel = document.getElementById('f-category-select-0');
  const catNew = document.getElementById('f-category-new-0');
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

  if (work.image_url) {
    document.getElementById('js-img-preview-0').innerHTML =
      `<img src="${esc(work.image_url)}" alt="現在の画像">`;
    const zone = document.getElementById('js-drop-zone-0');
    zone.classList.add('has-file');
    zone.querySelector('.drop-zone-main').textContent = '画像を変更する場合はドロップ';
    zone.querySelector('.drop-zone-sub').textContent = '変更しない場合はそのまま更新';
  }

  document.getElementById('js-form-title').textContent = '✏️ 作品を編集';
  document.getElementById('js-submit-btn').textContent = '更新する';
  document.getElementById('js-cancel-btn').style.display = 'inline-block';
  updateAddEntryButton();
  document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 編集モード終了
function cancelEdit() {
  editingId = null;
  document.getElementById('js-form-title').textContent = '🌹 新しい作品を追加';
  document.getElementById('js-submit-btn').textContent = '追加する';
  document.getElementById('js-cancel-btn').style.display = 'none';
  updateAddEntryButton();
}

// 作品を削除
async function deleteWork(id) {
  if (!confirm('この作品を削除しますか？')) return;
  const { error } = await db.from('works').delete().eq('id', id);
  if (error) { showToast('削除に失敗しました', 'error'); return; }
  showToast('削除しました', 'success');
  await loadWorks();
}

// Supabase Storage に画像をアップロード
async function uploadImage(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await db.storage.from('works').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = db.storage.from('works').getPublicUrl(fileName);
  return data.publicUrl;
}

// トースト通知
function showToast(message, type = 'success') {
  const toast = document.getElementById('js-toast');
  toast.textContent = message;
  toast.className = `show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, 3000);
}

// カテゴリテンプレートをlocalStorageに保存
function saveCategoryTemplate(category, description) {
  const templates = JSON.parse(localStorage.getItem('catTemplates') || '{}');
  templates[category] = description;
  localStorage.setItem('catTemplates', JSON.stringify(templates));
}

// カテゴリテンプレートを説明欄に自動入力
function fillDescriptionTemplate(category, idx) {
  const templates = JSON.parse(localStorage.getItem('catTemplates') || '{}');
  if (templates[category]) {
    const el = document.getElementById(`f-description-${idx}`);
    if (el) el.value = templates[category];
  }
}

// XSS対策
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
