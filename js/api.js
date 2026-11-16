/* Comunicação com o Apps Script. O token vai no corpo (Apps Script não lê cabeçalhos).
   Content-Type text/plain evita o "preflight" do navegador, que o Apps Script não responde. */
const API = {
  chave: 'trm.sessao.v1',
  token() { try { return localStorage.getItem(this.chave) || ''; } catch (e) { return this._mem || ''; } },
  guardar(t) { this._mem = t; try { t ? localStorage.setItem(this.chave, t) : localStorage.removeItem(this.chave); } catch (e) {} },
  aoExpirar: null,
  _ativas: 0,
  barra(delta) {
    this._ativas = Math.max(0, this._ativas + delta);
    let b = document.getElementById('apiBarra');
    if (!b) { b = document.createElement('div'); b.id = 'apiBarra'; document.body.appendChild(b); }
    b.classList.toggle('on', this._ativas > 0);
  },
  aquecer() { try { fetch(window.TRM_CONFIG.API_URL, { method: 'GET', mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) {} },
  async chamar(action, data, opc) {
    let r;
    const mudo = opc && opc.mudo; if (!mudo) this.barra(1);
    try {
      const resp = await fetch(window.TRM_CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data: data || {}, token: this.token() }), redirect: 'follow' });
      r = await resp.json();
    } catch (e) { throw new Error('Sem conexão com o servidor. Tente novamente.'); }
    finally { if (!mudo) this.barra(-1); }
    if (!r || r.ok === false) {
      const msg = (r && r.error) || 'Erro inesperado.';
      if (/^Sess[ãa]o/.test(msg) && !(opc && opc.semExpirar) && this.aoExpirar) this.aoExpirar();
      const er = new Error(msg); if (r && r.codigo) er.codigo = r.codigo; throw er;
    }
    return r;
  }
};
