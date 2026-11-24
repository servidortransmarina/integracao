/* GF portado para o Hub Transmarina. Origem: script.js do GF. Removidos: login, cadastro, aprovações, avatar, notificações em pop-up.
   A comunicação agora passa por API.chamar (token de sessão) e o perfil/nome vêm de GF.perfil()/GF.nome(). */
/* ================= ESTADO E CACHE ================= */
let db = { veiculos: [], manutencoes: [], limites: {}, alertas: [], agendamentos: [], pendentes: [], pneus: [], movPneus: [] };
let carregando = false;

const TIPOS = { oleo: 'Troca de óleo do motor', alinhamento: 'Alinhamento', oleo_caixa: 'Troca de óleo da caixa', oleo_diferencial: 'Troca de óleo do diferencial', engraxamento: 'Engraxamento' };
const TIPOS_RASTREADOS = ['oleo', 'alinhamento', 'oleo_caixa', 'oleo_diferencial', 'engraxamento'];
const LIMITES_PADRAO = { oleo: { modo: 'km_e_meses', km: 15000, meses: 12 }, alinhamento: { modo: 'km_e_meses', km: 20000, meses: 6 }, oleo_caixa: { modo: 'km_e_meses', km: 100000, meses: 24 }, oleo_diferencial: { modo: 'km_e_meses', km: 100000, meses: 24 }, engraxamento: { modo: 'km_e_meses', km: 10000, meses: 15 } };   // engraxamento: o campo "meses" guarda DIAS (ver TEMPO_EM_DIAS)
const TEMPO_EM_DIAS = ['engraxamento'];      // serviços cujo prazo é contado em dias, não em meses
const unTempo = tipo => TEMPO_EM_DIAS.includes(tipo) ? 'dias' : 'meses';
const LABEL_ULTIMA = { oleo: 'Último óleo do motor', alinhamento: 'Último alinhamento', oleo_caixa: 'Último óleo da caixa', oleo_diferencial: 'Último óleo do diferencial', engraxamento: 'Último engraxamento' };
const CACHE_KEY = 'frotaCacheV13';

function salvarCache() {}
function carregarCache() { return false; }

/* ================= CAIXAS NATIVAS REFORMULADAS (PROMISSES) ================= */
function confirmarCustom(titulo, msg) {
  return new Promise(resolve => {
    const modal = document.getElementById('modalConfirm');
    modal.style.zIndex = '10000'; 
    document.getElementById('confirmTitle').textContent = titulo; document.getElementById('confirmMsg').textContent = msg; openModal('modalConfirm');
    const btnConf = document.getElementById('confirmBtn'); const btnCanc = document.getElementById('confirmCancelBtn');
    const clear = () => { btnConf.onclick = null; btnCanc.onclick = null; modal.style.zIndex = ''; closeModal('modalConfirm'); };
    btnConf.onclick = () => { clear(); resolve(true); }; btnCanc.onclick = () => { clear(); resolve(false); };
  });
}

function alertarCustom(titulo, msg) {
  return new Promise(resolve => {
    const modal = document.getElementById('modalConfirm');
    document.getElementById('confirmTitle').textContent = titulo; document.getElementById('confirmMsg').textContent = msg;
    modal.style.zIndex = '10000'; openModal('modalConfirm');
    const btnConf = document.getElementById('confirmBtn'); const btnCanc = document.getElementById('confirmCancelBtn');
    const classeAntiga = btnConf.className; btnConf.textContent = 'OK'; btnConf.className = 'btn success'; btnCanc.style.display = 'none';
    const clear = () => { btnConf.onclick = null; btnConf.textContent = 'Confirmar'; btnConf.className = classeAntiga; btnCanc.style.display = 'inline-block'; modal.style.zIndex = ''; closeModal('modalConfirm'); };
    btnConf.onclick = () => { clear(); resolve(true); };
  });
}

/** Pergunta um texto (motivo, peça…). Devolve o texto ou null se cancelar. */
function pedirTextoCustom(titulo, msg, padrao, placeholder) {
  return new Promise(ok => {
    const inp = h('input', { type: 'text', maxlength: 200, value: padrao || '', placeholder: placeholder || '' }); let feito = false;
    const fim = v => { if (feito) return; feito = true; m.fechar(); ok(v); };
    const conf = h('button', { class: 'btn', type: 'button', text: 'Confirmar', onclick: () => fim(inp.value) });
    inp.onkeydown = e => { if (e.key === 'Enter') fim(inp.value); };
    const m = abrirModal(titulo, h('div', {}, h('p', { class: 'hint', text: msg }), inp, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Cancelar', onclick: () => fim(null) }), conf)), { aoFechar: () => { if (!feito) { feito = true; ok(null); } } });
    setTimeout(() => inp.focus(), 50);
  });
}
function pedirKmCustom(titulo, msg, valorPadrao) {
  return new Promise(resolve => {
    const modal = document.getElementById('modalPrompt');
    modal.style.zIndex = '10000';
    document.getElementById('promptTitle').textContent = titulo; document.getElementById('promptMsg').textContent = msg;
    const input = document.getElementById('promptInput'); input.value = valorPadrao > 0 ? Number(valorPadrao).toLocaleString('pt-BR') : '';
    openModal('modalPrompt'); setTimeout(() => input.focus(), 100);
    const btnConf = document.getElementById('promptBtnOk'); const btnCanc = document.getElementById('promptBtnCancel');
    const clear = () => { btnConf.onclick = null; btnCanc.onclick = null; modal.style.zIndex = ''; closeModal('modalPrompt'); };
    btnConf.onclick = () => { clear(); resolve(input.value); }; btnCanc.onclick = () => { clear(); resolve(null); };
  });
}

/* ================= FILA E COMUNICAÇÃO ================= */
let _fila = Promise.resolve();

function enfileirar(fn) { const p = _fila.then(fn); _fila = p.catch(() => {}); return p; }
function setLoading(v) { carregando = v; const el = document.getElementById('loadingOverlay'); if (el) el.classList.toggle('show', v); }
function execBackground(asyncFn, failMsg) { asyncFn().catch(e => { console.error(e); toast(`${failMsg}: ${e.message}`, true); }); }

/* Comunicação: tudo passa pelo servidor com o token da sessão. Reenvia só em falha de rede (as gravações são idempotentes). */
async function apiGet() { return enfileirar(() => API.chamar('getBootstrap')); }
async function apiPost(action, data) {
  return enfileirar(async () => {
    let ultimo;
    for (let i = 0; i < 3; i++) {
      try { return await API.chamar(action, data || {}); }
      catch (e) { ultimo = e; if (!/^Sem conexão/.test(e.message)) throw e; await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
    }
    throw ultimo;
  });
}

function normalizarDadosDaPlanilha(raw) {
  const veiculos = (raw.veiculos || []).map(v => ({ placa: String(v.placa).trim().toUpperCase(), kmAtual: Number(v.kmAtual) || 0,
    modelo: v.modelo || '', ano: v.ano || '', tipoDiesel: v.tipoDiesel || '', utilizaArla: v.utilizaArla || '', tipoTacografo: v.tipoTacografo || '',
    statusVeiculo: v.statusVeiculo || '', capacidadeDiesel: Number(v.capacidadeDiesel) || 0, capacidadeArla: Number(v.capacidadeArla) || 0,
    paradoDesde: v.paradoDesde ? String(v.paradoDesde) : '', paradoPor: v.paradoPor || '', paradoOrigem: v.paradoOrigem || '' }));
  // Abastecimentos de fatura/lançamento da gestão entram como "manutenção" do tipo abastecimento (é o formato que o Dashboard e o histórico do GF leem).
  const abast = (raw.abastecimentos || []).filter(a => a.origem !== 'motorista' && a.status !== 'expirado' && a.placa).map(a => {
    const l = Number(a.litros) || 0, vu = Number(a.valorUnit) || 0;
    return { id: String(a.id), placa: a.placa, tipo: 'abastecimento', descricao: a.produto || 'Diesel S10', km: a.km, data: a.data, valor: a.valor,
      observacao: 'Qtd: ' + l.toFixed(2) + ' L | R$ ' + vu.toFixed(3) + '/L', nome: a.usuario || '', _abs: true, _litros: l, _hora: a.hora || '' };
  });
  const manutencoes = (raw.manutencoes || []).concat(abast).map(m => ({ _abs: m._abs, _litros: m._litros, _hora: m._hora,
    id: String(m.id), placa: String(m.placa).trim().toUpperCase(), tipo: (t => t === 'outro' && /^\s*engrax/i.test(String(m.descricao || '')) ? 'engraxamento' : t)(String(m.tipo || '').trim().toLowerCase()),
    descricao: String(m.descricao || m['descrição'] || m['Descricao'] || m['Descrição'] || m['descriçao'] || m['Descriçao'] || '').trim(),
    km: Number(m.km) || 0, data: formatarDataPlanilhaParaISO(m.data), valor: Number(m.valor) || 0, observacao: m.observacao || '', nome: m.nome || m['Nome'] || m.responsavel || '',
    classe: String(m.classe || '').toLowerCase(), nota: String(m.nota || ''), garantia: String(m.garantia || ''),
    criadoEmTxt: String(m.criadoEm || ''), criadoPor: String(m.criadoPor || ''), alteradoEm: String(m.alteradoEm || ''),
    lote: String(m.lote || ''), oficina: String(m.oficina || ''), notaNum: String(m.notaNum || ''), valorPecas: Number(m.valorPecas) || 0
  }));
  const limites = {};
  (raw.limites || []).forEach(l => {
    const p = String(l.placa).trim().toUpperCase(); if (!limites[p]) limites[p] = {};
    limites[p][String(l.tipo || '').trim()] = { modo: l.modo, km: Number(l.km) || 0, meses: Number(l.meses) || 0 };
  });
  
  const alertas = (raw.alertas || []).filter(a => a.status !== 'resolvido').map(a => ({
    id: String(a.id), placa: String(a.placa).trim().toUpperCase(), tipo: String(a.tipo || '').trim(), status: a.status || 'ativo',
    dataAnalise: a.dataAnalise ? formatarDataPlanilhaParaISO(a.dataAnalise) : null, dataResolucao: a.dataResolucao ? formatarDataPlanilhaParaISO(a.dataResolucao) : null,
    classificadoPor: String(a.classificadoPor || a['Classificado por'] || '').trim(),
    notificadosLista: String(a.notificado || a['Notificado'] || '').toLowerCase(), criticidade: String(a.criticidade || '').toLowerCase()
  }));
  
  const agendamentos = (raw.agendamentos || []).map(a => ({
    id: String(a.id), placa: String(a.placa).trim().toUpperCase(), tipo: String(a.tipo || '').trim(),
    descricao: a.descricao || a['descrição'] || a['Descricao'] || a['Descrição'] || a['descriçao'] || a['Descriçao'] || '',
    dataPrevista: a.dataPrevista ? formatarDataPlanilhaParaISO(a.dataPrevista) : '', valor: Number(a.valor) || 0, observacao: a.observacao || '', criadoEm: a.criadoEm ? formatarDataPlanilhaParaISO(a.criadoEm) : '', criadoEmTxt: String(a.criadoEm || ''), criadoPor: String(a.criadoPor || ''), alteradoEm: String(a.alteradoEm || ''), nome: a.nome || a['Nome'] || a.responsavel || '',
    classe: String(a.classe || '').toLowerCase(), criticidade: String(a.criticidade || '').toLowerCase(),
    lote: String(a.lote || ''), pecas: Array.isArray(a.pecas) ? a.pecas : parseJsonSeguro(a.pecas, [])
  }));
  const pendentes = [];

  manutencoes.forEach(m => {
    if (m.tipo !== 'outro' || m.descricao) return;
    const alerta = alertas.find(a => a.placa === m.placa && a.status === 'resolvido' && a.dataResolucao === m.data && a.tipo && !TIPOS[a.tipo]);
    if (alerta) m.descricao = String(alerta.tipo).trim();
  });
  
  const pneus = Array.isArray(raw.pneus) ? raw.pneus : [];
  const movPneus = Array.isArray(raw.movPneus) ? raw.movPneus : [];
  return { veiculos, manutencoes, limites, alertas, agendamentos, pendentes, pneus, movPneus };
}

function formatarDataPlanilhaParaISO(valor) {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  const d = new Date(valor); if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function carregarDoServidor(silencioso) {
  if (!silencioso) setLoading(true);
  try {
    const raw = await apiGet();
    App.dados = raw;
    db = normalizarDadosDaPlanilha(limparTextoGF(raw));
    db.veiculos.forEach(v => garantirLimites(v.placa));
  } catch (e) {
    if (!silencioso) toast('Erro ao carregar dados: ' + e.message, true);
  } finally {
    if (!silencioso) setLoading(false);
  }
}

function garantirLimites(placa) {
  if (!db.limites[placa]) db.limites[placa] = {};
  TIPOS_RASTREADOS.forEach(t => { if (!db.limites[placa][t]) db.limites[placa][t] = Object.assign({}, LIMITES_PADRAO[t]); });
}

function gerarId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9); }
function fmtData(iso) { if (!iso) return '-'; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; }
function dataHoraAtual() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function quemEQuando() { return (GF.nome()) + ' (em ' + dataHoraAtual() + ')'; }
function hojeISO() { return new Date().toISOString().split('T')[0]; }
function hojeLocal() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtMoeda(v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtKm(v) { return (v || 0).toLocaleString('pt-BR') + ' km'; }

function parseNumeroBR(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim(); if (s === '') return NaN;
  return Number(s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
}

function normPeca(str) {
  let s = String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/['"´`]/g, "").toLowerCase();
  s = s.replace(/\b(de|da|do|das|dos|e|p|para|com|sem)\b/g, ' '); 
  return s.replace(/\s+/g, " ").trim();
}

function atualizarDatalistServicos() {
  const dl = document.getElementById('listaServicos');
  if (!dl) return;
  const tiposUnicos = new Set();
  Object.values(TIPOS).forEach(t => tiposUnicos.add(t)); 
  
  db.manutencoes.forEach(m => {
     const t = m.tipo === 'outro' ? m.descricao : TIPOS[m.tipo] || m.tipo;
     if (t && t.trim() !== '' && t !== 'Registro de KM') {
         tiposUnicos.add(t.trim()); 
     }
  });
  const arr = Array.from(tiposUnicos).sort();
  dl.innerHTML = arr.map(t => `<option value="${t}">`).join('');
}

function escAttr(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function toast(msg, isErr) { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show' + (isErr ? ' err' : ''); setTimeout(() => { t.className = 'toast'; }, isErr ? 6000 : 3500); }
function addDias(iso, dias) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; }
function addMeses(iso, meses) { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + meses); return d.toISOString().split('T')[0]; }
function normalizarPlaca(p) { return p.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function placaValida(p) { return /^[A-Z]{3}[0-9]{4}$/.test(p) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function openModal(id) { document.getElementById(id).classList.add('show'); }
function nomeTipo(t) { return TIPOS[t] || t; }
function nomeManutencao(item) {
  const tipo = String(item?.tipo || '').trim().toLowerCase();
  if (tipo === 'outro' || tipo === 'abastecimento') {
    const desc = String(item?.descricao || item?.['descrição'] || item?.['Descricao'] || item?.['Descrição'] || item?.['descriçao'] || item?.['Descriçao'] || '').trim();
    return desc || (tipo === 'abastecimento' ? 'Abastecimento' : 'Outro');
  }
  return TIPOS[tipo] || item?.tipo || 'Outro';
}

/* ================= INTELIGÊNCIA: VALIDAÇÃO DO KM ================= */
function validarSaltoKm(placa, novoKm, dataReferencia, isCorrecaoManual = false) {
  if (isNaN(novoKm) || novoKm <= 0) return { erro: true, msg: 'KM inválido.' };
  const v = db.veiculos.find(x => x.placa === placa);
  if (!v) return null;

  const kmAnterior = v.kmAtual; 
  
  if (novoKm < kmAnterior) {
     if (isCorrecaoManual) {
         if (dataReferencia === hojeISO()) return { alerta: true, msg: `⚠️ CORREÇÃO DE KM\n\nO valor digitado (${fmtKm(novoKm)}) é MENOR que o último KM do painel (${fmtKm(kmAnterior)}).\n\nTem certeza que deseja abaixar o KM do veículo no sistema?` };
     } else {
         // Manutenção já feita (nota que chegou depois): o KM do serviço pode ser menor que o de hoje. Só confere se a diferença for grande demais (erro de digitação).
         // O KM atual do caminhão não baixa: só sobe quando o lançado é maior.
         if (kmAnterior - novoKm > 30000) return { alerta: true, msg: `⚠️ KM BEM MENOR QUE O ATUAL\n\nO serviço foi lançado com ${fmtKm(novoKm)}, mas o caminhão já está com ${fmtKm(kmAnterior)} (${fmtKm(kmAnterior - novoKm)} a menos).\n\nSe o serviço foi feito há bastante tempo, está certo. Confirma o KM?` };
         return null;
     }
  }
  
  if (novoKm > kmAnterior) {
     const diffKm = novoKm - kmAnterior;
     if (diffKm > 2000) { 
         const ms = db.manutencoes.filter(m => m.placa === placa && m.km > 0).sort((a,b) => new Date(b.data) - new Date(a.data));
         const dataAnterior = ms.length > 0 ? ms[0].data : hojeISO();
         let diffDias = Math.floor((new Date(dataReferencia + 'T00:00:00') - new Date(dataAnterior + 'T00:00:00')) / (1000*60*60*24));
         if (diffDias < 1) diffDias = 1; 
         
         const media = diffKm / diffDias;
         if (media > 800) { 
            return { alerta: true, msg: `⚠️ SALTO SUSPEITO\n\nForam lançados ${fmtKm(diffKm)} em ${diffDias} dia(s) (Média irreal de ${Math.round(media)} km/dia).\n\nVocê tem certeza absoluta que digitou o valor correto?` };
         }
     }
  }
  return null; 
}

/* ================= NAVEGAÇÃO (o Hub decide a aba; aqui só se desenha) ================= */
let gfAba = 'manutencao';
function renderTelaAtual() {
  const tabAtiva = gfAba;
  if (tabAtiva === 'manutencao') { if (veiculoSel) renderDetalhe(); else renderManutTab(); }
  else if (tabAtiva === 'dashboard') renderDashboard();
  else if (tabAtiva === 'alertas') renderAlertas();
  else if (tabAtiva === 'ordens') renderOS();
  else if (tabAtiva === 'pneus') { try { renderPneus(); } catch (e) { console.error(e); const p = document.getElementById('pneusPainel'); if (p) p.textContent = 'Erro na aba de pneus: ' + e.message; } }
}

async function atualizarManualmente() {
  const btn = document.getElementById('btnAtualizar'); if (btn) btn.disabled = true;
  await carregarDoServidor(); sincronizarAlertas(false); renderTelaAtual(); if (typeof Hub !== 'undefined') Hub.aposDados(); toast('Dados sincronizados da nuvem.'); if (btn) btn.disabled = false;
}

/* ================= ABA UNIFICADA: VEÍCULOS & MANUTENÇÃO ================= */
let veiculoSel = null; let manutEditId = null; let resolverAlertaId = null; let resolverAgendamentoId = null;

async function cadastrarVeiculo() {
  if (GF.perfil() === 'mecanico') return toast("Acesso negado: Apenas gestores podem cadastrar frota.", true);
  
  const input = document.getElementById('inputPlaca'); const err = document.getElementById('errPlaca'); err.textContent = ''; input.classList.remove('err');
  const placa = normalizarPlaca(input.value);
  if (!placa) { err.textContent = 'Informe a placa do veículo.'; input.classList.add('err'); return; }
  if (!placaValida(placa)) { err.textContent = 'Placa inválida.'; input.classList.add('err'); return; }
  if (db.veiculos.some(v => v.placa === placa)) { err.textContent = 'Veículo já cadastrado.'; input.classList.add('err'); return; }
  
  db.veiculos.push({ placa, kmAtual: 0 }); garantirLimites(placa); salvarCache(); input.value = ''; 
  closeModal('modalCadVeiculo'); renderManutTab(); toast('Sincronizando novo veículo...');
  execBackground(async () => { await apiPost('addVeiculo', { placa }); sincronizarAlertas(true); }, 'Erro ao salvar na planilha');
}

async function excluirVeiculo(placa) {
  if (GF.perfil() === 'mecanico') return toast("Acesso negado: Você não tem permissão de excluir a frota.", true);

  const quer = await confirmarCustom('Excluir Caminhão', `Atenção: Tem certeza de que deseja excluir permanentemente a placa ${placa} e apagar todo o seu histórico financeiro do Dashboard?`);
  if (!quer) return;
  db.veiculos = db.veiculos.filter(v => v.placa !== placa); db.manutencoes = db.manutencoes.filter(m => m.placa !== placa); db.agendamentos = db.agendamentos.filter(a => a.placa !== placa); db.alertas = db.alertas.filter(a => a.placa !== placa);
  salvarCache(); renderManutTab(); toast('Excluindo veículo...');
  execBackground(async () => { await apiPost('deleteVeiculo', { placa }); }, 'Erro ao excluir veículo');
}

function statusVeiculo(placa) {
  const al = db.alertas.filter(a => a.placa === placa && a.status !== 'resolvido');
  const oc = ocorrenciasAbertas().filter(o => o.placa === placa);
  if (al.some(a => a.status === 'ativo') || oc.some(ocorrenciaGrave)) return 'atrasado';
  if (oc.length) return 'analise';
  if (al.some(a => a.status === 'analise')) return 'analise';
  return 'ok';
}

function renderManutTab() {
  veiculoSel = null; document.getElementById('manutDetalheWrap').style.display = 'none'; document.getElementById('manutListaWrap').style.display = 'block';
  const wrap = document.getElementById('chipsVeiculos');
  
  const perfil = GF.perfil(); const isAdmin = perfil !== "mecanico";
  let htmlBotaoAdd = isAdmin ? `<div class="placa-veiculo add-btn" onclick="openModal('modalCadVeiculo')"><div class="add-icon">🚛 +</div><div class="add-text">Novo Caminhão</div></div>` : '';

  let htmlVeiculos = db.veiculos.map(v => {
    const st = statusVeiculo(v.placa); const cor = st === 'atrasado' ? 'var(--danger)' : (st === 'analise' ? 'var(--warning)' : 'var(--success)');
    const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v.placa); const classePlaca = isMercosul ? 'mercosul' : 'antiga'; const nomeTopo = isMercosul ? 'BRASIL' : 'TRANSMARINA';
    const so = statusVeiculoOp(v.placa), bl = so.st === 'BLOQUEADO', rs = so.st === 'RESTRITA';
    return `<div class="placa-veiculo ${classePlaca}${bl ? ' parado' : rs ? ' restrita' : ''}" onclick="selecionarVeiculo('${v.placa}')"${bl || rs ? ` title="${escAttr(so.motivo)}"` : ''}><div class="placa-status-dot" style="background:${cor}"></div><div class="placa-topo">${nomeTopo}</div><div class="placa-numero">${v.placa}</div>${bl ? '<div class="placa-parado">BLOQUEADO</div>' : rs ? '<div class="placa-parado restrita">RESTRITA</div>' : ''}</div>`;
  }).join('');
  
  wrap.innerHTML = htmlBotaoAdd + htmlVeiculos;
}

function selecionarVeiculo(placa) { veiculoSel = placa; document.getElementById('manutListaWrap').style.display = 'none'; document.getElementById('manutDetalheWrap').style.display = 'block'; renderDetalhe(); }

function ultimaManut(placa, tipo) { return db.manutencoes.filter(m => m.placa === placa && m.tipo === tipo && m.descricao !== 'Registro de KM').sort((a, b) => new Date(b.data) - new Date(a.data))[0] || null; }
function calcularLimite(placa, tipo) {
  garantirLimites(placa); const cfg = db.limites[placa][tipo]; if (!cfg) return null;
  const ult = ultimaManut(placa, tipo); if (!ult) return { temUltima: false, cfg };
  return { temUltima: true, ultima: ult, limiteKm: cfg.modo !== 'meses' ? ult.km + Number(cfg.km) : null, limiteData: cfg.modo !== 'km' ? (TEMPO_EM_DIAS.includes(tipo) ? addDias(ult.data, Number(cfg.meses)) : addMeses(ult.data, Number(cfg.meses))) : null, cfg };
}
function verificarAlerta(placa, tipo) {
  const info = calcularLimite(placa, tipo); if (!info) return null;
  if (!info.temUltima) return { deveAlertar: true, semHistorico: true, info };
  const v = db.veiculos.find(x => x.placa === placa); const kmAtual = v ? v.kmAtual : 0; const hoje = hojeISO();
  let excedKm = false, excedTempo = false;
  if (info.limiteKm !== null && kmAtual >= info.limiteKm) excedKm = true;
  if (info.limiteData !== null && hoje >= info.limiteData) excedTempo = true;
  let deveAlertar = info.cfg.modo === 'km' ? excedKm : (info.cfg.modo === 'meses' ? excedTempo : (excedKm || excedTempo));
  return { deveAlertar, excedKm, excedTempo, info, kmAtual, hoje };
}

function sincronizarAlertas(bgSync = true) {
  const paraAdicionar = [], idsParaRemover = [];
  for (const v of db.veiculos) {
    for (const tipo of TIPOS_RASTREADOS) {
      if (tipo === 'abastecimento') continue; 
      
      const check = verificarAlerta(v.placa, tipo);
      const abertoExistente = db.alertas.find(a => a.placa === v.placa && a.tipo === tipo && a.status !== 'resolvido');
      if (check && check.deveAlertar) {
        if (!abertoExistente) {
          const resolvidos = db.manutencoes.filter(m => m.placa === v.placa && m.tipo === tipo && m.descricao !== 'Registro de KM').sort((a,b) => new Date(b.data) - new Date(a.data));
          const ultResolvido = resolvidos[0];
          let deveRecriar = true;
          if (ultResolvido) deveRecriar = db.manutencoes.some(m => m.placa === v.placa && m.tipo === tipo && m.data >= ultResolvido.data);
          
          if (deveRecriar) paraAdicionar.push({ id: gerarId(), placa: v.placa, tipo, status: 'ativo', dataAnalise: null, dataResolucao: null, classificadoPor: 'Sistema (automático)', notificadosLista: '' });
        }
      } else if (abertoExistente && abertoExistente.status === 'ativo') {
        idsParaRemover.push(abertoExistente.id);
      }
    }
  }
  if (paraAdicionar.length === 0 && idsParaRemover.length === 0) return;
  db.alertas = db.alertas.filter(a => !idsParaRemover.includes(a.id)); 
  db.alertas.push(...paraAdicionar); 
  salvarCache();
  
  notificarNovosAlertas(); 

  if (bgSync) { execBackground(async () => { try { await apiPost('syncAlertas', { adicionar: paraAdicionar, remover: idsParaRemover }); } catch(e) { for (const id of idsParaRemover) await apiPost('deleteAlerta', { id }); for (const a of paraAdicionar) await apiPost('addAlerta', a); } }, 'Falha oculta na sincronização de alertas'); }
}

function renderDetalhe() {
  const placa = veiculoSel; const v = db.veiculos.find(x => x.placa === placa); if (!v) return;
  garantirLimites(placa); 
  
  const msAll = db.manutencoes.filter(m => m.placa === placa).sort((a, b) => new Date(b.data) - new Date(a.data));
  const msUi = msAll.filter(m => m.descricao !== 'Registro de KM');
  const msReais = msAll.filter(m => m.descricao !== 'Registro de KM');
  const total = msReais.reduce((s, m) => s + m.valor, 0); 
  const agends = db.agendamentos.filter(a => a.placa === placa); const cfg = db.limites[placa];
  
  const proximoLimiteTexto = (tipo) => {
    const info = calcularLimite(placa, tipo); if (!info || !info.temUltima) return 'Sem histórico';
    
    let txtKm = '';
    let txtData = '';
    
    if (info.limiteKm !== null) {
        const faltaKm = info.limiteKm - v.kmAtual;
        txtKm = faltaKm >= 0 ? `${fmtKm(info.limiteKm)} (faltam ${fmtKm(faltaKm)})` : `${fmtKm(info.limiteKm)} (excedido há ${fmtKm(-faltaKm)})`;
    }
    
    if (info.limiteData !== null) {
        const hojeObj = new Date(hojeISO() + 'T00:00:00');
        const limiteObj = new Date(info.limiteData + 'T00:00:00');
        const diffDias = Math.round((limiteObj - hojeObj) / (1000 * 60 * 60 * 24));
        
        if (diffDias >= 0) {
            txtData = `${fmtData(info.limiteData)} (faltam ${diffDias} dias)`;
        } else {
            txtData = `${fmtData(info.limiteData)} (excedido há ${-diffDias} dias)`;
        }
    }
    
    if (info.cfg.modo === 'km') return txtKm;
    if (info.cfg.modo === 'meses') return txtData;
    
    if (txtKm && txtData) return `${txtKm} ou ${txtData}`;
    return txtKm || txtData || '-';
  };
  
  const cardsTipos = TIPOS_RASTREADOS.map(t => { const ult = ultimaManut(placa, t); return `<div class="kpi"><div class="label">${LABEL_ULTIMA[t]}</div><div class="value" style="font-size:15px;">${ult ? fmtData(ult.data) + ' · ' + fmtKm(ult.km) : 'Sem registro'}</div></div>`; }).join('');
  const perfil = GF.perfil(); const isAdmin = perfil !== "mecanico";
  const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa); const classePlaca = isMercosul ? 'mercosul' : 'antiga'; const nomeTopo = isMercosul ? 'BRASIL' : 'TRANSMARINA';

  const ultRegistro = msAll[0];
  const kmHoverTexto = (ultRegistro && ultRegistro.km > 0) ? fmtKm(ultRegistro.km) : '0 km';
  const dataHover = ultRegistro ? `Última alteração: ${fmtData(ultRegistro.data)}\nKM: ${kmHoverTexto}\nResponsável: ${ultRegistro.nome}` : 'Nenhum histórico registrado';

  // Pendências do caminhão (vencidas, em andamento e agendadas) — aparece para o mecânico, que não vê as caixas de configuração
  let htmlPendencias = '';
  if (!isAdmin) {
    const alsV = db.alertas.filter(a => a.placa === placa && a.status !== 'resolvido' && a.tipo !== 'Registro de KM');
    const agsV = db.agendamentos.filter(ag => ag.placa === placa && !alsV.some(a => normPeca(a.tipo) === normPeca(ag.tipo === 'outro' ? (ag.descricao || 'outro') : ag.tipo)));
    const hojeL = hojeLocal();
    const ordem = { atrasado: 0, andamento: 1, pendente: 2 };
    const itens = [
      ...alsV.map(a => { const g = grupoAlerta(a); return { o: ordem[g], c: CRITS[critDe('alerta', a)].n, html: montarCardAlerta(a) }; }),
      ...agsV.map(ag => { const atras = ag.dataPrevista && ag.dataPrevista < hojeL; return { o: atras ? 0 : 2, c: CRITS[critDe('agend', ag)].n, html: atras ? montarCardAgAtrasado(ag) : montarCardAgPendente(ag) }; })
    ].sort((x, y) => (x.c - y.c) || (x.o - y.o));
    htmlPendencias = `<div class="pend-grid"><div class="card"><h2>⚠️ O que precisa ser feito neste caminhão</h2>${itens.length ? itens.map(i => i.html).join('') : '<p class="empty" style="padding:12px;">Nada pendente neste caminhão. ✅</p>'}</div>${montarCardOcorrencias(placa)}</div>`;
  }

  // Monta as linhas do histórico exibindo o KM normalmente (ou 0 km)
  const linhasHistoricoHtml = msUi.map(m => {
    const colKm = '<div style="font-size: 10px; color: var(--dim); text-transform: uppercase;">Apurado com</div><div style="font-weight: 600;">' + fmtKm(m.km) + '</div>';
    const btnExcluir = isAdmin ? `<button class="btn danger small" onclick="excluirManutencao('${m.id}')">Excluir</button>` : '';
    const cl = m.tipo === 'abastecimento' ? '' : tagClasse(classeDe(m));
    const nota = (m.nota ? ` <button type="button" class="btn-nota" title="Ver a foto da nota" onclick="verNota('${escAttr(m.nota)}', '${escAttr(nomeManutencao(m))}')">🧾 Nota</button>` : '')
      + (m.garantia ? ` <button type="button" class="btn-nota" title="Ver a foto da garantia" onclick="verNota('${escAttr(m.garantia)}', '${escAttr(nomeManutencao(m))}', 'Garantia')">🛡️ Garantia</button>` : '');
    const qq = m._abs ? (m.nome ? 'Lançado por ' + m.nome : '') : quemQuando(m, 'Lançado');
    const pcs = m._abs || typeof Almox === 'undefined' ? [] : Almox.movs().filter(x => String(x.manutencaoId) === String(m.id) && x.tipo === 'SAIDA').map(x => { const p = Almox.porId(x.pecaId); return (p ? p.nome : 'peça') + (Number(x.quantidade) !== 1 ? ' ×' + Almox.num(x.quantidade) : ''); });
    const origemNota = [m.notaNum ? '🧾 Nota ' + m.notaNum : (m.lote ? '🧾 Lançado junto com outros serviços' : ''), m.oficina, pcs.length ? '🔩 ' + pcs.join(', ') + (m.valorPecas > 0 ? ' (' + fmtMoeda(m.valorPecas) + ' no valor)' : '') : ''].filter(Boolean).join(' · ');
    return `<tr><td>${nomeManutencao(m)}<div class="hist-tags">${cl}${nota}</div>${qq ? `<div class="quem-quando">👤 ${escHtml(qq)}</div>` : ''}${origemNota ? `<div class="quem-quando">${escHtml(origemNota)}</div>` : ''}</td><td>${fmtData(m.data)}</td><td>${colKm}</td><td>${fmtMoeda(m.valor)}</td><td>${m.observacao || '-'}</td><td><button class="btn secondary small" onclick="editarManutencao('${m.id}')">Editar</button> ${btnExcluir}</td></tr>`;
  }).join('');

  document.getElementById('manutDetalheWrap').innerHTML = `
    <button class="back-btn" onclick="renderManutTab()">⬅ Voltar para a lista de Caminhões</button>
    <div class="card">
      <div class="row" style="justify-content:space-between; align-items:center;">
        <div class="veiculo-header-info">
          <div class="placa-veiculo ${classePlaca}" style="cursor:default; margin:0;"><div class="placa-topo">${nomeTopo}</div><div class="placa-numero">${placa}</div></div>
          
          <div class="veiculo-km-box" title="${dataHover}">
            <span class="veiculo-km-label">Km atual:</span> 
            <span class="veiculo-km-valor">${fmtKm(v.kmAtual)}</span>
            <div style="font-size:10px; color:var(--dim); margin-top:2px;">ℹ️ Passe o mouse para ver detalhes</div>
          </div>
        </div>
        <div class="veiculo-acoes" style="display:flex; gap:8px; flex-wrap:wrap;">
          ${v.paradoDesde ? (v.paradoOrigem === 'checklist' && GF.perfil() !== 'mecanico' ? `<button class="btn success" onclick="revogarBloqueioGF('${placa}')">✅ Revogar bloqueio</button>` : `<button class="btn success" onclick="alternarParado('${placa}')">✅ Liberar caminhão</button>`) : `<button class="btn secondary btn-parar" onclick="alternarParado('${placa}')">🚫 Marcar como parado</button>`}
          ${isAdmin ? `<button class="btn secondary" onclick="abrirModalKm('${placa}')">Atualizar KM</button>
                       <button class="btn danger" onclick="excluirVeiculo('${placa}')">Excluir Caminhão</button>` : ''}
          <button class="btn secondary" onclick="abrirNotaServicos({ placa: '${placa}' })" title="Nota ou orçamento da oficina com vários serviços">🧾 Lançar nota</button>
          <button class="btn" onclick="abrirModalManut('${placa}')">Marcar manutenção</button>
        </div>
      </div>
      ${faixaSituacao(placa, v)}
    </div>
    ${htmlPendencias}
    ${isAdmin ? montarCardOcorrencias(placa, true) : ''}
    ${isAdmin ? `<div class="grid-cards"><div class="kpi"><div class="label">Total gasto</div><div class="value">${fmtMoeda(total)}</div></div><div class="kpi"><div class="label">Nº manutenções</div><div class="value">${msReais.length}</div></div>${cardsTipos}</div>` : ''}
    ${isAdmin ? `<div class="card"><h2>Configuração de alertas</h2><div class="alert-config-container">${TIPOS_RASTREADOS.map(tipo => `<div class="limitbox"><div style="font-weight:bold;margin-bottom:8px;">${TIPOS[tipo]}</div><div class="row"><div class="field"><label>Critério</label><select onchange="atualizarCfg('${placa}','${tipo}','modo',this.value)"><option value="km" ${cfg[tipo].modo === 'km' ? 'selected' : ''}>Somente km</option><option value="meses" ${cfg[tipo].modo === 'meses' ? 'selected' : ''}>Somente ${unTempo(tipo)}</option><option value="km_e_meses" ${cfg[tipo].modo === 'km_e_meses' ? 'selected' : ''}>O que vencer primeiro</option></select></div></div><div class="row" style="margin-top:8px;"><div class="field"><label>A cada (km)</label><input type="number" min="0" value="${cfg[tipo].km}" onchange="atualizarCfg('${placa}','${tipo}','km',this.value)"></div><div class="field"><label>A cada (${unTempo(tipo)})</label><input type="number" min="0" value="${cfg[tipo].meses}" onchange="atualizarCfg('${placa}','${tipo}','meses',this.value)"></div></div><div style="margin-top:8px;font-size:12px;color:var(--dim);">Próximo: <b style="color:var(--text)">${proximoLimiteTexto(tipo)}</b></div></div>`).join('')}</div></div>` : ''}
    
    <div class="card">
      <div class="header-tabela"><h2>Histórico</h2><input type="text" id="filtroHistorico" placeholder="🔎 Pesquisar manutenção..." onkeyup="filtrarHistorico()"></div>
      
      <!-- AQUI É ONDE ENVELOPAMOS A TABELA PARA O CELULAR ROLAR -->
      <div class="tabela-responsiva">
        <table id="tabelaHistorico">
          <thead><tr><th>Tipo</th><th>Data</th><th>KM Registrado</th><th>Valor</th><th>Obs</th><th>Ações</th></tr></thead>
          <tbody>
            ${linhasHistoricoHtml}
          </tbody>
        </table>
      </div>
      ${(typeof App !== 'undefined' && App.precisaHistorico && App.precisaHistorico('')) ? `<div class="hist-mais"><button class="btn small secondary" type="button" onclick="App.pedirHistorico('', true)">Carregar histórico anterior a ${fmtData(App.hist.inicio)}</button></div>` : ''}
    </div>
    ${(isAdmin && agends.length) ? `<div class="card"><h2>Agendadas</h2><div class="tabela-responsiva"><table><thead><tr><th>Tipo</th><th>Previsão</th><th>Valor</th><th>Obs</th><th>Ações</th></tr></thead><tbody>${agends.map(g => `<tr title="👤 Registrado por: ${g.nome || 'Não identificado'}"><td>${nomeManutencao(g)}${resumoPecasAg(g)}</td><td>${g.dataPrevista ? fmtData(g.dataPrevista) : '-'}</td><td>${g.valor ? fmtMoeda(g.valor) : '-'}</td><td>${g.observacao || '-'}</td><td><button class="btn success small" onclick="resolverAgendamento('${g.id}')">Resolvido</button> <button class="btn secondary small" onclick="editarAgendamento('${g.id}')">Editar</button> ${isAdmin ? `<button class="btn danger small" onclick="cancelarAgendamento('${g.id}')">Cancelar</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
  `;
}

function atualizarCfg(placa, tipo, campo, valor) { garantirLimites(placa); if (campo === 'modo') db.limites[placa][tipo].modo = valor; else db.limites[placa][tipo][campo] = Number(valor) || 0; salvarCache(); renderDetalhe(); sincronizarAlertas(false); execBackground(async () => { await apiPost('updateLimite', { placa, tipo, modo: db.limites[placa][tipo].modo, km: db.limites[placa][tipo].km, meses: db.limites[placa][tipo].meses }); }, 'Erro configuração'); }

function abrirModalKm(placa) { veiculoSel = placa; const v = db.veiculos.find(x => x.placa === placa); document.getElementById('kmAtualInput').value = v.kmAtual > 0 ? Number(v.kmAtual).toLocaleString('pt-BR') : ''; document.getElementById('errKmAtual').textContent = ''; openModal('modalKm'); }

async function salvarKmAtual() {
  const input = document.getElementById('kmAtualInput'); const val = parseNumeroBR(input.value);
  if (isNaN(val) || val <= 0) { input.classList.add('err'); return; }
  const validacao = validarSaltoKm(veiculoSel, val, hojeISO(), true);
  if (validacao) {
     if (validacao.erro) return toast(validacao.msg, true);
     if (validacao.alerta) { const quer = await confirmarCustom('Atenção ao KM', validacao.msg); if (!quer) return; }
  }
  closeModal('modalKm'); const v = db.veiculos.find(x => x.placa === veiculoSel); if (v) v.kmAtual = val;
  
  const nomeUsuario = (GF.nome()) + " (em " + dataHoraAtual() + ")";
  const registro = { id: gerarId(), placa: veiculoSel, tipo: 'outro', descricao: 'Registro de KM', km: val, data: hojeISO(), valor: 0, observacao: 'Atualização rápida do painel', nome: nomeUsuario };
  db.manutencoes.push(registro);
  
  salvarCache(); renderDetalhe(); sincronizarAlertas(false); toast('Sincronizando KM...');
  execBackground(async () => { await apiPost('addManutencao', registro); await apiPost('updateKmVeiculo', { placa: veiculoSel, kmAtual: val }); }, 'Erro ao salvar KM');
}

/* ---------- Classificação (preventiva, corretiva…) e criticidade (parar, cautela, normal) ---------- */
const CLASSES = { PREV: 'PREV · Preventiva', 'CORR-NP': 'CORR-NP · Corretiva não planejada', 'CORR-PL': 'CORR-PL · Corretiva planejada', PRED: 'PRED · Preditiva', DET: 'DET · Detectiva', SIN: 'SIN · Sinistro / avaria' };
const CLASSE_CURTA = { PREV: 'Preventiva', 'CORR-NP': 'Corretiva não planejada', 'CORR-PL': 'Corretiva planejada', PRED: 'Preditiva', DET: 'Detectiva', SIN: 'Sinistro' };
const CLASSE_ANTIGA = { preventiva: 'PREV', corretiva: 'CORR-PL', emergencial: 'CORR-NP', preditiva: 'PRED' };
const CRITS = { P1: { n: 0, t: 'P1 · Parada imediata', c: 'Crítica', ic: '🔴', cls: 'p1' }, P2: { n: 1, t: 'P2 · Urgente (até 24h)', c: 'Alta', ic: '🟠', cls: 'p2' },
  P3: { n: 2, t: 'P3 · Programada (até 7 dias)', c: 'Média', ic: '🟡', cls: 'p3' }, P4: { n: 3, t: 'P4 · Pode esperar (até 30 dias)', c: 'Baixa', ic: '🟢', cls: 'p4' } };
const CRIT_ANTIGA = { parar: 'P1', cautela: 'P2', normal: 'P3' };
function normClasse(x) { const c = String(x || ''); return CLASSE_ANTIGA[c.toLowerCase()] || (CLASSES[c.toUpperCase()] ? c.toUpperCase() : ''); }
function normCrit(x) { const c = String(x || ''); return CRIT_ANTIGA[c.toLowerCase()] || (CRITS[c.toUpperCase()] ? c.toUpperCase() : ''); }
function classeDe(m) { return normClasse(m && m.classe) || (TIPOS_RASTREADOS.includes(m && m.tipo) ? 'PREV' : 'CORR-PL'); }
function tagClasse(c) { return `<span class="classe-tag ${String(c).toLowerCase()}" title="${escAttr(CLASSES[c] || c)}">${escHtml(c)}</span>`; }
/** Criticidade de um item pendente: a escolhida; se ninguém escolheu, uma sugestão (que não bloqueia o caminhão). */
function critDe(kind, x) {
  const c = normCrit(x && x.criticidade); if (c) return c;
  if (kind === 'ocorrencia') return /sim/i.test(x.restringeCirculacao || '') || String(x.prioridade || '').toUpperCase() === 'ALTA' ? 'P2' : 'P3';
  if (kind === 'alerta') return x.status !== 'resolvido' && grupoAlerta(x) === 'atrasado' ? 'P3' : 'P4';
  return 'P3';
}
/* ---------- Situação do caminhão: BLOQUEADO (P1 ou parado) · RESTRITA (P2) · DISPONÍVEL ---------- */
function osAbertas() { return (((typeof App !== 'undefined' && App.dados) || {}).os || []).filter(o => ['ABERTA', 'EM_ATENDIMENTO', 'AGUARDANDO_PECA'].includes(o.status)); }
function statusVeiculoOp(placa) {
  const v = db.veiculos.find(x => x.placa === placa); let st = 'DISPONIVEL', motivo = '';
  const sobe = (s2, m) => { if (st === 'BLOQUEADO' || (st === 'RESTRITA' && s2 === 'RESTRITA')) return; st = s2; motivo = m; };
  if (v && v.paradoDesde) sobe('BLOQUEADO', 'Parado desde ' + fmtQuando(v.paradoDesde) + (v.paradoPor ? ' · ' + v.paradoPor : ''));
  osAbertas().filter(o => o.placa === placa).forEach(o => { const c = normCrit(o.criticidade); if (c === 'P1') sobe('BLOQUEADO', o.numero + ' (P1)'); else if (c === 'P2') sobe('RESTRITA', o.numero + ' (P2)'); });
  const exp = (lista, nome) => lista.forEach(x => { const c = normCrit(x.criticidade); if (c === 'P1') sobe('BLOQUEADO', nome(x) + ' (P1)'); else if (c === 'P2') sobe('RESTRITA', nome(x) + ' (P2)'); });
  exp(ocorrenciasAbertas().filter(o => o.placa === placa), o => o.item);
  exp(db.agendamentos.filter(a => a.placa === placa), a => a.tipo === 'outro' ? a.descricao : nomeTipo(a.tipo));
  exp(db.alertas.filter(a => a.placa === placa && a.status !== 'resolvido'), a => nomeTipo(a.tipo));
  return { st, motivo };
}
/** Item (alerta/agendamento/ocorrência) que já está numa OS aberta. */
function osDoItem(ref, id) { return osAbertas().find(o => (Array.isArray(o.itens) ? o.itens : parseJsonSeguro(o.itens, [])).some(i => i.ref === ref && String(i.id) === String(id))) || null; }
function parseJsonSeguro(t, padrao) { try { const v = typeof t === 'string' ? JSON.parse(t || 'null') : t; return v == null ? padrao : v; } catch (e) { return padrao; } }
function tagOsItem(ref, id) { const o = osDoItem(ref, id); return o ? `<span class="tag-os" title="Já está na ordem de serviço ${escAttr(o.numero)}">🧾 ${escHtml(o.numero)}</span>` : ''; }
/* ---------- Manutenção lançada pelo motorista: admin/master confere (com a foto da nota) e aprova ou recusa ---------- */
function manutMotoristaPendentes() { return (((typeof App !== 'undefined' && App.dados) || {}).manutMotorista || []).filter(x => x.status === 'PENDENTE').sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))); }
function montarCardManutMotorista(x) {
  const val = Number(x.valor) > 0 ? ' · ' + fmtMoeda(Number(x.valor)) : '', km = Number(x.km) > 0 ? ' · ' + fmtKm(Number(x.km)) : '';
  return `<div class="alert-card pendente mm-card"><div class="alert-info"><div class="alert-title">${placaClicavel(x.placa)} 🔧 ${escHtml(x.servico)}</div>
    <div class="alert-sub">${fmtData(String(x.data).slice(0, 10))}${km}${val}${x.local ? ' · ' + escHtml(x.local) : ''}</div>
    <div class="alert-sub">Lançado por ${escHtml(x.motoristaNome || 'motorista')}${x.nota ? ' · 🧾 com nota' : ' · sem nota'}${x.garantia ? ' · 🛡️ com garantia' : ''}${x.obs ? ' — ' + escHtml(x.obs) : ''}</div></div>
    <div class="alert-actions">${x.nota ? `<button class="btn small secondary ver" onclick="verNota('${escAttr(x.nota)}','${escAttr(x.servico)}')">🧾 Nota</button>` : ''}${x.garantia ? `<button class="btn small secondary ver" onclick="verNota('${escAttr(x.garantia)}','${escAttr(x.servico)}','Garantia')">🛡️ Garantia</button>` : ''}<button class="btn small" onclick="abrirAprovarManut('${escAttr(x.id)}')">Conferir</button></div></div>`;
}
function abrirAprovarManut(id) {
  const x = manutMotoristaPendentes().find(m => m.id === id); if (!x) return toast('Esse lançamento já foi decidido.');
  const serv = h('input', { type: 'text', value: x.servico, list: 'listaServicos', maxlength: 80 }), km = h('input', { type: 'text', inputmode: 'numeric', value: Number(x.km) > 0 ? Number(x.km).toLocaleString('pt-BR') : '' });
  const valor = h('input', { type: 'text', inputmode: 'decimal', value: Number(x.valor) > 0 ? Number(x.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' });
  const classe = h('select', {}, ...Object.keys(CLASSES).map(k => h('option', { value: k, text: CLASSES[k] })));
  const ajusta = () => { const t = tipoDoTexto(serv.value.trim() || 'x', null); classe.value = TIPOS_RASTREADOS.includes(t.tipo) ? 'PREV' : 'CORR-PL'; }; ajusta(); serv.oninput = ajusta;
  const motivo = h('input', { type: 'text', maxlength: 200, placeholder: 'Obrigatório para recusar (o motorista vai ver)' });
  const fotoNota = x.nota ? h('button', { type: 'button', class: 'mm-nota', title: 'Ampliar a nota', onclick: () => verNota(x.nota, x.servico) }, h('img', { src: urlFotoDrive(x.nota, 640), alt: 'Foto da nota' }), h('small', { text: '🧾 Nota' })) : h('p', { class: 'hint', text: 'O motorista não mandou foto da nota.' });
  const fotoGar = x.garantia ? h('button', { type: 'button', class: 'mm-nota', title: 'Ampliar a garantia', onclick: () => verNota(x.garantia, x.servico, 'Garantia') }, h('img', { src: urlFotoDrive(x.garantia, 640), alt: 'Foto da garantia' }), h('small', { text: '🛡️ Garantia' })) : null;
  const fotoEl = fotoGar ? h('div', { class: 'mm-fotos' }, fotoNota, fotoGar) : fotoNota;
  const ok = h('button', { class: 'btn', type: 'button', text: '✅ Aprovar e pôr no histórico' }), nao = h('button', { class: 'btn danger secondary', type: 'button', text: 'Recusar' });
  const campo = (rot, el) => h('div', { class: 'field' }, h('label', { text: rot }), el);
  const corpo = h('div', { class: 'mm-conferir' }, fotoEl,
    h('p', { class: 'hint', text: x.placa + ' · lançado por ' + (x.motoristaNome || 'motorista') + ' em ' + fmtQuando(x.criadoEm) + (x.local ? ' · ' + x.local : '') + (x.obs ? ' — ' + x.obs : '') }),
    campo('Serviço ou peça', serv), h('div', { class: 'row' }, campo('KM', km), campo('Valor (R$)', valor), campo('Classificação', classe)),
    campo('Motivo (se for recusar)', motivo), h('div', { class: 'modal-actions' }, nao, ok));
  const m = abrirModal('Conferir manutenção do motorista', corpo); let divisao = null;
  const decidir = async aprovar => {
    const dados = { id, aprovar };
    if (aprovar) {
      const t = tipoDoTexto(serv.value.trim(), null); if (t.erro) return toast(t.erro, true); if (!serv.value.trim()) return toast('Diga qual foi o serviço.', true);
      const k = km.value.trim() ? parseNumeroBR(km.value) : 0; if (km.value.trim() && (isNaN(k) || k < 0)) return toast('KM inválido.', true);
      const vt = parseNumeroBR(valor.value) || 0;
      Object.assign(dados, { tipo: t.tipo === 'abastecimento' ? 'outro' : t.tipo, descricao: t.tipo === 'abastecimento' ? serv.value.trim() : t.descricao, km: k || 0, valor: vt, classe: classe.value });
      // "troca de óleo e filtro": vira uma manutenção por serviço; o valor é dividido entre elas
      if (t.varios) {
        const chave = t.varios.map(i => i.nome).join('|');
        if (!divisao || divisao.dataset.chave !== chave) {
          if (divisao) divisao.remove();
          divisao = h('div', { class: 'mm-divisao', dataset: { chave } }, h('p', { text: '✂️ Isso vai virar ' + t.varios.length + ' manutenções. Divida o valor (' + fmtMoeda(vt) + ') entre elas:' }),
            t.varios.map((i, n) => h('label', { class: 'mm-div-lin' }, h('span', { text: i.nome }), h('input', { type: 'text', inputmode: 'decimal', placeholder: 'R$', dataset: { n } }))));
          motivo.closest('.field').before(divisao); divisao.querySelector('input').focus(); return;
        }
        const vals = Array.from(divisao.querySelectorAll('input')).map(i => parseNumeroBR(i.value) || 0), soma = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
        if (Math.abs(soma - vt) > 0.005) return toast('Os valores somam ' + fmtMoeda(soma) + ', mas o total é ' + fmtMoeda(vt) + '. Divida certinho.', true);
        dados.itens = t.varios.map((i, n) => ({ tipo: i.tipo, descricao: i.descricao, valor: vals[n], classe: TIPOS_RASTREADOS.includes(i.tipo) ? 'PREV' : classe.value }));
      }
    } else if (motivo.value.trim().length < 3) { motivo.focus(); return toast('Escreva o motivo da recusa.', true); }
    else dados.motivo = motivo.value.trim();
    ok.disabled = nao.disabled = true;
    try {
      await apiPost('decidirManutMotorista', dados); m.fechar();
      x.status = aprovar ? 'APROVADA' : 'RECUSADA'; toast(aprovar ? 'Aprovada: já está no histórico do caminhão.' : 'Recusada. O motorista foi avisado.');
      if (aprovar) App.recarregar(true); renderTelaAtual();
    } catch (e) { ok.disabled = nao.disabled = false; toast(e.message, true); }
  };
  ok.onclick = () => decidir(true); nao.onclick = () => decidir(false);
}
function urlFotoDrive(id, tam) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (tam || 1600); }
function verNota(id, leg, rot) { Visor.abrir([{ src: urlFotoDrive(id, 1600), leg: (rot || 'Nota') + ' · ' + leg }], 0); }
function sugerirClasse() {
  const t = tipoDoTexto(document.getElementById('mTipoInput').value.trim() || 'x', null), sel = document.getElementById('mClasse');
  if (sel && !sel.dataset.mexeu) sel.value = TIPOS_RASTREADOS.includes(t.tipo) ? 'PREV' : 'CORR-PL';
}
function chipCrit(kind, x, ref) {
  const c = CRITS[critDe(kind, x)], escolhida = !!String(x && x.criticidade || '');
  return `<button type="button" class="crit-chip ${c.cls}${escolhida ? '' : ' sugerida'}" title="${escolhida ? 'Criticidade' : 'Sugestão automática'} — toque para mudar" onclick="menuCrit(event,'${ref}','${escAttr(String(x.id))}')">${c.ic} ${c.t}</button>`;
}
function menuCrit(ev, ref, id) {
  ev.stopPropagation(); fecharMenuPlaca();
  const r = ev.currentTarget.getBoundingClientRect(), m = document.createElement('div'); m.id = 'menuPlaca'; m.className = 'menu-placa'; m.setAttribute('role', 'menu');
  m.innerHTML = '<div class="menu-placa-tit">Criticidade</div>' + Object.keys(CRITS).map(k => `<button type="button" role="menuitem" data-c="${k}">${CRITS[k].ic} ${CRITS[k].t}</button>`).join('');
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; fecharMenuPlaca(); definirCrit(ref, id, b.dataset.c); };
  document.body.appendChild(m);
  const w = m.offsetWidth, hgt = m.offsetHeight, x = Math.max(8, Math.min(r.left, innerWidth - w - 8)), y = r.bottom + 6 + hgt > innerHeight - 8 ? Math.max(8, r.top - hgt - 6) : r.bottom + 6;
  m.style.left = x + 'px'; m.style.top = y + 'px'; m.querySelector('button').focus();
  setTimeout(() => { document.addEventListener('pointerdown', fora_menuPlaca, true); document.addEventListener('keydown', esc_menuPlaca, true); }, 0);
}
function definirCrit(ref, id, crit) {
  const lista = ref === 'alerta' ? db.alertas : ref === 'agend' ? db.agendamentos : ((App.dados && App.dados.ocorrencias) || []);
  const x = lista.find(i => String(i.id) === String(id)); if (!x) return;
  const brutoLista = ref === 'alerta' ? (App.dados.alertas || []) : ref === 'agend' ? (App.dados.agendamentos || []) : [];
  const bruto = brutoLista.find(i => String(i.id) === String(id));
  const antes = x.criticidade; x.criticidade = crit; if (bruto) bruto.criticidade = crit;
  renderTelaAtual(); toast('Criticidade: ' + CRITS[crit].t + '.');
  execBackground(async () => { try { await apiPost('definirCriticidade', { ref, id, criticidade: crit }); } catch (e) { x.criticidade = antes; if (bruto) bruto.criticidade = antes; renderTelaAtual(); throw e; } }, 'Não foi possível mudar a criticidade');
}
function onModoChange() { const ag = document.getElementById('mModo').value === 'agendar'; manutTotalPecas(); document.getElementById('mCritWrap').style.display = ag ? 'block' : 'none'; document.getElementById('mDataRealizadaWrap').style.display = ag ? 'none' : 'block'; document.getElementById('mDataPrevistaWrap').style.display = ag ? 'block' : 'none'; }

function abrirModalManut(placa, manut, modo) {
  veiculoSel = placa; manutEditId = manut ? manut.id : null;
  atualizarDatalistServicos(); 
  document.getElementById('manutTitle').textContent = (manut ? 'Editar' : 'Marcar') + ' manutenção — ' + placa;
  document.getElementById('mModo').value = modo || 'realizada'; document.getElementById('mModo').disabled = !!manut;
  let valTipo = ''; 
  if (manut) {
    if (manut.tipo === 'abastecimento') {
      valTipo = manut.descricao || 'Abastecimento';
    } else {
      valTipo = manut.tipo === 'outro' ? manut.descricao : (TIPOS[manut.tipo] || manut.tipo);
    }
  }
  document.getElementById('mTipoInput').value = valTipo; 
  // Se for edição e o KM for 0, mostra "0" em vez de deixar vazio
  document.getElementById('mKm').value = (manut && manut.km !== undefined && manut.km !== null && manut.km !== '') ? Number(manut.km).toLocaleString('pt-BR') : ''; 
  document.getElementById('mData').value = manut ? manut.data : hojeISO(); document.getElementById('mDataPrevista').value = ''; 
  document.getElementById('mValor').value = (manut && manut.valor > 0) ? Number(manut.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : ''; 
  document.getElementById('mObs').value = manut ? (manut.observacao || '') : '';
  { const sel = document.getElementById('mClasse'); delete sel.dataset.mexeu; sel.onchange = () => { sel.dataset.mexeu = '1'; };
    sel.value = manut ? classeDe(manut) : 'CORR-PL'; if (manut && manut.classe) sel.dataset.mexeu = '1'; if (!manut) sugerirClasse();
    document.getElementById('mCrit').value = (manut && normCrit(manut.criticidade)) || 'P3'; }
  // Peças usadas (almoxarifado): na edição volta o que já foi lançado; o campo valor passa a ser só o do serviço
  manutAbast = !!(manut && manut.tipo === 'abastecimento');
  const pecasIni = manut && !manutAbast && typeof Almox !== 'undefined' ? Almox.linhasDaManut(manut.id) : [];
  montarEditorPecasManut(pecasIni); manutAgResolvendo = null;
  if (manut && Number(manut.valorPecas) > 0) { const vs = Math.max(0, Number(manut.valor) - Number(manut.valorPecas)); document.getElementById('mValor').value = vs > 0 ? vs.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''; }
  document.getElementById('mVirarNota').hidden = !!manut;
  onModoChange(); const infoEdicao = document.getElementById('infoEdicao'); infoEdicao.textContent = manut ? ("👤 Última alteração: " + (manut.nome || "Não identificado")) : ("👤 Lançando como: " + (GF.nome())); openModal('modalManut');
}
let manutEditorPecas = null, manutAbast = false, manutAgResolvendo = null;
/** Editor de peças do lançamento: em "Agendar" vira a lista de peças necessárias (não mexe no estoque, só avisa o que falta comprar). */
function montarEditorPecasManut(linhas) {
  manutEditorPecas = typeof Almox !== 'undefined' ? Almox.editorPecas({ linhas: linhas || [], aoMudar: manutTotalPecas, planejar: () => document.getElementById('mModo').value === 'agendar' }) : null;
  limpar(document.getElementById('mPecas')); if (manutEditorPecas) document.getElementById('mPecas').append(manutEditorPecas.el);
}
/** Com peças lançadas, o valor digitado é o do serviço e o total (serviço + peças) aparece embaixo. */
function manutTotalPecas() {
  const ag = document.getElementById('mModo').value === 'agendar', wrap = document.getElementById('mPecasWrap'), tot = document.getElementById('mTotalPecas'), rot = document.getElementById('mValorRot');
  if (!wrap) return;
  wrap.hidden = manutAbast || !manutEditorPecas;
  if (manutEditorPecas) manutEditorPecas.atualizar();
  wrap.querySelector('label').textContent = ag ? 'Peças necessárias' : 'Peças usadas';
  const n = !wrap.hidden && manutEditorPecas ? manutEditorPecas.quantas() : 0, custo = n ? manutEditorPecas.custo() : 0, serv = parseNumeroBR(document.getElementById('mValor').value) || 0;
  rot.textContent = n ? (ag ? 'Valor previsto do serviço / mão de obra (R$)' : 'Valor do serviço / mão de obra (R$)') : (ag ? 'Valor previsto (R$)' : 'Valor gasto (R$)');
  tot.hidden = !n || (ag && !custo); if (n) tot.textContent = (ag ? 'Previsão total: ' : 'Total da manutenção: ') + fmtMoeda(serv + custo) + (custo ? ' (serviço ' + fmtMoeda(serv) + ' + peças ' + fmtMoeda(custo) + ')' : '');
}
/** "Lançar a nota inteira": leva o que já foi digitado para a tela da nota com vários serviços. */
function manutParaNota(itens) {
  const g = id => document.getElementById(id).value, texto = g('mTipoInput').trim();
  const linhas = itens || (texto ? (Servicos.ler(texto).itens.length ? Servicos.ler(texto).itens.map(i => ({ texto: i.nome })) : [{ texto }]) : []);
  const ped = manutEditorPecas && manutEditorPecas.quantas() ? manutEditorPecas.obter() : null;
  if (ped && ped.linhas && linhas[0]) linhas[0].pecas = ped.linhas;
  closeModal('modalManut');
  abrirNotaServicos({ placa: veiculoSel, modo: g('mModo'), linhas, total: parseNumeroBR(g('mValor')) || 0, km: g('mKm').trim(), data: g('mData'), dataPrevista: g('mDataPrevista'), obs: g('mObs').trim(), criticidade: g('mCrit'),
    aviso: itens ? '"' + texto + '" vai virar ' + itens.length + ' manutenções separadas. Confira e divida o valor entre elas.' : '' });
}

/* ---------- Nota (ou orçamento) com vários serviços ----------
   Um cabeçalho (data, KM, oficina, nº da nota, total) e uma linha por serviço. Cada linha vira uma manutenção separada;
   se o total da nota for informado, a soma das linhas tem que bater. Texto com vários serviços ("óleo e filtro") se divide sozinho. */
function abrirNotaServicos(op) {
  op = op || {}; atualizarDatalistServicos();
  const placa = op.placa, v = db.veiculos.find(x => x.placa === placa);
  const oficinas = Array.from(new Set(db.manutencoes.map(m => m.oficina).filter(Boolean))).sort();
  const inp = (a) => h('input', Object.assign({ type: 'text', autocomplete: 'off', spellcheck: 'false', name: 'nt_' + Math.random().toString(36).slice(2, 8) }, a));
  const modo = h('select', { 'aria-label': 'Situação' }, h('option', { value: 'realizada', text: 'Serviços já feitos' }), h('option', { value: 'agendar', text: 'Agendar (orçamento aprovado)' }));
  modo.value = op.modo === 'agendar' ? 'agendar' : 'realizada';
  const data = inp({ type: 'date', value: op.data || hojeISO() }), dataPrev = inp({ type: 'date', value: op.dataPrevista || '' });
  const km = inp({ inputmode: 'numeric', placeholder: v && v.kmAtual ? 'Atual: ' + Number(v.kmAtual).toLocaleString('pt-BR') : 'Ex: 450.000', value: op.km || '' });
  const oficina = inp({ maxlength: 60, placeholder: 'Ex.: Oficina do Zé', value: op.oficina || '' }), notaNum = inp({ maxlength: 30, placeholder: 'Opcional', value: op.notaNum || '' });
  const total = inp({ inputmode: 'decimal', placeholder: 'Ex: 1.850,00', value: op.total ? Number(op.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' });
  const crit = h('select', { 'aria-label': 'Criticidade' }, Object.keys(CRITS).map(k => h('option', { value: k, text: CRITS[k].ic + ' ' + CRITS[k].t })));
  crit.value = op.criticidade || 'P3';
  const obs = inp({ maxlength: 500, placeholder: 'Opcional (vale para todos os serviços)', value: op.obs || '' });
  const campo = (rot, el, cls) => h('div', { class: 'field' + (cls ? ' ' + cls : '') }, h('label', { text: rot }), el);
  const fData = campo('Data *', data, 'nt-real'), fPrev = campo('Data prevista', dataPrev, 'nt-ag'), fKm = campo('KM do caminhão', km, 'nt-real'), fCrit = campo('Criticidade', crit, 'nt-ag');
  const lista = h('div', { class: 'nt-linhas' }), rodape = h('div', { class: 'nt-soma' }), msg = h('div', { class: 'msg' });
  const salvar = h('button', { type: 'button', class: 'btn', text: 'Salvar' }), rows = [];
  const parse = x => { const n = parseNumeroBR(x); return isNaN(n) ? 0 : n; };
  const ehAg = () => modo.value === 'agendar';
  const atualizar = () => {
    fData.hidden = fKm.hidden = ehAg(); fPrev.hidden = fCrit.hidden = !ehAg();
    rows.forEach(r => r.pintar());
    const soma = Math.round(rows.reduce((t, r) => t + parse(r.valor.value), 0) * 100) / 100, tot = parse(total.value), dif = Math.round((tot - soma) * 100) / 100;
    limpar(rodape); rodape.className = 'nt-soma';
    if (tot > 0) {
      if (Math.abs(dif) < 0.005) { rodape.classList.add('ok'); rodape.append(h('span', { text: '✓ A soma dos serviços bate com o total da nota (' + fmtMoeda(tot) + ').' })); }
      else {
        rodape.classList.add('ruim'); rodape.append(h('span', { text: 'Serviços somam ' + fmtMoeda(soma) + ' de ' + fmtMoeda(tot) + ' — ' + (dif > 0 ? 'falta dividir ' + fmtMoeda(dif) : 'passou ' + fmtMoeda(-dif)) + '.' }));
        const vazias = rows.filter(r => !r.valor.value.trim() && r.serv.value.trim());
        if (dif > 0 && vazias.length) rodape.append(h('button', { type: 'button', class: 'btn small secondary', text: vazias.length > 1 ? 'Dividir igual entre as ' + vazias.length + ' sem valor' : 'Pôr ' + fmtMoeda(dif) + ' na que está sem valor', onclick: () => {
          const cada = Math.floor(dif / vazias.length * 100) / 100; vazias.forEach((r, i) => { const vv = i === vazias.length - 1 ? Math.round((dif - cada * (vazias.length - 1)) * 100) / 100 : cada; r.valor.value = vv.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }); atualizar(); } }));
      }
    } else rodape.append(h('span', { text: 'Total: ' + fmtMoeda(soma) + (rows.length > 1 ? ' em ' + rows.length + ' serviços' : '') + '. Preencha o total da nota para conferir a divisão.' }));
    const n = rows.filter(r => r.serv.value.trim()).length || rows.length;
    salvar.textContent = ehAg() ? (n > 1 ? 'Agendar ' + n + ' serviços' : 'Agendar serviço') : (n > 1 ? 'Salvar ' + n + ' manutenções' : 'Salvar manutenção');
  };
  const novaLinha = (l, depoisDe) => {
    l = l || {};
    const serv = inp({ maxlength: 80, list: 'listaServicos', placeholder: 'Ex.: Troca de óleo do motor', value: l.texto || '', 'aria-label': 'Serviço' });
    const valor = inp({ inputmode: 'decimal', placeholder: 'valor', value: l.valor ? Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '', 'aria-label': 'Valor deste serviço' });
    const classe = h('select', { 'aria-label': 'Tipo de manutenção' }, Object.keys(CLASSES).map(k => h('option', { value: k, text: CLASSES[k] })));
    const leitura = h('div', { class: 'nt-leitura' }), x = h('button', { type: 'button', class: 'ax-x', title: 'Tirar este serviço', 'aria-label': 'Tirar este serviço', text: '✕' });
    const ed = typeof Almox !== 'undefined' ? Almox.editorPecas({ linhas: l.pecas || [], aoMudar: () => r.pintar(), planejar: () => ehAg() }) : null;
    const pecasBox = h('div', { class: 'nt-pecas' }, ed ? ed.el : null);
    const r = { serv, valor, classe, ed, el: null, mexeuClasse: false,
      ler: () => Servicos.ler(serv.value),
      pintar: () => {
        const t = serv.value.trim(), lr = t ? r.ler() : null; limpar(leitura); leitura.className = 'nt-leitura';
        if (!t) leitura.textContent = '';
        else if (lr.erro) { leitura.classList.add('ruim'); leitura.textContent = '⚠️ ' + lr.erro; }
        else if (lr.itens.length > 1) { leitura.classList.add('info'); leitura.textContent = 'Vai separar em ' + lr.itens.length + ': ' + lr.itens.map(i => i.nome).join(' + '); }
        else if (lr.itens[0] && lr.itens[0].tipo === 'abastecimento') { leitura.classList.add('ruim'); leitura.textContent = 'Abastecimento não entra na nota de serviços.'; }
        else if (lr.itens[0]) { const it = lr.itens[0], rast = TIPOS_RASTREADOS.includes(it.tipo); leitura.textContent = rast ? '✓ ' + it.nome + ' — zera o aviso de troca' : '→ ' + it.nome; if (rast) leitura.classList.add('ok');
          if (!r.mexeuClasse) classe.value = rast ? 'PREV' : (classe.value === 'PREV' ? 'CORR-PL' : classe.value); }
        pecasBox.hidden = !ed; if (ed) ed.atualizar();
        if (ed && ed.quantas()) { const c = ed.custo(); if (c) leitura.append(h('span', { class: 'nt-pc', text: ' · peças somam ' + fmtMoeda(c) })); }
      } };
    classe.value = 'CORR-PL'; classe.onchange = () => { r.mexeuClasse = true; };
    // texto com vários serviços se divide em várias linhas ao sair do campo
    serv.addEventListener('blur', () => { const lr = r.ler(); if (!lr.erro && lr.itens.length > 1) { serv.value = lr.itens[0].nome; let ant = r; lr.itens.slice(1).forEach(i => { ant = novaLinha({ texto: i.nome }, ant); }); atualizar(); toast('Separei em ' + lr.itens.length + ' serviços. Divida o valor entre eles.'); } });
    serv.addEventListener('input', atualizar); valor.addEventListener('input', atualizar);
    valor.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const i = rows.indexOf(r); if (rows[i + 1]) rows[i + 1].serv.focus(); else novaLinha(null, r).serv.focus(); atualizar(); } });
    r.el = h('div', { class: 'nt-linha' }, h('div', { class: 'nt-l1' }, h('span', { class: 'nt-n' }), serv, h('label', { class: 'nt-val' }, h('span', { text: 'R$' }), valor), classe, x), leitura, pecasBox);
    x.onclick = () => { if (rows.length === 1) { serv.value = ''; valor.value = ''; atualizar(); return; } rows.splice(rows.indexOf(r), 1); r.el.remove(); numerar(); atualizar(); };
    if (depoisDe && depoisDe.el) { rows.splice(rows.indexOf(depoisDe) + 1, 0, r); depoisDe.el.after(r.el); } else { rows.push(r); lista.append(r.el); }
    numerar(); r.pintar();
    return r;
  };
  const numerar = () => rows.forEach((r, i) => { r.el.querySelector('.nt-n').textContent = (i + 1) + '.'; });
  (op.linhas && op.linhas.length ? op.linhas : [{}, {}]).forEach(l => novaLinha(l));
  [total, modo].forEach(e => e.addEventListener(e === modo ? 'change' : 'input', atualizar));
  const corpo = h('div', { class: 'nt' },
    op.aviso ? h('div', { class: 'manut-aviso', role: 'note', text: '✂️ ' + op.aviso }) : null,
    h('div', { class: 'nt-cab' }, campo('Situação', modo), fData, fPrev, fKm, fCrit, campo('Oficina / onde foi feito', typeof Almox !== 'undefined' ? Almox.ac(oficina, () => oficinas) : oficina), campo('Nº da nota', notaNum), campo('Total da nota (R$)', total, 'nt-total')),
    h('div', { class: 'nt-tit' }, h('b', { text: 'Serviços da nota' }), h('small', { text: 'Um por linha, com o valor de cada um.' })),
    lista, h('button', { type: 'button', class: 'btn secondary small', text: '＋ Outro serviço', onclick: () => { novaLinha(null, rows[rows.length - 1]).serv.focus(); atualizar(); } }),
    rodape, campo('Observação', obs), msg, h('div', { class: 'modal-actions' }, salvar));
  const md = abrirModal('Nota com vários serviços — ' + placa, corpo, { largo: true });
  atualizar(); setTimeout(() => { const vazio = rows.find(r => !r.serv.value.trim()); (op.aviso ? (rows.find(r => !r.valor.value.trim()) || rows[0]).valor : vazio ? vazio.serv : total).focus(); }, 60);
  salvar.onclick = async () => {
    mensagem(msg, '');
    const ag = ehAg(), itens = [], usadas = rows.filter(r => r.serv.value.trim() || r.valor.value.trim() || (r.ed && r.ed.quantas()));
    if (!usadas.length) { mensagem(msg, 'Coloque pelo menos um serviço.'); return rows[0].serv.focus(); }
    for (const r of usadas) {
      const t = r.serv.value.trim(); if (!t) { mensagem(msg, 'Diga qual é o serviço de cada linha (ou tire a linha).'); return r.serv.focus(); }
      const lr = r.ler(); if (lr.erro) { mensagem(msg, '"' + t + '": ' + lr.erro); return r.serv.focus(); }
      if (lr.itens.length > 1) { r.serv.dispatchEvent(new Event('blur')); mensagem(msg, 'Separei "' + t + '" em ' + lr.itens.length + ' linhas. Confira os valores e salve de novo.'); return; }
      const it = lr.itens[0]; if (it.tipo === 'abastecimento') { mensagem(msg, 'Abastecimento não entra na nota de serviços.'); return r.serv.focus(); }
      const vv = parseNumeroBR(r.valor.value); if (r.valor.value.trim() && (isNaN(vv) || vv < 0)) { mensagem(msg, 'Valor inválido em "' + t + '".'); return r.valor.focus(); }
      const item = { tipo: it.tipo, descricao: it.descricao, valor: r.valor.value.trim() ? vv : 0, classe: r.classe.value };
      if (r.ed && r.ed.quantas()) { const ped = r.ed.obter(); if (ped.erro) { mensagem(msg, ped.erro); if (ped.campo) ped.campo.focus(); return; } item.pecas = ped.linhas; }
      itens.push(item);
    }
    const tot = parse(total.value), soma = Math.round(itens.reduce((t, i) => t + i.valor, 0) * 100) / 100;
    if (total.value.trim() && Math.abs(tot - soma) > 0.005) { mensagem(msg, 'A soma dos serviços (' + fmtMoeda(soma) + ') não bate com o total da nota (' + fmtMoeda(tot) + '). Divida o valor entre as linhas.'); return total.focus(); }
    let kmN = 0;
    if (!ag) {
      if (!data.value) { mensagem(msg, 'Preencha a data.'); return data.focus(); }
      if (km.value.trim()) { kmN = parseNumeroBR(km.value); if (isNaN(kmN) || kmN <= 0) { mensagem(msg, 'KM inválido.'); return km.focus(); }
        const val = validarSaltoKm(placa, kmN, data.value, false); if (val) { if (val.erro) { mensagem(msg, val.msg); return km.focus(); } if (val.alerta && !(await confirmarCustom('Aviso de KM', val.msg))) return; } }
      else kmN = v ? v.kmAtual : 0;
    }
    if (rows.some(r => r.ed && r.ed.precoSuspeito()) && !(await confirmarCustom('Preço de peça fora do normal', 'Tem peça com valor bem diferente do que costuma custar. Confirma que digitou o valor de UMA unidade?'))) return;
    const dados = { id: gerarId(), placa, modo: ag ? 'agendar' : 'realizada', data: data.value, dataPrevista: dataPrev.value, km: kmN, oficina: oficina.value.trim(), notaNum: notaNum.value.trim(), total: soma, criticidade: crit.value, observacao: obs.value.trim(), itens };
    salvar.disabled = true; const t0 = salvar.textContent; salvar.textContent = 'Salvando…';
    try {
      await apiPost('addNotaServicos', dados);
      md.fechar(); toast(ag ? itens.length + ' serviço(s) agendado(s).' : itens.length + (itens.length > 1 ? ' manutenções salvas.' : ' manutenção salva.'));
      if (!ag) execBackground(async () => {      // o que foi feito resolve o agendamento e o aviso daquele serviço
        for (const it of itens) {
          const chave = normPeca(it.tipo === 'outro' ? it.descricao : it.tipo);
          for (const a of db.agendamentos.filter(a => a.placa === placa && normPeca(a.tipo === 'outro' ? a.descricao : a.tipo) === chave && String(a.lote || '') !== dados.id)) await apiPost('deleteAgendamento', { id: a.id });
          for (const a of db.alertas.filter(a => a.placa === placa && normPeca(a.tipo) === chave && a.status !== 'resolvido')) await apiPost('deleteAlerta', { id: a.id });
        }
        sincronizarAlertas(true);
      }, 'Erro ao atualizar os avisos');
    } catch (e) { salvar.disabled = false; salvar.textContent = t0; mensagem(msg, e.message); }
  };
}

/** Texto digitado no serviço → tipo rastreado (óleo, alinhamento, engraxamento...) ou 'outro' com a descrição.
    Quem lê é o Servicos (js/servicos.js, o mesmo do servidor). Mais de um serviço no texto ("óleo e filtro") volta em "varios". */
function tipoDoTexto(textoTipo, manutOriginal) {
  if (manutOriginal && manutOriginal.tipo === 'abastecimento') return { tipo: 'abastecimento', descricao: textoTipo };
  const r = Servicos.ler(textoTipo);
  if (r.erro) return { erro: '⚠️ ' + r.erro };
  if (!r.itens.length) return { tipo: 'outro', descricao: textoTipo };
  const p = r.itens[0];
  return r.itens.length > 1 ? { tipo: p.tipo, descricao: p.descricao, varios: r.itens } : { tipo: p.tipo, descricao: p.descricao };
}

async function salvarManutencao() {
  const modo = document.getElementById('mModo').value; const textoTipo = document.getElementById('mTipoInput').value.trim(); const kmInput = document.getElementById('mKm').value.trim(); const data = document.getElementById('mData').value; const dataPrevista = document.getElementById('mDataPrevista').value; 
  const valor = parseNumeroBR(document.getElementById('mValor').value) || 0; 
  const observacao = document.getElementById('mObs').value.trim();
  
  if (!textoTipo) return toast('Informe qual manutenção será feita.', true);
  
  const editando = !!manutEditId;
  const manutOriginal = editando ? db.manutencoes.find(m => m.id === manutEditId) : null;

  const tt = tipoDoTexto(textoTipo, manutOriginal); if (tt.erro) return toast(tt.erro, true);
  if (tt.varios) {
    if (editando) return toast('Aqui dá para salvar um serviço só. Deixe só "' + tt.varios[0].nome + '" e lance os outros em "Marcar manutenção".', true);
    return manutParaNota(tt.varios.map(i => ({ texto: i.nome })));
  }
  const tipoFinal = tt.tipo, descricaoFinal = tt.descricao;
  // Peças usadas (só manutenção realizada)
  let pecas = null, custoPecas = 0;
  if (tipoFinal !== 'abastecimento' && manutEditorPecas) {
    const ped = manutEditorPecas.obter(); if (ped.erro) { toast(ped.erro, true); if (ped.campo) ped.campo.focus(); return; }
    if (manutEditorPecas.precoSuspeito() && !(await confirmarCustom('Preço de peça fora do normal', 'Tem peça com valor bem diferente do que costuma custar. Confirma que digitou o valor de UMA unidade?'))) return;
    pecas = ped.linhas; custoPecas = manutEditorPecas.custo();
  }

  const isAbastecimento = (tipoFinal === 'abastecimento');
  const kmParsed = parseNumeroBR(kmInput);

  // Permite KM = 0 quando for abastecimento (ou edição com KM 0)
  if (modo !== 'agendar' && !data) return toast('Preencha a Data corretamente.', true);
  if (kmInput !== '' && (isNaN(kmParsed) || (!isAbastecimento && kmParsed <= 0) || (isAbastecimento && kmParsed < 0))) {
    return toast('Preencha o campo de KM corretamente.', true);
  }

  const placa = veiculoSel; const v = db.veiculos.find(x => x.placa === placa);
  const dataReferencia = modo === 'agendar' ? dataPrevista : data;
  
  if (kmInput !== '' && kmParsed > 0) {
     const validacao = validarSaltoKm(placa, kmParsed, dataReferencia, false);
     if (validacao) {
        if (validacao.erro) return toast(validacao.msg, true);
        if (validacao.alerta) { const quer = await confirmarCustom('Aviso de KM', validacao.msg); if (!quer) return; }
     }
  }
  
  closeModal('modalManut');
  // Se for abastecimento sem KM informado (ou 0), mantém 0 e NUNCA puxa o kmAtual do caminhão
  const km = kmInput !== '' ? kmParsed : (isAbastecimento ? (manutOriginal ? manutOriginal.km : 0) : (v ? v.kmAtual : 0));
  const kmSubiu = !!(v && km > v.kmAtual); if (kmSubiu) v.kmAtual = km; 

  const nomeUsuario = (GF.nome()) + " (em " + dataHoraAtual() + ")";
  
  if (modo === 'agendar') {
    const agOriginal = editando ? db.agendamentos.find(a => a.id === manutEditId) : null;
    const ag = { id: editando ? manutEditId : gerarId(), placa, tipo: tipoFinal, descricao: descricaoFinal, dataPrevista, valor, observacao, criadoEm: agOriginal ? agOriginal.criadoEm : hojeISO(), nome: nomeUsuario, classe: document.getElementById('mClasse').value, criticidade: document.getElementById('mCrit').value, pecas: pecas || [], lote: agOriginal ? agOriginal.lote || '' : '' };
    if (editando) { const idx = db.agendamentos.findIndex(a => a.id === manutEditId); if (idx >= 0) db.agendamentos[idx] = ag; } else { db.agendamentos.push(ag); }
    salvarCache(); renderTelaAtual(); toast(editando ? 'Agendamento atualizado...' : 'Agendamento salvo...');
    execBackground(async () => { try { await apiPost(editando ? 'updateAgendamento' : 'addAgendamento', ag); } catch(e) { if(editando){ await apiPost('deleteAgendamento', { id: ag.id }); await apiPost('addAgendamento', ag); } else throw e; } }, 'Erro agendamento');
    if (kmInput !== '' && km > 0) { execBackground(async () => { await apiPost('updateKmVeiculo', { placa, kmAtual: km }); }, 'Erro KM'); } return;
  }

  const registro = { id: editando ? manutEditId : gerarId(), placa, tipo: tipoFinal, descricao: descricaoFinal, km, data, valor: pecas ? Math.round((valor + custoPecas) * 100) / 100 : valor, valorPecas: custoPecas, observacao, nome: nomeUsuario, classe: isAbastecimento ? '' : document.getElementById('mClasse').value, nota: manutOriginal ? manutOriginal.nota || '' : '',
    lote: manutOriginal ? manutOriginal.lote || '' : '', oficina: manutOriginal ? manutOriginal.oficina || '' : '', notaNum: manutOriginal ? manutOriginal.notaNum || '' : '' };
  const envio = pecas ? Object.assign({}, registro, { valor, pecas }) : registro;      // com peças, o servidor soma o custo delas ao valor do serviço
  
  const agCumpridos = db.agendamentos.filter(a => a.placa === placa && (a.id === manutAgResolvendo || normPeca(a.tipo === 'outro' ? a.descricao : a.tipo) === normPeca(tipoFinal === 'outro' ? descricaoFinal : tipoFinal)));
  
  if (editando) { const idx = db.manutencoes.findIndex(m => m.id === manutEditId); if (idx >= 0) db.manutencoes[idx] = registro; } else { db.manutencoes.push(registro); }
  db.agendamentos = db.agendamentos.filter(a => !agCumpridos.includes(a));
  
  let alertaAtivo = db.alertas.find(a => a.placa === placa && normPeca(a.tipo) === normPeca(tipoFinal === 'outro' ? descricaoFinal : tipoFinal) && a.status !== 'resolvido');
  if (alertaAtivo) db.alertas = db.alertas.filter(x => x.id !== alertaAtivo.id);
  
  salvarCache(); renderDetalhe(); sincronizarAlertas(false); toast('Manutenção salva...');
  execBackground(async () => {
    await apiPost(editando ? 'updateManutencao' : 'addManutencao', envio);
    for (const ag of agCumpridos) await apiPost('deleteAgendamento', { id: ag.id });
    if (alertaAtivo) await apiPost('deleteAlerta', { id: alertaAtivo.id });
    if (kmSubiu) await apiPost('updateKmVeiculo', { placa, kmAtual: km });
    sincronizarAlertas(true);
  }, 'Erro manutenção');
}


async function resolverAgendamento(id) {
  const ag = db.agendamentos.find(a => a.id === id); if (!ag) return;
  // Com peças previstas: abre o lançamento preenchido para confirmar KM, valor e de onde saíram as peças (aí sim saem do estoque)
  if (ag.pecas && ag.pecas.length) {
    abrirModalManut(ag.placa, null, 'realizada');
    const g = id => document.getElementById(id);
    g('manutTitle').textContent = 'Concluir agendamento — ' + ag.placa; g('mModo').disabled = true; g('mVirarNota').hidden = true;
    g('mTipoInput').value = ag.tipo === 'outro' ? ag.descricao : (TIPOS[ag.tipo] || ag.tipo); g('mValor').value = ag.valor ? Number(ag.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''; g('mObs').value = ag.observacao || '';
    { const sel = g('mClasse'); sel.value = classeDe(ag); sel.dataset.mexeu = '1'; }
    montarEditorPecasManut(ag.pecas.map(p => Object.assign({}, p, { origem: p.origem === 'nota' ? 'nota' : p.origem === 'compra' ? 'compra' : 'estoque' })));
    manutAgResolvendo = ag.id; manutTotalPecas(); g('infoEdicao').textContent = '🔩 Confira as peças: as do estoque saem do almoxarifado ao salvar.'; g('mKm').focus();
    return;
  }
  const v = db.veiculos.find(x => x.placa === ag.placa);
  let kmInformado = await pedirKmCustom('Registrar KM', `Manutenção: ${ag.descricao || nomeTipo(ag.tipo)}\n\nInforme o KM ATUAL do veículo ${ag.placa} no momento desta troca:`, v ? v.kmAtual : '');
  if (kmInformado === null) return; 
  let kmParsed = parseNumeroBR(kmInformado);
  if (isNaN(kmParsed) || kmParsed <= 0) kmParsed = v ? v.kmAtual : 0;
  
  const validacao = validarSaltoKm(ag.placa, kmParsed, hojeISO(), false);
  if (validacao) {
     if (validacao.erro) return toast(validacao.msg, true);
     if (validacao.alerta) { const quer = await confirmarCustom('Aviso de KM', validacao.msg); if (!quer) return; }
  }
  if (v && kmParsed > v.kmAtual) v.kmAtual = kmParsed; 
  const nomeUsuario = (GF.nome()) + " (em " + dataHoraAtual() + ")";
  const registro = { id: gerarId(), placa: ag.placa, tipo: ag.tipo, descricao: String(ag.descricao || '').trim(), km: kmParsed, data: ag.dataPrevista || hojeISO(), valor: Number(ag.valor) || 0, observacao: ag.observacao || '', nome: nomeUsuario };
  
  db.manutencoes.push(registro); db.agendamentos = db.agendamentos.filter(a => a.id !== ag.id);
  
  const tipoA = ag.tipo === 'outro' ? ag.descricao : ag.tipo;
  const ex = db.alertas.find(a => a.placa === ag.placa && normPeca(a.tipo) === normPeca(tipoA) && a.status !== 'resolvido');
  if (ex) db.alertas = db.alertas.filter(x => x.id !== ex.id); 
  
  salvarCache(); renderTelaAtual(); sincronizarAlertas(false); toast('Resolvido e salvo no histórico!');
  execBackground(async () => {
    await apiPost('addManutencao', registro); await apiPost('deleteAgendamento', { id: ag.id }); await apiPost('updateKmVeiculo', { placa: ag.placa, kmAtual: kmParsed });
    if (ex) await apiPost('deleteAlerta', { id: ex.id });
    sincronizarAlertas(true);
  }, 'Erro ao resolver');
}

function editarManutencao(id) { abrirModalManut(veiculoSel, db.manutencoes.find(m => m.id === id)); }
function editarAgendamento(id) {
  const ag = db.agendamentos.find(a => a.id === id); if (!ag) return;
  veiculoSel = ag.placa; manutEditId = ag.id; resolverAlertaId = null; resolverAgendamentoId = null;
  document.getElementById('manutTitle').textContent = 'Editar agendamento — ' + ag.placa; document.getElementById('mModo').value = 'agendar'; document.getElementById('mModo').disabled = true;
  document.getElementById('mTipoInput').value = ag.tipo === 'outro' ? ag.descricao : TIPOS[ag.tipo]; document.getElementById('mKm').value = ''; document.getElementById('mData').value = hojeISO(); document.getElementById('mDataPrevista').value = ag.dataPrevista || ''; document.getElementById('mValor').value = ag.valor || ''; document.getElementById('mObs').value = ag.observacao || '';
  manutAbast = false; montarEditorPecasManut(ag.pecas || []); manutAgResolvendo = null; document.getElementById('mVirarNota').hidden = true;
  onModoChange(); const infoEdicao = document.getElementById('infoEdicao'); infoEdicao.textContent = "👤 Agendado por: " + (ag.nome || "Não identificado"); openModal('modalManut');
}
async function excluirManutencao(id) {
  if (GF.perfil() === 'mecanico') return toast("Acesso negado: Apenas gestores podem excluir.", true);
  
  const quer = await confirmarCustom('Excluir manutenção', 'Tem certeza que deseja excluir do histórico?');
  if (!quer) return;
  const m = db.manutencoes.find(x => x.id === id); db.manutencoes = db.manutencoes.filter(x => x.id !== id); salvarCache(); renderTelaAtual(); sincronizarAlertas(false); toast('Excluindo...');
  execBackground(async () => { 
    await apiPost('deleteManutencao', { id }); 
    if (m) { const orfaos = db.alertas.filter(a => a.status === 'resolvido' && a.placa === m.placa && a.dataResolucao === m.data); for (const a of orfaos) await apiPost('deleteAlerta', { id: a.id }); }
    sincronizarAlertas(true); 
  }, 'Erro ao excluir');
}
function cancelarAgendamento(id) { 
  if (GF.perfil() === 'mecanico') return toast("Acesso negado: Apenas gestores podem excluir.", true);
  
  db.agendamentos = db.agendamentos.filter(a => a.id !== id); salvarCache(); renderTelaAtual(); toast('Cancelado...'); execBackground(async () => { await apiPost('deleteAgendamento', { id }); }, 'Erro cancelar'); 
}

/* ================= ABA 3: DASHBOARD ANALÍTICO ================= */

window.limparFiltroDatasDashboard = function() {
  document.getElementById('dashDataInicio').value = '';
  document.getElementById('dashDataFim').value = '';
  renderDashboard();
}

function estimarKmNoPeriodo(veiculo, manutencoes, inicioISO, fimISO) {
  const leiturasPorData = new Map();

  manutencoes
    .filter(m => m.placa === veiculo.placa && Number(m.km) > 0 && m.data)
    .forEach(m => {
      const km = Number(m.km);
      const kmExistente = leiturasPorData.get(m.data);
      if (kmExistente === undefined || km > kmExistente) {
        leiturasPorData.set(m.data, km);
      }
    });

  const hoje = hojeLocal();
  const kmAtual = Number(veiculo.kmAtual) || 0;
  const kmNaDataDeHoje = leiturasPorData.get(hoje) || 0;

  if (kmAtual > 0 && kmAtual > kmNaDataDeHoje) {
    leiturasPorData.set(hoje, kmAtual);
  }

  const leituras = [...leiturasPorData.entries()]
    .map(([data, km]) => ({ data, km, dia: new Date(`${data}T00:00:00`) }))
    .sort((a, b) => a.dia - b.dia);

  if (leituras.length < 2) {
    return { km: 0, diasCobertos: 0 };
  }

  const inicio = new Date(`${inicioISO}T00:00:00`);
  const fimExclusivo = new Date(`${fimISO}T00:00:00`);
  fimExclusivo.setDate(fimExclusivo.getDate() + 1);

  let kmEstimado = 0;
  let diasCobertos = 0;

  for (let i = 1; i < leituras.length; i++) {
    const anterior = leituras[i - 1];
    const atual = leituras[i];

    const diasEntreLeituras = (atual.dia - anterior.dia) / (24 * 60 * 60 * 1000);

    if (diasEntreLeituras <= 0 || atual.km <= anterior.km) continue;

    let kmEntreLeituras = atual.km - anterior.km;

    // ==========================================
    // 🛑 TRATAMENTO INTELIGENTE DE SALTO / CORREÇÃO:
    // Se a diferença entre duas leituras for maior que 5.000 km de uma só vez,
    // é a correção manual de base do odômetro. Tratamos esse salto como 0 km
    // para não gerar rodagem falsa, sem descartar os demais dados do posto.
    // ==========================================
    if (kmEntreLeituras > 5000) {
      kmEntreLeituras = 0; 
    }

    const kmPorDia = kmEntreLeituras / diasEntreLeituras;

    const inicioSobreposto = Math.max(inicio.getTime(), anterior.dia.getTime());
    const fimSobreposto = Math.min(fimExclusivo.getTime(), atual.dia.getTime());

    if (fimSobreposto <= inicioSobreposto) continue;

    const diasSobrepostos = (fimSobreposto - inicioSobreposto) / (24 * 60 * 60 * 1000);

    kmEstimado += kmPorDia * diasSobrepostos;
    diasCobertos += diasSobrepostos;
  }

  return {
    km: Math.round(kmEstimado),
    diasCobertos: Math.round(diasCobertos * 100) / 100
  };
}

function renderDashboard() {
  const sel = document.getElementById('dashVeiculo'), atual = sel ? sel.value : 'todos'; 
  sel.innerHTML = '<option value="todos">Todos os veículos</option>' + db.veiculos.map(v => `<option value="${v.placa}">${v.placa}</option>`).join(''); 
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  const veiculo = sel.value;
  
  const dtInicioStr = document.getElementById('dashDataInicio').value;
  const dtFimStr = document.getElementById('dashDataFim').value;
  // período maior que o já carregado: busca o histórico e redesenha sozinho quando chegar
  if (typeof App !== 'undefined' && App.precisaHistorico && App.precisaHistorico(dtInicioStr)) App.pedirHistorico(dtInicioStr, true);
  
  let limiteInicio = dtInicioStr ? new Date(dtInicioStr + 'T00:00:00') : new Date('2000-01-01T00:00:00');
  let limiteFim = dtFimStr ? new Date(dtFimStr + 'T23:59:59') : new Date('2100-01-01T23:59:59');

  let maxGasto = 500, maxKm = 500; 
  let kmEstimadoGeral = 0;
  let diasCobertosGeral = 0;
  const chartData = [];
  
  let gastoGeral = 0, manutGeral = 0, kmGeralMatematica = 0, litrosGerais = 0, kmConsumo = 0, litConsumo = 0;

  db.veiculos.forEach(v => {
      let msV_All = db.manutencoes.filter(m => m.placa === v.placa).sort((a,b) => new Date(a.data) - new Date(b.data));
      let msV_Per = msV_All.filter(m => { let d = new Date(m.data + 'T00:00:00'); return d >= limiteInicio && d <= limiteFim; });
      
      let gastoComb = 0, gastoOfic = 0;
      msV_Per.forEach(m => {
          if (m.tipo === 'abastecimento') {
              gastoComb += Number(m.valor) || 0;
              const lMatch = m.observacao.match(/Qtd:\s*([\d.]+)\s*L/);
              if (lMatch) litrosGerais += parseFloat(lMatch[1]);
          } else if (m.descricao !== 'Registro de KM') {
              gastoOfic += Number(m.valor) || 0;
          }
      });
      let gastoTotalV = gastoComb + gastoOfic;
      let qtdeV = msV_Per.filter(m => m.descricao !== 'Registro de KM' && m.tipo !== 'abastecimento').length;
      
      const inicioPeriodoISO = dtInicioStr || (msV_All.find(m => Number(m.km) > 0 && m.data)?.data || hojeLocal());
      const fimPeriodoISO = dtFimStr || hojeLocal();

      let estimativa = { km: 0, diasCobertos: 0 };
      try {
          estimativa = estimarKmNoPeriodo(v, db.manutencoes, inicioPeriodoISO, fimPeriodoISO);
      } catch(e) {
          console.error(e);
      }

      const distanciaReal = Number(estimativa.km) || 0;
      const kmRodadoGrafico = (!dtInicioStr && !dtFimStr) ? (Number(v.kmAtual) || 0) : distanciaReal;

      if (gastoTotalV > maxGasto) maxGasto = gastoTotalV;
      if (kmRodadoGrafico > maxKm) maxKm = kmRodadoGrafico;

      if (veiculo === 'todos' || v.placa === veiculo) {
          kmEstimadoGeral += distanciaReal;
          diasCobertosGeral += (Number(estimativa.diasCobertos) || 0);
          gastoGeral += gastoTotalV; 
          manutGeral += qtdeV; 
          kmGeralMatematica += distanciaReal; 
          if (typeof consumoPares === 'function') { const c = consumoPares(msV_All, dtInicioStr || '', dtFimStr || ''); kmConsumo += c.km; litConsumo += c.lit; }
          
          if (gastoTotalV > 0 || kmRodadoGrafico > 0 || msV_Per.length > 0 || (!dtInicioStr && !dtFimStr)) {
              chartData.push({ placa: v.placa, gastoTotal: gastoTotalV, gastoComb: gastoComb, gastoOfic: gastoOfic, km: kmRodadoGrafico });
          }
      }
  });

  let chartHTML = `<div class="chart-vertical-container">`;
  
  chartData.forEach(d => {
      let hTotal = (d.gastoTotal > 0 && maxGasto > 0) ? Math.max((d.gastoTotal / maxGasto) * 100, 2) : 0;
      let ratioComb = d.gastoTotal > 0 ? (d.gastoComb / d.gastoTotal) : 0;
      let ratioOfic = d.gastoTotal > 0 ? (d.gastoOfic / d.gastoTotal) : 0;
      let hComb = hTotal * ratioComb;
      let hOficina = hTotal * ratioOfic;
      let hKm = (d.km > 0 && maxKm > 0) ? Math.max((d.km / maxKm) * 100, 2) : 0;
      
      chartHTML += `
      <div class="bar-group-wrapper">
        <div class="bar-group">
          <!-- COLUNA 1: FINANCEIRA EMPILHADA -->
          <div class="bar-track">
            ${d.gastoTotal > 0 ? `<div class="bar-col-val" style="bottom: calc(${hTotal}\% + 5px)">${fmtMoeda(d.gastoTotal)}</div>` : ''}
            <div class="bar-col-fill fifa-fuel" style="height:${hComb}%; border-radius: 4px 4px 0 0;" title="Combustível: ${fmtMoeda(d.gastoComb)}"></div>
            <div class="bar-col-fill fifa-office" style="height:${hOficina}%; border-radius: ${hComb === 0 ? '4px 4px 0 0' : '0'};" title="Oficina: ${fmtMoeda(d.gastoOfic)}"></div>
          </div>
          <!-- COLUNA 2: RODAGEM AZUL -->
          <div class="bar-track">
            ${d.km > 0 ? `<div class="bar-col-val" style="bottom: calc(${hKm}\% + 5px)">${fmtKm(d.km)}</div>` : ''}
            <div class="bar-col-fill fifa-km" style="height:${hKm}%; border-radius: 4px 4px 0 0;" title="Rodagem: ${fmtKm(d.km)}"></div>
          </div>
        </div>
        <div class="bar-col-label">${d.placa}</div>
      </div>`;
  });
  chartHTML += `</div>`;
  document.getElementById('dashChartVertical').innerHTML = chartHTML;

  const mediaKmDia = diasCobertosGeral > 0 ? Math.round(kmEstimadoGeral / diasCobertosGeral) : 0;

  let custoKmGlobal = 'R$ 0,00 / km';
  if (kmGeralMatematica > 0) {
     let calc = gastoGeral / kmGeralMatematica;
     custoKmGlobal = (calc > 0 && calc < 0.01) ? calc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }) + ' / km' : fmtMoeda(calc) + ' / km';
  }
  
  let consumoMedio = litConsumo > 0 ? (kmConsumo / litConsumo).toFixed(2).replace('.', ',') + ' Km/L' : '-';   // tanque a tanque (ver consumoPares)

  document.getElementById('dashKpis').innerHTML = `
    <div class="kpi"><div class="label">Média estimada diária</div><div class="value">${fmtKm(mediaKmDia)}</div></div>
    <div class="kpi"><div class="label">Gasto Analisado (Comb. + Peças)</div><div class="value">${fmtMoeda(gastoGeral)}</div></div>
    <div class="kpi"><div class="label">Visitas à Oficina</div><div class="value">${manutGeral}</div></div>
    <div class="kpi"><div class="label">Consumo de Combustível</div><div class="value" style="color:var(--warning)">${consumoMedio}</div></div>
    <div class="kpi" title="Calculado dividindo o Custo Analisado (Comb. + Peças) pela Rodagem Real no período"><div class="label">Custo por Km Rodado</div><div class="value" style="color:var(--primary)">${custoKmGlobal}</div></div>
  `;

  renderDashboardCiclos();
}

/* ================= RELATÓRIO DE CUSTO (para imprimir/compartilhar com a equipe) ================= */
/** Custos de cada caminhão no período: oficina (separada por classificação), combustível, km rodado e custo por km. */
function dadosRelatorioCusto(de, ate) {
  const dentro = m => m.data >= de && m.data <= ate, linhas = [], servicos = {};
  db.veiculos.forEach(v => {
    const todas = db.manutencoes.filter(m => m.placa === v.placa).sort((a, b) => String(a.data).localeCompare(String(b.data))), per = todas.filter(dentro);
    let ofic = 0, comb = 0, litros = 0, nServ = 0; const porClasse = { PREV: 0, 'CORR-NP': 0, 'CORR-PL': 0, PRED: 0, DET: 0, SIN: 0 };
    per.forEach(m => {
      const val = Number(m.valor) || 0;
      if (m.tipo === 'abastecimento') { comb += val; const l = m._litros || ((String(m.observacao || '').match(/Qtd:\s*([\d.]+)\s*L/) || [])[1]); litros += Number(l) || 0; return; }
      if (m.descricao === 'Registro de KM') return;
      ofic += val; nServ++; porClasse[classeDe(m)] += val;
      const nome = nomeManutencao(m); (servicos[nome] = servicos[nome] || { nome, valor: 0, vezes: 0 }); servicos[nome].valor += val; servicos[nome].vezes++;
    });
    let km = 0; try { km = Number(estimarKmNoPeriodo(v, db.manutencoes, de, ate).km) || 0; } catch (e) { km = 0; }
    const cons = typeof consumoPares === 'function' ? consumoPares(todas, de, ate) : { km: 0, lit: 0 };
    const total = ofic + comb;
    if (total > 0 || km > 0) linhas.push({ placa: v.placa, modelo: v.modelo || '', ofic, comb, total, km, nServ, porClasse, custoKm: km > 0 ? total / km : 0, oficKm: km > 0 ? ofic / km : 0, kmL: cons.lit > 0 ? cons.km / cons.lit : 0 });
  });
  linhas.sort((a, b) => b.total - a.total);
  const soma = k => linhas.reduce((t, l) => t + l[k], 0), comKm = linhas.filter(l => l.km >= 500);
  const maisCaroKm = comKm.slice().sort((a, b) => b.custoKm - a.custoKm)[0] || null, maisOficina = linhas.slice().sort((a, b) => b.ofic - a.ofic)[0] || null;
  return { de, ate, linhas, maisCaro: linhas[0] || null, maisCaroKm, maisOficina, total: soma('total'), ofic: soma('ofic'), comb: soma('comb'), km: soma('km'),
    servicos: Object.values(servicos).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 6) };
}
function abrirRelatorioCusto() {
  const hoje = hojeLocal(), [y, mo] = hoje.split('-').map(Number), z = n => String(n).padStart(2, '0');
  const ultimoDia = (yy, mm) => new Date(yy, mm, 0).getDate();
  const pmY = mo === 1 ? y - 1 : y, pmM = mo === 1 ? 12 : mo - 1;
  const fDe = document.getElementById('dashDataInicio').value, fAte = document.getElementById('dashDataFim').value;
  const op = [
    ['mes', 'Este mês', `${y}-${z(mo)}-01`, hoje],
    ['passado', 'Mês passado', `${pmY}-${z(pmM)}-01`, `${pmY}-${z(pmM)}-${z(ultimoDia(pmY, pmM))}`],
    ['90', 'Últimos 90 dias', App.isoMenos(90), hoje],
    ['ano', 'Este ano', `${y}-01-01`, hoje]
  ];
  if (fDe || fAte) op.unshift(['filtro', 'Período do filtro', fDe || '2000-01-01', fAte || hoje]);
  const esc = { v: op[0][0] }, seg = h('div', { class: 'os-seg rel-seg', role: 'radiogroup' });
  op.forEach(([k, t, d1, d2]) => { const b = h('button', { type: 'button', class: 'os-seg-b' + (k === esc.v ? ' on' : ''), role: 'radio', 'aria-checked': k === esc.v ? 'true' : 'false' }, h('b', { text: t }), h('small', { text: fmtData(d1) + ' a ' + fmtData(d2) }));
    b.onclick = () => { esc.v = k; seg.querySelectorAll('.os-seg-b').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); }); }; seg.append(b); });
  const periodo = () => op.find(o => o[0] === esc.v);
  const preparar = async () => { const [, , d1] = periodo(); if (App.precisaHistorico && App.precisaHistorico(d1)) await App.pedirHistorico(d1, true); const [, nome, a, b] = periodo(); return Object.assign(dadosRelatorioCusto(a, b), { nome }); };
  const imp = h('button', { class: 'btn', type: 'button', text: '🖨️ Gerar relatório (imprimir ou PDF)' }), txt = h('button', { class: 'btn secondary', type: 'button', text: '💬 Copiar resumo para o WhatsApp' });
  logoDataUrl();
  imp.onclick = async () => {
    // a janela abre na hora do toque (senão o navegador bloqueia); o conteúdo entra quando os números ficam prontos
    const w = window.open('', '_blank', 'width=960,height=700'); if (!w) return toast('O navegador bloqueou a janela do relatório. Libere pop-ups para este site.', true);
    w.document.write('<p style="font-family:Arial;padding:30px">Montando o relatório…</p>');
    const r = await preparar(); if (!r.linhas.length) { w.close(); return toast('Nenhum gasto nem rodagem nesse período.', true); }
    imprimirRelatorioCusto(r, w); m.fechar();
  };
  txt.onclick = async () => { const r = await preparar(); if (!r.linhas.length) return toast('Nenhum gasto nem rodagem nesse período.', true); compartilharResumoCusto(r); };
  const m = abrirModal('Relatório de custo por caminhão', h('div', { class: 'rel-cfg' }, h('p', { class: 'hint', text: 'Mostra qual caminhão custou mais no período (oficina + combustível), o custo por km e onde foi o dinheiro. Bom para mostrar à equipe.' }), seg, h('div', { class: 'modal-actions' }, txt, imp)), { largo: true });
}
function textoResumoCusto(r) {
  const brl = v => fmtMoeda(v), L = [];
  L.push(`🚛 *Custo da frota — ${fmtData(r.de)} a ${fmtData(r.ate)}*`);
  L.push(`Total: ${brl(r.total)} (oficina ${brl(r.ofic)} · combustível ${brl(r.comb)})`);
  if (r.maisCaro) L.push(`\n💸 *Caminhão mais caro:* ${r.maisCaro.placa} — ${brl(r.maisCaro.total)}${r.maisCaro.km ? ` (${brl(r.maisCaro.custoKm)}/km)` : ''}`);
  if (r.maisCaroKm && (!r.maisCaro || r.maisCaroKm.placa !== r.maisCaro.placa)) L.push(`📈 Maior custo por km: ${r.maisCaroKm.placa} — ${brl(r.maisCaroKm.custoKm)}/km`);
  if (r.maisOficina && r.maisOficina.ofic > 0) L.push(`🔧 Mais gasto com oficina: ${r.maisOficina.placa} — ${brl(r.maisOficina.ofic)}`);
  L.push('\n*Ranking*'); r.linhas.slice(0, 10).forEach((l, i) => L.push(`${i + 1}. ${l.placa} — ${brl(l.total)}${l.km ? ` · ${fmtKm(l.km)} · ${brl(l.custoKm)}/km` : ''}`));
  if (r.servicos.length) { L.push('\n*Onde mais se gastou na oficina*'); r.servicos.slice(0, 4).forEach(x => L.push(`• ${x.nome}: ${brl(x.valor)} (${x.vezes}x)`)); }
  L.push('\nCuidar do caminhão no dia a dia (checklist, avisar defeito cedo) é o que mais baixa esse custo. 👊');
  return L.join('\n');
}
async function compartilharResumoCusto(r) {
  const t = textoResumoCusto(r);
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(t); toast('Resumo copiado. É só colar no WhatsApp.'); }
  catch (e) { const ta = h('textarea', { rows: 12, readonly: true }); ta.value = t; abrirModal('Copie o resumo', ta); ta.select(); }
}
let _logoDataUrl = null;
async function logoDataUrl() {     // a logo vai embutida no relatório: aparece no PDF e na impressão mesmo sem internet
  if (_logoDataUrl) return _logoDataUrl;
  try { const b = await (await fetch('logotrm.png')).blob(); _logoDataUrl = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(''); fr.readAsDataURL(b); }); } catch (e) { _logoDataUrl = ''; }
  return _logoDataUrl;
}
function imprimirRelatorioCusto(r, janela) {
  const e = escHtml, brl = fmtMoeda, max = Math.max(1, ...r.linhas.map(l => l.total)), logo = _logoDataUrl || new URL('logotrm.png', location.href).href, emitido = new Date().toLocaleString('pt-BR').slice(0, 17);
  const destaque = (rot, l, valor, sub) => l ? `<div class="dest"><div class="dest-rot">${rot}</div><div class="dest-placa">${e(l.placa)}</div><div class="dest-val">${valor}</div><div class="dest-sub">${sub}</div></div>` : '';
  const pctClasse = l => Object.keys(CLASSES).filter(k => l.porClasse[k] > 0).map(k => `<span class="cl ${k.toLowerCase()}" style="width:${(l.porClasse[k] / Math.max(1, l.ofic) * 100).toFixed(1)}%" title="${CLASSES[k]}: ${brl(l.porClasse[k])}"></span>`).join('');
  const css = `*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:24px 28px;font-size:12px}
  header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:12px}header img{height:44px}header h1{font-size:20px;margin:0}header p{margin:3px 0 0;color:#444}
  .dests{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.dest{border:2px solid #111;border-radius:10px;padding:8px 10px}.dest:first-child{background:#111;color:#fff}.dest-rot{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}
  .dest-placa{font-size:22px;font-weight:bold;letter-spacing:.04em;margin:2px 0}.dest-val{font-size:15px;font-weight:bold}.dest-sub{font-size:12px;opacity:.85;margin-top:2px}
  .tot{display:flex;gap:24px;margin:0 0 10px;font-size:12px}.tot b{font-size:15px;display:block}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid #111;padding:4px 5px}td{padding:4px 5px;border-bottom:1px solid #ddd;vertical-align:middle}tr{break-inside:avoid}
  td.cam{white-space:nowrap}td.cam small{display:inline-block;max-width:120px;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom;color:#555}
  td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.top td{font-weight:bold;background:#f3f3f3}.barra{height:10px;background:#eee;border-radius:5px;overflow:hidden;min-width:90px}.barra i{display:block;height:100%;background:#c8102e}
  .mix{display:flex;height:8px;border-radius:4px;overflow:hidden;background:#eee;min-width:70px}.cl{display:block;height:100%}.cl.prev,.cl-prev{background:#1d4ed8}.cl.corr-pl,.cl-corr-pl{background:#d97706}.cl.corr-np,.cl-corr-np{background:#b91c1c}.cl.pred,.cl-pred{background:#7c3aed}.cl.det,.cl-det{background:#0f766e}.cl.sin,.cl-sin{background:#475569}
  .leg{font-size:10.5px;color:#444;margin:0 0 4px}.nota{font-size:10px;color:#666;margin:0 0 12px}.leg span{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px 0 10px;vertical-align:-1px}
  h2{font-size:14px;margin:0 0 6px;break-after:avoid}.serv{columns:2;column-gap:24px;margin:0;padding:0;list-style:none}.serv li{padding:3px 0;border-bottom:1px dotted #bbb;break-inside:avoid;display:flex;justify-content:space-between;gap:10px}
  @media print{@page{size:A4;margin:10mm}body{padding:0}}`;
  const tabela = r.linhas.map((l, i) => `<tr class="${i === 0 ? 'top' : ''}"><td>${i + 1}º</td><td class="cam"><b>${e(l.placa)}</b>${l.modelo ? ` <small>${e(l.modelo)}</small>` : ''}</td>
    <td><div class="barra"><i style="width:${(l.total / max * 100).toFixed(1)}%"></i></div></td><td class="n"><b>${brl(l.total)}</b></td><td class="n">${brl(l.ofic)}</td><td class="n">${brl(l.comb)}</td>
    <td class="n">${l.km ? fmtKm(l.km) : '-'}</td><td class="n">${l.km ? brl(l.custoKm) : '-'}</td><td class="n">${l.kmL ? l.kmL.toFixed(2).replace('.', ',') : '-'}</td><td>${l.ofic > 0 ? `<div class="mix">${pctClasse(l)}</div>` : '-'}</td></tr>`).join('');
  const corpo = `<header><img src="${logo}" alt="Transmarina"><div><h1>Custo da frota por caminhão</h1><p>${e(r.nome)}: ${fmtData(r.de)} a ${fmtData(r.ate)} · emitido em ${emitido}</p></div></header>
    <div class="dests">${destaque('💸 Caminhão mais caro', r.maisCaro, r.maisCaro ? brl(r.maisCaro.total) : '', r.maisCaro ? `oficina ${brl(r.maisCaro.ofic)} · combustível ${brl(r.maisCaro.comb)}` : '')}
      ${destaque('📈 Maior custo por km', r.maisCaroKm, r.maisCaroKm ? brl(r.maisCaroKm.custoKm) + ' / km' : '', r.maisCaroKm ? fmtKm(r.maisCaroKm.km) + ' rodados no período' : '')}
      ${destaque('🔧 Mais gasto com oficina', r.maisOficina && r.maisOficina.ofic > 0 ? r.maisOficina : null, r.maisOficina ? brl(r.maisOficina.ofic) : '', r.maisOficina ? r.maisOficina.nServ + ' serviço(s)' : '')}</div>
    <div class="tot"><div>Total da frota<b>${brl(r.total)}</b></div><div>Oficina<b>${brl(r.ofic)}</b></div><div>Combustível<b>${brl(r.comb)}</b></div><div>Rodagem estimada<b>${fmtKm(r.km)}</b></div><div>Custo médio<b>${r.km ? brl(r.total / r.km) + ' / km' : '-'}</b></div></div>
    <table><thead><tr><th></th><th>Caminhão</th><th></th><th class="n">Total</th><th class="n">Oficina</th><th class="n">Combustível</th><th class="n">Km</th><th class="n">R$/km</th><th class="n">Km/L</th><th>Oficina por tipo</th></tr></thead><tbody>${tabela}</tbody></table>
    <div class="leg">Oficina por tipo:${Object.keys(CLASSES).map(k => `<span class="cl-${k.toLowerCase()}"></span>${CLASSE_CURTA[k]}`).join('')}</div>
    <p class="nota">Km rodado estimado pelo histórico de KM do caminhão. Custo por km considera só caminhões com pelo menos 500 km no período. Combustível pelas faturas do posto e lançamentos.</p>
    ${r.servicos.length ? `<h2>Onde mais se gastou na oficina</h2><ul class="serv">${r.servicos.map(x => `<li><span>${e(x.nome)} <small>(${x.vezes}x)</small></span><b>${brl(x.valor)}</b></li>`).join('')}</ul>` : ''}
`;
  const w = janela || window.open('', '_blank', 'width=960,height=700'); if (!w) { toast('O navegador bloqueou a janela do relatório. Libere pop-ups para este site.', true); return; }
  w.document.open(); w.document.write(`<html><head><title>Custo por caminhão · ${fmtData(r.de)} a ${fmtData(r.ate)}</title><style>${css}</style></head><body>${corpo}</body></html>`); w.document.close(); w.focus();
  const img = w.document.querySelector('img'); const imprimir = () => setTimeout(() => w.print(), 300); if (img && !img.complete) { img.onload = imprimir; img.onerror = imprimir; } else imprimir();
}

/* ================= ABA 4: ALERTAS ================= */
async function marcarResolvido(id) { 
  const a = db.alertas.find(x => x.id === id); if (!a) return;
  const v = db.veiculos.find(x => x.placa === a.placa);
  let kmInformado = await pedirKmCustom('Registrar KM', `Alerta: ${nomeTipo(a.tipo)}\n\nInforme o KM ATUAL do veículo ${a.placa} no momento desta troca:`, v ? v.kmAtual : '');
  if (kmInformado === null) return;
  let kmParsed = parseNumeroBR(kmInformado);
  if (isNaN(kmParsed) || kmParsed <= 0) kmParsed = v ? v.kmAtual : 0;
  
  const validacao = validarSaltoKm(a.placa, kmParsed, hojeISO(), false);
  if(validacao) {
     if (validacao.erro) return toast(validacao.msg, true);
     if (validacao.alerta) { const quer = await confirmarCustom('Aviso de KM', validacao.msg); if (!quer) return; }
  }
  if (v && kmParsed > v.kmAtual) v.kmAtual = kmParsed;
  
  const registro = { id: gerarId(), placa: a.placa, tipo: TIPOS_RASTREADOS.includes(a.tipo) ? a.tipo : 'outro', descricao: !TIPOS_RASTREADOS.includes(a.tipo) ? a.tipo : '', km: kmParsed, data: hojeISO(), valor: 0, observacao: '', nome: (GF.nome()) + " (em " + dataHoraAtual() + ")" };
  db.manutencoes.push(registro); db.alertas = db.alertas.filter(x => x.id !== a.id); salvarCache(); renderTelaAtual(); toast('Marcado como resolvido no histórico!');
  execBackground(async () => { await apiPost('addManutencao', registro); await apiPost('deleteAlerta', { id: a.id }); await apiPost('updateKmVeiculo', { placa: a.placa, kmAtual: kmParsed }); sincronizarAlertas(true); }, 'Erro marcar resolvido');
}

function alterarAlerta(id, status) {
  const a = db.alertas.find(x => x.id === id); if (!a) return;
  a.status = status; a.dataAnalise = status === 'analise' ? hojeISO() : null; a.classificadoPor = quemEQuando(); salvarCache(); renderTelaAtual(); execBackground(async () => { await apiPost('updateAlerta', { id, status, dataAnalise: a.dataAnalise, dataResolucao: null, classificadoPor: a.classificadoPor }); }, 'Erro alerta');
}
function resolverOcorrenciaGF(id) {
  const o = ((App.dados || {}).ocorrencias || []).find(x => x.id === id); if (!o) return;
  abrirResolverOcorrencia(o, () => renderTelaAtual());
}
/** Resolver ocorrência do motorista: pergunta o que foi feito e se usou peças. Com peças (ou valor), vira manutenção no histórico
    do caminhão e as peças saem do estoque; sem nada, só marca como resolvida. Usado no GF e na tela de Ocorrências do Fleet. */
function abrirResolverOcorrencia(o, depois) {
  const feito = h('input', { type: 'text', maxlength: 120, list: 'listaServicos', placeholder: 'Ex.: troquei a lâmpada do farol', 'aria-label': 'O que foi feito' });
  const valor = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Opcional', 'aria-label': 'Valor do serviço' });
  const v = (db.veiculos || []).find(x => x.placa === o.placa), km = h('input', { type: 'text', inputmode: 'numeric', placeholder: v && v.kmAtual ? 'Atual: ' + Number(v.kmAtual).toLocaleString('pt-BR') : 'Opcional', 'aria-label': 'KM' });
  const aviso = h('div', { class: 'oc-res-aviso' }), msg = h('div', { class: 'msg' }), ok = h('button', { type: 'button', class: 'btn', text: '✅ Resolver' });
  const ed = typeof Almox !== 'undefined' ? Almox.editorPecas({ aoMudar: () => pintar() }) : null;
  const campo = (rot, el) => h('div', { class: 'field' }, h('label', { text: rot }), el);
  const pintar = () => { const n = ed ? ed.quantas() : 0, val = parseNumeroBR(valor.value) || 0, custo = ed ? ed.custo() : 0;
    aviso.textContent = n || val ? '🧾 Vai para o histórico do ' + o.placa + ' como manutenção' + (val + custo ? ' (' + fmtMoeda(val + custo) + (custo ? ', com ' + fmtMoeda(custo) + ' em peças' : '') + ')' : '') + '.' : 'Sem peças e sem valor: só marca a ocorrência como resolvida.';
    ok.textContent = n || val ? '✅ Resolver e lançar no histórico' : '✅ Resolver'; };
  valor.addEventListener('input', pintar); atualizarDatalistServicos();
  const corpo = h('div', { class: 'oc-res' },
    h('p', { class: 'oc-res-item' }, h('b', { text: o.item || 'Ocorrência' }), o.descricao ? ' — ' + o.descricao : ''),
    campo('O que foi feito?', feito), h('div', { class: 'field' }, h('label', { text: 'Usou peças?' }), ed ? ed.el : h('p', { class: 'hint', text: 'Almoxarifado indisponível.' })),
    h('div', { class: 'row' }, campo('Valor do serviço / mão de obra (R$)', valor), campo('KM', km)), aviso, msg, h('div', { class: 'modal-actions' }, ok));
  const md = abrirModal('Resolver ocorrência — ' + o.placa, corpo); pintar(); feito.focus();
  ok.onclick = async () => {
    mensagem(msg, '');
    const dados = { id: o.id, resolucao: feito.value.trim() }, n = ed ? ed.quantas() : 0, val = valor.value.trim() ? parseNumeroBR(valor.value) : 0;
    if (valor.value.trim() && (isNaN(val) || val < 0)) { mensagem(msg, 'Valor inválido.'); return valor.focus(); }
    if (n || val) {
      const texto = feito.value.trim() || o.item || 'Correção de ocorrência', t = tipoDoTexto(texto, null);
      if (t.erro) { mensagem(msg, t.erro); return feito.focus(); }
      if (t.varios) { mensagem(msg, 'Aqui cabe um serviço só. Escreva o principal (ex.: "' + t.varios[0].nome + '") ou lance os outros pela "Lançar nota".'); return feito.focus(); }
      if (t.tipo === 'abastecimento') { mensagem(msg, 'Abastecimento não entra aqui.'); return feito.focus(); }
      const ped = ed ? ed.obter() : { linhas: [] }; if (ped.erro) { mensagem(msg, ped.erro); if (ped.campo) ped.campo.focus(); return; }
      if (ed && ed.precoSuspeito() && !(await confirmarCustom('Preço de peça fora do normal', 'Tem peça com valor bem diferente do que costuma custar. Confirma que digitou o valor de UMA unidade?'))) return;
      let k = 0; if (km.value.trim()) { k = parseNumeroBR(km.value); if (isNaN(k) || k <= 0) { mensagem(msg, 'KM inválido.'); return km.focus(); }
        const vk = validarSaltoKm(o.placa, k, hojeISO(), false); if (vk) { if (vk.erro) { mensagem(msg, vk.msg); return km.focus(); } if (vk.alerta && !(await confirmarCustom('Aviso de KM', vk.msg))) return; } }
      Object.assign(dados, { manutId: gerarId(), tipo: t.tipo, descricao: t.descricao || texto, valor: val, km: k || (v ? v.kmAtual : 0), data: hojeISO(), classe: TIPOS_RASTREADOS.includes(t.tipo) ? 'PREV' : 'CORR-PL', pecas: ped.linhas });
    }
    ok.disabled = true;
    try {
      await apiPost('resolverOcorrencia', dados); md.fechar();
      o.status = 'RESOLVIDA'; o.resolvidoEm = hojeLocal() + ' ' + new Date().toTimeString().slice(0, 8); o.resolvidoPor = GF.nome();
      toast(dados.manutId ? 'Resolvida e lançada no histórico do caminhão.' : 'Ocorrência resolvida: foi para Resolvido.');
      if (depois) depois();
    } catch (e) { ok.disabled = false; mensagem(msg, e.message); }
  };
}
function reabrirOcorrenciaGF(id) {
  const d = App.dados, o = (d.ocorrencias || []).find(x => x.id === id); if (!o) return;
  const antes = { status: o.status, resolvidoEm: o.resolvidoEm, resolvidoPor: o.resolvidoPor };
  o.status = 'ABERTA'; o.resolvidoEm = ''; o.resolvidoPor = '';
  renderTelaAtual(); toast('Ocorrência reaberta: voltou para pendente.');
  execBackground(async () => { try { await apiPost('reabrirOcorrencia', { id }); } catch (e) { Object.assign(o, antes); renderTelaAtual(); throw e; } }, 'Não foi possível reabrir a ocorrência');
}
function marcarAnalise(id) { alterarAlerta(id, 'analise'); }
function reabrirAlerta(id) { alterarAlerta(id, 'ativo'); }

async function reativarResolvido(id) { 
  const m = db.manutencoes.find(x => x.id === id); if (!m) return;
  const quer = await confirmarCustom('Desfazer Manutenção', `Isto apagará o registro de ${fmtMoeda(m.valor)} do histórico do ${m.placa} e recriará a pendência. Confirma?`);
  if (!quer) return;
  db.manutencoes = db.manutencoes.filter(x => x.id !== m.id);
  const novoAg = { id: gerarId(), placa: m.placa, tipo: m.tipo, descricao: m.descricao, dataPrevista: m.data, valor: m.valor, observacao: m.observacao, criadoEm: hojeISO(), nome: GF.nome() };
  db.agendamentos.push(novoAg); salvarCache(); renderTelaAtual(); sincronizarAlertas(false); toast('Desfeito! Voltou para agendamentos.');
  execBackground(async () => { await apiPost('deleteManutencao', { id: m.id }); await apiPost('addAgendamento', novoAg); sincronizarAlertas(true); }, 'Erro desfazer');
}

function iniciarAnaliseAgendamento(id) {
  const ag = db.agendamentos.find(a => a.id === id); if (!ag) return;
  const tipoA = ag.tipo === 'outro' ? ag.descricao : ag.tipo;
  let ex = db.alertas.find(a => a.placa === ag.placa && normPeca(a.tipo) === normPeca(tipoA) && a.status !== 'resolvido');
  if (ex) { ex.status = 'analise'; ex.dataAnalise = hojeISO(); ex.classificadoPor = quemEQuando(); salvarCache(); renderTelaAtual(); execBackground(async () => { await apiPost('updateAlerta', { id: ex.id, status: 'analise', dataAnalise: ex.dataAnalise, classificadoPor: ex.classificadoPor }); }, 'Erro andamento'); } 
  else { const novoAlerta = { id: gerarId(), placa: ag.placa, tipo: tipoA, status: 'analise', dataAnalise: hojeISO(), dataResolucao: null, classificadoPor: quemEQuando() }; db.alertas.push(novoAlerta); salvarCache(); renderTelaAtual(); execBackground(async () => { await apiPost('addAlerta', novoAlerta); }, 'Erro andamento'); }
}
function irParaVeiculo(placa) { Hub.ir('frota'); selecionarVeiculo(placa); }
const estadoAccordions = { aprovar: true, ocorrencia: true, atrasado: true, pendente: true, andamento: true, resolvido: false };
function toggleSecaoAlerta(header, secaoId) {
  const corpo = header.nextElementSibling; const seta = header.querySelector('.alert-secao-seta'); const estavaAberto = corpo.style.display !== 'none';
  corpo.style.display = estavaAberto ? 'none' : 'block'; seta.textContent = estavaAberto ? '▸' : '▾'; estadoAccordions[secaoId] = !estavaAberto; 
}
function grupoAlerta(a) { if (a.status === 'resolvido') return 'resolvido'; if (a.status === 'analise') return 'andamento'; const ag = db.agendamentos.find(ag => ag.placa === a.placa && ag.tipo === a.tipo); return (!ag || (ag.dataPrevista && ag.dataPrevista < hojeLocal())) ? 'atrasado' : 'pendente'; }
function dataCriacaoAlertaTs(a) { const p = String(a.id || '').split('_'); if (p.length >= 2) { const ts = parseInt(p[1], 36); if (!isNaN(ts)) return ts; } return Date.now(); }

function dicaAlerta(a, grp) {
  const rot = { atrasado: 'Atrasado', pendente: 'Pendente', andamento: 'Em andamento', resolvido: 'Resolvido' }[grp] || grp;
  let quem = a.classificadoPor || '';
  if (grp === 'resolvido') quem = a.nome || quem;
  if (grp === 'atrasado' && !quem) quem = 'Sistema (automático)';
  return quem ? (grp === 'resolvido' ? `👤 Resolvido por: ${quem}` : `👤 ${rot} — classificado por: ${quem}`) : `👤 ${rot} — sem registro de quem classificou`;
}
function dicaAgendamento(ag, rot) { return `👤 ${rot} — ${quemQuando(ag, 'Programado')}`; }
/** Quem lançou/programou e quando (e a última alteração, se houve). Registros antigos não têm a hora: mostra só o nome. */
/** O GF antigo gravava a data junto do nome: "João Paulo (em 10/11 às 16:12)". Separa as duas coisas. */
function separarNomeData(nome) {
  const t = String(nome || ''), m = t.match(/^(.*?)\s*\(em\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+(?:às|as)\s+(\d{1,2}:\d{2}))?\)\s*$/i);
  return m ? { nome: m[1].trim(), quando: m[2] + (m[3] ? ' às ' + m[3] : '') } : { nome: t, quando: '' };
}
function quemQuando(r, verbo) {
  const nd = separarNomeData(r.nome); r = Object.assign({}, r, { nome: nd.nome });
  const cr = String(r.criadoEmTxt || ''), alt = String(r.alteradoEm || ''), temHora = x => /\d{2}:\d{2}/.test(x);
  if (r.criadoPor) {
    let t = verbo + ' por ' + r.criadoPor + (cr ? ' em ' + fmtQuando(cr) : '');
    if (alt && alt.slice(0, 16) !== cr.slice(0, 16)) t += ' · alterado por ' + (r.nome || '—') + ' em ' + fmtQuando(alt);
    return t;
  }
  if (alt) return 'Último registro por ' + (r.nome || 'não identificado') + ' em ' + fmtQuando(alt);
  return (r.nome ? 'Registrado por ' + r.nome : 'Sem autor registrado') + (cr && temHora(cr) ? ' em ' + fmtQuando(cr) : nd.quando ? ' em ' + nd.quando : cr ? ' em ' + fmtData(cr.slice(0, 10)) : ' (sem data registrada)');
}
/** Ocorrências abertas pelos motoristas (checklist) para este caminhão, no mesmo estilo dos cards de alerta. */
/* Ocorrências dos motoristas (checklist aprovado ou defeito relatado) que estão pendentes: entram no GF como pendência. */
/* ---------- Caminhão parado: marcado pela placa, aparece em todos os alertas daquele caminhão ---------- */
function veiculoParado(placa) { const v = db.veiculos.find(x => x.placa === placa); return v && v.paradoDesde ? v : null; }
function fmtQuando(dh) { const t = String(dh || ''); return t.length >= 10 ? fmtData(t.slice(0, 10)) + (t.length >= 16 ? ' ' + t.slice(11, 16) : '') : '-'; }
function tagParado(placa) {
  const r = statusVeiculoOp(placa); if (r.st === 'DISPONIVEL') return '';
  return r.st === 'BLOQUEADO' ? `<span class="tag-parado" title="${escAttr(r.motivo)}">🔴 Bloqueado</span>` : `<span class="tag-parado restrita" title="${escAttr(r.motivo)}">🟠 Restrita</span>`;
}
function placaClicavel(placa) { return `<span class="oc-placa" role="button" tabindex="0" title="Opções do caminhão" onclick="menuPlaca(event,'${escAttr(placa)}')" onkeydown="if(event.key==='Enter')menuPlaca(event,'${escAttr(placa)}')">${escHtml(placa)}</span>${tagParado(placa)}`; }
function fecharMenuPlaca() { const m = document.getElementById('menuPlaca'); if (m) m.remove(); document.removeEventListener('pointerdown', fora_menuPlaca, true); document.removeEventListener('keydown', esc_menuPlaca, true); }
function fora_menuPlaca(e) { const m = document.getElementById('menuPlaca'); if (m && !m.contains(e.target)) fecharMenuPlaca(); }
function esc_menuPlaca(e) { if (e.key === 'Escape') { e.stopImmediatePropagation(); fecharMenuPlaca(); } }
function menuPlaca(ev, placa) {
  ev.stopPropagation(); fecharMenuPlaca();
  const parado = !!veiculoParado(placa), r = ev.currentTarget.getBoundingClientRect(), m = document.createElement('div');
  m.id = 'menuPlaca'; m.className = 'menu-placa'; m.setAttribute('role', 'menu');
  m.innerHTML = `<div class="menu-placa-tit">${escHtml(placa)}${parado ? ' · parado' : ''}</div>
    <button type="button" role="menuitem" data-a="abrir">🚛 Abrir o caminhão</button>
    <button type="button" role="menuitem" data-a="parado" class="${parado ? 'lib' : 'par'}">${parado ? '✅ Liberar (voltou a rodar)' : '🚫 Marcar como parado'}</button>`;
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; fecharMenuPlaca(); if (b.dataset.a === 'abrir') irParaVeiculo(placa); else alternarParado(placa); };
  document.body.appendChild(m);
  const w = m.offsetWidth, hgt = m.offsetHeight, x = Math.max(8, Math.min(r.left, innerWidth - w - 8)), y = r.bottom + 6 + hgt > innerHeight - 8 ? Math.max(8, r.top - hgt - 6) : r.bottom + 6;
  m.style.left = x + 'px'; m.style.top = y + 'px'; m.querySelector('button').focus();
  setTimeout(() => { document.addEventListener('pointerdown', fora_menuPlaca, true); document.addEventListener('keydown', esc_menuPlaca, true); }, 0);
}
/** Faixa no topo do caminhão: situação (bloqueado/restrita) e, se tiver algo P1–P3, os itens P4 que dá para fazer na mesma parada. */
function faixaSituacao(placa, v) {
  const r = statusVeiculoOp(placa); let html = '';
  if (r.st === 'BLOQUEADO') html += `<div class="parado-faixa">🔴 <b>BLOQUEADO / INDISPONÍVEL</b> — proibido escalar. ${escHtml(r.motivo)}.${v.paradoOrigem === 'checklist' ? ' Bloqueado automaticamente pelo checklist: a gestão confere e pode revogar.' : ''}</div>`;
  else if (r.st === 'RESTRITA') html += `<div class="parado-faixa restrita">🟠 <b>OPERAÇÃO RESTRITA</b> — pode terminar a rota atual e entra na oficina ao voltar. ${escHtml(r.motivo)}.</div>`;
  const op = backlogP4(placa); if (op.length) html += `<div class="oport-faixa">♻️ <b>Aproveite a parada:</b> ${op.length} item(ns) P4 deste caminhão podem ser feitos junto — ${op.slice(0, 3).map(x => escHtml(x.nome)).join(', ')}${op.length > 3 ? '…' : ''}.</div>`;
  return html;
}
/** Regra do backlog: quando o caminhão tem algo P1, P2 ou P3 aberto, os itens P4 dele viram sugestão para a mesma parada. */
function backlogP4(placa) {
  const itens = osItens().filter(i => i.placa === placa);
  const temUrg = itens.some(i => i.crit !== 'P4') || osAbertas().some(o => o.placa === placa && normCrit(o.criticidade) !== 'P4');
  return temUrg ? itens.filter(i => i.crit === 'P4' && !osDoItem(i.ref, i.refId)) : [];
}
async function revogarBloqueioGF(placa) {
  const motivo = await pedirTextoCustom('Revogar bloqueio de ' + placa, 'O checklist bloqueou o caminhão. Por que ele pode rodar? (fica registrado)');
  if (motivo === null) return; if (String(motivo).trim().length < 3) return toast('Escreva o motivo.', true);
  try { await apiPost('revogarBloqueio', { placa, motivo: String(motivo).trim() }); toast(placa + ' liberado.'); App.recarregar(true); }
  catch (e) { toast(e.message, true); }
}
function alternarParado(placa) {
  const v = db.veiculos.find(x => x.placa === placa); if (!v) return;
  const vai = !v.paradoDesde, antes = { paradoDesde: v.paradoDesde, paradoPor: v.paradoPor };
  // grava também nos dados do Hub: quando o histórico antigo chega, o GF é remontado a partir deles
  const bruto = (((typeof App !== 'undefined' && App.dados) || {}).veiculos || []).find(x => String(x.placa).trim().toUpperCase() === placa);
  const marcar = (pd, pp) => { v.paradoDesde = pd; v.paradoPor = pp; if (bruto) { bruto.paradoDesde = pd; bruto.paradoPor = pp; } };
  marcar(vai ? hojeLocal() + ' ' + new Date().toTimeString().slice(0, 8) : '', vai ? GF.nome() : '');
  salvarCache(); renderTelaAtual(); toast(vai ? placa + ' marcado como parado.' : placa + ' liberado.');
  execBackground(async () => {
    try { const r = await apiPost('marcarParado', { placa, parado: vai }); if (vai && r && r.paradoDesde) { marcar(r.paradoDesde, r.paradoPor || v.paradoPor); salvarCache(); } }
    catch (e) { marcar(antes.paradoDesde, antes.paradoPor); salvarCache(); renderTelaAtual(); throw e; }
  }, 'Não foi possível ' + (vai ? 'marcar o caminhão como parado' : 'liberar o caminhão'));
}
function ocorrenciasAbertas() { const d = (typeof App !== 'undefined' && App.dados) || {}; return (d.ocorrencias || []).filter(o => String(o.status || '').toUpperCase() === 'ABERTA'); }
function ocorrenciaGrave(o) { return /alta|grave|urgente/i.test(o.prioridade || '') || /sim/i.test(o.restringeCirculacao || ''); }
function montarCardOcorrencia(o, comPlaca) {
  const d = (typeof App !== 'undefined' && App.dados) || {}, m = (d.motoristas || []).find(x => x.id === o.motoristaId);
  const origem = o.origem === 'relato' ? 'defeito relatado' : 'checklist', resolvida = String(o.status || '').toUpperCase() === 'RESOLVIDA';
  const quando = resolvida ? 'resolvida ' + fmtQuando(o.resolvidoEm) + (o.resolvidoPor ? ' por ' + escHtml(o.resolvidoPor) : '') : (o.dataAbertura ? fmtData(String(o.dataAbertura).slice(0, 10)) : '');
  const botao = resolvida ? `<button class="btn small secondary" onclick="reabrirOcorrenciaGF('${escAttr(o.id)}')">Reabrir</button>` : `<button class="btn small" onclick="resolverOcorrenciaGF('${escAttr(o.id)}')">Resolvido</button>`;
  return `<div class="alert-card ${resolvida ? 'resolvido' : ocorrenciaGrave(o) ? 'atrasado' : 'pendente'} oc-gf"><div class="alert-info"><div class="alert-title">${comPlaca ? placaClicavel(o.placa) + ' ' : ''}${resolvida ? '📣 ' : ''}${escHtml(o.item || 'Ocorrência')}</div>
    <div class="alert-sub">${escHtml(o.descricao || '-')}</div><div class="alert-sub">${quando} · ${escHtml(m ? m.nome : 'Motorista')} · ${origem}</div>${resolvida ? '' : `<div class="alert-crit">${chipCrit('ocorrencia', o, 'oc')}${tagClasse(critDe('ocorrencia', o) === 'P1' ? 'CORR-NP' : 'CORR-PL')}${tagOsItem('oc', o.id)}</div>`}</div>
    <div class="alert-actions">${botao}</div></div>`;
}
function montarCardOcorrencias(placa, soSeTiver) {
  const lista = ocorrenciasAbertas().filter(o => o.placa === placa).sort((a, b) => (ocorrenciaGrave(b) - ocorrenciaGrave(a)) || String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
  if (!lista.length && soSeTiver) return '';
  return `<div class="card"><h2>📣 Ocorrências dos motoristas</h2>${lista.map(o => montarCardOcorrencia(o, false)).join('') || '<p class="empty" style="padding:12px;">Nenhuma ocorrência aberta neste caminhão. ✅</p>'}</div>`;
}

function montarCardAlerta(a) {
  const v = db.veiculos.find(x => x.placa === a.placa), km = v ? fmtKm(v.kmAtual) : '-', grp = grupoAlerta(a);
  const isAdmin = (GF.perfil()) !== "mecanico";
  let btn = grp === 'resolvido' ? `<button class="btn small secondary" onclick="reativarResolvido('${a.id}')">Reabrir</button>${isAdmin ? `<button class="btn small danger" onclick="excluirManutencao('${a.id}')">Excluir</button>` : ''}` :
            grp === 'andamento' ? `<button class="btn small" onclick="marcarResolvido('${a.id}')">Resolvido</button><button class="btn small secondary" onclick="reabrirAlerta('${a.id}')">Voltar</button>` :
            `<button class="btn small secondary" onclick="marcarAnalise('${a.id}')">Em andamento</button><button class="btn small" onclick="marcarResolvido('${a.id}')">Resolvido</button>`;
  return `<div class="alert-card ${grp}" title="${escAttr(dicaAlerta(a, grp))}"><div class="alert-info"><div class="alert-title">${placaClicavel(a.placa)} ${nomeTipo(a.tipo)}</div><div class="alert-sub">Km: ${km}</div>${grp === 'resolvido' ? '' : `<div class="alert-crit">${chipCrit('alerta', a, 'alerta')}${tagClasse('PREV')}${tagOsItem('alerta', a.id)}</div>`}</div><div class="alert-actions">${btn}</div></div>`;
}

/** Peças previstas no agendamento, com o que falta comprar (estoque de agora). */
function resumoPecasAg(ag) {
  const ps = ag && Array.isArray(ag.pecas) ? ag.pecas : []; if (!ps.length) return '';
  const tem = typeof Almox !== 'undefined';
  const itens = ps.map(p => { const pc = tem ? (p.pecaId ? Almox.porId(p.pecaId) : Almox.porNome(p.nome)) : null, q = Number(p.qtd) || 1, nome = (pc ? pc.nome : p.nome) + (q !== 1 ? ' ×' + q.toLocaleString('pt-BR') : '');
    if (p.origem === 'compra') return { t: nome + ' (comprar)', falta: true };
    if (p.origem === 'nota') return { t: nome + ' (vem na nota)', falta: false };
    const falta = pc ? q > Almox.qtd(pc) : true; return { t: nome + (falta ? ' (falta no estoque)' : ' ✓'), falta }; });
  const n = itens.filter(i => i.falta).length;
  return `<div class="ag-pecas${n ? ' falta' : ''}">🔩 ${escHtml(itens.map(i => i.t).join(' · '))}</div>`;
}
function montarCardAgAtrasado(ag) { 
    return `<div class="alert-card atrasado" title="${escAttr(dicaAgendamento(ag, 'Atrasado'))}"><div class="alert-info"><div class="alert-title">${placaClicavel(ag.placa)} ${(ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo)}</div><div class="alert-sub" style="color:var(--danger); font-weight:bold;">⚠️ Atrasado: ${ag.dataPrevista ? fmtData(ag.dataPrevista) : '-'}</div>${resumoPecasAg(ag)}<div class="quem-quando">👤 ${escHtml(quemQuando(ag, 'Programado'))}</div><div class="alert-crit">${chipCrit('agend', ag, 'agend')}${tagClasse(classeDe(ag))}${tagOsItem('agend', ag.id)}</div></div><div class="alert-actions"><button class="btn small secondary" onclick="iniciarAnaliseAgendamento('${ag.id}')">Em andamento</button><button class="btn small" onclick="resolverAgendamento('${ag.id}')">Resolvido</button><button class="btn small secondary" onclick="editarAgendamento('${ag.id}')">Editar</button></div></div>`; 
}

function montarCardAgPendente(ag) { 
    return `<div class="alert-card pendente" title="${escAttr(dicaAgendamento(ag, 'Pendente'))}"><div class="alert-info"><div class="alert-title">${placaClicavel(ag.placa)} ${(ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo)}</div><div class="alert-sub">Agendado para: ${ag.dataPrevista ? fmtData(ag.dataPrevista) : '-'}</div>${resumoPecasAg(ag)}<div class="quem-quando">👤 ${escHtml(quemQuando(ag, 'Programado'))}</div><div class="alert-crit">${chipCrit('agend', ag, 'agend')}${tagClasse(classeDe(ag))}${tagOsItem('agend', ag.id)}</div></div><div class="alert-actions"><button class="btn small secondary" onclick="iniciarAnaliseAgendamento('${ag.id}')">Em andamento</button><button class="btn small" onclick="resolverAgendamento('${ag.id}')">Resolvido</button><button class="btn small secondary" onclick="editarAgendamento('${ag.id}')">Editar</button></div></div>`; 
}

function renderAlertas() {
  const s = document.getElementById('tab-alertas'); if (!s) return; 
  let filtroInput = document.getElementById('filtroPlacaAlerta'); const card = s.querySelector('.card');
  if (!filtroInput && card) {
    filtroInput = document.createElement('input'); filtroInput.type = 'text'; filtroInput.id = 'filtroPlacaAlerta'; 
    filtroInput.placeholder = '🔎 Filtrar por placa ou serviço...'; 
    filtroInput.style.marginBottom = '16px'; filtroInput.oninput = renderAlertas;
    const listaAtual = card.querySelector('#alertasLista'); if (listaAtual) card.insertBefore(filtroInput, listaAtual); else card.appendChild(filtroInput);
  }
  let c = document.getElementById('alertasLista'); if (!c && card) { c = document.createElement('div'); c.id = 'alertasLista'; card.appendChild(c); }
  
  const termoOriginal = filtroInput ? filtroInput.value.trim().toUpperCase() : '';
  const termoLimpo = termoOriginal.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  
  let baseAgs = db.agendamentos.filter(ag => { const tipoMapeado = ag.tipo === 'outro' ? (ag.descricao || 'outro') : ag.tipo; return !db.alertas.some(a => a.placa === ag.placa && normPeca(a.tipo) === normPeca(tipoMapeado) && a.status !== 'resolvido'); });
  let baseAlertas = db.alertas.filter(a => a.tipo !== 'Registro de KM');

  if (termoLimpo) { 
    baseAgs = baseAgs.filter(ag => {
        const desc = (ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo);
        const textoBusca = (ag.placa + " " + desc).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        return textoBusca.includes(termoLimpo);
    }); 
    baseAlertas = baseAlertas.filter(a => {
        const desc = nomeTipo(a.tipo);
        const textoBusca = (a.placa + " " + desc).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        return textoBusca.includes(termoLimpo);
    }); 
  }

  const g = { atrasado: [], pendente: [], andamento: [], resolvido: [] };
  baseAlertas.forEach(a => g[grupoAlerta(a)].push(a));
  
  // 🛑 AQUI: Filtra e remove tanto 'Registro de KM' quanto 'abastecimento' dos resolvidos!
  const resolvidosComputados = db.manutencoes
      .filter(m => m.descricao !== 'Registro de KM' && m.tipo !== 'abastecimento')
      .map(m => ({ id: m.id, placa: m.placa, tipo: m.tipo === 'outro' ? m.descricao : m.tipo, status: 'resolvido', dataResolucao: m.data, nome: m.nome }));
      
  g.resolvido = resolvidosComputados.sort((a,b) => new Date(b.dataResolucao) - new Date(a.dataResolucao));
  
  if (termoLimpo) {
      g.resolvido = g.resolvido.filter(a => {
         const textoBusca = (a.placa + " " + a.tipo).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
         return textoBusca.includes(termoLimpo);
      });
  }

  // Ocorrências resolvidas (pelo GF, pelo Fleet ou na aprovação do checklist) entram em Resolvido junto com as manutenções — com Reabrir
  let ocsRes = ((typeof App !== 'undefined' && App.dados && App.dados.ocorrencias) || []).filter(o => String(o.status || '').toUpperCase() === 'RESOLVIDA');
  if (termoLimpo) ocsRes = ocsRes.filter(o => (o.placa + ' ' + o.item + ' ' + o.descricao).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoLimpo));
  let ocs = ocorrenciasAbertas();
  if (termoLimpo) ocs = ocs.filter(o => (o.placa + ' ' + o.item + ' ' + o.descricao).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoLimpo));
  ocs.sort((a, b) => (CRITS[critDe('ocorrencia', a)].n - CRITS[critDe('ocorrencia', b)].n) || String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
  if (baseAlertas.length === 0 && baseAgs.length === 0 && g.resolvido.length === 0 && !ocs.length && !ocsRes.length && !manutMotoristaPendentes().length) { c.innerHTML = '<p class="empty">Nenhum alerta encontrado. ✅</p>'; return; }

  const hoje = hojeLocal(); const agsAtrasados = baseAgs.filter(ag => ag.dataPrevista && ag.dataPrevista < hoje); const agsPendentes = baseAgs.filter(ag => !(ag.dataPrevista && ag.dataPrevista < hoje));
  // dentro de cada grupo: primeiro o que obriga a parar, depois rodar com cautela, depois o resto
  const listaAtrasados = [ ...g.atrasado.map(a => ({ html: montarCardAlerta(a), ts: dataCriacaoAlertaTs(a), c: CRITS[critDe('alerta', a)].n })), ...agsAtrasados.map(ag => ({ html: montarCardAgAtrasado(ag), ts: new Date(ag.dataPrevista + 'T00:00:00').getTime(), c: CRITS[critDe('agend', ag)].n })) ];
  listaAtrasados.sort((a, b) => (a.c - b.c) || (a.ts - b.ts));
  
  const sec = (grp, tit, html, num) => { if(num === 0) return ''; const exp = estadoAccordions[grp]; return `<div class="alert-secao ${grp}"><div class="alert-secao-header" onclick="toggleSecaoAlerta(this, '${grp}')"><span>${tit}</span><span class="alert-secao-count">${num}</span><span class="alert-secao-seta">${exp ? '▾' : '▸'}</span></div><div class="alert-secao-corpo" style="display:${exp ? 'block' : 'none'}">${html}</div></div>`; };
  const htmlAtrasados = listaAtrasados.map(item => item.html).join(''); const htmlPendentes = [...g.pendente.map(a => ({ c: CRITS[critDe('alerta', a)].n, html: montarCardAlerta(a) })), ...agsPendentes.map(ag => ({ c: CRITS[critDe('agend', ag)].n, html: montarCardAgPendente(ag) }))].sort((x, y) => x.c - y.c).map(x => x.html).join('');
  let mms = manutMotoristaPendentes(); if (termoLimpo) mms = mms.filter(x => (x.placa + ' ' + x.servico).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoLimpo));
  c.innerHTML = sec('aprovar', '🧾 Manutenções lançadas pelos motoristas', mms.map(montarCardManutMotorista).join(''), mms.length) +
    sec('ocorrencia', '📣 Ocorrências dos motoristas', ocs.map(o => montarCardOcorrencia(o, true)).join(''), ocs.length) + sec('atrasado', '🔴 Atrasado', htmlAtrasados, listaAtrasados.length) + sec('pendente', '🟡 Pendente', htmlPendentes, g.pendente.length + agsPendentes.length) + sec('andamento', '🟠 Em andamento', g.andamento.map(montarCardAlerta).join(''), g.andamento.length) + sec('resolvido', '🟢 Resolvido', [...g.resolvido.map(a => ({ d: String(a.dataResolucao || ''), html: montarCardAlerta(a) })), ...ocsRes.map(o => ({ d: String(o.resolvidoEm || o.dataAbertura || ''), html: montarCardOcorrencia(o, true) }))].sort((x, y) => y.d.slice(0, 10).localeCompare(x.d.slice(0, 10))).map(x => x.html).join(''), g.resolvido.length + ocsRes.length);
}

function filtrarHistorico() {
  const input = document.getElementById('filtroHistorico').value.toLowerCase(); const termo = input.normalize('NFD').replace(/[\u0300-\u036f]/g, ""); const linhas = document.querySelectorAll('#tabelaHistorico tbody tr');
  linhas.forEach(linha => { const textoLinha = linha.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""); linha.style.display = textoLinha.includes(termo) ? '' : 'none'; });
}


/* ================= DASHBOARD CICLOS / REPETIÇÃO ================= */
function renderDashboardCiclos() {
  const sel = document.getElementById('dashFiltroCiclo');
  if (!sel) return;

  const servicosSet = new Set();
  db.manutencoes.forEach(m => {
    if (m.descricao !== 'Registro de KM' && m.tipo !== 'abastecimento') {
      let nomeServico = m.tipo === 'outro' ? m.descricao : (TIPOS[m.tipo] || m.tipo);
      if (nomeServico) servicosSet.add(nomeServico);
    }
  });

  const servicosArray = Array.from(servicosSet).sort();
  const atual = sel.value;
  const resEl = document.getElementById('dashCiclosTabela');

  if (servicosArray.length === 0) {
    sel.innerHTML = '<option value="">Nenhum serviço registrado</option>';
    if (resEl) resEl.innerHTML = '<div class="empty" style="padding: 15px; font-size: 13px; color: var(--dim);">As médias de repetição aparecerão aqui assim que houver manutenções cadastradas.</div>';
    return;
  }

  sel.innerHTML = '<option value="">Selecione um serviço ou peça...</option>' + servicosArray.map(s => `<option value="${s}">${s}</option>`).join('');
  
  if ([...sel.options].some(o => o.value === atual)) {
    sel.value = atual;
  }

  if (sel.value && typeof calcularCicloServico === 'function') {
    calcularCicloServico(sel.value);
  } else if (resEl && !sel.value) {
    resEl.innerHTML = '<div class="empty" style="padding: 15px; font-size: 13px; color: var(--dim);">Selecione um item acima para ver o intervalo médio de troca por veículo.</div>';
  }
}

function calcularCicloServico(servicoNome) {
  const resEl = document.getElementById('dashCiclosTabela');
  if (!resEl || !servicoNome) return;

  const termoBusca = normPeca(servicoNome);
  const historico = db.manutencoes.filter(m => {
    let nomeServico = m.tipo === 'outro' ? m.descricao : (TIPOS[m.tipo] || m.tipo);
    return normPeca(nomeServico) === termoBusca;
  });

  if (historico.length === 0) {
    resEl.innerHTML = `<div class="empty" style="padding: 15px; font-size: 13px; color: var(--dim);">Nenhum registro encontrado para "${servicoNome}".</div>`;
    return;
  }

  const porVeiculo = {};
  historico.forEach(m => {
    if (!porVeiculo[m.placa]) porVeiculo[m.placa] = [];
    porVeiculo[m.placa].push(m);
  });

  let htmlResult = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">`;

  Object.keys(porVeiculo).sort().forEach(placa => {
    const manutencoesPlaca = porVeiculo[placa].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let somaKm = 0;
    let contagemIntervalos = 0;
    for (let i = 1; i < manutencoesPlaca.length; i++) {
      let diffKm = manutencoesPlaca[i].km - manutencoesPlaca[i-1].km;
      if (diffKm > 0) {
        somaKm += diffKm;
        contagemIntervalos++;
      }
    }

    let mediaKmPlaca = contagemIntervalos > 0 ? Math.round(somaKm / contagemIntervalos) : 0;

    htmlResult += `
      <div style="background: var(--surface-card, #f8fafc); padding: 12px 15px; border-radius: 6px; border: 1px solid var(--border, #e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="font-weight: 600; color: var(--primary); margin-bottom: 4px; font-size: 15px;">🚛 Placa: ${placa}</div>
          <div style="font-size: 13px; color: var(--text);">Média de Troca: <b>${mediaKmPlaca > 0 ? '~' + fmtKm(mediaKmPlaca) : 'Dados insuficientes para média'}</b></div>
        </div>
        <div style="font-size: 12px; color: var(--dim); text-align: right;">
          ${manutencoesPlaca.length} intervenção(ões) registrada(s)<br>
          Última em: ${fmtData(manutencoesPlaca[manutencoesPlaca.length - 1].data)} (${fmtKm(manutencoesPlaca[manutencoesPlaca.length - 1].km)})
        </div>
      </div>
    `;
  });

  htmlResult += `</div>`;
  resEl.innerHTML = htmlResult;
}


/* =======================================================
   FUNÇÃO DE IMPRESSÃO (Aviso de Serviço para Oficina)
   ======================================================= */
/* ---------- Ordem de Serviço: escolhe o que imprimir (interna ou externa) ---------- */
function osItens() {
  const itens = [], d = (typeof App !== 'undefined' && App.dados) || {}, mot = {}; (d.motoristas || []).forEach(m => { mot[m.id] = m.nome; });
  db.alertas.forEach(a => {
    if (a.status === 'resolvido' || a.tipo === 'Registro de KM' || ultimaManut(a.placa, a.tipo) === null) return;
    const v = db.veiculos.find(x => x.placa === a.placa), kmAtual = v ? v.kmAtual : 0, info = calcularLimite(a.placa, a.tipo);
    let ultima = 'Sem histórico', sit = '-';
    if (info && info.temUltima) {
      ultima = `${fmtData(info.ultima.data)} (aos ${fmtKm(info.ultima.km)})`;
      let txtKm = '', txtData = '';
      if (info.limiteKm !== null) { const f = info.limiteKm - kmAtual; txtKm = f >= 0 ? `Faltam ${fmtKm(f)}` : `Excedido há ${fmtKm(-f)}`; }
      if (info.limiteData !== null) { const dd = Math.round((new Date(info.limiteData + 'T00:00:00') - new Date(hojeISO() + 'T00:00:00')) / 864e5); txtData = dd >= 0 ? `Faltam ${dd} dias` : `Excedido há ${-dd} dias`; }
      sit = info.cfg.modo === 'km' ? txtKm : info.cfg.modo === 'meses' ? txtData : `${txtKm} | ${txtData}`;
    }
    itens.push({ id: 'al:' + a.id, kind: 'alerta', placa: a.placa, nome: nomeTipo(a.tipo), ultima, sit, detalhe: '', crit: critDe('alerta', a), classe: 'PREV', ref: 'alerta', refId: a.id });
  });
  db.agendamentos.forEach(ag => {
    if (db.alertas.some(a => a.placa === ag.placa && normPeca(a.tipo) === normPeca(ag.tipo === 'outro' ? ag.descricao : ag.tipo) && a.status !== 'resolvido')) return;
    const nome = (ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo), h0 = ultimaManut(ag.placa, ag.tipo === 'outro' ? ag.descricao : ag.tipo);
    itens.push({ id: 'ag:' + (ag.id || ag.placa + nome), kind: 'agend', placa: ag.placa, nome: nome + ' (agendado)', ultima: h0 ? `${fmtData(h0.data)} (aos ${fmtKm(h0.km)})` : 'Serviço avulso (sem histórico)', sit: ag.dataPrevista ? `Agendado para ${fmtData(ag.dataPrevista)}` : 'Agendamento pendente', detalhe: ag.descricao || '' , crit: critDe('agend', ag), classe: classeDe(ag), ref: 'agend', refId: ag.id });
  });
  (d.ocorrencias || []).filter(o => String(o.status || '').toUpperCase() === 'ABERTA').forEach(o => {
    itens.push({ id: 'oc:' + o.id, kind: 'ocorrencia', placa: o.placa, nome: 'Ocorrência: ' + (o.item || ''), ultima: '-', sit: (o.dataAbertura ? 'Relatada em ' + fmtData(String(o.dataAbertura).slice(0, 10)) : 'Relatada pelo motorista') + (/sim/i.test(o.restringeCirculacao || '') ? ' · restringe circulação' : ''), detalhe: (o.descricao || '') + (mot[o.motoristaId] ? ' (relato de ' + mot[o.motoristaId] + ')' : ''), alta: /alta/i.test(o.prioridade || '') , crit: critDe('ocorrencia', o), classe: critDe('ocorrencia', o) === 'P1' ? 'CORR-NP' : 'CORR-PL', ref: 'oc', refId: o.id });
  });
  // Ordem da OS: o caminhão com o item mais crítico primeiro; dentro dele, do mais crítico para o menos
  const pior = {}; itens.forEach(i => { const n = CRITS[i.crit].n; pior[i.placa] = Math.min(pior[i.placa] === undefined ? 9 : pior[i.placa], n); });
  return itens.sort((a, b) => (pior[a.placa] - pior[b.placa]) || a.placa.localeCompare(b.placa) || (CRITS[a.crit].n - CRITS[b.crit].n) || a.nome.localeCompare(b.nome));
}

function imprimirRelatorioMecanico() {
  const itens = osItens();
  if (!itens.length) { toast('Nenhum serviço vencido, agendado ou ocorrência aberta para imprimir.'); return; }
  const marcados = {}, cks = {}, tipo = { v: 'interna' };
  const prest = h('input', { type: 'text', placeholder: 'Ex.: Elétrica do Zé, Retífica Sul', maxlength: 80 });
  const obs = h('textarea', { rows: 2, placeholder: 'Opcional', maxlength: 400 });
  const extra = h('div', { class: 'os-externa', hidden: true }, h('label', {}, h('span', { text: 'Para onde vai' }), prest), h('label', {}, h('span', { text: 'Observações para quem vai executar' }), obs));
  const seg = h('div', { class: 'os-seg', role: 'radiogroup' });
  const opcao = (v, t, sub) => { const b = h('button', { type: 'button', class: 'os-seg-b' + (v === 'interna' ? ' on' : ''), role: 'radio', 'aria-checked': v === 'interna' ? 'true' : 'false' }, h('b', { text: t }), h('small', { text: sub }));
    b.onclick = () => { tipo.v = v; extra.hidden = v !== 'externa'; seg.querySelectorAll('.os-seg-b').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); }); }; return b; };
  seg.append(opcao('interna', 'OS interna', 'Nossa oficina'), opcao('externa', 'OS externa', 'Prestador de fora'));
  const cont = h('span', { class: 'os-cont' }), lista = h('div', { class: 'os-lista' }), imp = h('button', { class: 'btn', type: 'button', text: 'Abrir OS e imprimir' });
  const tudoPl = {};
  const att = () => {
    const n = itens.filter(i => marcados[i.id]).length; cont.textContent = n ? n + ' de ' + itens.length + ' selecionado' + (n > 1 ? 's' : '') : 'Nada selecionado'; imp.disabled = !n;
    Object.keys(tudoPl).forEach(pl => { const d = itens.filter(i => i.placa === pl), k = d.filter(i => marcados[i.id]).length; tudoPl[pl].checked = k === d.length; tudoPl[pl].indeterminate = k > 0 && k < d.length; });
  };
  const marcar = (lst, v) => { lst.forEach(i => { marcados[i.id] = v; cks[i.id].checked = v; }); att(); };
  const naOS = i => i.ref ? osDoItem(i.ref, i.refId) : null;
  Array.from(new Set(itens.map(i => i.placa))).forEach(pl => {
    const doVeic = itens.filter(i => i.placa === pl), tudo = h('input', { type: 'checkbox', 'aria-label': 'Marcar tudo de ' + pl }); tudoPl[pl] = tudo;
    tudo.onchange = () => marcar(doVeic, tudo.checked);
    const grupo = h('div', { class: 'os-grupo' }, h('label', { class: 'os-placa' }, tudo, h('b', { text: pl }), h('span', { text: doVeic.length + (doVeic.length > 1 ? ' itens' : ' item') })));
    doVeic.forEach(i => { const c = h('input', { type: 'checkbox' }); cks[i.id] = c; c.onchange = () => { marcados[i.id] = c.checked; att(); };
      grupo.append(h('label', { class: 'os-item' }, c, h('span', { class: 'os-tx' }, h('b', { text: i.nome }), h('small', { text: i.sit + (i.detalhe ? ' — ' + i.detalhe : '') })), h('span', { class: 'crit-chip ' + CRITS[i.crit].cls, text: CRITS[i.crit].ic + ' ' + i.crit }), naOS(i) ? h('span', { class: 'tag-os', text: '🧾 ' + naOS(i).numero }) : null, i.crit === 'P4' && doVeic.some(x => x.crit !== 'P4') ? h('span', { class: 'tag-oport', text: '♻️ aproveitar' }) : null)); });
    lista.append(grupo);
  });
  const barra = h('div', { class: 'os-barra' }, h('button', { class: 'btn small secondary', type: 'button', text: 'Marcar tudo', onclick: () => marcar(itens, true) }), h('button', { class: 'btn small secondary', type: 'button', text: 'Limpar', onclick: () => marcar(itens, false) }));
  imp.onclick = async () => {
    const escolhidos = itens.filter(i => marcados[i.id]); if (!escolhidos.length) return;
    const w = window.open('', '_blank', 'width=800,height=600'); if (!w) return toast('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', true);
    w.document.write('<p style="font-family:Arial;padding:30px">Abrindo as ordens de serviço…</p>'); imp.disabled = true;
    let nums = {}; try { nums = await osGerarDosItens(escolhidos, tipo.v, prest.value.trim(), obs.value.trim()); } catch (e) { w.close(); imp.disabled = false; return toast(e.message, true); }
    imprimirOS(escolhidos, tipo.v, prest.value.trim(), obs.value.trim(), nums, w); m.fechar();
    const n = Object.keys(nums).length; toast(n ? n + ' ordem(ns) de serviço aberta(s). Acompanhe em Manutenção › OS.' : 'Impresso (os itens já estavam numa OS aberta).'); renderTelaAtual();
  };
  const soImp = h('button', { class: 'btn secondary', type: 'button', text: 'Só imprimir', title: 'Imprime sem abrir OS no sistema', onclick: () => { const escolhidos = itens.filter(i => marcados[i.id]); if (!escolhidos.length) return; imprimirOS(escolhidos, tipo.v, prest.value.trim(), obs.value.trim()); m.fechar(); } });
  const cx = h('div', { class: 'os-sel' }, seg, extra, barra, lista, h('div', { class: 'os-rodape' }, cont, h('span', { class: 'os-rod-bt' }, soImp, imp)));
  const m = abrirModal('Ordem de serviço', cx, { largo: true }); att();
}

function imprimirOS(itens, tipo, prestador, obs, nums, janela) {
  nums = nums || {};
  const esc = escHtml, hoje = new Date().toLocaleDateString('pt-BR'), externa = tipo === 'externa';
  const css = `body{font-family:Arial,sans-serif;padding:20px;color:#000}h1{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;text-transform:uppercase;font-size:22px}
  .emissao{text-align:right;margin-bottom:16px;font-size:13px;color:#333}.item{border:2px solid #000;margin-bottom:16px;padding:14px;border-radius:8px;page-break-inside:avoid}
  .placa{font-size:24px;font-weight:bold;margin-bottom:8px}.servico{font-size:20px;margin-bottom:10px;display:flex;align-items:center;gap:10px}.cb{width:28px;height:28px;border:3px solid #000;border-radius:4px;display:inline-block;flex:0 0 auto}
  .info{margin-top:10px;border-top:1px dashed #666;padding-top:10px;font-size:16px;line-height:1.6}.lb{color:#555}.vl{font-weight:bold}
  .veiculo{border:2px solid #000;border-radius:8px;padding:12px;margin-bottom:14px;font-size:16px;line-height:1.6}.pagina{page-break-after:always}.pagina:last-child{page-break-after:auto}
  .linha{border-bottom:1px solid #000;display:inline-block;min-width:160px}.campos{display:flex;gap:30px;margin:14px 0;font-size:15px}.ass{display:flex;gap:40px;margin-top:50px;text-align:center;font-size:14px;font-weight:bold}.ass div{flex:1;border-top:2px solid #000;padding-top:4px}
  .def{font-size:16px;line-height:1.5;margin:4px 0}.obs{border:1px solid #666;border-radius:6px;padding:8px;margin:10px 0;font-size:15px}
  .placa small{font-size:15px;font-weight:normal;color:#333}.serv{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px dashed #999}.serv:first-of-type{border-top:0}.serv .cb{margin-top:2px}
  .serv-tx{flex:1}.serv-nome{font-size:18px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.serv .info{margin-top:4px;border:0;padding:0;font-size:14px;line-height:1.5}
  .crit{display:inline-block;font-size:12px;font-weight:bold;border:2px solid #000;border-radius:4px;padding:1px 6px;letter-spacing:.03em}.crit.p1{background:#000;color:#fff}.crit.p2{border-style:solid}.crit.p3{border-style:dashed}.crit.p4{border-style:dotted;color:#444}
  .cls{font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.04em}.osn{display:inline-block;border:2px solid #000;border-radius:4px;padding:0 6px;font-size:16px;margin-right:4px}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media print{@page{margin:1cm}}`;
  let corpo = '';
  const critTxt = i => `<span class="crit ${CRITS[i.crit].cls}">${i.crit} · ${CRITS[i.crit].c.toUpperCase()}</span> <span class="cls">${esc(i.classe || '')}${i.classe ? ' · ' + esc(CLASSE_CURTA[i.classe] || '') : ''}</span>`;
  const placas = Array.from(new Set(itens.map(i => i.placa)));          // já vêm na ordem de criticidade (osItens)
  if (!externa) {
    // um bloco por caminhão, com todos os serviços dele juntos, do mais crítico para o menos
    corpo = `<h1>🔧 Ordem de Serviço - Oficina</h1><div class="emissao">Impresso em: ${hoje} · ${itens.length} serviço(s) em ${placas.length} caminhão(ões) · ordem: o mais crítico primeiro</div>` + placas.map(pl => {
      const v = db.veiculos.find(x => x.placa === pl) || {}, doVeic = itens.filter(i => i.placa === pl), parado = statusVeiculoOp(pl).st === 'BLOQUEADO';
      return `<div class="item"><div class="placa">${nums[pl] ? '<span class="osn">' + esc(nums[pl]) + '</span> ' : ''}🚛 ${esc(pl)}${v.modelo ? ' <small>· ' + esc(v.modelo) + '</small>' : ''} <small>· Km ${fmtKm(v.kmAtual || 0)}</small>${parado ? ' <span class="crit p1">🔴 BLOQUEADO</span>' : ''}</div>
        ${doVeic.map(i => `<div class="serv"><div class="cb"></div><div class="serv-tx"><div class="serv-nome"><strong>${esc(i.nome.toUpperCase())}</strong> ${critTxt(i)}</div>
          <div class="info">${i.detalhe ? `<span class="lb">Relato:</span> <span class="vl">${esc(i.detalhe)}</span><br>` : ''}${i.ultima && i.ultima !== '-' ? `<span class="lb">Última troca:</span> <span class="vl">${esc(i.ultima)}</span><br>` : ''}<span class="lb">Situação:</span> <span class="vl">${esc(i.sit)}</span></div></div></div>`).join('')}
        <div class="campos"><span>Mecânico: <span class="linha"></span></span><span>Concluído em: ___/___/______</span></div></div>`;
    }).join('') + `<div class="ass"><div>Visto da Oficina</div><div>Gestão</div></div>`;
  } else {
    corpo = placas.map(pl => {
      const v = db.veiculos.find(x => x.placa === pl) || {}, doVeic = itens.filter(i => i.placa === pl);
      return `<div class="pagina"><h1>Ordem de Serviço Externa${nums[pl] ? ' · ' + esc(nums[pl]) : ''}</h1><div class="emissao">Emitida em: ${hoje} · Transmarina</div>
        <div class="veiculo"><b>Veículo:</b> ${esc(pl)}${v.modelo ? ' · ' + esc(v.modelo) : ''}${v.ano ? ' · ' + esc(String(v.ano)) : ''}<br><b>Km atual:</b> ${fmtKm(v.kmAtual || 0)}<br><b>Prestador / local:</b> ${prestador ? esc(prestador) : '<span class="linha"></span>'}</div>
        <div style="font-size:18px;font-weight:bold;margin-bottom:6px">O que precisa ser feito</div>
        ${doVeic.map(i => `<div class="item"><div class="servico"><div class="cb"></div><strong>${esc(i.nome)}</strong> ${critTxt(i)}</div><div class="def">${i.detalhe ? `<b>Defeito / relato:</b> ${esc(i.detalhe)}<br>` : ''}<b>Situação:</b> ${esc(i.sit)}${i.ultima && i.ultima !== '-' ? `<br><b>Última vez feito:</b> ${esc(i.ultima)}` : ''}</div></div>`).join('')}
        ${obs ? `<div class="obs"><b>Observações:</b> ${esc(obs)}</div>` : ''}
        <div class="campos"><span>Orçamento: R$ <span class="linha"></span></span><span>Prazo: <span class="linha"></span></span></div>
        <div class="campos"><span>Entrada: ___/___/______</span><span>Saída: ___/___/______</span><span>Km: <span class="linha" style="min-width:90px"></span></span></div>
        <div class="obs" style="min-height:70px"><b>Serviço realizado / peças trocadas:</b></div>
        <div class="ass"><div>Responsável Transmarina</div><div>Prestador</div></div></div>`;
    }).join('');
  }
  const w = janela || window.open('', '_blank', 'width=800,height=600'); if (!w) { toast('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', true); return; }
  w.document.open(); w.document.write(`<html><head><title>${externa ? 'OS Externa' : 'Ordem de Manutenção'}</title><style>${css}</style></head><body>${corpo}</body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}

function notificarNovosAlertas() {}  // o Hub mostra os alertas na tela Início (sem pop-up)