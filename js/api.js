/* Comunicação com o Apps Script. O token vai no corpo (Apps Script não lê cabeçalhos).
   Content-Type text/plain evita o "preflight" do navegador, que o Apps Script não responde. */
const API = {
  chave: 'trm.sessao.v1',
  token() { try { return localStorage.getItem(this.chave) || ''; } catch (e) { return this._mem || ''; } },
  guardar(t) { this._mem = t; try { t ? localStorage.setItem(this.chave, t) : localStorage.removeItem(this.chave); } catch (e) {} },
  aoExpirar: null,
  async chamar(action, data, opc) {
    let r;
    try {
      const resp = await fetch(window.TRM_CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data: data || {}, token: this.token() }), redirect: 'follow' });
      r = await resp.json();
    } catch (e) { throw new Error('Sem conexão com o servidor. Tente novamente.'); }
    if (!r || r.ok === false) {
      const msg = (r && r.error) || 'Erro inesperado.';
      if (/^Sess[ãa]o/.test(msg) && !(opc && opc.semExpirar) && this.aoExpirar) this.aoExpirar();
      throw new Error(msg);
    }
    return r;
  }
};
