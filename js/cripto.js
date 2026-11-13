/* Senha → chave, no próprio navegador (WebCrypto, PBKDF2-SHA256, 310 mil voltas ≈ 0,3 s).
   O servidor nunca faz esse cálculo pesado: só confere um HMAC da chave. Isso deixa o login rápido sem enfraquecer a senha. */
const Cripto = {
  VOLTAS: 310000,
  async chave(usuario, senha) {
    if (!(window.crypto && crypto.subtle)) throw new Error('Este navegador não suporta o login seguro. Atualize o navegador.');
    const norm = String(usuario || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('trm1:' + norm), iterations: this.VOLTAS }, base, 256);
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  /** Chama uma ação que confere a senha atual. Conta antiga (formato lento) responde ATUALIZAR: manda a senha uma vez para converter. */
  async comSenhaAtual(acao, dados, usuario, senhaAtual, opc) {
    const base = Object.assign({}, dados, { chaveAtual: await this.chave(usuario, senhaAtual) });
    try { return await API.chamar(acao, base, opc); }
    catch (e) { if (e.codigo === 'ATUALIZAR') return API.chamar(acao, Object.assign({ senhaAtual }, base), opc); throw e; }
  },
  async trocarSenha(usuario, atual, nova) {
    return this.comSenhaAtual('alterarSenha', { novaSenha: nova, novaChave: await this.chave(usuario, nova) }, usuario, atual);
  }
};
