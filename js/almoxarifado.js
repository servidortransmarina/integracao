/* Almoxarifado: estoque de peças da oficina, compras (entradas), saídas, contagens e o histórico de preço de cada peça.
   Também fornece o "editor de peças" usado ao lançar manutenção (peça do estoque, comprada à parte ou que veio na nota).
   Tudo é gravado no servidor (Almoxarifado.gs); quantidade, custo médio e último preço são recalculados lá. */
const Almox = {
  UNIDADES: [['un', 'unidade'], ['par', 'par (2 peças)'], ['jogo', 'jogo (conjunto completo)'], ['kit', 'kit'], ['L', 'litro'], ['balde', 'balde'], ['galão', 'galão'], ['m', 'metro'], ['kg', 'quilo'], ['cx', 'caixa']],
  AREAS: ['Motor', 'Filtros', 'Lubrificantes', 'Freio', 'Suspensão', 'Direção', 'Elétrica', 'Iluminação', 'Arrefecimento', 'Transmissão', 'Pneus e rodas', 'Carroceria', 'Cabine', 'Ar e pneumática', 'Ferramentas', 'Limpeza'],
  /** Campo de texto sem o preenchimento automático do navegador (endereço, nome...). */
  txt(a) { return h('input', Object.assign({ type: 'text', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', name: 'ax_' + Math.random().toString(36).slice(2, 9), 'data-lpignore': 'true', 'data-form-type': 'other' }, a)); },
  fontePecas() { return this.pecas().map(p => ({ v: p.nome, d: [this.num(this.qtd(p)) + ' ' + this.un(p), p.marca, p.categoria, p.localizacao ? '📍 ' + p.localizacao : ''].filter(Boolean).join(' · ') })); },
  fonteForn() { return this.fornecedores(); },
  fonteAreas() { return Array.from(new Set(this.todasPecas().map(p => p.categoria).filter(Boolean).concat(this.AREAS))).sort((a, b) => a.localeCompare(b, 'pt-BR')); },
  fonteMarcas() { return Array.from(new Set(this.todasPecas().map(p => p.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')); },
  /** Sugestões enquanto digita (igual ao campo de nomes do Ponto): lista embaixo do campo, setas para escolher, Enter confirma, Esc fecha. */
  ac(input, fonte, aoEscolher) { return sugestoes(input, fonte, { aoEscolher }); },
  /** Campos de peça nova (unidade, área, marca): aparecem só quando a peça digitada ainda não está no almoxarifado. */
  extrasNova(d) {
    d = d || {};
    const un = this.selUnidade(d.unidade || 'un'), area = this.txt({ maxlength: 40, placeholder: 'Ex.: Freio, Elétrica', value: d.categoria || '', 'aria-label': 'Área' }), marca = this.txt({ maxlength: 40, placeholder: 'Ex.: Mann, Bosch', value: d.marca || '', 'aria-label': 'Marca' });
    const tit = h('span', { class: 'ax-nova-t', text: 'Peça nova:' }), lUn = h('label', {}, 'Unidade', un);
    const el = h('div', { class: 'ax-nova', hidden: true }, tit, lUn, h('label', {}, 'Área', this.ac(area, () => this.fonteAreas())), h('label', {}, 'Marca', this.ac(marca, () => this.fonteMarcas())));
    let deQuem = null;
    return { el, dados: () => ({ unidade: un.value, categoria: area.value.trim(), marca: marca.value.trim() }), mostrar: v => { el.hidden = !v; },
      /** Peça que já existe: mostra a área e a marca do cadastro (dá para corrigir); a unidade não muda aqui. */
      existente: p => { lUn.hidden = !!p; tit.textContent = p ? 'Área e marca:' : 'Peça nova:';
        if (p && deQuem !== p.id) { if (!d.categoria || deQuem) area.value = p.categoria || ''; if (!d.marca || deQuem) marca.value = p.marca || ''; }
        if (!p && deQuem) { area.value = ''; marca.value = ''; }
        deQuem = p ? p.id : null; } };
  },
  selUnidade(atual) { return h('select', { 'aria-label': 'Unidade' }, this.UNIDADES.map(([u, t]) => h('option', { value: u, text: u === t ? u : u + ' — ' + t, selected: (atual || 'un') === u ? true : null }))); },
  aba: 'estoque', busca: '', filtro: '', buscaMov: '', tipoMov: '', limiteMov: 150,

  // ---------- dados ----------
  pecas() { return ((App.dados && App.dados.pecas) || []).filter(p => String(p.ativo || 'SIM').toUpperCase() !== 'NAO'); },
  todasPecas() { return (App.dados && App.dados.pecas) || []; },
  movs() { return (App.dados && App.dados.movEstoque) || []; },
  k: n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
  porNome(nome) { const k = this.k(nome); return k ? this.todasPecas().find(p => this.k(p.nome) === k) || null : null; },
  porId(id) { return this.todasPecas().find(p => String(p.id) === String(id)) || null; },
  qtd: p => Number(p && p.quantidade) || 0,
  min: p => Number(p && p.estoqueMinimo) || 0,
  un: p => (p && p.unidade) || 'un',
  r2: v => Math.round((Number(v) || 0) * 100) / 100,
  moeda: v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  num: v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 }),
  valor(s) { s = String(s == null ? '' : s).replace(/[R$\s]/g, ''); if (!s) return NaN; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return Number(s); },
  dt: iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—',
  hoje() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  novoId: p => (p || 'ax') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  podeApagar() { return ['master', 'admin'].indexOf(App.sessao.perfil) >= 0 && !App.sessao.chefe; },
  soLeitura() { return !!(App.sessao && App.sessao.chefe); },
  /** Situação do estoque: sem (zerado), baixo (no mínimo ou abaixo), ok. Peça sem mínimo definido nunca fica "baixa". */
  situacao(p) { const q = this.qtd(p), m = this.min(p); if (m > 0 && q <= 0) return 'sem'; if (m > 0 && q <= m) return 'baixo'; return 'ok'; },
  baixas() { return this.pecas().filter(p => this.situacao(p) !== 'ok'); },
  fornecedores() { const s = new Set(); this.movs().forEach(m => { if (m.fornecedor && String(m.fornecedor).toLowerCase() !== 'oficina') s.add(String(m.fornecedor)); }); return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR')); },
  /** Compras (com preço) de uma peça, mais nova primeiro. */
  compras(pid) { return this.recentes(this.movs().filter(m => String(m.pecaId) === String(pid) && m.tipo === 'ENTRADA' && Number(m.valorUnit) > 0)); },
  /** Mais novo primeiro: data, hora do lançamento e, no empate, a ordem da planilha. */
  recentes(lista) { return lista.map((m, i) => [m, i]).sort((a, b) => (String(b[0].data).slice(0, 10) + String(b[0].criadoEm)).localeCompare(String(a[0].data).slice(0, 10) + String(a[0].criadoEm)) || b[1] - a[1]).map(x => x[0]); },
  mediana(arr) { const a = arr.slice().sort((x, y) => x - y), n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0; },
  /** Preço "normal" de uma peça: a mediana das compras (uma compra digitada errada não puxa a referência). */
  refPreco(p, ignorarId) { if (!p) return 0; const v = this.compras(p.id).filter(m => m.id !== ignorarId).map(m => Number(m.valorUnit)); return v.length ? this.mediana(v) : 0; },
  /** Valor unitário muito fora do normal: pode ser o TOTAL digitado no lugar do unitário. Devolve {msg, sugerido} ou null. */
  checarPreco(p, vu, qtd) {
    const ref = this.refPreco(p); vu = Number(vu) || 0; qtd = Number(qtd) || 0;
    if (!ref || !vu) return null;
    if (qtd > 1 && Math.abs(vu / qtd - ref) <= ref * 0.4) return { msg: 'R$ ' + this.num(this.r2(vu)) + ' por unidade é ' + this.num(Math.round(vu / ref * 10) / 10) + '× o preço normal (' + this.moeda(ref) + '). Parece o valor TOTAL de ' + this.num(qtd) + ' unidades.', sugerido: this.r2(vu / qtd) };
    if (vu > ref * 2.5) return { msg: 'Preço ' + this.num(Math.round(vu / ref * 10) / 10) + '× acima do normal (' + this.moeda(ref) + ' por ' + this.un(p) + '). Confira se é o valor de UMA unidade.' };
    if (vu < ref / 2.5) return { msg: 'Preço bem abaixo do normal (' + this.moeda(ref) + ' por ' + this.un(p) + '). Confira o valor.' };
    return null;
  },
  /** Datalists compartilhados (nomes de peças e lojas), atualizados a cada abertura de formulário. */
  listas() {
    const mk = (id, vals) => { let dl = document.getElementById(id); if (!dl) { dl = h('datalist', { id }); document.body.append(dl); } limpar(dl).append(...vals.map(v => h('option', { value: v }))); };
    mk('dlAxPecas', this.pecas().map(p => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    mk('dlAxForn', this.fornecedores());
  },
  async chamar(acao, dados, btn) {
    if (btn) btn.disabled = true;
    try { const r = await API.chamar(acao, dados); if (!r.patch) await App.recarregar(true); return r; }
    finally { if (btn) btn.disabled = false; }
  },

  // ---------- telas ----------
  tela(aba) {
    this.aba = aba || this.aba;
    const raiz = h('div', { class: 'ax' });
    if (!App.dados || !Array.isArray(App.dados.pecas)) { raiz.append(h('div', { class: 'card' }, h('b', { text: 'O Almoxarifado ainda não está pronto no servidor.' }), h('p', { class: 'hint', text: 'Peça para o responsável publicar a versão nova do Apps Script e rodar o prepararBanco.' }))); return raiz; }
    if (this.aba === 'mov') raiz.append(this.telaMov()); else if (this.aba === 'precos') raiz.append(this.telaPrecos()); else raiz.append(this.telaEstoque());
    return raiz;
  },
  selo(p) {
    const s = this.situacao(p);
    return s === 'sem' ? h('span', { class: 'ax-selo sem', text: 'Sem estoque' }) : s === 'baixo' ? h('span', { class: 'ax-selo baixo', text: 'Estoque baixo' }) : null;
  },
  telaEstoque() {
    const todas = this.pecas(), baixas = this.baixas(), valorTotal = todas.reduce((t, p) => t + Math.max(0, this.qtd(p)) * (Number(p.custoUnit) || 0), 0);
    const q = this.k(this.busca);
    const lista = todas.filter(p => (!q || this.k(p.nome + ' ' + (p.marca || '') + ' ' + (p.codigo || '') + ' ' + (p.categoria || '') + ' ' + (p.localizacao || '')).includes(q)) && (!this.filtro || (this.filtro === 'baixo' ? this.situacao(p) !== 'ok' : this.situacao(p) === 'sem')))
      .sort((a, b) => { const o = { sem: 0, baixo: 1, ok: 2 }; return (o[this.situacao(a)] - o[this.situacao(b)]) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
    const busca = h('input', { type: 'search', autocomplete: 'off', id: 'axBusca', class: 'ax-busca', placeholder: 'Buscar peça, marca, código ou local…', value: this.busca, 'aria-label': 'Buscar peça' });
    busca.oninput = () => { this.busca = busca.value; const pos = busca.selectionStart; App.abrirAba(App.aba); const b = $('#axBusca'); if (b) { b.focus(); try { b.setSelectionRange(pos, pos); } catch (e) {} } };
    const filtroBtn = (v, t, n) => h('button', { type: 'button', class: 'ax-filtro' + (this.filtro === v ? ' on' : ''), 'aria-pressed': this.filtro === v ? 'true' : 'false', onclick: () => { this.filtro = v; App.abrirAba(App.aba); } }, t, n != null ? h('b', { text: String(n) }) : null);
    const topo = h('div', { class: 'ax-topo' },
      h('div', { class: 'ax-resumo' },
        h('div', {}, h('b', { text: String(todas.length) }), h('span', { text: todas.length === 1 ? 'peça cadastrada' : 'peças cadastradas' })),
        h('div', { class: baixas.length ? 'alerta' : '' }, h('b', { text: String(baixas.length) }), h('span', { text: 'com estoque baixo' })),
        h('div', {}, h('b', { text: this.moeda(valorTotal) }), h('span', { text: 'em estoque (custo médio)' }))),
      this.soLeitura() ? null : h('div', { class: 'ax-acoes' },
        h('button', { type: 'button', class: 'btn', id: 'axEntrada', text: '＋ Entrada de compra', onclick: () => this.abrirEntrada() }),
        h('button', { type: 'button', class: 'btn secondary', id: 'axInventario', text: '📋 Lançar estoque atual', title: 'Peças que já estão na prateleira (várias de uma vez)', onclick: () => this.abrirInventario() }),
        h('button', { type: 'button', class: 'btn secondary', id: 'axNova', text: 'Cadastrar peça', onclick: () => this.abrirPeca(null) })));
    const barra = h('div', { class: 'ax-barra' }, busca, h('div', { class: 'ax-filtros', role: 'group', 'aria-label': 'Mostrar' }, filtroBtn('', 'Todas'), filtroBtn('baixo', 'Estoque baixo', baixas.length), filtroBtn('sem', 'Sem estoque', todas.filter(p => this.situacao(p) === 'sem').length)));
    if (!todas.length) return h('div', {}, topo, h('div', { class: 'card ax-vazio' }, h('h3', { text: 'Nenhuma peça cadastrada ainda' }),
      h('p', { text: 'Comece lançando o que já está na prateleira: uma linha por peça, com quantas tem hoje. Dá até para colar uma lista do Excel. Depois, cada compra entra pela "Entrada de compra", e as peças usadas na manutenção saem daqui sozinhas.' }),
      this.soLeitura() ? null : h('button', { type: 'button', class: 'btn', text: '📋 Lançar estoque atual', onclick: () => this.abrirInventario() })));
    const linhas = lista.map(p => {
      const ult = p.ultimoPreco > 0 ? h('div', {}, this.moeda(p.ultimoPreco), h('small', { text: this.dt(p.ultimaCompra) + (p.ultimoFornecedor ? ' · ' + p.ultimoFornecedor : '') })) : h('span', { class: 'ax-dim', text: '—' });
      const acoes = this.soLeitura() ? h('td') : h('td', { class: 'ax-tdacoes' },
        h('button', { type: 'button', class: 'btn small secondary', text: 'Saída', title: 'Tirar do estoque', onclick: e => { e.stopPropagation(); this.abrirSaida(p); } }),
        h('button', { type: 'button', class: 'btn small secondary', text: 'Contar', title: 'Corrigir a quantidade pela contagem da prateleira', onclick: e => { e.stopPropagation(); this.abrirContagem(p); } }));
      return h('tr', { class: 'ax-lin ' + this.situacao(p), tabindex: '0', onclick: () => this.abrirPeca(p), onkeydown: e => { if (e.key === 'Enter') this.abrirPeca(p); } },
        h('td', { class: 'ax-nome' }, h('b', { text: p.nome }), h('small', { text: [p.marca, p.codigo, p.categoria, p.localizacao ? '📍 ' + p.localizacao : ''].filter(Boolean).join(' · ') })),
        h('td', { class: 'ax-q' }, h('b', { text: this.num(this.qtd(p)) + ' ' + this.un(p) }), this.selo(p), this.min(p) ? h('small', { text: 'mínimo ' + this.num(this.min(p)) }) : null),
        h('td', { class: 'ax-n', dataset: { rot: 'Custo médio' } }, Number(p.custoUnit) > 0 ? this.moeda(p.custoUnit) : h('span', { class: 'ax-dim', text: '—' })),
        h('td', { class: 'ax-n ax-ult', dataset: { rot: 'Último preço' } }, ult), acoes);
    });
    const tabela = h('div', { class: 'card ax-card' }, h('div', { class: 'ax-tab' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: 'Peça' }), h('th', { text: 'Em estoque' }), h('th', { class: 'ax-n', text: 'Custo médio' }), h('th', { class: 'ax-n', text: 'Último preço' }), h('th'))),
      h('tbody', {}, linhas.length ? linhas : h('tr', {}, h('td', { colspan: '5', class: 'ax-vazio-l', text: 'Nenhuma peça com esse filtro.' }))))));
    return h('div', {}, topo, barra, tabela);
  },
  rotuloMov(m) {
    if (m.tipo === 'ENTRADA') return m.origem === 'nota' ? 'Veio na nota' : 'Entrada';
    if (m.tipo === 'SAIDA') return m.manutencaoId ? 'Usada em manutenção' : 'Saída';
    return m.origem === 'inventario' ? 'Estoque atual (inventário)' : 'Contagem';
  },
  linhaMov(m, comPeca) {
    const p = this.porId(m.pecaId), q = Number(m.quantidade) || 0, sinal = m.tipo === 'SAIDA' ? -1 : 1, qq = sinal * q;
    const extra = [m.placa ? '🚛 ' + m.placa : '', m.fornecedor ? '🏪 ' + m.fornecedor : '', m.notaNum ? 'nota ' + m.notaNum : '', m.obs || '', m.nome ? 'por ' + m.nome : ''].filter(Boolean).join(' · ');
    const del = this.podeApagar() && !m.manutencaoId ? h('button', { type: 'button', class: 'ax-del', title: 'Apagar esta movimentação', 'aria-label': 'Apagar esta movimentação', text: '✕', onclick: e => { e.stopPropagation(); this.apagarMov(m, e.currentTarget); } }) : null;
    return h('div', { class: 'ax-mov ' + (qq < 0 ? 'sai' : 'ent') },
      h('div', { class: 'ax-mov-q', text: (qq > 0 ? '+' : '') + this.num(qq) }),
      h('div', { class: 'ax-mov-t' }, h('b', { text: (comPeca ? (p ? p.nome : 'Peça apagada') + ' — ' : '') + this.rotuloMov(m) }), h('small', { text: this.dt(m.data) + (Number(m.valorUnit) > 0 ? ' · ' + this.moeda(m.valorUnit) + '/' + this.un(p) : '') + (extra ? ' · ' + extra : '') })), del);
  },
  async apagarMov(m, btn) {
    if (!btn.dataset.conf) { btn.dataset.conf = '1'; btn.textContent = 'Apagar?'; btn.classList.add('conf'); setTimeout(() => { if (btn.isConnected) { delete btn.dataset.conf; btn.textContent = '✕'; btn.classList.remove('conf'); } }, 4000); return; }
    try { await this.chamar('almoxExcluirMov', { id: m.id }, btn); toast('Movimentação apagada. O estoque foi recalculado.'); } catch (e) { toast(e.message, true); }
  },
  telaMov() {
    const q = this.k(this.buscaMov), todos = this.recentes(this.movs());
    const lista = todos.filter(m => (!this.tipoMov || (this.tipoMov === 'manut' ? !!m.manutencaoId : m.tipo === this.tipoMov)) && (!q || this.k([(this.porId(m.pecaId) || {}).nome, m.placa, m.fornecedor, m.notaNum, m.obs, m.nome].join(' ')).includes(q)));
    const busca = h('input', { type: 'search', autocomplete: 'off', id: 'axBuscaMov', class: 'ax-busca', placeholder: 'Buscar peça, placa, loja ou nota…', value: this.buscaMov, 'aria-label': 'Buscar movimentação' });
    busca.oninput = () => { this.buscaMov = busca.value; const pos = busca.selectionStart; App.abrirAba(App.aba); const b = $('#axBuscaMov'); if (b) { b.focus(); try { b.setSelectionRange(pos, pos); } catch (e) {} } };
    const sel = h('select', { 'aria-label': 'Tipo de movimentação', onchange: e => { this.tipoMov = e.target.value; App.abrirAba(App.aba); } },
      [['', 'Todas'], ['ENTRADA', 'Entradas (compras)'], ['SAIDA', 'Saídas'], ['manut', 'Usadas em manutenção'], ['AJUSTE', 'Contagens']].map(([v, t]) => h('option', { value: v, text: t, selected: this.tipoMov === v ? true : null })));
    const mostrar = lista.slice(0, this.limiteMov);
    return h('div', {}, h('div', { class: 'ax-barra' }, busca, sel),
      h('div', { class: 'card ax-card' }, mostrar.length ? mostrar.map(m => this.linhaMov(m, true)) : h('p', { class: 'ax-vazio-l', text: todos.length ? 'Nada com esse filtro.' : 'Nenhuma movimentação ainda.' }),
        lista.length > mostrar.length ? h('button', { type: 'button', class: 'btn secondary ax-mais', text: 'Mostrar mais (' + (lista.length - mostrar.length) + ')', onclick: () => { this.limiteMov += 300; App.abrirAba(App.aba); } }) : null));
  },
  /** Preço de cada peça: média, último, menor e maior — e se o último está fora do normal. */
  telaPrecos() {
    const linhas = this.todasPecas().map(p => {
      const cs = this.compras(p.id); if (!cs.length) return null;
      const vs = cs.map(m => Number(m.valorUnit)), qs = cs.reduce((t, m) => t + Number(m.quantidade), 0), medio = cs.reduce((t, m) => t + Number(m.quantidade) * Number(m.valorUnit), 0) / (qs || 1);
      const ult = cs[0], ref = this.refPreco(p, ult.id), fora = cs.length > 1 && ref && (Number(ult.valorUnit) > ref * 2.5 || Number(ult.valorUnit) < ref / 2.5);
      const varia = cs.length > 1 && ref ? (Number(ult.valorUnit) - ref) / ref : null;
      return { p, cs, medio, ult, min: Math.min(...vs), max: Math.max(...vs), fora, varia };
    }).filter(Boolean).sort((a, b) => (b.fora - a.fora) || String(a.p.nome).localeCompare(String(b.p.nome), 'pt-BR'));
    if (!linhas.length) return h('div', { class: 'card ax-vazio' }, h('h3', { text: 'Ainda não há compras com preço' }), h('p', { text: 'Os preços aparecem aqui conforme as compras forem lançadas (entrada de compra ou peça comprada ao lançar manutenção).' }));
    return h('div', { class: 'card ax-card' }, h('p', { class: 'hint ax-dica', text: 'Preço por unidade de cada compra. "Fora do normal" = o último preço ficou mais de 2,5× acima ou abaixo do que costuma ser — pode ter sido digitado o valor total no lugar do unitário.' }),
      h('div', { class: 'ax-tab' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'Peça' }), h('th', { class: 'ax-n', text: 'Preço médio' }), h('th', { class: 'ax-n', text: 'Último preço' }), h('th', { class: 'ax-n', text: 'Menor · maior' }), h('th', { class: 'ax-n', text: 'Compras' }))),
        h('tbody', {}, linhas.map(x => h('tr', { class: 'ax-lin' + (x.fora ? ' fora' : ''), tabindex: '0', onclick: () => this.abrirPeca(x.p), onkeydown: e => { if (e.key === 'Enter') this.abrirPeca(x.p); } },
          h('td', { class: 'ax-nome' }, h('b', { text: x.p.nome }), x.fora ? h('span', { class: 'ax-selo baixo', text: 'Fora do normal' }) : null),
          h('td', { class: 'ax-n', dataset: { rot: 'Preço médio' }, text: this.moeda(x.medio) }),
          h('td', { class: 'ax-n', dataset: { rot: 'Último preço' } }, h('div', {}, this.moeda(x.ult.valorUnit), x.varia != null && Math.abs(x.varia) >= 0.05 ? h('small', { class: x.varia > 0 ? 'sobe' : 'desce', text: (x.varia > 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(x.varia) * 100) + '% do normal' }) : null, h('small', { text: this.dt(x.ult.data) + (x.ult.fornecedor ? ' · ' + x.ult.fornecedor : '') }))),
          h('td', { class: 'ax-n', dataset: { rot: 'Menor · maior' }, text: this.moeda(x.min) + ' · ' + this.moeda(x.max) }),
          h('td', { class: 'ax-n', dataset: { rot: 'Compras' }, text: String(x.cs.length) })))))));
  },

  // ---------- janelas ----------
  campo(rot, el, dica) { return h('div', { class: 'field' }, h('label', { text: rot }), el, dica ? h('small', { class: 'hint', text: dica }) : null); },
  abrirPeca(p) {
    this.listas();
    const v = (k, d) => p ? (p[k] == null ? d : p[k]) : d;
    const nome = this.txt({ maxlength: 80, value: v('nome', ''), placeholder: 'Ex.: Filtro de óleo PSL 76' }), codigo = this.txt({ maxlength: 30, value: v('codigo', ''), placeholder: 'Opcional' });
    const cat = this.txt({ maxlength: 40, value: v('categoria', ''), placeholder: 'Ex.: Freio, Elétrica, Motor' }), marca = this.txt({ maxlength: 40, value: v('marca', ''), placeholder: 'Ex.: Mann, Bosch' });
    const un = this.selUnidade(v('unidade', 'un'));
    const min = this.txt({ inputmode: 'decimal', value: v('estoqueMinimo', '') ? String(v('estoqueMinimo', '')).replace('.', ',') : '', placeholder: 'Ex.: 3' });
    const local = this.txt({ maxlength: 60, value: v('localizacao', ''), placeholder: 'Ex.: Prateleira B2' });
    const ini = p ? null : this.txt({ inputmode: 'decimal', placeholder: '0' });
    const ativo = p ? h('label', { class: 'ax-check' }, h('input', { type: 'checkbox', checked: String(v('ativo', 'SIM')).toUpperCase() !== 'NAO' ? true : null }), ' Peça em uso (desmarque para esconder da lista)') : null;
    const msg = h('div', { class: 'msg' }), salvar = h('button', { type: 'button', class: 'btn', text: p ? 'Salvar alterações' : 'Cadastrar peça' });
    const ro = this.soLeitura();
    const form = h('div', { class: 'ax-form' }, this.campo('Nome da peça *', nome), h('div', { class: 'row' }, this.campo('Marca', this.ac(marca, () => this.fonteMarcas())), this.campo('Código', codigo), this.campo('Unidade', un)),
      h('div', { class: 'row' }, this.campo('Área (onde é usada)', this.ac(cat, () => this.fonteAreas())), this.campo('Estoque mínimo', min, 'Abaixo disso aparece "estoque baixo" aqui e no Painel.'), this.campo('Onde fica', local)),
      ini ? this.campo('Quantas tem na prateleira hoje?', ini, 'Opcional. Entra como contagem inicial.') : null, ativo, msg, ro ? null : h('div', { class: 'modal-actions' }, salvar));
    const corpo = h('div', {}, form);
    if (p) {
      const cs = this.compras(p.id), ref = this.refPreco(p);
      corpo.append(h('div', { class: 'ax-sec' }, h('h4', { text: 'Estoque' }), h('p', { class: 'ax-grande' }, h('b', { text: this.num(this.qtd(p)) + ' ' + this.un(p) }), ' ', this.selo(p), Number(p.custoUnit) > 0 ? h('small', { text: ' · custo médio ' + this.moeda(p.custoUnit) }) : null)));
      if (cs.length) corpo.append(h('div', { class: 'ax-sec' }, h('h4', { text: 'Preço nas compras' }),
        h('div', { class: 'ax-precos' }, cs.slice(0, 12).map(m => { const r = this.refPreco(p, m.id), fora = cs.length > 1 && r && (Number(m.valorUnit) > r * 2.5 || Number(m.valorUnit) < r / 2.5);
          return h('div', { class: 'ax-preco' + (fora ? ' fora' : '') }, h('b', { text: this.moeda(m.valorUnit) }), h('span', { text: this.dt(m.data) + ' · ' + this.num(m.quantidade) + ' ' + this.un(p) + (m.fornecedor ? ' · ' + m.fornecedor : '') }), fora ? h('em', { text: 'fora do normal' }) : null); })),
        ref ? h('small', { class: 'hint', text: 'Preço normal (mediana): ' + this.moeda(ref) }) : null));
      const ms = this.recentes(this.movs().filter(m => String(m.pecaId) === String(p.id)));
      corpo.append(h('div', { class: 'ax-sec' }, h('h4', { text: 'Movimentações' }), ms.length ? ms.slice(0, 30).map(m => this.linhaMov(m, false)) : h('p', { class: 'hint', text: 'Nenhuma ainda.' })));
    }
    const md = abrirModal(p ? p.nome : 'Cadastrar peça', corpo, { largo: !!p });
    if (ro) form.querySelectorAll('input,select').forEach(i => { i.disabled = true; });
    if (!p) nome.focus();
    salvar.onclick = async () => {
      const d = { id: p ? p.id : '', nome: nome.value.trim(), codigo: codigo.value.trim(), categoria: cat.value.trim(), marca: marca.value.trim(), unidade: un.value, estoqueMinimo: min.value.trim() ? this.valor(min.value) : 0, localizacao: local.value.trim(), ativo: ativo && !ativo.querySelector('input').checked ? 'NAO' : 'SIM' };
      if (d.nome.length < 2) { mensagem(msg, 'Diga o nome da peça.'); return nome.focus(); }
      if (isNaN(d.estoqueMinimo) || d.estoqueMinimo < 0) { mensagem(msg, 'Estoque mínimo inválido.'); return min.focus(); }
      if (ini && ini.value.trim()) { d.qtdInicial = this.valor(ini.value); if (isNaN(d.qtdInicial) || d.qtdInicial < 0) { mensagem(msg, 'Quantidade inválida.'); return ini.focus(); } }
      try { await this.chamar('almoxPecaSalvar', d, salvar); md.fechar(); toast(p ? 'Peça atualizada.' : 'Peça cadastrada.'); } catch (e) { mensagem(msg, e.message); }
    };
  },
  abrirSaida(p) {
    const qtd = this.txt({ inputmode: 'decimal', placeholder: '1', value: '1' });
    const placas = ((typeof db !== 'undefined' && db.veiculos) || (App.dados.veiculos || [])).map(v => v.placa).sort();
    const placa = h('select', {}, h('option', { value: '', text: 'Nenhum (uso na oficina)' }), placas.map(x => h('option', { value: x, text: x })));
    const obs = this.txt({ maxlength: 200, placeholder: 'Ex.: reserva no caminhão, perda, devolução' });
    const msg = h('div', { class: 'msg' }), ok = h('button', { type: 'button', class: 'btn', text: 'Tirar do estoque' });
    const md = abrirModal('Saída — ' + p.nome, h('div', { class: 'ax-form' },
      h('p', { class: 'hint', text: 'Tem ' + this.num(this.qtd(p)) + ' ' + this.un(p) + '. Peça usada em manutenção? Lance pela manutenção do caminhão (botão "Usou peças?") — ela sai daqui sozinha.' }),
      h('div', { class: 'row' }, this.campo('Quantidade', qtd), this.campo('Caminhão', placa)), this.campo('Motivo', obs), msg, h('div', { class: 'modal-actions' }, ok)));
    qtd.focus(); qtd.select();
    ok.onclick = async () => {
      const q = this.valor(qtd.value); if (!(q > 0)) { mensagem(msg, 'Diga a quantidade.'); return qtd.focus(); }
      if (q > this.qtd(p)) { mensagem(msg, 'O estoque tem só ' + this.num(this.qtd(p)) + ' ' + this.un(p) + '. Se a prateleira tem mais, use "Contar" primeiro.'); return qtd.focus(); }
      try { await this.chamar('almoxSaida', { id: this.novoId('sai'), pecaId: p.id, quantidade: q, placa: placa.value, obs: obs.value.trim(), data: this.hoje() }, ok); md.fechar(); toast('Saída registrada.'); } catch (e) { mensagem(msg, e.message); }
    };
  },
  abrirContagem(p) {
    const cont = this.txt({ inputmode: 'decimal', placeholder: this.num(this.qtd(p)) });
    const dif = h('p', { class: 'ax-dif' }), obs = this.txt({ maxlength: 200, placeholder: 'Opcional' });
    const msg = h('div', { class: 'msg' }), ok = h('button', { type: 'button', class: 'btn', text: 'Corrigir o estoque' });
    cont.oninput = () => { const c = this.valor(cont.value), d = c - this.qtd(p); dif.textContent = isNaN(c) || !cont.value.trim() ? '' : d === 0 ? 'Bate com o sistema.' : 'Diferença: ' + (d > 0 ? '+' : '') + this.num(d) + ' ' + this.un(p); dif.className = 'ax-dif' + (d < 0 ? ' neg' : d > 0 ? ' pos' : ''); };
    const md = abrirModal('Contar — ' + p.nome, h('div', { class: 'ax-form' }, h('p', { class: 'hint', text: 'O sistema diz ' + this.num(this.qtd(p)) + ' ' + this.un(p) + '. Conte na prateleira e digite quantas tem de verdade.' }),
      this.campo('Quantas tem agora?', cont), dif, this.campo('Observação', obs), msg, h('div', { class: 'modal-actions' }, ok)));
    cont.focus();
    ok.onclick = async () => {
      const c = this.valor(cont.value); if (isNaN(c) || c < 0 || !cont.value.trim()) { mensagem(msg, 'Digite a quantidade contada.'); return cont.focus(); }
      try { const r = await this.chamar('almoxAjuste', { id: this.novoId('aju'), pecaId: p.id, contagem: c, obs: obs.value.trim() }, ok); md.fechar(); toast(r.semMudanca ? 'Já estava certo.' : 'Estoque corrigido.'); } catch (e) { mensagem(msg, e.message); }
    };
  },
  /** Entrada de compra: uma nota de autopeças com várias peças. Peça nova é cadastrada na hora. */
  abrirEntrada() {
    this.listas();
    const data = h('input', { type: 'date', value: this.hoje() }), forn = this.txt({ maxlength: 60, placeholder: 'Ex.: Autopeças Sul' }), nota = this.txt({ maxlength: 30, placeholder: 'Opcional' });
    const linhas = h('div', { class: 'ax-ent-linhas' }), tot = h('div', { class: 'ax-ent-tot' }), msg = h('div', { class: 'msg' }), ok = h('button', { type: 'button', class: 'btn', text: 'Dar entrada' });
    const rows = [];
    const somar = () => { const t = rows.reduce((s, r) => s + (r.q() * r.v() || 0), 0); tot.textContent = 'Total da compra: ' + this.moeda(t); };
    const nova = () => {
      const peca = this.txt({ maxlength: 80, placeholder: 'Peça', 'aria-label': 'Peça' }), ex = this.extrasNova(), qtd = this.txt({ inputmode: 'decimal', placeholder: 'Quantidade', 'aria-label': 'Quantidade' });
      const vu = this.txt({ inputmode: 'decimal', placeholder: 'R$ de UMA unidade', 'aria-label': 'Valor por unidade' }), sub = h('span', { class: 'ax-sub' }), aviso = h('div', { class: 'ax-aviso', hidden: true });
      const x = h('button', { type: 'button', class: 'ax-x', 'aria-label': 'Tirar esta peça', text: '✕' });
      const r = { peca, ex, q: () => this.valor(qtd.value), v: () => this.valor(vu.value), aviso, ok: true };
      const checar = () => { ex.mostrar(peca.value.trim().length > 1 && !this.porNome(peca.value)); sub.textContent = r.q() > 0 && r.v() >= 0 ? '= ' + this.moeda(r.q() * r.v()) : ''; const p = this.porNome(peca.value), c = p ? this.checarPreco(p, r.v(), r.q()) : null; r.ok = !c; this.mostrarAviso(aviso, c, vu, () => { checar(); somar(); }); somar(); };
      [peca, qtd, vu].forEach(i => i.addEventListener('input', checar));
      const el = h('div', { class: 'ax-ent-lin' }, this.ac(peca, () => this.fontePecas()), qtd, vu, sub, x, ex.el, aviso); rows.push(r); linhas.append(el);
      x.onclick = () => { if (rows.length === 1) return; rows.splice(rows.indexOf(r), 1); el.remove(); somar(); };
      vu.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nova().focus(); } });
      return peca;
    };
    nova();
    const md = abrirModal('Entrada de compra', h('div', { class: 'ax-form' },
      h('div', { class: 'row' }, this.campo('Data', data), this.campo('Onde comprou *', this.ac(forn, () => this.fonteForn())), this.campo('Nº da nota', nota)),
      h('div', { class: 'ax-ent-cab' }, h('span', { text: 'Peça' }), h('span', { text: 'Qtd' }), h('span', { text: 'Valor de UMA unidade' })),
      linhas, h('button', { type: 'button', class: 'btn secondary small', text: '＋ Outra peça', onclick: () => nova().focus() }), tot, msg, h('div', { class: 'modal-actions' }, ok)), { largo: true });
    forn.focus(); somar();
    ok.onclick = async () => {
      if (!forn.value.trim()) { mensagem(msg, 'Diga onde foi comprado.'); return forn.focus(); }
      const itens = [];
      for (const r of rows) {
        const nomeP = r.peca.value.trim(); if (!nomeP && !r.q() && !r.v()) continue;
        if (nomeP.length < 2) { mensagem(msg, 'Diga o nome de cada peça.'); return r.peca.focus(); }
        if (!(r.q() > 0)) { mensagem(msg, 'Quantidade de "' + nomeP + '" inválida.'); return r.peca.focus(); }
        if (isNaN(r.v()) || r.v() < 0) { mensagem(msg, 'Valor de "' + nomeP + '" inválido.'); return r.peca.focus(); }
        const p = this.porNome(nomeP); itens.push(p ? { pecaId: p.id, quantidade: r.q(), valorUnit: r.v() } : Object.assign({ nome: nomeP, quantidade: r.q(), valorUnit: r.v() }, r.ex.dados()));
      }
      if (!itens.length) { mensagem(msg, 'Coloque pelo menos uma peça.'); return; }
      if (rows.some(r => !r.ok) && !(await confirmarCustom('Preço fora do normal', 'Tem peça com valor bem diferente do que costuma custar. Confirma que digitou o valor de UMA unidade?'))) return;
      try { await this.chamar('almoxEntrada', { id: this.novoId('ent'), data: data.value || this.hoje(), fornecedor: forn.value.trim(), notaNum: nota.value.trim(), itens }, ok); md.fechar(); toast(itens.length + (itens.length > 1 ? ' peças entraram' : ' peça entrou') + ' no estoque.'); }
      catch (e) { mensagem(msg, e.message); }
    };
  },
  /** Estoque que já está na prateleira: uma linha por peça (nova ou já cadastrada), com quantas tem hoje.
      Aceita colar do Excel: nome, quantidade, unidade, valor de uma (colunas separadas por Tab). */
  abrirInventario() {
    this.listas();
    const linhas = h('div', { class: 'ax-inv-linhas' }), msg = h('div', { class: 'msg' }), ok = h('button', { type: 'button', class: 'btn', text: 'Salvar estoque' }), rows = [], cont = h('span', { class: 'ax-inv-cont' });
    const contar = () => { const n = rows.filter(r => r.peca.value.trim()).length; cont.textContent = n ? n + (n > 1 ? ' peças na lista' : ' peça na lista') : ''; ok.textContent = n > 1 ? 'Salvar ' + n + ' peças' : 'Salvar estoque'; };
    const nova = (d, depois) => {
      d = d || {};
      const peca = this.txt({ maxlength: 80, placeholder: 'Nome da peça', value: d.nome || '', 'aria-label': 'Peça' });
      const area = this.txt({ maxlength: 40, placeholder: 'Área (ex.: Freio)', value: d.area || '', 'aria-label': 'Área' }), marca = this.txt({ maxlength: 40, placeholder: 'Marca', value: d.marca || '', 'aria-label': 'Marca' });
      const qtd = this.txt({ inputmode: 'decimal', placeholder: 'Quantas tem', value: d.qtd || '', 'aria-label': 'Quantas tem hoje' });
      const un = this.selUnidade(d.un || 'un'), min = this.txt({ inputmode: 'decimal', placeholder: 'Mínimo', value: d.min || '', 'aria-label': 'Estoque mínimo' });
      const local = this.txt({ maxlength: 60, placeholder: 'Onde fica', value: d.local || '', 'aria-label': 'Onde fica' });
      const vu = this.txt({ inputmode: 'decimal', placeholder: 'R$ de UMA (opcional)', value: d.vu || '', 'aria-label': 'Valor de uma unidade' });
      const info = h('div', { class: 'ax-ed-info' }), x = h('button', { type: 'button', class: 'ax-x', 'aria-label': 'Tirar esta linha', text: '✕' });
      const r = { peca, qtd, un, min, local, vu, area, marca, el: null };
      const pinta = () => { const p = this.porNome(peca.value), q = this.valor(qtd.value); info.className = 'ax-ed-info';
        if (!peca.value.trim()) info.textContent = '';
        else if (p) { un.value = this.un(p); un.disabled = true; if (!area.value) area.placeholder = p.categoria || 'Área (ex.: Freio)'; if (!marca.value) marca.placeholder = p.marca || 'Marca'; info.textContent = 'Já cadastrada: o sistema diz ' + this.num(this.qtd(p)) + ' ' + this.un(p) + (qtd.value.trim() && !isNaN(q) ? ' → vai ficar ' + this.num(q) + '.' : '.'); }
        else { un.disabled = false; info.textContent = 'Peça nova: vai ser cadastrada.'; } contar(); };
      [peca, qtd].forEach(i => i.addEventListener('input', pinta));
      // colar uma lista do Excel no nome: vira várias linhas
      peca.addEventListener('paste', e => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(t)) return; e.preventDefault(); colar(t, r); });
      vu.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nova(null, r).peca.focus(); } });
      r.el = h('div', { class: 'ax-inv-lin' }, this.ac(peca, () => this.fontePecas()), qtd, un, vu, x, h('div', { class: 'ax-inv-l2' }, this.ac(area, () => this.fonteAreas()), this.ac(marca, () => this.fonteMarcas()), min, local), info);
      x.onclick = () => { if (rows.length === 1) { [peca, qtd, min, local, vu, area, marca].forEach(i => { i.value = ''; }); pinta(); return; } rows.splice(rows.indexOf(r), 1); r.el.remove(); contar(); };
      if (depois) { rows.splice(rows.indexOf(depois) + 1, 0, r); depois.el.after(r.el); } else { rows.push(r); linhas.append(r.el); }
      pinta(); return r;
    };
    const UNS = this.UNIDADES.map(u => u[0]);
    const colar = (texto, alvo) => {
      const ls = texto.replace(/\r/g, '').split('\n').map(l => l.split('\t').map(c => c.trim())).filter(c => c[0]);
      let ant = alvo;
      ls.forEach((c, i) => {
        const qtdTxt = c[1] || '', unTxt = (c[2] || '').toLowerCase(), un = UNS.find(u => u.toLowerCase() === unTxt || (unTxt && u.toLowerCase().startsWith(unTxt.slice(0, 2)))) || 'un';
        const d = { nome: c[0], qtd: qtdTxt, un, vu: c[3] || '', area: c[4] || '', marca: c[5] || '' };
        if (i === 0 && !alvo.peca.value.trim()) { alvo.peca.value = d.nome; alvo.qtd.value = d.qtd; alvo.un.value = d.un; alvo.vu.value = d.vu; alvo.area.value = d.area; alvo.marca.value = d.marca; alvo.peca.dispatchEvent(new Event('input')); }
        else ant = nova(d, ant);
      });
      contar(); toast(ls.length + (ls.length > 1 ? ' linhas coladas.' : ' linha colada.') + ' Confira antes de salvar.');
    };
    nova();
    const md = abrirModal('Lançar estoque atual', h('div', { class: 'ax-form' },
      h('p', { class: 'hint', text: 'Uma linha por peça, com quantas tem HOJE na prateleira. Peça que já está cadastrada fica com a quantidade que você digitar. Tem a lista no Excel? Copie as colunas Nome · Quantidade · Unidade · Valor · Área · Marca (nessa ordem) e cole no primeiro campo.' }),
      linhas, h('div', { class: 'ax-inv-rod' }, h('button', { type: 'button', class: 'btn secondary small', text: '＋ Outra peça', onclick: () => nova(null, rows[rows.length - 1]).peca.focus() }), cont), msg, h('div', { class: 'modal-actions' }, ok)), { largo: true });
    rows[0].peca.focus();
    ok.onclick = async () => {
      const itens = [], vistos = {};
      for (const r of rows) {
        const nome = r.peca.value.trim(); if (!nome && !r.qtd.value.trim()) continue;
        if (nome.length < 2) { mensagem(msg, 'Diga o nome de cada peça.'); return r.peca.focus(); }
        const q = this.valor(r.qtd.value); if (isNaN(q) || q < 0) { mensagem(msg, 'Diga quantas tem de "' + nome + '" (pode ser 0).'); return r.qtd.focus(); }
        const k = this.k(nome); if (vistos[k]) { mensagem(msg, '"' + nome + '" está em duas linhas. Deixe uma só com o total.'); return r.peca.focus(); } vistos[k] = 1;
        const mi = r.min.value.trim() ? this.valor(r.min.value) : 0, v = r.vu.value.trim() ? this.valor(r.vu.value) : '';
        if (isNaN(mi) || mi < 0) { mensagem(msg, 'Mínimo inválido em "' + nome + '".'); return r.min.focus(); }
        if (v !== '' && (isNaN(v) || v < 0)) { mensagem(msg, 'Valor inválido em "' + nome + '".'); return r.vu.focus(); }
        const p = this.porNome(nome);
        itens.push(Object.assign(p ? { pecaId: p.id } : {}, { nome, quantidade: q, unidade: r.un.value, estoqueMinimo: mi, localizacao: r.local.value.trim(), valorUnit: v, categoria: r.area.value.trim(), marca: r.marca.value.trim() }));
      }
      if (!itens.length) { mensagem(msg, 'Coloque pelo menos uma peça.'); return rows[0].peca.focus(); }
      try { const res = await this.chamar('almoxInventario', { id: this.novoId('inv'), itens }, ok); md.fechar();
        toast('Estoque salvo: ' + itens.length + (itens.length > 1 ? ' peças' : ' peça') + (res.criadas ? ' (' + res.criadas + ' nova' + (res.criadas > 1 ? 's' : '') + ')' : '') + '.'); }
      catch (e) { mensagem(msg, e.message); }
    };
  },
  /** Aviso de preço fora do normal, com o botão de corrigir para o valor por unidade. */
  mostrarAviso(caixa, c, inputValor, depois) {
    limpar(caixa); caixa.hidden = !c; if (!c) return;
    caixa.append(h('span', { text: '⚠️ ' + c.msg }));
    if (c.sugerido) caixa.append(h('button', { type: 'button', class: 'btn small', text: 'Usar ' + this.moeda(c.sugerido) + ' cada', onclick: () => { inputValor.value = String(c.sugerido).replace('.', ','); depois(); } }));
  },

  /* ---------- Editor de peças usadas numa manutenção ----------
     op = { linhas: [{pecaId, nome, qtd, origem, qtdComprada, valorUnit, fornecedor}], aoMudar() }
     Devolve { el, custo(), quantas(), obter() → {linhas} ou {erro, campo}, precoSuspeito() }. */
  editorPecas(op) {
    op = op || {}; this.listas();
    // planejar: peças previstas num agendamento — não exige estoque nem preço, só avisa o que falta comprar
    const plano = () => typeof op.planejar === 'function' ? !!op.planejar() : !!op.planejar;
    const caixa = h('div', { class: 'ax-ed' }), lista = h('div', { class: 'ax-ed-lista' }), rows = [];
    const mudou = () => { if (op.aoMudar) op.aoMudar(); };
    const ORIG = [['estoque', 'Do estoque', 'Do estoque'], ['compra', 'Comprei à parte', 'Vou comprar'], ['nota', 'Veio na nota', 'Vem na nota']];
    const add = (l) => {
      l = l || {};
      const p0 = l.pecaId ? this.porId(l.pecaId) : null;
      const ex = this.extrasNova(l);
      const peca = this.txt({ maxlength: 80, placeholder: 'Qual peça? Ex.: Filtro de óleo', value: p0 ? p0.nome : (l.nome || ''), 'aria-label': 'Peça' });
      const qtd = this.txt({ inputmode: 'decimal', placeholder: '1', value: l.qtd ? String(l.qtd).replace('.', ',') : '', 'aria-label': 'Quantas usou' });
      let origem = l.origem || 'estoque';
      const seg = h('div', { class: 'ax-seg', role: 'radiogroup', 'aria-label': 'De onde veio' });
      const comp = this.txt({ inputmode: 'decimal', placeholder: 'igual', value: Number(l.qtdComprada) > 0 ? String(l.qtdComprada).replace('.', ',') : '', 'aria-label': 'Quantas comprou' });      // mostra o que foi lançado, mesmo se for igual ao que usou
      const forn = this.txt({ maxlength: 60, placeholder: 'Ex.: Autopeças Sul', value: l.fornecedor && origem === 'compra' ? l.fornecedor : '', 'aria-label': 'Onde comprou' });
      const vu = this.txt({ inputmode: 'decimal', placeholder: 'R$ de UMA', value: l.valorUnit ? String(l.valorUnit).replace('.', ',') : '', 'aria-label': 'Valor de uma unidade' });
      const info = h('div', { class: 'ax-ed-info' }), aviso = h('div', { class: 'ax-aviso', hidden: true });
      const rotC = h('span'), rotF = h('span'), rotV = h('span'), rotQ = h('span');
      const fCompra = h('div', { class: 'ax-ed-compra' }, h('label', {}, rotC, comp), h('label', { class: 'ax-ed-forn' }, rotF, this.ac(forn, () => this.fonteForn())), h('label', {}, rotV, vu));
      const x = h('button', { type: 'button', class: 'ax-x', 'aria-label': 'Tirar esta peça', title: 'Tirar esta peça', text: '✕' });
      const r = {
        peca, qtd, ex, el: null,
        p: () => this.porNome(peca.value), q: () => this.valor(qtd.value) || (qtd.value.trim() ? NaN : 1),
        origem: () => origem, v: () => this.valor(vu.value), comp: () => comp.value.trim() ? this.valor(comp.value) : 0,
        custo: () => { const q = r.q(); if (!(q > 0)) return 0; if (origem === 'estoque') { const p = r.p(); return p ? q * (Number(p.custoUnit) || 0) : 0; } return origem === 'compra' && r.v() > 0 ? q * r.v() : 0; },
        suspeito: false
      };
      const pinta = () => {
        const pl = plano();
        rotQ.textContent = pl ? 'Precisa' : 'Usou'; rotC.textContent = pl ? 'Comprar quantas?' : 'Comprou quantas?'; rotF.textContent = pl ? 'Onde comprar' : 'Onde comprou'; rotV.textContent = pl ? 'Valor previsto de UMA' : 'Valor de UMA unidade';
        $$('button', seg).forEach(b => { const on = b.dataset.v === origem; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.textContent = ORIG.find(o => o[0] === b.dataset.v)[pl ? 2 : 1]; });
        fCompra.hidden = origem === 'estoque'; fCompra.querySelector('.ax-ed-forn').hidden = origem === 'nota';
        ex.mostrar(origem !== 'estoque' && peca.value.trim().length > 1); ex.existente(r.p());
        const p = r.p(), q = r.q(); limpar(info); info.className = 'ax-ed-info';
        if (origem === 'estoque') {
          if (!peca.value.trim()) info.textContent = 'Escolha a peça da lista do almoxarifado.';
          else if (!p) { info.textContent = 'Essa peça não está no almoxarifado. Se comprou agora, escolha "Comprei à parte".'; info.classList.add('ruim'); }
          else { const tem = this.qtd(p); info.textContent = 'No estoque: ' + this.num(tem) + ' ' + this.un(p) + (Number(p.custoUnit) > 0 ? ' · custo ' + this.moeda(p.custoUnit) + ' cada' : '');
            if (q > tem) { if (pl) { info.textContent += ' — falta ' + this.num(q - Math.max(0, tem)) + ', precisa comprar.'; info.classList.add('falta'); } else { info.textContent += ' — não dá ' + this.num(q) + '.'; info.classList.add('ruim'); } }
            else if (pl) info.textContent += ' — dá para o serviço.'; }
          r.suspeito = false; this.mostrarAviso(aviso, null);
        } else {
          const c = q > 0 && r.v() > 0 ? q * r.v() : 0, sobra = r.comp() > q ? r.comp() - q : 0;
          info.textContent = (c ? (pl ? 'Previsto: ' : 'Peças: ') + this.moeda(c) + (origem === 'nota' ? ' (já está no valor do serviço, não soma de novo)' : ' (soma no valor da manutenção)') : '') + (sobra ? (c ? ' · ' : '') + 'sobra ' + this.num(sobra) + ' para o estoque' : '');
          if (!p && peca.value.trim().length > 1) info.textContent += (info.textContent ? ' · ' : '') + 'peça nova: vai para o almoxarifado';
          const ck = p && r.v() > 0 ? this.checarPreco(p, r.v(), q) : null; r.suspeito = !!ck; this.mostrarAviso(aviso, ck, vu, () => { pinta(); mudou(); });
        }
      };
      ORIG.forEach(([v, t]) => seg.append(h('button', { type: 'button', role: 'radio', dataset: { v }, text: t, onclick: () => { origem = v; pinta(); mudou(); } })));
      [peca, qtd, comp, forn, vu].forEach(i => i.addEventListener('input', () => { pinta(); mudou(); }));
      r.el = h('div', { class: 'ax-ed-lin' }, h('div', { class: 'ax-ed-l1' }, this.ac(peca, () => this.fontePecas()), h('label', { class: 'ax-ed-q' }, rotQ, qtd), x), seg, fCompra, ex.el, info, aviso);
      x.onclick = () => { rows.splice(rows.indexOf(r), 1); r.el.remove(); pinta(); mudou(); botao(); };
      r.pinta = pinta; rows.push(r); lista.append(r.el); pinta(); botao();
      return r;
    };
    const btnAdd = h('button', { type: 'button', class: 'btn secondary small ax-ed-add', onclick: () => { const r = add(); mudou(); r.peca.focus(); } });
    const botao = () => { btnAdd.textContent = rows.length ? '＋ Outra peça' : (plano() ? '🔩 Vai precisar de peças? Adicionar' : '🔩 Usou peças? Adicionar'); caixa.classList.toggle('vazio', !rows.length); };
    caixa.append(lista, btnAdd);
    (op.linhas || []).forEach(l => add(l)); botao();
    return {
      el: caixa,
      quantas: () => rows.length,
      atualizar: () => { rows.forEach(r => r.pinta()); botao(); },
      custo: () => this.r2(rows.reduce((t, r) => t + r.custo(), 0)),
      precoSuspeito: () => rows.some(r => r.suspeito),
      obter: () => {
        const out = [];
        for (const r of rows) {
          const nome = r.peca.value.trim(), p = r.p(), q = r.q(), o = r.origem();
          if (!nome) return { erro: 'Diga qual peça (ou tire a linha vazia).', campo: r.peca };
          if (!(q > 0)) return { erro: 'Quantidade de "' + nome + '" inválida.', campo: r.qtd };
          if (o === 'estoque') {
            if (!p) return { erro: '"' + nome + '" não está no almoxarifado. Escolha da lista ou marque "Comprei à parte".', campo: r.peca };
            if (!plano() && q > this.qtd(p)) return { erro: 'O estoque de ' + p.nome + ' tem só ' + this.num(this.qtd(p)) + ' ' + this.un(p) + '.', campo: r.qtd };
            out.push({ pecaId: p.id, nome: p.nome, qtd: q, origem: o });
          } else {
            const v = r.v(), c = r.comp();
            if (plano() && isNaN(v)) { out.push(Object.assign(p ? { pecaId: p.id, nome: p.nome, categoria: r.ex.dados().categoria, marca: r.ex.dados().marca } : Object.assign({ nome }, r.ex.dados()), { qtd: q, origem: o, valorUnit: '', qtdComprada: c || q, fornecedor: o === 'compra' ? r.el.querySelector('.ax-ed-forn input').value.trim() : '' })); continue; }
            if (isNaN(v) || v < 0 || !String(v).length) return { erro: 'Diga o valor de UMA unidade de "' + nome + '".', campo: r.peca };
            if (c && c < q) return { erro: 'Comprou menos do que usou em "' + nome + '"?', campo: r.qtd };
            const forn = o === 'compra' ? r.el.querySelector('.ax-ed-forn input').value.trim() : '';
            out.push(Object.assign(p ? { pecaId: p.id, nome: p.nome, categoria: r.ex.dados().categoria, marca: r.ex.dados().marca } : Object.assign({ nome }, r.ex.dados()), { qtd: q, origem: o, valorUnit: v, qtdComprada: c || q, fornecedor: forn }));
          }
        }
        return { linhas: out };
      }
    };
  },
  /** Peças que já foram lançadas numa manutenção (para editar): junta a entrada e a saída de cada peça. */
  linhasDaManut(manutId) {
    const ms = this.movs().filter(m => String(m.manutencaoId) === String(manutId)), por = {};
    ms.forEach(m => { const k = String(m.id).replace(/[es]$/, ''); (por[k] = por[k] || {})[m.tipo] = m; });
    return Object.keys(por).sort().map(k => { const s = por[k].SAIDA, e = por[k].ENTRADA, base = s || e;
      return { pecaId: base.pecaId, qtd: Number(s ? s.quantidade : 0) || 1, origem: e ? (e.origem === 'nota' ? 'nota' : 'compra') : 'estoque', qtdComprada: e ? Number(e.quantidade) : 0, valorUnit: e ? Number(e.valorUnit) : 0, fornecedor: e ? e.fornecedor : '' }; });
  }
};
