/* Helpers de interface. NUNCA se usa innerHTML com dados: tudo entra por textContent (bloqueia XSS). */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function h(tag, attrs, ...filhos) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  filhos.flat(Infinity).forEach(f => { if (f == null || f === false) return; el.append(f.nodeType ? f : document.createTextNode(String(f))); });
  return el;
}
function limpar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

let _toastT;
function toast(msg, erro) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (erro ? ' err' : ''); t.hidden = false;
  clearTimeout(_toastT); _toastT = setTimeout(() => { t.hidden = true; }, erro ? 5000 : 2800);
}

/** Abre um modal; devolve {el, fechar}. conteudo = nó DOM. */
function abrirModal(titulo, conteudo, op) {
  op = op || {};
  const ov = h('div', { class: 'overlay show' + (op.centro ? ' center' : '') });
  const fechar = () => { ov.remove(); if (op.aoFechar) op.aoFechar(); };
  const caixa = h('div', { class: 'modal' + (op.largo ? ' wide' : '') }, titulo ? h('h3', { text: titulo }) : null, conteudo);
  ov.append(caixa);
  ov.addEventListener('mousedown', e => { if (e.target === ov && !op.fixo) fechar(); });
  document.body.append(ov);
  return { el: caixa, fechar, overlay: ov };
}
function mensagem(el, texto, tipo) { el.textContent = texto || ''; el.className = 'msg' + (texto ? ' show ' + (tipo || 'err') : ''); }
function campo(rotulo, input, dica) { return h('div', { class: 'field' }, h('label', { text: rotulo }), input, dica ? h('div', { class: 'hint', text: dica }) : null); }
const REGRA_SENHA = 'Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.';

const NOME_PERFIL = { master: 'Master', admin: 'Administrador', mecanico: 'Mecânico', motorista: 'Motorista' };
const fmtData = iso => { const s = String(iso || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : (s || '—'); };
const fmtNum = n => Number(n || 0).toLocaleString('pt-BR');
const fmtKm = n => fmtNum(Math.round(Number(n) || 0)) + ' km';

/** Placa no estilo do GF. contagem opcional = nº de pendências (bolinha). */
function placaEl(placa, opc) {
  opc = opc || {};
  const p = String(placa || '').toUpperCase(), mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p);
  const corpo = h('button', { class: 'placa-veiculo ' + (mercosul ? 'mercosul' : 'antiga'), type: 'button', onclick: opc.aoClicar || null, 'aria-label': 'Veículo ' + p },
    h('div', { class: 'placa-topo', text: mercosul ? 'BRASIL' : 'BRASIL' }), h('div', { class: 'placa-numero', text: p }));
  const wrap = h('div', { class: 'placa-wrap' }, corpo);
  if (opc.contagem != null) wrap.append(h('span', { class: 'placa-count ' + (opc.contagem === 0 ? 'ok' : opc.contagem > 2 ? 'bad' : 'warn'), text: String(opc.contagem), title: opc.contagem + ' pendência(s)' }));
  return wrap;
}
