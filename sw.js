const CACHE_NAME = 'atelier-de-ruka-v4';

// キャッシュするローカルファイル
const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/works.html',
  '/work.html',
  '/style.css',
  '/app.js',
  '/works.js',
  '/work.js',
  '/config.js',
  '/images/logo.png',
  '/images/collage1.jpg',
  '/images/collage2.jpg',
  '/images/collage3.jpg',
  '/images/collage4.jpg',
  '/images/collage5.jpg',
];

// インストール時にキャッシュ保存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// リクエスト処理：Supabaseはネット優先、それ以外はキャッシュ優先
self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('fonts.google')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
