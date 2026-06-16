const CACHE_NAME = 'atelier-de-ruka-v6';

// 画像のみキャッシュ（HTMLとCSSは常に最新を取得）
const IMAGE_ASSETS = [
  '/images/logo.png',
  '/images/icon-512.png',
  '/images/icon-192.png',
  '/images/collage1.jpg',
  '/images/collage2.jpg',
  '/images/collage3.jpg',
  '/images/collage4.jpg',
  '/images/collage5.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(IMAGE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Supabase・Google Fontsはそのまま通す
  if (url.includes('supabase.co') || url.includes('fonts.google') || url.includes('fonts.gstatic')) {
    return;
  }

  // HTML・CSS・JSはネット優先（最新を取得し、失敗時のみキャッシュ）
  const isPage = /\.(html|css|js)(\?|$)/.test(url) || url.endsWith('/');
  if (isPage) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 画像はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
