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
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = limparTextoGF(v[k]); return o; }
  return v;
}
