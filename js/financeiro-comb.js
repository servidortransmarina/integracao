/* Financeiro › Combustível: lançamento das faturas do posto (uma por segunda-feira), já com o desconto.
   Agregados: o total do pagamento é descontado do agregado. Frota própria: comparamos com a fatura que o robô leu (sem desconto). */
const Comb = {
  d: null, pagId: null, fatId: null, posto: null, raiz: null, tipo: 'lanc', todos: false, recentes: [], etq: { fat: '', posto: '' }, busca: '', grupoCad: '',

  // ---------- dados ----------
  mut: 0,
  carregar(id, vez) {
    const m0 = this.mut;      // se algo for lançado/apagado enquanto a leitura corre, ela pode estar velha: lê de novo
    return API.chamar('combCarregar', id ? { pagamentoId: id } : (this.pagId ? { pagamentoId: this.pagId } : {}), { mudo: !!this.d }).then(r => {
      if (this.mut !== m0 && (vez || 0) < 3) return this.carregar(id, (vez || 0) + 1);
      // lançamentos que ainda estão indo para o servidor continuam na tela
      const pend = this.d && this.d.lancamentos ? this.d.lancamentos.filter(l => l.salvando && r.pagamento && l.pagamentoId === r.pagamento.id) : []; if (pend.length) r.lancamentos = r.lancamentos.concat(pend);
      this.d = r; this.t = Date.now(); if (typeof Financeiro !== 'undefined') Financeiro.resumoCombCache = null; this.pagId = r.pagamento ? r.pagamento.id : null;
      if (!r.faturas.some(f => f.id === this.fatId)) this.fatId = r.faturas.length ? r.faturas[r.faturas.length - 1].id : null;
      if (!this.posto || r.postos.indexOf(this.posto) < 0) this.posto = r.postos[0] || null;
      return r;
    });
  },
  reiniciar() { this.d = null; this.pagId = null; this.fatId = null; this.recentes = []; },
  get aberto() { return !!(this.d && this.d.pagamento && this.d.pagamento.status === 'ABERTO') && !(App.sessao && App.sessao.chefe); },
  placaK: p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
  dt: iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—',
  dm: iso => iso ? String(iso).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '',
  r2: v => Math.round((Number(v) || 0) * 100) / 100,
  valorBR(s) { s = String(s || '').replace(/[R$\s]/g, ''); if (!s) return NaN; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return Number(s); },
  nomeFat(f) { return f.rotulo || ('Fatura ' + this.dm(f.data)); },
  periodo(f) { return f.de && f.ate ? this.dm(f.de) + ' a ' + this.dm(f.ate) : 'sem período'; },
  lancs(fid) { return this.d.lancamentos.filter(l => !fid || l.faturaId === fid); },
  soma(ls, g, posto) { return this.r2(ls.filter(l => (!g || l.grupo === g) && (!posto || l.posto === posto)).reduce((t, l) => t + Number(l.valor || 0), 0)); },
  /** Linhas por motorista/placa (cadastro), com o valor de cada posto. */
  linhas(ls, grupo) {
    const m = {};
    this.d.cadastro.filter(c => c.grupo === grupo).forEach(c => { m[c.id] = { c, postos: {}, total: 0, ls: [] }; });
    ls.filter(l => l.grupo === grupo).forEach(l => {
      const x = m[l.cadastroId] || (m[l.cadastroId] = { c: { id: l.cadastroId, nome: l.nome, placa: l.placa, grupo }, postos: {}, total: 0, ls: [] });
      x.postos[l.posto] = this.r2((x.postos[l.posto] || 0) + Number(l.valor)); x.total = this.r2(x.total + Number(l.valor)); x.ls.push(l);
    });
    return Object.values(m);
  },
  /** Robô × lançado, só nas faturas em que o robô leu aquela placa (fatura sem período não entra na conta). */
  comparar(x, fids) { let robo = 0, comp = 0; fids.forEach(f => { const r = this.roboDe([f], x.c.placa); if (r) { robo += r; comp += x.ls.filter(l => l.faturaId === f).reduce((t, l) => t + Number(l.valor), 0); } }); return { robo: this.r2(robo), comp: this.r2(comp) }; },
  roboDe(fids, placa) { const k = this.placaK(placa); return this.r2(fids.reduce((t, f) => t + Number(((this.d.robo || {})[f] || {})[k] || 0), 0)); },

  // ---------- telas ----------
  tela(tipo) {
    if (this.tipo !== tipo) this.foco = null;
    if (this.tipo !== tipo) this._lados = null;
    this.tipo = tipo; this.raiz = h('div', { class: 'cb cb-t-' + tipo, onfocusin: e => { if (e.target.id) { this.foco = e.target.id; this.focoT = Date.now(); } }, onkeydown: () => { this.focoT = Date.now(); } }, h('div', { class: 'cb-carr', text: 'Carregando combustível…' }));
    const velho = this.d && Date.now() - (this.t || 0) > 60000, raiz = this.raiz;
    // guarda a posição da barra deslizante das tabelas enquanto a pessoa rola: a tela pode ser redesenhada por trás
    raiz.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('cb-tab') && this.raiz === raiz) this._lados = $$('.cb-tab', raiz).map(x => x.scrollLeft); }, true);
    if (velho) setTimeout(() => this.carregar().then(() => { const a = document.activeElement; if (this.raiz === raiz && raiz.isConnected && !$('.overlay.show') && !(a && raiz.contains(a) && a.value)) this.render(); }).catch(() => {}), 50);
    // com os dados já em mãos desenha na hora: assim a tela nunca fica curta ("Carregando…") e a rolagem não pula para o topo
    if (this.d) { this.render(); return this.raiz; }
    this.carregar().then(() => this.render()).catch(e => { limpar(this.raiz).append(h('div', { class: 'card' }, h('b', { text: 'Não consegui abrir o Combustível.' }), h('p', { text: e.message || String(e) }), h('button', { class: 'btn', type: 'button', text: 'Tentar de novo', onclick: () => { this.d = null; App.abrirAba(App.aba); } }))); });
    return this.raiz;
  },
  /** Redesenha só quando a pessoa não está no meio de uma placa/valor (para não roubar o que ela digita). */
  renderSeLivre() {
    clearTimeout(this._tLivre);
    const a = document.activeElement, digitando = a && (a.id === 'cbPlaca' || a.id === 'cbValor') && a.value;
    if (digitando) { this._tLivre = setTimeout(() => this.renderSeLivre(), 400); return; }
    this.render();
  },
  render() {
    if (!this.raiz) return;
    const a0 = document.activeElement, foco = (a0 && a0 !== document.body && a0.id) || (Date.now() - (this.focoT || 0) < 4000 ? this.foco : null);
    // redesenhar não pode mexer na rolagem: guarda onde a tela estava e volta para lá
    const rolas = []; for (let el = this.raiz.parentElement; el; el = el.parentElement) if (el.scrollTop) rolas.push([el, el.scrollTop]);
    const lados = this._lados || $$('.cb-tab', this.raiz).map(e => e.scrollLeft);     // vale também quando a tela foi recriada (dados atualizados por trás)
    const wy = window.scrollY, alt = this.raiz.offsetHeight; this.raiz.style.minHeight = alt + 'px';
    limpar(this.raiz);
    requestAnimationFrame(() => { if (this.raiz) this.raiz.style.minHeight = ''; });
    if (this.tipo === 'cad') return this.raiz.append(this.telaCadastro());
    this.raiz.append(this.barraPagamento());
    if (!this.d.pagamento) { this.raiz.append(this.vazio()); return; }
    if (this.tipo === 'lanc') this.raiz.append(this.telaLanc());
    else if (this.tipo === 'rel') this.raiz.append(this.telaRel());
    else if (this.tipo === 'etq') this.raiz.append(this.telaEtq());
    if (foco) { const el = document.getElementById(foco); if (el) el.focus({ preventScroll: true }); }
    const voltarLados = () => $$('.cb-tab', this.raiz).forEach((e, i) => { if (lados[i] && e.scrollLeft !== lados[i]) e.scrollLeft = lados[i]; }); voltarLados(); requestAnimationFrame(voltarLados);
    rolas.forEach(([el, y]) => { el.scrollTop = y; }); if (window.scrollY !== wy) window.scrollTo(0, wy);
    const on = $('.cb-fat.on', this.raiz); if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) on.parentNode.scrollLeft = on.offsetLeft - on.parentNode.offsetLeft - 8;
  },
  vazio() {
    return h('div', { class: 'cb-vazio' }, h('h3', { text: 'Nenhum pagamento de combustível ainda' }),
      h('p', { text: 'Abra o pagamento (a data em que o posto é pago) e lance as faturas de cada segunda-feira. Se preferir, traga a planilha antiga em Cadastro › Importar planilha.' }),
      App.sessao.chefe ? null : h('div', { class: 'cb-acoes' }, h('button', { class: 'btn', type: 'button', text: 'Abrir pagamento', onclick: () => this.novoPagamento() }), h('button', { class: 'btn secondary', type: 'button', text: 'Importar planilha', onclick: () => App.abrirAba('fin-comb-cad') })));
  },
  barraPagamento() {
    const d = this.d, p = d.pagamento;
    const sel = h('select', { class: 'cb-sel', 'aria-label': 'Pagamento', onchange: e => this.carregar(e.target.value).then(() => this.render()) },
      d.pagamentos.map(x => h('option', { value: x.id, selected: p && x.id === p.id ? true : null, text: 'Pagamento ' + this.dt(x.data) + (x.status === 'FECHADO' ? ' · fechado' : '') })));
    const ls = p ? this.lancs() : [], tot = this.soma(ls), ag = this.soma(ls, 'AGREGADO'), fr = this.soma(ls, 'FROTA');
    let roboFrota = 0, lancComp = 0;     // só compara placas que o robô leu, fatura por fatura
    d.faturas.forEach(f => this.linhas(this.lancs(f.id), 'FROTA').forEach(x => { const r = x.total ? this.roboDe([f.id], x.c.placa) : 0; if (r) { roboFrota += r; lancComp += x.total; } }));
    roboFrota = this.r2(roboFrota); lancComp = this.r2(lancComp);
    const st = (rot, v, sub, cls) => h('div', { class: 'cb-st ' + (cls || '') }, h('small', { text: rot }), h('b', { text: v }), sub ? h('span', { text: sub }) : null);
    const acoes = App.sessao.chefe ? null : h('div', { class: 'cb-pag-acoes' },
      p && p.status === 'ABERTO' ? h('button', { class: 'btn secondary small', type: 'button', text: 'Fechar pagamento', onclick: () => this.statusPag('fechar') }) : null,
      p && p.status === 'FECHADO' ? h('button', { class: 'btn secondary small', type: 'button', text: 'Reabrir', onclick: () => this.statusPag('reabrir') }) : null,
      h('button', { class: 'btn small', type: 'button', text: 'Novo pagamento', onclick: () => this.novoPagamento() }));
    return h('div', { class: 'cb-topo' },
      h('div', { class: 'cb-pag' }, d.pagamentos.length ? sel : h('b', { text: 'Combustível' }), p ? h('span', { class: 'cb-status ' + (p.status === 'ABERTO' ? 'ab' : 'fe'), text: p.status === 'ABERTO' ? 'Aberto' : 'Fechado' }) : null, acoes),
      p ? h('div', { class: 'cb-sts' }, st('Total do pagamento', fmtMoeda(tot), d.faturas.length + (d.faturas.length === 1 ? ' fatura' : ' faturas')),
        st('Descontar dos agregados', fmtMoeda(ag), null, 'ag'),
        st('Frota própria', fmtMoeda(fr), roboFrota ? 'Economia de ' + fmtMoeda(this.r2(roboFrota - lancComp)) + ' nas placas que o robô leu (' + fmtMoeda(roboFrota) + ' sem desconto)' : null, 'fr')) : null);
  },
  chipsFaturas(comNova) {
    const d = this.d;
    return h('div', { class: 'cb-fats', role: 'tablist', 'aria-label': 'Faturas' },
      d.faturas.map(f => h('button', { type: 'button', role: 'tab', class: 'cb-fat' + (f.id === this.fatId ? ' on' : ''), 'aria-selected': f.id === this.fatId ? 'true' : 'false', onclick: () => { this.fatId = f.id; this.render(); } },
        h('b', { text: this.nomeFat(f) }), h('span', { text: this.periodo(f) }), h('em', { text: fmtMoeda(this.soma(this.lancs(f.id))) }))),
      comNova && this.aberto ? h('button', { type: 'button', class: 'cb-fat nova', onclick: () => this.editarFatura() }, h('b', { text: '+ Fatura' }), h('span', { text: 'chegou na segunda' })) : null);
  },

  // ---------- lançar ----------
  telaLanc() {
    const d = this.d, f = d.faturas.find(x => x.id === this.fatId);
    const box = h('div', { class: 'cb-lanc' }, this.chipsFaturas(true));
    if (this.ocupado) { box.append(h('div', { class: 'cb-vazio mini' }, h('p', { text: 'Salvando a fatura…' }))); return box; }
    if (!f) { box.append(h('div', { class: 'cb-vazio mini' }, h('p', { text: 'Crie a fatura que chegou do posto para começar a lançar.' }), this.aberto ? h('button', { class: 'btn', type: 'button', text: '+ Fatura da segunda', onclick: () => this.editarFatura() }) : null)); return box; }
    const refs = this.refsDe(f);
    const info = [f.data ? 'Chegou ' + this.dt(f.data) : '', refs.length ? 'comparando com ' + refs.length + (refs.length > 1 ? ' faturas lidas' : ' fatura lida') + ' pelo robô (' + refs.map(r => 'e-mail de ' + this.dm(r)).join(', ') + ')' : f.de && f.ate ? 'abastecimentos de ' + this.periodo(f) + ' (sem fatura do robô ligada)' : 'sem período (não compara com o robô)'].filter(Boolean).join(' · ');
    const cab = h('div', { class: 'cb-fat-cab' }, h('h3', { text: this.nomeFat(f) }), h('span', { class: 'hint', text: info }),
      this.aberto ? h('button', { class: 'btn-link', type: 'button', text: 'Editar fatura', onclick: () => this.editarFatura(f) }) : null);
    box.append(cab);
    if (this.aberto) box.append(this.formLanc(f));
    else if (d.pagamento.status === 'FECHADO') box.append(h('div', { class: 'cb-aviso', text: 'Pagamento fechado: os valores estão travados. Reabra para corrigir.' }));
    const grade = h('div', { class: 'cb-grade' }, this.tabela(this.lancs(f.id), 'AGREGADO', [f.id]), this.tabela(this.lancs(f.id), 'FROTA', [f.id]));
    // total de cada posto nesta fatura (agregados + frota própria), para bater com a fatura que o posto manda
    { const ls = this.lancs(f.id), item = p => h('div', { class: 'cb-bate-i' }, h('span', { text: p }), h('b', { text: fmtMoeda(this.soma(ls, null, p)) }),
        h('small', { text: 'agregados ' + fmtMoeda(this.soma(ls, 'AGREGADO', p)) + ' · frota ' + fmtMoeda(this.soma(ls, 'FROTA', p)) + ' · ' + ls.filter(l => l.posto === p).length + ' nota(s)' }));
      box.append(h('div', { class: 'cb-bate' }, h('div', { class: 'cb-bate-t', text: 'Total da fatura por posto' }), d.postos.map(item),
        h('div', { class: 'cb-bate-i tot' }, h('span', { text: 'Os dois postos' }), h('b', { text: fmtMoeda(this.soma(ls)) }), h('small', { text: ls.length + ' nota(s)' })))); }
    const vis = (v, t) => h('button', { type: 'button', role: 'radio', 'aria-checked': this.todos === v ? 'true' : 'false', class: this.todos === v ? 'on' : '', text: t, onclick: () => { this.todos = v; this.render(); } });
    box.append(h('div', { class: 'cb-ver' }, h('span', { text: 'Na tabela:' }), h('div', { class: 'cb-seg', role: 'radiogroup', 'aria-label': 'Quem aparece na tabela' }, vis(false, 'Só quem abasteceu'), vis(true, 'Todos os cadastrados'))), grade);
    return box;
  },
  formLanc(f) {
    const d = this.d, nome = h('div', { class: 'cb-quem', 'aria-live': 'polite' }), msg = h('div', { class: 'cb-msg', 'aria-live': 'polite' });
    const placa = h('input', { id: 'cbPlaca', class: 'cb-in placa', autocomplete: 'off', placeholder: 'Placa', 'aria-label': 'Placa' });
    // sugestões como nas cartas do Ponto, só pela placa (o nome aparece embaixo para conferir); Enter pega a primeira e vai para o valor
    const dl = sugestoes(placa, () => d.cadastro.filter(c => c.ativo !== 'NAO').map(c => ({ v: c.placa, d: c.nome + (c.grupo === 'FROTA' ? ' · frota própria' : ' · agregado') })), { enterPrimeiro: true });
    const valor = h('input', { id: 'cbValor', class: 'cb-in valor', inputmode: 'decimal', autocomplete: 'off', placeholder: '0,00', 'aria-label': 'Valor com desconto' });
    const achar = () => {
      const t = placa.value.trim(), k = this.placaK(t); if (!t) return null;
      const ativos = d.cadastro.filter(c => c.ativo !== 'NAO');      // só pela placa (o nome não entra na busca)
      return ativos.find(c => this.placaK(c.placa) === k) || (k.length >= 3 ? (x => x.length === 1 ? x[0] : null)(ativos.filter(c => this.placaK(c.placa).indexOf(k) >= 0)) : null);
    };
    const mostrar = () => { const c = achar(); nome.className = 'cb-quem' + (c ? ' ok' : placa.value.trim() ? ' nao' : ''); nome.textContent = c ? c.nome + ' · ' + c.placa + (c.grupo === 'FROTA' ? ' · frota própria' : ' · agregado') : placa.value.trim() ? 'Placa não cadastrada' : ''; return c; };
    placa.addEventListener('input', mostrar);
    placa.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (mostrar()) valor.focus(); } });
    const postos = h('div', { class: 'cb-postos', role: 'radiogroup', 'aria-label': 'Posto' }, d.postos.map((p, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': p === this.posto ? 'true' : 'false', class: 'cb-posto' + (p === this.posto ? ' on' : ''), title: 'Alt+' + (i + 1), onclick: () => { this.posto = p; $$('.cb-posto', postos).forEach(b => { const on = b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); placa.focus(); }, dataset: { p } }, h('b', { text: p }), h('small', { text: 'Alt+' + (i + 1) }))));
    const enviar = () => {
      const c = mostrar(), v = this.valorBR(valor.value);
      if (!c) { mensagem(msg, 'Escolha uma placa cadastrada.'); placa.focus(); return; }
      if (!(v > 0)) { mensagem(msg, 'Informe o valor da fatura com desconto.'); valor.focus(); return; }
      // entra na tela na hora e o campo já fica livre para a próxima placa; o servidor grava por trás, um de cada vez, na ordem
      const prov = { id: 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pagamentoId: d.pagamento.id, faturaId: f.id, posto: this.posto, cadastroId: c.id, placa: c.placa, nome: c.nome, grupo: c.grupo, valor: Math.round(v * 100) / 100, criadoEm: '', salvando: true };
      this.mut++; d.lancamentos.push(prov); Financeiro.resumoCombCache = null; this.recentes.unshift(prov); this.recentes = this.recentes.slice(0, 8);
      this.foco = 'cbPlaca'; this.focoT = Date.now(); this.render(); const p = $('#cbPlaca'); if (p) p.focus();
      this.fila = (this.fila || Promise.resolve()).then(() => API.chamar('combLancar', { faturaId: f.id, posto: prov.posto, cadastroId: c.id, valor: v }, { mudo: true })).then(r => {
        const dd = this.d; if (dd && dd.lancamentos.some(x => x !== prov && x.id === r.lancamento.id)) dd.lancamentos = dd.lancamentos.filter(x => x !== prov);     // a tela recarregou e já trouxe ele
        Object.assign(prov, r.lancamento, { salvando: false }); this.mut++; this.renderSeLivre();
      }).catch(e => {
        if (this.d) this.d.lancamentos = this.d.lancamentos.filter(x => x !== prov); this.recentes = this.recentes.filter(x => x !== prov); this.mut++; this.renderSeLivre();
        toast('Não lançou ' + fmtMoeda(v) + ' de ' + c.placa + ': ' + (e.message || String(e)), true);
      });
    };
    valor.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
    if (!this._atalho) document.addEventListener('keydown', this._atalho = e => {     // Alt+1, Alt+2… troca o posto de qualquer lugar da tela de lançar
      if (!e.altKey || !/^[1-9]$/.test(e.key) || $('.overlay.show')) return; const b = $$('.cb-form .cb-posto')[+e.key - 1]; if (b && b.isConnected) { e.preventDefault(); b.click(); }
    });
    const form = h('div', { class: 'cb-form' },
      postos, h('div', { class: 'cb-campos' }, h('label', { class: 'cb-l' }, h('span', { text: 'Placa' }), dl), h('label', { class: 'cb-l' }, h('span', { text: 'Valor com desconto' }), valor),
        h('button', { class: 'btn cb-lancar', type: 'button', text: 'Lançar', onclick: enviar })), nome, msg,
      (rec => rec.length ? h('div', { class: 'cb-rec' }, h('small', { text: 'Últimos lançados nesta fatura' }), rec.map(l => h('span', { class: 'cb-rec-i' + (l.salvando ? ' salvando' : '') }, l.placa, (n => n > 1 ? h('sup', { class: 'cb-vez', title: n + 'ª nota desta placa neste posto, nesta fatura', text: String(n) }) : null)(this.vez(l)), ' · ' + l.posto + ' · ' + fmtMoeda(l.valor), l.salvando ? h('em', { text: ' salvando…' }) : h('button', { type: 'button', class: 'btn-link', text: 'desfazer', onclick: () => this.apagar(l) })))) : null)(d.lancamentos.filter(l => l.faturaId === f.id).slice(-8).reverse()));
    return form;
  },
  /** Quantas notas desta placa, neste posto e nesta fatura, até este lançamento (1ª, 2ª, 3ª…): ajuda a separar as notas na mesa. */
  vez(l) { const d = this.d; if (!d) return 1; const mesmas = d.lancamentos.filter(x => x.faturaId === l.faturaId && x.posto === l.posto && x.cadastroId === l.cadastroId); const i = mesmas.indexOf(l); return i < 0 ? mesmas.length : i + 1; },
  confDe(f) { try { const o = JSON.parse((f && f.confirmados) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } },
  lt(v) { return (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); },
  cuponsDe(fid, placa) { return (((this.d.cupons || {})[fid] || {})[this.placaK(placa)] || []); },
  /** Sugestão de qual nota é de qual abastecimento. Abastecimentos no mesmo posto, dia e hora (ex.: diesel + arla) são da MESMA nota.
      Dentro de cada posto: a maior nota com o maior abastecimento, e assim por diante (o desconto não inverte a ordem).
      duvida: dois abastecimentos com valores parecidos (até 3%), aí a ordem pode enganar e a pessoa confere na notinha. */
  parear(cs, ls) {
    if (!cs.length) return { erro: 'O robô não leu cupom dessa placa nesta fatura.' };
    const blocos = {}; cs.forEach(c => { const k = (c.posto || '') + '|' + c.data + '|' + (c.hora || c.id); (blocos[k] = blocos[k] || { posto: c.posto || '', cs: [], cheio: 0 }).cs.push(c); blocos[k].cheio = this.r2(blocos[k].cheio + c.cheio); });
    // se algum abastecimento não tem o posto marcado (fatura lida antes), não separa por posto
    const misto = Object.values(blocos).some(b => !b.posto), grupos = {}; Object.values(blocos).forEach(b => { const p = misto ? '' : b.posto; (grupos[p] = grupos[p] || { bs: [], ls: [] }).bs.push(b); });
    const semPosto = grupos[''] || null, pares = []; let ruim = false, duvida = false, sobra = ls.slice();
    for (const p of Object.keys(grupos).filter(Boolean)) { const L = sobra.filter(l => l.posto === p); sobra = sobra.filter(l => l.posto !== p); grupos[p].ls = L; }
    if (semPosto) semPosto.ls = sobra; else if (sobra.length) return { erro: 'Tem nota de posto que não tem abastecimento lido pelo robô: ' + sobra.map(l => fmtMoeda(l.valor) + ' · ' + l.posto).join(', ') + '.' };
    for (const p of Object.keys(grupos)) {
      const g = grupos[p], n = g.bs.length, q = g.bs.reduce((t, b) => t + b.cs.length, 0);
      if (g.ls.length < n) return { erro: 'Faltam notas' + (p ? ' do ' + p : '') + ': o robô leu ' + q + ' abastecimento(s)' + (q !== n ? ' (' + n + ' notas, juntando os do mesmo horário)' : '') + ' e foi lançada ' + g.ls.length + ' nota(s).' };
      if (g.ls.length > n) return { erro: 'Tem mais notas' + (p ? ' do ' + p : '') + ' (' + g.ls.length + ') do que abastecimentos lidos pelo robô (' + n + ').' };
      const B = g.bs.slice().sort((a, b) => b.cheio - a.cheio), L = g.ls.slice().sort((a, b) => Number(b.valor) - Number(a.valor));
      B.forEach((b, i) => { b.cs.forEach(c => pares.push({ c, l: L[i] })); if (!this.parOk(b, L[i])) ruim = true; if (i > 0 && B[i - 1].cheio - b.cheio <= B[i - 1].cheio * 0.03) duvida = true; });
    }
    return { pares, ruim, duvida };
  },
  /** A nota fecha com o(s) abastecimento(s) dela: não passa do valor da fatura e o desconto não passa de 15%. */
  parOk(c, l) { const v = Number(l && l.valor) || 0; return v <= c.cheio + 0.01 && v >= c.cheio * 0.85; },
  /** Situação da placa no GF: confirmada com as mesmas notas de agora, ou mudou depois. */
  estadoGF(f, x) {
    const c = this.confDe(f)[this.placaK(x.c.placa)]; if (!c) return null;
    const ids = x.ls.filter(l => l.faturaId === f.id).map(l => l.id).sort().join(','), antes = Array.from(new Set((c.pares || []).map(p => p.l))).sort().join(',');
    return { c, igual: c.pares ? ids === antes : Math.abs(Number(c.total) - x.total) < 0.005 };
  },
  /** Conferir nota por nota antes de levar ao GF: cada abastecimento do robô recebe a nota dele (uma nota pode cobrir dois, ex.: diesel + arla). */
  conferirGF(f, x) {
    const cs = this.cuponsDe(f.id, x.c.placa), ls = x.ls.filter(l => l.faturaId === f.id && !l.salvando), sug = this.parear(cs, ls), dt = v => this.dt(v).slice(0, 5);
    const corpo = h('div', { class: 'cb-conf' }), msg = h('div', { class: 'msg' });
    if (sug.erro) {
      corpo.append(h('p', { class: 'cb-conf-erro', text: sug.erro }), h('p', { class: 'hint', text: 'Cada nota tem que corresponder a um abastecimento lido pelo robô (ou a dois do mesmo horário, como diesel e arla). Lance as notas que faltam (ou apague a que sobrou) e confirme de novo.' }),
        h('div', { class: 'cb-conf-cols' }, h('div', {}, h('b', { text: 'Lidos pelo robô (sem desconto)' }), h('ul', {}, cs.map(c => h('li', { text: dt(c.data) + (c.hora ? ' ' + c.hora : '') + (c.posto ? ' · ' + c.posto : '') + ' · ' + (c.produto ? c.produto + ' · ' : '') + this.lt(c.litros) + ' L · ' + fmtMoeda(c.cheio) })))),
          h('div', {}, h('b', { text: 'Notas lançadas (com desconto)' }), h('ul', {}, ls.map(l => h('li', { text: fmtMoeda(l.valor) + ' · ' + l.posto }))))));
      abrirModal('Conferir no GF · ' + x.c.placa, corpo, { largo: true }); return;
    }
    const rows = [];
    const pintar = () => {
      const g = {}; rows.forEach(r => { (g[r.sel.value] = g[r.sel.value] || []).push(r); });
      rows.forEach(r => {
        const l = ls.find(y => y.id === r.sel.value), grupo = g[r.sel.value], cheio = grupo.reduce((t, y) => t + y.c.cheio, 0), v = Number(l.valor), parte = r.c.cheio * v / cheio, dd = this.r2(r.c.cheio - parte), ok = this.parOk({ cheio }, l);
        limpar(r.desc).append(ok ? '−' + fmtMoeda(dd) + ' (' + (dd / r.c.cheio * 100).toFixed(1).replace('.', ',') + '%)' : (v > cheio ? 'nota MAIOR que o abastecimento' : 'desconto grande demais'), grupo.length > 1 ? h('small', { text: 'nota dividida em ' + grupo.length }) : '');
        r.tr.classList.toggle('ruim', !ok);
      });
    };
    const linha = (c, lEsc) => {
      const sel = h('select', { 'aria-label': 'Nota deste abastecimento' }, ls.filter(l => !c.posto || l.posto === c.posto).map(l => h('option', { value: l.id, text: fmtMoeda(l.valor) + ' · ' + l.posto + (this.vez(l) > 1 ? ' · ' + this.vez(l) + 'ª nota' : ''), selected: l === lEsc ? true : null })));
      const desc = h('td', { class: 'n cb-conf-d' }), tr = h('tr', {}, h('td', { text: dt(c.data) + (c.hora ? ' ' + c.hora : '') }), h('td', { text: c.posto || '—' }), h('td', { text: c.produto || 'Diesel' }), h('td', { class: 'n', text: this.lt(c.litros) + ' L' }), h('td', { class: 'n', text: fmtMoeda(c.cheio) }), h('td', {}, sel), desc);
      sel.onchange = () => { pintar(); mensagem(msg, ''); }; rows.push({ c, sel, desc, tr }); return tr;
    };
    const tab = h('table', { class: 'cb-conf-tab' }, h('thead', {}, h('tr', {}, ['Data', 'Posto (fatura)', 'Produto', 'Litros', 'Na fatura', 'Nota (com desconto)', 'Desconto'].map((t, i) => h('th', { class: i === 3 || i === 4 || i === 6 ? 'n' : '', text: t })))),
      h('tbody', {}, cs.map(c => linha(c, sug.pares.find(p => p.c === c).l))));
    pintar();
    const ok = h('button', { type: 'button', class: 'btn', text: 'Confirmar no GF' });
    corpo.append(sug.duvida ? h('p', { class: 'cb-conf-aviso', text: '⚠️ Dois abastecimentos têm valores parecidos. Confira na notinha (data e litros) se cada nota está no abastecimento certo.' }) : h('p', { class: 'hint', text: 'O sistema juntou cada nota com o abastecimento de valor mais próximo (os do mesmo horário, como diesel e arla, ficam na mesma nota). Confira e, se precisar, troque a nota na lista.' }),
      h('div', { class: 'cb-tab' }, tab), msg, h('div', { class: 'modal-actions' }, ok));
    const m = abrirModal('Conferir no GF · ' + x.c.placa + ' · ' + this.nomeFat(f), corpo, { largo: true });
    ok.onclick = () => {
      const g = {}; rows.forEach(r => { (g[r.sel.value] = g[r.sel.value] || []).push(r); });
      const sem = ls.filter(l => !g[l.id]); if (sem.length) return mensagem(msg, 'A nota de ' + fmtMoeda(sem[0].valor) + ' (' + sem[0].posto + ') ficou sem abastecimento. Cada nota tem que ir para pelo menos um.');
      for (const id of Object.keys(g)) { const l = ls.find(y => y.id === id); if (!this.parOk({ cheio: g[id].reduce((t, r) => t + r.c.cheio, 0) }, l)) return mensagem(msg, 'A nota de ' + fmtMoeda(l.valor) + ' não fecha com o(s) abastecimento(s) dela (maior que a fatura ou desconto acima de 15%). Confira.'); }
      m.fechar(); this.confirmar(f, { [x.c.placa]: rows.map(r => ({ cupomId: r.c.id, lancId: r.sel.value })) }, false, null);
    };
  },
  /** Leva ao GF (pares por placa) ou desfaz (desfazer = lista de placas). */
  confirmar(f, pares, desfazer, btn) {
    // a tela marca na hora ("Salvando…"); o servidor grava por trás e depois a lista recarrega com os valores novos
    const antes = f.confirmados, conf = this.confDe(f), placas = desfazer ? desfazer.map(p => this.placaK(p)) : Object.keys(pares).map(p => this.placaK(p));
    this.gfSalvando = this.gfSalvando || {}; placas.forEach(k => { this.gfSalvando[k] = (this.gfSalvando[k] || 0) + 1; });
    if (desfazer) placas.forEach(k => { delete conf[k]; });
    else Object.keys(pares).forEach(p => { conf[this.placaK(p)] = Object.assign({}, conf[this.placaK(p)] || {}, { pares: pares[p].map(x => ({ c: x.cupomId, l: x.lancId })), por: (App.sessao && App.sessao.nome) || '', em: '' }); });
    f.confirmados = JSON.stringify(conf); this.mut++; this.foco = null; this.render();
    const fim = () => { placas.forEach(k => { if (--this.gfSalvando[k] <= 0) delete this.gfSalvando[k]; }); };
    API.chamar('combConfirmar', desfazer ? { faturaId: f.id, placas: desfazer, desfazer: true } : { faturaId: f.id, pares }, { mudo: true }).then(r => {
      fim(); f.confirmados = JSON.stringify(r.confirmados || {}); this.mut++; this.renderSeLivre();
      this.carregar().then(() => this.renderSeLivre()).catch(() => {});      // traz os cupons com o valor novo
      if (r.feitas.length) toast(desfazer ? 'Valor cheio de volta no GF: ' + r.feitas.join(', ') : 'Levado ao GF, nota por nota: ' + r.feitas.join(', '));
      if (r.puladas.length) abrirModal('Algumas placas ficaram de fora', h('div', { class: 'cb-puladas' }, h('p', { class: 'hint', text: 'Estas não foram levadas ao GF:' }), h('ul', {}, r.puladas.map(t => h('li', { text: t })))));
    }).catch(e => { fim(); f.confirmados = antes; this.mut++; this.renderSeLivre(); toast('Não levou ao GF: ' + (e.message || String(e)), true); });
  },
  /** "Confirmar as N placas": leva direto as que fecham sem dúvida; as outras ficam para conferir uma a uma. */
  confirmarTodas(f, linhas, btn) {
    const pares = {}, conferir = [];
    linhas.forEach(x => { const sug = this.parear(this.cuponsDe(f.id, x.c.placa), x.ls.filter(l => l.faturaId === f.id && !l.salvando));
      if (sug.erro || sug.ruim || sug.duvida) conferir.push(x.c.placa + ': ' + (sug.erro || (sug.ruim ? 'tem nota que não fecha com nenhum abastecimento' : 'abastecimentos com valores parecidos, confira qual nota é de qual')));
      else pares[x.c.placa] = sug.pares.map(p => ({ cupomId: p.c.id, lancId: p.l.id })); });
    if (Object.keys(pares).length) this.confirmar(f, pares, false, btn);
    if (conferir.length) abrirModal('Confira estas uma a uma', h('div', { class: 'cb-puladas' }, h('p', { class: 'hint', text: 'Clique em "Confirmar" na linha de cada uma para ver nota por nota:' }), h('ul', {}, conferir.map(t => h('li', { text: t })))));
  },
  tabela(ls, grupo, fids) {
    const d = this.d, postos = d.postos, frota = grupo === 'FROTA';
    // na tela da fatura, a frota própria ganha a coluna "No GF": confirmar o valor com desconto e levar para o custo do caminhão
    const fat = frota && fids.length === 1 && this.tipo === 'lanc' ? d.faturas.find(x => x.id === fids[0]) : null, conf = fat ? this.confDe(fat) : {}, pend = [];
    const colGF = (x, robo) => {
      if (!fat) return null;
      const est = this.estadoGF(fat, x);
      if (!robo || !x.total) return h('td', { class: 'n gf', text: '—' });
      if ((this.gfSalvando || {})[this.placaK(x.c.placa)]) return h('td', { class: 'n gf' }, h('button', { type: 'button', class: 'cb-gf salvando', disabled: true, text: 'Salvando…' }));
      if (est && est.igual) return h('td', { class: 'n gf' }, h('button', { type: 'button', class: 'cb-gf ok', title: 'Confirmado por ' + (est.c.por || '') + ' em ' + String(est.c.em || '').slice(0, 16) + '. Clique para voltar o valor cheio no GF.', text: '✓ no GF',
        onclick: e => confirmarCustom('Voltar o valor cheio', 'Voltar ' + x.c.placa + ' para o valor da fatura (' + fmtMoeda(est.c.robo) + ') no GF?').then(ok => { if (ok) this.confirmar(fat, null, [x.c.placa], e.target); }) }));
      pend.push(x);
      return h('td', { class: 'n gf' }, h('button', { type: 'button', class: 'cb-gf' + (est ? ' mudou' : ''), title: est ? 'As notas mudaram depois de confirmar.' : 'Conferir nota por nota e levar o valor com desconto para o GF.', text: est ? '⚠️ Confirmar de novo' : 'Confirmar', onclick: () => this.conferirGF(fat, x) }));
    };
    let rows = this.linhas(ls, grupo); if (!this.todos) rows = rows.filter(x => x.total > 0);
    const cel = (x, p) => { const v = x.postos[p] || 0; return h('td', { class: 'n' + (v ? '' : ' z') }, v ? h('button', { type: 'button', class: 'cb-v', title: x.ls.filter(l => l.posto === p).length + ' lançamento(s)', onclick: () => this.verLancs(x, p), text: fmtMoeda(v) }) : '—'); };
    let tRobo = 0, tComp = 0;
    const corpo = rows.map(x => {
      const cp = frota ? this.comparar(x, fids) : { robo: 0, comp: 0 }, robo = cp.robo; if (cp.comp) { tRobo += robo; tComp += cp.comp; }   // só soma no total o que dá para comparar (robô leu E houve lançamento)
      return h('tr', {}, h('td', { class: 'nm', text: x.c.nome }), h('td', { class: 'pl', text: x.c.placa }), postos.map(p => cel(x, p)), h('td', { class: 'n t', text: x.total ? fmtMoeda(x.total) : '—' }),
        frota ? h('td', { class: 'n r', text: robo ? fmtMoeda(robo) : '—' }) : null, frota ? h('td', { class: 'n e', text: robo && cp.comp ? fmtMoeda(this.r2(robo - cp.comp)) : '—' }) : null, colGF(x, robo));
    });
    const tot = this.soma(ls, grupo);
    return h('section', { class: 'cb-bloco ' + (frota ? 'fr' : 'ag') },
      h('div', { class: 'cb-bloco-cab' }, h('h4', { text: frota ? 'Frota própria' : 'Agregados' }), h('span', { text: frota ? 'comparado com a fatura lida pelo robô' : 'descontado do agregado' }),
        pend.length > 1 ? h('button', { type: 'button', class: 'cb-gf todas', text: 'Confirmar as ' + pend.length + ' placas no GF', title: 'Leva o valor com desconto de todas as placas desta fatura para o GF', onclick: e => this.confirmarTodas(fat, pend, e.target) }) : null),
      h('div', { class: 'cb-tab' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Motorista' }), h('th', { text: 'Placa' }), postos.map(p => h('th', { class: 'n', text: p })), h('th', { class: 'n', text: 'Total' }), frota ? h('th', { class: 'n', text: 'Robô (sem desc.)' }) : null, frota ? h('th', { class: 'n', text: 'Economia' }) : null, fat ? h('th', { class: 'n', text: 'No GF', title: 'Confirme o valor com desconto para ele virar o custo do caminhão no GF' }) : null)),
        h('tbody', {}, corpo.length ? corpo : h('tr', {}, h('td', { colspan: postos.length + (frota ? 5 : 3) + (fat ? 1 : 0), class: 'vazio', text: 'Nenhum abastecimento lançado.' }))),
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 2, text: 'Total' }), postos.map(p => h('td', { class: 'n', text: fmtMoeda(this.soma(ls, grupo, p)) })), h('td', { class: 'n t', text: fmtMoeda(tot) }),
          frota ? h('td', { class: 'n r', text: tRobo ? fmtMoeda(this.r2(tRobo)) : '—' }) : null, frota ? h('td', { class: 'n e', text: tRobo ? fmtMoeda(this.r2(tRobo - tComp)) : '—' }) : null, fat ? h('td') : null)))));
  },
  verLancs(x, posto) {
    const ls = x.ls.filter(l => l.posto === posto), lista = h('div', { class: 'cb-lista' });
    const m = abrirModal(x.c.nome + ' · ' + x.c.placa + ' · ' + posto, lista);
    ls.forEach(l => lista.append(h('div', { class: 'cb-lista-i' }, h('b', { text: fmtMoeda(l.valor) }), h('span', { class: 'hint', text: (this.nomeFat(this.d.faturas.find(f => f.id === l.faturaId) || {}) || '') + ' · lançado ' + String(l.criadoEm || '').slice(0, 16).replace('T', ' ') + (l.criadoPor ? ' por ' + l.criadoPor : '') }),
      this.aberto ? h('button', { class: 'btn danger small', type: 'button', text: 'Apagar', onclick: () => { m.fechar(); this.apagar(l); } }) : null)));
  },
  apagar(l) {
    confirmarCustom('Apagar lançamento', 'Apagar ' + fmtMoeda(l.valor) + ' de ' + l.placa + ' no ' + l.posto + '?').then(ok => {
      if (!ok) return;
      this.mut++; API.chamar('combExcluirLanc', { id: l.id }, { mudo: true }).then(() => { this.d.lancamentos = this.d.lancamentos.filter(x => x.id !== l.id); Financeiro.resumoCombCache = null; toast('Lançamento apagado'); this.render(); }).catch(e => toast(e.message || String(e), true));
    });
  },
  refsDe(f) { try { const r = JSON.parse((f && f.roboRef) || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; } },
  /** Lista das faturas que o robô leu do e-mail: marcar quais são ESTA fatura (assim a semana seguinte nunca cai aqui). */
  listaRobo(f, de, ate) {
    const sel = new Set(this.refsDe(f)), todas = (this.d.roboFaturas || []), box = h('div', { class: 'cb-robo' });
    const livres = todas.filter(r => !r.ligadaA || (f && r.ligadaA === f.id));
    if (!f) livres.forEach(r => { if (!r.ligadaA && de.value && ate.value && r.de >= de.value && r.ate <= ate.value) sel.add(r.ref); });   // sugestão: cupons todos dentro do período
    if (!todas.length) box.append(h('p', { class: 'hint', text: 'O robô ainda não leu nenhuma fatura com essa identificação (começa nas próximas que chegarem no e-mail). Até lá, a comparação usa o período acima.' }));
    todas.slice(0, 12).forEach(r => {
      const outra = r.ligadaA && (!f || r.ligadaA !== f.id), fat = outra ? this.d.faturas.find(x => x.id === r.ligadaA) : null;
      const cb = h('input', { type: 'checkbox', checked: sel.has(r.ref) ? true : null, disabled: outra ? true : null, onchange: e => { if (e.target.checked) sel.add(r.ref); else sel.delete(r.ref); } });
      box.append(h('label', { class: 'cb-robo-i' + (outra ? ' off' : '') }, cb, h('span', {}, h('b', { text: (r.posto ? r.posto + ' · ' : '') + 'E-mail de ' + this.dt(r.ref.slice(0, 10)) + ' ' + r.ref.slice(11, 16) }), h('small', { text: r.ref.slice(19) }),
        h('small', { text: r.cupons + ' cupons · abastecimentos de ' + this.dm(r.de) + ' a ' + this.dm(r.ate) + ' · frota ' + fmtMoeda(r.frota) + (outra ? ' · já é da ' + (fat ? this.nomeFat(fat) : 'outra fatura') : '') }))));
    });
    return { el: box, valor: () => Array.from(sel) };
  },
  editarFatura(f) {
    const segunda = (() => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return hojeLocalDe(x); })();
    const data = h('input', { type: 'date', value: f ? String(f.data || '').slice(0, 10) : segunda }), de = h('input', { type: 'date', value: f ? String(f.de || '').slice(0, 10) : '' }), ate = h('input', { type: 'date', value: f ? String(f.ate || '').slice(0, 10) : '' });
    const rot = h('input', { maxlength: 40, value: f ? f.rotulo || '' : '', placeholder: 'Opcional, ex.: Fatura 1' }), msg = h('div', { class: 'msg' });
    const auto = () => { if (!data.value) return; if (!f || !de.dataset.mexeu) de.value = addDias(data.value, -7); if (!f || !ate.dataset.mexeu) ate.value = addDias(data.value, -1); };
    if (!f) auto(); data.addEventListener('change', () => { if (!f) auto(); }); de.addEventListener('input', () => { de.dataset.mexeu = 1; }); ate.addEventListener('input', () => { ate.dataset.mexeu = 1; });
    const robo = this.listaRobo(f, de, ate);
    const corpo = h('div', {}, campo('Dia que a fatura chegou', data), h('div', { class: 'cb-2' }, campo('Abastecimentos de', de), campo('até', ate)), campo('Nome', rot),
      h('div', { class: 'field' }, h('label', { text: 'Fatura lida pelo robô (sem desconto)' }), h('p', { class: 'hint', style: 'margin:0 0 6px', text: 'Marque a(s) que são esta fatura. O robô soma todos os cupons de cada placa (dois de R$ 500 = R$ 1.000), e a fatura de outra semana nunca entra aqui.' }), robo.el), msg,
      h('div', { class: 'cb-acoes' }, h('button', { class: 'btn', type: 'button', text: f ? 'Salvar fatura' : 'Criar fatura', onclick: () => {
        const dados = f ? { acao: 'editar', id: f.id, data: data.value, de: de.value, ate: ate.value, rotulo: rot.value, roboRef: robo.valor() } : { acao: 'criar', pagamentoId: this.pagId, data: data.value, de: de.value, ate: ate.value, rotulo: rot.value, roboRef: robo.valor() };
        // enquanto a fatura é gravada, a tela de lançar fica em espera: nada pode cair na fatura errada
        this.ocupado = true; m.el.querySelectorAll('button').forEach(b => { b.disabled = true; });
        API.chamar('combFatura', dados).then(r => { m.fechar(); this.render(); return this.carregar().then(() => { if (r.id) this.fatId = r.id; }); })
          .catch(e => { m.el.querySelectorAll('button').forEach(b => { b.disabled = false; }); mensagem(msg, e.message || String(e)); }).finally(() => { this.ocupado = false; this.render(); });
      } }), f ? h('button', { class: 'btn danger', type: 'button', text: 'Excluir fatura', onclick: () => {
        API.chamar('combFatura', { acao: 'excluir', id: f.id }).then(() => { m.fechar(); this.fatId = null; return this.carregar(); }).then(() => this.render()).catch(e => mensagem(msg, e.message || String(e)));
      } }) : null));
    const m = abrirModal(f ? 'Editar fatura' : 'Fatura que chegou do posto', corpo);
  },
  novoPagamento() {
    const data = h('input', { type: 'date' }), msg = h('div', { class: 'msg' });
    const m = abrirModal('Novo pagamento de combustível', h('div', {}, campo('Data do pagamento ao posto', data, 'As faturas das segundas-feiras entram neste pagamento.'), msg,
      h('div', { class: 'cb-acoes' }, h('button', { class: 'btn', type: 'button', text: 'Abrir pagamento', onclick: () => {
        API.chamar('combPagamento', { acao: 'abrir', data: data.value }).then(r => { m.fechar(); this.fatId = null; return this.carregar(r.id); }).then(() => this.render()).catch(e => mensagem(msg, e.message || String(e)));
      } }))));
  },
  statusPag(acao) {
    const p = this.d.pagamento, txt = acao === 'fechar' ? 'Fechar o pagamento de ' + this.dt(p.data) + '? Os valores ficam travados (dá para reabrir).' : 'Reabrir o pagamento de ' + this.dt(p.data) + ' para corrigir?';
    confirmarCustom(acao === 'fechar' ? 'Fechar pagamento' : 'Reabrir pagamento', txt).then(ok => { if (!ok) return; API.chamar('combPagamento', { acao, id: p.id }).then(() => this.carregar()).then(() => this.render()).catch(e => toast(e.message || String(e), true)); });
  },

  // ---------- relatório ----------
  telaRel() {
    const d = this.d, ls = this.lancs(), fids = d.faturas.map(f => f.id);
    const resumo = h('table', { class: 'cb-res' }, h('thead', {}, h('tr', {}, h('th', { text: 'Fatura' }), h('th', { text: 'Abastecimentos' }), d.postos.map(p => h('th', { class: 'n', text: p })), h('th', { class: 'n', text: 'Agregados' }), h('th', { class: 'n', text: 'Frota' }), h('th', { class: 'n', text: 'Total' }))),
      h('tbody', {}, d.faturas.map(f => { const l = this.lancs(f.id); return h('tr', {}, h('td', { text: this.nomeFat(f) }), h('td', { text: this.periodo(f) }), d.postos.map(p => h('td', { class: 'n', text: fmtMoeda(this.soma(l, null, p)) })), h('td', { class: 'n', text: fmtMoeda(this.soma(l, 'AGREGADO')) }), h('td', { class: 'n', text: fmtMoeda(this.soma(l, 'FROTA')) }), h('td', { class: 'n t', text: fmtMoeda(this.soma(l)) })); })),
      h('tfoot', {}, h('tr', {}, h('td', { colspan: 2, text: 'Pagamento ' + this.dt(d.pagamento.data) }), d.postos.map(p => h('td', { class: 'n', text: fmtMoeda(this.soma(ls, null, p)) })), h('td', { class: 'n', text: fmtMoeda(this.soma(ls, 'AGREGADO')) }), h('td', { class: 'n', text: fmtMoeda(this.soma(ls, 'FROTA')) }), h('td', { class: 'n t', text: fmtMoeda(this.soma(ls)) }))));
    const sv = this.todos; this.todos = false;
    const grade = h('div', { class: 'cb-grade' }, this.tabela(ls, 'AGREGADO', fids), this.tabela(ls, 'FROTA', fids)); this.todos = sv;
    return h('div', { class: 'cb-rel' },
      h('div', { class: 'cb-rel-cab' }, h('h3', { text: 'Relatório do pagamento ' + this.dt(d.pagamento.data) }), h('div', { class: 'cb-acoes' },
        h('button', { class: 'btn', type: 'button', text: 'Imprimir / PDF', onclick: () => this.imprimirRel() }), h('button', { class: 'btn secondary', type: 'button', text: 'Baixar CSV', onclick: () => this.csv() }))),
      h('div', { class: 'cb-tab' }, resumo), grade);
  },
  imprimirRel() {
    const w = window.open('', '_blank'); if (!w) { toast('Libere as janelas (pop-up) para imprimir.', true); return; }
    const d = this.d, e = escHtml, ls = this.lancs(), fids = d.faturas.map(f => f.id), brl = fmtMoeda, logo = _logoDataUrl || new URL('logotrm.png', location.href).href;
    const tab = (grupo) => {
      const frota = grupo === 'FROTA', rows = this.linhas(ls, grupo).filter(x => x.total > 0).sort((a, b) => a.c.nome.localeCompare(b.c.nome)); let tr = 0, tc = 0;
      const corpo = rows.map(x => { const cp = frota ? this.comparar(x, fids) : { robo: 0, comp: 0 }, r = cp.robo; if (cp.comp) { tr += r; tc += cp.comp; } return `<tr><td>${e(x.c.nome)}</td><td>${e(x.c.placa)}</td>${d.postos.map(p => `<td class="n">${x.postos[p] ? brl(x.postos[p]) : '—'}</td>`).join('')}<td class="n b">${brl(x.total)}</td>${frota ? `<td class="n">${r ? brl(r) : '—'}</td><td class="n">${r && cp.comp ? brl(this.r2(r - cp.comp)) : '—'}</td>` : ''}</tr>`; }).join('');
      return `<h2>${frota ? 'Frota própria' : 'Agregados — descontar do agregado'}</h2><table><thead><tr><th>Motorista</th><th>Placa</th>${d.postos.map(p => `<th class="n">${e(p)}</th>`).join('')}<th class="n">Total</th>${frota ? '<th class="n">Robô (sem desc.)</th><th class="n">Economia</th>' : ''}</tr></thead><tbody>${corpo || `<tr><td colspan="9">Nenhum abastecimento.</td></tr>`}</tbody>
        <tfoot><tr><td colspan="2">Total</td>${d.postos.map(p => `<td class="n">${brl(this.soma(ls, grupo, p))}</td>`).join('')}<td class="n">${brl(this.soma(ls, grupo))}</td>${frota ? `<td class="n">${tr ? brl(this.r2(tr)) : '—'}</td><td class="n">${tr ? brl(this.r2(tr - tc)) : '—'}</td>` : ''}</tr></tfoot></table>`;
    };
    const fat = `<table><thead><tr><th>Fatura</th><th>Abastecimentos</th>${d.postos.map(p => `<th class="n">${e(p)}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>${d.faturas.map(f => { const l = this.lancs(f.id); return `<tr><td>${e(this.nomeFat(f))}</td><td>${e(this.periodo(f))}</td>${d.postos.map(p => `<td class="n">${brl(this.soma(l, null, p))}</td>`).join('')}<td class="n b">${brl(this.soma(l))}</td></tr>`; }).join('')}</tbody></table>`;
    const css = `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:26px 30px;font-size:12px}header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:14px}header img{height:48px}h1{font-size:20px;margin:0}header p{margin:3px 0 0;color:#444}
      .tot{display:flex;gap:28px;margin:0 0 12px}.tot b{display:block;font-size:17px}h2{font-size:14px;margin:18px 0 6px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #111;padding:5px}td{padding:4px 5px;border-bottom:1px solid #ddd}.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.b{font-weight:bold}tfoot td{font-weight:bold;border-top:2px solid #111;border-bottom:0}
      @page{size:A4;margin:12mm}@media print{body{padding:0}tr{break-inside:avoid}}`;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Combustível ${e(this.dt(d.pagamento.data))}</title><style>${css}</style></head><body>
      <header><img src="${logo}" alt=""><div><h1>Combustível — pagamento ${e(this.dt(d.pagamento.data))}</h1><p>Valores com desconto do posto · emitido ${e(new Date().toLocaleString('pt-BR').slice(0, 17))}</p></div></header>
      <div class="tot"><div>Total do pagamento<b>${brl(this.soma(ls))}</b></div><div>Descontar dos agregados<b>${brl(this.soma(ls, 'AGREGADO'))}</b></div><div>Frota própria<b>${brl(this.soma(ls, 'FROTA'))}</b></div></div>
      ${fat}${tab('AGREGADO')}${tab('FROTA')}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  },
  csv() {
    const d = this.d, q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', n = v => String(this.r2(v)).replace('.', ',');
    const linhas = [['Pagamento', 'Fatura', 'Período', 'Grupo', 'Motorista', 'Placa', 'Posto', 'Valor com desconto', 'Lançado em', 'Por'].map(q).join(';')];
    this.lancs().forEach(l => { const f = d.faturas.find(x => x.id === l.faturaId) || {}; linhas.push([this.dt(d.pagamento.data), this.nomeFat(f), this.periodo(f), l.grupo === 'FROTA' ? 'Frota própria' : 'Agregado', l.nome, l.placa, l.posto].map(q).concat([n(l.valor), q(String(l.criadoEm || '').slice(0, 16)), q(l.criadoPor)]).join(';')); });
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: 'combustivel-' + String(d.pagamento.data).slice(0, 10) + '.csv' });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },

  // ---------- etiquetas ----------
  etiquetas() {
    const d = this.d, fat = this.etq.fat || this.fatId, posto = this.etq.posto || d.postos[0];
    const ls = this.lancs(fat).filter(l => l.posto === posto), m = {};
    ls.forEach(l => { const k = l.cadastroId; (m[k] = m[k] || { nome: l.nome, placa: l.placa, grupo: l.grupo, total: 0 }).total = this.r2(m[k].total + Number(l.valor)); });
    return Object.values(m).sort((a, b) => (a.grupo === b.grupo ? 0 : a.grupo === 'AGREGADO' ? -1 : 1) || a.nome.localeCompare(b.nome));
  },
  telaEtq() {
    const d = this.d; if (!this.etq.fat || !d.faturas.some(f => f.id === this.etq.fat)) this.etq.fat = this.fatId || '';
    if (!this.etq.posto || d.postos.indexOf(this.etq.posto) < 0) this.etq.posto = d.postos.find(p => this.lancs(this.etq.fat).some(l => l.posto === p)) || d.postos[0];
    const f = d.faturas.find(x => x.id === this.etq.fat), lista = this.etiquetas();
    const selF = h('select', { class: 'cb-sel', 'aria-label': 'Fatura', onchange: e => { this.etq.fat = e.target.value; this.etq.posto = ''; this.render(); } }, d.faturas.map(x => h('option', { value: x.id, selected: x.id === this.etq.fat ? true : null, text: this.nomeFat(x) + ' · ' + this.periodo(x) })));
    const selP = h('div', { class: 'cb-postos' }, d.postos.map(p => h('button', { type: 'button', class: 'cb-posto' + (p === this.etq.posto ? ' on' : ''), onclick: () => { this.etq.posto = p; this.render(); } }, h('b', { text: p }))));
    const grade = h('div', { class: 'cb-etqs' }, lista.map(x => h('div', { class: 'cb-etq' }, h('div', {}, h('small', { text: 'Motorista' }), h('b', { text: x.nome })), h('div', {}, h('small', { text: 'Placa' }), h('b', { text: x.placa })), h('div', {}, h('small', { text: 'Total' }), h('b', { class: 'v', text: fmtMoeda(x.total) })))));
    return h('div', { class: 'cb-etq-tela' },
      h('div', { class: 'cb-etq-cab' }, d.faturas.length ? selF : h('span', { class: 'hint', text: 'Crie uma fatura em Lançar.' }), selP,
        h('button', { class: 'btn', type: 'button', disabled: lista.length ? null : true, text: 'Imprimir ' + lista.length + (lista.length === 1 ? ' etiqueta' : ' etiquetas'), onclick: () => this.imprimirEtq(lista, f) })),
      lista.length ? grade : h('div', { class: 'cb-vazio mini' }, h('p', { text: 'Nenhum abastecimento ' + (f ? 'no ' + this.etq.posto + ' nesta fatura.' : 'ainda.') })));
  },
  imprimirEtq(lista, f) {
    const w = window.open('', '_blank'); if (!w) { toast('Libere as janelas (pop-up) para imprimir.', true); return; }
    const e = escHtml, css = `*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#000}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.e{border:1px dashed #888;border-radius:2mm;padding:3mm 4mm;min-height:27mm;break-inside:avoid;font-size:11pt;line-height:1.35}.e b{font-size:12pt}.e .v{font-size:14pt}.p{font-size:8pt;color:#555;margin-top:1mm}@page{size:A4;margin:8mm}`;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas ${e(this.etq.posto)}</title><style>${css}</style></head><body><div class="g">${lista.map(x => `<div class="e">Motorista: <b>${e(x.nome)}</b><br>Placa: <b>${e(x.placa)}</b><br>Total: <b class="v">${e(fmtMoeda(x.total))}</b><div class="p">${e(this.etq.posto)} · ${e(f ? this.nomeFat(f) + ' · ' + this.periodo(f) : '')}</div></div>`).join('')}</div><script>window.onafterprint=()=>setTimeout(()=>window.close(),100);window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  },

  // ---------- cadastro ----------
  telaCadastro() {
    const d = this.d, so = App.sessao.chefe, q = this.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const lista = d.cadastro.filter(c => (!this.grupoCad || c.grupo === this.grupoCad) && (!q || (c.nome + ' ' + c.placa).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().indexOf(q) >= 0));
    const busca = h('input', { id: 'cbBusca', class: 'cb-in', placeholder: 'Buscar nome ou placa', value: this.busca, oninput: e => { this.busca = e.target.value; this.render(); } });
    const filtro = h('div', { class: 'cb-postos' }, [['', 'Todos'], ['AGREGADO', 'Agregados'], ['FROTA', 'Frota própria']].map(([v, t]) => h('button', { type: 'button', class: 'cb-posto' + (this.grupoCad === v ? ' on' : ''), onclick: () => { this.grupoCad = v; this.render(); } }, h('b', { text: t }), h('small', { text: String(d.cadastro.filter(c => !v || c.grupo === v).length) }))));
    const tab = h('div', { class: 'cb-tab' }, h('table', { class: 'cb-cad' }, h('thead', {}, h('tr', {}, h('th', { text: 'Motorista' }), h('th', { text: 'Placa' }), h('th', { text: 'Grupo' }), h('th', { text: 'Situação' }), so ? null : h('th', {}))),
      h('tbody', {}, lista.map(c => h('tr', { class: c.ativo === 'NAO' ? 'inativo' : '' }, h('td', { class: 'nm' }, c.nome, c.daEscala ? h('small', { class: 'cb-esc', title: 'Quem mais rodou com o caminhão nos últimos 30 dias, pela escala' + (c.nomeCadastro ? ' (no cadastro: ' + c.nomeCadastro + ')' : ''), text: ' · pela escala' }) : null), h('td', { class: 'pl', text: c.placa }), h('td', { text: c.grupo === 'FROTA' ? 'Frota própria' : 'Agregado' }), h('td', { text: c.ativo === 'NAO' ? 'Inativo' : 'Ativo' }),
        so ? null : h('td', { class: 'n' }, h('button', { class: 'btn-link', type: 'button', text: 'Editar', onclick: () => this.editarCad(c) })))))));
    return h('div', { class: 'cb-cadastro' },
      h('div', { class: 'cb-cad-cab' }, h('h3', { text: 'Motoristas e placas' }), busca, filtro, so ? null : h('button', { class: 'btn', type: 'button', text: '+ Cadastrar', onclick: () => this.editarCad() })),
      tab,
      so ? null : h('div', { class: 'cb-cad-pe' },
        h('section', { class: 'cb-box' }, h('h4', { text: 'Postos' }), h('p', { class: 'hint', text: 'Na ordem das colunas da fatura: ' + d.postos.join(', ') + '.' }), h('button', { class: 'btn secondary small', type: 'button', text: 'Editar postos', onclick: () => this.editarPostos() })),
        h('section', { class: 'cb-box' }, h('h4', { text: 'Importar planilha antiga' }), h('p', { class: 'hint', text: 'Traz motoristas, placas e as faturas da FATURA_POSTO (.xlsm). Cada pagamento só pode ser importado uma vez.' }), h('button', { class: 'btn secondary small', type: 'button', text: 'Escolher arquivo', onclick: () => this.importar() }))));
  },
  editarCad(c) {
    const nome = h('input', { maxlength: 60, value: c ? (c.nomeCadastro || c.nome) : '' }), placa = h('input', { maxlength: 12, value: c ? c.placa : '', style: 'text-transform:uppercase' });
    const grupo = h('select', {}, h('option', { value: 'AGREGADO', text: 'Agregado (descontado dele)', selected: c && c.grupo === 'AGREGADO' ? true : null }), h('option', { value: 'FROTA', text: 'Frota própria', selected: c && c.grupo === 'FROTA' ? true : null }));
    const ativo = h('input', { type: 'checkbox', checked: !c || c.ativo !== 'NAO' ? true : null }), msg = h('div', { class: 'msg' });
    const m = abrirModal(c ? 'Editar cadastro' : 'Cadastrar motorista/placa', h('div', {}, campo('Motorista', nome), campo('Placa', placa), campo('Grupo', grupo), h('label', { class: 'cb-todos' }, ativo, ' Ativo (aparece no lançamento)'), msg,
      h('div', { class: 'cb-acoes' }, h('button', { class: 'btn', type: 'button', text: 'Salvar', onclick: () => {
        API.chamar('combCadastro', { acao: 'salvar', id: c ? c.id : '', nome: nome.value, placa: placa.value, grupo: grupo.value, ativo: ativo.checked }).then(() => { m.fechar(); return this.carregar(); }).then(() => this.render()).catch(e => mensagem(msg, e.message || String(e)));
      } }))));
    nome.focus();
  },
  editarPostos() {
    const ta = h('textarea', { rows: 4 }); ta.value = this.d.postos.join('\n'); const msg = h('div', { class: 'msg' });
    const m = abrirModal('Postos', h('div', {}, campo('Um por linha, na ordem das colunas', ta, 'Tirar um posto da lista não apaga o que já foi lançado nele.'), msg, h('div', { class: 'cb-acoes' }, h('button', { class: 'btn', type: 'button', text: 'Salvar postos', onclick: () => {
      API.chamar('combCadastro', { acao: 'postos', postos: ta.value.split('\n').map(s => s.trim()).filter(Boolean) }).then(() => { m.fechar(); return this.carregar(); }).then(() => this.render()).catch(e => mensagem(msg, e.message || String(e)));
    } }))));
  },
  importar() {
    const inp = h('input', { type: 'file', accept: '.xlsm,.xlsx,.xls', hidden: true }); document.body.append(inp);
    inp.onchange = () => {
      const f = inp.files[0]; inp.remove(); if (!f) return;
      if (f.size > 5.5 * 1024 * 1024) { toast('Arquivo grande demais (máx. 5,5 MB).', true); return; }
      const fr = new FileReader();
      fr.onload = () => API.chamar('combImportar', { arquivo: fr.result, nome: f.name }).then(r => { toast('Importado: ' + r.faturas + ' faturas, ' + r.lancamentos + ' lançamentos, ' + r.cadastros + ' cadastros novos'); this.pagId = r.pagamentoId; this.fatId = null; Financeiro.resumoCombCache = null; return this.carregar(r.pagamentoId); }).then(() => App.abrirAba('fin-comb-lanc')).catch(e => toast(e.message || String(e), true));
      fr.readAsDataURL(f);
    };
    inp.click();
  }
};
function hojeLocalDe(x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
