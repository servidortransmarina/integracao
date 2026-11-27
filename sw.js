// Guarda só a "casca" do site para abrir rápido. Dados da API NUNCA são guardados.
const V = 'trm-50', CASCA = ['./', 'index.html', 'css/gf.css', 'css/hub.css', 'js/config.js', 'js/ui.js', 'js/api.js', 'js/cripto.js', 'js/auth.js', 'js/gf/ponte.js', 'js/servicos.js', 'js/gf/script.js', 'js/gf/pneus.js', 'js/gf/os.js', 'js/gf/fleet.js', 'js/gf/graficos.js', 'js/inicio.js', 'js/perfil.js', 'js/motoristas.js', 'js/pontos.js', 'js/motorista.js', 'js/financeiro-hub.js', 'js/financeiro-comb.js', 'js/almoxarifado.js', 'js/escalas-hub.js', 'js/ajuda.js', 'js/ponto-hub.js', 'js/ponto-painel.js', 'ponto/index.html', 'ponto/ponto.js', 'ponto/ponto.css', 'js/usuarios.js', 'js/pendencias.js', 'js/app.js', 'manifest.json'];
// instala sempre buscando no servidor (cache: 'reload'), nunca no cache do navegador: evita misturar arquivos de versões diferentes
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CASCA.map(u => new Request(/\.(js|css)$/.test(u) ? u + '?v=' + V.slice(4) : u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // API e fontes: direto da rede
  // imagens (logo, ícones): do cache primeiro — a logo não pode ficar baixando "em faixas" a cada abertura
  if (/\.(png|jpe?g|webp|svg|gif)$/i.test(u.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })));
    return;
  }
  // scripts e estilos COM versão no endereço (?v=…): o arquivo daquela versão nunca muda, então vem direto do aparelho, sem ir à rede.
  // Versão nova do site = endereço novo (?v= novo) = baixa na hora. Isso tira ~30 idas ao servidor de cada abertura (no 4G faz diferença).
  if (u.searchParams.has('v') && /\.(js|css)$/i.test(u.pathname)) {
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; })));
    return;
  }
  // páginas (e o que não tem versão): sempre confere com o servidor (no-cache = revalida; volta 304 rápido quando nada mudou)
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
