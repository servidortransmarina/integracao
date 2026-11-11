const Inicio = {
  render() {
    const d = App.dados, S = App.sessao, raiz = h('div');
    if (!d) return raiz.append(h('div', { class: 'empty', text: 'Carregando…' })), raiz;
    raiz.append(h('div', { class: 'card' }, h('h2', { text: 'Olá, ' + S.nome.split(' ')[0] + '!' }), h('span', { class: 'badge gray', text: NOME_PERFIL[S.perfil] })));
    const feed = d.notificacoes || [];
    if (feed.length) raiz.append(h('div', { class: 'feed' }, feed.map(n => h('div', { class: 'feed-item' }, h('b', { text: n.titulo }), h('span', { text: n.texto })))));
    if (S.perfil === 'motorista') {
      raiz.append(h('div', { class: 'card' }, h('h2', { text: 'Meu caminhão' }),
        (d.veiculos || []).length ? h('div', { class: 'placas' }, d.veiculos.map(v => placaEl(v.placa))) : h('div', { class: 'empty', text: 'Nenhum caminhão vinculado ainda. Faça um checklist para registrar o caminhão de hoje.' })));
      return raiz;
    }
    const abertos = (d.alertas || []).filter(a => a.status !== 'resolvido');
    raiz.append(h('div', { class: 'grid-cards' },
      kpi('Veículos', (d.veiculos || []).length), kpi('Alertas abertos', abertos.length), kpi('Manutenções', (d.manutencoes || []).length)));
    raiz.append(h('div', { class: 'card' }, h('h2', { text: 'Veículos' }), Frota.listaPlacas()));
    return raiz;
  }
};
function kpi(label, valor) { return h('div', { class: 'kpi' }, h('div', { class: 'label', text: label }), h('div', { class: 'value', text: fmtNum(valor) })); }
