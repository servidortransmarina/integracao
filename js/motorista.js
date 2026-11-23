/* Fleet do motorista: Checklist, Abastecer, Histórico e Escalas (só leitura). Gestão vê as listas de checklists e ocorrências. */
const Motorista = {
  d() { return App.dados || {}; },
  hoje() { return (App.dados && App.dados.hoje) || hojeLocal(); },
  placaSel(def) {
    const sel = h('select', { 'aria-label': 'Caminhão' }, h('option', { value: '', text: 'Escolha o caminhão…' }), ...(this.d().veiculos || []).map(v => h('option', { value: v.placa, text: v.placa + (v.modelo ? ' — ' + v.modelo : '') })));
    sel.value = def || ''; return sel;
  },
  numero(v) { return parseFloat(String(v).replace(',', '.')); },
  dia(iso) { return iso ? fmtData(String(iso).slice(0, 10)) : '-'; },
  nomeMot(id) { const m = (this.d().motoristas || []).find(x => String(x.id) === String(id)); return m ? nomeBonito(m.nome) : '-'; },

  /* ---------- CHECKLIST ---------- */
  /* ---------- fotos do checklist: reduz no aparelho e envia na hora, em segundo plano ---------- */
  async reduzirFoto(arquivo, max = 1280, qual = 0.7) {
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Não consegui abrir a foto.')); i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', qual);
    } finally { URL.revokeObjectURL(url); }
  },
  filaFotos: { ativos: 0, espera: [] },
  enviarFoto(foto, placa) {                      // foto: { tipo, slot, dados, estado, id }
    const F = this.filaFotos;
    const rodar = async () => {
      F.ativos++; foto.estado = 'enviando'; foto.aviso && foto.aviso();
      try { const r = await API.chamar('enviarFotoChecklist', { tipo: foto.tipo, slot: foto.slot, placa: placa(), imagemBase64: foto.dados }, { mudo: true }); foto.id = r.id; foto.estado = 'ok'; foto.erro = ''; }
      catch (e) { foto.estado = 'erro'; foto.erro = e.message; }
      F.ativos--; foto.aviso && foto.aviso(); const prox = F.espera.shift(); if (prox) prox();
      (foto.resolver || []).forEach(f => f()); foto.resolver = [];
    };
    foto.pronta = new Promise(res => { foto.resolver = [res]; });
    if (F.ativos < 2) rodar(); else F.espera.push(rodar);
  },
  /** Cartão "Fotos do caminhão". Devolve { el, estado() } — estado diz o que falta e permite esperar os envios. */
  cartaoFotos(mod, placa, mudou) {
    const cfg = mod.fotos || { carroceriaMin: 4, carroceriaMax: 10, pneus: [], cabineItem: '' };
    mudou = mudou || (() => {});
    const car = [], pneu = {}, cab = { v: null };
    const ver = f => f.estado === 'ok' ? '✅' : f.estado === 'erro' ? '⚠️ toque para tentar de novo' : '⏳';
    const miniatura = (f, remover) => {
      const m = h('div', { class: 'ckf-mini ' + f.estado }, h('img', { src: f.dados, alt: 'foto' }), h('span', { class: 'ckf-st' }));
      const pinta = () => { m.className = 'ckf-mini ' + f.estado; m.querySelector('.ckf-st').textContent = f.estado === 'ok' ? '✓' : f.estado === 'erro' ? '!' : '…'; m.title = ver(f); };
      f.aviso = () => { pinta(); if (f.estado === 'ok') mudou(); }; pinta();
      m.onclick = () => { if (f.estado === 'erro') this.enviarFoto(f, placa); };
      if (remover) m.append(h('button', { type: 'button', class: 'ckf-x', 'aria-label': 'Remover foto', onclick: ev => { ev.stopPropagation(); remover(); } }, '×'));
      return m;
    };
    const pegar = (aoEscolher) => {
      const inp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
      inp.onchange = async () => { const arq = inp.files && inp.files[0]; inp.value = ''; if (!arq) return; try { aoEscolher(await this.reduzirFoto(arq)); } catch (e) { toast(e.message); } };
      return { inp, abrir: () => inp.click() };
    };
    // carroceria
    const contador = h('small', { class: 'hint' }), gridCar = h('div', { class: 'ckf-grid' });
    const pintaCar = () => {
      limpar(gridCar); car.forEach((f, i) => gridCar.append(miniatura(f, () => { car.splice(i, 1); pintaCar(); mudou(); })));
      contador.textContent = car.length + ' de ' + cfg.carroceriaMin + ' fotos (mínimo)' + (car.length >= cfg.carroceriaMin ? ' ✓' : '');
      if (car.length < cfg.carroceriaMax) gridCar.append(h('button', { type: 'button', class: 'ckf-add', onclick: () => pc.abrir() }, h('b', { text: '＋' }), h('span', { text: 'Foto' })));
    };
    const pc = pegar(d => { const f = { tipo: 'carroceria', slot: 'c' + (car.length + 1), dados: d, estado: 'enviando' }; car.push(f); this.enviarFoto(f, placa); pintaCar(); });
    // pneus e cabine: um espaço por foto
    const slot = (rotulo, guardar, obter, tipo, chave) => {
      const caixa = h('div', { class: 'ckf-slot' }), p = pegar(d => { const f = { tipo, slot: chave, dados: d, estado: 'enviando' }; guardar(f); this.enviarFoto(f, placa); pinta(); });
      const pinta = () => { limpar(caixa); const f = obter(); caixa.append(h('div', { class: 'ckf-rot', text: rotulo }));
        if (f) caixa.append(miniatura(f, () => { guardar(null); pinta(); mudou(); })); else caixa.append(h('button', { type: 'button', class: 'ckf-add', onclick: () => p.abrir() }, h('b', { text: '📷' }), h('span', { text: 'Tirar foto' }))); caixa.append(p.inp); };
      pinta(); return caixa;
    };
    const el = h('div', { class: 'card ck-cat' }, h('h3', { text: 'FOTOS DO CAMINHÃO' }), h('small', { class: 'hint', text: 'Tire as fotos agora, com a câmera do celular. Elas são enviadas enquanto você responde o checklist.' }),
      h('div', { class: 'sec-t', text: 'Carroceria (mínimo ' + cfg.carroceriaMin + ': frente, trás e as duas laterais)' }), gridCar, contador,
      h('div', { class: 'sec-t', text: 'Pneus (uma foto de cada)' }),
      h('div', { class: 'ckf-pneus' }, ...(cfg.pneus || []).map((n, i) => slot(n, f => { pneu[n] = f; }, () => pneu[n], 'pneu', 'p' + (i + 1)))),
      h('div', { class: 'sec-t', text: 'Dentro da cabine (mostre a limpeza)' }), slot('Cabine por dentro', f => { cab.v = f; }, () => cab.v, 'cabine', 'k'));
    pintaCar();
    const todas = () => car.concat((cfg.pneus || []).map(n => pneu[n]).filter(Boolean), cab.v ? [cab.v] : []);
    const salva = id => ({ tipo: 'salva', dados: urlFotoDrive(id, 400), estado: 'ok', id, pronta: Promise.resolve() });
    return { el, todas,
      /** Volta as fotos de um checklist que ficou pela metade (já estão no Drive). */
      restaurar(f) { if (!f) return; (f.c || []).forEach(id => car.push(salva(id))); Object.keys(f.p || {}).forEach(n => { if ((cfg.pneus || []).indexOf(n) >= 0) pneu[n] = salva(f.p[n]); }); if (f.k) cab.v = salva(f.k);
        pintaCar(); $$('.ckf-slot', el).forEach(x => x.remove()); const pz = $('.ckf-pneus', el); limpar(pz); (cfg.pneus || []).forEach((n, i) => pz.append(slot(n, f2 => { pneu[n] = f2; }, () => pneu[n], 'pneu', 'p' + (i + 1))));
        el.append(slot('Cabine por dentro', f2 => { cab.v = f2; }, () => cab.v, 'cabine', 'k')); },
      ids() { const ok = f => f && f.estado === 'ok' && f.id ? f.id : ''; const p = {}; (cfg.pneus || []).forEach(n => { if (ok(pneu[n])) p[n] = pneu[n].id; }); return { c: car.map(ok).filter(Boolean), p, k: ok(cab.v) }; },
      falta() {
        if (car.length < cfg.carroceriaMin) return 'Tire mais ' + (cfg.carroceriaMin - car.length) + ' foto(s) da carroceria.';
        const sem = (cfg.pneus || []).find(n => !pneu[n]); if (sem) return 'Falta a foto de: ' + sem + '.';
        if (!cab.v) return 'Falta a foto de dentro da cabine.'; return '';
      },
      async esperar() { await Promise.all(todas().map(f => f.estado === 'enviando' ? f.pronta : null)); const ruim = todas().find(f => f.estado !== 'ok'); if (ruim) throw new Error(ruim.erro || 'Uma foto não foi enviada. Toque nela para tentar de novo.'); },
      valor() { const pn = {}; (cfg.pneus || []).forEach(n => { pn[n] = pneu[n].id; }); return { carroceria: car.map(f => f.id), pneus: pn, cabine: cab.v.id }; } };
  },

  temRascunho() {
    let a = null; try { a = JSON.parse(localStorage.getItem('trm.ckrasc.' + (App.sessao && App.sessao.usuario)) || 'null'); } catch (e) { /* ok */ }
    const r = (a && a.dia === Motorista.hoje()) ? a : this.d().rascunhoChecklist; return !!(r && Object.keys(r.resp || {}).length);
  },
  checklist() {
    const d = this.d(), mod = d.checklistModelo; if (!mod) return h('div', { class: 'card soon' }, 'Checklist indisponível. Atualize a página.');
    const esc = d.escalaHoje, placa = this.placaSel(esc ? esc.placa : ''), km = h('input', { type: 'number', inputmode: 'numeric', min: 1, placeholder: 'KM atual do painel' });
    const resp = {}, qtd = {}, obs = {}, linhas = {}, fotoItem = {}, ctl = {}, obrig = mod.obrigatorios || [], dicas = mod.dicas || {};
    // ---- rascunho: tudo o que foi respondido fica guardado (no celular na hora e no servidor a cada pausa); sair no meio não perde nada ----
    const chave = 'trm.ckrasc.' + (App.sessao && App.sessao.usuario), hoje0 = Motorista.hoje();
    const lerLocal = () => { try { const r = JSON.parse(localStorage.getItem(chave) || 'null'); return r && r.dia === hoje0 ? r : null; } catch (e) { return null; } };
    const rascunho = (() => { const a = lerLocal(), b = d.rascunhoChecklist; if (b) b.dia = hoje0; if (!a) return b || null; if (!b) return a; return String(a.salvoEm || '') >= String(b.salvoEm || '') ? a : b; })();
    let pronto = false, tServ = null;
    const montarRasc = () => ({ dia: hoje0, salvoEm: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', ' '), placa: placa.value, km: km.value, resp, obs, qtd, outro: outroTx.value, outroSt: outroSt.v,
      fotos: Object.assign(fotosCx.ids(), { i: Object.keys(fotoItem).reduce((o, n) => { if (fotoItem[n].estado === 'ok' && fotoItem[n].id) o[n] = fotoItem[n].id; return o; }, {}) }) });
    const enviarServ = () => { clearTimeout(tServ); tServ = null; const r = montarRasc(); API.chamar('salvarRascunhoChecklist', { rascunho: r }, { fundo: true }).catch(() => {}); };
    const mudou = () => { if (!pronto) return; try { localStorage.setItem(chave, JSON.stringify(montarRasc())); } catch (e) { /* sem armazenamento: o servidor guarda */ } clearTimeout(tServ); tServ = setTimeout(enviarServ, 6000); };
    Motorista._ckFlush = () => { if (tServ) enviarServ(); };      // app minimizado/fechado: manda o que falta para o servidor na hora
    if (!Motorista._ckOuvindo) { Motorista._ckOuvindo = true; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Motorista._ckFlush) Motorista._ckFlush(); }); }
    const apagarRasc = () => { clearTimeout(tServ); tServ = null; Motorista._ckFlush = null; try { localStorage.removeItem(chave); } catch (e) { /* ok */ } };
    // foto de cada item (opcional): itens que já têm foto no cartão de fotos (pneus e cabine) não pedem de novo
    const jaTemFoto = (mod.fotos && mod.fotos.pneus || []).concat(mod.fotos && mod.fotos.cabineItem ? [mod.fotos.cabineItem] : []);
    const comFotoPropria = mod.categorias.reduce((l, c) => l.concat(c.itens.filter(n => jaTemFoto.indexOf(n) < 0)), []), contFotos = h('span', { class: 'ck-fotos-cont' });
    const pintaCont = () => { const n = comFotoPropria.filter(n => fotoItem[n]).length; contFotos.textContent = '📷 Fotos dos itens: ' + n + ' de ' + comFotoPropria.length + (n === comFotoPropria.length ? ' ✓ (+ pontos extras)' : ' · foto de todos = pontos extras'); };
    const botaoFoto = nome => {
      const ob = obrig.indexOf(nome) >= 0;
      const inp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }), bt = h('button', { type: 'button', class: 'ck-foto' + (ob ? ' obrig' : ''), 'aria-label': 'Foto de ' + nome + (ob ? ' (obrigatória)' : ''), title: ob ? 'Foto obrigatória' : 'Foto (opcional)' });
      const pinta = () => { const f = fotoItem[nome]; limpar(bt); bt.className = 'ck-foto' + (ob ? ' obrig' : '') + (f ? ' tem ' + f.estado : ''); if (f) bt.append(h('img', { src: f.dados, alt: '' }), h('i', { text: f.estado === 'ok' ? '✓' : f.estado === 'erro' ? '!' : '…' })); else bt.append('📷'); pintaCont(); };
      ctl['foto:' + nome] = pinta;
      inp.onchange = async () => { const arq = inp.files && inp.files[0]; inp.value = ''; if (!arq) return;
        try { const f = { tipo: 'item', slot: nome.slice(0, 12), dados: await this.reduzirFoto(arq), estado: 'enviando' }; f.aviso = () => { pinta(); if (f.estado === 'ok') mudou(); }; fotoItem[nome] = f; this.enviarFoto(f, () => placa.value); pinta(); } catch (e) { toast(e.message); } };
      bt.onclick = () => { const f = fotoItem[nome]; if (f && f.estado === 'erro') { this.enviarFoto(f, () => placa.value); return; } inp.click(); };
      pinta(); return h('span', { class: 'ck-foto-cx' }, bt, inp);
    };
    const feitoHoje = (d.checklists || []).some(c => String(c.data).slice(0, 10) === Motorista.hoje());
    const total = mod.categorias.reduce((n, c) => n + c.itens.length, 0), prog = h('span', { class: 'ck-prog' });
    const atualizarProg = () => { const n = Object.keys(resp).length; prog.textContent = n + ' de ' + total + ' itens'; };
    const botao = (nome, cod, ic, rot, linha, area) => h('button', { type: 'button', class: 'ck-op ' + cod, 'aria-label': rot, title: rot, onclick: () => {
      resp[nome] = cod; $$('.ck-op', linha).forEach(b => b.classList.toggle('on', b.classList.contains(cod))); area.hidden = cod === 'ok'; linha.classList.remove('falta'); atualizarProg(); mudou();
      if (cod !== 'ok' && pronto) area.querySelector('input').focus(); } }, ic);
    const raiz = h('div', { class: 'ck' },
      h('div', { class: 'card' }, h('h2', { text: 'Checklist do dia' }), feitoHoje ? h('div', { class: 'ck-aviso', text: '✅ Você já enviou um checklist hoje. Só envie outro se trocou de caminhão.' }) : null,
        h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), placa), h('div', { class: 'field' }, h('label', { text: 'KM atual' }), km)),
        h('div', { class: 'ck-leg' }, h('span', { class: 'ok' }, h('i', { text: '✓' }), 'Ok: funcionando bem'), h('span', { class: 'warn' }, h('i', { text: '!' }), 'Atenção: algo estranho ou gasto'), h('span', { class: 'bad' }, h('i', { text: '✕' }), 'Ruim: defeito (a oficina é avisada)'),
          h('button', { class: 'btn small secondary', type: 'button', text: '? Como fazer', onclick: () => Ajuda.abrir('checklist') })), h('small', { class: 'ck-imp-leg', text: '⛔ item impeditivo: marcado como Ruim, o caminhão fica bloqueado na hora e a oficina é avisada.' }), contFotos));
    mod.categorias.forEach(c => {
      const cx = h('div', { class: 'card ck-cat' }, h('h3', { text: c.cat }));
      cx.append(h('div', { class: 'ck-cols' }, h('span', { text: 'Ok' }), h('span', { text: 'Atenção' }), h('span', { text: 'Ruim' })));
      c.itens.forEach(nome => {
        const area = h('div', { class: 'ck-obs', hidden: true }, h('input', { type: 'text', maxlength: 300, placeholder: 'Descreva o problema', oninput: e => { obs[nome] = e.target.value; mudou(); } }));
        const ob = obrig.indexOf(nome) >= 0, linha = h('div', { class: 'ck-lin' + (ob ? ' obrig' : '') }); linhas[nome] = linha;
        const imp = (mod.impeditivos || []).indexOf(nome) >= 0;
        linha.append(h('div', { class: 'ck-topo' }, h('span', { class: 'ck-nome' }, ob ? '🧯 ' : null, nome, imp ? h('span', { class: 'ck-imp', title: 'Item impeditivo: Ruim aqui bloqueia o caminhão na hora', 'aria-label': 'item impeditivo', text: '⛔' }) : null, ob ? h('span', { class: 'ck-obr', text: 'obrigatório' }) : null),
          jaTemFoto.indexOf(nome) < 0 ? botaoFoto(nome) : h('span', { class: 'ck-foto-cx vazio' }),
          h('span', { class: 'ck-ops' }, botao(nome, 'ok', '✓', 'Ok', linha, area), botao(nome, 'warn', '!', 'Atenção', linha, area), botao(nome, 'bad', '✕', 'Ruim', linha, area))), ...(dicas[nome] ? [h('div', { class: 'ck-dica', text: dicas[nome] })] : []), area);
        ctl[nome] = { linha, area };
        cx.append(linha);
      });
      raiz.append(cx);
    });
    // campo aberto: algo que não está na lista
    const outroTx = h('textarea', { rows: 2, maxlength: 300, placeholder: 'Ex.: retrovisor solto, barulho na suspensão… (deixe em branco se não tiver)', oninput: () => mudou() }), outroSt = { v: 'warn' };
    const outroSeg = h('div', { class: 'oc-seg' }); [['warn', '! Atenção'], ['bad', '✕ Ruim']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: 'oc-op ' + (v === 'warn' ? 'pendente on' : 'ruim'), text: t, dataset: { v } }); b.onclick = () => { outroSt.v = v; outroSeg.querySelectorAll('.oc-op').forEach(x => x.classList.toggle('on', x === b)); mudou(); }; outroSeg.append(b); });
    const outroCx = h('div', { class: 'card ck-cat ck-outro' }, h('h3', { text: 'OUTRO PROBLEMA (OPCIONAL)' }), h('p', { class: 'hint', text: 'Viu algo que não está na lista? Escreva aqui.' }), outroTx, outroSeg);
    const fotosCx = this.cartaoFotos(mod, () => placa.value, () => mudou());
    const eq = h('div', { class: 'card ck-cat' }, h('h3', { text: 'QUANTIDADES' }));
    mod.quantidades.forEach(n => { const i = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 999, placeholder: '0', oninput: e => { qtd[n] = e.target.value; mudou(); } }); ctl['qtd:' + n] = i; eq.append(h('div', { class: 'ck-lin' }, h('div', { class: 'ck-topo' }, h('span', { class: 'ck-nome', text: 'Quantidade de ' + n.toLowerCase().replace(/s$/, '') + 's' }), h('span', { class: 'ck-qtd' }, i)))); });
    const msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Enviar checklist' });
    env.onclick = async () => {
      const k = this.numero(km.value); mensagem(msg, '');
      if (!placa.value) return mensagem(msg, 'Escolha o caminhão.');
      if (!(k > 0)) return mensagem(msg, 'Informe o KM atual.');
      const falta = Object.keys(linhas).filter(n => !resp[n]); if (falta.length) { falta.forEach(n => linhas[n].classList.add('falta')); linhas[falta[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Faltam ' + falta.length + ' itens para responder.'); }
      const semDesc = Object.keys(resp).filter(n => resp[n] !== 'ok' && String(obs[n] || '').trim().length < 3); if (semDesc.length) { linhas[semDesc[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Descreva o problema de: ' + semDesc[0] + '.'); }
      for (const n of mod.quantidades) if (String(qtd[n] == null ? '' : qtd[n]) === '') return mensagem(msg, 'Informe a quantidade de ' + n.toLowerCase() + '.');
      const semFoto = fotosCx.falta(); if (semFoto) { fotosCx.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, semFoto); }
      const semObr = obrig.find(n => !fotoItem[n] || fotoItem[n].estado === 'erro'); if (semObr) { linhas[semObr].classList.add('falta'); linhas[semObr].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Tire a foto do ' + semObr.toLowerCase() + ' (obrigatória: mostre o manômetro e a validade).'); }
      const itens = Object.keys(resp).map(n => ({ item: n, status: resp[n], descricao: obs[n] || '' })).concat(mod.quantidades.map(n => ({ item: n, quantidade: qtd[n] })));
      env.disabled = true; env.textContent = 'Enviando fotos…';
      try {
        await fotosCx.esperar();
        const fi = Object.keys(fotoItem).map(n => fotoItem[n]); await Promise.all(fi.map(f => f.estado === 'enviando' ? f.pronta : null));
        const fotos = fotosCx.valor(); fotos.itens = {}; Object.keys(fotoItem).forEach(n => { if (fotoItem[n].estado === 'ok' && fotoItem[n].id) fotos.itens[n] = fotoItem[n].id; });
        env.textContent = 'Enviando…';
        const r = await API.chamar('enviarChecklist', { placa: placa.value, km: k, itens, fotos, outro: outroTx.value.trim() ? { descricao: outroTx.value.trim(), status: outroSt.v } : null });
        apagarRasc(); App.recarregar(true);
        const m = abrirModal(r.bloqueado ? 'Caminhão BLOQUEADO 🔴' : 'Checklist enviado ✅', h('div', { class: 'ck-ok' }, h('p', {}, h('b', { text: r.protocolo })),
          r.bloqueado ? h('div', { class: 'ck-bloq' }, h('b', { text: 'Não saia com este caminhão.' }), h('span', { text: ' Você marcou como ruim: ' + (r.impeditivos || []).join(', ') + '. A oficina e a gestão já foram avisadas.' })) : null,
          h('p', { text: 'Enviado para aprovação da gestão.' }), h('p', { class: 'hint', text: 'Os pontos entram assim que o checklist for aprovado.' }),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Ver no histórico', onclick: () => { m.fechar(); App.abrirAba('historico'); } }))), { aoFechar: () => App.abrirAba('inicio') });
      } catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar checklist'; }
    };
    atualizarProg(); pintaCont();
    raiz.append(outroCx, fotosCx.el, eq, h('div', { class: 'ck-rodape' }, prog, msg, env));
    placa.addEventListener('change', () => mudou()); km.addEventListener('input', () => mudou());
    // ---- continua de onde parou ----
    const n0 = rascunho ? Object.keys(rascunho.resp || {}).length : 0, f0 = rascunho && rascunho.fotos || {};
    const temFoto = (f0.c || []).length || Object.keys(f0.p || {}).length || f0.k || Object.keys(f0.i || {}).length;
    if (rascunho && (n0 || temFoto || rascunho.km)) {
      if (rascunho.placa && [...placa.options].some(o => o.value === rascunho.placa)) placa.value = rascunho.placa;
      if (rascunho.km) km.value = rascunho.km;
      Object.keys(rascunho.resp || {}).forEach(n => { const c = ctl[n]; if (!c) return; const b = $('.ck-op.' + rascunho.resp[n], c.linha); if (b) b.click(); });
      Object.keys(rascunho.obs || {}).forEach(n => { const c = ctl[n]; if (!c) return; obs[n] = rascunho.obs[n]; c.area.querySelector('input').value = rascunho.obs[n]; });
      Object.keys(rascunho.qtd || {}).forEach(n => { const i = ctl['qtd:' + n]; if (i) { i.value = rascunho.qtd[n]; qtd[n] = rascunho.qtd[n]; } });
      if (rascunho.outro) outroTx.value = rascunho.outro; if (rascunho.outroSt === 'bad') { const b = $('.oc-op[data-v="bad"]', outroSeg); if (b) b.click(); }
      fotosCx.restaurar(f0);
      Object.keys(f0.i || {}).forEach(n => { if (!ctl['foto:' + n]) return; fotoItem[n] = { tipo: 'item', dados: urlFotoDrive(f0.i[n], 300), estado: 'ok', id: f0.i[n], pronta: Promise.resolve() }; ctl['foto:' + n](); });
      const hora = String(rascunho.salvoEm || '').slice(11, 16);
      raiz.firstChild.append(h('div', { class: 'ck-rasc' }, h('b', { text: '↩️ Continuando de onde você parou' }), h('span', { text: n0 + ' de ' + total + ' itens respondidos' + (hora ? ' · salvo às ' + hora : '') + '.' }),
        h('button', { class: 'btn-link', type: 'button', text: 'Começar do zero', onclick: () => confirmarCustom('Começar do zero', 'Apagar as respostas e fotos deste checklist e começar de novo?').then(ok => {
          if (!ok) return; apagarRasc(); API.chamar('salvarRascunhoChecklist', { rascunho: null }, { fundo: true }).catch(() => {}); d.rascunhoChecklist = null; App.abrirAba('checklists'); }) })));
    }
    pronto = true;
    return raiz;
  },

  /* ---------- ABASTECER ---------- */
  abastecer() {
    const d = this.d(), esc = d.escalaHoje, hoje = Motorista.hoje();
    const placa = this.placaSel(esc ? esc.placa : ''), data = h('input', { type: 'date', value: hoje, max: hoje }), hora = h('input', { type: 'time' });
    const prod = h('select', {}, ...(d.produtos || []).map(p => h('option', { value: p, text: p }))), km = h('input', { type: 'number', inputmode: 'numeric', min: 1, placeholder: 'KM atual' });
    const lit = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, placeholder: 'Litros' }), val = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, placeholder: 'Valor total (R$)' });
    const unit = h('small', { class: 'hint' }), msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Lançar abastecimento' });
    const calc = () => { const l = this.numero(lit.value), v = this.numero(val.value); unit.textContent = l > 0 && v > 0 ? 'Preço por litro: ' + fmtMoeda(v / l) : ''; }; lit.oninput = val.oninput = calc;
    env.onclick = async () => {
      mensagem(msg, ''); const l = this.numero(lit.value), v = this.numero(val.value), k = this.numero(km.value);
      if (!placa.value) return mensagem(msg, 'Escolha o caminhão.'); if (!(l > 0)) return mensagem(msg, 'Informe os litros.'); if (!(v > 0)) return mensagem(msg, 'Informe o valor.'); if (!(k > 0)) return mensagem(msg, 'Informe o KM.');
      env.disabled = true; env.textContent = 'Enviando…';
      try { await API.chamar('lancarAbastecimento', { placa: placa.value, data: data.value, hora: hora.value, produto: prod.value, km: k, litros: l, valor: v }); toast('Abastecimento lançado! Ele será conferido com a fatura do posto.'); App.recarregar(true); App.abrirAba('abastecimento'); }
      catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Lançar abastecimento'; }
    };
    const ult = (d.abastecimentos || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 5);
    return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Lançar abastecimento' }),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), placa), h('div', { class: 'field' }, h('label', { text: 'Data' }), data), h('div', { class: 'field' }, h('label', { text: 'Hora (opcional)' }), hora)),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Produto' }), prod), h('div', { class: 'field' }, h('label', { text: 'KM' }), km), h('div', { class: 'field' }, h('label', { text: 'Litros' }), lit), h('div', { class: 'field' }, h('label', { text: 'Valor total' }), val)),
      unit, msg, h('div', { class: 'modal-actions' }, env), h('small', { class: 'hint', text: 'Quando a fatura do posto chegar, o sistema confere e você ganha pontos.' })),
      ult.length ? h('div', { class: 'card' }, h('h2', { text: 'Últimos lançamentos' }), ...ult.map(a => this.linhaAbast(a))) : null);
  },
  /** Algo errado no caminhão fora do checklist: vai direto para a oficina como pendência (sem pontos). */
  defeito() {
    const d = this.d(), esc = d.escalaHoje, placa = this.placaSel(esc ? esc.placa : '');
    const ITENS = ['Freio', 'Pneu', 'Motor', 'Elétrica / luzes', 'Suspensão', 'Câmbio / embreagem', 'Ar-condicionado', 'Vazamento', 'Baú / carroceria', 'Tacógrafo', 'Outro'];
    const item = h('select', {}, ...ITENS.map(x => h('option', { value: x, text: x }))), km = h('input', { type: 'number', inputmode: 'numeric', min: 0, placeholder: 'KM atual (opcional)' });
    const desc = h('textarea', { rows: 4, maxlength: 600, placeholder: 'O que está acontecendo? Quando começou? Faz algum barulho?' });
    const grav = { v: 'warn' }, parado = h('input', { type: 'checkbox' }), linhaParado = h('label', { class: 'df-parado', hidden: true }, parado, ' O caminhão não tem condição de rodar');
    const seg = h('div', { class: 'oc-seg df-seg' }); [['warn', '! Dá para rodar com cuidado'], ['bad', '✕ Grave']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: 'oc-op ' + (v === 'warn' ? 'pendente on' : 'ruim'), text: t }); b.onclick = () => { grav.v = v; linhaParado.hidden = v !== 'bad'; seg.querySelectorAll('.oc-op').forEach(x => x.classList.toggle('on', x === b)); }; seg.append(b); });
    const msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Enviar para a oficina' });
    env.onclick = async () => {
      mensagem(msg, ''); if (!placa.value) return mensagem(msg, 'Escolha o caminhão.'); if (desc.value.trim().length < 5) return mensagem(msg, 'Conte o que está errado.');
      env.disabled = true; env.textContent = 'Enviando…';
      try { await API.chamar('relatarDefeito', { placa: placa.value, item: item.value, descricao: desc.value.trim(), gravidade: grav.v, parado: grav.v === 'bad' && parado.checked ? 'SIM' : 'NAO', km: this.numero(km.value) || '' });
        toast('Enviado! A oficina e a gestão já foram avisadas.'); App.recarregar(true); App.abrirAba('defeito'); }
      catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar para a oficina'; }
    };
    const meus = (d.ocorrencias || []).filter(o => o.origem === 'relato').sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura))).slice(0, 10);
    return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Relatar defeito' }), h('p', { class: 'hint', text: 'Para algo errado no caminhão sem precisar fazer o checklist. Vai direto para a oficina.' }),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), placa), h('div', { class: 'field' }, h('label', { text: 'O que é' }), item), h('div', { class: 'field' }, h('label', { text: 'KM' }), km)),
      h('div', { class: 'field' }, h('label', { text: 'Descreva' }), desc), h('div', { class: 'field' }, h('label', { text: 'Gravidade' }), seg), linhaParado, msg, h('div', { class: 'modal-actions' }, env)),
      meus.length ? h('div', { class: 'card' }, h('h2', { text: 'Seus relatos' }), ...meus.map(o => this.linhaOc(o))) : null);
  },
  /* ---------- MANUTENÇÃO feita pelo motorista (com foto da nota, opcional): só entra no histórico depois da aprovação ---------- */
  manutencao() {
    const d = this.d(), esc = d.escalaHoje, hoje = Motorista.hoje(), placa = this.placaSel(esc ? esc.placa : '');
    const SUG = ['Engraxamento', 'Troca de óleo do motor', 'Troca de lâmpada', 'Borracharia (conserto de pneu)', 'Troca de pneu', 'Elétrica', 'Freio', 'Mangueira', 'Correia', 'Filtro', 'Lavagem'];
    const lista = h('datalist', { id: 'mmSug' }, ...SUG.map(x => h('option', { value: x })));
    const serv = h('input', { type: 'text', list: 'mmSug', maxlength: 80, placeholder: 'Ex.: Engraxamento, troca de lâmpada…' });
    const data = h('input', { type: 'date', value: hoje, max: hoje }), km = h('input', { type: 'number', inputmode: 'numeric', min: 0, placeholder: 'KM do painel' });
    const val = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: 0, placeholder: 'R$ (se pagou)' }), local = h('input', { type: 'text', maxlength: 80, placeholder: 'Oficina, posto, borracharia…' });
    const obs = h('textarea', { rows: 2, maxlength: 400, placeholder: 'Opcional' });
    // foto da nota: uma só, opcional; vai sendo enviada enquanto ele preenche
    const nota = { f: null }, caixa = h('div', { class: 'mm-foto' });
    const inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
    inp.onchange = async () => { const arq = inp.files && inp.files[0]; inp.value = ''; if (!arq) return;
      try { const dados = await this.reduzirFoto(arq, 1600, 0.8); nota.f = { tipo: 'nota', slot: 'nota', dados, estado: 'enviando' }; nota.f.aviso = pinta; this.enviarFoto(nota.f, () => placa.value); pinta(); } catch (e) { toast(e.message); } };
    const pinta = () => {
      limpar(caixa); const f = nota.f;
      if (!f) { caixa.append(h('button', { type: 'button', class: 'ckf-add mm-add', onclick: () => inp.click() }, h('b', { text: '🧾' }), h('span', { text: 'Foto da nota (opcional)' }))); }
      else caixa.append(h('div', { class: 'ckf-mini ' + f.estado, title: f.estado === 'erro' ? 'Toque para tentar de novo' : '', onclick: () => { if (f.estado === 'erro') this.enviarFoto(f, () => placa.value); } },
        h('img', { src: f.dados, alt: 'Foto da nota' }), h('span', { class: 'ckf-st', text: f.estado === 'ok' ? '✓' : f.estado === 'erro' ? '!' : '…' }),
        h('button', { type: 'button', class: 'ckf-x', 'aria-label': 'Tirar a foto', onclick: ev => { ev.stopPropagation(); nota.f = null; pinta(); } }, '×')));
      caixa.append(inp);
    };
    pinta();
    const msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Enviar para aprovação' });
    env.onclick = async () => {
      mensagem(msg, ''); if (!placa.value) return mensagem(msg, 'Escolha o caminhão.'); if (serv.value.trim().length < 3) return mensagem(msg, 'Diga qual serviço ou peça foi feito.');
      if (!data.value) return mensagem(msg, 'Informe a data.');
      env.disabled = true; env.textContent = 'Enviando…';
      try {
        if (nota.f && nota.f.estado === 'enviando') await nota.f.pronta;
        if (nota.f && nota.f.estado === 'erro') throw new Error('A foto da nota não foi enviada. Toque nela para tentar de novo ou tire a foto.');
        await API.chamar('lancarManutMotorista', { placa: placa.value, servico: serv.value.trim(), data: data.value, km: this.numero(km.value) || '', valor: this.numero(val.value) || '', local: local.value.trim(), obs: obs.value.trim(), nota: nota.f ? nota.f.id : '' });
        toast('Enviado! A gestão vai conferir e aprovar.'); App.recarregar(true); App.abrirAba('manutmot');
      } catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar para aprovação'; }
    };
    const meus = (d.manutMotorista || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 10);
    const campo = (rot, el) => h('div', { class: 'field' }, h('label', { text: rot }), el);
    return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Lançar manutenção' }), lista,
      h('p', { class: 'hint', text: 'Fez algum serviço no caminhão na rua (engraxamento, lâmpada, borracharia…)? Lance aqui. Ele só entra no histórico do caminhão depois que a gestão aprovar.' }),
      h('div', { class: 'row' }, campo('Caminhão', placa), campo('Data', data)), campo('O que foi feito', serv),
      h('div', { class: 'row' }, campo('KM', km), campo('Valor', val)), campo('Onde foi feito', local), campo('Observação', obs),
      campo('Nota / recibo', caixa), msg, h('div', { class: 'modal-actions' }, env)),
      meus.length ? h('div', { class: 'card' }, h('h2', { text: 'Seus lançamentos' }), ...meus.map(x => this.linhaManut(x))) : null);
  },
  linhaManut(x) {
    const ST = { PENDENTE: ['⏳ aguardando aprovação', 'amber'], APROVADA: ['✅ aprovada', 'green'], RECUSADA: ['recusada', 'red'] }, st = ST[x.status] || [x.status, 'gray'];
    return h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: x.placa + ' · ' + x.servico }),
      h('small', { text: [this.dia(x.data), Number(x.valor) > 0 ? fmtMoeda(Number(x.valor)) : '', x.nota ? '🧾 com nota' : '', x.status === 'RECUSADA' && x.motivo ? 'Motivo: ' + x.motivo : ''].filter(Boolean).join(' · ') })),
      h('span', { class: 'badge ' + st[1], text: st[0] }));
  },
  linhaAbast(a) {
    const ST = { provisorio: ['⏳ aguardando fatura', 'amber'], conferido: ['✅ conferido', 'green'], expirado: ['sem fatura', 'gray'] }, s = ST[a.status] || [a.status, 'gray'];
    return h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: a.placa + ' · ' + a.produto }), h('small', { text: this.dia(a.data) + ' · ' + Number(a.litros).toLocaleString('pt-BR') + ' L · ' + fmtMoeda(Number(a.valor)) })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },

  /* ---------- HISTÓRICO ---------- */
  filtroHist: 'tudo',
  historico() {
    const d = this.d(), ev = [];
    (d.checklists || []).forEach(c => ev.push({ t: 'checklist', ts: String(c.data).slice(0, 10) + ' ' + (c.hora || ''), el: () => this.linhaCheck(c) }));
    (d.abastecimentos || []).forEach(a => ev.push({ t: 'abastecimento', ts: String(a.data).slice(0, 10) + ' ' + (a.hora || ''), el: () => this.linhaAbast(a) }));
    (d.ocorrencias || []).forEach(o => ev.push({ t: 'ocorrencia', ts: String(o.dataAbertura).slice(0, 10) + ' 99', el: () => this.linhaOc(o) }));
    (d.manutMotorista || []).forEach(x => ev.push({ t: 'ocorrencia', ts: String(x.criadoEm), el: () => this.linhaManut(x) }));
    (d.pontos || []).forEach(p => ev.push({ t: 'pontos', ts: String(p.dataHora), el: () => h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: p.descricao || p.evento }), h('small', { text: this.dia(p.dataHora) })), h('b', { class: Number(p.pontos) < 0 ? 'neg' : 'pos', text: (Number(p.pontos) > 0 ? '+' : '') + p.pontos + ' pts' })) }));
    ev.sort((a, b) => b.ts.localeCompare(a.ts));
    const corpo = h('div', { class: 'card' }), chips = h('div', { class: 'chips' }), pinta = () => {
      limpar(corpo); const l = ev.filter(e => this.filtroHist === 'tudo' || e.t === this.filtroHist).slice(0, 120);
      if (!l.length) corpo.append(h('div', { class: 'empty', text: 'Nada por aqui ainda. Comece pelo checklist do dia! ✅' })); l.forEach(e => corpo.append(e.el()));
      $$('button', chips).forEach(b => b.classList.toggle('on', b.dataset.f === this.filtroHist));
    };
    [['tudo', 'Tudo'], ['checklist', 'Checklists'], ['abastecimento', 'Abastecimentos'], ['ocorrencia', 'Ocorrências'], ['pontos', 'Pontos']].forEach(([f, t]) => chips.append(h('button', { type: 'button', class: 'chip', dataset: { f }, text: t, onclick: () => { this.filtroHist = f; pinta(); } })));
    pinta(); return h('div', {}, chips, corpo);
  },
  STC: { OK: ['✅ tudo certo', 'green'], ATENCAO: ['⚠️ com atenção', 'amber'], CRITICO: ['❌ itens ruins', 'red'] },
  APR: { PENDENTE: ['aguardando aprovação', 'amber'], REJEITADO: ['devolvido', 'red'] },
  linhaCheck(c) {
    const s = this.APR[c.aprovacao] || this.STC[c.statusGeral] || [c.statusGeral, 'gray'], itens = (this.d().checklistItens || []).filter(i => String(i.checklistId) === String(c.id));
    return h('div', { class: 'hist-lin click', onclick: () => this.detalheCheck(c, itens) }, h('div', {}, h('b', { text: 'Checklist · ' + c.placa }), h('small', { text: this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.protocolo + (c.aprovacao === 'REJEITADO' && c.obsAprov ? ' · ' + c.obsAprov : '') })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },
  detalheCheck(c, itens) {
    const ruins = itens.filter(i => i.status !== 'ok' && i.status), cx = h('div', {}, h('p', {}, h('b', { text: c.protocolo }), ' · ' + c.placa + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km'),
      h('p', { text: c.totalOk + ' ok · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' }));
    ruins.forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: i.item }), h('small', { text: i.descricao })), h('span', { class: 'badge ' + (i.status === 'bad' ? 'red' : 'amber'), text: i.status === 'bad' ? 'ruim' : 'atenção' }))));
    itens.filter(i => i.quantidade !== '' && i.quantidade != null).forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('b', { text: i.item }), h('span', { text: String(i.quantidade) }))));
    if (!ruins.length) cx.append(h('div', { class: 'empty', text: 'Nenhum problema relatado.' })); cx.append(this.galeria(c)); abrirModal('Checklist', cx);
  },
  /** Fotos guardadas no Drive: miniaturas que abrem em tamanho grande. */
  galeria(c) {
    let f = null; try { f = JSON.parse(c.fotos || 'null'); } catch (e) { f = null; }
    if (!f) return h('div', { class: 'hint', text: 'Este checklist não tem fotos (foi enviado antes da exigência).' });
    const th = (id, tam) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + tam;
    const itens = []; (f.c || []).forEach((id, i) => itens.push({ id, leg: 'Carroceria ' + (i + 1) })); Object.keys(f.p || {}).forEach(n => itens.push({ id: f.p[n], leg: n })); if (f.k) itens.push({ id: f.k, leg: 'Cabine' }); Object.keys(f.i || {}).forEach(n => itens.push({ id: f.i[n], leg: n }));
    const foto = (x, i) => h('button', { class: 'ckf-gal', type: 'button', title: 'Ampliar: ' + x.leg, onclick: () => Visor.abrir(itens.map(y => ({ src: th(y.id, 1600), leg: y.leg })), i) }, h('img', { src: th(x.id, 320), alt: x.leg, loading: 'lazy' }), h('small', { text: x.leg }));
    const g = h('div', { class: 'ckf-galeria' }, h('div', { class: 'sec-t', text: 'Fotos' }));
    const lista = h('div', { class: 'ckf-grid' }); itens.forEach((x, i) => lista.append(foto(x, i)));
    g.append(lista); return g;
  },
  /** Caminhão marcado como parado pela oficina/gestão (só aparece para quem vê o GF). */
  paradoTag(placa) {
    if (App.sessao.perfil === 'motorista') return null;
    const v = ((typeof db !== 'undefined' && db.veiculos) || []).find(x => x.placa === placa);
    return v && v.paradoDesde ? h('span', { class: 'tag-parado', text: '🚫 Parado' }) : null;
  },
  linhaOc(o, acao, comPlaca = true) {
    const ST = { ABERTA: ['pendente', 'amber'], AGUARDANDO: ['aguardando aprovação', 'gray'], DESCARTADA: ['descartada', 'gray'], RESOLVIDA: ['resolvida', 'green'] }, s = ST[String(o.status).toUpperCase()] || [o.status, 'gray'];
    const grave = o.prioridade === 'ALTA' || /sim/i.test(o.restringeCirculacao || '');
    return h('div', { class: 'oc-linha' + (grave && o.status === 'ABERTA' ? ' grave' : '') },
      h('div', { class: 'oc-tx' }, h('b', { text: (grave ? '🚨 ' : '⚠️ ') + o.item + (comPlaca ? ' · ' + o.placa : '') }, this.paradoTag(o.placa)), h('p', { text: o.descricao || '' }),
        h('small', { text: [this.dia(o.dataAbertura), o.origem === 'relato' ? 'defeito relatado' : 'checklist', App.sessao.perfil === 'motorista' && /sim/i.test(o.restringeCirculacao || '') ? 'você indicou que não roda' : '', o.resolucao || ''].filter(Boolean).join(' · ') })),
      h('div', { class: 'oc-lado' }, h('span', { class: 'badge ' + s[1], text: s[0] }), acao || null));
  },


  /* ---------- ESCALAS (só leitura) ---------- */
  /** Escala: a mais recente lançada em destaque (com a equipe do dia) e, abaixo, o histórico do motorista. */
  escala() {
    const me = this.d().minhaEscala, hoje = Motorista.hoje(), cx = h('div');
    if (!me || !me.atual) { cx.append(h('div', { class: 'card' }, h('h2', { text: 'Escala' }), h('div', { class: 'empty', text: 'Nenhuma escala lançada ainda.' }))); return cx; }
    const a = me.atual, rot = dt => (dt === hoje ? 'Hoje, ' : dt > hoje ? (dt === this.somaDia(hoje, 1) ? 'Amanhã, ' : '') : '') + this.dia(dt);
    const atual = h('div', { class: 'card esc-atual' }, h('div', { class: 'esc-cab' }, h('div', {}, h('small', { text: 'Escala atual' }), h('h2', { text: rot(a.data) })), h('span', { class: 'badge ' + (a.definitiva ? 'green' : 'amber'), text: a.definitiva ? 'confirmada' : 'prévia' })));
    if (a.minhas.length) a.minhas.forEach(x => atual.append(this.blocoEscala(x)));
    else atual.append(h('div', { class: 'esc-folga' }, h('b', { text: 'Você não está nesta escala.' }), h('small', { text: a.definitiva ? 'Folga ou reserva neste dia. Dúvidas, fale com a gestão.' : 'A escala ainda é uma prévia e pode mudar.' })));
    const eq = h('details', { class: 'esc-equipe' }, h('summary', { text: 'Equipe do dia (' + a.equipe.length + ')' }));
    a.equipe.slice().sort((x, y) => (y.meu - x.meu) || x.nome.localeCompare(y.nome)).forEach(e => eq.append(h('div', { class: 'hist-lin' + (e.meu ? ' meu' : '') }, h('div', {}, h('b', { text: nomeBonito(e.nome) }), h('small', { text: [e.regiao, e.saida ? 'saída ' + e.saida : ''].filter(Boolean).join(' · ') })), h('span', { class: 'esc-placa', text: e.placa || '—' }))));
    atual.append(eq); cx.append(atual);
    const hist = h('div', { class: 'card' }, h('h2', { text: 'Histórico de escalas' }));
    if (!me.historico.length) hist.append(h('div', { class: 'empty', text: 'Ainda sem escalas anteriores.' }));
    me.historico.forEach(x => hist.append(h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: this.dia(x.data) + ' · ' + (x.placa || '—') }), h('small', { text: [x.carga ? 'carga ' + x.carga : '', x.regiao || x.rota, x.saida ? 'saída ' + x.saida : ''].filter(Boolean).join(' · ') })))));
    cx.append(hist);
    return cx;
  },
  somaDia(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); },
  blocoEscala(x) {
    const campo = (rot, v) => v ? h('div', { class: 'esc-campo' }, h('small', { text: rot }), h('b', { text: v })) : null;
    return h('div', { class: 'esc-bloco' }, h('div', { class: 'esc-topo' }, placaHtmlEl(x.placa || '—'), h('div', {}, h('b', { text: x.regiao || x.rota || 'Rota a definir' }), h('small', { text: x.carga ? 'Carga ' + x.carga : '' }))),
      h('div', { class: 'esc-grade' }, campo('Saída', x.saida), campo('Coleta', x.coleta), campo('Box', x.box), campo('Paradas', x.paradas), campo('Período', x.periodo), campo('Ajudante' + (x.ajudantes.length > 1 ? 's' : ''), x.ajudantes.map(nomeBonito).join(' e '))));
  },

  /* ---------- GESTÃO: listas ---------- */
  gestaoChecklists() {
    const pend = c => c.aprovacao === 'PENDENTE', gestor = ['master', 'admin'].indexOf(this.d().perfil) >= 0 && !App.sessao.chefe;
    const l = (this.d().checklists || []).slice().sort((a, b) => (pend(b) - pend(a)) || (String(b.data).slice(0, 10) + b.hora).localeCompare(String(a.data).slice(0, 10) + a.hora)).slice(0, 100);
    const np = l.filter(pend).length, cx = h('div', { class: 'card' }, h('h2', { text: 'Checklists enviados' }), np && gestor ? h('div', { class: 'aviso-aprov', text: np + (np > 1 ? ' checklists aguardam' : ' checklist aguarda') + ' sua aprovação' }) : null);
    if (!l.length) cx.append(h('div', { class: 'empty', text: 'Nenhum checklist enviado ainda.' }));
    l.forEach(c => { const s = this.APR[c.aprovacao] || this.STC[c.statusGeral] || [c.statusGeral, 'gray'];
      cx.append(h('div', { class: 'hist-lin click', onclick: () => this.abrirCheckGestao(c, gestor) }, h('div', {}, h('b', { text: c.placa + ' · ' + this.nomeMot(c.motoristaId) }), h('small', { text: this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' })), h('span', { class: 'badge ' + s[1], text: s[0] }))); });
    return cx;
  },
  /** Abre o checklist com itens, ocorrências e fotos; admin/master aprovam ou devolvem. */
  async abrirCheckGestao(c, gestor) {
    const cx = h('div', {}, h('p', {}, h('b', { text: c.protocolo }), ' · ' + this.nomeMot(c.motoristaId) + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km'), h('p', { text: c.totalOk + ' ok · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' }));
    const m = abrirModal('Checklist · ' + c.placa, cx), corpo = h('div', {}, h('div', { class: 'hint', text: 'Carregando…' })); cx.append(corpo);
    let det; try { det = await API.chamar('checklistDetalhe', { id: c.id }, { mudo: true }); } catch (e) { corpo.textContent = e.message; return; }
    corpo.textContent = '';
    // cada ocorrência: Pendente (vai para a oficina no GF) ou Resolvido (já foi resolvido, não vira pendência)
    const escolha = {}, todas = det.ocorrencias || [], decide = c.aprovacao === 'PENDENTE' && gestor;
    // ✕ em item impeditivo: já virou OS P1 e bloqueou o caminhão. A gestão confere e pode revogar.
    const imp = todas.filter(o => String(o.criticidade).toUpperCase() === 'P1' && o.status === 'ABERTA'), ocs = todas.filter(o => imp.indexOf(o) < 0);
    if (imp.length) {
      const v = ((typeof db !== 'undefined' && db.veiculos) || []).find(x => x.placa === c.placa), bloq = !!(v && v.paradoDesde);
      const rev = gestor && bloq ? h('button', { class: 'btn small', type: 'button', text: '✅ Revogar bloqueio', onclick: async () => {
        const mt = await pedirTextoCustom('Revogar bloqueio de ' + c.placa, 'Por que o caminhão pode rodar? Fica registrado.'); if (mt === null) return; if (String(mt).trim().length < 3) return toast('Escreva o motivo.', true);
        try { await API.chamar('revogarBloqueio', { placa: c.placa, motivo: String(mt).trim() }); toast(c.placa + ' liberado.'); m.fechar(); App.recarregar(true); } catch (e) { toast(e.message, true); } } }) : null;
      corpo.append(h('div', { class: 'ck-bloq gestao' }, h('div', {}, h('b', { text: bloq ? '🔴 Caminhão bloqueado automaticamente' : 'Bloqueio automático (já liberado)' }),
        h('span', { text: ' Item impeditivo marcado como ruim: ' + imp.map(o => o.item + (o.descricao ? ' (' + o.descricao + ')' : '')).join(', ') + '. Já está na oficina como OS P1.' })), rev));
    }
    ocs.forEach(o => {
      escolha[o.id] = 'pendente';
      const seg = h('div', { class: 'oc-seg', role: 'radiogroup', 'aria-label': 'Situação de ' + o.item });
      [['pendente', 'Pendente'], ['resolvido', 'Resolvido']].forEach(([v, t]) => { const b = h('button', { type: 'button', class: 'oc-op ' + v + (v === 'pendente' ? ' on' : ''), role: 'radio', 'aria-checked': v === 'pendente' ? 'true' : 'false', text: t });
        b.onclick = () => { escolha[o.id] = v; seg.querySelectorAll('.oc-op').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); }); }; seg.append(b); });
      corpo.append(h('div', { class: 'hist-lin oc-lin' }, h('div', {}, h('b', { text: '⚠️ ' + o.item }), h('small', { text: o.descricao })), decide ? seg : h('span', { class: 'badge ' + (o.prioridade === 'ALTA' ? 'red' : 'amber'), text: o.prioridade === 'ALTA' ? 'ruim' : 'atenção' })));
    });
    if (ocs.length && decide) corpo.append(h('small', { class: 'hint', text: 'Pendente vai para a oficina (GF). Marque Resolvido no que já foi resolvido.' }));
    if (!ocs.length && !imp.length) corpo.append(h('div', { class: 'empty', text: 'Nenhum problema relatado.' }));
    corpo.append(this.galeria(c));
    if (c.aprovacao === 'APROVADO' || c.aprovacao === 'REJEITADO') corpo.append(h('p', { class: 'hint', text: (c.aprovacao === 'APROVADO' ? 'Aprovado' : 'Devolvido') + ' por ' + c.aprovadoPor + (c.obsAprov ? ' · ' + c.obsAprov : '') }));
    if (c.aprovacao === 'PENDENTE' && gestor) {
      const msg = h('div', { class: 'msg' }), mot = h('input', { type: 'text', placeholder: 'Motivo (só para devolver)', maxlength: 200 });
      const ok = h('button', { class: 'btn', type: 'button', text: 'Aprovar e liberar pontos' }), no = h('button', { class: 'btn sec', type: 'button', text: 'Devolver' });
      const enviar = async (decisao) => { ok.disabled = no.disabled = true; try { const r = await API.chamar('decidirChecklist', { id: c.id, decisao, motivo: mot.value, resolvidas: ocs.filter(o => escolha[o.id] === 'resolvido').map(o => o.id) }); m.fechar(); App.recarregar(true); } catch (e) { mensagem(msg, e.message); ok.disabled = no.disabled = false; } };
      ok.onclick = () => enviar('aprovar'); no.onclick = () => enviar('devolver');
      corpo.append(mot, msg, h('div', { class: 'modal-actions' }, no, ok));
    }
  },
  /** Ocorrências: lista geral ou por caminhão, filtro por situação; Resolvido e Reabrir. */
  filtroOc: { placa: '', st: 'pendentes' },
  gestaoOcorrencias() {
    const todas = (this.d().ocorrencias || []).slice().sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
    const f = this.filtroOc, ST = { pendentes: o => o.status === 'ABERTA', aguardando: o => o.status === 'AGUARDANDO', resolvidas: o => o.status === 'RESOLVIDA' || o.status === 'DESCARTADA', todas: () => true };
    const pode = ['master', 'admin', 'mecanico'].indexOf(this.d().perfil) >= 0, raiz = h('div');
    const refaz = () => App.abrirAba('ocorrencias');
    // caminhões: geral + um chip por placa (com quantas pendentes)
    const placas = Array.from(new Set(todas.map(o => o.placa))).sort(), pend = p => todas.filter(o => o.placa === p && o.status === 'ABERTA').length;
    const chip = (rot, ativo, n, clique) => h('button', { class: 'chip' + (ativo ? ' active' : ''), type: 'button', onclick: clique }, rot, n ? h('span', { class: 'n', text: String(n) }) : null);
    const chipsPl = h('div', { class: 'chips oc-chips' }, chip('Geral', !f.placa, todas.filter(o => o.status === 'ABERTA').length, () => { f.placa = ''; refaz(); }), ...placas.map(p => chip(p, f.placa === p, pend(p), () => { f.placa = p; refaz(); })));
    const nAg = todas.filter(o => o.status === 'AGUARDANDO').length;
    const chipsSt = h('div', { class: 'oc-st' }, ...[['pendentes', 'Pendentes'], ['aguardando', 'Aguardando aprovação'], ['resolvidas', 'Resolvidas'], ['todas', 'Todas']].filter(([k]) => k !== 'aguardando' || nAg)
      .map(([k, t]) => h('button', { type: 'button', class: 'oc-op' + (f.st === k ? ' on' : ''), text: t, onclick: () => { f.st = k; refaz(); } })));
    const l = todas.filter(o => (!f.placa || o.placa === f.placa) && ST[f.st](o)).slice(0, 150);
    const cx = h('div', { class: 'card' }, h('h2', { text: 'Ocorrências' + (f.placa ? ' · ' + f.placa : '') }), chipsPl, chipsSt);
    if (!l.length) cx.append(h('div', { class: 'empty', text: f.st === 'pendentes' ? 'Nenhuma ocorrência pendente' + (f.placa ? ' neste caminhão' : '') + '. ✅' : 'Nada por aqui.' }));
    const acao = async (nome, o, ok) => { try { await API.chamar(nome, { id: o.id }); toast(ok); App.recarregar(true); } catch (e) { toast(e.message, true); } };
    l.forEach(o => {
      const st = String(o.status).toUpperCase(), btn = !pode ? null : st === 'ABERTA' ? h('button', { class: 'btn small', type: 'button', text: 'Resolvido', onclick: () => acao('resolverOcorrencia', o, 'Marcada como resolvida.') })
        : (st === 'RESOLVIDA' || st === 'DESCARTADA') ? h('button', { class: 'btn small secondary', type: 'button', text: 'Reabrir', onclick: () => acao('reabrirOcorrencia', o, 'Reaberta: voltou para pendente no GF.') }) : null;
      cx.append(this.linhaOc(o, btn, !f.placa));
    });
    raiz.append(cx); return raiz;
  },

  /* ---------- PAINEL ---------- */
  cartaoHoje() {
    const d = this.d(), e = d.escalaHoje, feito = (d.checklists || []).some(c => String(c.data).slice(0, 10) === Motorista.hoje());
    const cx = h('div', { class: 'card hoje' }, h('h2', { text: 'Seu caminhão hoje' }));
    if (!e) { cx.append(h('div', { class: 'empty', text: 'Você ainda não está escalado para hoje. Fale com a gestão.' })); return cx; }
    cx.append(h('div', { class: 'hoje-linha' }, placaHtmlEl(e.placa), h('div', {}, h('b', { text: e.modelo || 'Caminhão' }), h('small', { text: e.origem === 'escala' ? 'Escalado para hoje' + (e.turno ? ' · ' + e.turno : '') : 'Caminhão fixo (sem escala lançada)' }))),
      feito ? h('div', { class: 'ck-aviso', text: '✅ Checklist de hoje enviado.' }) : h('button', { class: 'btn', type: 'button', text: this.temRascunho() ? 'Continuar o checklist (salvo pela metade)' : 'Fazer o checklist agora', onclick: () => App.abrirAba('checklists') }));
    return cx;
  }
};
