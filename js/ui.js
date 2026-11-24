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
  const ov = h('div', { class: 'overlay show' + (op.centro ? ' center' : ''), dataset: op.fixo ? { fixo: '1' } : {} });
  const fechar = () => { ov.remove(); if (op.aoFechar) op.aoFechar(); };
  const x = op.fixo ? null : h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Fechar', text: '✕', onclick: () => fechar() });
  const caixa = h('div', { class: 'modal' + (op.largo ? ' wide' : '') }, h('div', { class: 'modal-cab' }, titulo ? h('h3', { text: titulo }) : h('span'), x), conteudo);
  ov.append(caixa);
  ov.addEventListener('mousedown', e => { if (e.target === ov && !op.fixo) fechar(); });
  document.body.append(ov);
  return { el: caixa, fechar, overlay: ov };
}
function mensagem(el, texto, tipo) { el.textContent = texto || ''; el.className = 'msg' + (texto ? ' show ' + (tipo || 'err') : ''); }
/** Campo de senha com o olhinho para mostrar/ocultar. */
const OLHO_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const OLHO_RISCADO_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
/** Campo de senha com o botão de mostrar/ocultar (ícone de olho desenhado, igual em todos os aparelhos). */
function comOlho(input) {
  const b = h('button', { type: 'button', class: 'senha-olho', title: 'Mostrar senha', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false' });
  b.innerHTML = OLHO_SVG;      // SVG fixo, sem dado de ninguém
  b.onclick = () => { const ver = input.type === 'password'; input.type = ver ? 'text' : 'password'; b.innerHTML = ver ? OLHO_RISCADO_SVG : OLHO_SVG; b.title = ver ? 'Ocultar senha' : 'Mostrar senha'; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', ver ? 'true' : 'false'); input.focus(); };
  return h('div', { class: 'senha-box' }, input, b);
}
function campo(rotulo, input, dica) { return h('div', { class: 'field' }, h('label', { text: rotulo }), input.type === 'password' ? comOlho(input) : input, dica ? h('div', { class: 'hint', text: dica }) : null); }
const REGRA_SENHA = 'Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.';

const NOME_PERFIL = { master: 'Master', chefe: 'Chefe (só visualiza)', admin: 'Administrador', mecanico: 'Mecânico', motorista: 'Motorista' };
const rotuloPerfil = S => S && S.chefe ? NOME_PERFIL.chefe : NOME_PERFIL[S && S.perfil] || '';
const fmtNum = n => Number(n || 0).toLocaleString('pt-BR');


/* Enquanto houver janela aberta: o fundo não rola; Esc fecha a de cima (menos as obrigatórias). */
(function () {
  const abertas = () => $$('.overlay.show');
  const travar = () => document.body.classList.toggle('sem-scroll', abertas().length > 0);
  new MutationObserver(travar).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const a = abertas(); if (!a.length) return;
    const topo = a[a.length - 1];
    if (topo.querySelector('[data-fixo]') || topo.dataset.fixo) return;
    if (topo.id) topo.classList.remove('show'); else topo.remove();
  });
})();

/** Ícone: emoji em texto, exceto o pneu 🛞 (emoji novo que o Windows 10 e celulares mais antigos não mostram): vira desenho. */
const PNEU_SVG = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" style="vertical-align:-.15em"><circle cx="12" cy="12" r="10.5" fill="#2b2b2b"/><circle cx="12" cy="12" r="10.5" fill="none" stroke="#555" stroke-width="1.6" stroke-dasharray="2.2 1.6"/><circle cx="12" cy="12" r="5.2" fill="#c9cdd3"/><circle cx="12" cy="12" r="1.7" fill="#6b7280"/><g fill="#6b7280"><circle cx="12" cy="8.6" r=".8"/><circle cx="15.2" cy="13.1" r=".8"/><circle cx="8.8" cy="13.1" r=".8"/></g></svg>';
function icone(ic) {
  if (ic === '🛞') { const sp = document.createElement('span'); sp.className = 'ic-pneu'; sp.innerHTML = PNEU_SVG; return sp; }
  return document.createTextNode(ic || '');
}
/** Foto de perfil: emoji ou a logo da empresa ("logo:trm"). */
function avatarNo(av) {
  if (/^logo:/.test(av || '')) return h('img', { src: 'logotrm.png', alt: '', class: 'av-logo' });
  if (/^img:[a-z0-9_]{1,24}$/.test(av || '')) return h('img', { src: 'icons/avatares/' + av.slice(4) + '.png', alt: '', class: 'av-logo' });   // logos de marcas/empresas: coloque o PNG em icons/avatares/ e acrescente 'img:nome' em AVATARES (perfil.js)
  return icone(av || '🔧');
}

/** Altura ocupada embaixo no celular: barra de sistemas + faixa de abas (quando ela fica fixa embaixo). Os iframes descontam isso. */
function alturaRodape() {
  const b = document.getElementById('bottombar'), a = document.getElementById('subTabs'); let t = 0;
  if (b && getComputedStyle(b).display !== 'none') t += b.offsetHeight;
  if (a && !a.hidden && getComputedStyle(a).position === 'fixed') t += a.offsetHeight;
  return t;
}

/** Visor de fotos dentro do próprio site (tela cheia, setas, deslizar, Esc para fechar). */
const Visor = {
  abrir(fotos, i) {
    if (!fotos || !fotos.length) return;
    let at = i || 0, x0 = null;
    const img = h('img', { class: 'vs-img', alt: '' }), leg = h('div', { class: 'vs-leg' }), cont = h('span', { class: 'vs-cont' }), carregando = h('div', { class: 'vs-carr', text: 'Carregando…' });
    const ir = n => { at = (n + fotos.length) % fotos.length; carregando.hidden = false; carregando.textContent = 'Carregando…'; img.classList.remove('ok'); tentativas = alternativas(fotos[at].src); img.src = fotos[at].src; img.alt = fotos[at].leg || ''; leg.textContent = fotos[at].leg || ''; cont.textContent = (at + 1) + ' / ' + fotos.length; };
    // foto do Drive: se a miniatura grande falhar, tenta outros endereços do próprio Google antes de desistir
    const alternativas = src => { const m = String(src).match(/[?&]id=([A-Za-z0-9_-]{15,})/) || String(src).match(/\/d\/([A-Za-z0-9_-]{15,})/); if (!m) return [];
      const id = m[1]; return ['https://lh3.googleusercontent.com/d/' + id + '=w1600', 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800', 'https://drive.google.com/uc?export=view&id=' + id]; };
    let tentativas = [];
    img.onload = () => { carregando.hidden = true; img.classList.add('ok'); };
    img.onerror = () => {
      if (tentativas.length) { img.src = tentativas.shift(); return; }
      limpar(carregando).append('Não consegui abrir esta foto aqui. ', (() => { const m = String(fotos[at].src).match(/[?&]id=([A-Za-z0-9_-]{15,})/); return m ? h('a', { href: 'https://drive.google.com/file/d/' + m[1] + '/view', target: '_blank', rel: 'noopener', text: 'Abrir no Drive' }) : ''; })());
    };
    const fechar = () => { ov.remove(); window.removeEventListener('keydown', tecla, true); };
    // captura antes do modal de baixo: Esc fecha só o visor, não a janela do checklist
    const tecla = e => { if (!['Escape', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return; e.stopImmediatePropagation(); e.preventDefault(); if (e.key === 'Escape') fechar(); else ir(at + (e.key === 'ArrowRight' ? 1 : -1)); };
    const seta = (lado, n) => fotos.length > 1 ? h('button', { class: 'vs-seta ' + lado, type: 'button', 'aria-label': lado === 'esq' ? 'Foto anterior' : 'Próxima foto', text: lado === 'esq' ? '‹' : '›', onclick: e => { e.stopPropagation(); ir(at + n); } }) : null;
    const ov = h('div', { class: 'visor', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fotos', onclick: e => { if (e.target === ov || e.target.classList.contains('vs-palco')) fechar(); } },
      h('div', { class: 'vs-topo' }, cont, leg, h('button', { class: 'vs-x', type: 'button', 'aria-label': 'Fechar', text: '✕', onclick: fechar })),
      h('div', { class: 'vs-palco' }, carregando, img), seta('esq', -1), seta('dir', 1));
    ov.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    ov.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) ir(at + (dx < 0 ? 1 : -1)); x0 = null; });
    window.addEventListener('keydown', tecla, true); document.body.append(ov); ir(at);
  }
};
