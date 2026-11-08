const CACHE_NAME = 'deephee-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Stale-while-revalidate: 캐시가 있으면 즉시 응답하면서 백그라운드로 갱신,
// 캐시가 없으면 네트워크를 기다림(실패 시 캐시 폴백).
// 앱 자체 파일(같은 origin)과 폰트만 캐시한다 — Supabase 데이터 요청까지
// 캐시하면 방금 등록된 일정 대신 낡은 응답이 먼저 보이게 된다.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isCacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
  if (!isCacheable) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(e.request, response.clone());
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
