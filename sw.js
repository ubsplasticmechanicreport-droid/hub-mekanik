/* UBS Mekanik Portal — service worker
   Halaman utama: jaringan dahulu (maks. 2,5 detik), lalu cadangan dari cache.
   Berkas statis & PDF: tampil dari cache, diperbarui di latar belakang.
   Dokumen pedoman disimpan lebih awal (tanpa menggagalkan pemasangan) agar dapat dibuka tanpa internet.
   Tautan ke Apps Script (domain lain) tidak disentuh sama sekali.
   Naikkan VERSION setiap kali ada berkas yang berubah isinya (termasuk PDF/gambar dokumen). */
const VERSION = 'ubs-hub-v4';
const SHELL = ['./', './index.html', './manifest.json', './logo-72.png', './icon-192.png', './icon-180.png'];
const DOCS = [
  './dok-memo-pedoman-reguler-v1.webp', './dok-memo-pedoman-setup-v1.webp',
  './dok-pembagian-mesin-ubs1-rev1.webp', './dok-pembagian-mesin-ubs3-rev1.webp',
  './dok-memo-pedoman-reguler-v1.pdf', './dok-memo-pedoman-setup-v1.pdf',
  './dok-pembagian-mesin-ubs1-rev1.pdf', './dok-pembagian-mesin-ubs3-rev1.pdf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) =>
      c.addAll(SHELL).then(() => Promise.all(DOCS.map((u) => c.add(u).catch(() => {}))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(VERSION).then((c) => c.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return; // penampil PDF meminta sebagian berkas: biarkan jaringan

  if (req.mode === 'navigate' && !url.pathname.endsWith('.pdf')) {
    event.respondWith(
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          caches.match('./index.html').then((hit) => hit && resolve(hit));
        }, 2500);
        fetch(req)
          .then((res) => { clearTimeout(timer); resolve(put(req, res)); })
          .catch(() => { clearTimeout(timer); caches.match(req).then((hit) => resolve(hit || caches.match('./index.html'))); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => put(req, res)).catch(() => hit || Response.error());
      return hit || fresh;
    })
  );
});
