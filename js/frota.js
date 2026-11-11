const novoId = p => p + '_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const hojeISO = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };

const Frota = {
  pendencias(placa) { return ((App.dados && App.dados.alertas) || []).filter(a => a.placa === placa && a.status !== 'resolvido').length; },

  listaPlacas(comAdicionar) {
    const vs = (App.dados.veiculos || []).slice().sort((a, b) => String(a.placa).localeCompare(String(b.placa)));
    const raiz = h('div', { class: 'placas' }, vs.map(v => placaEl(v.placa, { contagem: this.pendencias(v.placa), aoClicar: () => this.abrirVeiculo(v.placa) })));
    if (comAdicionar && ['master', 'admin'].indexOf(App.sessao.perfil) >= 0) raiz.append(h('button', { class: 'placa-add', type: 'button', onclick: () => this.novoVeiculo() }, '+ Adicionar veículo'));
    if (!vs.length && !comAdicionar) raiz.append(h('div', { class: 'empty', text: 'Nenhum veículo cadastrado.' }));
    return raiz;
  },
  render() { return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Frota' }), this.listaPlacas(true))); },

  novoVeiculo() {
    const p = h('input', { type: 'text', maxlength: '8', autocapitalize: 'characters', placeholder: 'ABC1D23' }), m = h('div', { class: 'msg' });
    const b = h('button', { class: 'btn', type: 'submit', text: 'Adicionar' });
    const f = h('form', { onsubmit: async e => { e.preventDefault(); b.disabled = true;
      try { await API.chamar('addVeiculo', { placa: p.value }); mod.fechar(); toast('Veículo adicionado.'); App.recarregar(); } catch (err) { mensagem(m, err.message); } b.disabled = false; } },
      campo('Placa completa', p), m, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Cancelar', onclick: () => mod.fechar() }), b));
    const mod = abrirModal('Novo veículo', f, { centro: true });
  },

  abrirVeiculo(placa) {
    const v = (App.dados.veiculos || []).find(x => x.placa === placa); if (!v) return;
    const corpo = h('div'), abas = h('div', { class: 'tabs-in' }), area = h('div');
    const mostrar = nome => { this._painel = { placa, area, nome, mostrar }; $$('button', abas).forEach(b => b.classList.toggle('active', b.dataset.t === nome)); limpar(area).append(nome === 'dados' ? this.painelDados(v) : this.painelFleet(v)); };
    ['dados', 'fleet'].forEach(n => abas.append(h('button', { dataset: { t: n }, type: 'button', onclick: () => mostrar(n) }, n === 'dados' ? 'Dados' : 'Fleet')));
    corpo.append(h('div', { class: 'veiculo-head' }, placaEl(v.placa), h('div', {}, h('b', { text: v.modelo || 'Veículo' }), h('div', { class: 'hint', text: (v.ano ? 'Ano ' + v.ano + ' · ' : '') + fmtKm(v.kmAtual) }))), abas, area);
    mostrar('dados'); abrirModal('', corpo, { largo: true });
  },

  painelDados(v) {
    const d = App.dados, ms = (d.manutencoes || []).filter(m => m.placa === v.placa).sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const al = (d.alertas || []).filter(a => a.placa === v.placa && a.status !== 'resolvido');
    const raiz = h('div');
    raiz.append(h('dl', { class: 'dl' }, h('dt', { text: 'KM atual' }), h('dd', { text: fmtKm(v.kmAtual) }), h('dt', { text: 'Diesel' }), h('dd', { text: v.tipoDiesel || '—' }), h('dt', { text: 'Arla' }), h('dd', { text: v.utilizaArla || '—' }),
      h('dt', { text: 'Alertas abertos' }), h('dd', { text: al.length ? al.map(a => a.tipo).join(', ') : 'Nenhum' })));
    raiz.append(h('h2', { style: 'margin-top:20px;font-size:15px', text: 'Manutenções' }));
    raiz.append(this.formManutencao(v));
    raiz.append(ms.length ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Data', 'Serviço', 'KM', 'Valor', 'Quem'].map(t => h('th', { text: t })))),
      h('tbody', {}, ms.slice(0, 60).map(m => h('tr', {}, h('td', { text: fmtData(m.data) }), h('td', { text: m.tipo }), h('td', { text: fmtNum(m.km) }), h('td', { text: 'R$ ' + Number(m.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }), h('td', { text: m.nome || '' })))))) : h('div', { class: 'empty', text: 'Nenhuma manutenção registrada.' }));
    return raiz;
  },
  formManutencao(v) {
    const tipo = h('input', { type: 'text', maxlength: '60', placeholder: 'Ex.: Troca de óleo' }), km = h('input', { type: 'text', inputmode: 'decimal', value: String(Math.round(Number(v.kmAtual) || 0)) });
    const data = h('input', { type: 'date', value: hojeISO() }), valor = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0,00' }), obs = h('input', { type: 'text', maxlength: '200' });
    const m = h('div', { class: 'msg' }), b = h('button', { class: 'btn small', type: 'submit', text: 'Registrar' });
    const f = h('form', { class: 'card', style: 'background:#f9fafb', onsubmit: async e => { e.preventDefault(); b.disabled = true;
      try { await API.chamar('addManutencao', { id: novoId('man'), placa: v.placa, tipo: tipo.value.trim(), km: km.value, data: data.value, valor: valor.value, observacao: obs.value });
        toast('Manutenção registrada.'); await App.recarregar(); this.atualizarPainel(); } catch (err) { mensagem(m, err.message); } b.disabled = false; } },
      h('div', { class: 'row' }, campo('Serviço', tipo), campo('KM', km), campo('Data', data), campo('Valor (R$)', valor)), campo('Observação', obs), m, b);
    return f;
  },
  atualizarPainel() { const p = this._painel; if (p && p.area.isConnected) p.mostrar(p.nome); },
  painelFleet() {
    return h('div', { class: 'soon' }, h('b', { text: 'Informações do Fleet' }), 'Tacógrafo, motorista atual, checklists e ocorrências relatadas entram nas Fases 3 e 4.');
  },

  renderAlertas() {
    const al = (App.dados.alertas || []).filter(a => a.status !== 'resolvido');
    const raiz = h('div', { class: 'card' }, h('h2', { text: 'Alertas' }));
    if (!al.length) { raiz.append(h('div', { class: 'empty', text: 'Nenhum alerta aberto. 🎉' })); return raiz; }
    raiz.append(h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Veículo', 'Alerta', 'Status', ''].map(t => h('th', { text: t })))),
      h('tbody', {}, al.map(a => h('tr', {}, h('td', {}, placaEl(a.placa, { aoClicar: () => this.abrirVeiculo(a.placa) })), h('td', { text: a.tipo }), h('td', {}, h('span', { class: 'badge amber', text: a.status })),
        h('td', {}, h('button', { class: 'btn small success', text: 'Resolver', onclick: async () => {
          try { await API.chamar('updateAlerta', { id: a.id, status: 'resolvido', dataAnalise: a.dataAnalise || '', dataResolucao: hojeISO() }); toast('Alerta resolvido.'); App.recarregar(); } catch (err) { toast(err.message, true); } } }))))))));
    return raiz;
  }
};
