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
    this.tipo = tipo; this.raiz = h('div', { class: 'cb cb-t-' + tipo, onfocusin: e => { if (e.target.id) { this.foco = e.target.id; this.focoT = Date.now(); } }, onkeydown: () => { this.focoT = Date.now(); } }, h('div', { class: 'cb-carr', text: 'Carregando combustível…' }));
    const velho = this.d && Date.now() - (this.t || 0) > 60000, raiz = this.raiz;
    if (velho) setTimeout(() => this.carregar().then(() => { const a = document.activeElement; if (this.raiz === raiz && raiz.isConnected && !$('.overlay.show') && !(a && raiz.contains(a) && a.value)) this.render(); }).catch(() => {}), 50);
    (this.d ? Promise.resolve() : this.carregar()).then(() => this.render()).catch(e => { limpar(this.raiz).append(h('div', { class: 'card' }, h('b', { text: 'Não consegui abrir o Combustível.' }), h('p', { text: e.message || String(e) }), h('button', { class: 'btn', type: 'button', text: 'Tentar de novo', onclick: () => { this.d = null; App.abrirAba(App.aba); } }))); });
    return this.raiz;
  },
  render() {
    if (!this.raiz) return;
    const a0 = document.activeElement, foco = (a0 && a0 !== document.body && a0.id) || (Date.now() - (this.focoT || 0) < 4000 ? this.foco : null);
    limpar(this.raiz);
    if (this.tipo === 'cad') return this.raiz.append(this.telaCadastro());
    this.raiz.append(this.barraPagamento());
    if (!this.d.pagamento) { this.raiz.append(this.vazio()); return; }
    if (this.tipo === 'lanc') this.raiz.append(this.telaLanc());
    else if (this.tipo === 'rel') this.raiz.append(this.telaRel());
    else if (this.tipo === 'etq') this.raiz.append(this.telaEtq());
    if (foco) { const el = document.getElementById(foco); if (el) el.focus({ preventScroll: true }); }
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
    const vis = (v, t) => h('button', { type: 'button', role: 'radio', 'aria-checked': this.todos === v ? 'true' : 'false', class: this.todos === v ? 'on' : '', text: t, onclick: () => { this.todos = v; this.render(); } });
    box.append(h('div', { class: 'cb-ver' }, h('span', { text: 'Na tabela:' }), h('div', { class: 'cb-seg', role: 'radiogroup', 'aria-label': 'Quem aparece na tabela' }, vis(false, 'Só quem abasteceu'), vis(true, 'Todos os cadastrados'))), grade);
    return box;
  },
  formLanc(f) {
    const d = this.d, nome = h('div', { class: 'cb-quem', 'aria-live': 'polite' }), msg = h('div', { class: 'cb-msg', 'aria-live': 'polite' });
    const dl = h('datalist', { id: 'cbPlacas' }, d.cadastro.filter(c => c.ativo !== 'NAO').map(c => h('option', { value: c.placa, text: c.nome + (c.grupo === 'FROTA' ? ' · frota própria' : ' · agregado') })));
    const placa = h('input', { id: 'cbPlaca', class: 'cb-in placa', list: 'cbPlacas', autocomplete: 'off', placeholder: 'Placa ou nome', 'aria-label': 'Placa ou motorista' });
    const valor = h('input', { id: 'cbValor', class: 'cb-in valor', inputmode: 'decimal', autocomplete: 'off', placeholder: '0,00', 'aria-label': 'Valor com desconto' });
    const achar = () => {
      const t = placa.value.trim(), k = this.placaK(t), n = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); if (!t) return null;
      const ativos = d.cadastro.filter(c => c.ativo !== 'NAO');
      return ativos.find(c => this.placaK(c.placa) === k) || (n.length >= 3 ? (x => x.length === 1 ? x[0] : null)(ativos.filter(c => c.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().indexOf(n) >= 0 || this.placaK(c.placa).indexOf(k) >= 0)) : null);
    };
    const mostrar = () => { const c = achar(); nome.className = 'cb-quem' + (c ? ' ok' : placa.value.trim() ? ' nao' : ''); nome.textContent = c ? c.nome + ' · ' + c.placa + (c.grupo === 'FROTA' ? ' · frota própria' : ' · agregado') : placa.value.trim() ? 'Placa não cadastrada' : ''; return c; };
    placa.addEventListener('input', mostrar);
    placa.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (mostrar()) valor.focus(); } });
    const postos = h('div', { class: 'cb-postos', role: 'radiogroup', 'aria-label': 'Posto' }, d.postos.map((p, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': p === this.posto ? 'true' : 'false', class: 'cb-posto' + (p === this.posto ? ' on' : ''), title: 'Alt+' + (i + 1), onclick: () => { this.posto = p; $$('.cb-posto', postos).forEach(b => { const on = b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); placa.focus(); }, dataset: { p } }, h('b', { text: p }), h('small', { text: 'Alt+' + (i + 1) }))));
    const enviar = () => {
      const c = mostrar(), v = this.valorBR(valor.value);
      if (!c) { mensagem(msg, 'Escolha uma placa cadastrada.'); placa.focus(); return; }
      if (!(v > 0)) { mensagem(msg, 'Informe o valor da fatura com desconto.'); valor.focus(); return; }
      const b = $('.cb-lancar', form); b.disabled = true; this.mut++;
      API.chamar('combLancar', { faturaId: f.id, posto: this.posto, cadastroId: c.id, valor: v }, { mudo: true }).then(r => {
        d.lancamentos.push(r.lancamento); Financeiro.resumoCombCache = null; this.recentes.unshift(r.lancamento); this.recentes = this.recentes.slice(0, 8);
        toast(fmtMoeda(v) + ' · ' + c.placa + ' · ' + this.posto); this.render(); const p = $('#cbPlaca'); if (p) p.focus();
      }).catch(e => { b.disabled = false; mensagem(msg, e.message || String(e)); });
    };
    valor.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
    if (!this._atalho) document.addEventListener('keydown', this._atalho = e => {     // Alt+1, Alt+2… troca o posto de qualquer lugar da tela de lançar
      if (!e.altKey || !/^[1-9]$/.test(e.key) || $('.overlay.show')) return; const b = $$('.cb-form .cb-posto')[+e.key - 1]; if (b && b.isConnected) { e.preventDefault(); b.click(); }
    });
    const form = h('div', { class: 'cb-form' },
      postos, h('div', { class: 'cb-campos' }, h('label', { class: 'cb-l' }, h('span', { text: 'Placa' }), placa), h('label', { class: 'cb-l' }, h('span', { text: 'Valor com desconto' }), valor),
        h('button', { class: 'btn cb-lancar', type: 'button', text: 'Lançar', onclick: enviar })), nome, msg, dl,
      (rec => rec.length ? h('div', { class: 'cb-rec' }, h('small', { text: 'Lançados agora' }), rec.map(l => h('span', { class: 'cb-rec-i' }, l.placa + ' · ' + l.posto + ' · ' + fmtMoeda(l.valor), h('button', { type: 'button', class: 'btn-link', text: 'desfazer', onclick: () => this.apagar(l) })))) : null)(this.recentes.filter(l => d.lancamentos.some(x => x.id === l.id))));
    return form;
  },
  tabela(ls, grupo, fids) {
    const d = this.d, postos = d.postos, frota = grupo === 'FROTA';
    let rows = this.linhas(ls, grupo); if (!this.todos) rows = rows.filter(x => x.total > 0);
    const cel = (x, p) => { const v = x.postos[p] || 0; return h('td', { class: 'n' + (v ? '' : ' z') }, v ? h('button', { type: 'button', class: 'cb-v', title: x.ls.filter(l => l.posto === p).length + ' lançamento(s)', onclick: () => this.verLancs(x, p), text: fmtMoeda(v) }) : '—'); };
    let tRobo = 0, tComp = 0;
    const corpo = rows.map(x => {
      const cp = frota ? this.comparar(x, fids) : { robo: 0, comp: 0 }, robo = cp.robo; if (cp.comp) { tRobo += robo; tComp += cp.comp; }   // só soma no total o que dá para comparar (robô leu E houve lançamento)
      return h('tr', {}, h('td', { class: 'nm', text: x.c.nome }), h('td', { class: 'pl', text: x.c.placa }), postos.map(p => cel(x, p)), h('td', { class: 'n t', text: x.total ? fmtMoeda(x.total) : '—' }),
        frota ? h('td', { class: 'n r', text: robo ? fmtMoeda(robo) : '—' }) : null, frota ? h('td', { class: 'n e', text: robo && cp.comp ? fmtMoeda(this.r2(robo - cp.comp)) : '—' }) : null);
    });
    const tot = this.soma(ls, grupo);
    return h('section', { class: 'cb-bloco ' + (frota ? 'fr' : 'ag') },
      h('div', { class: 'cb-bloco-cab' }, h('h4', { text: frota ? 'Frota própria' : 'Agregados' }), h('span', { text: frota ? 'comparado com a fatura lida pelo robô' : 'descontado do agregado' })),
      h('div', { class: 'cb-tab' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Motorista' }), h('th', { text: 'Placa' }), postos.map(p => h('th', { class: 'n', text: p })), h('th', { class: 'n', text: 'Total' }), frota ? h('th', { class: 'n', text: 'Robô (sem desc.)' }) : null, frota ? h('th', { class: 'n', text: 'Economia' }) : null)),
        h('tbody', {}, corpo.length ? corpo : h('tr', {}, h('td', { colspan: postos.length + (frota ? 5 : 3), class: 'vazio', text: 'Nenhum abastecimento lançado.' }))),
        h('tfoot', {}, h('tr', {}, h('td', { colspan: 2, text: 'Total' }), postos.map(p => h('td', { class: 'n', text: fmtMoeda(this.soma(ls, grupo, p)) })), h('td', { class: 'n t', text: fmtMoeda(tot) }),
          frota ? h('td', { class: 'n r', text: tRobo ? fmtMoeda(this.r2(tRobo)) : '—' }) : null, frota ? h('td', { class: 'n e', text: tRobo ? fmtMoeda(this.r2(tRobo - tComp)) : '—' }) : null)))));
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
      box.append(h('label', { class: 'cb-robo-i' + (outra ? ' off' : '') }, cb, h('span', {}, h('b', { text: 'E-mail de ' + this.dt(r.ref.slice(0, 10)) + ' ' + r.ref.slice(11, 16) }), h('small', { text: r.ref.slice(19) }),
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
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas ${e(this.etq.posto)}</title><style>${css}</style></head><body><div class="g">${lista.map(x => `<div class="e">Motorista: <b>${e(x.nome)}</b><br>Placa: <b>${e(x.placa)}</b><br>Total: <b class="v">${e(fmtMoeda(x.total))}</b><div class="p">${e(this.etq.posto)} · ${e(f ? this.nomeFat(f) + ' · ' + this.periodo(f) : '')}</div></div>`).join('')}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  },

  // ---------- cadastro ----------
  telaCadastro() {
    const d = this.d, so = App.sessao.chefe, q = this.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const lista = d.cadastro.filter(c => (!this.grupoCad || c.grupo === this.grupoCad) && (!q || (c.nome + ' ' + c.placa).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().indexOf(q) >= 0));
    const busca = h('input', { id: 'cbBusca', class: 'cb-in', placeholder: 'Buscar nome ou placa', value: this.busca, oninput: e => { this.busca = e.target.value; this.render(); } });
    const filtro = h('div', { class: 'cb-postos' }, [['', 'Todos'], ['AGREGADO', 'Agregados'], ['FROTA', 'Frota própria']].map(([v, t]) => h('button', { type: 'button', class: 'cb-posto' + (this.grupoCad === v ? ' on' : ''), onclick: () => { this.grupoCad = v; this.render(); } }, h('b', { text: t }), h('small', { text: String(d.cadastro.filter(c => !v || c.grupo === v).length) }))));
    const tab = h('div', { class: 'cb-tab' }, h('table', { class: 'cb-cad' }, h('thead', {}, h('tr', {}, h('th', { text: 'Motorista' }), h('th', { text: 'Placa' }), h('th', { text: 'Grupo' }), h('th', { text: 'Situação' }), so ? null : h('th', {}))),
      h('tbody', {}, lista.map(c => h('tr', { class: c.ativo === 'NAO' ? 'inativo' : '' }, h('td', { class: 'nm', text: c.nome }), h('td', { class: 'pl', text: c.placa }), h('td', { text: c.grupo === 'FROTA' ? 'Frota própria' : 'Agregado' }), h('td', { text: c.ativo === 'NAO' ? 'Inativo' : 'Ativo' }),
        so ? null : h('td', { class: 'n' }, h('button', { class: 'btn-link', type: 'button', text: 'Editar', onclick: () => this.editarCad(c) })))))));
    return h('div', { class: 'cb-cadastro' },
      h('div', { class: 'cb-cad-cab' }, h('h3', { text: 'Motoristas e placas' }), busca, filtro, so ? null : h('button', { class: 'btn', type: 'button', text: '+ Cadastrar', onclick: () => this.editarCad() })),
      tab,
      so ? null : h('div', { class: 'cb-cad-pe' },
        h('section', { class: 'cb-box' }, h('h4', { text: 'Postos' }), h('p', { class: 'hint', text: 'Na ordem das colunas da fatura: ' + d.postos.join(', ') + '.' }), h('button', { class: 'btn secondary small', type: 'button', text: 'Editar postos', onclick: () => this.editarPostos() })),
        h('section', { class: 'cb-box' }, h('h4', { text: 'Importar planilha antiga' }), h('p', { class: 'hint', text: 'Traz motoristas, placas e as faturas da FATURA_POSTO (.xlsm). Cada pagamento só pode ser importado uma vez.' }), h('button', { class: 'btn secondary small', type: 'button', text: 'Escolher arquivo', onclick: () => this.importar() }))));
  },
  editarCad(c) {
    const nome = h('input', { maxlength: 60, value: c ? c.nome : '' }), placa = h('input', { maxlength: 12, value: c ? c.placa : '', style: 'text-transform:uppercase' });
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
