// Guarda só a "casca" do site para abrir rápido. Dados da API NUNCA são guardados.
const V = 'trm-3v', CASCA = ['./', 'index.html', 'css/gf.css', 'css/hub.css', 'js/config.js', 'js/ui.js', 'js/api.js', 'js/cripto.js', 'js/auth.js', 'js/gf/ponte.js', 'js/gf/script.js', 'js/gf/pneus.js', 'js/gf/fleet.js', 'js/gf/graficos.js', 'js/inicio.js', 'js/perfil.js', 'js/motoristas.js', 'js/pontos.js', 'js/motorista.js', 'js/financeiro-hub.js', 'js/escalas-hub.js', 'js/ajuda.js', 'js/ponto-hub.js', 'js/ponto-painel.js', 'ponto/index.html', 'ponto/ponto.js', 'ponto/ponto.css', 'js/usuarios.js', 'js/pendencias.js', 'js/app.js', 'manifest.json'];
// instala sempre buscando no servidor (cache: 'reload'), nunca no cache do navegador: evita misturar arquivos de versões diferentes
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CASCA.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // API e fontes: direto da rede
  // imagens (logo, ícones): do cache primeiro — a logo não pode ficar baixando "em faixas" a cada abertura
  if (/\.(png|jpe?g|webp|svg|gif)$/i.test(u.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })));
    return;
  }
  // páginas e scripts: sempre confere com o servidor (no-cache = revalida; volta 304 rápido quando nada mudou)
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
