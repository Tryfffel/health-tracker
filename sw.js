const CACHE = 'halsa-v3';
const ASSETS = [
  './', './index.html', './charts.js', './analytics.js', './manifest.json', './icon-192.png', './icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.tailwindcss.com'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('oura-data.json') !== -1) {
    e.respondWith(fetch(req).then(function(r){ var cp=r.clone(); caches.open(CACHE).then(function(c){c.put(req,cp);}); return r; }).catch(function(){ return caches.match(req); }));
    return;
  }
  // Lokala JS-filer (charts.js, analytics.js): network-first så nya versioner alltid når klienten
  if (url.origin === location.origin && url.pathname.slice(-3) === '.js') {
    e.respondWith(fetch(req).then(function(r){ if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); } return r; }).catch(function(){ return caches.match(req); }));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function(){ return caches.match('./index.html'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(c){ return c || fetch(req).then(function(r){ if(r && r.ok && url.origin===location.origin){ var cp=r.clone(); caches.open(CACHE).then(function(ca){ca.put(req,cp);}); } return r; }); }));
});
