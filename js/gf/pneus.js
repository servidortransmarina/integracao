/* =====================================================================
   CONTROLE DE PNEUS
   Depende de script.js (db, apiPost helpers, toast, modais, fmtKm, ...).
   Os pneus ficam nas abas "Pneus" e "Mov_Pneus" da planilha.
   O KM de cada pneu é calculado a partir do KM do caminhão (que a Sascar atualiza):
   KM do pneu = km acumulado antes + (KM atual do caminhão - KM do caminhão na montagem).
   ===================================================================== */

/* ---------- AJUSTES ---------- */
// Vida útil usada para a cor do pneu: verde (novo) até preto (último uso).
const PNEUS_CFG = {
  kmPorVida: 80000,     // km que cada vida (novo ou recapado) deve durar
  maxRecapagens: 2      // recapagens permitidas; depois disso o pneu fica preto
};
const ESCALA_DESGASTE = [            // fração de uso -> cor (RGB)
  [0.00, [34, 197, 94]],             // verde: novo
  [0.30, [163, 201, 40]],
  [0.55, [224, 160, 32]],
  [0.80, [122, 74, 28]],
  [1.00, [17, 17, 17]]               // preto: último uso
];
const COR_POSICAO_VAZIA = [203, 213, 225];

/* ---------- MODELOS 3D ----------
   Posições "x y z" em metros, no espaço do próprio modelo. Cada modelo novo precisa das suas. */
const MODELOS_3D = {
  accelo_1017: {
    nome: 'Mercedes-Benz Accelo 1017',
    url: './models/accelo_1017.glb?v=3',
    urlRaiox: './models/accelo_1017_raiox.glb?v=6',
    posicoes: [
      { cod: 'DE',  nome: 'Dianteiro esquerdo',        pos: '1.12 0.50 2.90',   normal: '1 0 0' },
      { cod: 'DD',  nome: 'Dianteiro direito',         pos: '-1.12 0.50 2.90',  normal: '-1 0 0' },
      { cod: 'TEE', nome: 'Traseiro esquerdo externo', pos: '1.11 0.50 -2.30',  normal: '1 0 0' },
      { cod: 'TEI', nome: 'Traseiro esquerdo interno', pos: '0.64 1.03 -2.30',  normal: '0 1 0' },
      { cod: 'TDI', nome: 'Traseiro direito interno',  pos: '-0.64 1.03 -2.30', normal: '0 1 0' },
      { cod: 'TDE', nome: 'Traseiro direito externo',  pos: '-1.11 0.50 -2.30', normal: '-1 0 0' },
      { cod: 'ES',  nome: 'Estepe',                    pos: '0.00 1.07 -3.75',  normal: '0 1 0' }
    ]
  }
};
MODELOS_3D.vw_delivery_lqg = {
  nome: 'VW Delivery 8.150 Plus (LQG6788)',
  url: './models/vw_delivery_lqg.glb?v=3',
  urlRaiox: './models/vw_delivery_lqg_raiox.glb?v=5',
  nota: 'modelo do LQG6788 (também usado como base ilustrativa pelas placas Delivery ainda sem modelo próprio): baú 5,50 x 2,30 x 2,50 m, rodado duplo traseiro e estepe sob o chassi; detalhes podem variar entre as placas',
  posicoes: [
    { cod: 'DE',  nome: 'Dianteiro esquerdo',         pos: '1.02 0.39 2.60',   normal: '1 0 0' },
    { cod: 'DD',  nome: 'Dianteiro direito',          pos: '-1.02 0.39 2.60',  normal: '-1 0 0' },
    { cod: 'TEE', nome: 'Traseiro esquerdo externo',  pos: '1.02 0.39 -1.40',  normal: '1 0 0' },
    { cod: 'TEI', nome: 'Traseiro esquerdo interno',  pos: '0.62 0.78 -1.40',  normal: '0 1 0' },
    { cod: 'TDI', nome: 'Traseiro direito interno',   pos: '-0.62 0.78 -1.40', normal: '0 1 0' },
    { cod: 'TDE', nome: 'Traseiro direito externo',   pos: '-1.02 0.39 -1.40', normal: '-1 0 0' },
    { cod: 'ES',  nome: 'Estepe',                     pos: '0.40 0.50 -2.55',  normal: '1 0 0' }
  ]
};
/* Delivery com baú próprio por placa: o que muda entre eles é o entre-eixos e a posição do estepe. */
function posicoesDelivery(zTras, zEstepe) {
  return [
    { cod: 'DE',  nome: 'Dianteiro esquerdo',         pos: '1.02 0.39 2.60',        normal: '1 0 0' },
    { cod: 'DD',  nome: 'Dianteiro direito',          pos: '-1.02 0.39 2.60',       normal: '-1 0 0' },
    { cod: 'TEE', nome: 'Traseiro esquerdo externo',  pos: '1.02 0.39 ' + zTras,    normal: '1 0 0' },
    { cod: 'TEI', nome: 'Traseiro esquerdo interno',  pos: '0.62 0.78 ' + zTras,    normal: '0 1 0' },
    { cod: 'TDI', nome: 'Traseiro direito interno',   pos: '-0.62 0.78 ' + zTras,   normal: '0 1 0' },
    { cod: 'TDE', nome: 'Traseiro direito externo',   pos: '-1.02 0.39 ' + zTras,   normal: '-1 0 0' },
    { cod: 'ES',  nome: 'Estepe',                     pos: '0.40 0.53 ' + zEstepe,  normal: '1 0 0' }
  ];
}
MODELOS_3D.vw_delivery_hag = {
  nome: 'VW Delivery 8.150 Plus (HAG3901)',
  url: './models/vw_delivery_hag.glb?v=3', urlRaiox: './models/vw_delivery_hag_raiox.glb?v=5',
  nota: 'modelo próprio do HAG3901: quebra-sol, sem protetor lateral, estepe entre os eixos, fita refletiva em volta da porta traseira',
  posicoes: posicoesDelivery('-1.25', '-0.29')
};
MODELOS_3D.vw_delivery_gef = {
  nome: 'VW Delivery 8.160 (GEF5456)',
  url: './models/vw_delivery_gef.glb?v=10', urlRaiox: './models/vw_delivery_gef_raiox.glb?v=11',
  nota: 'modelo próprio do GEF5456: cabine nova, para-choque preto com faróis de milha, estepe entre os eixos',
  posicoes: posicoesDelivery('-1.15', '-0.09')
};
MODELOS_3D.vw_worker_kzb = {
  nome: 'VW Worker 9-150E (KZB3213)',
  url: './models/vw_delivery_kzb.glb?v=3', urlRaiox: './models/vw_delivery_kzb_raiox.glb?v=5',
  nota: 'modelo próprio do KZB3213: cabine antiga (Worker), para-choque cinza, farol retangular, baú de alumínio 5,50 x 2,30 x 2,50 m, estepe entre os eixos',
  posicoes: posicoesDelivery('-1.50', '-0.29')
};
MODELOS_3D.vw_delivery_lrr = {
  nome: 'VW Delivery 11.180 (LRR6852)',
  url: './models/vw_delivery_lrr.glb?v=6', urlRaiox: './models/vw_delivery_lrr_raiox.glb?v=6',
  nota: 'modelo próprio do LRR6852: cabine nova, baú 6,20 x 2,30 x 2,60 m (lado esquerdo liso, direito corrugado com porta lateral), protetores de alumínio, estepe entre os eixos',
  posicoes: posicoesDelivery('-1.50', '-0.09')
};
MODELOS_3D.vw_delivery_oxi = {
  nome: 'VW Delivery 10.160 (OXI0436)',
  url: './models/vw_delivery_oxi.glb?v=3', urlRaiox: './models/vw_delivery_oxi_raiox.glb?v=5',
  nota: 'modelo próprio do OXI0436: baú liso 6,00 x 2,30 x 2,30 m, entre-eixos 4,40 m, protetores laterais de alumínio, caixa de ferramentas atrás do eixo traseiro',
  posicoes: posicoesDelivery('-1.80', '-0.09')
};
MODELOS_3D.mb_710_hac = {
  nome: 'Mercedes-Benz 710 Plus (HAC3900)',
  url: './models/mb_710_hac.glb?v=1', urlRaiox: './models/mb_710_hac_raiox.glb?v=1',
  nota: 'modelo próprio do HAC3900: cabine azul do 710 Plus, baú de alumínio corrugado com porta lateral direita, rodado duplo traseiro, estepe entre os eixos, para-choque traseiro com faixa refletiva; medida do baú estimada pelas fotos (4,60 m de comprimento)',
  posicoes: posicoesDelivery('-1.10', '0.10')
};
MODELOS_3D.mb_accelo_ntp = {
  nome: 'Mercedes-Benz Accelo 915C (NTP4E67)',
  url: './models/mb_accelo_ntp.glb?v=2', urlRaiox: './models/mb_accelo_ntp_raiox.glb?v=1',
  nota: 'modelo próprio do NTP4E67: cabine azul do Accelo 915C, baú 6,50 x 2,40 x 2,50 m amarelo com faixa laranja e marca fictícia, rodado duplo traseiro, estepe sob o chassi atrás do eixo traseiro',
  posicoes: posicoesDelivery('-1.70', '-2.85').map(p => p.cod === 'ES' ? Object.assign({}, p, { pos: '0.40 0.50 -2.85' }) : p)
};
MODELOS_3D.vw_delivery = MODELOS_3D.vw_delivery_lqg;   // apelido antigo (caso a coluna "modelo" da planilha use esse nome)
const MODELO_3D_PADRAO = 'accelo_1017';
/* Qual modelo cada placa usa. A coluna "modelo" da aba Veiculos, se existir, tem prioridade.
   Placas que não estão aqui usam o Accelo como modelo ilustrativo (as posições de pneu são as do Accelo). */
const MODELO_POR_PLACA = {
  SRU3H61: 'accelo_1017', SRO3B75: 'accelo_1017',
  GEF5456: 'vw_delivery_gef', HAG3901: 'vw_delivery_hag', LQG6788: 'vw_delivery_lqg', EEN5641: 'vw_delivery_lqg',
  KZB3213: 'vw_worker_kzb', OXI0436: 'vw_delivery_oxi', LRR6852: 'vw_delivery_lrr', HAC3900: 'mb_710_hac', NTP4E67: 'mb_accelo_ntp'
};

/* Dados dos documentos (CRLV) de cada caminhão. */
const FICHA_POR_PLACA = {
  EEN5641: { desc: 'VW 9.150E Cummins · 2008',        cabine: 'VERMELHA' },
  FSU1239: { desc: 'Ford Cargo 816 S · 2014',         cabine: 'PRATA' },
  GEF5456: { desc: 'VW 8.160 DRC 4x2 · 2015',         cabine: 'BRANCA' },
  GMV0371: { desc: 'Mercedes-Benz L 1113 · 1979',     cabine: 'AZUL' },
  HAC3900: { desc: 'Mercedes-Benz 710 · 2010',        cabine: 'AZUL' },
  HAG3901: { desc: 'VW 8.150 E Delivery Plus · 2010', cabine: 'BRANCA' },
  KZB3213: { desc: 'VW 9.150E Cummins · 2010',        cabine: 'BRANCA' },
  LQG6788: { desc: 'VW 8.150 E Delivery Plus · 2011', cabine: 'BRANCA' },
  LRR6852: { desc: 'VW 11.180 DRC 4x2 · 2018',        cabine: 'BRANCA' },
  NTP4E67: { desc: 'Mercedes-Benz 915C · 2010',       cabine: 'AZUL ESCURO' },
  OXI0436: { desc: 'VW 10.160 DRC 4x2 · 2014',        cabine: 'BRANCA' },
  SRO3B75: { desc: 'Mercedes-Benz Accelo 1017 · 2023', cabine: 'BRANCA' },
  SRU3H61: { desc: 'Mercedes-Benz Accelo 1017 · 2023', cabine: 'BRANCA' }
};
const COR_CABINE = { BRANCA: [243, 244, 242], AZUL: [30, 104, 186], 'AZUL ESCURO': [30, 74, 150], VERMELHA: [179, 32, 42], PRATA: [184, 188, 194] };

const ROTULO_MOV = { entrada: 'Cadastro', montagem: 'Montagem', desmontagem: 'Desmontagem', troca_posicao: 'Troca de posição', recapagem: 'Recapagem', descarte: 'Descarte' };
const ROTULO_STATUS_PNEU = { montado: 'Montado', estoque: 'Em estoque', recapagem: 'Na recapagem', descartado: 'Descartado' };
const ROTULO_DESTINO = { estoque: 'Estoque', recapagem: 'Recapagem', descartado: 'Descarte' };

/* ---------- ESTADO ---------- */
let pneusPlaca = null, pneusPosSel = null, pneusRaiox = false, pneusMV = null, pneusModeloKey = null;
let pneusOcupado = false, pneuEditCodigo = null, pneuMoverCodigo = null, pneuDesmontarCodigo = null;

/* ---------- UTILIDADES ---------- */
function escHtml(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function ehMecanico() { return GF.perfil() === 'mecanico'; }
function rgbCss(c) { return `rgb(${c[0]}, ${c[1]}, ${c[2]})`; }
function srgbParaLinear(c) { return c.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); }
function corDesgaste(f) {
  f = Math.max(0, Math.min(1, f));
  for (let i = 1; i < ESCALA_DESGASTE.length; i++) {
    if (f <= ESCALA_DESGASTE[i][0]) {
      const a = ESCALA_DESGASTE[i - 1], b = ESCALA_DESGASTE[i], t = (f - a[0]) / ((b[0] - a[0]) || 1);
      return a[1].map((x, k) => Math.round(x + (b[1][k] - x) * t));
    }
  }
  return ESCALA_DESGASTE[ESCALA_DESGASTE.length - 1][1];
}

function modeloKeyDoVeiculo(v) {
  const k = String((v && v.modelo) || (v && MODELO_POR_PLACA[v.placa]) || '').trim().toLowerCase();
  return MODELOS_3D[k] ? k : null;
}
function modelo3dDoVeiculo(v) {
  const k = modeloKeyDoVeiculo(v);
  return Object.assign({ chave: k || MODELO_3D_PADRAO, ilustrativo: !k }, MODELOS_3D[k || MODELO_3D_PADRAO]);
}
function posicoesDoVeiculo(placa) { return modelo3dDoVeiculo(db.veiculos.find(v => v.placa === placa)).posicoes; }
function nomePosicao(placa, cod) { const p = posicoesDoVeiculo(placa).find(x => x.cod === cod); return p ? p.nome : cod; }

function pneuNaPosicao(placa, cod) { return db.pneus.find(p => p.status === 'montado' && p.placa === placa && p.posicao === cod) || null; }
function pneuKm(p) {
  const v = p.status === 'montado' ? db.veiculos.find(x => x.placa === p.placa) : null;
  const rodando = v ? Math.max(0, (v.kmAtual || 0) - (p.kmMontagem || 0)) : 0;
  return { vida: (p.kmVida || 0) + rodando, total: (p.kmTotal || 0) + rodando, rodando };
}
function pneuDesgaste(p) {
  if (p.status === 'descartado') return 1;
  const frac = Math.min(1, pneuKm(p).vida / PNEUS_CFG.kmPorVida);
  return Math.min(1, ((p.recapagens || 0) + frac) / (PNEUS_CFG.maxRecapagens + 1));
}
function rotuloVida(p) { const r = p.recapagens || 0; return r === 0 ? 'Novo (1ª vida)' : `${r}ª recapagem (${r + 1}ª vida)`; }
function swatchPneu(p) { return `<span class="pn-swatch" style="background:${rgbCss(corDesgaste(pneuDesgaste(p)))}"></span>`; }
function textoPneu(p) { return [p.marca, p.modelo, p.medida].filter(Boolean).join(' · ') || '-'; }

/* ---------- COMUNICAÇÃO (uma tentativa só: operações de pneu não podem repetir sozinhas) ---------- */
function pneusPost(action, data) {
  return enfileirar(async () => {
    return await API.chamar(action, data);
  });
}
function aplicarRespostaPneus(r) {
  (r.pneus || []).forEach(p => { const i = db.pneus.findIndex(x => x.codigo === p.codigo); if (i >= 0) db.pneus[i] = p; else db.pneus.push(p); });
  (r.movs || []).forEach(m => db.movPneus.push(m));
  if (r.removido) db.pneus = db.pneus.filter(p => p.codigo !== r.removido);
}
async function pneusApi(action, data, msgOk) {
  if (pneusOcupado) return false;
  pneusOcupado = true;
  try {
    data.nome = GF.nome();
    toast('Salvando...');
    const r = await pneusPost(action, data);
    aplicarRespostaPneus(r); salvarCache(); renderPneus(); toast(msgOk);
    return true;
  } catch (e) {
    toast('Erro: ' + e.message + (/HTTP|Failed to fetch|NetworkError/i.test(e.message) ? '. Use "Atualizar dados" para conferir se foi salvo.' : ''), true);
    return false;
  } finally { pneusOcupado = false; }
}

/* ---------- RENDER DA ABA ---------- */
function renderPneus() {
  if (ehMecanico()) return;
  if (!Array.isArray(db.pneus)) db.pneus = [];
  if (!Array.isArray(db.movPneus)) db.movPneus = [];
  const sel = document.getElementById('pneusVeiculo');
  if (!db.veiculos.some(v => v.placa === pneusPlaca)) pneusPlaca = db.veiculos.length ? db.veiculos[0].placa : null;
  sel.innerHTML = db.veiculos.map(v => `<option value="${v.placa}" ${v.placa === pneusPlaca ? 'selected' : ''}>${v.placa}${FICHA_POR_PLACA[v.placa] ? ' · ' + FICHA_POR_PLACA[v.placa].desc : ''}</option>`).join('');
  if (!pneusPlaca) { document.getElementById('pneusPainel').innerHTML = '<div class="empty">Cadastre um caminhão na aba Frota & Manutenções.</div>'; return; }

  const v = db.veiculos.find(x => x.placa === pneusPlaca);
  const m = modelo3dDoVeiculo(v);
  if (!m.posicoes.some(p => p.cod === pneusPosSel)) pneusPosSel = m.posicoes[0].cod;

  const montados = m.posicoes.filter(p => pneuNaPosicao(pneusPlaca, p.cod)).length;
  const estoque = db.pneus.filter(p => p.status === 'estoque').length, rec = db.pneus.filter(p => p.status === 'recapagem').length;
  const ficha = FICHA_POR_PLACA[pneusPlaca];
  document.getElementById('pneusResumo').innerHTML =
    `<div class="pn-resumo-item"><b>${montados}/${m.posicoes.length}</b><span>pneus montados</span></div>` +
    `<div class="pn-resumo-item"><b>${estoque}</b><span>em estoque</span></div>` +
    `<div class="pn-resumo-item"><b>${rec}</b><span>na recapagem</span></div>` +
    `<div class="pn-resumo-item"><b>${fmtKm(v.kmAtual)}</b><span>KM do caminhão (Sascar)</span></div>`;
  document.getElementById('pneusModeloInfo').textContent =
    (ficha ? ficha.desc : m.nome) + (m.ilustrativo ? ' · corpo 3D ilustrativo (modelo próprio ainda não criado)' : '') + (m.nota ? ' · ' + m.nota : '');

  pneusAtualizarViewer(v, m);
  pneusRenderPainel(v, m);
  pneusRenderTabela();
  pneusRenderMov();
}

function pneusTrocarVeiculo() { pneusPlaca = document.getElementById('pneusVeiculo').value; pneusPosSel = null; renderPneus(); }
function pneusSelecionar(cod) { pneusPosSel = cod; const v = db.veiculos.find(x => x.placa === pneusPlaca); pneusRenderPainel(v, modelo3dDoVeiculo(v)); pneusMarcarHotspots(); }

function pneusRenderPainel(v, m) {
  const placa = v.placa;
  const linhas = m.posicoes.map(pos => {
    const p = pneuNaPosicao(placa, pos.cod);
    const info = p ? `<b>${escHtml(p.codigo)}</b> · ${Math.round(pneuDesgaste(p) * 100)}% · ${fmtKm(pneuKm(p).vida)}` : '<i>vazio</i>';
    const cor = p ? rgbCss(corDesgaste(pneuDesgaste(p))) : 'transparent';
    return `<button type="button" class="pn-linha ${pos.cod === pneusPosSel ? 'sel' : ''}" onclick="pneusSelecionar('${pos.cod}')">
      <span class="pn-swatch ${p ? '' : 'vazio'}" style="background:${cor}"></span>
      <span class="pn-linha-txt"><span class="pn-linha-nome">${escHtml(pos.nome)}</span><span class="pn-linha-sub">${info}</span></span></button>`;
  }).join('');

  const pos = m.posicoes.find(x => x.cod === pneusPosSel);
  const p = pneuNaPosicao(placa, pneusPosSel);
  let detalhe;
  if (!p) {
    const livres = db.pneus.filter(x => x.status === 'estoque').length;
    detalhe = `<div class="pn-detalhe-vazio"><div class="pn-detalhe-tit">${escHtml(pos.nome)}</div>
      <p>Nenhum pneu montado nesta posição.</p>
      ${livres ? `<button class="btn" onclick="abrirModalMontar({placa:'${placa}', posicao:'${pos.cod}'})">Montar pneu aqui</button>` : '<p class="pn-dim">Não há pneus em estoque. Cadastre um pneu ou desmonte outro.</p>'}</div>`;
  } else {
    const k = pneuKm(p);
    const hist = db.movPneus.filter(x => x.codigo === p.codigo).slice(-4).reverse().map(x => `<li><b>${ROTULO_MOV[x.tipo] || escHtml(x.tipo)}</b> · ${fmtData(x.data)}${x.placa ? ' · ' + escHtml(x.placa) : ''}${x.destino ? ' · ' + escHtml(ROTULO_DESTINO[x.destino] || x.destino) : ''}</li>`).join('');
    detalhe = `<div class="pn-detalhe">
      <div class="pn-detalhe-tit">${swatchPneu(p)} ${escHtml(pos.nome)} · <b>${escHtml(p.codigo)}</b></div>
      <dl class="pn-dl">
        <dt>Pneu</dt><dd>${escHtml(textoPneu(p))}</dd>
        <dt>Vida</dt><dd>${rotuloVida(p)}</dd>
        <dt>KM nesta vida</dt><dd>${fmtKm(k.vida)} <span class="pn-dim">(${Math.round(pneuDesgaste(p) * 100)}% do ciclo)</span></dd>
        <dt>KM total</dt><dd>${fmtKm(k.total)}</dd>
        <dt>Montado com</dt><dd>${fmtKm(p.kmMontagem)} no caminhão (${fmtKm(k.rodando)} rodados desde então)</dd>
      </dl>
      <div class="pn-acoes">
        <button class="btn secondary small" onclick="abrirModalMover('${escHtml(p.codigo)}')">Trocar de posição</button>
        <button class="btn danger small" onclick="abrirModalDesmontar('${escHtml(p.codigo)}')">Desmontar</button>
      </div>
      ${hist ? `<div class="pn-hist-tit">Últimas movimentações</div><ul class="pn-hist">${hist}</ul>` : ''}</div>`;
  }
  document.getElementById('pneusPainel').innerHTML = `<h2>Posições</h2><div class="pn-linhas">${linhas}</div>${detalhe}`;
}

function pneusRenderTabela() {
  const f = (document.getElementById('pneusFiltro').value || '').trim().toLowerCase();
  const lista = db.pneus.filter(p => !f || [p.codigo, p.marca, p.modelo, p.medida, p.placa, p.posicao, ROTULO_STATUS_PNEU[p.status]].join(' ').toLowerCase().includes(f))
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'pt-BR', { numeric: true }));
  const el = document.getElementById('pneusTabela');
  if (!lista.length) { el.innerHTML = '<div class="empty">Nenhum pneu cadastrado.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Código</th><th>Pneu</th><th>Vida</th><th>KM nesta vida</th><th>KM total</th><th>Situação</th><th>Local</th><th>Ações</th></tr></thead><tbody>${lista.map(p => {
    const k = pneuKm(p), c = escHtml(p.codigo);
    const local = p.status === 'montado' ? `${escHtml(p.placa)} · ${escHtml(nomePosicao(p.placa, p.posicao))}` : '-';
    const acoes = [`<button class="btn secondary small" onclick="abrirModalPneu('${c}')">Editar</button>`];
    if (p.status === 'estoque') acoes.push(`<button class="btn small" onclick="abrirModalMontar({codigo:'${c}'})">Montar</button>`);
    if (p.status === 'estoque' || p.status === 'recapagem') acoes.push(`<button class="btn success small" onclick="recaparPneu('${c}')">Recapagem concluída</button>`);
    if (p.status === 'montado') acoes.push(`<button class="btn danger small" onclick="abrirModalDesmontar('${c}')">Desmontar</button>`);
    if (p.status === 'estoque' || p.status === 'recapagem') acoes.push(`<button class="btn secondary small" onclick="descartarPneu('${c}')">Descartar</button>`);
    if (p.status !== 'montado') acoes.push(`<button class="btn danger small" onclick="excluirPneu('${c}')">Excluir</button>`);
    return `<tr><td><b>${c}</b></td><td>${escHtml(textoPneu(p))}</td><td>${rotuloVida(p)}</td><td>${fmtKm(k.vida)}</td><td>${fmtKm(k.total)}</td><td>${swatchPneu(p)} ${ROTULO_STATUS_PNEU[p.status] || escHtml(p.status)}</td><td>${local}</td><td class="pn-td-acoes">${acoes.join(' ')}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function pneusRenderMov() {
  const f = (document.getElementById('pneusFiltroMov').value || '').trim().toLowerCase();
  const lista = db.movPneus.map((m, i) => ({ m, i })).filter(x => !f || [x.m.codigo, x.m.placa, x.m.posicao, ROTULO_MOV[x.m.tipo], x.m.nome].join(' ').toLowerCase().includes(f))
    .sort((a, b) => String(b.m.data).localeCompare(String(a.m.data)) || b.i - a.i).slice(0, 150);
  const el = document.getElementById('pneusMov');
  if (!lista.length) { el.innerHTML = '<div class="empty">Nenhuma movimentação registrada.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Data</th><th>Pneu</th><th>Movimento</th><th>Caminhão · posição</th><th>KM do caminhão</th><th>KM do pneu</th><th>Responsável</th></tr></thead><tbody>${lista.map(({ m }) => {
    const det = m.destino ? ` <span class="pn-dim">(${escHtml(ROTULO_DESTINO[m.destino] || m.destino)})</span>` : '';
    return `<tr><td>${fmtData(m.data)}</td><td><b>${escHtml(m.codigo)}</b></td><td>${ROTULO_MOV[m.tipo] || escHtml(m.tipo)}${det}</td><td>${m.placa ? escHtml(m.placa) + ' · ' + escHtml(m.posicao) : '-'}</td><td>${m.kmVeiculo !== '' && m.kmVeiculo !== undefined ? fmtKm(m.kmVeiculo) : '-'}</td><td>${fmtKm(m.kmPneu)}</td><td>${escHtml(m.nome || '-')}</td></tr>`;
  }).join('')}</tbody></table>`;
}

/* ---------- VISUALIZADOR 3D ---------- */
const VISTAS_PNEUS = { frente: '0deg 78deg auto', esquerda: '90deg 80deg auto', direita: '-90deg 80deg auto', traseira: '180deg 78deg auto', topo: '0deg 0deg auto', tresq: '-38deg 74deg auto' };

/** O visualizador 3D só é baixado quando a aba de Pneus é aberta (não pesa no resto do sistema). */
function carregarModelViewer() {
  if (customElements.get('model-viewer') || document.getElementById('mvScript')) return;
  const sc = document.createElement('script'); sc.type = 'module'; sc.id = 'mvScript';
  sc.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'; document.head.appendChild(sc);
}
function pneusCriarViewer() {
  if (pneusMV) return pneusMV;
  carregarModelViewer();
  const slot = document.getElementById('pneusViewerSlot'); if (!slot) return null;
  const mv = document.createElement('model-viewer');
  const attrs = { 'camera-controls': '', 'touch-action': 'pan-y', 'camera-orbit': VISTAS_PNEUS.tresq, 'min-camera-orbit': 'auto 0deg auto', 'max-camera-orbit': 'auto 90deg auto',
    'field-of-view': '30deg', 'shadow-intensity': '1.1', 'shadow-softness': '1', 'exposure': '1.05', 'environment-image': 'neutral', 'interaction-prompt': 'none', 'alt': 'Caminhão' };
  Object.keys(attrs).forEach(k => mv.setAttribute(k, attrs[k]));
  mv.addEventListener('load', pneusAplicarCores);
  mv.addEventListener('error', () => { mv.style.display = 'none'; const e = document.getElementById('pneusViewerErro'); if (e) e.style.display = 'flex'; });
  slot.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('.hotspot'); if (b && b.dataset.cod) pneusSelecionar(b.dataset.cod); });
  slot.appendChild(mv);
  setTimeout(() => { if (!customElements.get('model-viewer')) { mv.style.display = 'none'; const e = document.getElementById('pneusViewerErro'); if (e) e.style.display = 'flex'; } }, 10000);
  pneusMV = mv; return mv;
}

function pneusAtualizarViewer(v, m) {
  const mv = pneusCriarViewer(); if (!mv) return;
  document.getElementById('pneusViewerCard').classList.toggle('raiox', pneusRaiox);
  mv.setAttribute('shadow-intensity', pneusRaiox ? '0' : '1.1');
  mv.setAttribute('alt', 'Caminhão ' + v.placa);
  const src = pneusRaiox ? m.urlRaiox : m.url;
  if (mv.getAttribute('src') !== src) mv.setAttribute('src', src);
  if (pneusModeloKey !== m.chave) {
    mv.querySelectorAll('.hotspot').forEach(h => h.remove());
    m.posicoes.forEach(pos => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hotspot'; b.dataset.cod = pos.cod; b.slot = 'hotspot-' + pos.cod;
      b.setAttribute('data-position', pos.pos); b.setAttribute('data-normal', pos.normal);
      b.innerHTML = '<span class="hs-label"></span>';
      mv.appendChild(b);
    });
    pneusModeloKey = m.chave;
  }
  m.posicoes.forEach(pos => {
    const b = mv.querySelector(`.hotspot[data-cod="${pos.cod}"]`); if (!b) return;
    const p = pneuNaPosicao(v.placa, pos.cod);
    b.style.background = p ? rgbCss(corDesgaste(pneuDesgaste(p))) : 'rgb(255,255,255)';
    b.classList.toggle('vazio', !p);
    b.querySelector('.hs-label').textContent = pos.nome + ' · ' + (p ? p.codigo + ' · ' + Math.round(pneuDesgaste(p) * 100) + '%' : 'vazio');
  });
  pneusMarcarHotspots();
  pneusAplicarCores();
}

function pneusMarcarHotspots() {
  if (!pneusMV) return;
  pneusMV.querySelectorAll('.hotspot').forEach(b => b.classList.toggle('sel', b.dataset.cod === pneusPosSel));
}

function pneusAplicarCores() {
  const mv = pneusMV; if (!mv || !mv.model || !mv.model.materials || !pneusPlaca) return;
  const v = db.veiculos.find(x => x.placa === pneusPlaca); if (!v) return;
  const mats = mv.model.materials;
  const faltando = [];
  modelo3dDoVeiculo(v).posicoes.forEach(pos => {
    const mat = mats.find(x => x.name === 'Tire_' + pos.cod); if (!mat) { faltando.push(pos.cod); return; }
    const p = pneuNaPosicao(pneusPlaca, pos.cod);
    mat.pbrMetallicRoughness.setBaseColorFactor(srgbParaLinear(p ? corDesgaste(pneuDesgaste(p)) : COR_POSICAO_VAZIA).concat([1]));
  });
  if (faltando.length) toast('O arquivo .glb carregado está desatualizado (sem os pneus ' + faltando.join(', ') + '). Substitua a pasta models/ e recarregue com Ctrl+F5.', true);
  const ficha = FICHA_POR_PLACA[pneusPlaca];
  const paint = mats.find(x => x.name === 'Paint_White');
  if (paint && ficha && COR_CABINE[ficha.cabine]) paint.pbrMetallicRoughness.setBaseColorFactor(srgbParaLinear(COR_CABINE[ficha.cabine]).concat([1]));
  pneusAplicarPlaca();
  pneusAplicarTexturasBau();
}

/* Placa desenhada na hora (mesma textura na frente e atrás). Todas as placas da frota são de aluguel (vermelha). */
function pneusPlacaDataUrl(placa) {
  const c = document.createElement('canvas'); c.width = 616; c.height = 200; const g = c.getContext('2d');
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa);
  g.fillStyle = mercosul ? '#f4f4f1' : '#bc1622'; g.fillRect(0, 0, 616, 200);
  g.strokeStyle = mercosul ? '#1b1b1b' : '#f5f5f5'; g.lineWidth = 7; g.strokeRect(5, 5, 606, 190);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (mercosul) {
    g.fillStyle = '#1d3f94'; g.fillRect(8, 8, 600, 40);
    g.fillStyle = '#fff'; g.font = 'bold 26px Arial'; g.fillText('BRASIL', 308, 29);
    g.fillStyle = '#c1121f'; g.font = 'bold 124px Arial'; g.fillText(placa, 308, 120);
  } else {
    g.fillStyle = '#f5f5f5'; g.font = 'bold 30px Arial'; g.fillText('BRASIL', 308, 30);
    g.font = 'bold 120px Arial'; g.fillText(placa.slice(0, 3) + '·' + placa.slice(3), 308, 120);
  }
  return c.toDataURL('image/png');
}
/* Arte do baú própria da empresa (opcional). Coloque PNGs em models/texturas/ com os nomes abaixo e eles substituem a arte padrão do baú
   (cada imagem cobre a face inteira: laterais e traseira 2,5 m de altura, teto 6,5 x 2,4 m). Sem o arquivo, fica a arte padrão.
   <PLACA>_lateral_esq.png  <PLACA>_lateral_dir.png  <PLACA>_traseira.png  <PLACA>_frente.png  <PLACA>_teto.png   (ex.: NTP4E67_lateral_esq.png) */
const TEXTURAS_BAU = { lateral_esq: 'Box_Tex_Esq', lateral_dir: 'Box_Tex_Dir', traseira: 'Box_Tex_Tras', frente: 'Box_Tex_Frente', teto: 'Box_Tex_Teto' };
const TEXTURAS_VERSAO = 1;   // some 1 a cada vez que trocar um PNG com o mesmo nome (evita cache do navegador/GitHub Pages)
function pneusImagemExiste(url) {
  return new Promise(ok => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = url; });
}
const pneusTexCache = {};   // url -> Promise<textura|null>  (cada PNG é baixado uma vez; null = arquivo não existe)
function pneusTexturaBau(mv, url) {
  if (!pneusTexCache[url]) pneusTexCache[url] = pneusImagemExiste(url).then(ok => ok ? mv.createTexture(url) : null).catch(e => { console.warn('Textura do baú não carregou:', url, e); return null; });
  return pneusTexCache[url];
}
async function pneusAplicarTexturasBau() {
  const mv = pneusMV; if (!mv || !mv.model || !pneusPlaca || typeof mv.createTexture !== 'function') return;
  const placa = pneusPlaca, modelo = mv.model;
  if (!modelo.materials.some(x => x.name.indexOf('Box_Tex_') === 0)) { console.info('Texturas do baú: este .glb não tem os encaixes Box_Tex_* (suba o .glb novo da pasta models/).'); return; }
  const ok = [], falta = [];
  for (const arq of Object.keys(TEXTURAS_BAU)) {
    const url = './models/texturas/' + placa + '_' + arq + '.png?v=' + TEXTURAS_VERSAO;
    const tex = await pneusTexturaBau(mv, url);
    if (!tex) { console.info('Textura não encontrada (arte padrão mantida):', url); falta.push(arq); continue; }
    if (placa !== pneusPlaca || mv.model !== modelo) return;     // trocou de caminhão/modelo (ex.: raio X): o 'load' seguinte aplica de novo
    const m = modelo.materials.find(x => x.name === TEXTURAS_BAU[arq]); if (!m) continue;
    try {
      m.pbrMetallicRoughness.baseColorTexture.setTexture(tex); m.setAlphaMode('OPAQUE'); ok.push(arq); console.info('Textura aplicada:', url);
      modelo.materials.filter(x => x.name === 'Livery').forEach(l => { try { l.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 0]); } catch (e) {} });   // esconde a arte padrão (decals) que ficaria por cima
    } catch (e) { console.warn('Textura do baú não aplicada:', url, e); falta.push(arq + ' (erro)'); }
  }
  if (pneusTexAviso !== placa + (modelo.__raio ? 'x' : '')) {
    pneusTexAviso = placa + (modelo.__raio ? 'x' : '');
    if (falta.length === Object.keys(TEXTURAS_BAU).length) toast('Texturas do baú de ' + placa + ' não encontradas em models/texturas/ (arte padrão mantida). Confira os nomes e se os arquivos estão no servidor.', true);
    else if (falta.length) toast('Texturas de ' + placa + ' aplicadas; faltam: ' + falta.join(', '), true);
  }
}
let pneusTexAviso = null;

async function pneusAplicarPlaca() {
  const mv = pneusMV; if (!mv || !mv.model || !pneusPlaca || typeof mv.createTexture !== 'function') return;
  const placa = pneusPlaca, mats = mv.model.materials.filter(x => x.name === 'Plate_Face'); if (!mats.length) return;
  try {
    const tex = await mv.createTexture(pneusPlacaDataUrl(placa));
    if (placa !== pneusPlaca) return;
    mats.forEach(m => m.pbrMetallicRoughness.baseColorTexture.setTexture(tex));
  } catch (e) { console.warn('Placa 3D não aplicada:', e); }
}

function pneusDefinirModo(raiox) {
  pneusRaiox = raiox;
  document.querySelectorAll('[data-modo3d]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.modo3d === 'raiox') === raiox)));
  renderPneus();
}
function pneusIrParaVista(chave) { if (pneusMV && VISTAS_PNEUS[chave]) pneusMV.setAttribute('camera-orbit', VISTAS_PNEUS[chave]); }

/* ---------- MODAL: CADASTRO / EDIÇÃO DE PNEU ---------- */
function abrirModalPneu(codigo) {
  const p = codigo ? db.pneus.find(x => x.codigo === codigo) : null;
  pneuEditCodigo = p ? p.codigo : null;
  document.getElementById('pnTitulo').textContent = p ? 'Editar pneu ' + p.codigo : 'Cadastrar pneu';
  const set = (id, v) => { document.getElementById(id).value = v; };
  set('pnCodigo', p ? p.codigo : ''); document.getElementById('pnCodigo').disabled = !!p;
  set('pnMarca', p ? p.marca : ''); set('pnModelo', p ? p.modelo : ''); set('pnMedida', p ? p.medida : '');
  set('pnRecap', p ? p.recapagens : 0); set('pnKmRodado', ''); set('pnObs', p ? p.obs : '');
  document.getElementById('pnNovoWrap').style.display = p ? 'none' : 'block';
  document.getElementById('pnMontado').innerHTML = '<option value="">Em estoque</option>' + db.veiculos.map(v => `<option value="${v.placa}">Já montado em ${v.placa}</option>`).join('');
  pnMontadoChange();
  openModal('modalPneu');
}
function pnMontadoChange() {
  const placa = document.getElementById('pnMontado').value;
  document.getElementById('pnMontadoWrap').style.display = placa ? 'flex' : 'none';
  if (!placa) return;
  const livres = posicoesDoVeiculo(placa).filter(pos => !pneuNaPosicao(placa, pos.cod));
  document.getElementById('pnPosicao').innerHTML = livres.length ? livres.map(pos => `<option value="${pos.cod}">${pos.nome}</option>`).join('') : '<option value="">Sem posição livre</option>';
  const v = db.veiculos.find(x => x.placa === placa);
  document.getElementById('pnKmMont').value = v && v.kmAtual > 0 ? Number(v.kmAtual).toLocaleString('pt-BR') : '';
}
async function salvarPneuModal() {
  const g = id => document.getElementById(id).value.trim();
  const dados = { codigo: g('pnCodigo'), marca: g('pnMarca'), modelo: g('pnModelo'), medida: g('pnMedida'), recapagens: parseInt(g('pnRecap'), 10) || 0, obs: g('pnObs') };
  if (!dados.codigo) return toast('Informe o código do pneu.', true);
  let ok;
  if (pneuEditCodigo) { dados.codigo = pneuEditCodigo; ok = await pneusApi('updatePneu', dados, 'Pneu atualizado.'); }
  else {
    const rodado = g('pnKmRodado'); if (rodado !== '') { const n = parseNumeroBR(rodado); if (isNaN(n) || n < 0) return toast('KM já rodado inválido.', true); dados.kmRodado = n; }
    const placa = document.getElementById('pnMontado').value;
    if (placa) {
      const pos = document.getElementById('pnPosicao').value, km = parseNumeroBR(g('pnKmMont'));
      if (!pos) return toast('Esse caminhão não tem posição livre.', true);
      if (isNaN(km) || km < 0) return toast('Informe o KM do caminhão na montagem.', true);
      Object.assign(dados, { placa, posicao: pos, kmMontagem: km });
    }
    ok = await pneusApi('addPneu', dados, 'Pneu cadastrado.');
    if (ok && placa) { pneusPlaca = placa; pneusPosSel = dados.posicao; renderPneus(); }
  }
  if (ok) closeModal('modalPneu');
}

/* ---------- MODAL: MONTAR ---------- */
function abrirModalMontar(opts) {
  opts = opts || {};
  const livres = db.pneus.filter(p => p.status === 'estoque');
  if (!livres.length) return toast('Não há pneus em estoque. Cadastre um pneu ou desmonte outro.', true);
  document.getElementById('pmPneu').innerHTML = livres.map(p => `<option value="${escHtml(p.codigo)}">${escHtml(p.codigo)} · ${escHtml(textoPneu(p))} · ${rotuloVida(p)}</option>`).join('');
  if (opts.codigo) document.getElementById('pmPneu').value = opts.codigo;
  document.getElementById('pmPlaca').innerHTML = db.veiculos.map(v => `<option value="${v.placa}">${v.placa}</option>`).join('');
  document.getElementById('pmPlaca').value = opts.placa || pneusPlaca || '';
  pmPlacaChange(opts.posicao);
  document.getElementById('pmData').value = hojeISO();
  openModal('modalPneuMontar');
}
function pmPlacaChange(posicao) {
  const placa = document.getElementById('pmPlaca').value;
  const livres = posicoesDoVeiculo(placa).filter(pos => !pneuNaPosicao(placa, pos.cod));
  document.getElementById('pmPosicao').innerHTML = livres.length ? livres.map(pos => `<option value="${pos.cod}">${pos.nome}</option>`).join('') : '<option value="">Sem posição livre</option>';
  if (typeof posicao === 'string' && livres.some(x => x.cod === posicao)) document.getElementById('pmPosicao').value = posicao;
  const v = db.veiculos.find(x => x.placa === placa);
  document.getElementById('pmKm').value = v && v.kmAtual > 0 ? Number(v.kmAtual).toLocaleString('pt-BR') : '';
}
async function confirmarMontar() {
  const codigo = document.getElementById('pmPneu').value, placa = document.getElementById('pmPlaca').value, posicao = document.getElementById('pmPosicao').value;
  const km = parseNumeroBR(document.getElementById('pmKm').value), data = document.getElementById('pmData').value;
  if (!posicao) return toast('Esse caminhão não tem posição livre.', true);
  if (isNaN(km) || km < 0) return toast('Informe o KM atual do caminhão.', true);
  if (await pneusApi('montarPneu', { codigo, placa, posicao, kmVeiculo: km, data }, 'Pneu montado.')) {
    closeModal('modalPneuMontar'); pneusPlaca = placa; pneusPosSel = posicao; renderPneus();
  }
}

/* ---------- MODAL: DESMONTAR ---------- */
function abrirModalDesmontar(codigo) {
  const p = db.pneus.find(x => x.codigo === codigo); if (!p) return;
  pneuDesmontarCodigo = codigo;
  const v = db.veiculos.find(x => x.placa === p.placa);
  document.getElementById('pdInfo').textContent = `Pneu ${p.codigo} · ${p.placa} · ${nomePosicao(p.placa, p.posicao)}`;
  document.getElementById('pdDestino').value = 'estoque';
  document.getElementById('pdKm').value = v && v.kmAtual > 0 ? Number(v.kmAtual).toLocaleString('pt-BR') : '';
  document.getElementById('pdData').value = hojeISO();
  openModal('modalPneuDesmontar');
}
async function confirmarDesmontar() {
  const p = db.pneus.find(x => x.codigo === pneuDesmontarCodigo); if (!p) return;
  const km = parseNumeroBR(document.getElementById('pdKm').value);
  if (isNaN(km) || km < 0) return toast('Informe o KM atual do caminhão.', true);
  if (km < (p.kmMontagem || 0)) return toast(`O KM informado é menor que o KM da montagem (${fmtKm(p.kmMontagem)}).`, true);
  const destino = document.getElementById('pdDestino').value;
  if (destino === 'descartado' && !(await confirmarCustom('Descartar pneu', `O pneu ${p.codigo} será marcado como descartado e não poderá mais ser montado. Continuar?`))) return;
  if (await pneusApi('desmontarPneu', { codigo: p.codigo, kmVeiculo: km, destino, data: document.getElementById('pdData').value }, 'Pneu desmontado.')) closeModal('modalPneuDesmontar');
}

/* ---------- MODAL: TROCAR DE POSIÇÃO ---------- */
function abrirModalMover(codigo) {
  const p = db.pneus.find(x => x.codigo === codigo); if (!p) return;
  pneuMoverCodigo = codigo;
  document.getElementById('pvInfo').textContent = `Pneu ${p.codigo} · ${p.placa} · hoje em ${nomePosicao(p.placa, p.posicao)}`;
  document.getElementById('pvPosicao').innerHTML = posicoesDoVeiculo(p.placa).filter(pos => pos.cod !== p.posicao).map(pos => {
    const oc = pneuNaPosicao(p.placa, pos.cod);
    return `<option value="${pos.cod}">${pos.nome}${oc ? ' (troca com o pneu ' + escHtml(oc.codigo) + ')' : ' (livre)'}</option>`;
  }).join('');
  openModal('modalPneuMover');
}
async function confirmarMover() {
  const p = db.pneus.find(x => x.codigo === pneuMoverCodigo); if (!p) return;
  const posicao = document.getElementById('pvPosicao').value;
  const v = db.veiculos.find(x => x.placa === p.placa);
  if (await pneusApi('moverPneuPosicao', { codigo: p.codigo, posicao, kmVeiculo: v ? v.kmAtual : '' }, 'Posição alterada.')) { closeModal('modalPneuMover'); pneusPosSel = posicao; renderPneus(); }
}

/* ---------- OUTRAS AÇÕES ---------- */
async function recaparPneu(codigo) {
  const p = db.pneus.find(x => x.codigo === codigo); if (!p) return;
  if ((p.recapagens || 0) >= PNEUS_CFG.maxRecapagens && !(await confirmarCustom('Recapagem', `O pneu ${codigo} já tem ${p.recapagens} recapagem(ns), o limite configurado. Registrar mais uma mesmo assim?`))) return;
  if (await confirmarCustom('Recapagem concluída', `Registrar que o pneu ${codigo} voltou da recapagem? O KM da vida atual volta a zero e o pneu fica em estoque.`)) await pneusApi('recaparPneu', { codigo }, 'Recapagem registrada.');
}
async function descartarPneu(codigo) {
  if (await confirmarCustom('Descartar pneu', `Marcar o pneu ${codigo} como descartado? Ele não poderá mais ser montado.`)) await pneusApi('descartarPneu', { codigo }, 'Pneu descartado.');
}
async function excluirPneu(codigo) {
  if (await confirmarCustom('Excluir pneu', `Excluir o cadastro do pneu ${codigo}? As movimentações antigas continuam na aba Mov_Pneus.`)) await pneusApi('deletePneu', { codigo }, 'Pneu excluído.');
}
