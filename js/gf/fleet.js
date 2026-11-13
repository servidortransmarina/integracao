/* Aba "Fleet" dentro da tela do veículo (ao lado de "Dados"): ficha do veículo + combustível. Envolve o renderDetalhe do GF sem alterá-lo. */
let abaVeiculo = 'dados';
const TACOGRAFO = { 'digital': 'Digital', 'manual-diario': 'Manual (disco diário)', 'manual-7dias': 'Manual (disco de 7 dias)' };
const fmtAnoFleet = a => { const m = String(a || '').match(/^(\d{4})[\/-](\d{2})/); return m ? m[2] + '/' + m[1] : (String(a || '').slice(0, 4) || '—'); };
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
  fleet.append(
    h('div', { class: 'card' }, h('h2', { text: 'Ficha do veículo' }), h('dl', { class: 'dl' },
      h('dt', { text: 'Modelo' }), h('dd', { text: v.modelo || '—' }), h('dt', { text: 'Ano' }), h('dd', { text: fmtAnoFleet(v.ano) }),
      h('dt', { text: 'Situação' }), h('dd', { text: v.statusVeiculo || '—' }), h('dt', { text: 'Combustível' }), h('dd', { text: v.tipoDiesel || '—' }),
      h('dt', { text: 'Tanque de diesel' }), h('dd', { text: tanque }), h('dt', { text: 'Arla' }), h('dd', { text: arla }),
      h('dt', { text: 'Tacógrafo' }), h('dd', { text: TACOGRAFO[v.tipoTacografo] || v.tipoTacografo || '—' }), h('dt', { text: 'KM atual' }), h('dd', { text: fmtKm(v.kmAtual) }))),
    h('div', { class: 'card' }, h('h2', { text: 'Combustível — últimos 90 dias' }),
      r.per.length ? h('div', { class: 'kpis' }, kpi('Gasto', fmtReais(r.gasto), r.per.length + ' abastecimentos'), kpi('Litros', r.litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' L'),
        kpi('Preço médio', r.precoMedio ? fmtReais(r.precoMedio) + '/L' : '—'), kpi('Consumo', r.kmPorL ? r.kmPorL.toFixed(2).replace('.', ',') + ' km/L' : '—', 'estimado pelo KM entre abastecimentos'))
        : h('div', { class: 'empty', text: 'Nenhum abastecimento neste período.' }),
      r.todos.length ? h('div', { class: 'table-wrap', style: 'margin-top:14px' }, h('table', {}, h('thead', {}, h('tr', {}, ['Data', 'Produto', 'Litros', 'Valor', 'KM'].map(t => h('th', { text: t })))),
        h('tbody', {}, r.todos.slice(-15).reverse().map(m => h('tr', {}, h('td', { text: fmtData(m.data) + (m._hora ? ' ' + m._hora.slice(0, 5) : '') }), h('td', { text: m.descricao }),
          h('td', { text: (m._litros || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }), h('td', { text: fmtReais(m.valor) }), h('td', { text: m.km ? fmtKm(m.km) : '—' })))))) : null),
    h('div', { class: 'card soon' }, h('b', { text: 'Motorista atual, checklists e ocorrências' }), 'Entram junto com o módulo do motorista.'));
  volta.after(abas); wrap.append(dados, fleet); mostrar(abaVeiculo);
};
