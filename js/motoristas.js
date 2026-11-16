/* Fleet → Motoristas: lista, perfil com pontos, cadastro e edição (gestão). O CPF só é enviado no cadastro e vira código irreversível no servidor. */
const Motoristas = {
  busca: '',

  pontosDe(id) {
    const d = App.dados, mes = String(d.hoje || '').slice(0, 7), r = { mes: 0, total: 0, lanc: [] };
    (d.pontos || []).filter(p => String(p.motoristaId) === String(id)).forEach(p => {
      const v = Number(p.pontos) || 0; r.total += v; if (String(p.dataHora || '').slice(0, 7) === mes) r.mes += v; r.lanc.push(p);
    });
    r.lanc.sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora)));
    return r;
  },
  lista() { return (App.dados.motoristas || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome))); },

  render() {
    const raiz = h('div'), grade = h('div', { class: 'mot-grid' });
    const busca = h('input', { type: 'search', placeholder: '🔎 Buscar motorista, matrícula ou placa…', value: this.busca });
    const desenhar = () => {
      limpar(grade); const q = this.busca.trim().toLowerCase();
      const itens = this.lista().filter(m => !q || [m.nome, m.matricula, m.placaFixa].join(' ').toLowerCase().indexOf(q) >= 0);
      if (!itens.length) grade.append(h('div', { class: 'empty', text: q ? 'Nenhum motorista encontrado.' : 'Nenhum motorista cadastrado ainda.' }));
      itens.forEach(m => {
        const p = this.pontosDe(m.id), inativo = String(m.status).toLowerCase() === 'inativo';
        grade.append(h('button', { type: 'button', class: 'mot-card' + (inativo ? ' inativo' : ''), onclick: () => this.perfil(m.id) },
          h('span', { class: 'avatar mot-av' }, avatarNo(m.avatar || '🚛')),
          h('div', { class: 'mot-tx' }, h('b', { text: nomeBonito(m.nome) }), h('small', { text: [m.matricula ? 'Mat. ' + m.matricula : '', m.placaFixa || 'sem placa fixa'].filter(Boolean).join(' · ') })),
          h('div', { class: 'mot-pts' }, h('b', { text: p.mes.toLocaleString('pt-BR') }), h('small', { text: 'pts no mês' }))));
      });
    };
    busca.oninput = () => { this.busca = busca.value; desenhar(); };
    raiz.append(h('div', { class: 'card mot-topo' }, h('div', { class: 'field', style: 'flex:1;margin:0;min-width:220px' }, busca),
      h('button', { class: 'btn', type: 'button', text: '＋ Cadastrar motorista', onclick: () => this.formulario() })), grade);
    desenhar(); return raiz;
  },

  perfil(id) {
    const m = (App.dados.motoristas || []).find(x => String(x.id) === String(id)); if (!m) return;
    const p = this.pontosDe(id), lin = (t, v) => h('div', { class: 'mot-lin' }, h('span', { text: t }), h('b', { text: v || '—' }));
    const corpo = h('div', { class: 'mot-perfil' },
      h('div', { class: 'mot-cab' }, h('span', { class: 'avatar mot-av grande' }, avatarNo(m.avatar || '🚛')), h('div', {}, h('h3', { text: nomeBonito(m.nome) }),
        h('span', { class: 'badge ' + (String(m.status).toLowerCase() === 'inativo' ? 'red' : 'green'), text: m.status || 'Ativo' }))),
      h('div', { class: 'mot-kpis' }, h('div', {}, h('b', { text: p.mes.toLocaleString('pt-BR') }), h('small', { text: 'pontos no mês' })), h('div', {}, h('b', { text: p.total.toLocaleString('pt-BR') }), h('small', { text: 'pontos no total' }))),
      lin('Matrícula', m.matricula), lin('Telefone', m.telefone), lin('Vínculo', m.vinculo), lin('Placa fixa', m.placaFixa), lin('CPF', m.cpfFinal),
      h('h4', { text: 'Últimos pontos' }),
      p.lanc.length ? h('div', { class: 'mot-lanc' }, p.lanc.slice(0, 12).map(l => h('div', {}, h('span', { text: String(l.dataHora || '').slice(0, 10).split('-').reverse().join('/') + ' · ' + (l.descricao || l.evento) }), h('b', { class: Number(l.pontos) < 0 ? 'neg' : 'pos', text: (Number(l.pontos) > 0 ? '+' : '') + l.pontos }))))
        : h('div', { class: 'hint', text: 'Ainda sem pontos.' }));
    const mod = abrirModal('Motorista', h('div', {}, corpo, h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', text: 'Fechar', onclick: () => mod.fechar() }),
      h('button', { class: 'btn secondary', text: '± Ajustar pontos', onclick: () => { mod.fechar(); Pontos.ajustar(m); } }), h('button', { class: 'btn', text: '✏️ Editar', onclick: () => { mod.fechar(); this.formulario(m); } }))));
  },

  formulario(m) {
    const edit = !!m, v = k => (m && m[k]) || '';
    const nome = h('input', { type: 'text', value: v('nome'), autocomplete: 'off' }), mat = h('input', { type: 'text', value: v('matricula'), maxlength: '20' });
    const cpf = h('input', { type: 'text', inputmode: 'numeric', maxlength: '14', placeholder: '000.000.000-00', autocomplete: 'off' });
    const tel = h('input', { type: 'tel', value: v('telefone'), maxlength: '20' }), placa = h('input', { type: 'text', value: v('placaFixa'), maxlength: '8', placeholder: 'ABC1D23' });
    const vinc = h('select', {}, ['Frota própria', 'Terceirizado', 'Agregado'].map(o => h('option', { value: o, selected: o === (v('vinculo') || 'Frota própria') ? true : null }, o)));
    const stat = h('select', {}, ['Ativo', 'Inativo'].map(o => h('option', { value: o, selected: o === (v('status') || 'Ativo') ? true : null }, o)));
    const msg = h('div', { class: 'msg' }), salvar = h('button', { class: 'btn', type: 'submit', text: edit ? 'Salvar' : 'Cadastrar' });
    const f = h('form', { onsubmit: async e => {
      e.preventDefault(); mensagem(msg, ''); salvar.disabled = true;
      try {
        const dados = { nome: nome.value.trim(), matricula: mat.value.trim(), telefone: tel.value.trim(), placaFixa: placa.value.trim(), vinculo: vinc.value, status: stat.value };
        if (edit) await API.chamar('editarMotorista', Object.assign({ id: m.id }, dados)); else await API.chamar('cadastrarMotorista', Object.assign({ cpf: cpf.value }, dados));
        mod.fechar(); toast(edit ? 'Motorista atualizado.' : 'Motorista cadastrado.'); await App.recarregar(true);
      } catch (err) { mensagem(msg, err.message); }
      salvar.disabled = false;
    } }, campo('Nome completo', nome), edit ? null : campo('CPF', cpf, 'Usado só para identificar a pessoa; guardamos apenas um código irreversível. Quando ela criar a conta com este CPF, o acesso é ligado a este cadastro.'),
      campo('Matrícula', mat), campo('Telefone', tel), campo('Placa fixa (opcional)', placa), campo('Vínculo', vinc), edit ? campo('Situação', stat) : null, msg,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn secondary', type: 'button', text: 'Cancelar', onclick: () => mod.fechar() }), salvar));
    const mod = abrirModal(edit ? 'Editar motorista' : 'Cadastrar motorista', f);
  }
};
