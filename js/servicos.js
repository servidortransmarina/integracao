/* Leitor de serviços: transforma o que a pessoa digitou ("troca de óleo e filtro", "oleo mot", "alinhamento + balanceamento")
   em uma ou mais manutenções com o tipo certo. O MESMO arquivo roda no site (js/servicos.js) e no Apps Script (Servicos.gs):
   se mudar um, copie para o outro (o teste automático confere que são iguais).
   Tipos rastreados (zeram o contador de troca): oleo, oleo_caixa, oleo_diferencial, alinhamento, engraxamento. O resto é "outro" + descrição. */
var Servicos = (function () {
  var NOMES = { oleo: 'Troca de óleo do motor', oleo_caixa: 'Troca de óleo da caixa', oleo_diferencial: 'Troca de óleo do diferencial', alinhamento: 'Alinhamento', engraxamento: 'Engraxamento' };
  var PERGUNTA_OLEO = 'Qual óleo? Escreva motor, caixa, diferencial, freio, direção ou embreagem (ex.: "óleo do motor").';
  var PERGUNTA_FILTRO = 'Qual filtro? Escreva de óleo, de combustível, de ar ou separador de água (ex.: "filtro de ar").';
  var PERGUNTA_FILTROS = 'Quais filtros? Escreva cada um, separado por vírgula: filtro de óleo, de combustível, de ar ou separador de água.';

  function norm(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function bonito(t) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  /** Divide nos separadores: "e", "+", vírgula, ponto e vírgula, "&", barra (menos 295/80), e "com"/"c/" quando o que vem depois é um filtro. */
  function partes(texto) {
    var t = String(texto || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    t = t.replace(/\s*(?:\bc\/|\bcom\b)\s*(?=filtro)/gi, ' + ');
    return t.split(/\s*(?:\+|,|;|&|(?:^|\s)e(?=\s)|(?<!\d)\/|\/(?!\d))\s*/i).map(function (p) { return p.trim(); }).filter(function (p) { return p && !/^(e|troca|troca de|trocar)$/i.test(p); });
  }

  function qualOleo(n) {
    if (/\bfreio/.test(n)) return { tipo: 'outro', descricao: 'Troca de óleo do freio' };
    if (/\bembreag/.test(n)) return { tipo: 'outro', descricao: 'Troca de fluido da embreagem' };
    if (/\bdirecao\b|\bhidraulic/.test(n)) return { tipo: 'outro', descricao: 'Troca de óleo da direção' };
    if (/\bcaixa\b|\bcambio\b|\bcx\b|\bmarcha/.test(n)) return { tipo: 'oleo_caixa', descricao: '' };
    if (/\bdiferencial\b|\bdif\b|\beixo\b|\btraseir/.test(n)) return { tipo: 'oleo_diferencial', descricao: '' };
    if (/\bmotor\b|\bmot\b|\b\d{1,2}w\d{2}\b/.test(n)) return { tipo: 'oleo', descricao: '' };
    return null;
  }
  function qualFiltro(n) {
    if (/cabine|condicionado/.test(n)) return 'Troca de filtro de cabine';
    if (/secador/.test(n)) return 'Troca de filtro secador de ar';
    if (/separador|racor|\bagua\b/.test(n)) return 'Troca de filtro separador de água';
    if (/combust|diesel/.test(n)) return 'Troca de filtro de combustível';
    if (/hidraulic|direcao/.test(n)) return 'Troca de filtro hidráulico';
    if (/\boleo\b|lubrif/.test(n)) return 'Troca de filtro de óleo';
    if (/\bar\b/.test(n)) return 'Troca de filtro de ar';
    return '';
  }

  /** Uma parte → {tipo, descricao} ou {erro}. "ant" é o serviço anterior da mesma frase (dá o contexto de "e filtro", "e caixa"). */
  function classificar(parte, ant) {
    var n = norm(parte);
    if (!n) return null;
    if (/\b(diesel|arla|abastec)/.test(n) && !/filtro/.test(n)) return { tipo: 'abastecimento', descricao: bonito(parte) };
    if (/\balinha/.test(n)) return { tipo: 'alinhamento', descricao: '' };
    if (/\bbalancea/.test(n)) return { tipo: 'outro', descricao: 'Balanceamento' };
    if (/engrax|\bgraxa\b|lubrificacao (do |de )?chassi/.test(n)) return { tipo: 'engraxamento', descricao: '' };
    if (/\bfiltros?\b/.test(n)) {
      var f = qualFiltro(n);
      if (f) return { tipo: 'outro', descricao: f };
      if (/\bfiltros\b/.test(n)) return { erro: PERGUNTA_FILTROS };
      if (ant && (ant.tipo === 'oleo' || ant.descricao === 'Troca de filtro de óleo')) return { tipo: 'outro', descricao: 'Troca de filtro de óleo' };
      return { erro: PERGUNTA_FILTRO };
    }
    if (/\boleos?\b|\blubrificante\b|\bfluidos?\b|\b\d{1,2}w\d{2}\b/.test(n)) {
      var o = qualOleo(n);
      if (o) return o;
      return { erro: PERGUNTA_OLEO };
    }
    // "óleo do motor e caixa": a segunda parte herda o "óleo"
    if (ant && /^(oleo|oleo_caixa|oleo_diferencial)$/.test(ant.tipo) && /^(da |do |de )?(caixa|cambio|cx|diferencial|dif|motor|mot)\b/.test(n)) return qualOleo(n);
    return { tipo: 'outro', descricao: bonito(parte) };
  }

  /** Texto → { itens: [{tipo, descricao, texto, nome}], erro? }. Mais de um item = mais de uma manutenção. */
  function ler(texto) {
    var ps = partes(texto), itens = [], ant = null, i, c;
    // "troca de óleo e filtro": óleo sem dizer qual, junto com filtro, é a troca do motor (é como a oficina fala)
    var temFiltro = ps.some(function (p) { return /\bfiltros?\b/.test(norm(p)); });
    for (i = 0; i < ps.length; i++) {
      c = classificar(ps[i], ant);
      if (c && c.erro === PERGUNTA_OLEO && temFiltro && !/\bfiltro/.test(norm(ps[i]))) c = { tipo: 'oleo', descricao: '' };
      if (!c) continue;
      if (c.erro) return { itens: itens, erro: c.erro, parte: ps[i] };
      c.texto = ps[i]; c.nome = c.tipo === 'outro' || c.tipo === 'abastecimento' ? c.descricao : NOMES[c.tipo];
      itens.push(c); ant = c;
    }
    // abastecimento ("diesel e arla") nunca vira várias manutenções
    if (itens.length > 1 && itens.some(function (x) { return x.tipo === 'abastecimento'; })) itens = [{ tipo: 'abastecimento', descricao: bonito(texto), texto: texto, nome: bonito(texto) }];
    // o mesmo serviço repetido ("óleo motor + troca de óleo do motor") conta uma vez só
    var vistos = {}; itens = itens.filter(function (x) { var k = x.tipo + '|' + norm(x.descricao); if (vistos[k]) return false; vistos[k] = 1; return true; });
    return { itens: itens };
  }
  return { ler: ler, partes: partes, norm: norm, NOMES: NOMES };
})();
