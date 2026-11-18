/* GF portado para o Hub Transmarina. Origem: script.js do GF. Removidos: login, cadastro, aprovações, avatar, notificações em pop-up.
   A comunicação agora passa por API.chamar (token de sessão) e o perfil/nome vêm de GF.perfil()/GF.nome(). */
/* ================= ESTADO E CACHE ================= */
let db = { veiculos: [], manutencoes: [], limites: {}, alertas: [], agendamentos: [], pendentes: [], pneus: [], movPneus: [] };
let carregando = false;

const TIPOS = { oleo: 'Troca de óleo do motor', alinhamento: 'Alinhamento', oleo_caixa: 'Troca de óleo da caixa', oleo_diferencial: 'Troca de óleo do diferencial' };
const TIPOS_RASTREADOS = ['oleo', 'alinhamento', 'oleo_caixa', 'oleo_diferencial'];
const LIMITES_PADRAO = { oleo: { modo: 'km_e_meses', km: 15000, meses: 12 }, alinhamento: { modo: 'km_e_meses', km: 20000, meses: 6 }, oleo_caixa: { modo: 'km_e_meses', km: 100000, meses: 24 }, oleo_diferencial: { modo: 'km_e_meses', km: 100000, meses: 24 } };
const LABEL_ULTIMA = { oleo: 'Último óleo do motor', alinhamento: 'Último alinhamento', oleo_caixa: 'Último óleo da caixa', oleo_diferencial: 'Último óleo do diferencial' };
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
    statusVeiculo: v.statusVeiculo || '', capacidadeDiesel: Number(v.capacidadeDiesel) || 0, capacidadeArla: Number(v.capacidadeArla) || 0 }));
  // Abastecimentos de fatura/lançamento da gestão entram como "manutenção" do tipo abastecimento (é o formato que o Dashboard e o histórico do GF leem).
  const abast = (raw.abastecimentos || []).filter(a => a.origem !== 'motorista' && a.status !== 'expirado' && a.placa).map(a => {
    const l = Number(a.litros) || 0, vu = Number(a.valorUnit) || 0;
    return { id: String(a.id), placa: a.placa, tipo: 'abastecimento', descricao: a.produto || 'Diesel S10', km: a.km, data: a.data, valor: a.valor,
      observacao: 'Qtd: ' + l.toFixed(2) + ' L | R$ ' + vu.toFixed(3) + '/L', nome: a.usuario || '', _abs: true, _litros: l, _hora: a.hora || '' };
  });
  const manutencoes = (raw.manutencoes || []).concat(abast).map(m => ({ _abs: m._abs, _litros: m._litros, _hora: m._hora,
    id: String(m.id), placa: String(m.placa).trim().toUpperCase(), tipo: String(m.tipo || '').trim().toLowerCase(),
    descricao: String(m.descricao || m['descrição'] || m['Descricao'] || m['Descrição'] || m['descriçao'] || m['Descriçao'] || '').trim(),
    km: Number(m.km) || 0, data: formatarDataPlanilhaParaISO(m.data), valor: Number(m.valor) || 0, observacao: m.observacao || '', nome: m.nome || m['Nome'] || m.responsavel || '' 
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
    notificadosLista: String(a.notificado || a['Notificado'] || '').toLowerCase()
  }));
  
  const agendamentos = (raw.agendamentos || []).map(a => ({
    id: String(a.id), placa: String(a.placa).trim().toUpperCase(), tipo: String(a.tipo || '').trim(),
    descricao: a.descricao || a['descrição'] || a['Descricao'] || a['Descrição'] || a['descriçao'] || a['Descriçao'] || '',
    dataPrevista: a.dataPrevista ? formatarDataPlanilhaParaISO(a.dataPrevista) : '', valor: Number(a.valor) || 0, observacao: a.observacao || '', criadoEm: a.criadoEm ? formatarDataPlanilhaParaISO(a.criadoEm) : '', nome: a.nome || a['Nome'] || a.responsavel || ''
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
  
  if (novoKm < kmAnterior && dataReferencia === hojeISO()) {
     if (isCorrecaoManual) {
         return { alerta: true, msg: `⚠️ CORREÇÃO DE KM\n\nO valor digitado (${fmtKm(novoKm)}) é MENOR que o último KM do painel (${fmtKm(kmAnterior)}).\n\nTem certeza que deseja abaixar o KM do veículo no sistema?` };
     } else {
         return { erro: true, msg: `Bloqueio Retroativo:\nO KM não pode ser menor que o do painel atual (${fmtKm(kmAnterior)}).\n\nSe você digitou errado no passado, use o botão "Atualizar KM" lá no topo do painel do veículo para forçar a correção do erro.` };
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
    return `<div class="placa-veiculo ${classePlaca}" onclick="selecionarVeiculo('${v.placa}')"><div class="placa-status-dot" style="background:${cor}"></div><div class="placa-topo">${nomeTopo}</div><div class="placa-numero">${v.placa}</div></div>`;
  }).join('');
  
  wrap.innerHTML = htmlBotaoAdd + htmlVeiculos;
}

function selecionarVeiculo(placa) { veiculoSel = placa; document.getElementById('manutListaWrap').style.display = 'none'; document.getElementById('manutDetalheWrap').style.display = 'block'; renderDetalhe(); }

function ultimaManut(placa, tipo) { return db.manutencoes.filter(m => m.placa === placa && m.tipo === tipo && m.descricao !== 'Registro de KM').sort((a, b) => new Date(b.data) - new Date(a.data))[0] || null; }
function calcularLimite(placa, tipo) {
  garantirLimites(placa); const cfg = db.limites[placa][tipo]; if (!cfg) return null;
  const ult = ultimaManut(placa, tipo); if (!ult) return { temUltima: false, cfg };
  return { temUltima: true, ultima: ult, limiteKm: cfg.modo !== 'meses' ? ult.km + Number(cfg.km) : null, limiteData: cfg.modo !== 'km' ? addMeses(ult.data, Number(cfg.meses)) : null, cfg };
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
      ...alsV.map(a => { const g = grupoAlerta(a); return { o: ordem[g], html: montarCardAlerta(a) }; }),
      ...agsV.map(ag => { const atras = ag.dataPrevista && ag.dataPrevista < hojeL; return { o: atras ? 0 : 2, html: atras ? montarCardAgAtrasado(ag) : montarCardAgPendente(ag) }; })
    ].sort((x, y) => x.o - y.o);
    htmlPendencias = `<div class="pend-grid"><div class="card"><h2>⚠️ O que precisa ser feito neste caminhão</h2>${itens.length ? itens.map(i => i.html).join('') : '<p class="empty" style="padding:12px;">Nada pendente neste caminhão. ✅</p>'}</div>${montarCardOcorrencias(placa)}</div>`;
  }

  // Monta as linhas do histórico exibindo o KM normalmente (ou 0 km)
  const linhasHistoricoHtml = msUi.map(m => {
    const colKm = '<div style="font-size: 10px; color: var(--dim); text-transform: uppercase;">Apurado com</div><div style="font-weight: 600;">' + fmtKm(m.km) + '</div>';
    const btnExcluir = isAdmin ? `<button class="btn danger small" onclick="excluirManutencao('${m.id}')">Excluir</button>` : '';
    return `<tr title="👤 Última alteração: ${m.nome || 'Não identificado'}"><td>${nomeManutencao(m)}</td><td>${fmtData(m.data)}</td><td>${colKm}</td><td>${fmtMoeda(m.valor)}</td><td>${m.observacao || '-'}</td><td><button class="btn secondary small" onclick="editarManutencao('${m.id}')">Editar</button> ${btnExcluir}</td></tr>`;
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
        <div style="display:flex; gap:8px;">
          ${isAdmin ? `<button class="btn secondary" onclick="abrirModalKm('${placa}')">Atualizar KM</button>
                       <button class="btn danger" onclick="excluirVeiculo('${placa}')">Excluir Caminhão</button>` : ''}
          <button class="btn" onclick="abrirModalManut('${placa}')">Marcar manutenção</button>
        </div>
      </div>
    </div>
    ${htmlPendencias}
    ${isAdmin ? montarCardOcorrencias(placa, true) : ''}
    ${isAdmin ? `<div class="grid-cards"><div class="kpi"><div class="label">Total gasto</div><div class="value">${fmtMoeda(total)}</div></div><div class="kpi"><div class="label">Nº manutenções</div><div class="value">${msReais.length}</div></div>${cardsTipos}</div>` : ''}
    ${isAdmin ? `<div class="card"><h2>Configuração de alertas</h2><div class="alert-config-container">${TIPOS_RASTREADOS.map(tipo => `<div class="limitbox"><div style="font-weight:bold;margin-bottom:8px;">${TIPOS[tipo]}</div><div class="row"><div class="field"><label>Critério</label><select onchange="atualizarCfg('${placa}','${tipo}','modo',this.value)"><option value="km" ${cfg[tipo].modo === 'km' ? 'selected' : ''}>Somente km</option><option value="meses" ${cfg[tipo].modo === 'meses' ? 'selected' : ''}>Somente meses</option><option value="km_e_meses" ${cfg[tipo].modo === 'km_e_meses' ? 'selected' : ''}>O que vencer primeiro</option></select></div></div><div class="row" style="margin-top:8px;"><div class="field"><label>A cada (km)</label><input type="number" min="0" value="${cfg[tipo].km}" onchange="atualizarCfg('${placa}','${tipo}','km',this.value)"></div><div class="field"><label>A cada (meses)</label><input type="number" min="0" value="${cfg[tipo].meses}" onchange="atualizarCfg('${placa}','${tipo}','meses',this.value)"></div></div><div style="margin-top:8px;font-size:12px;color:var(--dim);">Próximo: <b style="color:var(--text)">${proximoLimiteTexto(tipo)}</b></div></div>`).join('')}</div></div>` : ''}
    
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
    ${(isAdmin && agends.length) ? `<div class="card"><h2>Agendadas</h2><div class="tabela-responsiva"><table><thead><tr><th>Tipo</th><th>Previsão</th><th>Valor</th><th>Obs</th><th>Ações</th></tr></thead><tbody>${agends.map(g => `<tr title="👤 Registrado por: ${g.nome || 'Não identificado'}"><td>${nomeManutencao(g)}</td><td>${g.dataPrevista ? fmtData(g.dataPrevista) : '-'}</td><td>${g.valor ? fmtMoeda(g.valor) : '-'}</td><td>${g.observacao || '-'}</td><td><button class="btn success small" onclick="resolverAgendamento('${g.id}')">Resolvido</button> <button class="btn secondary small" onclick="editarAgendamento('${g.id}')">Editar</button> ${isAdmin ? `<button class="btn danger small" onclick="cancelarAgendamento('${g.id}')">Cancelar</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
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

function onModoChange() { const ag = document.getElementById('mModo').value === 'agendar'; document.getElementById('mDataRealizadaWrap').style.display = ag ? 'none' : 'block'; document.getElementById('mDataPrevistaWrap').style.display = ag ? 'block' : 'none'; }

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
  onModoChange(); const infoEdicao = document.getElementById('infoEdicao'); infoEdicao.textContent = manut ? ("👤 Última alteração: " + (manut.nome || "Não identificado")) : ("👤 Lançando como: " + (GF.nome())); openModal('modalManut');
}

async function salvarManutencao() {
  const modo = document.getElementById('mModo').value; const textoTipo = document.getElementById('mTipoInput').value.trim(); const kmInput = document.getElementById('mKm').value.trim(); const data = document.getElementById('mData').value; const dataPrevista = document.getElementById('mDataPrevista').value; 
  const valor = parseNumeroBR(document.getElementById('mValor').value) || 0; 
  const observacao = document.getElementById('mObs').value.trim();
  
  if (!textoTipo) return toast('Informe qual manutenção será feita.', true);
  
  const editando = !!manutEditId;
  const manutOriginal = editando ? db.manutencoes.find(m => m.id === manutEditId) : null;

  const txtMin = textoTipo.toLowerCase(); let tipoFinal = 'outro'; let descricaoFinal = textoTipo;
  
  // Preserva o tipo 'abastecimento' se já era abastecimento ou se for combustível/Arla
  if ((manutOriginal && manutOriginal.tipo === 'abastecimento') || txtMin.includes('diesel') || txtMin.includes('arla') || txtMin === 'abastecimento') {
    tipoFinal = 'abastecimento';
    descricaoFinal = textoTipo;
  } else if (txtMin === 'alinhamento') {
    tipoFinal = 'alinhamento'; descricaoFinal = '';
  } else if (txtMin === 'oleo' || txtMin === 'óleo' || txtMin === 'troca de oleo' || txtMin === 'troca de óleo') {
    return toast('⚠️ Especifique o óleo: Motor, Caixa, Diferencial, Freio ou Embreagem?', true);
  } else if (txtMin.includes('oleo') || txtMin.includes('óleo') || txtMin.includes('fluido') || txtMin.includes('fluído')) {
    
    // 1º: Intercepta freio e embreagem ANTES de ler a palavra motor
    if (txtMin.includes('freio')) { tipoFinal = 'outro'; descricaoFinal = 'Troca de óleo do freio'; }
    else if (txtMin.includes('embreagem')) { tipoFinal = 'outro'; descricaoFinal = 'Troca de fluido da embreagem'; }
    else if (txtMin.includes('direção') || txtMin.includes('direcao')) { tipoFinal = 'outro'; descricaoFinal = 'Troca de óleo da direção'; }
    
    // 2º: Se não for os de cima, verifica as caixas padrão
    else if (txtMin.includes('caixa')) { tipoFinal = 'oleo_caixa'; descricaoFinal = ''; }
    else if (txtMin.includes('diferencial')) { tipoFinal = 'oleo_diferencial'; descricaoFinal = ''; }
    else if (txtMin.includes('motor')) { tipoFinal = 'oleo'; descricaoFinal = ''; }
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
  if (v && km > v.kmAtual) v.kmAtual = km; 

  const nomeUsuario = (GF.nome()) + " (em " + dataHoraAtual() + ")";
  
  if (modo === 'agendar') {
    const agOriginal = editando ? db.agendamentos.find(a => a.id === manutEditId) : null;
    const ag = { id: editando ? manutEditId : gerarId(), placa, tipo: tipoFinal, descricao: descricaoFinal, dataPrevista, valor, observacao, criadoEm: agOriginal ? agOriginal.criadoEm : hojeISO(), nome: nomeUsuario };
    if (editando) { const idx = db.agendamentos.findIndex(a => a.id === manutEditId); if (idx >= 0) db.agendamentos[idx] = ag; } else { db.agendamentos.push(ag); }
    salvarCache(); renderTelaAtual(); toast(editando ? 'Agendamento atualizado...' : 'Agendamento salvo...');
    execBackground(async () => { try { await apiPost(editando ? 'updateAgendamento' : 'addAgendamento', ag); } catch(e) { if(editando){ await apiPost('deleteAgendamento', { id: ag.id }); await apiPost('addAgendamento', ag); } else throw e; } }, 'Erro agendamento');
    if (kmInput !== '' && km > 0) { execBackground(async () => { await apiPost('updateKmVeiculo', { placa, kmAtual: km }); }, 'Erro KM'); } return;
  }

  const registro = { id: editando ? manutEditId : gerarId(), placa, tipo: tipoFinal, descricao: descricaoFinal, km, data, valor, observacao, nome: nomeUsuario };
  
  const agCumpridos = db.agendamentos.filter(a => a.placa === placa && normPeca(a.tipo === 'outro' ? a.descricao : a.tipo) === normPeca(tipoFinal === 'outro' ? descricaoFinal : tipoFinal));
  
  if (editando) { const idx = db.manutencoes.findIndex(m => m.id === manutEditId); if (idx >= 0) db.manutencoes[idx] = registro; } else { db.manutencoes.push(registro); }
  db.agendamentos = db.agendamentos.filter(a => !agCumpridos.includes(a));
  
  let alertaAtivo = db.alertas.find(a => a.placa === placa && normPeca(a.tipo) === normPeca(tipoFinal === 'outro' ? descricaoFinal : tipoFinal) && a.status !== 'resolvido');
  if (alertaAtivo) db.alertas = db.alertas.filter(x => x.id !== alertaAtivo.id);
  
  salvarCache(); renderDetalhe(); sincronizarAlertas(false); toast('Manutenção salva...');
  execBackground(async () => {
    await apiPost(editando ? 'updateManutencao' : 'addManutencao', registro);
    for (const ag of agCumpridos) await apiPost('deleteAgendamento', { id: ag.id });
    if (alertaAtivo) await apiPost('deleteAlerta', { id: alertaAtivo.id });
    if (v && km > v.kmAtual) await apiPost('updateKmVeiculo', { placa, kmAtual: km });
    sincronizarAlertas(true);
  }, 'Erro manutenção');
}


async function resolverAgendamento(id) {
  const ag = db.agendamentos.find(a => a.id === id); if (!ag) return;
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
  const d = App.dados, o = (d.ocorrencias || []).find(x => x.id === id); if (!o) return;
  o.status = 'RESOLVIDA'; renderTelaAtual();
  execBackground(async () => { await apiPost('resolverOcorrencia', { id }); if (typeof App !== 'undefined' && App.recarregar) App.recarregar(true); }, 'Não foi possível marcar a ocorrência como resolvida');
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
const estadoAccordions = { ocorrencia: true, atrasado: true, pendente: true, andamento: true, resolvido: false };
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
function dicaAgendamento(ag, rot) { return `👤 ${rot} — agendado por: ${ag.nome || 'Não identificado'}`; }
/** Ocorrências abertas pelos motoristas (checklist) para este caminhão, no mesmo estilo dos cards de alerta. */
/* Ocorrências dos motoristas (checklist aprovado ou defeito relatado) que estão pendentes: entram no GF como pendência. */
function ocorrenciasAbertas() { const d = (typeof App !== 'undefined' && App.dados) || {}; return (d.ocorrencias || []).filter(o => String(o.status || '').toUpperCase() === 'ABERTA'); }
function ocorrenciaGrave(o) { return /alta|grave|urgente/i.test(o.prioridade || '') || /sim/i.test(o.restringeCirculacao || ''); }
function montarCardOcorrencia(o, comPlaca) {
  const d = (typeof App !== 'undefined' && App.dados) || {}, m = (d.motoristas || []).find(x => x.id === o.motoristaId);
  const origem = o.origem === 'relato' ? 'defeito relatado' : 'checklist';
  return `<div class="alert-card ${ocorrenciaGrave(o) ? 'atrasado' : 'pendente'} oc-gf"><div class="alert-info"><div class="alert-title">${comPlaca ? `<span class="oc-placa" title="Abrir o caminhão" onclick="irParaVeiculo('${escAttr(o.placa)}')">${escHtml(o.placa)}</span> ` : ''}${escHtml(o.item || 'Ocorrência')}${/sim/i.test(o.restringeCirculacao || '') ? ' · 🚫 caminhão parado' : ''}</div>
    <div class="alert-sub">${escHtml(o.descricao || '-')}</div><div class="alert-sub">${o.dataAbertura ? fmtData(String(o.dataAbertura).slice(0, 10)) : ''} · ${escHtml(m ? m.nome : 'Motorista')} · ${origem}</div></div>
    <div class="alert-actions"><button class="btn small" onclick="resolverOcorrenciaGF('${escAttr(o.id)}')">Resolvido</button></div></div>`;
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
  return `<div class="alert-card ${grp}" title="${escAttr(dicaAlerta(a, grp))}"><div class="alert-info"><div class="alert-title">${a.placa} — ${nomeTipo(a.tipo)}</div><div class="alert-sub">Km: ${km}</div></div><div class="alert-actions">${btn}</div></div>`;
}

function montarCardAgAtrasado(ag) { 
    return `<div class="alert-card atrasado" title="${escAttr(dicaAgendamento(ag, 'Atrasado'))}"><div class="alert-info"><div class="alert-title">${ag.placa} — ${(ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo)}</div><div class="alert-sub" style="color:var(--danger); font-weight:bold;">⚠️ Atrasado: ${ag.dataPrevista ? fmtData(ag.dataPrevista) : '-'}</div></div><div class="alert-actions"><button class="btn small secondary" onclick="iniciarAnaliseAgendamento('${ag.id}')">Em andamento</button><button class="btn small" onclick="resolverAgendamento('${ag.id}')">Resolvido</button><button class="btn small secondary" onclick="editarAgendamento('${ag.id}')">Editar</button></div></div>`; 
}

function montarCardAgPendente(ag) { 
    return `<div class="alert-card pendente" title="${escAttr(dicaAgendamento(ag, 'Pendente'))}"><div class="alert-info"><div class="alert-title">${ag.placa} — ${(ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo)}</div><div class="alert-sub">Agendado para: ${ag.dataPrevista ? fmtData(ag.dataPrevista) : '-'}</div></div><div class="alert-actions"><button class="btn small secondary" onclick="iniciarAnaliseAgendamento('${ag.id}')">Em andamento</button><button class="btn small" onclick="resolverAgendamento('${ag.id}')">Resolvido</button><button class="btn small secondary" onclick="editarAgendamento('${ag.id}')">Editar</button></div></div>`; 
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

  let ocs = ocorrenciasAbertas();
  if (termoLimpo) ocs = ocs.filter(o => (o.placa + ' ' + o.item + ' ' + o.descricao).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoLimpo));
  ocs.sort((a, b) => (ocorrenciaGrave(b) - ocorrenciaGrave(a)) || String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
  if (baseAlertas.length === 0 && baseAgs.length === 0 && g.resolvido.length === 0 && !ocs.length) { c.innerHTML = '<p class="empty">Nenhum alerta encontrado. ✅</p>'; return; }

  const hoje = hojeLocal(); const agsAtrasados = baseAgs.filter(ag => ag.dataPrevista && ag.dataPrevista < hoje); const agsPendentes = baseAgs.filter(ag => !(ag.dataPrevista && ag.dataPrevista < hoje));
  const listaAtrasados = [ ...g.atrasado.map(a => ({ html: montarCardAlerta(a), ts: dataCriacaoAlertaTs(a) })), ...agsAtrasados.map(ag => ({ html: montarCardAgAtrasado(ag), ts: new Date(ag.dataPrevista + 'T00:00:00').getTime() })) ];
  listaAtrasados.sort((a, b) => a.ts - b.ts);
  
  const sec = (grp, tit, html, num) => { if(num === 0) return ''; const exp = estadoAccordions[grp]; return `<div class="alert-secao ${grp}"><div class="alert-secao-header" onclick="toggleSecaoAlerta(this, '${grp}')"><span>${tit}</span><span class="alert-secao-count">${num}</span><span class="alert-secao-seta">${exp ? '▾' : '▸'}</span></div><div class="alert-secao-corpo" style="display:${exp ? 'block' : 'none'}">${html}</div></div>`; };
  const htmlAtrasados = listaAtrasados.map(item => item.html).join(''); const htmlPendentes = g.pendente.map(montarCardAlerta).join('') + agsPendentes.map(montarCardAgPendente).join('');
  c.innerHTML = sec('ocorrencia', '📣 Ocorrências dos motoristas', ocs.map(o => montarCardOcorrencia(o, true)).join(''), ocs.length) + sec('atrasado', '🔴 Atrasado', htmlAtrasados, listaAtrasados.length) + sec('pendente', '🟡 Pendente', htmlPendentes, g.pendente.length + agsPendentes.length) + sec('andamento', '🟠 Em andamento', g.andamento.map(montarCardAlerta).join(''), g.andamento.length) + sec('resolvido', '🟢 Resolvido', g.resolvido.map(montarCardAlerta).join(''), g.resolvido.length);
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
    itens.push({ id: 'al:' + a.id, kind: 'alerta', placa: a.placa, nome: nomeTipo(a.tipo), ultima, sit, detalhe: '' });
  });
  db.agendamentos.forEach(ag => {
    if (db.alertas.some(a => a.placa === ag.placa && normPeca(a.tipo) === normPeca(ag.tipo === 'outro' ? ag.descricao : ag.tipo) && a.status !== 'resolvido')) return;
    const nome = (ag.tipo === 'outro' && ag.descricao) ? ag.descricao : nomeTipo(ag.tipo), h0 = ultimaManut(ag.placa, ag.tipo === 'outro' ? ag.descricao : ag.tipo);
    itens.push({ id: 'ag:' + (ag.id || ag.placa + nome), kind: 'agend', placa: ag.placa, nome: nome + ' (agendado)', ultima: h0 ? `${fmtData(h0.data)} (aos ${fmtKm(h0.km)})` : 'Serviço avulso (sem histórico)', sit: ag.dataPrevista ? `Agendado para ${fmtData(ag.dataPrevista)}` : 'Agendamento pendente', detalhe: ag.descricao || '' });
  });
  (d.ocorrencias || []).filter(o => String(o.status || '').toUpperCase() === 'ABERTA').forEach(o => {
    itens.push({ id: 'oc:' + o.id, kind: 'ocorrencia', placa: o.placa, nome: 'Ocorrência: ' + (o.item || ''), ultima: '-', sit: (o.dataAbertura ? 'Relatada em ' + fmtData(String(o.dataAbertura).slice(0, 10)) : 'Relatada pelo motorista') + (/sim/i.test(o.restringeCirculacao || '') ? ' · restringe circulação' : ''), detalhe: (o.descricao || '') + (mot[o.motoristaId] ? ' (relato de ' + mot[o.motoristaId] + ')' : ''), alta: /alta/i.test(o.prioridade || '') });
  });
  return itens.sort((a, b) => a.placa.localeCompare(b.placa) || a.nome.localeCompare(b.nome));
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
  const cont = h('span', { class: 'os-cont' }), lista = h('div', { class: 'os-lista' }), imp = h('button', { class: 'btn', type: 'button', text: 'Imprimir' });
  const tudoPl = {};
  const att = () => {
    const n = itens.filter(i => marcados[i.id]).length; cont.textContent = n ? n + ' de ' + itens.length + ' selecionado' + (n > 1 ? 's' : '') : 'Nada selecionado'; imp.disabled = !n;
    Object.keys(tudoPl).forEach(pl => { const d = itens.filter(i => i.placa === pl), k = d.filter(i => marcados[i.id]).length; tudoPl[pl].checked = k === d.length; tudoPl[pl].indeterminate = k > 0 && k < d.length; });
  };
  const marcar = (lst, v) => { lst.forEach(i => { marcados[i.id] = v; cks[i.id].checked = v; }); att(); };
  Array.from(new Set(itens.map(i => i.placa))).forEach(pl => {
    const doVeic = itens.filter(i => i.placa === pl), tudo = h('input', { type: 'checkbox', 'aria-label': 'Marcar tudo de ' + pl }); tudoPl[pl] = tudo;
    tudo.onchange = () => marcar(doVeic, tudo.checked);
    const grupo = h('div', { class: 'os-grupo' }, h('label', { class: 'os-placa' }, tudo, h('b', { text: pl }), h('span', { text: doVeic.length + (doVeic.length > 1 ? ' itens' : ' item') })));
    doVeic.forEach(i => { const c = h('input', { type: 'checkbox' }); cks[i.id] = c; c.onchange = () => { marcados[i.id] = c.checked; att(); };
      grupo.append(h('label', { class: 'os-item' }, c, h('span', { class: 'os-tx' }, h('b', { text: i.nome }), h('small', { text: i.sit + (i.detalhe ? ' — ' + i.detalhe : '') })), i.kind === 'ocorrencia' ? h('span', { class: 'badge ' + (i.alta ? 'red' : 'amber'), text: 'motorista' }) : null)); });
    lista.append(grupo);
  });
  const barra = h('div', { class: 'os-barra' }, h('button', { class: 'btn small secondary', type: 'button', text: 'Marcar tudo', onclick: () => marcar(itens, true) }), h('button', { class: 'btn small secondary', type: 'button', text: 'Limpar', onclick: () => marcar(itens, false) }));
  imp.onclick = () => { const escolhidos = itens.filter(i => marcados[i.id]); if (!escolhidos.length) return; imprimirOS(escolhidos, tipo.v, prest.value.trim(), obs.value.trim()); m.fechar(); };
  const cx = h('div', { class: 'os-sel' }, seg, extra, barra, lista, h('div', { class: 'os-rodape' }, cont, imp));
  const m = abrirModal('Ordem de serviço', cx, { largo: true }); att();
}

function imprimirOS(itens, tipo, prestador, obs) {
  const esc = escHtml, hoje = new Date().toLocaleDateString('pt-BR'), externa = tipo === 'externa';
  const css = `body{font-family:Arial,sans-serif;padding:20px;color:#000}h1{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;text-transform:uppercase;font-size:22px}
  .emissao{text-align:right;margin-bottom:16px;font-size:13px;color:#333}.item{border:2px solid #000;margin-bottom:16px;padding:14px;border-radius:8px;page-break-inside:avoid}
  .placa{font-size:24px;font-weight:bold;margin-bottom:8px}.servico{font-size:20px;margin-bottom:10px;display:flex;align-items:center;gap:10px}.cb{width:28px;height:28px;border:3px solid #000;border-radius:4px;display:inline-block;flex:0 0 auto}
  .info{margin-top:10px;border-top:1px dashed #666;padding-top:10px;font-size:16px;line-height:1.6}.lb{color:#555}.vl{font-weight:bold}
  .veiculo{border:2px solid #000;border-radius:8px;padding:12px;margin-bottom:14px;font-size:16px;line-height:1.6}.pagina{page-break-after:always}.pagina:last-child{page-break-after:auto}
  .linha{border-bottom:1px solid #000;display:inline-block;min-width:160px}.campos{display:flex;gap:30px;margin:14px 0;font-size:15px}.ass{display:flex;gap:40px;margin-top:50px;text-align:center;font-size:14px;font-weight:bold}.ass div{flex:1;border-top:2px solid #000;padding-top:4px}
  .def{font-size:16px;line-height:1.5;margin:4px 0}.obs{border:1px solid #666;border-radius:6px;padding:8px;margin:10px 0;font-size:15px}
  @media print{@page{margin:1cm}}`;
  let corpo = '';
  if (!externa) {
    corpo = `<h1>🔧 Aviso de Serviço - Oficina</h1><div class="emissao">Impresso em: ${hoje}</div>` + itens.map(i => `<div class="item"><div class="placa">🚛 Placa: ${esc(i.placa)}</div><div class="servico"><div class="cb"></div> ⚠️ Serviço: <strong>${esc(i.nome.toUpperCase())}</strong></div>
      <div class="info">${i.detalhe ? `<span class="lb">Relato:</span> <span class="vl">${esc(i.detalhe)}</span><br>` : ''}<span class="lb">Última troca:</span> <span class="vl">${esc(i.ultima)}</span><br><span class="lb">Situação atual:</span> <span class="vl">${esc(i.sit)}</span></div></div>`).join('')
      + `<div class="ass"><div>Visto da Oficina</div></div>`;
  } else {
    const placas = Array.from(new Set(itens.map(i => i.placa)));
    corpo = placas.map(pl => {
      const v = db.veiculos.find(x => x.placa === pl) || {}, doVeic = itens.filter(i => i.placa === pl);
      return `<div class="pagina"><h1>Ordem de Serviço Externa</h1><div class="emissao">Emitida em: ${hoje} · Transmarina</div>
        <div class="veiculo"><b>Veículo:</b> ${esc(pl)}${v.modelo ? ' · ' + esc(v.modelo) : ''}${v.ano ? ' · ' + esc(String(v.ano)) : ''}<br><b>Km atual:</b> ${fmtKm(v.kmAtual || 0)}<br><b>Prestador / local:</b> ${prestador ? esc(prestador) : '<span class="linha"></span>'}</div>
        <div style="font-size:18px;font-weight:bold;margin-bottom:6px">O que precisa ser feito</div>
        ${doVeic.map(i => `<div class="item"><div class="servico"><div class="cb"></div><strong>${esc(i.nome)}</strong></div><div class="def">${i.detalhe ? `<b>Defeito / relato:</b> ${esc(i.detalhe)}<br>` : ''}<b>Situação:</b> ${esc(i.sit)}${i.ultima && i.ultima !== '-' ? `<br><b>Última vez feito:</b> ${esc(i.ultima)}` : ''}</div></div>`).join('')}
        ${obs ? `<div class="obs"><b>Observações:</b> ${esc(obs)}</div>` : ''}
        <div class="campos"><span>Orçamento: R$ <span class="linha"></span></span><span>Prazo: <span class="linha"></span></span></div>
        <div class="campos"><span>Entrada: ___/___/______</span><span>Saída: ___/___/______</span><span>Km: <span class="linha" style="min-width:90px"></span></span></div>
        <div class="obs" style="min-height:70px"><b>Serviço realizado / peças trocadas:</b></div>
        <div class="ass"><div>Responsável Transmarina</div><div>Prestador</div></div></div>`;
    }).join('');
  }
  const w = window.open('', '_blank', 'width=800,height=600'); if (!w) { toast('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.', true); return; }
  w.document.write(`<html><head><title>${externa ? 'OS Externa' : 'Ordem de Manutenção'}</title><style>${css}</style></head><body>${corpo}</body></html>`); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}

function notificarNovosAlertas() {}  // o Hub mostra os alertas na tela Início (sem pop-up)