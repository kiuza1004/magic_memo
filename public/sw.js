// Magic Memo — 최소 PWA 서비스 워커.
// 설치 가능성(installability) 충족용 + 오프라인 셸 캐싱.

const CACHE = "magic-memo-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon.svg"]).catch(() => {
        // 일부 경로 누락은 무시
      }),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 동일 출처만 처리. HuggingFace 모델 weights/OPFS는 통과.
  if (url.origin !== self.location.origin) return;

  // 네비게이션: 네트워크 우선, 실패 시 캐시(루트 인덱스).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r ?? caches.match("./"))),
    );
    return;
  }

  // 정적 자원: 캐시 우선, 미스 시 네트워크.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ??
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }),
    ),
  );
});
