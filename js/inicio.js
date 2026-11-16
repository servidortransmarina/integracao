/* Painel Transmarina: o que precisa de atenção, de todos os sistemas. Um cartão por sistema, que recolhe; clicar numa linha abre o assunto. */
const Inicio = {
  filtro: 'tudo',
  chaveRecolhidos() { return 'trm.painel.' + App.sessao.usuario; },
  recolhidos() { try { return JSON.parse(localStorage.getItem(this.chaveRecolhidos()) || '{}'); } catch (e) { return {}; } },
  alternar(k, aberto) { const r = this.recolhidos(); if (aberto) delete r[k]; else r[k] = 1; try { localStorage.setItem(this.chaveRecolhidos(), JSON.stringify(r)); } catch (e) {} },

  /* ---- ocultar / adiar (guardado neste aparelho, por usuário) ---- */
  chaveOcultos() { return 'trm.ocultos.' + App.sessao.usuario; },
  ocultos() { try { return JSON.parse(localStorage.getItem(this.chaveOcultos()) || '{}'); } catch (e) { return {}; } },
  salvarOcultos(o) { try { localStorage.setItem(this.chaveOcultos(), JSON.stringify(o)); } catch (e) {} },
  /** dias = número (adiar) ou 0 (ocultar até o assunto mudar) */
  ocultar(it, dias) { const o = this.ocultos(); o[it.k] = { ate: dias ? Date.now() + dias * 864e5 : 0, sig: it.t }; this.salvarOcultos(o); App.abrirAba('inicio'); },
  mostrar(it) { const o = this.ocultos(); delete o[it.k]; this.salvarOcultos(o); App.abrirAba('inicio'); },
  estaOculto(it) { const e = it.k && this.ocultos()[it.k]; if (!e) return false; if (e.ate) return e.ate > Date.now(); return e.sig === it.t; },
  menuOcultar(it, ancora) {
    const antigo = $('#ocultarPop'); if (antigo) antigo.remove();
    const pop = h('div', { class: 'pop', id: 'ocultarPop' }, h('div', { class: 'nome' }, 'Silenciar este aviso'), h('hr'),
      ...[[1, 'Por 1 dia'], [3, 'Por 3 dias'], [7, 'Por 7 dias'], [30, 'Por 30 dias'], [0, 'Até mudar a situação']].map(([d, t]) => h('button', { onclick: e => { e.stopPropagation(); pop.remove(); this.ocultar(it, d); } }, t)));
    document.body.append(pop);
    const r = ancora.getBoundingClientRect(), w = pop.offsetWidth, hh = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    pop.style.top = (r.bottom + hh + 12 > window.innerHeight ? Math.max(8, r.top - hh - 6) : r.bottom + 6) + 'px';
  },

  itens() {
    const S = App.sessao, d = App.dados || {}, lista = [];
    const add = (o) => lista.push(o);
    if (S.perfil === 'master' && Usuarios.pendentes) add({ nivel: 'bad', sis: 'portal', ic: '👤', t: Usuarios.pendentes + (Usuarios.pendentes > 1 ? ' usuários aguardando acesso' : ' usuário aguardando acesso'), k: 'pt:usuarios', p: 'Cadastros novos esperam a sua aprovação.', origem: 'Portal', acao: () => Usuarios.abrir(), ordem: 0, k: 'usuarios' });
    if (S.perfil === 'master' && d.pendenciasPlaca) add({ nivel: 'bad', sis: 'frota', ic: '🧾', t: d.pendenciasPlaca + (d.pendenciasPlaca > 1 ? ' cupons com placa não identificada' : ' cupom com placa não identificada'), k: 'pt:cupons', p: 'O posto leu uma placa que não existe na frota. Escolha a certa.', origem: 'Manutenção', acao: () => Pendencias.abrir(), ordem: 0, k: 'pendplaca' });
    if (S.perfil === 'master' && (d.problemas || []).length) { const ps = d.problemas, u = ps[ps.length - 1]; add({ nivel: 'warn', sis: 'portal', ic: '🐞', t: ps.length + (ps.length > 1 ? ' problemas relatados' : ' problema relatado'), p: nomeBonito(u.nome) + ': ' + String(u.descricao).slice(0, 100), origem: 'Relatos', quando: u.criadoEm, acao: () => Ajuda.problemas(), k: 'pr:problemas', ordem: 3 }); }
    if (['master', 'admin'].indexOf(S.perfil) >= 0) (d.resgates || []).filter(r => String(r.status).toUpperCase() === 'PENDENTE').forEach(r => { const m = (d.motoristas || []).find(x => String(x.id) === String(r.motoristaId)); add({ nivel: 'warn', sis: 'fleet', ic: '🎁', origem: 'Fleet', ordem: 2, k: 'rg:' + r.id, t: nomeBonito(m ? m.nome : 'Motorista') + ' quer resgatar uma folga', p: r.pontos + ' pontos — aguardando a sua decisão.', quando: r.dataHora, acao: () => Pontos.decidir(r) }); });
    if (S.pontoPerfil) { PontoPainel.garantir(); if (PontoPainel.item) add(Object.assign({}, PontoPainel.item)); }
    (d.notificacoes || []).forEach(n => add({ nivel: 'info', sis: 'portal', ic: '🔔', t: n.titulo, p: n.texto, origem: 'Aviso', quando: n.criadoEm, ordem: 5, k: 'nt:' + (n.id || n.titulo) }));
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
        const base = { sis: 'frota', origem: 'Manutenção', quando: x.ts, acao: () => irParaAlertas(x.placa), k: 'al:' + x.g + ':' + x.placa };
        if (x.g === 'atrasado') add(Object.assign(base, { nivel: 'bad', ic: '🔧', t: x.placa + ': ' + n + (n > 1 ? ' serviços vencidos' : ' serviço vencido'), p: lista + '.', ordem: 1 }));
        else if (x.g === 'andamento') add(Object.assign(base, { nivel: 'info', ic: '🛠️', t: x.placa + ': ' + n + ' em andamento', p: lista + '.', ordem: 8, acompanhar: true }));
        else add(Object.assign(base, { nivel: 'warn', ic: '📅', t: x.placa + ': ' + n + (n > 1 ? ' serviços agendados' : ' serviço agendado'), p: lista + '.', ordem: 7, acompanhar: true }));
      });
      db.agendamentos.forEach(ag => {
        const temAlerta = db.alertas.some(a => a.placa === ag.placa && a.status !== 'resolvido' && normPeca(a.tipo) === normPeca(ag.tipo === 'outro' ? (ag.descricao || 'outro') : ag.tipo));
        if (temAlerta) return;
        const atras = ag.dataPrevista && ag.dataPrevista < hoje, nome = ag.tipo === 'outro' ? (ag.descricao || 'Serviço') : nomeTipo(ag.tipo);
        add({ sis: 'frota', origem: 'Manutenção', nivel: atras ? 'bad' : 'warn', ic: atras ? '⏰' : '📅', t: nome + ': ' + ag.placa, p: 'Agendado para ' + fmtData(ag.dataPrevista) + (atras ? ' — atrasado.' : '.'), acao: () => irParaVeiculo(ag.placa), ordem: atras ? 2 : 9, acompanhar: !atras, k: 'ag:' + (ag.id || ag.placa + ag.tipo + ag.dataPrevista) });
      });
    }
    return lista.sort((a, b) => a.ordem - b.ordem);
  },

  quando(ts) { if (!ts) return ''; const t = typeof ts === 'number' ? ts : Date.parse(ts); if (!t || t < 1.5e12 || t > Date.now() + 864e5) return ''; const m = Math.floor((Date.now() - t) / 60000);
    return m < 2 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.floor(m / 60) + ' h' : 'há ' + Math.floor(m / 1440) + ' d'; },

  linha(it) {
    const el = h('div', { class: 'item' + (it.acao ? ' click' : ''), role: it.acao ? 'button' : null, tabindex: it.acao ? '0' : null },
      h('div', { class: 'ico ' + it.nivel, text: it.ic }),
      h('div', { class: 'tx' }, h('b', { text: it.t }), h('p', { text: it.p }), h('small', { text: it.origem + (this.quando(it.quando) ? ' · ' + this.quando(it.quando) : '') })),
      it.k ? (it.oculto
        ? h('button', { class: 'btn small secondary', type: 'button', text: 'Voltar a mostrar', onclick: e => { e.stopPropagation(); this.mostrar(it); } })
        : h('button', { class: 'item-ocultar', type: 'button', title: 'Silenciar este aviso', 'aria-label': 'Silenciar este aviso', text: '🔕 Silenciar', onclick: e => { e.stopPropagation(); this.menuOcultar(it, e.currentTarget); } })) : null,
      it.acao ? h('span', { class: 'seta', text: '›' }) : null);
    if (it.acao) { el.onclick = it.acao; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.acao(); } }; }
    return el;
  },

  /** Cartão de um sistema, recolhível. */
  cartao(chave, ic, nome, itens) {
    const rec = this.recolhidos(), aberto = !rec[chave];
    const corpo = h('div', { class: 'grupo-corpo', hidden: aberto ? null : true }, ...itens.map(i => this.linha(i)));
    const seta = h('span', { class: 'chev', text: aberto ? '▾' : '▸' });
    const cab = h('button', { class: 'grupo-cab', type: 'button', 'aria-expanded': aberto ? 'true' : 'false' }, h('span', { class: 'gt', text: ic + '  ' + nome }), h('span', { class: 'cnt', text: String(itens.length) }), seta);
    cab.onclick = () => { const a = corpo.hidden; corpo.hidden = !a; seta.textContent = a ? '▾' : '▸'; cab.setAttribute('aria-expanded', a ? 'true' : 'false'); this.alternar(chave, a); };
    return h('div', { class: 'grupo' }, cab, corpo);
  },
  coluna(titulo, chavePrefixo, itens, vazio) {
    const SIS = { frota: ['🔧', 'Manutenção'], fleet: ['🚛', 'Fleet'], ponto: ['🕒', 'Ponto'], portal: ['🏠', 'Geral (cadastros, cupons e avisos)'] }, col = h('div', { class: 'col' }, h('div', { class: 'sec-t', text: titulo }));
    const ordem = Object.keys(SIS).filter(k => itens.some(i => i.sis === k));
    if (!ordem.length) col.append(h('div', { class: 'vazio-ok', text: vazio }));
    ordem.forEach(k => col.append(this.cartao(chavePrefixo + k, SIS[k][0], SIS[k][1], itens.filter(i => i.sis === k))));
    return col;
  },

  render() {
    const r = this.renderBase();
    r.insertBefore(h('div', { class: 'rel-prob-linha' }, h('button', { class: 'btn small secondary', type: 'button', text: '🐞 Relatar problema', onclick: () => Ajuda.relatar() })), r.firstChild);
    return r;
  },
  renderBase() {
    const S = App.sessao, raiz = h('div'), hora = new Date().getHours();
    const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    if (S.perfil === 'motorista') return this.renderMotorista(raiz, saud);
    const brutos = this.itens(), ocultosLista = brutos.filter(i => this.estaOculto(i)).map(i => Object.assign(i, { oculto: true }));
    const todos = brutos.filter(i => !this.estaOculto(i)), vis = this.filtro === 'ocultos' ? ocultosLista : todos.filter(i => this.filtro === 'tudo' || i.sis === this.filtro);
    const precisa = vis.filter(i => !i.acompanhar), acomp = vis.filter(i => i.acompanhar), n = todos.filter(i => !i.acompanhar).length;
    raiz.append(h('div', { class: 'saudacao' }, h('h2', { text: saud + ', ' + primeiroNome(S.nome) }), h('p', { text: n ? n + (n > 1 ? ' itens precisam de você' : ' item precisa de você') : 'Tudo em dia por aqui.' }), h('button', { class: 'btn secondary small sau-atualizar', type: 'button', text: '🔄 Atualizar', onclick: () => atualizarManualmente() })));
    const chips = h('div', { class: 'chips' });
    [['tudo', 'Tudo']].concat((S.sistemas || []).indexOf('manutencao') >= 0 ? [['frota', 'Manutenção']] : []).concat((S.sistemas || []).indexOf('fleet') >= 0 && ['master', 'admin'].indexOf(S.perfil) >= 0 ? [['fleet', 'Fleet']] : []).concat(S.pontoPerfil ? [['ponto', 'Ponto']] : []).concat(S.perfil === 'master' ? [['portal', 'Geral']] : []).concat([['ocultos', 'Silenciados' + (ocultosLista.length ? ' (' + ocultosLista.length + ')' : '')]]).forEach(([id, nome]) => chips.append(h('button', { class: 'chip' + (this.filtro === id ? ' active' : ''), type: 'button', text: nome, onclick: () => { this.filtro = id; App.abrirAba('inicio'); } })));
    raiz.append(chips, h('div', { class: 'painel-cols' }, this.coluna('Precisa de você', 'p:', precisa, 'Nada pendente. ✅'), this.coluna('Para acompanhar', 'a:', acomp, 'Nada em andamento.'), this.podio()));
    return raiz;
  },

  /** Top 3 do mês, em pódio. */
  podio() {
    const top = (App.dados && App.dados.podio) || [], col = h('div', { class: 'col col-podio' }, h('div', { class: 'sec-t', text: 'Top 3 do mês' }));
    if (!top.length) { col.append(h('div', { class: 'grupo' }, h('div', { class: 'vazio-ok', text: 'Ainda sem pontos neste mês. 🏁' }))); return col; }
    const ordem = [top[1], top[0], top[2]], pos = [2, 1, 3], alt = { 1: 120, 2: 88, 3: 66 }, medalha = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const palco = h('div', { class: 'podio' });
    ordem.forEach((x, i) => { if (!x) return; const p = pos[i];
      palco.append(h('div', { class: 'degrau p' + p }, h('div', { class: 'medalha', text: medalha[p] }), x.avatar ? h('span', { class: 'avatar mot-av' }, avatarNo(x.avatar)) : null, h('b', { text: nomeBonito(x.nome).split(' ')[0] }), h('small', { text: x.pontos.toLocaleString('pt-BR') + ' pts' }), h('div', { class: 'bloco', style: 'height:' + alt[p] + 'px', text: String(p) }))); });
    col.append(h('div', { class: 'grupo podio-card' }, palco, h('ol', { class: 'podio-lista' }, top.map((x, i) => h('li', {}, h('span', { text: (i + 1) + 'º ' + nomeBonito(x.nome) }), h('b', { text: x.pontos.toLocaleString('pt-BR') }))))));
    return col;
  },

  renderMotorista(raiz, saud) {
    const S = App.sessao, d = App.dados;
    raiz.append(h('div', { class: 'saudacao' }, h('h2', { text: saud + ', ' + primeiroNome(S.nome) }), h('p', { text: 'Seu caminhão e seus avisos.' })), h('button', { class: 'pt-card', type: 'button', onclick: () => Pontos.abrirMotorista() }, h('span', { text: '⭐' }), h('b', { text: Pontos.saldo() + ' pontos' }), h('small', { text: Pontos.saldo() >= Pontos.custo() ? 'Você já pode resgatar uma folga!' : 'Toque para ver o histórico e resgatar folgas' })));
    (d.notificacoes || []).forEach(n => raiz.append(this.linha({ nivel: 'info', ic: '🔔', t: n.titulo, p: n.texto, origem: 'Aviso', quando: n.criadoEm })));
    raiz.append(Motorista.cartaoHoje());
    return raiz;
  }
};
/** Placa do GF como elemento DOM (usada fora das telas do GF). */
function placaHtmlEl(placa) {
  const p = String(placa || '').toUpperCase(), mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p);
  return h('div', { class: 'placa-veiculo ' + (mercosul ? 'mercosul' : 'antiga'), style: 'cursor:default' }, h('div', { class: 'placa-topo', text: mercosul ? 'BRASIL' : 'TRANSMARINA' }), h('div', { class: 'placa-numero', text: p }));
}

/** Abre a aba Alertas já filtrada pela placa. */
function irParaAlertas(placa) {
  App.abrirAba('alertas');
  const f = document.getElementById('filtroPlacaAlerta'); if (f) { f.value = placa; renderAlertas(); }
}
