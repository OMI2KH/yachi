// Minimal security service stubs used by AI/payment services in tests
class SecurityService {
  static async analyze(payload) {
    return { ok: true };
  }

  static sanitize(input) {
    return input;
  }
}

class FraudDetectionService {
  static async assess(transaction) {
    return { risk: 'low' };
  }
}

module.exports = { SecurityService, FraudDetectionService };
