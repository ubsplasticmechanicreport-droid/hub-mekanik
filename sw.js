/* Pembersih service worker Hub lama (Netlify).
   Tugasnya hanya satu: menghapus service worker dan cache lama di ponsel, lalu memuat ulang halaman
   sehingga pengalihan ke Hub di Cloudflare berjalan. Tidak menyimpan apa pun. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try { var keys = await caches.keys(); await Promise.all(keys.map(function (k) { return caches.delete(k); })); } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    try {
      var list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach(function (c) { try { c.navigate('/'); } catch (e) {} });
    } catch (e) {}
  })());
});
