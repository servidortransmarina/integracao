/* Pendências de placa — cupons de combustível que o robô não soube a quem atribuir. Só o master resolve (o servidor também confere). */
const Pendencias = {
  async abrir() {
    const caixa = h('div', {}, h('div', { class: 'empty', text: 'Carregando…' })), mod = abrirModal('Pendências de placa', caixa, { largo: true });
    const desenhar = async () => {
      let r; try { r = await API.chamar('listarPendenciasPlaca'); } catch (e) { limpar(caixa).append(h('div', { class: 'msg show err', text: e.message })); return; }
      limpar(caixa);
      if (App.dados) App.dados.pendenciasPlaca = r.pendencias.length;
      if (App.sessao) { App.montarUsuario(); App.montarNavegacao(); }
      if (!r.pendencias.length) { caixa.append(h('div', { class: 'vazio-ok', text: 'Nenhuma pendência. ✅' })); return; }
      caixa.append(h('p', { class: 'hint', text: 'O posto leu uma placa que não existe na frota. Escolha a placa certa: o cupom é lançado e o sistema lembra a correção para os próximos.' }));
      r.pendencias.forEach(p => {
        const sel = h('select', {}, h('option', { value: '' }, 'Escolha a placa…'),
          ...p.candidatas.map(c => h('option', { value: c.placa }, c.placa + (c.parecida ? '  ★ parecida' : ''))));
        const lembrar = h('input', { type: 'checkbox', checked: true });
        const agir = async placa => {
          if (!placa) return toast('Escolha a placa.', true);
          try { const x = await API.chamar('resolverPendenciaPlaca', { id: p.id, placa, lembrar: lembrar.checked }); toast(placa === 'IGNORAR' ? 'Cupom descartado.' : 'Pendência resolvida' + (x.lancados ? ' e cupom lançado.' : '.')); await App.recarregar(true); }
          catch (e) { toast(e.message, true); }
          desenhar();
        };
        caixa.append(h('div', { class: 'card', style: 'padding:14px' },
          h('div', { class: 'row', style: 'align-items:center;gap:14px' }, placaHtmlEl(p.placaLida),
            h('div', { style: 'flex:1;min-width:180px' }, h('b', { text: 'Lida como ' + p.placaLida }),
              h('div', { class: 'hint', style: 'margin:2px 0', text: fmtData(p.data) + (p.hora ? ' ' + p.hora.slice(0, 5) : '') + ' · ' + p.produto + ' · ' + Number(p.litros).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' L · ' + fmtReais(p.valor) }),
              p.sugestao ? h('div', { class: 'hint', style: 'margin:0', text: 'Dúvida do robô: ' + p.sugestao }) : null)),
          h('div', { class: 'row', style: 'margin-top:12px;align-items:center' }, h('div', { class: 'field', style: 'margin:0;min-width:200px' }, sel),
            h('button', { class: 'btn small success', type: 'button', text: 'Corrigir', onclick: () => agir(sel.value) }),
            h('button', { class: 'btn small secondary', type: 'button', text: 'Não é da frota', onclick: () => confirm('Descartar este cupom? A placa ' + p.placaLida + ' será ignorada nos próximos.') && agir('IGNORAR') })),
          h('label', { class: 'pers-item', style: 'border:0;padding:8px 0 0;font-size:12px;color:var(--dim)' }, lembrar, h('span', { text: 'Lembrar: sempre que o posto ler ' + p.placaLida + ', tratar conforme esta escolha' }))));
      });
    };
    desenhar();
  }
};
