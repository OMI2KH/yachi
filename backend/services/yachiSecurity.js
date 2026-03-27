class YachiSecurity {
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '');
  }

  static maskSensitiveData(value) {
    if (!value || typeof value !== 'string') return value;
    if (value.includes('@')) return value.slice(0, 2) + '****' + value.slice(value.indexOf('@'));
    if (value.length > 6) return value.slice(0, 3) + '******' + value.slice(-3);
    return '****';
  }

  static isValidFayda(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[A-Z0-9]{9,15}$/.test(id);
  }

  static generateSecureToken(bytes = 32) {
    return require('crypto').randomBytes(bytes).toString('hex');
  }
}

module.exports = { YachiSecurity };
