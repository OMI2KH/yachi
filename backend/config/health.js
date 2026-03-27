module.exports = {
  // Health check configuration
  health: {
    // Basic check timeout (ms)
    timeout: 10000,
    
    // Detailed check timeout (ms)
    detailedTimeout: 30000,
    
    // Cache health check results (seconds)
    cacheDuration: 30,
    
    // Services to monitor
    services: {
      database: {
        enabled: true,
        timeout: 5000
      },
      redis: {
        enabled: true,
        timeout: 3000
      },
      storage: {
        enabled: true,
        timeout: 5000
      }
    },
    
    // Performance thresholds
    thresholds: {
      responseTime: {
        warning: 500,   // ms
        critical: 1000  // ms
      },
      memory: {
        warning: 0.8,   // 80%
        critical: 0.9   // 90%
      },
      cpu: {
        warning: 0.7,   // 70%
        critical: 0.9   // 90%
      }
    },
    
    // Alert configuration
    alerts: {
      enabled: true,
      channels: ['log', 'email', 'slack'],
      recipients: ['devops@yachi.com']
    }
  }
};