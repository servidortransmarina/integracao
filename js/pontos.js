/* Pontos do motorista: saldo, histórico e resgate de folga. A gestão decide os pedidos pelo Painel. */
const Pontos = {
  lanc() { return ((App.dados && App.dados.pontos) || []).slice().sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora))); },
  saldo() { return ((App.dados && App.dados.pontos) || []).reduce((t, p) => t + (Number(p.pontos) || 0), 0); },
  custo() { return Number(App.dados && App.dados.custoResgate) || 200; },
  pendente() { return ((App.dados && App.dados.resgates) || []).find(r => String(r.status).toUpperCase() === 'PENDENTE'); },
  amanha() { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  dia(s) { return String(s || '').slice(0, 10).split('-').reverse().join('/'); },

  /** Botão "⭐ 230 pts" no topo (só motorista). */
  chip() {
    const b = $('#chipPontos'); if (!b) return;
    const ve = App.sessao && App.sessao.perfil === 'motorista' && App.dados;
    b.hidden = !ve; if (ve) b.textContent = '⭐ ' + this.saldo() + ' pts';
  },

  abrirMotorista() {
    const saldo = this.saldo(), custo = this.custo(), pend = this.pendente();
    const barra = h('div', { class: 'pt-barra' }, h('i', { style: 'width:' + Math.min(100, Math.round(saldo / custo * 100)) + '%' }));
    const custo2 = custo * 2, dataIn = h('input', { type: 'date', min: this.amanha(), 'aria-label': 'Dia da folga' });
    const pedir = async (tipo, botao, rotulo) => {
      if (tipo === 'FOLGA_DATA' && !dataIn.value) { toast('Escolha o dia da folga.', true); return; }
      botao.disabled = true; botao.textContent = 'Enviando…';
      try { await API.chamar('resgatarPontos', { tipo, dataDesejada: dataIn.value }); toast('Pedido enviado! A gestão vai avaliar.'); m.fechar(); App.recarregar(true).then(() => { this.chip(); this.abrirMotorista(); });  }
      catch (e) { toast(e.message, true); botao.disabled = false; botao.textContent = rotulo; }
    };
    const mk = (tipo, custoT, rotulo) => { const b = h('button', { class: 'btn' + (tipo === 'FOLGA_DATA' ? ' secondary' : ''), type: 'button', text: pend ? 'Pedido aguardando aprovação…' : saldo < custoT ? rotulo + ' — faltam ' + (custoT - saldo) : rotulo, disabled: pend || saldo < custoT ? true : null }); b.onclick = () => pedir(tipo, b, rotulo); return b; };
    const btn = h('div', { class: 'pt-pedidos' }, mk('FOLGA', custo, '🎁 Folga (' + custo + ' pts)'),
      h('div', { class: 'pt-dia' }, h('label', { text: 'Folga em dia específico (' + custo2 + ' pts)' }), dataIn), mk('FOLGA_DATA', custo2, '📅 Pedir folga neste dia'));
    const rgs = ((App.dados.resgates) || []).slice().sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora))).slice(0, 5);
    const TIPO = r => String(r.tipo) === 'FOLGA_DATA' ? ' · dia ' + this.dia(r.dataDesejada) : '';
    const ROT = { PENDENTE: '⏳ aguardando', APROVADO: '✅ aprovado', RECUSADO: '❌ recusado — pontos devolvidos' };
    const corpo = h('div', { class: 'pt-modal' },
      h('div', { class: 'pt-saldo' }, h('b', { text: String(saldo) }), h('span', { text: ' pontos' })),
      barra, h('small', { class: 'hint', text: 'Folga: ' + custo + ' pontos. Em dia específico: ' + custo2 + ' pontos (o dobro).' }), btn,
      rgs.length ? h('div', { class: 'sec-t', text: 'Meus resgates' }) : null,
      ...rgs.map(r => h('div', { class: 'pt-lin' }, h('span', { text: this.dia(r.dataHora) + ' · ' + r.pontos + ' pts' + TIPO(r) }), h('b', { text: (ROT[String(r.status).toUpperCase()] || r.status) + (String(r.status).toUpperCase() === 'APROVADO' && r.dataFolga ? ' para ' + this.dia(r.dataFolga) : '') }))),
      h('div', { class: 'sec-t', text: 'Histórico' }),
      ...(this.lanc().slice(0, 25).map(p => h('div', { class: 'pt-lin' }, h('span', { text: this.dia(p.dataHora) + ' · ' + (p.descricao || p.evento) }), h('b', { class: Number(p.pontos) < 0 ? 'neg' : 'pos', text: (Number(p.pontos) > 0 ? '+' : '') + p.pontos })))),
      this.lanc().length ? null : h('div', { class: 'empty', text: 'Ainda sem pontos. Faça o checklist do dia! ✅' }));
    const m = abrirModal('Meus pontos', corpo);
  },

  /** Gestão: aprovar ou recusar um pedido. */
  decidir(rg) {
    const mot = ((App.dados.motoristas) || []).find(x => String(x.id) === String(rg.motoristaId)), obs = h('input', { type: 'text', placeholder: 'Observação (opcional)', maxlength: 200 }), esp = String(rg.tipo) === 'FOLGA_DATA', dia = h('input', { type: 'date', value: esp ? String(rg.dataDesejada).slice(0, 10) : '', min: this.amanha() });
    const enviar = async decisao => {
      if (decisao === 'APROVAR' && !dia.value) { toast('Escolha o dia da folga.', true); return; }
      try { const r = await API.chamar('decidirResgate', { id: rg.id, decisao, obs: obs.value, dataFolga: dia.value }); toast(decisao === 'APROVAR' ? (r.aviso || 'Folga aprovada e lançada no Ponto.') : 'Resgate recusado; pontos devolvidos.', !!r.aviso); m.fechar(); App.recarregar(true); }
      catch (e) { toast(e.message, true); }
    };
    const m = abrirModal('Resgate de folga', h('div', {}, h('p', {}, h('b', { text: nomeBonito(mot ? mot.nome : 'Motorista') }), (esp ? ' pediu folga no dia ' + this.dia(rg.dataDesejada) : ' pediu 1 folga') + ' (' + rg.pontos + ' pontos, em ' + this.dia(rg.dataHora) + ').'),
      h('label', { class: 'hint', text: 'Dia da folga' }), dia, h('small', { class: 'hint', text: 'Aprovando, a folga vai para o Ponto como planejada (e depois para as Escalas). Recusando, os pontos voltam para ele.' }), obs,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Recusar', onclick: () => enviar('RECUSAR') }), h('button', { class: 'btn', type: 'button', text: 'Aprovar folga', onclick: () => enviar('APROVAR') }))));
  },

  /** Gestão: desconto ou bônus manual, sempre com motivo. */
  ajustar(mot) {
    const val = h('input', { type: 'number', step: '1', placeholder: 'Ex.: -20 (desconto) ou 15 (bônus)' }), motivo = h('input', { type: 'text', maxlength: 160, placeholder: 'Motivo (o motorista vai ver)' });
    const m = abrirModal('Ajustar pontos — ' + nomeBonito(mot.nome), h('div', {}, h('label', { class: 'hint', text: 'Pontos (negativo desconta)' }), val, h('label', { class: 'hint', text: 'Motivo' }), motivo,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Cancelar', onclick: () => m.fechar() }),
        h('button', { class: 'btn', type: 'button', text: 'Lançar', onclick: async () => { try { await API.chamar('ajustarPontos', { motoristaId: mot.id, pontos: Number(val.value), motivo: motivo.value }); toast('Ajuste lançado.'); m.fechar(); App.recarregar(true).then(() => { if (window.Motoristas && Motoristas.perfil) Motoristas.perfil(mot.id); }); } catch (e) { toast(e.message, true); } } }))));
  }
};

/* Aba Pódio do Fleet (gestão): ranking do mês inteiro, setas contra o mês anterior e de onde vieram os pontos.
   AO VIVO: abre na hora com o último ranking visto (guardado no aparelho) e, enquanto a tela está aberta, pergunta ao servidor
   só o número de versão dos pontos a cada 12 s (leve). Mudou → baixa o ranking e anima quem subiu ou desceu.
   A seta ao lado do nome mostra a troca de posição desde a última vez que este aparelho viu o ranking. */
const Podio = {
  mes: null, ult: {}, timer: null, INTERVALO: 12000,
  MESES: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  rotMes(m) { const [y, mm] = m.split('-').map(Number), n = this.MESES[mm - 1]; return n.charAt(0).toUpperCase() + n.slice(1) + ' de ' + y; },
  somaMes(m, n) { let [y, mm] = m.split('-').map(Number); mm += n; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return y + '-' + String(mm).padStart(2, '0'); },
  chave(m) { return 'trm.podio.' + ((App.sessao && App.sessao.usuario) || '') + '.' + m; },
  guardado(m) { if (this.ult[m]) return this.ult[m]; try { const x = JSON.parse(localStorage.getItem(this.chave(m)) || 'null'); if (x && x.r) { this.ult[m] = x; return x; } } catch (e) {} return null; },
  guardar(m, r, pos) { const x = { r, pos }; this.ult[m] = x; try { localStorage.setItem(this.chave(m), JSON.stringify(x)); } catch (e) {} },
  tela() {
    const hoje = (App.dados && App.dados.hoje) || new Date().toISOString().slice(0, 10), mesAtual = hoje.slice(0, 7);
    if (!this.mes) this.mes = mesAtual;
    const mes = this.mes, cx = h('div', { class: 'pd' }), corpo = h('div', { class: 'pd-corpo' });
    const ir = n => { this.mes = this.somaMes(this.mes, n); App.abrirAba('podio'); };
    const prox = h('button', { class: 'pd-nav', type: 'button', 'aria-label': 'Próximo mês', text: '›', onclick: () => ir(1) }); if (mes >= mesAtual) prox.disabled = true;
    const vivo = h('span', { class: 'pd-vivo', hidden: mes !== mesAtual, title: 'O ranking se atualiza sozinho enquanto esta tela está aberta' }, h('i'), 'ao vivo');
    cx.append(h('div', { class: 'card pd-cab' }, h('button', { class: 'pd-nav', type: 'button', 'aria-label': 'Mês anterior', text: '‹', onclick: () => ir(-1) }), h('h2', { text: this.rotMes(mes) }), vivo, prox), corpo);
    const g = this.guardado(mes);
    if (g) this.preencher(corpo, g.r, g.pos, false); else corpo.append(h('div', { class: 'hint', text: 'Carregando ranking…' }));
    this.buscar(corpo, mes, !!g);
    clearInterval(this.timer);
    if (mes === mesAtual) this.timer = setInterval(() => this.vigiar(corpo, mes), this.INTERVALO);
    return cx;
  },
  /** Enquanto a tela do pódio está aberta: pergunta só a versão; baixa o ranking quando ela muda. */
  async vigiar(corpo, mes) {
    if (!corpo.isConnected || this.mes !== mes) { clearInterval(this.timer); this.timer = null; return; }
    if (document.hidden || this._buscando) return;
    try { const r = await API.chamar('versaoPontos', {}, { fundo: true, mudo: true }); const g = this.guardado(mes); if (!g || r.versao !== g.r.versao) this.buscar(corpo, mes, true); } catch (e) { /* tenta de novo no próximo ciclo */ }
  },
  async buscar(corpo, mes, temAlgo) {
    this._buscando = true;
    try {
      const r = await API.chamar('rankingPontos', { mes }, { mudo: true, fundo: temAlgo });
      if (!corpo.isConnected || this.mes !== mes) return;
      const g = this.guardado(mes);
      if (g && g.r.versao === r.versao && JSON.stringify(g.r.ranking) === JSON.stringify(r.ranking)) { this.guardar(mes, r, g.pos); return; }
      this.preencher(corpo, r, g ? g.pos : null, !!g);
    } catch (e) { if (!temAlgo) { corpo.textContent = ''; corpo.append(h('div', { class: 'card empty', text: e.message })); } }
    finally { this._buscando = false; }
  },
  seta(x) {
    if (!x.posicao) return h('span', { class: 'pd-seta igual', text: '—', title: 'Sem pontos no mês' });
    if (!x.posicaoAnterior) return h('span', { class: 'pd-seta novo', text: 'novo', title: 'Não pontuou no mês anterior' });
    const d = x.posicaoAnterior - x.posicao;
    if (!d) return h('span', { class: 'pd-seta igual', text: '=', title: 'Mesma posição do mês anterior' });
    return h('span', { class: 'pd-seta ' + (d > 0 ? 'sobe' : 'desce'), text: (d > 0 ? '▲ ' : '▼ ') + Math.abs(d), title: (d > 0 ? 'Subiu ' : 'Desceu ') + Math.abs(d) + (Math.abs(d) > 1 ? ' posições' : ' posição') + ' em relação ao mês anterior (era ' + x.posicaoAnterior + 'º)' });
  },
  /** Seta de TROCA DE POSIÇÃO: desde a última vez que este aparelho viu o ranking (ou desde o último ciclo, ao vivo). */
  mov(x, antes) {
    if (!antes || !x.posicao) return null;
    const a = antes[x.id]; if (!a) return x.posicao <= 10 ? h('span', { class: 'pd-mov novo', text: '★ entrou', title: 'Entrou no ranking' }) : null;
    const d = a - x.posicao; if (!d) return null;
    return h('span', { class: 'pd-mov ' + (d > 0 ? 'sobe' : 'desce'), text: (d > 0 ? '▲' : '▼') + Math.abs(d), title: (d > 0 ? 'Subiu ' : 'Desceu ') + Math.abs(d) + (Math.abs(d) > 1 ? ' posições' : ' posição') + ' (estava em ' + a + 'º)' });
  },
  preencher(corpo, r, posAntes, animar) {
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // FLIP: guarda onde cada linha estava para animar até o lugar novo
    const antes = {}, ptsAntes = {}; if (animar && !calmo) $$('.pd-lin[data-id]', corpo).forEach(l => { antes[l.dataset.id] = l.getBoundingClientRect().top; ptsAntes[l.dataset.id] = Number(l.dataset.pts) || 0; });
    corpo.textContent = '';
    const lista = r.ranking || [], top = lista.filter(x => x.posicao).slice(0, 3), rot = {}; (r.regras || []).forEach(g => { rot[g.evento] = g.descricao || g.evento; });
    const topAntes = posAntes ? Object.keys(posAntes).filter(id => posAntes[id] <= 3).sort((a, b) => posAntes[a] - posAntes[b]).join() : null, topAgora = top.map(x => x.id).join();
    if (top.length) {
      const ordem = [top[1], top[0], top[2]], pos = [2, 1, 3], alt = window.innerWidth < 640 ? { 1: 64, 2: 46, 3: 32 } : { 1: 110, 2: 80, 3: 60 }, med = { 1: '🥇', 2: '🥈', 3: '🥉' }, palco = h('div', { class: 'podio' + (animar && topAntes !== null && topAntes !== topAgora ? ' mudou' : '') });
      ordem.forEach((x, i) => { if (!x) return; const p = pos[i], subiu = posAntes && posAntes[x.id] && posAntes[x.id] > p;
        palco.append(h('div', { class: 'degrau p' + p + (animar && subiu ? ' chegou' : ''), dataset: { id: x.id } }, h('div', { class: 'medalha', text: med[p] }), x.avatar ? h('span', { class: 'avatar mot-av' }, avatarNo(x.avatar)) : null, h('b', { text: nomeBonito(x.nome).split(' ')[0] }), h('small', { text: x.pontos.toLocaleString('pt-BR') + ' pts' }), h('div', { class: 'bloco', style: 'height:' + alt[p] + 'px', text: String(p) }))); });
      corpo.append(h('div', { class: 'card pd-palco' }, palco));
    } else corpo.append(h('div', { class: 'card empty', text: 'Ninguém pontuou em ' + this.rotMes(r.mes) + '.' }));
    const tab = h('div', { class: 'card pd-lista' }, h('div', { class: 'pd-lin pd-th' }, h('span', { text: '#' }), h('span', { text: 'Motorista' }), h('span', { text: 'Pontos' }), h('span', { class: 'pd-th-ant', text: 'Mês anterior' })));
    const motPorId = {}; ((App.dados && App.dados.motoristas) || []).forEach(m => { motPorId[m.id] = m; });
    const linhas = [];
    lista.forEach(x => {
      const det = Object.keys(x.eventos || {}).map(e => x.eventos[e] + '× ' + String(rot[e] || e).toLowerCase()).join(' · ');
      const mv = this.mov(x, posAntes), pts = h('span', { class: 'pd-pts', text: x.pontos.toLocaleString('pt-BR') });
      const lin = h('div', { class: 'pd-lin' + (x.posicao && x.posicao <= 3 ? ' top' : '') + (x.posicao ? '' : ' zero') + (animar && mv ? ' mexeu ' + (mv.classList.contains('desce') ? 'caiu' : 'subiu') : ''), dataset: { id: x.id, pts: x.pontos } },
        h('span', { class: 'pd-pos', text: x.posicao ? x.posicao + 'º' : '–' }),
        h('span', { class: 'pd-nome' }, h('span', { class: 'pd-nm' }, h('b', { text: nomeBonito(x.nome) }), mv), det ? h('small', { text: det }) : null),
        pts, h('span', { class: 'pd-ant' }, this.seta(x), h('small', { text: x.pontosAnterior ? x.pontosAnterior.toLocaleString('pt-BR') + ' pts' : '' })));
      if (motPorId[x.id]) { lin.classList.add('click'); lin.title = 'Lançar bônus ou desconto'; lin.onclick = () => Pontos.ajustar(motPorId[x.id]); }
      tab.append(lin); linhas.push([lin, x, pts]);
    });
    if (!lista.length) tab.append(h('div', { class: 'empty', text: 'Nenhum motorista cadastrado.' }));
    corpo.append(tab, h('p', { class: 'hint pd-nota', text: 'A seta pequena ao lado do nome mostra quem subiu ou desceu desde a última vez que você viu o ranking. A coluna da direita compara com o mês anterior. Toque num motorista para lançar bônus ou desconto (sempre com motivo).' }));
    if (animar && !calmo) {
      linhas.forEach(([lin, x, pts]) => {
        const t0 = antes[x.id]; if (t0 !== undefined) { const dy = t0 - lin.getBoundingClientRect().top; if (Math.abs(dy) > 2) { lin.style.transform = 'translateY(' + dy + 'px)'; lin.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => { lin.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)'; lin.style.transform = ''; })); } }
        const p0 = ptsAntes[x.id]; if (p0 !== undefined && p0 !== x.pontos) this.contar(pts, p0, x.pontos);
      });
    }
    const pos = {}; lista.forEach(x => { if (x.posicao) pos[x.id] = x.posicao; });
    // a seta fica à vista até a próxima mudança; "desde a última visita" passa a ser este ranking
    this.guardar(r.mes || this.mes, r, animar || !posAntes ? pos : posAntes);
  },
  contar(el, de, ate) { const t0 = performance.now(), dur = 900; const passo = t => { const k = Math.min(1, (t - t0) / dur), v = Math.round(de + (ate - de) * (1 - Math.pow(1 - k, 3))); el.textContent = v.toLocaleString('pt-BR'); if (k < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo); }
};
