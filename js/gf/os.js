/* ================= ORDENS DE SERVIÇO (OS) =================
   Uma OS por caminhão. Status: ABERTA → EM_ATENDIMENTO → (AGUARDANDO_PECA ↔ EM_ATENDIMENTO) → CONCLUIDA · CANCELADA.
   Prazo (SLA) em horas corridas a partir da abertura; aguardando peça pausa o prazo da oficina e corre o de Compras.
   O servidor (OS.gs) é quem grava e quem avisa os atrasos; aqui só mostramos e chamamos as ações. */
const OS_SLA_PADRAO = { P1: { tri: 30, interna: 240, terceira: 1440 }, P2: { tri: 120, interna: 1440, terceira: 2880 }, P3: { tri: 1440, interna: 10080, terceira: 14400 }, P4: { tri: 2880, interna: 43200, terceira: null } };
const OS_ST = { ABERTA: ['Aberta', 'aberta'], EM_ATENDIMENTO: ['Na oficina', 'oficina'], AGUARDANDO_PECA: ['Aguardando peça', 'peca'], CONCLUIDA: ['Concluída', 'feita'], CANCELADA: ['Cancelada', 'cancelada'] };
let osFiltro = 'abertas';

function osSla() { return (App.dados && App.dados.osSla) || OS_SLA_PADRAO; }
function osLista() { return ((App.dados && App.dados.os) || []); }
function osItensDe(o) { return Array.isArray(o.itens) ? o.itens : parseJsonSeguro(o.itens, []); }
function msDe(dh) { const t = String(dh || ''); if (!t) return 0; const d = new Date(t.replace(' ', 'T') + (t.length <= 10 ? 'T12:00:00' : '') + '-03:00'); return isNaN(d) ? 0 : d.getTime(); }
function tempoTxt(min) {
  min = Math.round(Math.abs(min)); if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60; if (h < 48) return h + 'h' + (m ? String(m).padStart(2, '0') : ''); return Math.round(h / 24) + ' dias';
}
/** Prazos da OS: triagem (até alguém classificar) e oficina (descontando o tempo aguardando peça). */
function osPrazos(o, agora) {
  agora = agora || Date.now();
  const sla = osSla()[normCrit(o.criticidade)] || osSla().P3, ini = msDe(o.abertaEm), fim = o.concluidaEm ? msDe(o.concluidaEm) : agora;
  const pausaAtual = o.pecaDesde ? Math.max(0, (agora - msDe(o.pecaDesde)) / 60000) : 0, pausa = (Number(o.pausaMin) || 0) + pausaAtual;
  const usado = Math.max(0, (fim - ini) / 60000 - pausa), prazo = sla[o.oficina === 'terceira' ? 'terceira' : 'interna'];
  const triado = !!o.triadaEm, triUsado = ((triado ? msDe(o.triadaEm) : agora) - ini) / 60000;
  return { prazo, usado, resta: prazo == null ? null : prazo - usado, pct: prazo ? Math.min(100, usado / prazo * 100) : 0, pausado: !!o.pecaDesde, compras: (Number(o.compraMin) || 0) + pausaAtual,
    triado, triPrazo: sla.tri, triResta: sla.tri - triUsado };
}
/** Contador da aba: OS com prazo estourado ou sem triagem no prazo. */
function contarOSAtencao() {
  try { return osAbertas().filter(o => { const p = osPrazos(o); return (!p.triado && p.triResta < 0) || (p.resta != null && p.resta < 0 && !p.pausado && normCrit(o.criticidade) !== 'P4'); }).length; } catch (e) { return 0; }
}
function osPeso(o) { return (CRITS[normCrit(o.criticidade)] || CRITS.P3).n; }

function renderOS() {
  const box = document.getElementById('osPainel'); if (!box) return;
  const todas = osLista(), abertas = todas.filter(o => ['ABERTA', 'EM_ATENDIMENTO', 'AGUARDANDO_PECA'].includes(o.status));
  const fechadas = todas.filter(o => !abertas.includes(o)).sort((a, b) => String(b.concluidaEm).localeCompare(String(a.concluidaEm)));
  const chip = (k, t, n) => `<button type="button" class="os-fchip${osFiltro === k ? ' on' : ''}" onclick="osFiltro='${k}';renderOS()">${t}${n != null ? ` <b>${n}</b>` : ''}</button>`;
  let corpo = '';
  if (osFiltro === 'abertas') {
    if (!abertas.length) corpo = '<p class="empty">Nenhuma ordem de serviço aberta. ✅<br><small>Para abrir, use o botão 🖨️ (Ordem de serviço) e marque os itens de cada caminhão.</small></p>';
    else {
      const col = (st, tit) => { const l = abertas.filter(o => o.status === st).sort((a, b) => (osPeso(a) - osPeso(b)) || String(a.abertaEm).localeCompare(String(b.abertaEm)));
        return `<div class="os-col os-col-${OS_ST[st][1]}"><div class="os-col-tit">${tit} <span>${l.length}</span></div>${l.map(cartaoOS).join('') || '<p class="os-vazio">—</p>'}</div>`; };
      corpo = `<div class="os-board">${col('ABERTA', '📥 Abertas')}${col('EM_ATENDIMENTO', '🔧 Na oficina')}${col('AGUARDANDO_PECA', '🛒 Aguardando peça')}</div>`;
    }
  } else corpo = fechadas.length ? `<div class="os-fechadas">${fechadas.map(cartaoOS).join('')}</div>` : '<p class="empty">Nenhuma OS concluída ou cancelada nos últimos 60 dias.</p>';
  box.innerHTML = `<div class="card os-topo"><div class="os-topo-l"><h2>Ordens de serviço</h2><p class="hint">Prazo em horas corridas desde a abertura. P1 ${tempoTxt(osSla().P1.interna)} · P2 ${tempoTxt(osSla().P2.interna)} · P3 ${tempoTxt(osSla().P3.interna)} · P4 até 30 dias (oficina interna).</p></div>
    <div class="os-topo-r">${chip('abertas', 'Abertas', abertas.length)}${chip('fechadas', 'Concluídas e canceladas', fechadas.length)}<button class="btn" type="button" onclick="imprimirRelatorioMecanico()">＋ Nova OS</button></div></div>${corpo}`;
}

function cartaoOS(o) {
  const c = normCrit(o.criticidade) || 'P3', cr = CRITS[c], p = osPrazos(o), aberta = ['ABERTA', 'EM_ATENDIMENTO', 'AGUARDANDO_PECA'].includes(o.status), itens = osItensDe(o);
  let prazo = '';
  if (aberta) {
    if (p.prazo == null) prazo = `<div class="os-prazo ok">Sem prazo rígido · fazer na próxima parada</div>`;
    else { const atr = p.resta < 0, perto = !atr && p.pct >= 75;
      prazo = `<div class="os-prazo ${atr ? 'atrasada' : perto ? 'perto' : 'ok'}"><div class="os-barra"><i style="width:${p.pct.toFixed(0)}%"></i></div>
        <span>${p.pausado ? '⏸️ Prazo pausado (aguardando peça há ' + tempoTxt(p.compras) + ') · ' : ''}${atr ? '⏰ Atrasada ' + tempoTxt(-p.resta) : 'Faltam ' + tempoTxt(p.resta)} · prazo ${tempoTxt(p.prazo)} (${o.oficina === 'terceira' ? 'terceira' : 'interna'})</span></div>`; }
    if (!p.triado) prazo += `<div class="os-tri ${p.triResta < 0 ? 'atrasada' : ''}">⏱️ Triagem: ${p.triResta < 0 ? 'atrasada ' + tempoTxt(-p.triResta) : 'classificar em até ' + tempoTxt(p.triResta)} — confira o tipo e a criticidade</div>`;
  } else prazo = `<div class="os-prazo fim">${o.status === 'CONCLUIDA' ? '✅ Concluída' : '✖️ Cancelada'} em ${fmtQuando(o.concluidaEm)}${o.concluidaPor ? ' por ' + escHtml(o.concluidaPor) : ''} · ${tempoTxt(p.usado)} de oficina${Number(o.compraMin) > 0 ? ' · ' + tempoTxt(o.compraMin) + ' aguardando peça' : ''}${o.status === 'CONCLUIDA' && Number(o.valor) > 0 ? ' · ' + fmtMoeda(Number(o.valor)) : ''}${o.motivo ? ' — ' + escHtml(o.motivo) : ''}</div>`;
  const op = aberta && c !== 'P4' ? backlogP4(o.placa) : [];
  const gest = GF.perfil() !== 'mecanico', id = escAttr(o.id), b = (t, f, cls) => `<button type="button" class="btn small ${cls || ''}" onclick="${f}('${id}')">${t}</button>`;
  let acoes = '';
  if (o.status === 'ABERTA') acoes = b('Classificar', 'osClassificar', 'secondary') + b('🔧 Entrou na oficina', 'osIniciar');
  else if (o.status === 'EM_ATENDIMENTO') acoes = b('🛒 Aguardando peça', 'osPeca', 'secondary') + b('✅ Concluir', 'osConcluir');
  else if (o.status === 'AGUARDANDO_PECA') acoes = b('📦 Peça chegou', 'osPecaChegou', 'secondary') + b('✅ Concluir', 'osConcluir');
  if (aberta && o.status !== 'ABERTA') acoes = b('Classificar', 'osClassificar', 'secondary') + acoes;
  acoes += b('🖨️', 'osImprimirUma', 'secondary') + (aberta && gest ? b('Cancelar', 'osCancelar', 'secondary os-canc') : '');
  return `<div class="os-card ${cr.cls}${aberta ? '' : ' fechada'}">
    <div class="os-card-top"><span class="os-num">${escHtml(o.numero || '')}</span>${placaClicavel(o.placa)}<span class="crit-chip ${cr.cls}">${cr.ic} ${c}</span>${tagClasse(normClasse(o.tipo) || 'CORR-PL')}${o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA' ? '' : ''}</div>
    <ul class="os-itens">${itens.map(i => `<li>${escHtml(i.nome)}${i.crit && i.crit !== c ? ` <small>(${escHtml(i.crit)})</small>` : ''}</li>`).join('')}</ul>
    ${o.peca && o.status === 'AGUARDANDO_PECA' ? `<div class="os-peca">🛒 Peça: ${escHtml(o.peca)}</div>` : ''}
    ${op.length ? `<div class="oport-faixa mini">♻️ Aproveite a parada: ${op.length} item(ns) P4 deste caminhão. <button type="button" class="btn-link" onclick="osAdicionarP4('${id}')">Incluir nesta OS</button></div>` : ''}
    ${prazo}
    <div class="os-meta">Aberta ${fmtQuando(o.abertaEm)}${o.abertaPor ? ' por ' + escHtml(o.abertaPor) : ''}${o.prestador ? ' · ' + escHtml(o.prestador) : ''}${o.agendadaPara ? ' · agendada para ' + fmtData(String(o.agendadaPara).slice(0, 10)) : ''}</div>
    <div class="os-acoes">${acoes}</div></div>`;
}

/* ---------- ações (servidor grava; aqui atualizamos a lista com o que voltou) ---------- */
function osAtual(id) { return osLista().find(o => o.id === id); }
async function osAcao(id, dados, msg) {
  try {
    const r = await apiPost('atualizarOS', Object.assign({ id }, dados));
    const l = osLista(), i = l.findIndex(o => o.id === id); if (r && r.os && i >= 0) l[i] = r.os;
    toast(msg + (r && r.liberou ? ' Caminhão liberado.' : '')); renderTelaAtual();
    if (dados.acao === 'concluir' || dados.acao === 'cancelar' || (r && r.liberou) || dados.criticidade) App.recarregar(true);
    return true;
  } catch (e) { toast(e.message, true); return false; }
}
function osClassificar(id) {
  const o = osAtual(id); if (!o) return;
  const sel = (op, v) => { const s = h('select', {}, ...Object.keys(op).map(k => h('option', { value: k, text: op[k] }))); s.value = v; return s; };
  const tipo = sel(CLASSES, normClasse(o.tipo) || 'CORR-PL'), crit = sel(Object.fromEntries(Object.keys(CRITS).map(k => [k, CRITS[k].ic + ' ' + CRITS[k].t])), normCrit(o.criticidade) || 'P3');
  const ofi = sel({ interna: 'Oficina interna', terceira: 'Oficina terceira' }, o.oficina || 'interna'), prest = h('input', { type: 'text', maxlength: 80, value: o.prestador || '', placeholder: 'Nome da oficina de fora (se for terceira)' });
  const ag = h('input', { type: 'date', value: o.agendadaPara ? String(o.agendadaPara).slice(0, 10) : '' });
  const campo = (t, el) => h('div', { class: 'field' }, h('label', { text: t }), el), salvar = h('button', { class: 'btn', type: 'button', text: 'Salvar' });
  const m = abrirModal('Classificar ' + o.numero + ' · ' + o.placa, h('div', {}, h('div', { class: 'row' }, campo('Criticidade', crit), campo('Tipo de manutenção', tipo)), h('div', { class: 'row' }, campo('Onde', ofi), campo('Agendada para (P3)', ag)), campo('Oficina terceira', prest),
    h('p', { class: 'hint', text: 'P1 bloqueia o caminhão (proibido escalar). P2: operação restrita. Prazos contam da abertura da OS.' }), h('div', { class: 'modal-actions' }, salvar)));
  salvar.onclick = async () => { salvar.disabled = true; if (await osAcao(id, { acao: 'triar', tipo: tipo.value, criticidade: crit.value, oficina: ofi.value, prestador: prest.value.trim(), agendadaPara: ag.value }, 'OS classificada.')) m.fechar(); else salvar.disabled = false; };
}
function osIniciar(id) {
  const o = osAtual(id); if (!o) return;
  const ofi = h('select', {}, h('option', { value: 'interna', text: 'Oficina interna (nossa)' }), h('option', { value: 'terceira', text: 'Oficina terceira (de fora)' })); ofi.value = o.oficina || 'interna';
  const prest = h('input', { type: 'text', maxlength: 80, value: o.prestador || '', placeholder: 'Ex.: Retífica Sul' }), ok = h('button', { class: 'btn', type: 'button', text: 'Confirmar entrada' });
  const m = abrirModal('Caminhão entrou na oficina · ' + o.placa, h('div', {}, h('div', { class: 'field' }, h('label', { text: 'Onde' }), ofi), h('div', { class: 'field' }, h('label', { text: 'Oficina terceira (se for de fora)' }), prest), h('div', { class: 'modal-actions' }, ok)));
  ok.onclick = async () => { ok.disabled = true; if (await osAcao(id, { acao: 'iniciar', oficina: ofi.value, prestador: prest.value.trim() }, 'Em atendimento.')) m.fechar(); else ok.disabled = false; };
}
async function osPeca(id) {
  const t = await pedirTextoCustom('Aguardando peça', 'Qual peça está faltando? O prazo da oficina fica pausado e os admins (Compras) são avisados.', '', 'Ex.: lona de freio traseira');
  if (t === null) return; if (String(t).trim().length < 2) return toast('Diga qual é a peça.', true);
  osAcao(id, { acao: 'aguardarPeca', peca: String(t).trim() }, 'Aguardando peça: prazo da oficina pausado.');
}
function osPecaChegou(id) { osAcao(id, { acao: 'pecaChegou' }, 'Peça recebida: o prazo da oficina voltou a correr.'); }
async function osCancelar(id) {
  const t = await pedirTextoCustom('Cancelar OS', 'Por que esta OS está sendo cancelada? Os itens voltam a ficar pendentes.');
  if (t === null) return; if (String(t).trim().length < 3) return toast('Diga o motivo.', true);
  osAcao(id, { acao: 'cancelar', motivo: String(t).trim() }, 'OS cancelada.');
}
function osConcluir(id) {
  const o = osAtual(id); if (!o) return; const v = db.veiculos.find(x => x.placa === o.placa), itens = osItensDe(o), marc = {};
  const linhas = itens.map((i, k) => { const cb = h('input', { type: 'checkbox', checked: true }), val = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'R$ (opcional)', class: 'os-val' }); marc[k] = { cb, val };
    return h('label', { class: 'os-item' }, cb, h('span', { class: 'os-tx' }, h('b', { text: i.nome }), h('small', { text: (i.crit || '') + (i.classe ? ' · ' + i.classe : '') })), val); });
  const km = h('input', { type: 'text', inputmode: 'numeric', value: v && v.kmAtual ? Number(v.kmAtual).toLocaleString('pt-BR') : '' }), obs = h('textarea', { rows: 2, maxlength: 400, placeholder: 'O que foi feito / peças trocadas (opcional)' });
  const ok = h('button', { class: 'btn', type: 'button', text: '✅ Concluir e pôr no histórico' });
  const m = abrirModal('Concluir ' + o.numero + ' · ' + o.placa, h('div', { class: 'os-concluir' }, h('p', { class: 'hint', text: 'Desmarque o que não foi feito: volta a ficar pendente. O que estiver marcado vai para o histórico do caminhão.' }), ...linhas,
    h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'KM do caminhão' }), km)), h('div', { class: 'field' }, h('label', { text: 'Observação' }), obs), h('div', { class: 'modal-actions' }, ok)), { largo: true });
  ok.onclick = async () => {
    const feitos = itens.map((i, k) => marc[k].cb.checked ? { ref: i.ref, id: i.id, nome: i.nome, valor: parseNumeroBR(marc[k].val.value) || 0 } : null).filter(Boolean);
    if (!feitos.length) return toast('Marque pelo menos um item feito (ou cancele a OS).', true);
    const k = km.value.trim() ? parseNumeroBR(km.value) : ''; if (km.value.trim() && (isNaN(k) || k < 0)) return toast('KM inválido.', true);
    ok.disabled = true; if (await osAcao(id, { acao: 'concluir', feitos, km: k, servicoFeito: obs.value.trim() }, 'OS concluída: ' + feitos.length + ' item(ns) no histórico.')) m.fechar(); else ok.disabled = false;
  };
}
function osAdicionarP4(id) {
  const o = osAtual(id); if (!o) return; const op = backlogP4(o.placa); if (!op.length) return;
  osAcao(id, { acao: 'editar', adicionar: op.map(i => ({ ref: i.ref, id: i.refId, nome: i.nome, crit: i.crit, classe: i.classe })) }, op.length + ' item(ns) P4 incluído(s) nesta OS.');
}
function osImprimirUma(id) {
  const o = osAtual(id); if (!o) return;
  const itens = osItensDe(o).map(i => ({ placa: o.placa, nome: i.nome, crit: normCrit(i.crit) || normCrit(o.criticidade) || 'P3', classe: normClasse(i.classe) || normClasse(o.tipo), ultima: '-', sit: OS_ST[o.status] ? OS_ST[o.status][0] : '', detalhe: '' }));
  imprimirOS(itens, o.oficina === 'terceira' ? 'externa' : 'interna', o.prestador || '', o.obs || '', { [o.placa]: o.numero });
}

/** Gera as OS (uma por caminhão) a partir dos itens marcados no "🖨️ Ordem de serviço". Devolve { placa: número }. */
async function osGerarDosItens(escolhidos, tipoOS, prestador, obs) {
  const porPlaca = {}; escolhidos.forEach(i => { if (i.ref && !osDoItem(i.ref, i.refId)) (porPlaca[i.placa] = porPlaca[i.placa] || []).push(i); });
  const ordens = Object.keys(porPlaca).map(pl => { const l = porPlaca[pl], pior = l.reduce((a, i) => CRITS[i.crit].n < CRITS[a].n ? i.crit : a, 'P4');
    const tipo = l.some(i => i.classe === 'CORR-NP') ? 'CORR-NP' : l.some(i => i.classe === 'CORR-PL') ? 'CORR-PL' : (l[0].classe || 'PREV');
    return { placa: pl, criticidade: pior, tipo, oficina: tipoOS === 'externa' ? 'terceira' : 'interna', prestador, obs, itens: l.map(i => ({ ref: i.ref, id: i.refId, nome: i.nome.replace(/ \(agendado\)$/, ''), crit: i.crit, classe: i.classe })) }; });
  if (!ordens.length) return {};
  const r = await apiPost('criarOS', { ordens }); const nums = {};
  ((r && r.os) || []).forEach(o => { nums[o.placa] = o.numero; App.dados.os = (App.dados.os || []).concat([o]); });
  return nums;
}
