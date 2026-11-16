/* Dashboard: painel de análises com 3 visões — previsão de combustível (linha estilo F1), serviços em barras e serviços em pizza.
   Tudo em SVG desenhado aqui (sem biblioteca). Envolve renderDashboard sem alterar o código do GF. */
const GRAF = { modo: 'previsao', ocultas: {}, prev: null, prevEm: 0, carregando: false, erro: '' };
const PALETA = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#f97316', '#64748b'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlCurto = n => n >= 1000 ? 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : 'R$ ' + Math.round(n);

/** Serviços feitos (respeitando o filtro de veículo e de período do Dashboard), do mais repetido para o menos. */
function contagemServicos() {
  const veic = (document.getElementById('dashVeiculo') || {}).value || 'todos', ini = (document.getElementById('dashDataInicio') || {}).value || '', fim = (document.getElementById('dashDataFim') || {}).value || '';
  const cont = {};
  db.manutencoes.forEach(m => {
    if (m.descricao === 'Registro de KM' || m.tipo === 'abastecimento') return;
    if (veic !== 'todos' && m.placa !== veic) return;
    if ((ini && m.data < ini) || (fim && m.data > fim)) return;
    const nome = String(m.tipo === 'outro' ? m.descricao : (TIPOS[m.tipo] || m.tipo) || '').trim(); if (!nome) return;
    const k = normPeca(nome); (cont[k] = cont[k] || { qtd: 0, v: {} }); cont[k].qtd++; cont[k].v[nome] = (cont[k].v[nome] || 0) + 1;   // "Pastilha de freio" e "pastilha freio " viram um serviço só
  });
  return Object.keys(cont).map(k => ({ nome: Object.keys(cont[k].v).sort((a, b) => cont[k].v[b] - cont[k].v[a])[0], qtd: cont[k].qtd })).sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome));
}

function svgBarras(lista) {
  const top = lista.slice(0, 10), max = Math.max(1, ...top.map(x => x.qtd)), H = 34, W = 560, L = 190, R = 44;
  const linhas = top.map((x, i) => {
    const w = Math.max(3, (W - L - R) * x.qtd / max), y = i * H + 6, cor = PALETA[i % PALETA.length], nome = x.nome.length > 28 ? x.nome.slice(0, 27) + '…' : x.nome;
    return `<g><title>${esc(x.nome)}: ${x.qtd}</title><text x="${L - 10}" y="${y + 15}" text-anchor="end" class="g-lbl">${esc(nome)}</text>
      <rect x="${L}" y="${y}" width="${w}" height="20" rx="6" fill="${cor}" opacity=".9"/><text x="${L + w + 8}" y="${y + 15}" class="g-val">${x.qtd}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${top.length * H + 8}" class="g-svg" role="img" aria-label="Serviços mais repetidos">${linhas}</svg>`;
}

function svgPizza(lista) {
  const top = lista.slice(0, 7), sobra = lista.slice(7), resto = sobra.reduce((s, x) => s + x.qtd, 0), fatias = top.concat(resto ? [{ nome: 'Outros', qtd: resto, itens: sobra }] : []);
  const total = fatias.reduce((s, x) => s + x.qtd, 0) || 1, R = 90, r = 52, cx = 110, cy = 110;
  let ang = -Math.PI / 2;
  const arcos = fatias.map((x, i) => {
    const a = x.qtd / total * Math.PI * 2, a2 = ang + a, grande = a > Math.PI ? 1 : 0;
    const p = (rad, t) => [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
    const [x1, y1] = p(R, ang), [x2, y2] = p(R, a2 - 0.0001), [x3, y3] = p(r, a2 - 0.0001), [x4, y4] = p(r, ang);
    const d = fatias.length === 1 ? `M${cx - R} ${cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0M${cx - r} ${cy}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0` : `M${x1} ${y1}A${R} ${R} 0 ${grande} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${grande} 0 ${x4} ${y4}Z`;
    ang = a2;
    return `<path d="${d}" fill="${PALETA[i % PALETA.length]}" fill-rule="evenodd"><title>${esc(x.nome)}: ${x.qtd} (${Math.round(x.qtd / total * 100)}%)</title></path>`;
  }).join('');
  const leg = fatias.map((x, i) => x.itens ? `<details class="g-outros"><summary class="g-leg"><i style="background:${PALETA[i % PALETA.length]}"></i><span>Outros (${x.itens.length} serviços) ▾</span><b>${x.qtd} · ${Math.round(x.qtd / total * 100)}%</b></summary>${x.itens.map(o => `<div class="g-leg g-sub"><span>${esc(o.nome)}</span><b>${o.qtd}</b></div>`).join('')}</details>` : `<div class="g-leg"><i style="background:${PALETA[i % PALETA.length]}"></i><span>${esc(x.nome)}</span><b>${x.qtd} · ${Math.round(x.qtd / total * 100)}%</b></div>`).join('');
  return `<div class="g-pizza"><svg viewBox="0 0 220 220" class="g-svg g-svg-pizza" role="img" aria-label="Participação de cada serviço">${arcos}<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="g-tot">${total}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" class="g-lbl">serviços</text></svg><div class="g-legs">${leg}</div></div>`;
}

/* ---- Previsão por caminhão: gasto acumulado em R$ (histórico sólido com pontos em cada abastecimento; projeção tracejada em degraus, no ritmo de abastecimento de cada caminhão) ---- */
const _dia = iso => Math.round(Date.parse(iso + 'T12:00:00Z') / 864e5);
const _isoDia = n => new Date(n * 864e5).toISOString().slice(0, 10);
const _mediana = a => { if (!a.length) return 0; const o = a.slice().sort((x, y) => x - y), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };

/** Monta, para um caminhão, os pontos reais (acumulados) e os degraus previstos (acumulados). */
function seriePlaca(p, hojeN, ini) {
  const hist = (p.historico || []).map(x => ({ n: _dia(x.data), v: x.valor })).sort((a, b) => a.n - b.n);
  const previsto = (p.previsao || []).reduce((s, x) => s + x.valor, 0), horizonte = (p.previsao || []).length;
  let acum = 0; const real = [{ n: ini, v: 0, ponto: false }];
  hist.forEach(x => { if (x.n < ini || x.n > hojeN) return; acum += x.v; real.push({ n: x.n, v: acum, ponto: true }); });
  real.push({ n: hojeN, v: acum, ponto: false });
  const gaps = []; for (let i = 1; i < hist.length; i++) gaps.push(hist[i].n - hist[i - 1].n);
  const intervalo = Math.max(1, Math.round(_mediana(gaps.filter(g => g > 0)) || 3));
  const ult = hist.length ? hist[hist.length - 1].n : hojeN - intervalo;
  const qtd = previsto > 0 ? Math.max(1, Math.min(horizonte, Math.round(horizonte / intervalo))) : 0, cada = qtd ? previsto / qtd : 0;
  const proj = []; let t = ult + intervalo; while (t <= hojeN) t += intervalo;           // próximo abastecimento esperado (nunca no passado)
  let ac = acum;
  for (let i = 0; i < qtd && t <= hojeN + horizonte; i++, t += intervalo) { ac += cada; proj.push({ n: t, v: ac }); }
  return { placa: p.placa, real, proj, fim: acum, previsto: previsto };
}

function svgPrevisao(p) {
  const placas = (p.porPlaca || []).filter(x => (x.historico || []).length || (x.previsao || []).length);
  if (!placas.length) return '<div class="empty" style="padding:30px 10px;color:#94a3b8">Ainda não há abastecimentos suficientes para prever.</div>';
  const hojeN = _dia(p.hoje), horizonte = Math.max(...placas.map(x => (x.previsao || []).length), 1), ini = hojeN - 30, fimN = hojeN + horizonte;
  const series = placas.map(x => seriePlaca(x, hojeN, ini)), vis = series.filter(s => !GRAF.ocultas[s.placa]);
  const cor = placa => PALETA[placas.findIndex(x => x.placa === placa) % PALETA.length];
  const topo = Math.max(1, ...vis.map(s => (s.proj.length ? s.proj[s.proj.length - 1].v : s.fim)));
  const max = topo * 1.12, W = 760, H = 300, L = 62, R = 18, T = 16, B = 32;
  const X = n => L + (W - L - R) * (n - ini) / (fimN - ini), Y = v => T + (H - T - B) * (1 - v / max);
  const degrau = pts => { let d = ''; pts.forEach((q, i) => { d += i ? `H${X(q.n)}V${Y(q.v)}` : `M${X(q.n)} ${Y(q.v)}`; }); return d; };
  const grade = [0, .25, .5, .75, 1].map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(max * t)}" y2="${Y(max * t)}" class="g-grade"/><text x="${L - 8}" y="${Y(max * t) + 4}" text-anchor="end" class="g-eixo">${brlCurto(max * t)}</text>`).join('');
  let marcas = ''; for (let n = ini; n <= fimN; n += Math.max(1, Math.ceil((fimN - ini) / 8))) { const d = _isoDia(n); marcas += `<text x="${X(n)}" y="${H - 10}" text-anchor="middle" class="g-eixo">${d.slice(8, 10)}/${d.slice(5, 7)}</text>`; }
  const linhas = vis.map(s => {
    const c = cor(s.placa), ligado = [s.real[s.real.length - 1]].concat(s.proj);
    const bolas = s.real.filter(q => q.ponto).map(q => `<circle cx="${X(q.n)}" cy="${Y(q.v)}" r="3.6" fill="${c}" stroke="#0b1020" stroke-width="1.5"><title>${esc(s.placa)} · ${fmtData(_isoDia(q.n))}: ${brl(q.v)} acumulado</title></circle>`).join('');
    const prev = s.proj.map(q => `<circle cx="${X(q.n)}" cy="${Y(q.v)}" r="3.6" fill="#0b1020" stroke="${c}" stroke-width="1.8"><title>${esc(s.placa)} · ${fmtData(_isoDia(q.n))}: ${brl(q.v)} acumulado (previsto)</title></circle>`).join('');
    return `<path d="${degrau(s.real)}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${s.proj.length ? `<path d="${degrau(ligado)}" fill="none" stroke="${c}" stroke-width="2.2" stroke-dasharray="6 5" opacity=".85"/>` : ''}${bolas}${prev}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="g-svg g-f1" role="img" aria-label="Gasto acumulado de combustível por caminhão e previsão">${grade}${marcas}
    <line x1="${X(hojeN)}" x2="${X(hojeN)}" y1="${T}" y2="${H - B}" class="g-hoje"/><text x="${X(hojeN) + 5}" y="${T + 10}" class="g-eixo">hoje</text>${linhas}</svg>`;
}

function legendaPrevisao(p) {
  const placas = (p.porPlaca || []).filter(x => (x.historico || []).length || (x.previsao || []).length);
  return `<div class="g-legs-f1">${placas.map((x, i) => { const prev = (x.previsao || []).reduce((s, y) => s + y.valor, 0), off = GRAF.ocultas[x.placa];
    return `<button type="button" class="${off ? 'off' : ''}" onclick="GRAF.ocultas['${esc(x.placa)}']=!GRAF.ocultas['${esc(x.placa)}'];renderAnalises()"><i style="background:${PALETA[i % PALETA.length]}"></i><span>${esc(x.placa)}</span><small>${brlCurto(prev)}</small></button>`; }).join('')}</div>`;
}

async function carregarPrevisao() {
  if (GRAF.carregando || (GRAF.prev && Date.now() - GRAF.prevEm < 300000)) return;
  GRAF.carregando = true; GRAF.erro = '';
  try { GRAF.prev = await API.chamar('getPrevisao', { dias: 14 }); GRAF.prevEm = Date.now(); } catch (e) { GRAF.erro = e.message; }
  GRAF.carregando = false; renderAnalises();
}

function renderAnalises() {
  const box = document.getElementById('dashAnalises'); if (!box) return;
  const mec = App.sessao && App.sessao.perfil === 'mecanico';          // mecânico: só serviços, sem custos nem previsão
  if (mec && GRAF.modo === 'previsao') GRAF.modo = 'barras';
  const abas = [['previsao', 'Previsão de combustível'], ['barras', 'Serviços (barras)'], ['pizza', 'Serviços (pizza)']].filter(a => !(mec && a[0] === 'previsao'));
  let corpo = '', escuro = false;
  if (GRAF.modo === 'previsao') {
    escuro = true;
    if (!GRAF.prev && !GRAF.erro) { corpo = '<div class="empty" style="padding:30px 10px;color:#94a3b8">Calculando a previsão…</div>'; carregarPrevisao(); }
    else if (GRAF.erro) corpo = `<div class="empty" style="padding:30px 10px;color:#fca5a5">Não consegui calcular a previsão: ${esc(GRAF.erro)}</div>`;
    else {
      const prev = GRAF.prev.previsaoTotal || [], tot = prev.reduce((s, x) => s + x.valor, 0);
      corpo = `<div class="g-f1-cab"><div class="g-kpi"><span>Previsto para os próximos ${prev.length} dias (frota toda)</span><b>${brl(tot)}</b><small>gasto acumulado por caminhão · pontos = abastecimentos · tracejado = previsão no ritmo de cada caminhão</small></div></div>
        <div class="g-f1-corpo">${legendaPrevisao(GRAF.prev)}<div class="g-f1-graf">${svgPrevisao(GRAF.prev)}</div></div>`;
    }
  } else {
    const lista = contagemServicos();
    corpo = !lista.length ? '<div class="empty" style="padding:30px 10px">Nenhum serviço registrado neste filtro.</div>' : (GRAF.modo === 'barras' ? svgBarras(lista) : svgPizza(lista));
  }
  box.innerHTML = `<div class="g-abas">${abas.map(([id, nome]) => `<button type="button" class="${GRAF.modo === id ? 'active' : ''}" onclick="GRAF.modo='${id}';renderAnalises()">${nome}</button>`).join('')}</div><div class="g-corpo ${escuro ? 'g-escuro' : ''}">${corpo}</div>`;
}

const _renderDashboardGF = renderDashboard;
renderDashboard = function () { _renderDashboardGF(); renderAnalises(); };
