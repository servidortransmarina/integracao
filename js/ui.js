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
const fmtNum = n => Number(n || 0).toLocaleString('pt-BR');

