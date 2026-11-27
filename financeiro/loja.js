
const LOGO_FILIPPINI_DATA = 'data:image/jpeg;base64,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';
const brandLogo = document.getElementById('brandLogo');
if (brandLogo) brandLogo.src = LOGO_FILIPPINI_DATA;

/* =====================================================================
   FONTE DE DADOS: aba BASE da planilha Google Sheets publicada
   ===================================================================== */
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZhl2Vd3-lbag6mBOrtvNdlasYVf5BM8YN8HP9HE1NN-PRRwC_PKQHkOM6i9S9w/pub?gid=332649295&single=true&output=csv';
const GOOGLE_DEPOSITS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZhl2Vd3-lbag6mBOrtvNdlasYVf5BM8YN8HP9HE1NN-PRRwC_PKQHkOM6i9S9w/pub?gid=149122484&single=true&output=csv';
const STORAGE_DEPOSITOS_KEY = 'filippini_depositos_snapshot_v1';
let DEPOSITOS = [];
// Só validamos saldos quando há pelo menos um depósito real carregado da fonte.
let DEPOSITOS_CARREGADOS = false;
let criticalAlertKey = '';
let dismissedCriticalKey = '';
let ultimaProjecaoCB = null;
let ultimaLinhaCritica = null;
let ultimaProjecaoCritica = 0;
let ultimoPercentualCritico = 0;
let solicitacaoExcedenteAtual = null;
let alertSoundEnabled = true; // O alarme é padrão; o navegador pode exigir uma interação para liberar áudio.
let alertAudioContext = null;
let alertAlarmTimer = null;

let VIAGENS = [];
let LINHAS_BASE_INCOMPLETAS = 0;
let ORDENS_SEM_NUMERO = 0;

/* LEGS é gerado a partir de VIAGENS (não precisa ser digitado à mão) */
function gerarLegsDeViagens(viagens){
  const legs = [];
  viagens.forEach(v=>{
    v.kit.forEach(item=>{
      legs.push({
        viagem_id:v.viagem_id, data:v.data, motorista:v.motorista,
        loja:item.loja, destino:item.destino, ordem:item.ordem
      });
    });
  });
  return legs;
}
let LEGS = gerarLegsDeViagens(VIAGENS);

/* ---------- Utilitários de parsing da planilha ---------- */
function parseBRL(v){
  if(v==null || v==='') return 0;
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  const s=String(v).trim().replace(/R\$/gi,'').replace(/\s/g,'');
  if(!s) return 0;
  let clean=s;
  if(clean.includes(',')) clean=clean.replace(/\./g,'').replace(',', '.');
  else if((clean.match(/\./g)||[]).length>1) clean=clean.replace(/\./g,'');
  else if(/\.\d{3}$/.test(clean)) clean=clean.replace(/\./g,'');
  const n=Number(clean);
  return Number.isFinite(n)?n:0;
}
function parseLojaNum(v){
  if(v==null) return null;
  const s = String(v).trim();
  if(!s) return null;
  // rejeita valores não inteiros (ex: "21,9695" que às vezes aparece deslocado na planilha)
  if(!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
function parseOrdemNum(v){
  if(v==null) return null;
  const s = String(v).trim();
  if(!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}
function parseDataBR(str){
  if(!str) return null;
  const s=String(str).trim();
  let d,m,y;
  let match=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(match){[,d,m,y]=match;}
  else if((match=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))){[,y,m,d]=match;}
  else return null;
  const date=new Date(Date.UTC(Number(y),Number(m)-1,Number(d)));
  if(date.getUTCFullYear()!==Number(y)||date.getUTCMonth()!==Number(m)-1||date.getUTCDate()!==Number(d)) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/* Colunas da aba BASE (posição, 0-indexado):
   0 DATA DA OT, 1 MOTORISTA, 2 LOJA 1, 3 LOJA2, 4 CLUSTER, 5 LOJA3, 6 CLUSTER2,
   7 CUB TOTAL, 8 ORDEM, 9 VALOR FRETE, 10 VALOR TOTAL, 11 ORDEM2, 12 VALOR FRETE2,
   13 VALOR TOTAL2, 14 ORDEM3, 15 VALOR FRETE3, 16 VALOR TOTAL3, 17 FRETE TABELA, 18 VALOR TOTAL4
   Obs: não há coluna de cidade/destino na aba BASE, por isso as lojas aparecem
   identificadas apenas pelo número ("Loja 1234"). */
function buildFromCsvRows(rows){
  const viagens = [];
  LINHAS_BASE_INCOMPLETAS = 0;
  ORDENS_SEM_NUMERO = 0;
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(!r || r.length < 2) continue;
    const dataStr = parseDataBR(r[0]);
    if(!dataStr){ LINHAS_BASE_INCOMPLETAS++; continue; }
    const motorista = String(r[1]||'').trim();
    if(!motorista){ LINHAS_BASE_INCOMPLETAS++; continue; }

    const kit = [];
    const pares = [
      [parseLojaNum(r[2]), parseOrdemNum(r[8])],
      [parseLojaNum(r[3]), parseOrdemNum(r[11])],
      [parseLojaNum(r[5]), parseOrdemNum(r[14])]
    ];
    pares.forEach(([loja, ordem])=>{
      if(loja!=null){
        kit.push({loja, destino: `Loja ${loja}`, ordem});
        if(ordem==null) ORDENS_SEM_NUMERO++;
      }
    });
    if(!kit.length){ LINHAS_BASE_INCOMPLETAS++; continue; }

    let freteTabela = parseBRL(r[17]);
    let valorTotal4 = parseBRL(r[18]);
    if(!freteTabela) freteTabela = parseBRL(r[9]) + parseBRL(r[12]) + parseBRL(r[15]);
    if(!valorTotal4) valorTotal4 = parseBRL(r[10]) + parseBRL(r[13]) + parseBRL(r[16]);

    viagens.push({
      viagem_id: viagens.length+1,
      data: dataStr,
      motorista,
      kit,
      frete_tabela: freteTabela,
      valor_total4: valorTotal4
    });
  }
  return viagens;
}

/* ===== Hub Transmarina: os dados vêm do servidor (abas Loja_Base, Loja_Depositos, Loja_Destinos) ===== */
function hubFin(){ const p=window.parent&&window.parent.HubFin; if(!p) throw Error('Abra o Financeiro pelo Hub Transmarina.'); return p; }
const CAB_BASE=['DATA DA OT','MOTORISTA','LOJA 1','LOJA2','CLUSTER','LOJA3','CLUSTER2','CUB TOTAL','ORDEM','VALOR FRETE','VALOR TOTAL','ORDEM2','VALOR FRETE2','VALOR TOTAL2','ORDEM3','VALOR FRETE3','VALOR TOTAL3','FRETE TABELA','VALOR TOTAL4'];
let LOJA_PREVISAO={}, LOJA_DESTINOS={};
function descreverFonte(info){
  if(!info||!info.fonte) return 'Base do sistema';
  return info.fonte==='arquivo' ? `Arquivo "${info.arquivo||''}" carregado por ${info.quem||'—'} em ${info.quando||'—'}` : `Planilha online lida em ${info.quando||'—'}${info.conferido&&info.conferido!==info.quando?` · conferida às ${String(info.conferido).slice(11,16)}`:''}`;
}
function aplicarDadosHub(r){
  LOJA_DESTINOS={}; (r.destinos||[]).forEach(d=>{ const n=Number(d[0]); if(n&&d[1]) LOJA_DESTINOS[n]=String(d[1]); });
  const novas=buildFromCsvRows([CAB_BASE].concat((r.base||[]).map(l=>l.map(c=>c==null?'':c))));   // números seguem como número (parseBRL trata)
  novas.forEach(v=>v.kit.forEach(k=>{ if(LOJA_DESTINOS[k.loja]) k.destino=LOJA_DESTINOS[k.loja]; }));
  VIAGENS=novas; LEGS=gerarLegsDeViagens(VIAGENS);
  const deps=buildDepositosFromRows([['DATA DO DEPOSITO','VALOR']].concat(r.depositos||[])); deps.sort((a,b)=>a.data.localeCompare(b.data));
  conferirNovosDepositos(deps); DEPOSITOS=deps; DEPOSITOS_CARREGADOS=deps.length>0;
  LOJA_PREVISAO=r.previsao&&typeof r.previsao==='object'?r.previsao:{};
  const ign=Math.max(0,(r.base||[]).length-VIAGENS.length);
  document.getElementById('uploadStatus').textContent=`${descreverFonte(r.info)} · ${VIAGENS.length} viagem(ns) válidas${ign?` · ${ign} linha(s) não aproveitada(s)`:''}`;
  document.getElementById('depositStatus').textContent=DEPOSITOS.length?`${DEPOSITOS.length} depósito(s) na base${DEPOSITOS.length-new Set(DEPOSITOS.map(d=>d.data)).size?' · atenção: datas repetidas':''}`:'Nenhum depósito na base: saldos indisponíveis até carregar a aba PARCIAL DE FRETE.';
  populateFilters(); render();
}
async function carregarDaPlanilha(mostrarAlertaErro, online, fundo){
  const statusEl=document.getElementById('uploadStatus'), btn=document.getElementById('btnAtualizarPlanilha');
  if(btn){ btn.disabled=true; btn.textContent=online?'Lendo a planilha…':'Atualizando…'; }
  if(!VIAGENS.length) statusEl.textContent='Carregando a base…';
  try{
    const r=await hubFin().chamar(online?'financeiroLojaAtualizar':'financeiroLojaCarregar',{},fundo?{fundo:true}:undefined);
    aplicarDadosHub(r);
    return true;
  }catch(err){
    console.error(err);
    statusEl.textContent=`Falha ao atualizar às ${new Date().toLocaleTimeString('pt-BR')} · ${VIAGENS.length?`mantendo os últimos ${VIAGENS.length} dados`:'nenhum dado disponível'} · ${err.message}`;
    if(mostrarAlertaErro) alert('Não consegui atualizar a base da Loja.\n\nMotivo: '+err.message+'\n\nVocê ainda pode usar "Carregar arquivo" com a planilha FATURAMENT_LOJA.');
    return false;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Atualizar da planilha online'; }
  }
}

const EMAIL_EXCEDENTE = 'suprimentos.indiretos@casasbahia.com.br';
const CALENDARIO_CB = [
  ["2026-09-04","2026-09-07","2026-09-13"],
  ["2026-09-11","2026-09-14","2026-09-20"],
  ["2026-09-18","2026-09-21","2026-09-27"],
  ["2026-09-25","2026-09-28","2026-10-04"],
  ["2026-10-02","2026-10-05","2026-10-11"],
  ["2026-10-09","2026-10-12","2026-10-18"],
  ["2026-10-16","2026-10-19","2026-10-25"],
  ["2026-10-23","2026-10-26","2026-11-01"],
  ["2026-10-30","2026-11-02","2026-11-08"],
  ["2026-11-06","2026-11-09","2026-11-15"],
  ["2026-11-13","2026-11-16","2026-11-22"],
  ["2026-11-20","2026-11-23","2026-11-29"],
  ["2026-11-27","2026-11-30","2026-12-06"],
  ["2026-12-04","2026-12-07","2026-12-13"],
  ["2026-12-11","2026-12-14","2026-12-20"],
  ["2026-12-18","2026-12-21","2026-12-27"],
  ["2026-12-25","2026-12-28","2026-12-31"]
];

const fmtBRL = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = d => { const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; };
const uniqueSorted = arr => [...new Set(arr)].sort((a,b)=> a>b?1:a<b?-1:0);

let sortKeyV='viagem_id', sortDirV=1;
let sortKeyO='viagem_id', sortDirO=1;
let charts = {};

function populateFilters(){
  document.getElementById('fLoja').innerHTML = '<option value="">Todas as lojas</option>';
  document.getElementById('fMotorista').innerHTML = '<option value="">Todos os motoristas</option>';

  const lojas = uniqueSorted(LEGS.map(r=>r.loja));
  const lojaSel = document.getElementById('fLoja');
  lojas.forEach(l=>{
    const dest = LEGS.find(r=>r.loja===l).destino;
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = `${l} — ${dest}`;
    lojaSel.appendChild(opt);
  });
  const motoristas = uniqueSorted(VIAGENS.map(r=>r.motorista));
  const motSel = document.getElementById('fMotorista');
  motoristas.forEach(m=>{
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    motSel.appendChild(opt);
  });
  const dates = uniqueSorted(VIAGENS.map(r=>r.data));
  if(dates.length){
    document.getElementById('fDe').value = dates[0];
    document.getElementById('fAte').value = dates[dates.length-1];
    document.getElementById('fDe').min = dates[0]; document.getElementById('fDe').max = dates[dates.length-1];
    document.getElementById('fAte').min = dates[0]; document.getElementById('fAte').max = dates[dates.length-1];
    document.getElementById('periodTag').textContent = `${fmtDate(dates[0])} → ${fmtDate(dates[dates.length-1])}`;
  } else {
    document.getElementById('fDe').value = '';
    document.getElementById('fAte').value = '';
    document.getElementById('periodTag').textContent = 'Sem dados';
  }
}

function getFilteredViagens(){
  const loja = document.getElementById('fLoja').value;
  const mot = document.getElementById('fMotorista').value;
  const de = document.getElementById('fDe').value;
  const ate = document.getElementById('fAte').value;
  return VIAGENS.filter(v=>
    (!mot || v.motorista===mot) &&
    (!de || v.data>=de) &&
    (!ate || v.data<=ate) &&
    (!loja || v.kit.some(k=>String(k.loja)===loja))
  );
}

function getFilteredLegs(viagemIds){
  const loja = document.getElementById('fLoja').value;
  return LEGS.filter(l => viagemIds.has(l.viagem_id) && (!loja || String(l.loja)===loja));
}

function destroyChart(id){ if(charts[id]) charts[id].destroy(); }

function parseDepositDate(v){
  if(v==null||v==='') return null;
  if(v instanceof Date&&!isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  if(typeof v==='number'&&Number.isFinite(v)){
    const d=XLSX.SSF.parse_date_code(v);
    if(!d||!d.y||!d.m||!d.d) return null;
    return parseDataBR(`${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`);
  }
  const s=String(v).trim();
  const iso=parseDataBR(s);
  if(iso) return iso;
  const m=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if(!m) return null;
  const year=m[3]?(m[3].length===2?'20'+m[3]:m[3]):'2026';
  return parseDataBR(`${String(m[1]).padStart(2,'0')}/${String(m[2]).padStart(2,'0')}/${year}`);
}

function avisarNovosDepositos(novos){
  if(!novos.length) return;
  const total=novos.reduce((s,d)=>s+d.valor,0);
  const datas=[...new Set(novos.map(d=>d.data))].sort();
  const resumo=datas.length===1?`em ${fmtDate(datas[0])}`:`em ${datas.length} datas`;
  document.getElementById('depositToastText').textContent=`${novos.length} lançamento(s) novo(s) ${resumo}: ${fmtBRL(total)}.`;
  const toast=document.getElementById('depositToast');
  toast.hidden=false;
}
function conferirNovosDepositos(atual){
  let anterior=null;
  try{ anterior=localStorage.getItem(STORAGE_DEPOSITOS_KEY); }catch(_e){}
  const chaves=lista=>lista.map(d=>`${d.data}|${Number(d.valor).toFixed(2)}`).sort();
  const atuais=chaves(atual);
  if(anterior!==null){
    let antigas=[];
    try{antigas=JSON.parse(anterior)||[];}catch(_e){}
    const contagem=new Map();
    antigas.forEach(k=>contagem.set(k,(contagem.get(k)||0)+1));
    const novos=[];
    atuais.forEach(k=>{const n=contagem.get(k)||0;if(n)contagem.set(k,n-1);else{const [data,valor]=k.split('|');novos.push({data,valor:Number(valor)});}});
    avisarNovosDepositos(novos.filter(d=>d.valor>0));
  }
  try{localStorage.setItem(STORAGE_DEPOSITOS_KEY,JSON.stringify(atuais));}catch(_e){}
}
function tocarAlertaCritico(){
  if(!alertSoundEnabled||document.hidden||!criticalAlertKey||dismissedCriticalKey===criticalAlertKey) return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    alertAudioContext=alertAudioContext||new AudioCtx();
    if(alertAudioContext.state!=='running') return; // O som só toca após o navegador liberar áudio por interação do usuário.
    const inicio=alertAudioContext.currentTime;
    [880,660,880,660].forEach((freq,i)=>{
      const t=inicio+i*.2;const osc=alertAudioContext.createOscillator();const gain=alertAudioContext.createGain();
      osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(.16,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);
      osc.connect(gain);gain.connect(alertAudioContext.destination);osc.start(t);osc.stop(t+.18);
    });
  }catch(err){console.warn('Som de alerta indisponível neste navegador.',err);}
}
function liberarAudioCritico(){
  if(!alertSoundEnabled||!ultimaLinhaCritica||dismissedCriticalKey===criticalAlertKey) return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    alertAudioContext=alertAudioContext||new AudioCtx();
    if(alertAudioContext.state!=='running') alertAudioContext.resume().then(()=>{
      if(!document.getElementById('criticalOverlay').hidden&&dismissedCriticalKey!==criticalAlertKey) iniciarAlarmeCritico();
    }).catch(()=>{});
    else if(!document.getElementById('criticalOverlay').hidden) iniciarAlarmeCritico();
  }catch(err){console.warn('O navegador não liberou o som do alerta.',err);}
}
function iniciarAlarmeCritico(){
  if(!alertSoundEnabled||alertAlarmTimer!==null) return;
  tocarAlertaCritico();
  alertAlarmTimer=setInterval(tocarAlertaCritico,1400);
}
function pararAlarmeCritico(){
  if(alertAlarmTimer!==null){clearInterval(alertAlarmTimer);alertAlarmTimer=null;}
  if(alertAudioContext&&alertAudioContext.state==='running') alertAudioContext.suspend().catch(()=>{});
}
function obterVozFemininaPtBR(){
  if(!('speechSynthesis' in window)) return null;
  const vozes=window.speechSynthesis.getVoices();
  const portugues=vozes.filter(v=>/^pt[-_]br$/i.test(v.lang));
  const indiciosFemininos=/(female|feminina|woman|mulher|luciana|francisca|maria|camila|fernanda|google português do brasil)/i;
  return portugues.find(v=>indiciosFemininos.test(v.name))||portugues[0]||null;
}
function falarAlertaCritico(){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance) return false;
  const agora=new Date().getHours();
  const saudacao=agora<12?'Bom dia':agora<18?'Boa tarde':'Boa noite';
  const mensagem=document.getElementById('criticalMessage').textContent.trim();
  const saldo=document.getElementById('criticalBalance').textContent.trim();
  const viagens=document.getElementById('criticalTripsCovered').textContent.trim();
  const texto=`${saudacao}. Crítico. ${mensagem} Saldo atual após retiradas: ${saldo}. Viagens completas que o saldo cobre: ${viagens}.`;
  try{
    window.speechSynthesis.cancel();
    const fala=new SpeechSynthesisUtterance(texto);
    fala.lang='pt-BR';fala.rate=1.12;fala.pitch=1.03;fala.volume=1;
    const voz=obterVozFemininaPtBR();
    if(voz) fala.voice=voz;
    window.speechSynthesis.speak(fala);
    return true;
  }catch(err){console.warn('A fala do alerta não está disponível neste navegador.',err);return false;}
}
const EMAIL_PARA='suprimentos.indiretos@casasbahia.com.br';
const EMAIL_CC=['administrativo@transmarina.com.br','transmarina@transmarina.com.br'];
function montarQueryUrl(params){
  return Object.entries(params).map(([chave,valor])=>`${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`).join('&');
}

function obterSaldoAtualParaAntecipacao(){
  if(!DEPOSITOS_CARREGADOS) return {erro:'Saldo não validado: carregue os depósitos reais antes de preparar o e-mail.'};
  const agora=new Date();
  const hoje=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
  const linhas=calcularLinhasFinanceiras();
  const linha=linhas.find(l=>hoje>=l.dini&&hoje<=l.dfim);
  if(!linha||linha.totalDisponivel==null) return {erro:'Não foi possível localizar um saldo validado para a semana atual.'};
  const consumo=VIAGENS.filter(v=>v.data>=linha.dini&&v.data<=hoje).reduce((s,v)=>s+v.valor_total4,0);
  return {saldo:linha.totalDisponivel-consumo,linha,hoje};
}
function abrirModalEmailAntecipacao(){
  const overlay=document.getElementById('advanceEmailOverlay');
  const saldo=obterSaldoAtualParaAntecipacao();
  const status=document.getElementById('advanceEmailStatus');
  const enviar=document.getElementById('advanceEmailCompose');
  if(saldo.erro){
    document.getElementById('advanceEmailBalance').textContent='Saldo disponível: não validado';
    status.textContent=saldo.erro;enviar.disabled=true;
  }else{
    document.getElementById('advanceEmailBalance').textContent=`Saldo atual após retiradas: ${fmtBRL(saldo.saldo)}`;
    status.textContent='A retomada será informada conforme o calendário programado da próxima semana, respeitando o ciclo de antecipação.';
    enviar.disabled=false;
  }
  overlay.dataset.saldoValidado=saldo.erro?'0':'1';
  overlay.dataset.saldo=saldo.erro?'':String(saldo.saldo??'');
  document.getElementById('advanceEmailDate').value='';
  overlay.hidden=false;
  document.getElementById('advanceEmailDate').focus();
}
function prepararEmailAntecipacao(){
  const overlay=document.getElementById('advanceEmailOverlay');
  const data=document.getElementById('advanceEmailDate').value;
  const status=document.getElementById('advanceEmailStatus');
  if(overlay.dataset.saldoValidado!=='1'){status.textContent='O saldo precisa ser validado antes de preparar o e-mail.';return;}
  if(!data){status.textContent='Informe a data a partir da qual as operações serão afetadas.';document.getElementById('advanceEmailDate').focus();return;}
  const saldo=Number(overlay.dataset.saldo);
  const assunto=`Insuficiência de saldo para operações — a partir de ${fmtDate(data)}`;
  const corpo=`Prezados,\n\nInformamos que o saldo disponível para as operações, após as retiradas, é de ${fmtBRL(saldo)}. Devido à falta de saldo suficiente, não será possível manter as operações a partir de ${fmtDate(data)}.\n\nA retomada ocorrerá conforme o calendário programado da próxima semana, respeitando o ciclo de antecipação.\n\nAtenciosamente,\nTransmarina`;
  const query=montarQueryUrl({to:EMAIL_PARA,cc:EMAIL_CC.join(';'),subject:assunto,body:corpo,login_hint:'operacional@transmarina.com.br'});
  const link=document.createElement('a');link.href=`https://outlook.office.com/mail/deeplink/compose?${query}`;link.target='_blank';link.rel='noopener noreferrer';link.style.display='none';
  document.body.appendChild(link);link.click();link.remove();overlay.hidden=true;
}

function abrirEmailExcedente(){
  if(!solicitacaoExcedenteAtual) return;
  const x=solicitacaoExcedenteAtual;
  const assunto=`Solicitação de excedente de faturamento semanal — ${fmtDate(x.dini)} a ${fmtDate(x.dfim)}`;
  const corpo=`Prezados,\n\nEm ${new Date().toLocaleDateString('pt-BR')}, o saldo atual após as retiradas para a semana de ${fmtDate(x.dini)} a ${fmtDate(x.dfim)} é de ${fmtBRL(x.saldoAtual)}. O ticket médio é ${fmtBRL(x.ticketMedio)}, cobrindo ${x.viagensCobertas} viagem(ns) completa(s), com ${fmtBRL(x.saldoResidual)} restantes.\n\nCenário até sexta-feira (${fmtDate(x.sexta.data)}): ${x.sexta.viagens} viagem(ns) estimadas, consumo previsto de ${fmtBRL(x.sexta.consumo)}, saldo projetado de ${fmtBRL(x.sexta.saldo)} e excedente estimado de ${fmtBRL(x.sexta.excedente)}.\nCenário até sábado (${fmtDate(x.sabado.data)}): ${x.sabado.viagens} viagem(ns) estimadas, consumo previsto de ${fmtBRL(x.sabado.consumo)}, saldo projetado de ${fmtBRL(x.sabado.saldo)} e excedente estimado de ${fmtBRL(x.sabado.excedente)}.\n\nSolicitamos aprovação de até ${fmtBRL(x.valorSolicitado)} para cobrir o cenário de trabalho até sábado (aproximadamente ${x.viagensAdicionais} viagem(ns) pelo ticket médio atual).\n\nAtenciosamente,\nTransmarina`;
  const query=montarQueryUrl({to:EMAIL_PARA,cc:EMAIL_CC.join(';'),subject:assunto,body:corpo,login_hint:'operacional@transmarina.com.br'});
  const url=`https://outlook.office.com/mail/deeplink/compose?${query}`;
  const link=document.createElement('a');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.style.display='none';
  document.body.appendChild(link);link.click();link.remove();
}

function atualizarSirene(ligada){
  const botao=document.getElementById('sirenStatus');
  botao.classList.toggle('active',ligada);
  botao.setAttribute('aria-label',ligada?'Alerta crítico ativo. Clique para ver os detalhes.':'Nenhum alerta crítico ativo.');
  document.getElementById('sirenStatusText').textContent=ligada?'CRÍTICO — VER ALERTA':'SEM CRÍTICO';
  document.getElementById('sirenEmail').hidden=!(ligada&&solicitacaoExcedenteAtual);
}

function contarDiasOperacionais(inicioISO,fimISO){
  if(fimISO<inicioISO) return 0;
  let total=0;
  const d=new Date(`${inicioISO}T12:00:00`),fim=new Date(`${fimISO}T12:00:00`);
  while(d<=fim){if(d.getDay()!==0) total++;d.setDate(d.getDate()+1);}
  return total;
}
function somarDiasISO(iso,quantidade){
  const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+quantidade);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function calcularCenarioCritico(linha,hojeISO,viagensAteHoje,consumoAteHoje,tipo){
  const offset=tipo==='sexta'?4:5;
  const dataAlvoISO=somarDiasISO(linha.dini,offset);
  const alvo=dataAlvoISO>linha.dfim?linha.dfim:dataAlvoISO;
  const dataCorte=alvo<hojeISO?hojeISO:alvo;
  const diasOperados=new Set(viagensAteHoje.map(v=>v.data)).size;
  const ritmoViagens=diasOperados?viagensAteHoje.length/diasOperados:0;
  const ritmoConsumo=diasOperados?consumoAteHoje/diasOperados:0;
  const diasFuturos=contarDiasOperacionais(somarDiasISO(hojeISO,1),dataCorte);
  const viagensPrevistas=viagensAteHoje.length+Math.ceil(ritmoViagens*diasFuturos);
  const consumoPrevisto=consumoAteHoje+ritmoConsumo*diasFuturos;
  const saldo=linha.totalDisponivel-consumoPrevisto;
  return {data:dataCorte,viagens:viagensPrevistas,consumo:consumoPrevisto,saldo,excedente:Math.max(0,-saldo)};
}
function calcularCenariosAteSextaSabado(linha,hojeISO,viagensAteHoje,consumoAteHoje){
  return {
    sexta:calcularCenarioCritico(linha,hojeISO,viagensAteHoje,consumoAteHoje,'sexta'),
    sabado:calcularCenarioCritico(linha,hojeISO,viagensAteHoje,consumoAteHoje,'sabado')
  };
}
function mostrarAlertaCritico(linha,percentual,projecao){
  const agora=new Date(),hojeISO=`${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
  const inicio=new Date(`${linha.dini}T00:00:00`),fim=new Date(`${linha.dfim}T00:00:00`),hoje=new Date(`${hojeISO}T00:00:00`);
  const viagensAteHoje=VIAGENS.filter(v=>v.data>=linha.dini&&v.data<=hojeISO);
  const consumoAteHoje=viagensAteHoje.reduce((s,v)=>s+v.valor_total4,0);
  const ticketMedio=viagensAteHoje.length?consumoAteHoje/viagensAteHoje.length:0;
  const saldoAtual=linha.totalDisponivel-consumoAteHoje;
  const viagensCobertas=ticketMedio>0?Math.floor(Math.max(0,saldoAtual)/ticketMedio):0;
  const saldoResidual=ticketMedio>0?Math.max(0,saldoAtual)-viagensCobertas*ticketMedio:Math.max(0,saldoAtual);
  const sexta=calcularCenarioCritico(linha,hojeISO,viagensAteHoje,consumoAteHoje,'sexta');
  const sabado=calcularCenarioCritico(linha,hojeISO,viagensAteHoje,consumoAteHoje,'sabado');
  const maiorExcedente=Math.max(sexta.excedente,sabado.excedente);
  const chave=`${linha.dini}:${maiorExcedente>0?'excedido':'risco'}`;
  atualizarSirene(true);ultimaLinhaCritica=linha;ultimaProjecaoCritica=projecao;ultimoPercentualCritico=percentual;
  if(dismissedCriticalKey===chave)return;
  const modal=document.getElementById('criticalOverlay');
  const emRisco=[sexta,sabado].filter(c=>c.excedente>0).map(c=>fmtDate(c.data));
  document.getElementById('criticalMessage').textContent=maiorExcedente>0
    ?`No ritmo observado, o saldo pode não cobrir o trabalho até ${emRisco.join(' e ')} na semana de ${fmtDate(linha.dini)} a ${fmtDate(linha.dfim)}.`
    :`Saldo atual após retiradas e projeções de trabalho até sexta e sábado para a semana de ${fmtDate(linha.dini)} a ${fmtDate(linha.dfim)}.`;
  document.getElementById('criticalBalance').textContent=fmtBRL(saldoAtual);
  document.getElementById('criticalTicket').textContent=ticketMedio>0?fmtBRL(ticketMedio):'Sem dados';
  document.getElementById('criticalTripsCovered').textContent=ticketMedio>0?`${viagensCobertas} viagem(ns) · ${fmtBRL(saldoResidual)} restantes`:'Ticket indisponível';
  const preencher=(nome,c)=>{
    document.getElementById(`scenario${nome}Date`).textContent=fmtDate(c.data);
    document.getElementById(`scenario${nome}Trips`).textContent=ticketMedio>0?`${c.viagens} viagem(ns)`:'—';
    document.getElementById(`scenario${nome}Spend`).textContent=fmtBRL(c.consumo);
    document.getElementById(`scenario${nome}Balance`).textContent=fmtBRL(c.saldo);
    const status=document.getElementById(`scenario${nome}Status`);status.classList.toggle('danger',c.excedente>0);
    status.textContent=c.excedente>0?`EXCEDENTE ESTIMADO: ${fmtBRL(c.excedente)}`:'SALDO SUFICIENTE';
  };
  preencher('Friday',sexta);preencher('Saturday',sabado);
  document.getElementById('criticalValue').textContent=`Total disponível no período: ${fmtBRL(linha.totalDisponivel)} · Consumo registrado até hoje: ${fmtBRL(consumoAteHoje)}`;
  solicitacaoExcedenteAtual=maiorExcedente>0&&ticketMedio>0?{dini:linha.dini,dfim:linha.dfim,totalDisponivel:linha.totalDisponivel,saldoAtual,ticketMedio,viagensCobertas,saldoResidual,sexta,sabado,valorSolicitado:maiorExcedente,viagensAdicionais:Math.ceil(maiorExcedente/ticketMedio)}:null;
  document.getElementById('criticalRequest').hidden=!solicitacaoExcedenteAtual;
  document.getElementById('sirenEmail').hidden=!solicitacaoExcedenteAtual;
  modal.hidden=false;
  if(chave!==criticalAlertKey){criticalAlertKey=chave;iniciarAlarmeCritico();falarAlertaCritico();}
}

function ocultarAlertaCritico(){
  // O alarme só é reconhecido e silenciado após a pessoa abrir e ler a mensagem.
  dismissedCriticalKey=criticalAlertKey;
  document.getElementById('criticalOverlay').hidden=true;
  pararAlarmeCritico();
}
document.getElementById('criticalDismiss').addEventListener('click',ocultarAlertaCritico);
document.getElementById('criticalRequest').addEventListener('click',abrirEmailExcedente);

document.getElementById('advanceEmailOpen').addEventListener('click',abrirModalEmailAntecipacao);
document.getElementById('advanceEmailCancel').addEventListener('click',()=>{document.getElementById('advanceEmailOverlay').hidden=true;});
document.getElementById('advanceEmailCompose').addEventListener('click',prepararEmailAntecipacao);
document.getElementById('advanceEmailOverlay').addEventListener('click',e=>{if(e.target.id==='advanceEmailOverlay')e.currentTarget.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('advanceEmailOverlay').hidden=true;});

document.getElementById('sirenEmail').addEventListener('click',abrirEmailExcedente);
document.getElementById('sirenStatus').addEventListener('click',()=>{
  if(!document.getElementById('criticalOverlay').hidden) return;
  if(ultimaLinhaCritica){dismissedCriticalKey='';mostrarAlertaCritico(ultimaLinhaCritica,ultimoPercentualCritico,ultimaProjecaoCritica);}
});
document.getElementById('criticalSound').addEventListener('click',async()=>{
  alertSoundEnabled=true;
  try{localStorage.setItem('filippini_alert_sound_enabled','1');}catch(_e){}
  liberarAudioCritico();
  document.getElementById('criticalSound').textContent='Repetir aviso falado';
  if(!falarAlertaCritico()) document.getElementById('criticalSound').textContent='Fala indisponível neste navegador';
});
// Os navegadores bloqueiam áudio automático até uma interação. A primeira interação libera
// o som; em seguida, ele se repete enquanto o alerta estiver pendente e aberto.
document.addEventListener('pointerdown',liberarAudioCritico,{passive:true});
document.addEventListener('keydown',liberarAudioCritico);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&alertAlarmTimer!==null){liberarAudioCritico();tocarAlertaCritico();}});
document.getElementById('depositToastClose').addEventListener('click',()=>{document.getElementById('depositToast').hidden=true;});
try{alertSoundEnabled=localStorage.getItem('filippini_alert_sound_enabled')!=='0';}catch(_e){}
if(alertSoundEnabled) document.getElementById('criticalSound').textContent='Ativar áudio e fala';

function buildDepositosFromRows(rows){
  if(!Array.isArray(rows)||!rows.length) return [];
  const header=(rows[0]||[]).map(v=>String(v??'').trim().toLocaleUpperCase('pt-BR'));
  let idxData=header.findIndex(v=>/DATA|DEP[ÓO]SITO/.test(v));
  let idxValor=header.findIndex(v=>/VALOR|ANTECIPA|DEP[ÓO]SITO/.test(v) && v!==header[idxData]);
  if(idxData<0) idxData=0;
  if(idxValor<0 || idxValor===idxData) idxValor=1;
  return rows.slice(1).map(r=>({data:parseDepositDate(r?.[idxData]),valor:parseBRL(r?.[idxValor])}))
    .filter(d=>d.data && Number.isFinite(d.valor));
}


function calcularLinhasFinanceiras(){
  const porData=new Map();
  DEPOSITOS.forEach(d=>porData.set(d.data,(porData.get(d.data)||0)+d.valor));
  let saldoAnterior=0;
  return CALENDARIO_CB.map(([dataDeposito,dini,dfim])=>{
    const deposito=porData.get(dataDeposito)||0;
    const consumo=VIAGENS.filter(v=>v.data>=dini&&v.data<=dfim).reduce((s,v)=>s+v.valor_total4,0);
    // Ausência de dados de depósito não significa depósito zero nem saldo negativo.
    if(!DEPOSITOS_CARREGADOS){
      return {dataDeposito,dini,dfim,deposito:null,saldoAnterior:null,totalDisponivel:null,consumo,saldo:null,status:'SALDO NÃO VALIDADO — DEPÓSITOS INDISPONÍVEIS',cls:'status-vazio'};
    }
    const totalDisponivel=saldoAnterior+deposito;
    const saldo=totalDisponivel-consumo;
    let status,cls;
    if(!deposito&&consumo===0){status='SEM DADOS';cls='status-vazio';}
    else if(saldo<0){status='CONSUMO ACIMA DO DISPONÍVEL';cls='status-excedente';}
    else if(!deposito){status='DEPÓSITO NÃO LOCALIZADO';cls='status-vazio';}
    else{status='SALDO TRANSPORTADO';cls='status-ok';}
    const linha={dataDeposito,dini,dfim,deposito,saldoAnterior,totalDisponivel,consumo,saldo,status,cls};
    saldoAnterior=saldo;
    return linha;
  });
}

function renderCasasBahia(){
  const linhas=calcularLinhasFinanceiras();
  const alerta=document.getElementById('financeAlert');
  const hoje=new Date();
  const hojeLocal=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  const semanaAtual=linhas.find(l=>hojeLocal>=l.dini&&hojeLocal<=l.dfim);
  if(DEPOSITOS_CARREGADOS&&semanaAtual&&semanaAtual.totalDisponivel>0){
    const viagensAteHoje=VIAGENS.filter(v=>v.data>=semanaAtual.dini&&v.data<=hojeLocal);
    const consumoAteHoje=viagensAteHoje.reduce((s,v)=>s+v.valor_total4,0);
    const percentual=consumoAteHoje/semanaAtual.totalDisponivel;
    const cenarios=calcularCenariosAteSextaSabado(semanaAtual,hojeLocal,viagensAteHoje,consumoAteHoje);
    const maiorExcedente=Math.max(cenarios.sexta.excedente,cenarios.sabado.excedente);
    const projecao=consumoAteHoje+Math.max(0,cenarios.sabado.consumo-consumoAteHoje);
    if(semanaAtual.saldo<0||percentual>=.85||maiorExcedente>0) mostrarAlertaCritico(semanaAtual,percentual,projecao);
    else{criticalAlertKey='';dismissedCriticalKey='';ultimaLinhaCritica=null;solicitacaoExcedenteAtual=null;document.getElementById('criticalOverlay').hidden=true;atualizarSirene(false);}
  }else{criticalAlertKey='';dismissedCriticalKey='';ultimaLinhaCritica=null;solicitacaoExcedenteAtual=null;document.getElementById('criticalOverlay').hidden=true;atualizarSirene(false);}
  if(!DEPOSITOS_CARREGADOS){
    alerta.className='finance-alert neutral';
    alerta.textContent='Saldo não validado: os depósitos reais não foram carregados. O valor negativo exibido anteriormente resultava de subtrair o consumo sem os depósitos; não representa o saldo real. Carregue a aba de depósitos para calcular Crédito anterior e Total disponível.';
  }else if(linhas.some(l=>l.saldo<0)){
    const deficit=linhas.filter(l=>l.saldo<0);
    const somaDeficit=deficit.reduce((s,l)=>s+Math.abs(l.saldo),0);
    alerta.className='finance-alert danger';
    alerta.textContent=`Atenção: ${deficit.length} período(s) tiveram consumo acima do total disponível. Diferença negativa somada: ${fmtBRL(somaDeficit)}. Confira as linhas sinalizadas em vermelho.`;
  }else if(linhas.some(l=>!l.deposito)){
    const ausentes=linhas.filter(l=>!l.deposito).length;
    alerta.className='finance-alert warning';
    alerta.textContent=`Há ${ausentes} período(s) sem depósito localizado na aba publicada. Os saldos desses períodos podem estar incompletos; confira os lançamentos antes de tomar decisões.`;
  }else{
    alerta.className='finance-alert';
    alerta.textContent='Nenhum período com consumo acima do total disponível foi identificado nos dados carregados.';
  }
  const depTotal=DEPOSITOS.reduce((s,d)=>s+d.valor,0);
  document.getElementById('cbValorSemana').textContent=DEPOSITOS_CARREGADOS?fmtBRL(depTotal/DEPOSITOS.length):'—';
  document.getElementById('cbTotalPrevisto').textContent=DEPOSITOS_CARREGADOS?fmtBRL(depTotal):'—';
  document.getElementById('cbTotalFaturado').textContent=fmtBRL(linhas.reduce((s,l)=>s+l.consumo,0));
  renderProjecaoSemana();
  document.getElementById('tblCasasBahia').innerHTML=linhas.map(l=>`
    <tr>
      <td>${fmtDate(l.dataDeposito)}</td>
      <td>${fmtDate(l.dini)} a ${fmtDate(l.dfim)}</td>
      <td class="num">${l.deposito==null?'—':fmtBRL(l.deposito)}</td>
      <td class="num">${l.saldoAnterior==null?'—':fmtBRL(l.saldoAnterior)}</td>
      <td class="num"><b>${l.totalDisponivel==null?'Não validado':fmtBRL(l.totalDisponivel)}</b></td>
      <td class="num">${fmtBRL(l.consumo)}</td>
      <td class="num"><b>${l.saldo==null?'Não validado':fmtBRL(l.saldo)}</b></td>
      <td><span class="status-badge ${l.cls}">${l.status}</span></td>
    </tr>`).join('');
}

function renderProjecaoSemana(){
  const now=new Date();const hoje=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const filtroDe=document.getElementById('fDe').value,filtroAte=document.getElementById('fAte').value;
  let periodos=CALENDARIO_CB.filter(([,ini,fim])=>(!filtroAte||ini<=filtroAte)&&(!filtroDe||fim>=filtroDe));
  if(!periodos.length){const p=CALENDARIO_CB.find(([,ini,fim])=>hoje>=ini&&hoje<=fim)||CALENDARIO_CB.find(([,ini])=>ini>hoje)||CALENDARIO_CB.at(-1);if(p)periodos=[p];}
  if(!filtroDe&&!filtroAte&&periodos.length){const atual=periodos.find(([,ini,fim])=>hoje>=ini&&hoje<=fim);periodos=[atual||periodos.find(([,ini])=>ini>hoje)||periodos.at(-1)];}
  if(!periodos.length){['projTicket','projMetaViagens','projFaturado','projFalta','projViagensFaltam','projRitmo','proj6dias','proj7dias'].forEach(id=>document.getElementById(id).textContent='—');document.getElementById('projSemanaLabel').textContent='Não há períodos de crédito correspondentes ao filtro.';ultimaProjecaoCB=null;destroyChart('semana');return;}
  const linhasFinanceiras=calcularLinhasFinanceiras().map(l=>({data:l.dataDeposito,dini:l.dini,dfim:l.dfim,deposito:l.deposito,disponivel:l.totalDisponivel,consumo:l.consumo,saldo:l.saldo}));
  const linhas=linhasFinanceiras;
  const dini=periodos[0][1],dfim=periodos.at(-1)[2],recorteDe=filtroDe&&filtroDe>dini?filtroDe:dini,recorteAte=filtroAte&&filtroAte<dfim?filtroAte:dfim;
  const selecionadas=linhas.filter(l=>periodos.some(([,a,b])=>l.dini===a&&l.dfim===b));
  const metaDepositos=DEPOSITOS_CARREGADOS?selecionadas.reduce((s,l)=>s+(l.deposito||0),0)+(selecionadas[0]?.disponivel-selecionadas[0]?.deposito||0):null;
  const viagensPeriodo=VIAGENS.filter(v=>v.data>=recorteDe&&v.data<=recorteAte),faturado=viagensPeriodo.reduce((s,v)=>s+v.valor_total4,0),nViagensPeriodo=viagensPeriodo.length,ticketMedio=nViagensPeriodo?faturado/nViagensPeriodo:0;
  const metaViagens=metaDepositos!=null&&ticketMedio>0?Math.ceil(metaDepositos/ticketMedio):0,falta=metaDepositos!=null?Math.max(0,metaDepositos-faturado):null,viagensFaltam=ticketMedio>0&&falta!=null?Math.ceil(falta/ticketMedio):0;
  const qtd=periodos.length,label=qtd===1?`Semana de ${fmtDate(dini)} a ${fmtDate(dfim)}`:`${qtd} semanas: ${fmtDate(dini)} a ${fmtDate(dfim)}`;
  document.getElementById('projSemanaLabel').textContent=`${label} · Meta calculada pelo crédito disponível e pelos depósitos publicados no período.`;
  document.getElementById('projTicket').textContent=fmtBRL(ticketMedio);
  document.getElementById('projMetaViagens').textContent=metaDepositos==null?'Saldo não validado':metaDepositos>0?(ticketMedio>0?`${metaViagens} viagem(ns) · `:'')+fmtBRL(metaDepositos):'Depósito não localizado';
  document.getElementById('projFaturado').textContent=fmtBRL(faturado);document.getElementById('projFalta').textContent=metaDepositos==null?'Saldo não validado':metaDepositos>0?fmtBRL(falta):'—';
  document.getElementById('projViagensFaltam').textContent=metaDepositos==null?'Saldo não validado':metaDepositos<=0?'—':falta>0?(ticketMedio>0?`${viagensFaltam} viagem(ns)`:'Ticket indisponível'):'Crédito já coberto';
  const diasComOT=uniqueSorted(viagensPeriodo.map(v=>v.data)).length||1,ritmo=nViagensPeriodo/diasComOT,sugestao6=Math.round(ritmo*6),sugestao7=Math.round(ritmo*7);
  document.getElementById('projRitmo').textContent=`${ritmo.toFixed(1)} viagem(ns)/dia`;document.getElementById('proj6dias').textContent=`${sugestao6} viagens (${fmtBRL(sugestao6*ticketMedio)})`;document.getElementById('proj7dias').textContent=`${sugestao7} viagens (${fmtBRL(sugestao7*ticketMedio)})`;
  ultimaProjecaoCB={dini,dfim,ticketMedio,metaViagens,faturado,falta,viagensFaltam,ritmo,sugestao6,sugestao7,metaDepositos,periodos:qtd};
  const dias=[];let cursor=new Date(recorteDe+'T00:00:00');const fim=new Date(recorteAte+'T00:00:00');while(cursor<=fim){dias.push(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`);cursor.setDate(cursor.getDate()+1);}
  const porDia=new Map(dias.map(d=>[d,{n:0,valor:0}]));viagensPeriodo.forEach(v=>{const o=porDia.get(v.data);if(o){o.n++;o.valor+=v.valor_total4;}});
  destroyChart('semana');charts.semana=new Chart(document.getElementById('chartSemanaAtual'),{data:{labels:dias.map(fmtDate),datasets:[{type:'bar',label:'Viagens',data:dias.map(d=>porDia.get(d).n),backgroundColor:'rgba(229,57,53,.72)',borderRadius:5,yAxisID:'y'},{type:'line',label:'Faturamento',data:dias.map(d=>porDia.get(d).valor),borderColor:'#316CE6',backgroundColor:'#316CE6',pointRadius:3,tension:.28,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Viagens'},ticks:{precision:0}},y1:{beginAtZero:true,position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>fmtBRL(v)}}}}});
}

function celulaParaEnvio(c){
  if(c==null) return '';
  if(c instanceof Date&&!isNaN(c)) return `${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`;
  return typeof c==='number'?c:String(c);
}
function linhasDaAba(wb,nome){ const k=wb.SheetNames.find(n=>n.trim().toUpperCase()===nome); const sh=k?wb.Sheets[k]:null;   // a aba real é "PARCIAL DE FRETE " (com espaço)
  return sh?XLSX.utils.sheet_to_json(sh,{header:1,raw:true,defval:''}).slice(1).map(r=>r.map(celulaParaEnvio)):null; }
document.getElementById('fileUpload').addEventListener('change', function(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async function(ev){
    e.target.value='';
    let wb;
    try{ wb = XLSX.read(new Uint8Array(ev.target.result), {type:'array', cellDates:true}); }
    catch(err){ console.error(err); alert('Não consegui ler essa planilha: '+err.message); return; }
    const base=linhasDaAba(wb,'BASE');
    if(!base){ alert('Não encontrei uma aba chamada "BASE" nesta planilha.'); return; }
    const depositos=linhasDaAba(wb,'PARCIAL DE FRETE'), destinos=(linhasDaAba(wb,'TABELA DE FRETE')||[]).map(r=>[r[0],r[1]]);
    if(!confirm(`Substituir a base da Loja pelo arquivo "${file.name}"?\n\nTodos da gestão passam a ver estes dados.${depositos?'':'\n\nAtenção: o arquivo não tem a aba PARCIAL DE FRETE; os depósitos atuais continuam.'}`)) return;
    const statusEl=document.getElementById('uploadStatus'); statusEl.textContent=`Enviando "${file.name}"…`;
    try{
      await hubFin().chamar('financeiroLojaImportar',{base,depositos,destinos,arquivo:file.name});
      await carregarDaPlanilha(false,false);
    }catch(err){ console.error(err); statusEl.textContent='Não gravei o arquivo: '+err.message; alert('Não consegui gravar o arquivo no sistema: '+err.message); }
  };
  reader.readAsArrayBuffer(file);
});

function drawViagemDoc(doc, viagem, y0){
  const y = y0 || 18;
  doc.setFontSize(14); doc.setFont(undefined,'bold');
  doc.text('COBRANÇA DE FRETE', 14, y);
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(`Viagem: #${viagem.viagem_id}`, 14, y+8);
  doc.text(`Data: ${fmtDate(viagem.data)}`, 14, y+14);
  doc.text(`Motorista: ${viagem.motorista}`, 14, y+20);

  doc.autoTable({
    startY: y+26,
    head: [['Loja','Destino','Ordem']],
    body: viagem.kit.map(k=>[String(k.loja), k.destino, String(k.ordem ?? '-')]),
    styles:{fontSize:9, cellPadding:3},
    headStyles:{fillColor:[59,111,160], textColor:255},
    margin:{left:14, right:14}
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(`Frete tabela: ${fmtBRL(viagem.frete_tabela)}`, 14, finalY);
  doc.setFontSize(13); doc.setFont(undefined,'bold');
  doc.text(`VALOR TOTAL A COBRAR: ${fmtBRL(viagem.valor_total4)}`, 14, finalY+9);
  doc.setFont(undefined,'normal');
  return finalY+9;
}

function gerarPdfViagem(id){
  const viagem = VIAGENS.find(v=>v.viagem_id===id);
  if(!viagem) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  drawViagemDoc(doc, viagem);
  doc.save(`cobranca_viagem_${id}_${viagem.data}.pdf`);
}

function gerarPdfTodas(){
  const viagens = getFilteredViagens();
  if(!viagens.length){ alert('Nenhuma viagem no filtro atual.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  viagens.forEach((v,i)=>{
    if(i>0) doc.addPage();
    drawViagemDoc(doc, v);
  });
  const de = document.getElementById('fDe').value, ate = document.getElementById('fAte').value;
  doc.save(`cobranca_viagens_${de}_a_${ate}.pdf`);
}

function gerarPdfGeral(){
  const viagens=getFilteredViagens();
  if(!viagens.length){alert('Nenhuma viagem no filtro atual.');return;}
  const ids=new Set(viagens.map(v=>v.viagem_id));
  const legs=getFilteredLegs(ids);
  const de=document.getElementById('fDe').value,ate=document.getElementById('fAte').value;
  const totalFat=viagens.reduce((s,v)=>s+v.valor_total4,0);
  const totalFrete=viagens.reduce((s,v)=>s+v.frete_tabela,0);
  const nViagens=viagens.length;
  const nLojas=uniqueSorted(legs.map(l=>l.loja)).length;
  const ticket=totalFat/nViagens;
  const porLoja=new Map();
  legs.forEach(l=>porLoja.set(l.loja,(porLoja.get(l.loja)||0)+1));
  const lojasTop=[...porLoja.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const hoje=new Date();
  const hojeLocal=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
  const semana=CALENDARIO_CB.find(([,ini,fim])=>hojeLocal>=ini&&hojeLocal<=fim);
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const vermelho=[229,57,53], tinta=[27,31,34], cinza=[103,113,120], linha=[229,232,234];

  doc.setFillColor(...tinta);doc.rect(0,0,210,43,'F');
  doc.setFillColor(...vermelho);doc.rect(0,40,210,3,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);
  doc.text('RESUMO EXECUTIVO',14,18);
  doc.setFont('helvetica','normal');doc.setFontSize(10);
  doc.text('Faturamento e frete · Filippini Transportes',14,26);
  doc.setTextColor(220,224,226);doc.setFontSize(9);
  doc.text(`Período ${de?fmtDate(de):'inicial'} a ${ate?fmtDate(ate):'atual'}   |   Emitido ${new Date().toLocaleDateString('pt-BR')}`,14,34);

  const cards=[
    {x:14,w:57,label:'FATURAMENTO TOTAL',value:fmtBRL(totalFat)},
    {x:76.5,w:57,label:'FRETE TABELA',value:fmtBRL(totalFrete)},
    {x:139,w:57,label:'VIAGENS',value:String(nViagens)}
  ];
  cards.forEach(c=>{
    doc.setDrawColor(...linha);doc.setFillColor(248,249,250);doc.roundedRect(c.x,52,c.w,29,3,3,'FD');
    doc.setTextColor(...cinza);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text(c.label,c.x+4,60);
    doc.setTextColor(...tinta);doc.setFontSize(c.value.length>15?12:15);doc.text(c.value,c.x+4,72);
  });

  doc.setTextColor(...tinta);doc.setFont('helvetica','bold');doc.setFontSize(11);
  doc.text('LEITURA DO PERÍODO',14,96);
  doc.setDrawColor(...linha);doc.line(14,99,196,99);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(55,62,67);
  const leitura=`Foram realizadas ${nViagens} viagem(ns), atendendo ${nLojas} loja(s), com ticket médio de ${fmtBRL(ticket)}.`;
  doc.text(doc.splitTextToSize(leitura,178),14,107);
  if(semana){
    if(!DEPOSITOS_CARREGADOS){
    doc.setFillColor(245,246,247);doc.roundedRect(14,121,182,20,3,3,'F');
    doc.setTextColor(...cinza);doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text('Saldo não validado: depósitos reais indisponíveis. Não interpretar como saldo negativo.',19,133);
  }else{
    const dep=DEPOSITOS.filter(d=>d.data===semana[0]).reduce((s,d)=>s+d.valor,0);
    const saldoAnterior=(()=>{let saldo=0;for(const [data,dini,dfim] of CALENDARIO_CB){if(data===semana[0])break;const d=DEPOSITOS.filter(x=>x.data===data).reduce((a,x)=>a+x.valor,0);const c=VIAGENS.filter(v=>v.data>=dini&&v.data<=dfim).reduce((a,v)=>a+v.valor_total4,0);saldo+=d-c;}return saldo;})();
    const disponivel=saldoAnterior+dep;
    const consumo=VIAGENS.filter(v=>v.data>=semana[1]&&v.data<=semana[2]).reduce((a,v)=>a+v.valor_total4,0);
    const saldo=disponivel-consumo;
    const pct=disponivel>0?consumo/disponivel:0;
    const situacao=saldo<0?'CRÍTICO — consumo ultrapassou o disponível':pct>=.85?'RISCO — consumo atingiu ao menos 85% do disponível':'Saldo sob controle';
    const cor=saldo<0||pct>=.85?vermelho:[22,131,75];
    doc.setFillColor(saldo<0||pct>=.85?253:237,saldo<0||pct>=.85?236:248,saldo<0||pct>=.85?235:241);
    doc.roundedRect(14,121,182,28,3,3,'F');
    doc.setTextColor(...cor);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`FINANCEIRO · ${situacao}`,19,130);
    doc.setTextColor(...tinta);doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(`Semana ${fmtDate(semana[1])}–${fmtDate(semana[2])} · Disponível ${fmtBRL(disponivel)} · Consumo ${fmtBRL(consumo)} · Saldo ${fmtBRL(saldo)}`,19,140);
  }
  }else{
    doc.setFillColor(245,246,247);doc.roundedRect(14,121,182,20,3,3,'F');
    doc.setTextColor(...cinza);doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text('Não há semana financeira corrente cadastrada para exibir alerta de saldo.',19,133);
  }

  doc.setTextColor(...tinta);doc.setFont('helvetica','bold');doc.setFontSize(11);
  doc.text('LOJAS COM MAIS ATENDIMENTOS',14,164);
  doc.autoTable({
    startY:168,head:[['Loja','Atendimentos']],
    body:lojasTop.map(([loja,qtd])=>[`Loja ${loja}`,String(qtd)]),
    theme:'striped',styles:{font:'helvetica',fontSize:9,cellPadding:3,textColor:tinta},
    headStyles:{fillColor:tinta,textColor:255,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[247,248,249]},
    margin:{left:14,right:14},columnStyles:{1:{halign:'right',cellWidth:42}}
  });
  const rodapeY=Math.min((doc.lastAutoTable?.finalY||190)+13,278);
  doc.setDrawColor(...linha);doc.line(14,rodapeY-5,196,rodapeY-5);
  doc.setTextColor(...cinza);doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text(`Indicadores calculados com os filtros aplicados · Ticket médio ${fmtBRL(ticket)} · ${nLojas} loja(s) atendida(s)`,14,rodapeY);
  doc.save(`resumo_executivo_${de||'inicio'}_a_${ate||'atual'}.pdf`);
}


const CB_FORECAST_STORAGE='cb_forecast_trips_by_week_v1';
function cbForecastStore(){return JSON.parse(JSON.stringify(LOJA_PREVISAO||{}))}
let cbForecastTimer=null;
function cbForecastSave(data){LOJA_PREVISAO=data;clearTimeout(cbForecastTimer);cbForecastTimer=setTimeout(()=>{hubFin().chamar('financeiroLojaPrevisao',{previsao:LOJA_PREVISAO}).catch(e=>alert('A previsão não foi salva: '+e.message));},700);}
function cbIsoParts(iso){const [y,m,d]=iso.split('-').map(Number);return {y,m,d}}
function cbMonthStart(iso){const {y,m}=cbIsoParts(iso);return `${y}-${String(m).padStart(2,'0')}-01`}
function cbForecastQuantity(iso,pace,manual){
  if(Object.prototype.hasOwnProperty.call(manual,iso)&&manual[iso]!==''&&Number.isFinite(Number(manual[iso]))) return {quantity:Math.max(0,Math.floor(Number(manual[iso]))),basis:'Quantidade informada'};
  return {quantity:Math.max(0,Math.round(pace)),basis:'Estimativa pelo ritmo recente'};
}
function cbProjectionThrough(endISO,fromISO,pace,manual,ticket){
  let trips=0,usedManual=false;const day=new Date(`${fromISO}T12:00:00`),end=new Date(`${endISO}T12:00:00`);
  while(day<=end){const iso=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    if(day.getDay()!==0){const q=cbForecastQuantity(iso,pace,manual);trips+=q.quantity;usedManual ||= q.basis==='Quantidade informada';}
    day.setDate(day.getDate()+1);
  }
  const cost=trips*ticket;return {trips,cost,usedManual};
}
function renderFinancialReport(){
  const ids=['rptAvailable','rptDeposit','rptWeeklySpend','rptCurrentBalance','rptWeekTrips','rptWeekBilled','rptMonthTrips','rptMonthBilled','rptTicket','rptFridayTrips','rptFridayNeed','rptSaturdayTrips','rptSaturdayNeed','rptStopDate'];
  const index=Math.max(0,Math.min(CALENDARIO_CB.length-1,Number(document.getElementById('selectedWeek').value)||0));
  const [depositDate,ini,fim]=CALENDARIO_CB[index],line=calcularLinhasFinanceiras()[index];
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const inSelectedWeek=today>=ini&&today<=fim,cutoff=inSelectedWeek?today:(today<ini?ini:fim);
  const weeklyActual=VIAGENS.filter(v=>v.data>=ini&&v.data<=cutoff);
  const weeklySpend=weeklyActual.reduce((a,v)=>a+v.valor_total4,0),ticket=weeklyActual.length?weeklySpend/weeklyActual.length:0;
  const monthStart=cbMonthStart(ini),monthCutoff=today<monthStart?monthStart:(today<fim?today:fim);
  const monthly=VIAGENS.filter(v=>v.data>=monthStart&&v.data<=monthCutoff),monthlySpend=monthly.reduce((a,v)=>a+v.valor_total4,0);
  const manualAll=cbForecastStore(),manual=manualAll[ini]||{};
  const forecastBody=document.getElementById('cbForecastInputs');
  const nextISO=cbIsoDatePlus(cutoff,1),fridayCandidate=cbIsoDatePlus(ini,4),saturdayCandidate=cbIsoDatePlus(ini,5),weekFriday=fridayCandidate>fim?fim:fridayCandidate,weekSaturday=saturdayCandidate>fim?fim:saturdayCandidate;
  const recentDays=new Set(weeklyActual.filter(v=>v.valor_total4>=0).map(v=>v.data)).size;
  const pace=recentDays?weeklyActual.length/recentDays:0;
  const futureDates=[];let cur=new Date(`${nextISO}T12:00:00`),end=new Date(`${weekSaturday}T12:00:00`);
  while(cur<=end){if(cur.getDay()!==0)futureDates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);cur.setDate(cur.getDate()+1)}
  if(!futureDates.length){forecastBody.innerHTML='<tr><td colspan="3">Não há dias restantes nesta semana para informar previsão.</td></tr>';}
  else forecastBody.innerHTML=futureDates.map(d=>`<tr><td>${fmtDate(d)}</td><td><input type="number" min="0" step="1" inputmode="numeric" aria-label="Previsão de viagens para ${fmtDate(d)}" data-forecast-date="${d}" value="${manual[d]??''}" placeholder="Opcional"></td><td>${manual[d]!=null&&manual[d]!==''?'Quantidade informada':'Ritmo recente, se não informado'}</td></tr>`).join('');
  forecastBody.querySelectorAll('[data-forecast-date]').forEach(input=>input.addEventListener('change',()=>{const all=cbForecastStore();all[ini]=all[ini]||{};if(input.value==='')delete all[ini][input.dataset.forecastDate];else all[ini][input.dataset.forecastDate]=String(Math.max(0,Math.floor(Number(input.value)||0)));cbForecastSave(all);setTimeout(renderFinancialReport,0);}));   /* redesenha depois do blur: no meio dele o Chrome dá erro */
  document.getElementById('cbReportPeriod').textContent=`Semana selecionada: ${fmtDate(ini)} a ${fmtDate(fim)} · Período mensal: ${fmtDate(monthStart)} a ${fmtDate(monthCutoff)} · Data-base: ${fmtDate(cutoff)}`;
  document.getElementById('rptAvailable').textContent=line.totalDisponivel==null?'Não validado':fmtBRL(line.totalDisponivel);
  document.getElementById('rptDeposit').textContent=line.deposito==null?'Não validado':fmtBRL(line.deposito);
  document.getElementById('rptWeeklySpend').textContent=fmtBRL(weeklySpend);
  const balanceNow=line.totalDisponivel==null?null:line.totalDisponivel-weeklySpend;
  document.getElementById('rptCurrentBalance').textContent=balanceNow==null?'Não validado':fmtBRL(balanceNow);
  document.getElementById('rptWeekTrips').textContent=`${weeklyActual.length} viagem(ns)`;
  document.getElementById('rptWeekBilled').textContent=fmtBRL(weeklySpend);
  document.getElementById('rptMonthTrips').textContent=`${monthly.length} viagem(ns)`;
  document.getElementById('rptMonthBilled').textContent=fmtBRL(monthlySpend);
  document.getElementById('rptTicket').textContent=ticket>0?fmtBRL(ticket):'Indisponível';
  const friday=weekFriday,saturday=weekSaturday;
  const throughFriday=friday<nextISO?null:cbProjectionThrough(friday, nextISO, pace, manual, ticket);
  const throughSaturday=saturday<nextISO?null:cbProjectionThrough(saturday,nextISO,pace,manual,ticket);
  function setScenario(prefix,scenario){
    document.getElementById(prefix+'Trips').textContent=scenario?`${scenario.trips} viagem(ns) estimada(s)`:'Período encerrado';
    const needed=scenario&&balanceNow!=null&&ticket>0?Math.max(0,scenario.cost-Math.max(0,balanceNow)):null;
    document.getElementById(prefix+'Need').textContent=needed==null?(scenario&&balanceNow==null?'Saldo não validado':scenario&&ticket<=0?'Ticket indisponível':'—'):fmtBRL(needed);
    return {scenario,needed};
  }
  const fri=setScenario('rptFriday',throughFriday),sat=setScenario('rptSaturday',throughSaturday);
  document.getElementById('cbForecastGuidance').textContent=`Ticket médio calculado sobre ${weeklyActual.length} viagem(ns) da semana até ${fmtDate(cutoff)}. Ritmo recente: ${pace.toFixed(1)} viagem(ns) por dia com operação; em cada dia, a quantidade informada substitui a estimativa.`;
  let stopText='Não projetado até sábado',statusClass='ok';
  if(line.totalDisponivel==null){stopText='Não estimável — depósitos não validados';statusClass='';}
  else if(balanceNow<=0){
    let run=line.totalDisponivel,stop=null;const byDate=new Map();weeklyActual.forEach(v=>byDate.set(v.data,(byDate.get(v.data)||0)+v.valor_total4));
    [...byDate.keys()].sort().some(d=>{run-=byDate.get(d);if(run<=0){stop=d;return true}return false});stopText=stop?`${fmtDate(stop)} · estimativa pelo consumo registrado`:'Crédito esgotado; data não identificada nos registros';statusClass='alert';
  }else if(ticket>0){
    let run=balanceNow,stop=null;
    for(const d of futureDates){const q=cbForecastQuantity(d,pace,manual);run-=q.quantity*ticket;if(run<=0){stop=d;break}}
    if(stop){stopText=`${fmtDate(stop)} · estimativa`;statusClass='alert'}
  }else{stopText='Não estimável — ticket médio indisponível';statusClass=''}
  document.getElementById('rptStopDate').textContent=stopText;
  const validation=document.getElementById('cbReportValidation');
  let msg;
  if(!DEPOSITOS_CARREGADOS){msg='Saldo não validado: os depósitos reais não foram carregados. Consumo e viagens permanecem visíveis, mas saldo disponível, necessidade de crédito e data de esgotamento não devem ser usados para decisão.';statusClass='alert';}
  else if((fri.needed||0)>0||(sat.needed||0)>0){msg=`A projeção indica necessidade adicional de até ${fmtBRL(Math.max(fri.needed||0,sat.needed||0))} para manter a operação até sábado, conforme o cenário de viagens informado/estimado.`;statusClass='alert';}
  else msg='Com os dados carregados, o crédito atual cobre a projeção considerada até sábado. A previsão deve ser revisada quando houver nova quantidade de viagens ou depósitos.';
  validation.textContent=msg;validation.className='cb-report-status '+statusClass;
  document.getElementById('cbReportMethod').textContent=`Critério de cálculo: crédito anterior + depósito real − viagens realizadas; projeção pelo ticket médio semanal. Quantidades informadas manualmente prevalecem; dias sem informação usam o ritmo recente. Data-base: ${fmtDate(cutoff)}. Relatório atualizado em ${now.toLocaleString('pt-BR')}.`;
}
function cbIsoDatePlus(iso,days){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

function getSelectedCBWeek(){
  const index=Math.max(0,Math.min(CALENDARIO_CB.length-1,Number(document.getElementById('selectedWeek')?.value)||0));
  return CALENDARIO_CB[index];
}
function getCBWeekTrips(){
  const week=getSelectedCBWeek();
  return {week,trips:VIAGENS.filter(v=>v.data>=week[1]&&v.data<=week[2]).sort((a,b)=>a.data.localeCompare(b.data)||a.viagem_id-b.viagem_id)};
}
function cbTripStoreText(v){
  return v.kit.map(k=>`${k.destino||`Loja ${k.loja}`}${k.ordem!=null?` · OT ${k.ordem}`:''}`).join(' | ');
}
function renderCBTrips(){
  const {week,trips}=getCBWeekTrips();
  const body=document.getElementById('tblCBTrips');
  if(!body)return;
  document.getElementById('cbTripsPeriod').textContent=`Semana do relatório: ${fmtDate(week[1])} a ${fmtDate(week[2])} · Relação extraída da BASE, sem aplicar outros filtros.`;
  body.innerHTML=trips.map(v=>`<tr><td class="viagem-id">#${v.viagem_id}</td><td>${fmtDate(v.data)}</td><td>${v.motorista}</td><td>${cbTripStoreText(v)}</td><td class="num">${fmtBRL(v.frete_tabela)}</td><td class="num">${fmtBRL(v.valor_total4)}</td></tr>`).join('');
  const totalFrete=trips.reduce((sum,v)=>sum+v.frete_tabela,0),totalValor=trips.reduce((sum,v)=>sum+v.valor_total4,0);
  document.getElementById('tblCBTripsFoot').innerHTML=trips.length?`<tr><th colspan="4">Total da semana</th><th class="num">${fmtBRL(totalFrete)}</th><th class="num">${fmtBRL(totalValor)}</th></tr>`:'';
  document.getElementById('cbTripsCount').textContent=trips.length?`${trips.length} viagem(ns) no período · Valores somados uma vez por viagem.`:'Nenhuma viagem encontrada para esta semana nos dados carregados. Atualize a BASE para conferir o período.';
}
function gerarExcelViagensCB(){
  const {week,trips}=getCBWeekTrips();
  if(!trips.length){alert('Não há viagens carregadas para a semana selecionada. Atualize os dados da BASE e tente novamente.');return;}
  if(!window.XLSX){alert('A exportação para Excel não está disponível neste momento.');return;}
  const rows=trips.map(v=>({
    'Viagem':`#${v.viagem_id}`,'Data':fmtDate(v.data),'Motorista':v.motorista,
    'Lojas e ordens':cbTripStoreText(v),'Frete tabela (R$)':Number(v.frete_tabela||0),
    'Valor total (R$)':Number(v.valor_total4||0)
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:14},{wch:32},{wch:58},{wch:20},{wch:20}];
  const end=XLSX.utils.encode_cell({r:rows.length,c:0});
  XLSX.utils.sheet_add_aoa(ws,[['TOTAL DA SEMANA','', '', '',trips.reduce((s,v)=>s+Number(v.frete_tabela||0),0),trips.reduce((s,v)=>s+Number(v.valor_total4||0),0)]],{origin:end});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Viagens da semana');
  wb.Props={Title:'Viagens Casas Bahia - semana selecionada',Subject:`${fmtDate(week[1])} a ${fmtDate(week[2])}`,Author:'Filippini Transportes'};
  XLSX.writeFile(wb,`viagens_CB_${week[1]}_a_${week[2]}.xlsx`);
}

function initWeekSelector(){
  const el=document.getElementById('selectedWeek'),reportEl=document.getElementById('cbReportWeek');
  const today=new Date(),iso=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const options=CALENDARIO_CB.map(([d,ini,fim],i)=>`<option value="${i}">Semana ${fmtDate(ini)} a ${fmtDate(fim)}</option>`).join('');
  el.innerHTML=options;if(reportEl)reportEl.innerHTML=options;
  let i=CALENDARIO_CB.findIndex(([,ini,fim])=>iso>=ini&&iso<=fim);
  if(i<0)i=CALENDARIO_CB.findIndex(([,ini])=>ini>iso);
  if(i<0)i=CALENDARIO_CB.length-1;
  el.value=String(i);if(reportEl)reportEl.value=String(i);
}
function renderWeeklyIndicators(){
  if(!document.getElementById('selectedWeek')) return;
  const index=Math.max(0,Math.min(CALENDARIO_CB.length-1,Number(document.getElementById('selectedWeek').value)||0));
  const [,ini,fim]=CALENDARIO_CB[index],prev=CALENDARIO_CB[index-1];
  const rows=VIAGENS.filter(v=>v.data>=ini&&v.data<=fim);
  const prior=prev?VIAGENS.filter(v=>v.data>=prev[1]&&v.data<=prev[2]):[];
  const n=rows.length,pn=prior.length,delta=n-pn;
  const stores=[...new Set(rows.flatMap(v=>v.kit.map(k=>String(k.loja))))];
  // Classify each store using the count of distinct OTs in the entire BASE, per agreed rule.
  const otsByStore=new Map();
  VIAGENS.forEach(v=>v.kit.forEach(k=>{
    const key=String(k.loja);if(!otsByStore.has(key))otsByStore.set(key,new Set());
    otsByStore.get(key).add(v.viagem_id);
  }));
  let single=0,cluster=0;
  stores.forEach(k=>(otsByStore.get(k)?.size||0)>1?cluster++:single++);
  document.getElementById('opWeekOTs').textContent=String(n);
  document.getElementById('opWeekCompare').textContent=prev?`${delta>0?'+':''}${delta} · anterior: ${pn}`:'Primeira semana';
  document.getElementById('opWeekStores').textContent=String(stores.length);
  document.getElementById('opWeekSingle').textContent=String(single);
  document.getElementById('opWeekCluster').textContent=String(cluster);
  const unmatchedDeposits=DEPOSITOS.filter(d=>!CALENDARIO_CB.some(([date])=>date===d.data)).length;
  const exceptions=LINHAS_BASE_INCOMPLETAS+ORDENS_SEM_NUMERO+unmatchedDeposits;
  document.getElementById('opWeekIssues').textContent=exceptions?`${exceptions} item(ns)`:'Nenhuma';
  const notes=[];
  if(LINHAS_BASE_INCOMPLETAS)notes.push(`${LINHAS_BASE_INCOMPLETAS} linha(s) da BASE não aproveitada(s)`);
  if(ORDENS_SEM_NUMERO)notes.push(`${ORDENS_SEM_NUMERO} loja(s) sem número de ordem`);
  if(unmatchedDeposits)notes.push(`${unmatchedDeposits} depósito(s) fora do calendário semanal`);
  document.getElementById('opExceptions').textContent=notes.join(' · ')||'Nenhuma exceção identificada nos campos disponíveis.';

  const line=calcularLinhasFinanceiras()[index];
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const current=today>=ini&&today<=fim, past=today>fim, future=today<ini;
  const consumed=current?VIAGENS.filter(v=>v.data>=ini&&v.data<=today).reduce((a,v)=>a+v.valor_total4,0):line.consumo;
  const ticketRows=rows.filter(v=>!current||v.data<=today);
  const avg=ticketRows.length?ticketRows.reduce((a,v)=>a+v.valor_total4,0)/ticketRows.length:0;
  let possible='—';
  if(!DEPOSITOS_CARREGADOS)possible='Saldo não validado';
  else if(past)possible='Semana encerrada';
  else if(future&&!avg)possible='Aguardando viagens';
  else if(avg>0)possible=`${Math.floor(Math.max(0,line.totalDisponivel-consumed)/avg)} viagem(ns)`;
  document.getElementById('weekBilled').textContent=fmtBRL(line.consumo);
  document.getElementById('weekDeposit').textContent=line.deposito==null?'Não validado':fmtBRL(line.deposito);
  document.getElementById('weekPreviousCredit').textContent=line.saldoAnterior==null?'Não validado':fmtBRL(line.saldoAnterior);
  document.getElementById('weekAvailable').textContent=line.totalDisponivel==null?'Não validado':fmtBRL(line.totalDisponivel);
  document.getElementById('weekInterval').textContent=`${fmtDate(ini)} a ${fmtDate(fim)}`;
  document.getElementById('weekConsumption').textContent=fmtBRL(line.consumo);
  document.getElementById('weekClosingCredit').textContent=line.saldo==null?'Não validado':fmtBRL(line.saldo);
  document.getElementById('weekTripsPossible').textContent=possible;
  document.getElementById('weekTicketNote').textContent=avg>0?`Ticket médio: ${fmtBRL(avg)}`:'Ticket médio indisponível sem viagens';
   renderFinancialReport();
  document.querySelector('.balance-equation').innerHTML=!DEPOSITOS_CARREGADOS?'<b>Saldo não validado:</b> os depósitos reais não foram carregados. Crédito anterior, total disponível, crédito após consumo e viagens possíveis ficam sem valor até validar a aba de depósitos. O consumo da semana permanece visível separadamente.':`<b>Ciclo do crédito:</b> ${fmtBRL(line.saldoAnterior)} de crédito anterior + ${fmtBRL(line.deposito)} de depósito = ${fmtBRL(line.totalDisponivel)} disponíveis; menos ${fmtBRL(current?consumed:line.consumo)} consumidos${current?' até hoje':''} = ${fmtBRL(line.totalDisponivel-(current?consumed:line.consumo))}. As viagens possíveis usam o ticket médio das viagens registradas na semana.`;
}

function render(){
  const viagens = getFilteredViagens();
  const viagemIds = new Set(viagens.map(v=>v.viagem_id));
  const legs = getFilteredLegs(viagemIds);

  const totalFat = viagens.reduce((s,v)=>s+v.valor_total4,0);
  const totalFrete = viagens.reduce((s,v)=>s+v.frete_tabela,0);
  const nViagens = viagens.length;
  const nEntregasKit = legs.length;
  const nLojas = uniqueSorted(legs.map(l=>l.loja)).length;
  const ticket = nViagens ? totalFat/nViagens : 0;

  // Os KPIs agregados antigos foram substituídos pelos indicadores da semana selecionada.

  const byLoja = new Map();
  legs.forEach(l=>{
    if(!byLoja.has(l.loja)) byLoja.set(l.loja, {n:0, destino:l.destino});
    byLoja.get(l.loja).n += 1;
  });
  const valorPorLoja = new Map();
  viagens.forEach(v=>{
    const partes = v.kit.length || 1;
    const fatia = v.valor_total4 / partes;
    v.kit.forEach(k=>{
      valorPorLoja.set(k.loja, (valorPorLoja.get(k.loja)||0) + fatia);
    });
  });
  const lojaKeys = [...byLoja.keys()].sort((a,b)=>(valorPorLoja.get(b)||0)-(valorPorLoja.get(a)||0));
  destroyChart('loja');
  charts.loja = new Chart(document.getElementById('chartLoja'), {
    type:'bar',
    data:{ labels: lojaKeys.map(k=>`${k}`),
      datasets:[{ data: lojaKeys.map(k=>valorPorLoja.get(k)||0), backgroundColor:'#E53935', borderRadius:1, barPercentage:0.75 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},
        tooltip:{callbacks:{
          title:(items)=> `Loja ${items[0].label} — ${byLoja.get(Number(items[0].label)).destino}`,
          label:(item)=> fmtBRL(item.raw) }}},
      scales:{ x:{ticks:{callback:v=>'R$ '+v.toLocaleString('pt-BR')},grid:{color:'#EEF1F4'}}, y:{ticks:{font:{size:10.5}},grid:{display:false}} } }
  });

  const byData = new Map();
  viagens.forEach(v=>{
    if(!byData.has(v.data)) byData.set(v.data, {total:0, frete:0});
    const o = byData.get(v.data); o.total += v.valor_total4; o.frete += v.frete_tabela;
  });
  const dateKeys = [...byData.keys()].sort();
  destroyChart('data');
  charts.data = new Chart(document.getElementById('chartData'), {
    type:'line',
    data:{ labels: dateKeys.map(fmtDate),
      datasets:[
        {label:'Valor total', data: dateKeys.map(k=>byData.get(k).total), borderColor:'#E53935', backgroundColor:'#E53935', tension:.25, pointRadius:3},
        {label:'Frete tabela', data: dateKeys.map(k=>byData.get(k).frete), borderColor:'#316CE6', backgroundColor:'#316CE6', tension:.25, pointRadius:3, borderDash:[4,3]}
      ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11}}},
        tooltip:{callbacks:{label:(item)=>`${item.dataset.label}: ${fmtBRL(item.raw)}`}}},
      scales:{ y:{ticks:{callback:v=>'R$ '+v.toLocaleString('pt-BR')},grid:{color:'#EEF1F4'}}, x:{grid:{display:false}} } }
  });

  const byMot = new Map();
  viagens.forEach(v=>{
    if(!byMot.has(v.motorista)) byMot.set(v.motorista, 0);
    byMot.set(v.motorista, byMot.get(v.motorista)+v.valor_total4);
  });
  const motKeys = [...byMot.keys()].sort((a,b)=>byMot.get(b)-byMot.get(a));
  destroyChart('mot');
  charts.mot = new Chart(document.getElementById('chartMotorista'), {
    type:'bar',
    data:{ labels: motKeys.map(k=>k.trim()),
      datasets:[{ data: motKeys.map(k=>byMot.get(k)), backgroundColor:'#C98700', borderRadius:1, barPercentage:0.7 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(item)=>fmtBRL(item.raw)}}},
      scales:{ x:{ticks:{callback:v=>'R$ '+v.toLocaleString('pt-BR')},grid:{color:'#EEF1F4'}}, y:{ticks:{font:{size:10.5}},grid:{display:false}} } }
  });

  const sortedV = [...viagens].sort((a,b)=>{
    let va=a[sortKeyV], vb=b[sortKeyV];
    if(typeof va==='string') return sortDirV*va.localeCompare(vb);
    return sortDirV*(va-vb);
  });
  document.getElementById('tblViagens').innerHTML = sortedV.map(v=>`
    <tr>
      <td class="viagem-id">#${v.viagem_id}</td>
      <td>${fmtDate(v.data)}</td>
      <td>${v.motorista}</td>
      <td>${v.kit.map(k=>`<span class="kit-badge"><b>${k.loja}</b> ${k.destino.split(' - ')[0]}${k.ordem?` · ord ${k.ordem}`:''}</span>`).join('')}</td>
      <td class="num">${fmtBRL(v.frete_tabela)}</td>
      <td class="num">${fmtBRL(v.valor_total4)}</td>
      <td><button class="btn-pdf-row" onclick="gerarPdfViagem(${v.viagem_id})">PDF</button></td>
    </tr>`).join('');
  document.getElementById('rowCountViagens').textContent = `${sortedV.length} viagem(ns) exibida(s)`;

  const sortedO = [...legs].sort((a,b)=>{
    let va=a[sortKeyO], vb=b[sortKeyO];
    if(typeof va==='string') return sortDirO*va.localeCompare(vb);
    return sortDirO*(va-vb);
  });
  document.getElementById('tblOrdens').innerHTML = sortedO.map(l=>`
    <tr>
      <td class="viagem-id">#${l.viagem_id}</td>
      <td>${fmtDate(l.data)}</td>
      <td>${l.motorista}</td>
      <td>${l.loja}</td>
      <td>${l.destino}</td>
      <td>${l.ordem ?? '-'}</td>
    </tr>`).join('');
  document.getElementById('rowCountOrdens').textContent = `${sortedO.length} loja(s)/ordem(ns) exibida(s)`;

  renderCasasBahia();
  renderWeeklyIndicators();
  renderCBTrips();
}

document.querySelectorAll('#tab-viagens thead th[data-k]').forEach(th=>{
  th.addEventListener('click', ()=>{
    const k = th.dataset.k;
    if(sortKeyV===k) sortDirV*=-1; else { sortKeyV=k; sortDirV=1; }
    render();
  });
});
document.querySelectorAll('#tab-ordens thead th[data-k]').forEach(th=>{
  th.addEventListener('click', ()=>{
    const k = th.dataset.k;
    if(sortKeyO===k) sortDirO*=-1; else { sortKeyO=k; sortDirO=1; }
    render();
  });
});

function selecionarVisao(view){
  document.querySelectorAll('.view-tab,[data-view]').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
  const financeiro=view==='financeiro',cb=view==='cb';
  document.getElementById('operationalOverview').hidden=financeiro||cb;
  document.getElementById('tab-casasbahia').hidden=!financeiro;
  document.getElementById('tab-operacional').hidden=financeiro||cb;
  document.getElementById('detailPanel').hidden=cb;
  document.getElementById('cbReportView').hidden=!cb;
  document.getElementById('tab-casasbahia').classList.toggle('active',financeiro);
  document.getElementById('tab-operacional').classList.toggle('active',!financeiro&&!cb);
  if(!financeiro&&!cb) setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),0);
}
document.querySelectorAll('[data-view]').forEach(tab=>tab.addEventListener('click',()=>selecionarVisao(tab.dataset.view)));
document.getElementById('selectedWeek').addEventListener('change',()=>{document.getElementById('cbReportWeek').value=document.getElementById('selectedWeek').value;render();});
document.getElementById('cbReportWeek').addEventListener('change',()=>{document.getElementById('selectedWeek').value=document.getElementById('cbReportWeek').value;render();});
document.getElementById('cbPrintReport').addEventListener('click',()=>window.print());
document.getElementById('cbExportTripsExcel').addEventListener('click',gerarExcelViagensCB);
document.getElementById('cbClearForecast').addEventListener('click',()=>{const index=Number(document.getElementById('selectedWeek').value)||0,ini=CALENDARIO_CB[index]?.[1];const all=cbForecastStore();if(ini)delete all[ini];cbForecastSave(all);renderFinancialReport();});
document.querySelectorAll('[data-subtab]').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('[data-subtab]').forEach(t=>t.classList.toggle('active',t===tab));
  ['viagens','ordens'].forEach(id=>{const pane=document.getElementById('tab-'+id);pane.classList.toggle('active',id===tab.dataset.subtab);});
}));

['fLoja','fMotorista','fDe','fAte'].forEach(id=>{
  document.getElementById(id).addEventListener('change', render);
});
document.getElementById('btnClear').addEventListener('click', ()=>{
  document.getElementById('fLoja').value='';
  document.getElementById('fMotorista').value='';
  const dates = uniqueSorted(VIAGENS.map(r=>r.data));
  if(dates.length){
    document.getElementById('fDe').value = dates[0];
    document.getElementById('fAte').value = dates[dates.length-1];
  }
  render();
});

document.getElementById('btnPdfAll').addEventListener('click', gerarPdfTodas);
document.getElementById('btnPdfGeral').addEventListener('click', gerarPdfGeral);
document.getElementById('btnAtualizarPlanilha').addEventListener('click', ()=>carregarDaPlanilha(true,true));

async function iniciar(){
  initWeekSelector();
  populateFilters();
  render();
  await carregarDaPlanilha(false,false);
}
iniciar();
// confere a base a cada 5 min com a tela visível (o robô do servidor lê a planilha a cada 30 min)
setInterval(()=>{if(!document.hidden) carregarDaPlanilha(false,false,true);},5*60*1000);   // atualização automática: segundo plano
// o Hub troca a aba (Operacional, Financeiro, CB) pela barra de cima
window.addEventListener('message',e=>{ if(e.origin!==location.origin||!e.data||e.data.tipo!=='fin-aba') return; if(['operacional','financeiro','cb'].indexOf(e.data.aba)>=0) selecionarVisao(e.data.aba); });
try{ window.parent.postMessage({tipo:'fin-pronto',area:'loja'},location.origin); }catch(e){}
