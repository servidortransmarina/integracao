/* Fleet do motorista: Checklist, Abastecer, Histórico e Escalas (só leitura). Gestão vê as listas de checklists e ocorrências. */
const Motorista = {
  d() { return App.dados || {}; },
  hoje() { return (App.dados && App.dados.hoje) || hojeLocal(); },
  placaSel(def) {
    const sel = h('select', { 'aria-label': 'Caminhão' }, h('option', { value: '', text: 'Escolha o caminhão…' }), ...(this.d().veiculos || []).map(v => h('option', { value: v.placa, text: v.placa + (v.modelo ? ' — ' + v.modelo : '') })));
    sel.value = def || ''; return sel;
  },
  numero(v) { return parseFloat(String(v).replace(',', '.')); },
  dia(iso) { return iso ? fmtData(String(iso).slice(0, 10)) : '-'; },
  nomeMot(id) { const m = (this.d().motoristas || []).find(x => String(x.id) === String(id)); return m ? nomeBonito(m.nome) : '-'; },

  /* ---------- CHECKLIST ---------- */
  checklist() {
    const d = this.d(), mod = d.checklistModelo; if (!mod) return h('div', { class: 'card soon' }, 'Checklist indisponível. Atualize a página.');
    const esc = d.escalaHoje, placa = this.placaSel(esc ? esc.placa : ''), km = h('input', { type: 'number', inputmode: 'numeric', min: 1, placeholder: 'KM atual do painel' });
    const resp = {}, qtd = {}, obs = {}, linhas = {};
    const feitoHoje = (d.checklists || []).some(c => String(c.data).slice(0, 10) === Motorista.hoje());
    const total = mod.categorias.reduce((n, c) => n + c.itens.length, 0), prog = h('span', { class: 'ck-prog' });
    const atualizarProg = () => { const n = Object.keys(resp).length; prog.textContent = n + ' de ' + total + ' itens'; };
    const botao = (nome, cod, ic, rot, linha, area) => h('button', { type: 'button', class: 'ck-op ' + cod, 'aria-label': rot, title: rot, onclick: () => {
      resp[nome] = cod; $$('.ck-op', linha).forEach(b => b.classList.toggle('on', b.classList.contains(cod))); area.hidden = cod === 'ok'; linha.classList.remove('falta'); atualizarProg();
      if (cod !== 'ok') area.querySelector('input').focus(); } }, ic);
    const raiz = h('div', { class: 'ck' },
      h('div', { class: 'card' }, h('h2', { text: 'Checklist do dia' }), feitoHoje ? h('div', { class: 'ck-aviso', text: '✅ Você já enviou um checklist hoje. Só envie outro se trocou de caminhão.' }) : null,
        h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), placa), h('div', { class: 'field' }, h('label', { text: 'KM atual' }), km)),
        h('div', { class: 'ck-leg' }, h('span', { class: 'ok' }, h('i', { text: '✓' }), 'Ok: funcionando bem'), h('span', { class: 'warn' }, h('i', { text: '!' }), 'Atenção: algo estranho ou gasto'), h('span', { class: 'bad' }, h('i', { text: '✕' }), 'Ruim: defeito (a oficina é avisada)'),
          h('button', { class: 'btn small secondary', type: 'button', text: '? Como fazer', onclick: () => Ajuda.abrir('checklist') }))));
    mod.categorias.forEach(c => {
      const cx = h('div', { class: 'card ck-cat' }, h('h3', { text: c.cat }));
      cx.append(h('div', { class: 'ck-cols' }, h('span', { text: 'Ok' }), h('span', { text: 'Atenção' }), h('span', { text: 'Ruim' })));
      c.itens.forEach(nome => {
        const area = h('div', { class: 'ck-obs', hidden: true }, h('input', { type: 'text', maxlength: 300, placeholder: 'Descreva o problema', oninput: e => { obs[nome] = e.target.value; } }));
        const linha = h('div', { class: 'ck-lin' }); linhas[nome] = linha;
        linha.append(h('div', { class: 'ck-topo' }, h('span', { class: 'ck-nome', text: nome }), h('span', { class: 'ck-ops' }, botao(nome, 'ok', '✓', 'Ok', linha, area), botao(nome, 'warn', '!', 'Atenção', linha, area), botao(nome, 'bad', '✕', 'Ruim', linha, area))), area);
        cx.append(linha);
      });
      raiz.append(cx);
    });
    const eq = h('div', { class: 'card ck-cat' }, h('h3', { text: 'QUANTIDADES' }));
    mod.quantidades.forEach(n => { const i = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 999, placeholder: '0', oninput: e => { qtd[n] = e.target.value; } }); eq.append(h('div', { class: 'ck-lin' }, h('div', { class: 'ck-topo' }, h('span', { class: 'ck-nome', text: 'Quantidade de ' + n.toLowerCase().replace(/s$/, '') + 's' }), h('span', { class: 'ck-qtd' }, i)))); });
    const msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Enviar checklist' });
    env.onclick = async () => {
      const k = this.numero(km.value); mensagem(msg, '');
      if (!placa.value) return mensagem(msg, 'Escolha o caminhão.');
      if (!(k > 0)) return mensagem(msg, 'Informe o KM atual.');
      const falta = Object.keys(linhas).filter(n => !resp[n]); if (falta.length) { falta.forEach(n => linhas[n].classList.add('falta')); linhas[falta[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Faltam ' + falta.length + ' itens para responder.'); }
      const semDesc = Object.keys(resp).filter(n => resp[n] !== 'ok' && String(obs[n] || '').trim().length < 3); if (semDesc.length) { linhas[semDesc[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Descreva o problema de: ' + semDesc[0] + '.'); }
      for (const n of mod.quantidades) if (String(qtd[n] == null ? '' : qtd[n]) === '') return mensagem(msg, 'Informe a quantidade de ' + n.toLowerCase() + '.');
      const itens = Object.keys(resp).map(n => ({ item: n, status: resp[n], descricao: obs[n] || '' })).concat(mod.quantidades.map(n => ({ item: n, quantidade: qtd[n] })));
      env.disabled = true; env.textContent = 'Enviando…';
      try {
        const r = await API.chamar('enviarChecklist', { placa: placa.value, km: k, itens });
        await App.recarregar(true);
        const aviso = { OK: 'Tudo certo!', ATENCAO: 'Itens com atenção foram avisados à oficina.', CRITICO: 'Itens ruins foram avisados à oficina agora.' }[r.statusGeral];
        const m = abrirModal('Checklist enviado ✅', h('div', { class: 'ck-ok' }, h('p', {}, h('b', { text: r.protocolo })), h('p', { text: aviso }), r.pontos ? h('p', { class: 'ck-pts', text: '+' + r.pontos + ' pontos 🎉' }) : h('p', { class: 'hint', text: 'Pontos do checklist já foram contados hoje.' }),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Ver no histórico', onclick: () => { m.fechar(); App.abrirAba('historico'); } }))), { aoFechar: () => App.abrirAba('inicio') });
      } catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar checklist'; }
    };
    atualizarProg();
    raiz.append(eq, h('div', { class: 'ck-rodape' }, prog, msg, env));
    return raiz;
  },

  /* ---------- ABASTECER ---------- */
  abastecer() {
    const d = this.d(), esc = d.escalaHoje, hoje = Motorista.hoje();
    const placa = this.placaSel(esc ? esc.placa : ''), data = h('input', { type: 'date', value: hoje, max: hoje }), hora = h('input', { type: 'time' });
    const prod = h('select', {}, ...(d.produtos || []).map(p => h('option', { value: p, text: p }))), km = h('input', { type: 'number', inputmode: 'numeric', min: 1, placeholder: 'KM atual' });
    const lit = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, placeholder: 'Litros' }), val = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, placeholder: 'Valor total (R$)' });
    const unit = h('small', { class: 'hint' }), msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Lançar abastecimento' });
    const calc = () => { const l = this.numero(lit.value), v = this.numero(val.value); unit.textContent = l > 0 && v > 0 ? 'Preço por litro: ' + fmtMoeda(v / l) : ''; }; lit.oninput = val.oninput = calc;
    env.onclick = async () => {
      mensagem(msg, ''); const l = this.numero(lit.value), v = this.numero(val.value), k = this.numero(km.value);
      if (!placa.value) return mensagem(msg, 'Escolha o caminhão.'); if (!(l > 0)) return mensagem(msg, 'Informe os litros.'); if (!(v > 0)) return mensagem(msg, 'Informe o valor.'); if (!(k > 0)) return mensagem(msg, 'Informe o KM.');
      env.disabled = true; env.textContent = 'Enviando…';
      try { await API.chamar('lancarAbastecimento', { placa: placa.value, data: data.value, hora: hora.value, produto: prod.value, km: k, litros: l, valor: v }); toast('Abastecimento lançado! Ele será conferido com a fatura do posto.'); await App.recarregar(true); App.abrirAba('abastecimento'); }
      catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Lançar abastecimento'; }
    };
    const ult = (d.abastecimentos || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 5);
    return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Lançar abastecimento' }),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), placa), h('div', { class: 'field' }, h('label', { text: 'Data' }), data), h('div', { class: 'field' }, h('label', { text: 'Hora (opcional)' }), hora)),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Produto' }), prod), h('div', { class: 'field' }, h('label', { text: 'KM' }), km), h('div', { class: 'field' }, h('label', { text: 'Litros' }), lit), h('div', { class: 'field' }, h('label', { text: 'Valor total' }), val)),
      unit, msg, h('div', { class: 'modal-actions' }, env), h('small', { class: 'hint', text: 'Quando a fatura do posto chegar, o sistema confere e você ganha pontos.' })),
      ult.length ? h('div', { class: 'card' }, h('h2', { text: 'Últimos lançamentos' }), ...ult.map(a => this.linhaAbast(a))) : null);
  },
  linhaAbast(a) {
    const ST = { provisorio: ['⏳ aguardando fatura', 'amber'], conferido: ['✅ conferido', 'green'], expirado: ['sem fatura', 'gray'] }, s = ST[a.status] || [a.status, 'gray'];
    return h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: a.placa + ' · ' + a.produto }), h('small', { text: this.dia(a.data) + ' · ' + Number(a.litros).toLocaleString('pt-BR') + ' L · ' + fmtMoeda(Number(a.valor)) })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },

  /* ---------- HISTÓRICO ---------- */
  filtroHist: 'tudo',
  historico() {
    const d = this.d(), ev = [];
    (d.checklists || []).forEach(c => ev.push({ t: 'checklist', ts: String(c.data).slice(0, 10) + ' ' + (c.hora || ''), el: () => this.linhaCheck(c) }));
    (d.abastecimentos || []).forEach(a => ev.push({ t: 'abastecimento', ts: String(a.data).slice(0, 10) + ' ' + (a.hora || ''), el: () => this.linhaAbast(a) }));
    (d.ocorrencias || []).forEach(o => ev.push({ t: 'ocorrencia', ts: String(o.dataAbertura).slice(0, 10) + ' 99', el: () => this.linhaOc(o) }));
    (d.pontos || []).forEach(p => ev.push({ t: 'pontos', ts: String(p.dataHora), el: () => h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: p.descricao || p.evento }), h('small', { text: this.dia(p.dataHora) })), h('b', { class: Number(p.pontos) < 0 ? 'neg' : 'pos', text: (Number(p.pontos) > 0 ? '+' : '') + p.pontos + ' pts' })) }));
    ev.sort((a, b) => b.ts.localeCompare(a.ts));
    const corpo = h('div', { class: 'card' }), chips = h('div', { class: 'chips' }), pinta = () => {
      limpar(corpo); const l = ev.filter(e => this.filtroHist === 'tudo' || e.t === this.filtroHist).slice(0, 120);
      if (!l.length) corpo.append(h('div', { class: 'empty', text: 'Nada por aqui ainda. Comece pelo checklist do dia! ✅' })); l.forEach(e => corpo.append(e.el()));
      $$('button', chips).forEach(b => b.classList.toggle('on', b.dataset.f === this.filtroHist));
    };
    [['tudo', 'Tudo'], ['checklist', 'Checklists'], ['abastecimento', 'Abastecimentos'], ['ocorrencia', 'Ocorrências'], ['pontos', 'Pontos']].forEach(([f, t]) => chips.append(h('button', { type: 'button', class: 'chip', dataset: { f }, text: t, onclick: () => { this.filtroHist = f; pinta(); } })));
    pinta(); return h('div', {}, chips, corpo);
  },
  STC: { OK: ['✅ tudo certo', 'green'], ATENCAO: ['⚠️ com atenção', 'amber'], CRITICO: ['❌ itens ruins', 'red'] },
  linhaCheck(c) {
    const s = this.STC[c.statusGeral] || [c.statusGeral, 'gray'], itens = (this.d().checklistItens || []).filter(i => String(i.checklistId) === String(c.id));
    return h('div', { class: 'hist-lin click', onclick: () => this.detalheCheck(c, itens) }, h('div', {}, h('b', { text: 'Checklist · ' + c.placa }), h('small', { text: this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.protocolo })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },
  detalheCheck(c, itens) {
    const ruins = itens.filter(i => i.status !== 'ok' && i.status), cx = h('div', {}, h('p', {}, h('b', { text: c.protocolo }), ' · ' + c.placa + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km'),
      h('p', { text: c.totalOk + ' ok · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' }));
    ruins.forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: i.item }), h('small', { text: i.descricao })), h('span', { class: 'badge ' + (i.status === 'bad' ? 'red' : 'amber'), text: i.status === 'bad' ? 'ruim' : 'atenção' }))));
    itens.filter(i => i.quantidade !== '' && i.quantidade != null).forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('b', { text: i.item }), h('span', { text: String(i.quantidade) }))));
    if (!ruins.length) cx.append(h('div', { class: 'empty', text: 'Nenhum problema relatado.' })); abrirModal('Checklist', cx);
  },
  linhaOc(o) {
    const ST = { ABERTA: ['aberta', 'amber'], RESOLVIDA: ['resolvida', 'green'] }, s = ST[String(o.status).toUpperCase()] || [o.status, 'gray'];
    return h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: '⚠️ ' + o.item + ' · ' + o.placa }), h('small', { text: this.dia(o.dataAbertura) + ' · ' + o.descricao + (o.resolucao ? ' → ' + o.resolucao : '') })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },

  /* ---------- ESCALAS (só leitura) ---------- */
  escala() {
    const l = (this.d().escalas || []).slice().sort((a, b) => a.data.localeCompare(b.data) || a.placa.localeCompare(b.placa)), hoje = Motorista.hoje(), dias = {};
    l.forEach(e => { (dias[e.data] = dias[e.data] || []).push(e); });
    const cx = h('div', { class: 'card' }, h('h2', { text: 'Escala dos próximos dias' }), h('small', { class: 'hint', text: 'Somente consulta. Quem altera a escala é a gestão.' }));
    const ds = Object.keys(dias).filter(x => x >= hoje); if (!ds.length) cx.append(h('div', { class: 'empty', text: 'Nenhuma escala lançada ainda.' }));
    ds.forEach(dt => { cx.append(h('div', { class: 'sec-t', text: (dt === hoje ? 'Hoje · ' : '') + this.dia(dt) }), ...dias[dt].map(e => h('div', { class: 'hist-lin' + (e.meu ? ' meu' : '') }, h('div', {}, h('b', { text: nomeBonito(e.nome) || '-' }), h('small', { text: e.turno || '' })), placaHtmlEl(e.placa)))); });
    return cx;
  },

  /* ---------- GESTÃO: listas ---------- */
  gestaoChecklists() {
    const l = (this.d().checklists || []).slice().sort((a, b) => (String(b.data).slice(0, 10) + b.hora).localeCompare(String(a.data).slice(0, 10) + a.hora)).slice(0, 100);
    const cx = h('div', { class: 'card' }, h('h2', { text: 'Checklists enviados' }));
    if (!l.length) cx.append(h('div', { class: 'empty', text: 'Nenhum checklist enviado ainda.' }));
    l.forEach(c => { const s = this.STC[c.statusGeral] || [c.statusGeral, 'gray'];
      cx.append(h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: c.placa + ' · ' + this.nomeMot(c.motoristaId) }), h('small', { text: this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.protocolo + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km' })), h('span', { class: 'badge ' + s[1], text: s[0] }))); });
    return cx;
  },
  gestaoOcorrencias() {
    const l = (this.d().ocorrencias || []).slice().sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura))).slice(0, 100);
    const cx = h('div', { class: 'card' }, h('h2', { text: 'Ocorrências dos checklists' }));
    if (!l.length) cx.append(h('div', { class: 'empty', text: 'Nenhuma ocorrência registrada.' }));
    l.forEach(o => cx.append(this.linhaOc(o))); return cx;
  },

  /* ---------- PAINEL ---------- */
  cartaoHoje() {
    const d = this.d(), e = d.escalaHoje, feito = (d.checklists || []).some(c => String(c.data).slice(0, 10) === Motorista.hoje());
    const cx = h('div', { class: 'card hoje' }, h('h2', { text: 'Seu caminhão hoje' }));
    if (!e) { cx.append(h('div', { class: 'empty', text: 'Você ainda não está escalado para hoje. Fale com a gestão.' })); return cx; }
    cx.append(h('div', { class: 'hoje-linha' }, placaHtmlEl(e.placa), h('div', {}, h('b', { text: e.modelo || 'Caminhão' }), h('small', { text: e.origem === 'escala' ? 'Escalado para hoje' + (e.turno ? ' · ' + e.turno : '') : 'Caminhão fixo (sem escala lançada)' }))),
      feito ? h('div', { class: 'ck-aviso', text: '✅ Checklist de hoje enviado.' }) : h('button', { class: 'btn', type: 'button', text: 'Fazer o checklist agora', onclick: () => App.abrirAba('checklists') }));
    return cx;
  }
};
