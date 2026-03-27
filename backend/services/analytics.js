// Minimal analytics stubs used in tests
class AnalyticsEngine {
  static async trackAIAnalysis(event, data) {
    return true;
  }

  static async trackEvent(name, payload) {
    return true;
  }
}

class BusinessIntelligenceService {
  static async recordMetric(name, value) {
    return true;
  }
}

module.exports = { AnalyticsEngine, BusinessIntelligenceService };
