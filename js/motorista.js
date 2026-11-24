/* Fleet do motorista: Checklist, Abastecer, Histórico e Escalas (só leitura). Gestão vê as listas de checklists e ocorrências. */
const Motorista = {
  d() { return App.dados || {}; },
  hoje() { return (App.dados && App.dados.hoje) || hojeLocal(); },
  placaSel(def) {
    const sel = h('select', { 'aria-label': 'Caminhão' }, h('option', { value: '', text: 'Escolha o caminhão…' }), ...(this.d().veiculos || []).map(v => h('option', { value: v.placa, text: v.placa + (v.modelo ? ' — ' + v.modelo : '') })));
    sel.value = def || ''; return sel;
  },
  /** Caminhão do formulário, do jeito mais simples para o motorista: mostra a placa grande do caminhão de hoje e um botão
      bem visível "Não está com este caminhão? Trocar caminhão". Sem caminhão definido, já abre a lista para ele tocar. */
  caminhaoCampo(sel) {
    const d = this.d(), esc = d.escalaHoje, box = h('div', { class: 'cam-campo' }), veic = p => (d.veiculos || []).find(v => v.placa === p) || {};
    let escolhendo = !sel.value, filtro = '';
    sel.hidden = true; sel.tabIndex = -1;
    const escolher = p => { sel.value = p; sel.dispatchEvent(new Event('change')); escolhendo = false; pinta(); const b = $('.cam-trocar', box); if (b) b.focus(); };
    const pinta = () => {
      limpar(box); box.append(sel);
      if (sel.value && !escolhendo) {
        const v = veic(sel.value), origem = esc && esc.placa === sel.value ? (esc.origem === 'escala' ? 'Você está escalado com ele hoje' : 'Seu caminhão fixo') : 'Você escolheu este caminhão';
        box.append(h('div', { class: 'cam-atual' }, placaHtmlEl(sel.value), h('div', { class: 'cam-info' }, h('b', { text: v.modelo || 'Caminhão' }), h('small', { text: origem }))),
          h('button', { type: 'button', class: 'cam-trocar', onclick: () => { escolhendo = true; filtro = ''; pinta(); const i = $('.cam-busca', box); if (i) i.focus(); } }, h('span', { text: 'Não está com este caminhão?' }), h('b', { text: '🔄 Trocar caminhão' })));
        return;
      }
      const lista = h('div', { class: 'cam-lista', role: 'list' });
      const preencher = () => { limpar(lista); const f = filtro.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const vs = (d.veiculos || []).filter(v => !f || v.placa.replace(/[^A-Z0-9]/g, '').indexOf(f) >= 0 || String(v.modelo || '').toUpperCase().indexOf(filtro.toUpperCase()) >= 0);
        vs.forEach(v => lista.append(h('button', { type: 'button', role: 'listitem', class: 'cam-op' + (v.placa === sel.value ? ' on' : ''), onclick: () => escolher(v.placa) }, h('b', { text: v.placa }), h('small', { text: v.modelo || '' }))));
        if (!vs.length) lista.append(h('p', { class: 'hint', text: 'Nenhum caminhão com essa placa.' })); };
      const busca = h('input', { type: 'search', class: 'cam-busca', placeholder: 'Digite a placa para achar mais rápido', autocomplete: 'off', 'aria-label': 'Procurar caminhão pela placa', oninput: e => { filtro = e.target.value; preencher(); } });
      preencher();
      box.append(h('div', { class: 'cam-esc-tit', text: sel.value ? 'Com qual caminhão você está?' : 'Qual caminhão você está usando hoje?' }), busca, lista,
        sel.value ? h('button', { type: 'button', class: 'btn-link cam-cancela', text: 'Voltar: continuo com o ' + sel.value, onclick: () => { escolhendo = false; pinta(); } }) : null);
    };
    sel._pintar = () => { escolhendo = !sel.value; pinta(); };      // quando o valor muda por código (rascunho)
    pinta(); return box;
  },
  numero(v) { return parseFloat(String(v).replace(',', '.')); },
  dia(iso) { return iso ? fmtData(String(iso).slice(0, 10)) : '-'; },
  nomeMot(id) { const m = (this.d().motoristas || []).find(x => String(x.id) === String(id)); return m ? nomeBonito(m.nome) : '-'; },

  /* ---------- CHECKLIST ---------- */
  /* ---------- fotos do checklist: reduz no aparelho e envia na hora, em segundo plano ---------- */
  /** Reduz a foto no celular antes de enviar. No iPhone, cada canvas que fica na memória pesa: depois de dezenas de fotos
      o Safari passa a devolver imagem PRETA. Por isso o canvas é liberado na hora e a foto é conferida (preta = tenta de novo / avisa). */
  async reduzirFoto(arquivo, max = 1280, qual = 0.7) {
    const desenhar = async (fonte, w0, h0) => {
      const k = Math.min(1, max / Math.max(w0, h0)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(fonte, 0, 0, c.width, c.height);
      // amostra 12×12: imagem toda preta (ou vazia) = o navegador não conseguiu desenhar
      const a = document.createElement('canvas'); a.width = a.height = 12; const ax = a.getContext('2d'); ax.drawImage(c, 0, 0, 12, 12);
      const px = ax.getImageData(0, 0, 12, 12).data; let soma = 0, max2 = 0; for (let i = 0; i < px.length; i += 4) { const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; soma += l; if (l > max2) max2 = l; }
      a.width = a.height = 0;
      const url = (soma / 144 < 4 && max2 < 12) ? null : c.toDataURL('image/jpeg', qual);
      c.width = c.height = 0;                 // libera a memória do canvas na hora
      return url;
    };
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Não consegui abrir a foto. Tire de novo.')); i.src = url; });
      try { if (img.decode) await img.decode(); } catch (e) { /* já carregou */ }
      let dados = await desenhar(img, img.naturalWidth, img.naturalHeight);
      if (!dados && window.createImageBitmap) { try { const bmp = await createImageBitmap(arquivo); dados = await desenhar(bmp, bmp.width, bmp.height); if (bmp.close) bmp.close(); } catch (e) { /* segue para o aviso */ } }
      if (!dados) throw new Error('A foto saiu preta. Tire de novo; se continuar, feche o app e abra de novo (o que você já fez fica salvo).');
      return dados;
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
    const so = !!cfg.soSlots;     // checklist diário: só as fotos fixas (painel e frente)
    const el = h('div', { class: 'card ck-cat' }, h('h3', { text: 'FOTOS DO CAMINHÃO' }), h('small', { class: 'hint', text: 'Tire as fotos agora, com a câmera do celular. Elas são enviadas enquanto você responde o checklist.' }),
      so ? null : h('div', { class: 'sec-t', text: 'Carroceria (mínimo ' + cfg.carroceriaMin + ': frente, trás e as duas laterais)' }), so ? null : gridCar, so ? null : contador,
      h('div', { class: 'sec-t', text: so ? 'Duas fotos (obrigatórias)' : 'Pneus (uma foto de cada)' }),
      h('div', { class: 'ckf-pneus' }, ...(cfg.pneus || []).map((n, i) => slot(n, f => { pneu[n] = f; }, () => pneu[n], so ? 'item' : 'pneu', (so ? 'd' : 'p') + (i + 1)))),
      so ? null : h('div', { class: 'sec-t', text: 'Dentro da cabine (mostre a limpeza)' }), so ? null : slot('Cabine por dentro', f => { cab.v = f; }, () => cab.v, 'cabine', 'k'));
    pintaCar();
    const todas = () => car.concat((cfg.pneus || []).map(n => pneu[n]).filter(Boolean), cab.v ? [cab.v] : []);
    const salva = id => ({ tipo: 'salva', dados: urlFotoDrive(id, 400), estado: 'ok', id, pronta: Promise.resolve() });
    return { el, todas,
      /** Volta as fotos de um checklist que ficou pela metade (já estão no Drive). */
      restaurar(f) { if (!f) return; (f.c || []).forEach(id => car.push(salva(id))); Object.keys(f.p || {}).forEach(n => { if ((cfg.pneus || []).indexOf(n) >= 0) pneu[n] = salva(f.p[n]); }); if (f.k) cab.v = salva(f.k);
        pintaCar(); $$('.ckf-slot', el).forEach(x => x.remove()); const pz = $('.ckf-pneus', el); limpar(pz); (cfg.pneus || []).forEach((n, i) => pz.append(slot(n, f2 => { pneu[n] = f2; }, () => pneu[n], so ? 'item' : 'pneu', (so ? 'd' : 'p') + (i + 1))));
        if (!so) el.append(slot('Cabine por dentro', f2 => { cab.v = f2; }, () => cab.v, 'cabine', 'k')); },
      ids() { const ok = f => f && f.estado === 'ok' && f.id ? f.id : ''; const p = {}; (cfg.pneus || []).forEach(n => { if (ok(pneu[n])) p[n] = pneu[n].id; }); return { c: car.map(ok).filter(Boolean), p, k: ok(cab.v) }; },
      falta() {
        if (car.length < cfg.carroceriaMin) return 'Tire mais ' + (cfg.carroceriaMin - car.length) + ' foto(s) da carroceria.';
        const sem = (cfg.pneus || []).find(n => !pneu[n]); if (sem) return 'Falta a foto de: ' + sem + '.';
        if (!so && !cab.v) return 'Falta a foto de dentro da cabine.'; return '';
      },
      async esperar() { await Promise.all(todas().map(f => f.estado === 'enviando' ? f.pronta : null)); const ruim = todas().find(f => f.estado !== 'ok'); if (ruim) throw new Error(ruim.erro || 'Uma foto não foi enviada. Toque nela para tentar de novo.'); },
      valor() { const pn = {}; (cfg.pneus || []).forEach(n => { pn[n] = pneu[n].id; }); return { carroceria: car.map(f => f.id), pneus: pn, cabine: cab.v ? cab.v.id : '' }; } };
  },

  temRascunho() {
    let a = null; try { const u = 'trm.ckrasc.' + (App.sessao && App.sessao.usuario); a = JSON.parse(localStorage.getItem(u + '.d') || 'null') || JSON.parse(localStorage.getItem(u) || 'null'); } catch (e) { /* ok */ }
    const r = (a && a.dia === Motorista.hoje()) ? a : this.d().rascunhoChecklist; return !!(r && Object.keys(r.resp || {}).length);
  },
  /** Qual checklist: DIÁRIO (rápido, todo dia escalado) ou SEMANAL (completo, 1 por semana; vale também como o diário do dia). */
  situacaoCk() {
    const d = this.d(), hoje = Motorista.hoje(), mod = d.checklistModelo || {}, seg = mod.semanaInicio || hoje, meus = (d.checklists || []).filter(c => c.aprovacao !== 'REJEITADO');
    return { hojeFeito: meus.some(c => String(c.data).slice(0, 10) === hoje), semanaFeita: meus.some(c => c.tipo !== 'DIARIO' && String(c.data).slice(0, 10) >= seg) };
  },
  checklist() {
    const d = this.d(), mod = d.checklistModelo; if (!mod) return h('div', { class: 'card soon' }, 'Checklist indisponível. Atualize a página.');
    if (!mod.diario) return this.checklistForm('SEMANAL');
    const st = this.situacaoCk(), val = mod.valores || { semanal: 54, diario: 10 };
    if (!this.tipoCk) {      // abre no que ficou pela metade; senão no diário (ou no semanal, se o diário de hoje já foi)
      const u = 'trm.ckrasc.' + (App.sessao && App.sessao.usuario), hj = Motorista.hoje(), le = k => { try { const r = JSON.parse(localStorage.getItem(k) || 'null'); return r && r.dia === hj && Object.keys(r.resp || {}).length ? r : null; } catch (e) { return null; } };
      const sv = d.rascunhoChecklist && Object.keys(d.rascunhoChecklist.resp || {}).length ? d.rascunhoChecklist : null;
      this.tipoCk = le(u) || (sv && (sv.tipo || 'SEMANAL') === 'SEMANAL' && !le(u + '.d')) ? 'SEMANAL' : (st.hojeFeito && !st.semanaFeita ? 'SEMANAL' : 'DIARIO');
    }
    const op = (tipo, emoji, tit, sub, estado, cls) => h('button', { type: 'button', role: 'radio', 'aria-checked': this.tipoCk === tipo ? 'true' : 'false', class: 'ck-tipo' + (this.tipoCk === tipo ? ' on' : ''), onclick: () => { if (this.tipoCk === tipo) return; this.tipoCk = tipo; App.abrirAba('checklists'); } },
      h('span', { class: 'ck-tipo-em', text: emoji }), h('span', { class: 'ck-tipo-tx' }, h('b', { text: tit }), h('small', { text: sub })), h('span', { class: 'ck-tipo-st ' + cls, text: estado }));
    const sel = h('div', { class: 'card ck-tipos' }, h('h2', { text: 'Qual checklist você vai fazer?' }),
      h('div', { class: 'ck-tipo-lista', role: 'radiogroup', 'aria-label': 'Tipo de checklist' },
        op('DIARIO', '⚡', 'Diário · rápido', '12 itens e 2 fotos · uns 2 minutos · vale até ' + this.fmtPts(val.diario) + ' pts', st.hojeFeito ? '✅ feito hoje' : 'fazer hoje', st.hojeFeito ? 'ok' : 'falta'),
        op('SEMANAL', '🗂️', 'Semanal · completo', 'Todos os itens e fotos · 1 por semana · vale até ' + this.fmtPts(val.semanal) + ' pts (e já conta como o de hoje)', st.semanaFeita ? '✅ feito esta semana' : 'falta esta semana', st.semanaFeita ? 'ok' : 'falta')),
      !st.semanaFeita && this.tipoCk === 'DIARIO' ? h('p', { class: 'ck-tipo-dica', text: 'Ainda falta o semanal desta semana. Se tiver tempo hoje, faça o completo: ele já vale como o diário.' }) : null);
    const f = this.checklistForm(this.tipoCk); f.prepend(sel); return f;
  },
  checklistForm(tipo) {
    const d = this.d(), mod0 = d.checklistModelo;
    const mod = tipo === 'DIARIO' ? Object.assign({}, mod0, { categorias: [{ cat: 'ANTES DE SAIR', itens: mod0.diario.itens }], quantidades: [], obrigatorios: [], semFotoItem: true,
      fotos: { carroceriaMin: 0, carroceriaMax: 0, pneus: mod0.diario.fotos, cabineItem: '', soSlots: true } }) : mod0;
    const esc = d.escalaHoje, placa = this.placaSel(esc ? esc.placa : ''), km = h('input', { type: 'number', inputmode: 'numeric', min: 1, placeholder: 'KM atual do painel' });
    const resp = {}, qtd = {}, obs = {}, linhas = {}, fotoItem = {}, ctl = {}, obrig = mod.obrigatorios || [], dicas = mod.dicas || {};
    // ---- rascunho: tudo o que foi respondido fica guardado (no celular na hora e no servidor a cada pausa); sair no meio não perde nada ----
    const chave = 'trm.ckrasc.' + (App.sessao && App.sessao.usuario) + (tipo === 'DIARIO' ? '.d' : ''), hoje0 = Motorista.hoje(), doTipo = r => r && (r.tipo || 'SEMANAL') === tipo ? r : null;
    const lerLocal = () => { try { const r = JSON.parse(localStorage.getItem(chave) || 'null'); return r && r.dia === hoje0 ? doTipo(r) : null; } catch (e) { return null; } };
    const rascunho = (() => { const a = lerLocal(), b = doTipo(d.rascunhoChecklist); if (b) b.dia = hoje0; if (!a) return b || null; if (!b) return a; return String(a.salvoEm || '') >= String(b.salvoEm || '') ? a : b; })();
    let pronto = false, tServ = null;
    const montarRasc = () => ({ tipo, dia: hoje0, salvoEm: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', ' '), placa: placa.value, km: km.value, resp, obs, qtd, outro: outroTx.value, outroSt: outroSt.v,
      fotos: Object.assign(fotosCx.ids(), { i: Object.keys(fotoItem).reduce((o, n) => { if (fotoItem[n].estado === 'ok' && fotoItem[n].id) o[n] = fotoItem[n].id; return o; }, {}) }) });
    const enviarServ = () => { clearTimeout(tServ); tServ = null; const r = montarRasc(); API.chamar('salvarRascunhoChecklist', { rascunho: r }, { fundo: true }).catch(() => {}); };
    const mudou = () => { if (!pronto) return; try { localStorage.setItem(chave, JSON.stringify(montarRasc())); } catch (e) { /* sem armazenamento: o servidor guarda */ } clearTimeout(tServ); tServ = setTimeout(enviarServ, 6000); };
    Motorista._ckFlush = () => { if (tServ) enviarServ(); };      // app minimizado/fechado: manda o que falta para o servidor na hora
    if (!Motorista._ckOuvindo) { Motorista._ckOuvindo = true; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Motorista._ckFlush) Motorista._ckFlush(); }); }
    const apagarRasc = () => { clearTimeout(tServ); tServ = null; Motorista._ckFlush = null; try { localStorage.removeItem(chave); } catch (e) { /* ok */ } };
    // foto de cada item (opcional): itens que já têm foto no cartão de fotos (pneus e cabine) não pedem de novo
    const jaTemFoto = (mod.fotos && mod.fotos.pneus || []).concat(mod.fotos && mod.fotos.cabineItem ? [mod.fotos.cabineItem] : []);
    const comFotoPropria = mod.semFotoItem ? [] : mod.categorias.reduce((l, c) => l.concat(c.itens.filter(n => jaTemFoto.indexOf(n) < 0)), []), contFotos = h('span', { class: 'ck-fotos-cont' });
    const naPode = mod.naPode || [], naCam = () => ((mod.naoAplica || {})[placa.value] || []);
    const pintaCont = () => { if (mod.semFotoItem) { contFotos.textContent = ''; return; } const l = comFotoPropria.filter(n => naCam().indexOf(n) < 0 && resp[n] !== 'na'), n = l.filter(x => fotoItem[x]).length; contFotos.textContent = '📷 Fotos dos itens: ' + n + ' de ' + l.length + ' · cada foto boa vale pontos'; };
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
    const feitoHoje = (d.checklists || []).some(c => String(c.data).slice(0, 10) === Motorista.hoje() && (c.tipo || 'SEMANAL') === tipo && c.aprovacao !== 'REJEITADO');
    let total = 0; const prog = h('span', { class: 'ck-prog' });
    const atualizarProg = () => { const vis = Object.keys(linhas).filter(n => !linhas[n].hidden); total = vis.length; prog.textContent = vis.filter(n => resp[n]).length + ' de ' + total + ' itens'; };
    // itens que o caminhão não tem (confirmados pela gestão) somem do checklist dele
    const aplicarNA = () => { const na = naCam(); Object.keys(linhas).forEach(n => { const off = na.indexOf(n) >= 0; linhas[n].hidden = off; if (off) delete resp[n]; });
      cats.forEach(x => { x.cx.hidden = x.itens.every(n => linhas[n].hidden); }); atualizarProg(); pintaCont(); };
    const cats = [];
    const marcarNA = (nome, linha, area, liga) => { if (liga) resp[nome] = 'na'; else delete resp[nome]; linha.classList.toggle('na', liga); $$('.ck-op', linha).forEach(b => b.classList.remove('on')); area.hidden = true; linha.classList.remove('falta');
      const b = $('.ck-na', linha); if (b) { b.textContent = liga ? '↩︎ tem sim' : 'não tem neste caminhão'; b.setAttribute('aria-pressed', liga ? 'true' : 'false'); } atualizarProg(); pintaCont(); mudou(); };
    const botao = (nome, cod, ic, rot, linha, area) => h('button', { type: 'button', class: 'ck-op ' + cod, 'aria-label': rot, title: rot, onclick: () => {
      if (resp[nome] === 'na') marcarNA(nome, linha, area, false);
      resp[nome] = cod; $$('.ck-op', linha).forEach(b => b.classList.toggle('on', b.classList.contains(cod))); area.hidden = cod === 'ok'; linha.classList.remove('falta'); atualizarProg(); mudou();
      if (cod !== 'ok' && pronto) area.querySelector('input').focus(); } }, ic);
    const raiz = h('div', { class: 'ck' },
      h('div', { class: 'card' }, h('h2', { text: tipo === 'DIARIO' ? 'Checklist diário (antes de sair)' : 'Checklist semanal (completo)' }), feitoHoje ? h('div', { class: 'ck-aviso', text: '✅ Você já enviou este checklist hoje. Só envie outro se trocou de caminhão.' }) : null,
        h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), this.caminhaoCampo(placa)), h('div', { class: 'field' }, h('label', { text: 'KM atual' }), km),
        h('div', { class: 'ck-leg' }, h('span', { class: 'ok' }, h('i', { text: '✓' }), 'Ok: funcionando bem'), h('span', { class: 'warn' }, h('i', { text: '!' }), 'Atenção: algo estranho ou gasto'), h('span', { class: 'bad' }, h('i', { text: '✕' }), 'Ruim: defeito (a oficina é avisada)'),
          h('button', { class: 'btn small secondary', type: 'button', text: '? Como fazer', onclick: () => Ajuda.abrir('checklist') })), h('small', { class: 'ck-imp-leg', text: '⛔ item impeditivo: marcado como Ruim, o caminhão fica bloqueado na hora e a oficina é avisada.' }), contFotos));
    mod.categorias.forEach(c => {
      const cx = h('div', { class: 'card ck-cat' }, h('h3', { text: c.cat })); cats.push({ cx, itens: c.itens });
      cx.append(h('div', { class: 'ck-cols' }, h('span', { text: 'Ok' }), h('span', { text: 'Atenção' }), h('span', { text: 'Ruim' })));
      c.itens.forEach(nome => {
        const area = h('div', { class: 'ck-obs', hidden: true }, h('input', { type: 'text', maxlength: 300, placeholder: 'Descreva o problema', oninput: e => { obs[nome] = e.target.value; mudou(); } }));
        const ob = obrig.indexOf(nome) >= 0, linha = h('div', { class: 'ck-lin' + (ob ? ' obrig' : '') }); linhas[nome] = linha;
        const imp = (mod.impeditivos || []).indexOf(nome) >= 0;
        linha.append(h('div', { class: 'ck-topo' }, h('span', { class: 'ck-nome' }, ob ? '🧯 ' : null, nome, imp ? h('span', { class: 'ck-imp', title: 'Item impeditivo: Ruim aqui bloqueia o caminhão na hora', 'aria-label': 'item impeditivo', text: '⛔' }) : null, ob ? h('span', { class: 'ck-obr', text: 'obrigatório' }) : null),
          jaTemFoto.indexOf(nome) < 0 && !mod.semFotoItem ? botaoFoto(nome) : h('span', { class: 'ck-foto-cx vazio' }),
          h('span', { class: 'ck-ops' }, botao(nome, 'ok', '✓', 'Ok', linha, area), botao(nome, 'warn', '!', 'Atenção', linha, area), botao(nome, 'bad', '✕', 'Ruim', linha, area))), ...(dicas[nome] ? [h('div', { class: 'ck-dica', text: dicas[nome] })] : []),
          ...(naPode.indexOf(nome) >= 0 ? [h('button', { type: 'button', class: 'ck-na', 'aria-pressed': 'false', text: 'não tem neste caminhão', onclick: () => marcarNA(nome, linha, area, resp[nome] !== 'na') })] : []), area);
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
      const falta = Object.keys(linhas).filter(n => !linhas[n].hidden && !resp[n]); if (falta.length) { falta.forEach(n => linhas[n].classList.add('falta')); linhas[falta[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Faltam ' + falta.length + ' itens para responder.'); }
      const semDesc = Object.keys(resp).filter(n => resp[n] !== 'ok' && resp[n] !== 'na' && String(obs[n] || '').trim().length < 3); if (semDesc.length) { linhas[semDesc[0]].scrollIntoView({ behavior: 'smooth', block: 'center' }); return mensagem(msg, 'Descreva o problema de: ' + semDesc[0] + '.'); }
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
        const r = await API.chamar('enviarChecklist', { tipo, placa: placa.value, km: k, itens, fotos, outro: outroTx.value.trim() ? { descricao: outroTx.value.trim(), status: outroSt.v } : null });
        apagarRasc(); App.recarregar(true);
        (d.checklists = d.checklists || []).push({ id: r.id, tipo: r.tipo || tipo, data: Motorista.hoje(), aprovacao: 'PENDENTE', placa: placa.value, protocolo: r.protocolo });   // o seletor já mostra "feito" sem esperar
        const m = abrirModal(r.bloqueado ? 'Caminhão BLOQUEADO 🔴' : 'Checklist enviado ✅', h('div', { class: 'ck-ok' }, h('p', {}, h('b', { text: r.protocolo })),
          r.bloqueado ? h('div', { class: 'ck-bloq' }, h('b', { text: 'Não saia com este caminhão.' }), h('span', { text: ' Você marcou como ruim: ' + (r.impeditivos || []).join(', ') + '. A oficina e a gestão já foram avisadas.' })) : null,
          h('p', { text: 'Enviado para aprovação da gestão.' }), h('p', { class: 'hint', text: 'Os pontos entram assim que o checklist for aprovado.' }),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', text: 'Ver no histórico', onclick: () => { m.fechar(); App.abrirAba('historico'); } }))), { aoFechar: () => App.abrirAba('inicio') });
      } catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar checklist'; }
    };
    atualizarProg(); pintaCont();
    raiz.append(...[outroCx, fotosCx.el, mod.quantidades.length ? eq : null, h('div', { class: 'ck-rodape' }, prog, msg, env)].filter(Boolean));
    placa.addEventListener('change', () => { aplicarNA(); mudou(); }); km.addEventListener('input', () => mudou()); aplicarNA();
    // ---- continua de onde parou ----
    const n0 = rascunho ? Object.keys(rascunho.resp || {}).length : 0, f0 = rascunho && rascunho.fotos || {};
    const temFoto = (f0.c || []).length || Object.keys(f0.p || {}).length || f0.k || Object.keys(f0.i || {}).length;
    if (rascunho && (n0 || temFoto || rascunho.km)) {
      if (rascunho.placa && [...placa.options].some(o => o.value === rascunho.placa)) { placa.value = rascunho.placa; if (placa._pintar) placa._pintar(); }
      if (rascunho.km) km.value = rascunho.km;
      aplicarNA();
      Object.keys(rascunho.resp || {}).forEach(n => { const c = ctl[n]; if (!c || c.linha.hidden) return; if (rascunho.resp[n] === 'na') { if ($('.ck-na', c.linha)) marcarNA(n, c.linha, c.area, true); return; } const b = $('.ck-op.' + rascunho.resp[n], c.linha); if (b) b.click(); });
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
      h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), this.caminhaoCampo(placa)), h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'Data' }), data), h('div', { class: 'field' }, h('label', { text: 'Hora (opcional)' }), hora)),
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
      h('div', { class: 'field' }, h('label', { text: 'Caminhão' }), this.caminhaoCampo(placa)), h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { text: 'O que é' }), item), h('div', { class: 'field' }, h('label', { text: 'KM' }), km)),
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
    // fotos da nota (opcional) e da garantia (obrigatória para bateria, alternador…): vão sendo enviadas enquanto ele preenche
    const caixaFoto = (emoji, rotulo, slot) => {
      const st = { f: null, rotulo }, caixa = h('div', { class: 'mm-foto' }), inp = h('input', { type: 'file', accept: 'image/*', hidden: true });
      inp.onchange = async () => { const arq = inp.files && inp.files[0]; inp.value = ''; if (!arq) return;
        try { const dados = await this.reduzirFoto(arq, 1600, 0.8); st.f = { tipo: 'nota', slot, dados, estado: 'enviando' }; st.f.aviso = pinta; this.enviarFoto(st.f, () => placa.value); pinta(); } catch (e) { toast(e.message); } };
      const pinta = () => {
        limpar(caixa); const f = st.f;
        if (!f) caixa.append(h('button', { type: 'button', class: 'ckf-add mm-add' + (st.obrig ? ' obrig' : ''), onclick: () => inp.click() }, h('b', { text: emoji }), h('span', { text: st.rotulo })));
        else caixa.append(h('div', { class: 'ckf-mini ' + f.estado, title: f.estado === 'erro' ? 'Toque para tentar de novo' : '', onclick: () => { if (f.estado === 'erro') this.enviarFoto(f, () => placa.value); } },
          h('img', { src: f.dados, alt: st.rotulo }), h('span', { class: 'ckf-st', text: f.estado === 'ok' ? '✓' : f.estado === 'erro' ? '!' : '…' }),
          h('button', { type: 'button', class: 'ckf-x', 'aria-label': 'Tirar a foto', onclick: ev => { ev.stopPropagation(); st.f = null; pinta(); } }, '×')));
        caixa.append(inp);
      };
      st.pinta = pinta; st.caixa = caixa; pinta(); return st;
    };
    const nota = caixaFoto('🧾', 'Foto da nota (opcional)', 'nota'), gar = caixaFoto('🛡️', 'Foto da garantia (obrigatória)', 'garantia'), caixa = nota.caixa;
    const PECAS_GARANTIA = ['bateria', 'alternador', 'motor de partida', 'motor de arranque', 'turbina', 'bomba injetora', 'compressor', 'radiador', 'embreagem'];
    const semAc = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const pedeGar = () => PECAS_GARANTIA.some(p => semAc(serv.value).indexOf(semAc(p)) >= 0);
    const campoGar = h('div', { class: 'field', hidden: true }, h('label', { text: 'Garantia' }), h('p', { class: 'hint', style: 'margin:0 0 6px', text: 'Esta peça tem garantia: tire a foto do certificado ou da etiqueta de garantia.' }), gar.caixa);
    serv.addEventListener('input', () => { const p = pedeGar(); campoGar.hidden = !p; gar.obrig = p; gar.pinta(); });
    const msg = h('div', { class: 'msg' }), env = h('button', { class: 'btn', type: 'button', text: 'Enviar para aprovação' });
    env.onclick = async () => {
      mensagem(msg, ''); if (!placa.value) return mensagem(msg, 'Escolha o caminhão.'); if (serv.value.trim().length < 3) return mensagem(msg, 'Diga qual serviço ou peça foi feito.');
      if (!data.value) return mensagem(msg, 'Informe a data.');
      env.disabled = true; env.textContent = 'Enviando…';
      try {
        if (pedeGar() && !gar.f) throw new Error('Tire a foto da garantia: ' + serv.value.trim().toLowerCase() + ' tem garantia.');
        for (const x of [nota, gar]) { if (x.f && x.f.estado === 'enviando') await x.f.pronta; if (x.f && x.f.estado === 'erro') throw new Error('A ' + x.rotulo.replace(/ \(.*\)/, '').toLowerCase() + ' não foi enviada. Toque nela para tentar de novo ou tire a foto.'); }
        await API.chamar('lancarManutMotorista', { placa: placa.value, servico: serv.value.trim(), data: data.value, km: this.numero(km.value) || '', valor: this.numero(val.value) || '', local: local.value.trim(), obs: obs.value.trim(), garantia: pedeGar() && gar.f ? gar.f.id : '', nota: nota.f ? nota.f.id : '' });
        toast('Enviado! A gestão vai conferir e aprovar.'); App.recarregar(true); App.abrirAba('manutmot');
      } catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar para aprovação'; }
    };
    const meus = (d.manutMotorista || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, 10);
    const campo = (rot, el) => h('div', { class: 'field' }, h('label', { text: rot }), el);
    return h('div', {}, h('div', { class: 'card' }, h('h2', { text: 'Lançar manutenção' }), lista,
      h('p', { class: 'hint', text: 'Fez algum serviço no caminhão na rua (engraxamento, lâmpada, borracharia…)? Lance aqui. Ele só entra no histórico do caminhão depois que a gestão aprovar.' }),
      campo('Caminhão', this.caminhaoCampo(placa)), campo('Data', data), campo('O que foi feito', serv),
      h('div', { class: 'row' }, campo('KM', km), campo('Valor', val)), campo('Onde foi feito', local), campo('Observação', obs),
      campo('Nota / recibo', caixa), campoGar, msg, h('div', { class: 'modal-actions' }, env)),
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
  /** Situação para mostrar: aprovado (ou aprovado com irregularidade), aguardando, devolvido. */
  statusCheck(c) {
    if (c.aprovacao === 'APROVADO') return String(c.statusGeral || 'OK') === 'OK' ? ['✅ aprovado', 'green'] : ['✅ aprovado · irregular', 'amber'];
    return this.APR[c.aprovacao] || this.STC[c.statusGeral] || [c.statusGeral || '—', 'gray'];
  },
  fmtPts(v) { return (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); },
  /** Mesma conta do servidor (_pontosChecklist_), para a gestão ver os pontos enquanto avalia as fotos. */
  calcPontos(c, itens, aval, na, R, rec, det) {     // mesma conta do servidor (_pontosChecklist_)
    let f = null; try { f = JSON.parse(c.fotos || 'null'); } catch (e) { f = null; } f = f || {};
    const P = det.pesos || { item: 0.5, itemFoto: 0.5, obrig: 1, extra: 0.5 }, cfg = det.fotosCfg || { carroceriaMin: 4, pneus: [], cabineItem: '' }, diario = c.tipo === 'DIARIO', qtds = det.qtds || [];
    const g = id => aval[id] || 'boa', vale = (id, cheio, meia) => g(id) === 'boa' ? cheio : g(id) === 'meia' ? (rec ? 0 : meia) : 0, min = diario ? 0 : cfg.carroceriaMin;
    const resp = itens.filter(i => ['ok', 'warn', 'bad'].indexOf(i.status) >= 0 && qtds.indexOf(i.item) < 0 && !/^Outro:/.test(i.item) && na.indexOf(i.item) < 0);
    const car = f.c || [], obrig = car.slice(0, min).concat(Object.values(f.p || {}), f.k ? [f.k] : []), extras = car.slice(min), fi = Object.keys(f.i || {}).filter(n => na.indexOf(n) < 0).map(n => f.i[n]);
    const comFoto = diario ? [] : resp.filter(i => (cfg.pneus || []).indexOf(i.item) < 0 && i.item !== cfg.cabineItem), nObrig = diario ? (det.diarioFotos || []).length : cfg.carroceriaMin + (cfg.pneus || []).length + 1;
    const max = resp.length * P.item + comFoto.length * P.itemFoto + nObrig * P.obrig;
    const nota = resp.length * P.item + fi.reduce((a, id) => a + vale(id, P.itemFoto, P.itemFoto), 0) + obrig.reduce((a, id) => a + vale(id, P.obrig, P.obrig / 2), 0) + extras.reduce((a, id) => a + vale(id, P.extra, P.extra), 0);
    const frac = max ? Math.min(1, nota / max) : 0;
    return { total: Math.round(frac * (diario ? R.diario : R.semanal) * 100) / 100, pct: Math.round(frac * 100) };
  },
  linhaCheck(c) {
    const s = this.statusCheck(c), itens = (this.d().checklistItens || []).filter(i => String(i.checklistId) === String(c.id));
    return h('div', { class: 'hist-lin click', onclick: () => this.detalheCheck(c, itens) }, h('div', {}, h('b', { text: (c.tipo === 'DIARIO' ? 'Diário' : 'Semanal') + ' · ' + c.placa }), h('small', { text: this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.protocolo + (c.aprovacao === 'REJEITADO' && c.obsAprov ? ' · ' + c.obsAprov : '') })), h('span', { class: 'badge ' + s[1], text: s[0] }));
  },
  detalheCheck(c, itens) {
    const ruins = itens.filter(i => i.status !== 'ok' && i.status), cx = h('div', {}, h('p', {}, h('b', { text: c.protocolo }), ' · ' + c.placa + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km'),
      h('p', { text: c.totalOk + ' ok · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' }));
    ruins.forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('div', {}, h('b', { text: i.item }), h('small', { text: i.descricao })), h('span', { class: 'badge ' + (i.status === 'bad' ? 'red' : 'amber'), text: i.status === 'bad' ? 'ruim' : 'atenção' }))));
    itens.filter(i => i.quantidade !== '' && i.quantidade != null).forEach(i => cx.append(h('div', { class: 'hist-lin' }, h('b', { text: i.item }), h('span', { text: String(i.quantidade) }))));
    if (!ruins.length) cx.append(h('div', { class: 'empty', text: 'Nenhum problema relatado.' })); cx.append(this.galeria(c)); abrirModal('Checklist', cx);
  },
  /** Fotos guardadas no Drive: miniaturas que abrem em tamanho grande. */
  galeria(c, avaliacao) {
    let f = null; try { f = JSON.parse(c.fotos || 'null'); } catch (e) { f = null; }
    let av = {}; try { av = (JSON.parse(avaliacao || 'null') || {}).fotos || {}; } catch (e) { av = {}; }
    if (!f) return h('div', { class: 'hint', text: 'Este checklist não tem fotos (foi enviado antes da exigência).' });
    const th = (id, tam) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + tam;
    const itens = []; (f.c || []).forEach((id, i) => itens.push({ id, leg: 'Carroceria ' + (i + 1) })); Object.keys(f.p || {}).forEach(n => itens.push({ id: f.p[n], leg: n })); if (f.k) itens.push({ id: f.k, leg: 'Cabine' }); Object.keys(f.i || {}).forEach(n => itens.push({ id: f.i[n], leg: n }));
    const foto = (x, i) => h('button', { class: 'ckf-gal', type: 'button', title: 'Ampliar: ' + x.leg, onclick: () => Visor.abrir(itens.map(y => ({ src: th(y.id, 1600), leg: y.leg })), i) }, h('img', { src: th(x.id, 320), alt: x.leg, loading: 'lazy', onerror: e => { const i = e.target; if (!i.dataset.tentou) { i.dataset.tentou = 1; i.src = 'https://lh3.googleusercontent.com/d/' + x.id + '=w320'; } } }), h('small', { text: x.leg + (av[x.id] === 'meia' ? ' · meia boca' : av[x.id] === 'ruim' ? ' · ruim' : '') }));
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
    l.forEach(c => { const s = this.statusCheck(c);
      cx.append(h('div', { class: 'hist-lin click', onclick: () => this.abrirCheckGestao(c, gestor) }, h('div', {}, h('b', { text: c.placa + ' · ' + this.nomeMot(c.motoristaId) }), h('small', { text: (c.tipo === 'DIARIO' ? 'Diário' : 'Semanal') + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' })), h('span', { class: 'badge ' + s[1], text: s[0] }))); });
    return cx;
  },
  /** Abre o checklist com itens, ocorrências e fotos; admin/master aprovam ou devolvem. */
  async abrirCheckGestao(c, gestor) {
    const st = this.statusCheck(c), cx = h('div', {}, h('p', {}, h('b', { text: c.protocolo }), ' · ' + this.nomeMot(c.motoristaId) + ' · ' + this.dia(c.data) + ' ' + (c.hora || '') + ' · ' + Number(c.km).toLocaleString('pt-BR') + ' km'),
      h('p', {}, h('span', { class: 'badge tipo', text: c.tipo === 'DIARIO' ? 'Diário' : 'Semanal' }), ' ', h('span', { class: 'badge ' + st[1], text: st[0] }), ' ' + c.totalOk + ' ok · ' + c.totalWarn + ' atenção · ' + c.totalBad + ' ruins' + (c.pontos !== '' && c.pontos != null && c.aprovacao === 'APROVADO' ? ' · ' + this.fmtPts(c.pontos) + ' pts' : '')));
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
    // ---- itens que o caminhão não tem: o motorista marca "não tem", a gestão confirma (some dos próximos checklists) ----
    const naMot = (det.itens || []).filter(i => i.status === 'na').map(i => i.item), naSel = new Set((det.naoAplica || []).concat(naMot)), naPode = det.naPode || [];
    const R = det.regras || { semanal: 54, diario: 10 }, aval = {}, ptsEl = h('b');
    const recalc = () => { const p = this.calcPontos(c, det.itens || [], aval, Array.from(naSel), R, det.recorrente, det); ptsEl.textContent = this.fmtPts(p.total) + ' pontos (' + p.pct + '% do perfeito)'; return p; };
    if (gestor && (decide || naSel.size)) {
      const chips = h('div', { class: 'na-chips' }), pinta = () => { limpar(chips); Array.from(naSel).sort().forEach(n => chips.append(h('span', { class: 'na-chip' + (naMot.indexOf(n) >= 0 && (det.naoAplica || []).indexOf(n) < 0 ? ' novo' : '') }, n,
        decide ? h('button', { type: 'button', 'aria-label': 'Tirar ' + n, text: '×', onclick: () => { naSel.delete(n); pinta(); recalc(); } }) : null))); if (!naSel.size) chips.append(h('span', { class: 'hint', text: 'Nenhum. Todos os itens se aplicam a este caminhão.' })); };
      const add = decide ? h('select', { class: 'na-add', 'aria-label': 'Marcar item que não se aplica', onchange: e => { if (e.target.value) { naSel.add(e.target.value); e.target.value = ''; pinta(); recalc(); } } },
        h('option', { value: '', text: '+ marcar item que este caminhão não tem' }), naPode.map(n => h('option', { value: n, text: n }))) : null;
      pinta();
      corpo.append(h('div', { class: 'na-box' }, h('b', { text: 'Não se aplica a ' + c.placa }), h('small', { class: 'hint', text: naMot.length ? 'O motorista marcou que o caminhão não tem: ' + naMot.join(', ') + '. Ao aprovar, fica salvo e some dos próximos checklists (e o que estava aberto desses itens é encerrado).' : 'Itens que este caminhão não tem: somem do checklist dele.' }), chips, add));
    }
    // ---- fotos: a gestão avalia (boa, meia boca, ruim); cada foto boa vale pontos ----
    corpo.append(decide ? this.galeriaAvaliar(c, aval, recalc, det) : this.galeria(c, c.avaliacao));
    if (c.aprovacao === 'APROVADO' || c.aprovacao === 'REJEITADO') corpo.append(h('p', { class: 'hint', text: (c.aprovacao === 'APROVADO' ? 'Aprovado' : 'Devolvido') + ' por ' + c.aprovadoPor + (c.aprovadoEm ? ' em ' + String(c.aprovadoEm).slice(0, 16).split(' ').map((x, i) => i ? x : x.split('-').reverse().join('/')).join(' ') : '') + (c.obsAprov ? ' · ' + c.obsAprov : '') }));
    if (decide) {
      const msg = h('div', { class: 'msg' }), mot = h('input', { type: 'text', placeholder: 'Motivo (só para devolver)', maxlength: 200 });
      const ok = h('button', { class: 'btn', type: 'button', text: 'Aprovar e liberar pontos' }), no = h('button', { class: 'btn sec', type: 'button', text: 'Devolver' });
      const resumo = h('div', { class: 'pts-prev' }, h('span', { text: 'O motorista vai ganhar ' }), ptsEl, det.recorrente ? h('small', { text: ' · meia boca recorrente: fotos meia boca valem 0' }) : null); recalc();
      const enviar = async (decisao) => { ok.disabled = no.disabled = true;
        try {
          const r = await API.chamar('decidirChecklist', { id: c.id, decisao, motivo: mot.value, resolvidas: ocs.filter(o => escolha[o.id] === 'resolvido').map(o => o.id), naoAplica: Array.from(naSel), fotosAval: aval });
          // a tela muda na hora; os dados completos chegam em segundo plano
          c.aprovacao = decisao === 'aprovar' ? 'APROVADO' : 'REJEITADO'; c.aprovadoPor = (App.sessao && App.sessao.nome) || ''; c.obsAprov = mot.value; if (r && r.calculo) c.pontos = r.calculo.total;
          m.fechar(); toast(decisao === 'aprovar' ? 'Checklist aprovado' + (r && r.pontos ? ' · +' + this.fmtPts(r.pontos) + ' pts para o motorista' : r && r.motivoZero ? '. Sem pontos: ' + r.motivoZero : '') : 'Checklist devolvido ao motorista'); App.abrirAba(App.aba); App.recarregar(true);
        } catch (e) { mensagem(msg, e.message); ok.disabled = no.disabled = false; } };
      ok.onclick = () => enviar('aprovar'); no.onclick = () => enviar('devolver');
      corpo.append(resumo, mot, msg, h('div', { class: 'modal-actions' }, no, ok));
    }
  },
  /** Fotos para avaliar: toque na foto amplia; Boa / Meia / Ruim muda os pontos. */
  galeriaAvaliar(c, aval, recalc, det) {
    let f = null; try { f = JSON.parse(c.fotos || 'null'); } catch (e) { f = null; }
    if (!f) return h('div', { class: 'hint', text: 'Este checklist não tem fotos.' });
    const th = (id, tam) => 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + tam, min = (det.fotosCfg && det.fotosCfg.carroceriaMin) || 4, itens = [];
    (f.c || []).forEach((id, i) => itens.push({ id, leg: 'Carroceria ' + (i + 1) + (i >= min ? ' (extra)' : '') })); Object.keys(f.p || {}).forEach(n => itens.push({ id: f.p[n], leg: n })); if (f.k) itens.push({ id: f.k, leg: 'Cabine' }); Object.keys(f.i || {}).forEach(n => itens.push({ id: f.i[n], leg: n }));
    const grade = h('div', { class: 'ckf-grid aval' });
    itens.forEach((x, i) => {
      const seg = h('div', { class: 'aval-seg', role: 'radiogroup', 'aria-label': 'Avaliar ' + x.leg }), card = h('div', { class: 'ckf-aval' });
      const pinta = () => { const v = aval[x.id] || 'boa'; card.dataset.g = v; $$('button', seg).forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); };
      [['boa', 'Boa'], ['meia', 'Meia'], ['ruim', 'Ruim']].forEach(([v, t]) => seg.append(h('button', { type: 'button', role: 'radio', dataset: { v }, text: t, onclick: () => { if (v === 'boa') delete aval[x.id]; else aval[x.id] = v; pinta(); recalc(); } })));
      card.append(h('button', { class: 'ckf-gal', type: 'button', title: 'Ampliar: ' + x.leg, onclick: () => Visor.abrir(itens.map(y => ({ src: th(y.id, 1600), leg: y.leg })), i) }, h('img', { src: th(x.id, 320), alt: x.leg, loading: 'lazy', onerror: e => { const i = e.target; if (!i.dataset.tentou) { i.dataset.tentou = 1; i.src = 'https://lh3.googleusercontent.com/d/' + x.id + '=w320'; } } }), h('small', { text: x.leg })), seg);
      pinta(); grade.append(card);
    });
    return h('div', { class: 'ckf-galeria' }, h('div', { class: 'sec-t', text: 'Fotos · avalie: boa vale ponto cheio, meia boca vale menos, ruim vale 0' }), grade);
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
    cx.append(...[h('div', { class: 'hoje-linha' }, placaHtmlEl(e.placa), h('div', {}, h('b', { text: e.modelo || 'Caminhão' }), h('small', { text: e.origem === 'escala' ? 'Escalado para hoje' + (e.turno ? ' · ' + e.turno : '') : 'Caminhão fixo (sem escala lançada)' }))),
      feito ? h('div', { class: 'ck-aviso', text: '✅ Checklist de hoje enviado.' }) : h('button', { class: 'btn', type: 'button', text: this.temRascunho() ? 'Continuar o checklist (salvo pela metade)' : 'Fazer o checklist de hoje', onclick: () => App.abrirAba('checklists') }),
      (() => { const st = this.situacaoCk(); return d.checklistModelo && d.checklistModelo.diario && !st.semanaFeita ? h('button', { class: 'ck-semana-falta', type: 'button', onclick: () => { this.tipoCk = 'SEMANAL'; App.abrirAba('checklists'); } }, '🗂️ Falta o checklist semanal desta semana', h('small', { text: 'Toque para fazer (já vale como o de hoje)' })) : null; })()].filter(Boolean));
    return cx;
  }
};
