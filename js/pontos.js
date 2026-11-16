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
      try { await API.chamar('resgatarPontos', { tipo, dataDesejada: dataIn.value }); toast('Pedido enviado! A gestão vai avaliar.'); m.fechar(); await App.recarregar(true); this.chip(); this.abrirMotorista(); }
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
