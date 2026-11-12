/* Aba "Fleet" dentro da tela do veículo (ao lado de "Dados"). Envolve o renderDetalhe do GF sem alterá-lo. */
let abaVeiculo = 'dados';
const _renderDetalheGF = renderDetalhe;
renderDetalhe = function () {
  _renderDetalheGF();
  const wrap = document.getElementById('manutDetalheWrap'), v = db.veiculos.find(x => x.placa === veiculoSel);
  if (!wrap || !v || wrap.querySelector('#veicDados')) return;
  const volta = wrap.firstElementChild, dados = h('div', { id: 'veicDados' }), fleet = h('div', { id: 'veicFleet', hidden: true });
  while (volta.nextSibling) dados.append(volta.nextSibling);
  const abas = h('div', { class: 'veic-abas' }), mostrar = n => { abaVeiculo = n; dados.hidden = n !== 'dados'; fleet.hidden = n !== 'fleet'; $$('button', abas).forEach(b => b.classList.toggle('active', b.dataset.t === n)); };
  [['dados', 'Dados'], ['fleet', 'Fleet']].forEach(([id, nome]) => abas.append(h('button', { type: 'button', dataset: { t: id }, text: nome, onclick: () => mostrar(id) })));
  fleet.append(h('div', { class: 'card' }, h('h2', { text: 'Dados do veículo (Fleet)' }), h('dl', { class: 'dl' },
    h('dt', { text: 'Modelo' }), h('dd', { text: v.modelo || '—' }), h('dt', { text: 'Ano' }), h('dd', { text: v.ano ? String(v.ano).slice(0, 4) : '—' }),
    h('dt', { text: 'Combustível' }), h('dd', { text: v.tipoDiesel || '—' }), h('dt', { text: 'Usa Arla' }), h('dd', { text: v.utilizaArla || '—' }),
    h('dt', { text: 'Tacógrafo' }), h('dd', { text: v.tipoTacografo || '—' }), h('dt', { text: 'KM atual' }), h('dd', { text: fmtKm(v.kmAtual) }))),
    h('div', { class: 'card soon' }, h('b', { text: 'Motorista atual, checklists e ocorrências' }), 'Entram junto com o módulo do motorista (Fases 3 e 4).'));
  volta.after(abas); wrap.append(dados, fleet); mostrar(abaVeiculo);
};
