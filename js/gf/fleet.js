/* Aba "Fleet" dentro da tela do veículo (ao lado de "Dados"): ficha do veículo + combustível. Envolve o renderDetalhe do GF sem alterá-lo. */
let abaVeiculo = 'dados';
const TACOGRAFO = { 'digital': 'Digital', 'manual-diario': 'Manual (disco diário)', 'manual-7dias': 'Manual (disco de 7 dias)' };
/* Ano fabricação/modelo: "2023/24", "2010/11" ou só "2014" — mostra como está (nunca como mês/ano). */
const fmtAnoFleet = a => { const t = String(a || '').trim(); const m = t.match(/^(\d{4})[\/-](\d{2})/); return m ? m[1] + '/' + m[2] : (t.slice(0, 4) || '—'); };
const fmtReais = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function resumoCombustivel(placa, dias) {
  const lim = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10), hoje = new Date().toISOString().slice(0, 10);
  const todos = db.manutencoes.filter(m => m.placa === placa && m.tipo === 'abastecimento')
    .sort((a, b) => (a.data + (a._hora || '')).localeCompare(b.data + (b._hora || '')));
  const per = todos.filter(m => m.data >= lim && m.data <= hoje);
  const litros = per.reduce((s, m) => s + (m._litros || 0), 0), gasto = per.reduce((s, m) => s + (m.valor || 0), 0);
  let km = 0, lit = 0;
  for (let i = 1; i < todos.length; i++) {
    const a = todos[i - 1], b = todos[i];
    if (b.data < lim || !(a.km > 0 && b.km > a.km) || !(b._litros > 0)) continue;
    km += b.km - a.km; lit += b._litros;
  }
  return { todos, per, litros, gasto, precoMedio: litros ? gasto / litros : 0, kmPorL: lit > 0 && km > 0 ? km / lit : 0 };
}

const _renderDetalheGF = renderDetalhe;
renderDetalhe = function () {
  _renderDetalheGF();
  const wrap = document.getElementById('manutDetalheWrap'), v = db.veiculos.find(x => x.placa === veiculoSel);
  if (!wrap || !v || wrap.querySelector('#veicDados')) return;
  const volta = wrap.firstElementChild, dados = h('div', { id: 'veicDados' }), fleet = h('div', { id: 'veicFleet', hidden: true });
  while (volta.nextSibling) dados.append(volta.nextSibling);
  const abas = h('div', { class: 'veic-abas' }), mostrar = n => { abaVeiculo = n; dados.hidden = n !== 'dados'; fleet.hidden = n !== 'fleet'; $$('button', abas).forEach(b => b.classList.toggle('active', b.dataset.t === n)); };
  [['dados', 'Dados'], ['fleet', 'Fleet']].forEach(([id, nome]) => abas.append(h('button', { type: 'button', dataset: { t: id }, text: nome, onclick: () => mostrar(id) })));

  const r = resumoCombustivel(v.placa, 90);
  const kpi = (rot, val, sub) => h('div', { class: 'kpi' }, h('small', { text: rot }), h('b', { text: val }), sub ? h('span', { text: sub }) : null);
  const tanque = v.capacidadeDiesel ? v.capacidadeDiesel + ' L' : '—', arla = v.utilizaArla === 'sim' ? (v.capacidadeArla ? 'Sim · tanque ' + v.capacidadeArla + ' L' : 'Sim') : 'Não';
  const par = (rot, val) => [h('dt', { text: rot }), h('dd', { text: val })];

  // Motoristas dos últimos 7 dias (hoje + 6 anteriores): quem fez checklist, abasteceu ou abriu ocorrência neste caminhão
  const D = (typeof App !== 'undefined' && App.dados) || {}, nomes = {}; (D.motoristas || []).forEach(m => { nomes[m.id] = m.nome; });
  const hoje = hojeLocal(), d0 = new Date(hoje + 'T00:00:00'); d0.setDate(d0.getDate() - 6);
  const desde = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
  const mot = {};
  const marca = (id, data, tipo) => { const dia = String(data || '').slice(0, 10); if (!id || dia < desde || dia > hoje) return; const m = mot[id] = mot[id] || { id, ult: '', tipos: {} }; m.tipos[tipo] = (m.tipos[tipo] || 0) + 1; if (dia > m.ult) m.ult = dia; };
  (D.checklists || []).filter(c => c.placa === v.placa).forEach(c => marca(c.motoristaId, c.data, 'checklist'));
  (D.abastecimentos || []).filter(a => a.placa === v.placa && a.origem === 'motorista').forEach(a => marca(a.motoristaId, a.data, 'abastecimento'));
  (D.ocorrencias || []).filter(o => o.placa === v.placa).forEach(o => marca(o.motoristaId, o.dataAbertura, 'ocorrência'));
  const lista = Object.values(mot).sort((x, y) => y.ult.localeCompare(x.ult));
  const motCard = h('div', { class: 'card' }, h('h2', { text: 'Motoristas na última semana' }), h('div', { class: 'hint', style: 'margin:-6px 0 10px', text: fmtData(desde) + ' a ' + fmtData(hoje) + ' (7 dias, contando hoje)' }),
    lista.length ? h('div', { class: 'mot-lista' }, lista.map(m => h('div', { class: 'mot' }, h('b', { text: nomeBonito(nomes[m.id] || 'Motorista') }),
      h('span', { text: Object.keys(m.tipos).map(t => m.tipos[t] + (m.tipos[t] > 1 ? '× ' : '× ') + t).join(' · ') + ' · último em ' + fmtData(m.ult) }))))
      : h('div', { class: 'empty', text: 'Nenhum motorista registrou checklist, abastecimento ou ocorrência neste caminhão nos últimos 7 dias.' }));

  const checks = (D.checklists || []).filter(c => c.placa === v.placa).sort((x, y) => String(y.data).localeCompare(String(x.data))).slice(0, 5);
  const chkCard = h('div', { class: 'card' }, h('h2', { text: 'Checklist' }), checks.length
    ? h('div', { class: 'mot-lista' }, checks.map(c => h('div', { class: 'mot' }, h('b', { text: fmtData(String(c.data).slice(0, 10)) + ' · ' + nomeBonito(nomes[c.motoristaId] || 'Motorista') }), h('span', { text: (c.statusGeral || '—') + ' · ' + (c.totalOk || 0) + ' ok, ' + (c.totalWarn || 0) + ' atenção, ' + (c.totalBad || 0) + ' problema' }))))
    : h('div', { class: 'empty', text: 'Nenhum checklist deste caminhão ainda. Entra junto com o módulo do motorista.' }));

  const combCard = h('div', { class: 'card' }, h('h2', { text: 'Combustível — últimos 90 dias' }),
    r.per.length ? h('div', { class: 'kpis' }, kpi('Gasto', fmtReais(r.gasto), r.per.length + ' abastecimentos'), kpi('Litros', r.litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' L'),
      kpi('Preço médio', r.precoMedio ? fmtReais(r.precoMedio) + '/L' : '—'), kpi('Consumo', r.kmPorL ? r.kmPorL.toFixed(2).replace('.', ',') + ' km/L' : '—', 'estimado pelo KM entre abastecimentos'))
      : h('div', { class: 'empty', text: 'Nenhum abastecimento neste período.' }),
    r.todos.length ? h('div', { class: 'table-wrap', style: 'margin-top:14px' }, h('table', {}, h('thead', {}, h('tr', {}, ['Data', 'Produto', 'Litros', 'Valor', 'KM'].map(t => h('th', { text: t })))),
      h('tbody', {}, r.todos.slice(-15).reverse().map(m => h('tr', {}, h('td', { text: fmtData(m.data) + (m._hora ? ' ' + m._hora.slice(0, 5) : '') }), h('td', { text: m.descricao }),
        h('td', { text: (m._litros || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }), h('td', { text: fmtReais(m.valor) }), h('td', { text: m.km ? fmtKm(m.km) : '—' })))))) : null);

  fleet.append(
    h('div', { class: 'fleet-grid' },
      h('div', { class: 'card fleet-dados' }, h('h2', { text: 'Dados do veículo' }), h('dl', { class: 'dl' },
        ...par('Modelo', v.modelo || '—'), ...par('Ano', fmtAnoFleet(v.ano)), ...par('Situação', v.statusVeiculo || '—'), ...par('Combustível', v.tipoDiesel || '—'),
        ...par('Tanque de diesel', tanque), ...par('Arla', arla), ...par('Tacógrafo', TACOGRAFO[v.tipoTacografo] || v.tipoTacografo || '—'), ...par('KM atual', fmtKm(v.kmAtual)))),
      motCard),
    h('div', { class: 'fleet-grid' }, combCard, chkCard));
  volta.after(abas); wrap.append(dados, fleet); mostrar(abaVeiculo);
};
