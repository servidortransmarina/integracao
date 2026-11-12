/* Início: tudo o que precisa de atenção, de todos os sistemas, numa lista só. */
const Inicio = {
  filtro: 'tudo',

  itens() {
    const S = App.sessao, d = App.dados, lista = [];
    const add = (o) => lista.push(o);
    if (S.perfil === 'master' && Usuarios.pendentes) add({ nivel: 'bad', sis: 'portal', ic: '👤', t: Usuarios.pendentes + (Usuarios.pendentes > 1 ? ' usuários aguardando acesso' : ' usuário aguardando acesso'), p: 'Cadastros novos esperam a sua aprovação.', origem: 'Portal', btn: 'Definir acesso', acao: () => Usuarios.abrir(), ordem: 0 });
    (d.notificacoes || []).forEach(n => add({ nivel: 'info', sis: 'portal', ic: '🔔', t: n.titulo, p: n.texto, origem: 'Aviso', quando: n.criadoEm, ordem: 5 }));
    if (S.perfil !== 'motorista') {
      const hoje = hojeLocal();
      // Alertas agrupados por caminhão e situação (um caminhão com 6 serviços vencidos vira uma linha só)
      const grupos = {};
      db.alertas.filter(a => a.status !== 'resolvido' && a.tipo !== 'Registro de KM').forEach(a => {
        const g = grupoAlerta(a), k = g + '|' + a.placa; (grupos[k] = grupos[k] || { g, placa: a.placa, nomes: [], ts: 0 });
        grupos[k].nomes.push(nomeTipo(a.tipo)); grupos[k].ts = Math.max(grupos[k].ts, dataCriacaoAlertaTs(a));
      });
      Object.keys(grupos).forEach(k => {
        const x = grupos[k], n = x.nomes.length, lista = x.nomes.slice(0, 3).join(', ') + (n > 3 ? ' e mais ' + (n - 3) : '');
        const base = { sis: 'frota', origem: 'Frota', quando: x.ts, btn: 'Abrir', acao: () => App.abrirAba('alertas') };
        if (x.g === 'atrasado') add(Object.assign(base, { nivel: 'bad', ic: '🔧', t: x.placa + ': ' + n + (n > 1 ? ' serviços vencidos' : ' serviço vencido'), p: lista + '.', ordem: 1 }));
        else if (x.g === 'andamento') add(Object.assign(base, { nivel: 'info', ic: '🛠️', t: x.placa + ': ' + n + ' em andamento', p: lista + '.', ordem: 8, acompanhar: true }));
        else add(Object.assign(base, { nivel: 'warn', ic: '📅', t: x.placa + ': ' + n + (n > 1 ? ' serviços agendados' : ' serviço agendado'), p: lista + '.', ordem: 7, acompanhar: true }));
      });
      db.agendamentos.forEach(ag => {
        const temAlerta = db.alertas.some(a => a.placa === ag.placa && a.status !== 'resolvido' && normPeca(a.tipo) === normPeca(ag.tipo === 'outro' ? (ag.descricao || 'outro') : ag.tipo));
        if (temAlerta) return;
        const atras = ag.dataPrevista && ag.dataPrevista < hoje, nome = ag.tipo === 'outro' ? (ag.descricao || 'Serviço') : nomeTipo(ag.tipo);
        add({ sis: 'frota', origem: 'Frota', nivel: atras ? 'bad' : 'warn', ic: atras ? '⏰' : '📅', t: nome + ': ' + ag.placa, p: 'Agendado para ' + fmtData(ag.dataPrevista) + (atras ? ' — atrasado.' : '.'), btn: 'Ver veículo', acao: () => irParaVeiculo(ag.placa), ordem: atras ? 2 : 9, acompanhar: !atras });
      });
    }
    return lista.sort((a, b) => a.ordem - b.ordem);
  },

  quando(ts) { if (!ts) return ''; const t = typeof ts === 'number' ? ts : Date.parse(ts); if (!t || t < 1.5e12 || t > Date.now() + 864e5) return ''; const m = Math.floor((Date.now() - t) / 60000);
    return m < 2 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.floor(m / 60) + ' h' : 'há ' + Math.floor(m / 1440) + ' d'; },

  linha(it) {
    return h('div', { class: 'item' }, h('div', { class: 'ico ' + it.nivel, text: it.ic }),
      h('div', { class: 'tx' }, h('b', { text: it.t }), h('p', { text: it.p }), h('small', { text: it.origem + (this.quando(it.quando) ? ' · ' + this.quando(it.quando) : '') })),
      it.btn ? h('button', { class: 'btn secondary small', type: 'button', text: it.btn, onclick: it.acao }) : null);
  },

  render() {
    const S = App.sessao, d = App.dados, raiz = h('div'), hora = new Date().getHours();
    const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    if (S.perfil === 'motorista') return this.renderMotorista(raiz, saud);
    const todos = this.itens(), vis = todos.filter(i => this.filtro === 'tudo' || i.sis === this.filtro);
    const precisa = vis.filter(i => !i.acompanhar), acomp = vis.filter(i => i.acompanhar), n = todos.filter(i => !i.acompanhar).length;
    raiz.append(h('div', { class: 'saudacao' }, h('h2', { text: saud + ', ' + S.nome.split(' ')[0] }), h('p', { text: n ? n + (n > 1 ? ' itens precisam de você' : ' item precisa de você') : 'Tudo em dia por aqui.' })));
    const chips = h('div', { class: 'chips' });
    [['tudo', 'Tudo'], ['frota', 'Frota']].concat(S.perfil === 'master' ? [['portal', 'Portal']] : []).forEach(([id, nome]) => chips.append(h('button', { class: 'chip' + (this.filtro === id ? ' active' : ''), type: 'button', text: nome, onclick: () => { this.filtro = id; App.abrirAba('inicio'); } })));
    raiz.append(chips);
    raiz.append(h('div', { class: 'sec-t', text: 'Precisa de você' }), ...(precisa.length ? precisa.map(i => this.linha(i)) : [h('div', { class: 'vazio-ok', text: 'Nada pendente. ✅' })]));
    if (acomp.length) raiz.append(h('div', { class: 'sec-t', text: 'Para acompanhar' }), ...acomp.map(i => this.linha(i)));
    return raiz;
  },

  renderMotorista(raiz, saud) {
    const S = App.sessao, d = App.dados;
    raiz.append(h('div', { class: 'saudacao' }, h('h2', { text: saud + ', ' + S.nome.split(' ')[0] }), h('p', { text: 'Seu caminhão e seus avisos.' })));
    (d.notificacoes || []).forEach(n => raiz.append(this.linha({ nivel: 'info', ic: '🔔', t: n.titulo, p: n.texto, origem: 'Aviso', quando: n.criadoEm })));
    raiz.append(h('div', { class: 'card' }, h('h2', { text: 'Meu caminhão' }), (d.veiculos || []).length
      ? h('div', { class: 'placas', style: 'display:flex;flex-wrap:wrap;gap:16px' }, d.veiculos.map(v => placaHtmlEl(v.placa)))
      : h('div', { class: 'empty', text: 'Nenhum caminhão vinculado ainda. Faça um checklist para registrar o caminhão de hoje.' })));
    return raiz;
  }
};
/** Placa do GF como elemento DOM (usada fora das telas do GF). */
function placaHtmlEl(placa) {
  const p = String(placa || '').toUpperCase(), mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p);
  return h('div', { class: 'placa-veiculo ' + (mercosul ? 'mercosul' : 'antiga'), style: 'cursor:default' }, h('div', { class: 'placa-topo', text: mercosul ? 'BRASIL' : 'TRANSMARINA' }), h('div', { class: 'placa-numero', text: p }));
}
