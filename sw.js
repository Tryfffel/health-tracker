// Service worker för Hälsodagbok.
// Egna filer (index.html, *.js, oura-data.json): ALLTID nätverket först, utan HTTP-cache.
// Cachen används bara som reserv när nätet saknas. CDN-filer (React, Tailwind): cache först.
//
// Viktigt (2026-11-14): hämta med URL-strängen, inte med request-objektet. Safari kastar fel
// på fetch(navigeringsrequest, {cache:...}), och då föll den gamla versionen tillbaka på en
// gammal cachad index.html för alltid. Bumpa CACHE vid varje ändring här.
const CACHE = 'halsa-v9';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys()
    .then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    var nav = req.mode === 'navigate';
    var key = nav ? new URL('./index.html', self.registration.scope).href : url.href;
    e.respondWith(
      fetch(url.href, { cache: 'no-store', credentials: 'same-origin' }).then(function(r){
        if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(key, cp); }); }
        return r;
      }).catch(function(){ return caches.match(key, { ignoreSearch: true }); })
    );
    return;
  }
  // CDN: cache först (versionerade filer)
  e.respondWith(caches.match(req).then(function(c){
    return c || fetch(req).then(function(r){ if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function(ca){ ca.put(req, cp); }); } return r; });
  }));
});
