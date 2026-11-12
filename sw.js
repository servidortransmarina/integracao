// Guarda só a "casca" do site para abrir rápido. Dados da API NUNCA são guardados.
const V = 'trm-v2', CASCA = ['./', 'index.html', 'css/gf.css', 'css/hub.css', 'js/config.js', 'js/ui.js', 'js/api.js', 'js/auth.js', 'js/gf/ponte.js', 'js/gf/script.js', 'js/gf/pneus.js', 'js/gf/fleet.js', 'js/inicio.js', 'js/perfil.js', 'js/usuarios.js', 'js/app.js', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // API e fontes: direto da rede
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
