/* Ajuda (tutoriais por tela, conforme o acesso da pessoa), contato no WhatsApp e "Relatar problema". */
const Ajuda = {
  ZAP: '5531982328053', ZAP_VISIVEL: '(31) 98232-8053',

  /** Tutoriais: só aparecem os das telas a que a pessoa tem acesso. */
  topicos() {
    const S = App.sessao, ids = App.abasDoPerfil().map(a => a.id), tem = (...x) => x.some(i => ids.indexOf(i) >= 0), moto = S.perfil === 'motorista', gestao = ['master', 'admin'].indexOf(S.perfil) >= 0;
    const t = [];
    const add = (id, ic, titulo, passos, dica) => t.push({ id, ic, titulo, passos, dica });
    add('painel', '🏠', 'Painel inicial', moto
      ? ['Aqui aparece o caminhão em que você está escalado para hoje (ou o seu caminhão fixo).', 'O cartão de pontos mostra quantos pontos você tem. Toque nele para ver o histórico e pedir folga.', 'Os avisos da gestão aparecem logo abaixo.', 'Se ainda não fez o checklist de hoje, use o botão "Fazer o checklist agora".']
      : ['O Painel mostra só o que precisa da sua atenção, separado por sistema. Use os filtros no alto para ver um sistema de cada vez.', '"Geral" reúne avisos que não pertencem a um sistema específico (cadastros, cupons e avisos).', 'Para parar de ver um aviso por um tempo, toque em "Silenciar". Os silenciados ficam em "Silenciados" e podem voltar quando você quiser.', 'Clique numa linha para ir direto ao assunto.'],
      'Use o botão "Relatar problema" no alto do Painel se algo não funcionar.');
    if (tem('checklists') && moto) add('checklist', '✅', 'Checklist do dia', [
      'Escolha o caminhão e informe o KM que está no painel.', 'Para cada item toque em um botão: ✓ Ok (funcionando bem), ! Atenção (funciona, mas tem algo estranho ou desgastado) ou ✕ Ruim (com defeito ou perigoso).',
      'Se marcar ! ou ✕, descreva o que viu no campo que aparece. A gestão confere e manda para a oficina.', 'Viu algo que não está na lista? Use "Outro problema" no fim do checklist.', 'Tire as fotos pedidas com a câmera do celular: no mínimo 4 da carroceria (frente, trás e laterais), 1 de cada pneu (dianteiro esquerdo, dianteiro direito, traseiros e estepe) e 1 de dentro da cabine, mostrando a limpeza. Elas são enviadas enquanto você responde; espere o ✓ verde em cada foto.', 'Informe a quantidade de cordas e de cintas.', 'Toque em "Enviar checklist". Ele vai para aprovação da gestão; os pontos do checklist do dia entram quando for aprovado (uma vez por dia). Se for devolvido, o motivo aparece no Histórico.'],
      'Responda com atenção: o checklist bem feito evita quebra na estrada.');
    if (tem('abastecimento')) add('abastecimento', '⛽', 'Lançar abastecimento', [
      'Escolha o caminhão, a data (até 7 dias atrás), o produto, o KM, os litros e o valor total.', 'Toque em "Lançar abastecimento". Ele fica "aguardando fatura".', 'Quando a fatura do posto chega, o sistema confere sozinho. Se bater, vira "conferido" e você ganha pontos.'],
      'Se errar um lançamento, avise a gestão: ele não pode ser editado por você.');
    if (tem('historico')) add('historico', '🗂️', 'Histórico', ['Mostra tudo que você lançou: checklists, abastecimentos, ocorrências e pontos.', 'Use os filtros no alto para ver só um tipo.', 'Toque num checklist para ver os itens que você marcou.']);
    if (tem('escala') && moto) add('escala', '📅', 'Escalas', ['Mostra quem dirige qual caminhão nos próximos dias. Você só consulta: quem altera é a gestão.', 'Os seus dias aparecem destacados.']);
    if (moto) add('pontos', '🏆', 'Pontos, folgas e pódio', ['Você ganha pontos por checklist, abastecimento conferido e ocorrência confirmada. A gestão também pode descontar pontos por mau comportamento (com motivo).', 'Toque no cartão de pontos para ver ganhos e perdas.', 'Folga custa 200 pontos. Folga em um dia específico custa o dobro. Escolha o dia e peça; a gestão aprova ou recusa. Se recusar, os pontos voltam.', 'O pódio é mensal. Quem chegar ao top 3 recebe o aviso "Você está no pódio, continue assim!" uma vez.']);
    if (tem('frota', 'dashboard', 'alertas', 'pneus')) add('manutencao', '🔧', 'Manutenção (frota)', []
      .concat(tem('frota') ? ['Frota & Manutenções: escolha o caminhão para ver dados, KM, serviços feitos e alertas.' + (gestao ? ' Use "Novo Caminhão" para cadastrar.' : ''), 'O histórico do caminhão abre com os últimos meses; no fim da lista, "Carregar histórico anterior" traz o resto.'] : [])
      .concat(tem('dashboard') ? ['Dashboard Analítico: gastos e serviços por período e por caminhão. Ao escolher um período antigo, o histórico é buscado sozinho.'] : [])
      .concat(tem('alertas') ? ['Alertas: serviços vencidos, em andamento e agendados. Clique para ir ao caminhão.'] : [])
      .concat(tem('pneus') ? ['Controle de Pneus: movimentação, desgaste e posição de cada pneu.'] : [])
      .concat(['🖨️ Ordem de serviço: escolha o que entra e se é OS interna ou externa (prestador de fora, como a elétrica). 🔄 atualiza os dados.']));
    if (tem('checklists') && !moto) add('checklistGestao', '✅', 'Checklists enviados', ['Lista os checklists dos motoristas, com o resultado de cada um (tudo certo, atenção ou itens ruins).'].concat(gestao ? ['Os que aguardam aprovação ficam no topo. Abra, confira as fotos (toque para ampliar) e marque cada ocorrência como Pendente (vai para a oficina no GF) ou Resolvido. Depois aprove (libera os pontos) ou devolva com o motivo.'] : ['Só aparecem os checklists já aprovados pela gestão; os itens com problema viram ocorrências para a oficina.']));
    if (tem('ocorrencias')) add('ocorrencias', '⚠️', 'Ocorrências', ['Mostra os problemas relatados nos checklists, com prioridade e situação. Viram pendência depois que a gestão aprova o checklist.', 'Quando consertar, toque em "Resolvido".']);
    if (tem('defeito')) add('defeito', '🛠️', 'Relatar defeito', ['Algo errado no caminhão? Fleet → Defeito: escolha o caminhão, o tipo e descreva. Não precisa fazer checklist.', 'Diga se dá para rodar com cuidado ou se é grave (e se o caminhão está parado).', 'Vai direto para a oficina como pendência; a gestão também é avisada. Embaixo aparecem seus relatos e a situação de cada um.']);
    if (tem('podio')) add('podio', '🏆', 'Pódio', ['Ranking dos motoristas no mês, com setas comparando com a posição do mês anterior (▲ subiu, ▼ desceu, "novo" quem não pontuou antes).', 'Embaixo de cada nome aparece de onde vieram os pontos (checklists, abastecimentos…).', 'Use ‹ › para ver outros meses. Toque num motorista para lançar bônus ou desconto, sempre com motivo.']);
    if (tem('motoristas')) add('motoristas', '👥', 'Motoristas', ['Cadastre e edite motoristas (o CPF é guardado só em código, nunca aparece).', 'Dentro do motorista você vê os pontos do mês e pode lançar um ajuste (± Ajustar pontos) com motivo.', 'Pedidos de folga aparecem no Painel: abra, escolha o dia e aprove ou recuse.']);
    if (tem('ponto-horas', 'ponto-folgas', 'ponto-cartas', 'ponto-pendentes')) add('ponto', '🕒', 'Gestão de Ponto', ['Horas extras: saldo e acompanhamento por funcionário.', 'Controle de folgas: folgas planejadas e realizadas (folgas aprovadas aos motoristas entram aqui sozinhas).'].concat(tem('ponto-cartas') ? ['Gestão: Pontos e Horas: cartas de ponto, saldo de horas e fechamentos.'] : []).concat(['Cartas pendentes: o que ainda precisa de conferência.']));
    if (tem('fin-escolha')) add('financeiroLoja', '🏬', 'Financeiro › Loja', ['Faturamento de frete da Casas Bahia, com as abas Operacional, Financeiro e Relatório CB.', 'A base vem sozinha da planilha online a cada 30 minutos. "Atualizar da planilha online" lê na hora.', '"Carregar arquivo" troca a base pelo arquivo FATURAMENT_LOJA (.xlsx/.xlsm) para todos da gestão; ele vale até a planilha online mudar de novo.', 'A previsão de viagens da semana (Relatório CB) fica salva para toda a gestão.']);
    if (tem('fin-escolha')) add('financeiro', '💰', 'Financeiro › Rota', [
      'Ao abrir o Financeiro, escolha Rota ou Loja.', 'Área de Lançamento: lance os depósitos pré-pagos, anexe as planilhas quinzenais de fechamento (.xlsx), filtre o período e salve o balanço.', 'Ticket & Escala: cadastre a tarifa de cada região (até 24 paradas e acima de 25), anexe a escala do dia e veja custo e ticket médio.',
      'Balanços & Escalas: acompanhe o crédito semanal contra o gasto das escalas e salve o balanço da semana.', 'Histórico Semanal: balanços já fechados. Ao excluir um, os lançamentos voltam para a tela.', 'Tudo é salvo sozinho. Se outra pessoa alterar ao mesmo tempo, o sistema avisa.'],
      'Atenção: excluir e fechar balanços muda os valores. Confira o período antes de salvar.');
    if (S.perfil === 'master') add('master', '🛠️', 'Administração (master)', ['Menu do perfil › Usuários: aprove cadastros, defina o perfil e os sistemas de cada pessoa.', 'Pendências de placa: cupons de combustível sem placa identificada.', 'Problemas relatados: tudo que as pessoas relatarem pelo botão "Relatar problema" aparece no Painel e no menu do perfil.']);
    return t;
  },

  abrir(inicial) {
    const lista = h('div', { class: 'aj-lista' }), topicos = this.topicos(), abertos = {};
    const corpo = h('div', { class: 'aj' }, h('p', { class: 'hint', text: 'Toque numa tela para ver como ela funciona.' }), lista);
    const bloco = t => {
      const det = h('div', { class: 'aj-det', hidden: true }, h('ol', {}, t.passos.map(p => h('li', { text: p }))), t.dica ? h('p', { class: 'aj-dica', text: '💡 ' + t.dica }) : null);
      const cab = h('button', { type: 'button', class: 'aj-cab', 'aria-expanded': 'false' }, h('span', { class: 'ic', text: t.ic }), h('b', { text: t.titulo }), h('span', { class: 'chev', text: '▸' }));
      cab.onclick = () => { const a = det.hidden; det.hidden = !a; cab.setAttribute('aria-expanded', a ? 'true' : 'false'); cab.lastChild.textContent = a ? '▾' : '▸'; };
      const bx = h('div', { class: 'aj-bloco', dataset: { t: t.id } }, cab, det); if (t.id === inicial) { det.hidden = false; cab.setAttribute('aria-expanded', 'true'); cab.lastChild.textContent = '▾'; } return bx;
    };
    topicos.forEach(t => lista.append(bloco(t)));
    const contato = h('div', { class: 'aj-contato', hidden: true });
    const duvida = h('button', { class: 'btn secondary', type: 'button', text: '🤔 Ainda tenho dúvidas', onclick: () => { contato.hidden = false; this.preencherContato(contato, inicial); contato.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });
    corpo.append(h('div', { class: 'modal-actions' }, duvida, h('button', { class: 'btn secondary', type: 'button', text: '🐞 Relatar problema', onclick: () => { m.fechar(); this.relatar(); } })), contato);
    const m = abrirModal('Ajuda', corpo, { largo: true });
    if (inicial) { const el = $('.aj-bloco[data-t="' + inicial + '"]', corpo); if (el) setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 50); }
    return m;
  },
  preencherContato(caixa, topico) {
    limpar(caixa);
    const S = App.sessao, t = this.topicos().find(x => x.id === topico), msg = 'Olá João Paulo! Sou ' + nomeBonito(S.nome) + (t ? ' e tenho dúvida sobre: ' + t.titulo : ' e tenho uma dúvida sobre o sistema') + '.';
    caixa.append(h('p', {}, 'Fale direto com o João Paulo: ', h('b', { text: this.ZAP_VISIVEL })),
      h('a', { class: 'btn', href: 'https://wa.me/' + this.ZAP + '?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener noreferrer', text: '💬 Chamar no WhatsApp' }));
  },

  /** Relatar problema: qualquer pessoa envia; só o master vê. */
  relatar() {
    const a = App.abaAtual(), tela = h('input', { type: 'text', maxlength: 80, value: a ? a.nome : 'Painel' }), txt = h('textarea', { rows: 5, maxlength: 1000, placeholder: 'O que aconteceu? O que você estava tentando fazer?' }), msg = h('div', { class: 'msg' });
    const env = h('button', { class: 'btn', type: 'button', text: 'Enviar relato' });
    const m = abrirModal('Relatar problema', h('div', {}, h('p', { class: 'hint', text: 'Encontrou um erro? Conte aqui. O João Paulo recebe e corrige.' }), campo('Em qual tela?', tela), campo('O que aconteceu?', txt), msg, h('div', { class: 'modal-actions' }, env)));
    env.onclick = async () => {
      mensagem(msg, ''); if (txt.value.trim().length < 5) return mensagem(msg, 'Conte o que aconteceu.');
      env.disabled = true; env.textContent = 'Enviando…';
      try { await API.chamar('relatarProblema', { tela: tela.value, descricao: txt.value, aparelho: (navigator.userAgent || '').slice(0, 160) }); m.fechar(); toast('Recebido! Obrigado por avisar.'); }
      catch (e) { mensagem(msg, e.message); env.disabled = false; env.textContent = 'Enviar relato'; }
    };
  },
  problemas() {
    const l = ((App.dados && App.dados.problemas) || []).slice().reverse(), cx = h('div', {});
    if (!l.length) cx.append(h('div', { class: 'empty', text: 'Nenhum problema em aberto. 🎉' }));
    l.forEach(p => {
      const andamento = String(p.status).toUpperCase() === 'EM ANDAMENTO';
      const lin = h('div', { class: 'hist-lin pr-lin' }, h('div', {}, h('b', { text: nomeBonito(p.nome) + ' · ' + (p.tela || '-') }), h('small', { text: String(p.criadoEm).slice(0, 16) + ' · ' + (p.perfil || '') }), h('p', { class: 'aj-prob', text: p.descricao }),
        p.resposta ? h('small', { class: 'pr-resp', text: '💬 ' + p.resposta }) : null, h('small', { text: p.aparelho || '' })),
        h('div', { class: 'pr-acoes' }, h('span', { class: 'badge ' + (andamento ? 'amber' : 'red'), text: andamento ? 'em andamento' : 'aberto' }),
          h('button', { class: 'btn small secondary', type: 'button', text: 'Em andamento', onclick: () => this.responderProblema(p, 'andamento', m) }),
          h('button', { class: 'btn small', type: 'button', text: 'Resolvido', onclick: () => this.responderProblema(p, 'resolvido', m) })));
      cx.append(lin);
    });
    const m = abrirModal('Problemas relatados', cx, { largo: true });
  },
  /** Marcar exige uma mensagem: ela aparece no Painel de quem relatou. */
  responderProblema(p, status, lista) {
    const tx = h('textarea', { rows: 3, maxlength: 500, placeholder: status === 'resolvido' ? 'Ex.: Corrigido. Atualize a página e teste de novo.' : 'Ex.: Já estou vendo, até amanhã fica pronto.' });
    const msg = h('div', { class: 'msg' }), ok = h('button', { class: 'btn', type: 'button', text: status === 'resolvido' ? 'Marcar como resolvido' : 'Marcar em andamento' });
    ok.onclick = async () => {
      if (tx.value.trim().length < 3) return mensagem(msg, 'Escreva uma mensagem para quem relatou.');
      ok.disabled = true;
      try { await API.chamar('atualizarProblema', { id: p.id, status, mensagem: tx.value.trim() }); m.fechar(); if (lista) lista.fechar(); await App.recarregar(true); toast(status === 'resolvido' ? 'Marcado como resolvido. ' + nomeBonito(p.nome).split(' ')[0] + ' vai ver a mensagem no Painel.' : 'Marcado em andamento.'); this.problemas(); }
      catch (e) { mensagem(msg, e.message); ok.disabled = false; }
    };
    const m = abrirModal(status === 'resolvido' ? 'Resolvido' : 'Em andamento', h('div', {}, h('p', { class: 'hint', text: 'Mensagem para ' + nomeBonito(p.nome) + ' (aparece no Painel dele):' }), tx, msg, h('div', { class: 'modal-actions' }, ok)));
    setTimeout(() => tx.focus(), 50);
  }
};
