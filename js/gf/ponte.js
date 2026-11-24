/* Ponte entre o Hub e o GF portado. Carrega ANTES de script.js (define GF) e é completada por Hub (hub.js). */
const GF = {
  perfil() { return (typeof App !== 'undefined' && App.sessao && App.sessao.perfil) || 'mecanico'; },
  nome() { return (typeof App !== 'undefined' && App.sessao && (App.sessao.nome || App.sessao.usuario)) || 'Desconhecido'; }
};

/* Dados vindos do servidor podem ter sido digitados por qualquer usuário e o GF desenha com innerHTML:
   tira < > e aspas/crase/barra de todo texto livre antes de o GF ver. (O servidor passa a fazer o mesmo na entrada.) */
function limparTextoGF(v) {
  if (typeof v === 'string') return v.replace(/[<>]/g, '').replace(/["`]/g, '”').replace(/'/g, '’').replace(/\\/g, '/');
  if (Array.isArray(v)) return v.map(limparTextoGF);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) { let x = v[k];
      if (k === 'pecas' && typeof x === 'string' && x.charAt(0) === '[') { try { x = JSON.parse(x); } catch (e) { x = []; } }     // lista de peças do agendamento: lê antes de limpar as aspas
      o[k] = limparTextoGF(x); } return o; }
  return v;
}
