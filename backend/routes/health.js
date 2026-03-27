const express = require('express');
const { Sequelize } = require('sequelize');
const redis = require('../config/redis');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { YachiSecurity } = require('../services/yachiSecurity');
const { YachiNotifications } = require('../services/yachiNotifications');

const router = express.Router();

// 🎯 HEALTH CHECK STATUS CODES
const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  MAINTENANCE: 'maintenance'
};

// 🎯 SERVICE DEPENDENCIES
const SERVICE_DEPENDENCIES = {
  database: {
    name: 'PostgreSQL Database',
    critical: true,
    timeout: 5000
  },
  redis: {
    name: 'Redis Cache',
    critical: true,
    timeout: 3000
  },
  storage: {
    name: 'File Storage',
    critical: false,
    timeout: 3000
  },
  ai_services: {
    name: 'AI Services',
    critical: false,
    timeout: 5000
  },
  payment_gateway: {
    name: 'Payment Gateway',
    critical: false,
    timeout: 5000
  },
  email_service: {
    name: 'Email Service',
    critical: false,
    timeout: 5000
  },
  sms_service: {
    name: 'SMS Service',
    critical: false,
    timeout: 5000
  },
  push_notifications: {
    name: 'Push Notifications',
    critical: false,
    timeout: 3000
  }
};

// 🚀 BASIC HEALTH CHECK
router.get('/', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck('basic');
    
    res.json({
      success: true,
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      uptime: healthCheck.uptime,
      version: healthCheck.version,
      environment: healthCheck.environment,
      checks: healthCheck.checks
    });

  } catch (error) {
    console.error('Health Check Error:', error);
    res.status(503).json({
      success: false,
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      code: 'HEALTH_CHECK_FAILED'
    });
  }
});

// 🚀 COMPREHENSIVE HEALTH CHECK
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck('detailed');
    
    const statusCode = healthCheck.status === HealthStatus.UNHEALTHY ? 503 : 200;
    
    res.status(statusCode).json({
      success: healthCheck.status !== HealthStatus.UNHEALTHY,
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      uptime: healthCheck.uptime,
      version: healthCheck.version,
      environment: healthCheck.environment,
      system: healthCheck.system,
      dependencies: healthCheck.dependencies,
      performance: healthCheck.performance,
      checks: healthCheck.checks
    });

  } catch (error) {
    console.error('Detailed Health Check Error:', error);
    res.status(503).json({
      success: false,
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      code: 'DETAILED_HEALTH_CHECK_FAILED'
    });
  }
});

// 🚀 SERVICE-SPECIFIC HEALTH CHECK
router.get('/service/:service', async (req, res) => {
  try {
    const service = req.params.service;
    
    if (!SERVICE_DEPENDENCIES[service]) {
      return res.status(404).json({
        success: false,
        message: `Service '${service}' not found`,
        code: 'SERVICE_NOT_FOUND'
      });
    }

    const serviceHealth = await checkServiceHealth(service);
    
    res.json({
      success: serviceHealth.status === HealthStatus.HEALTHY,
      service: service,
      status: serviceHealth.status,
      timestamp: serviceHealth.timestamp,
      responseTime: serviceHealth.responseTime,
      details: serviceHealth.details
    });

  } catch (error) {
    console.error('Service Health Check Error:', error);
    res.status(503).json({
      success: false,
      service: req.params.service,
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Service health check failed',
      code: 'SERVICE_HEALTH_CHECK_FAILED'
    });
  }
});

// 🚀 DATABASE HEALTH CHECK
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    res.json({
      success: dbHealth.status === HealthStatus.HEALTHY,
      service: 'database',
      status: dbHealth.status,
      timestamp: dbHealth.timestamp,
      responseTime: dbHealth.responseTime,
      details: {
        connection: dbHealth.connection,
        migrations: dbHealth.migrations,
        performance: dbHealth.performance
      }
    });

  } catch (error) {
    console.error('Database Health Check Error:', error);
    res.status(503).json({
      success: false,
      service: 'database',
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Database health check failed',
      code: 'DATABASE_HEALTH_CHECK_FAILED'
    });
  }
});

// 🚀 CACHE HEALTH CHECK
router.get('/cache', async (req, res) => {
  try {
    const cacheHealth = await checkCacheHealth();
    
    res.json({
      success: cacheHealth.status === HealthStatus.HEALTHY,
      service: 'redis',
      status: cacheHealth.status,
      timestamp: cacheHealth.timestamp,
      responseTime: cacheHealth.responseTime,
      details: {
        connection: cacheHealth.connection,
        memory: cacheHealth.memory,
        performance: cacheHealth.performance
      }
    });

  } catch (error) {
    console.error('Cache Health Check Error:', error);
    res.status(503).json({
      success: false,
      service: 'redis',
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Cache health check failed',
      code: 'CACHE_HEALTH_CHECK_FAILED'
    });
  }
});

// 🚀 SYSTEM METRICS
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await collectSystemMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        system: metrics.system,
        application: metrics.application,
        business: metrics.business
      }
    });

  } catch (error) {
    console.error('Metrics Collection Error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Failed to collect system metrics',
      code: 'METRICS_COLLECTION_FAILED'
    });
  }
});

// 🚀 PERFORMANCE METRICS
router.get('/performance', async (req, res) => {
  try {
    const performance = await collectPerformanceMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      performance: {
        response_times: performance.responseTimes,
        throughput: performance.throughput,
        error_rates: performance.errorRates,
        resource_usage: performance.resourceUsage
      }
    });

  } catch (error) {
    console.error('Performance Metrics Error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Failed to collect performance metrics',
      code: 'PERFORMANCE_METRICS_FAILED'
    });
  }
});

// 🚀 SECURITY STATUS
router.get('/security', async (req, res) => {
  try {
    const securityStatus = await checkSecurityStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      security: {
        overall_status: securityStatus.overallStatus,
        checks: securityStatus.checks,
        threats: securityStatus.threats,
        recommendations: securityStatus.recommendations
      }
    });

  } catch (error) {
    console.error('Security Status Check Error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Failed to check security status',
      code: 'SECURITY_STATUS_CHECK_FAILED'
    });
  }
});

// 🚀 DEPENDENCY GRAPH
router.get('/dependencies', async (req, res) => {
  try {
    const dependencyGraph = await buildDependencyGraph();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      dependencies: dependencyGraph
    });

  } catch (error) {
    console.error('Dependency Graph Error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Failed to build dependency graph',
      code: 'DEPENDENCY_GRAPH_FAILED'
    });
  }
});

// 🚀 READINESS CHECK (FOR KUBERNETES/LOAD BALANCERS)
router.get('/ready', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck('basic');
    const isReady = healthCheck.status === HealthStatus.HEALTHY || 
                   healthCheck.status === HealthStatus.DEGRADED;

    const statusCode = isReady ? 200 : 503;
    
    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: healthCheck.timestamp,
      checks: {
        database: healthCheck.checks.database.status,
        redis: healthCheck.checks.redis.status,
        critical_services: healthCheck.checks.critical_services.status
      }
    });

  } catch (error) {
    console.error('Readiness Check Error:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

// 🚀 LIVENESS CHECK (FOR KUBERNETES)
router.get('/live', async (req, res) => {
  try {
    // Simple liveness check - just verify the application is running
    const isLive = await checkApplicationLiveness();
    
    const statusCode = isLive ? 200 : 503;
    
    res.status(statusCode).json({
      status: isLive ? 'live' : 'not_live',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });

  } catch (error) {
    console.error('Liveness Check Error:', error);
    res.status(503).json({
      status: 'not_live',
      timestamp: new Date().toISOString(),
      error: 'Liveness check failed'
    });
  }
});

// 🚀 VERSION INFORMATION
router.get('/version', (req, res) => {
  try {
    const packageJson = require('../package.json');
    
    res.json({
      success: true,
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Version Info Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve version information',
      code: 'VERSION_INFO_FAILED'
    });
  }
});

// 🚀 STATUS HISTORY (LAST 24 HOURS)
router.get('/history', async (req, res) => {
  try {
    const history = await getHealthHistory();
    
    res.json({
      success: true,
      period: '24h',
      timestamp: new Date().toISOString(),
      history: history
    });

  } catch (error) {
    console.error('Health History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health history',
      code: 'HEALTH_HISTORY_FAILED'
    });
  }
});

// 🎯 HEALTH CHECK IMPLEMENTATION

async function performHealthCheck(level = 'basic') {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // 🎯 Check critical services
  const criticalChecks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkCacheHealth()
  ]);

  // 🎯 Check non-critical services if detailed
  let nonCriticalChecks = {};
  if (level === 'detailed') {
    nonCriticalChecks = await checkNonCriticalServices();
  }

  const responseTime = Date.now() - startTime;

  // 🎯 Determine overall status
  const overallStatus = determineOverallStatus(criticalChecks, nonCriticalChecks);

  const healthCheck = {
    status: overallStatus,
    timestamp: timestamp,
    uptime: process.uptime(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    responseTime: responseTime,
    checks: {
      database: criticalChecks[0].status === 'fulfilled' ? criticalChecks[0].value : { status: HealthStatus.UNHEALTHY, error: criticalChecks[0].reason },
      redis: criticalChecks[1].status === 'fulfilled' ? criticalChecks[1].value : { status: HealthStatus.UNHEALTHY, error: criticalChecks[1].reason }
    }
  };

  // 🎯 Add detailed information for comprehensive check
  if (level === 'detailed') {
    healthCheck.system = await getSystemInfo();
    healthCheck.dependencies = nonCriticalChecks;
    healthCheck.performance = await getPerformanceInfo();
  }

  return healthCheck;
}

async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // 🗄️ Test database connection
    await require('../models').sequelize.authenticate();
    
    // 📊 Check database performance with a simple query
    const [results] = await require('../models').sequelize.query('SELECT 1 as test');
    
    // 📈 Get database statistics
    const dbStats = await getDatabaseStatistics();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      connection: 'connected',
      performance: 'normal',
      details: {
        test_query: results[0].test === 1 ? 'success' : 'failed',
        statistics: dbStats
      }
    };

  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      connection: 'disconnected',
      error: error.message,
      details: {
        error_code: error.original?.code,
        error_message: error.message
      }
    };
  }
}

async function checkCacheHealth() {
  const startTime = Date.now();
  
  try {
    // 🗄️ Test Redis connection
    await redis.ping();
    
    // 📊 Get Redis info
    const info = await redis.info();
    const memoryInfo = parseRedisInfo(info);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      connection: 'connected',
      memory: memoryInfo,
      performance: 'normal'
    };

  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      connection: 'disconnected',
      error: error.message
    };
  }
}

async function checkServiceHealth(service) {
  const startTime = Date.now();
  const serviceConfig = SERVICE_DEPENDENCIES[service];
  
  try {
    let details = {};
    
    switch (service) {
      case 'database':
        return await checkDatabaseHealth();
        
      case 'redis':
        return await checkCacheHealth();
        
      case 'storage':
        details = await checkStorageHealth();
        break;
        
      case 'ai_services':
        details = await checkAIServicesHealth();
        break;
        
      case 'payment_gateway':
        details = await checkPaymentGatewayHealth();
        break;
        
      case 'email_service':
        details = await checkEmailServiceHealth();
        break;
        
      case 'sms_service':
        details = await checkSMSServiceHealth();
        break;
        
      case 'push_notifications':
        details = await checkPushNotificationsHealth();
        break;
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      details: details
    };

  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error.message,
      details: {
        service: serviceConfig.name,
        critical: serviceConfig.critical
      }
    };
  }
}

async function checkNonCriticalServices() {
  const services = Object.keys(SERVICE_DEPENDENCIES).filter(
    service => !SERVICE_DEPENDENCIES[service].critical
  );
  
  const results = {};
  
  for (const service of services) {
    try {
      results[service] = await checkServiceHealth(service);
    } catch (error) {
      results[service] = {
        status: HealthStatus.UNHEALTHY,
        error: error.message
      };
    }
  }
  
  return results;
}

async function collectSystemMetrics() {
  return {
    system: {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      },
      cpu: {
        usage: process.cpuUsage(),
        uptime: process.uptime()
      },
      pid: process.pid,
      platform: process.platform,
      arch: process.arch
    },
    application: {
      active_connections: await getActiveConnections(),
      request_count: await getRequestCount(),
      error_count: await getErrorCount(),
      response_time_avg: await getAverageResponseTime()
    },
    business: {
      total_users: await getUserCount(),
      active_users: await getActiveUserCount(),
      total_services: await getServiceCount(),
      total_transactions: await getTransactionCount()
    }
  };
}

async function collectPerformanceMetrics() {
  return {
    responseTimes: {
      p50: await getPercentileResponseTime(50),
      p95: await getPercentileResponseTime(95),
      p99: await getPercentileResponseTime(99)
    },
    throughput: {
      requests_per_second: await getRequestsPerSecond(),
      concurrent_connections: await getConcurrentConnections()
    },
    errorRates: {
      overall: await getOverallErrorRate(),
      by_endpoint: await getErrorRatesByEndpoint()
    },
    resourceUsage: {
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpu_usage: await getCPUUsage(),
      disk_usage: await getDiskUsage()
    }
  };
}

async function checkSecurityStatus() {
  const checks = [];
  
  try {
    // 🔒 Check if security headers are properly configured
    checks.push(await YachiSecurity.checkSecurityHeaders());
    
    // 🔒 Check for known vulnerabilities
    checks.push(await YachiSecurity.checkVulnerabilities());
    
    // 🔒 Check rate limiting status
    checks.push(await YachiSecurity.checkRateLimiting());
    
    // 🔒 Check authentication security
    checks.push(await YachiSecurity.checkAuthSecurity());
    
    const overallStatus = checks.every(check => check.status === 'secure') ? 
      'secure' : checks.some(check => check.status === 'critical') ? 'critical' : 'warning';
    
    return {
      overallStatus: overallStatus,
      checks: checks,
      threats: checks.filter(check => check.status !== 'secure'),
      recommendations: generateSecurityRecommendations(checks)
    };

  } catch (error) {
    return {
      overallStatus: 'unknown',
      checks: [],
      threats: [{ type: 'security_check_failed', message: error.message }],
      recommendations: ['Investigate security monitoring system']
    };
  }
}

// 🎯 UTILITY FUNCTIONS

function determineOverallStatus(criticalChecks, nonCriticalChecks) {
  const criticalStatuses = criticalChecks.map(check => 
    check.status === 'fulfilled' ? check.value.status : HealthStatus.UNHEALTHY
  );
  
  // If any critical service is unhealthy, overall status is unhealthy
  if (criticalStatuses.some(status => status === HealthStatus.UNHEALTHY)) {
    return HealthStatus.UNHEALTHY;
  }
  
  // If any critical service is degraded, overall status is degraded
  if (criticalStatuses.some(status => status === HealthStatus.DEGRADED)) {
    return HealthStatus.DEGRADED;
  }
  
  // Check non-critical services for degraded status
  const nonCriticalStatuses = Object.values(nonCriticalChecks).map(check => check.status);
  if (nonCriticalStatuses.some(status => status === HealthStatus.UNHEALTHY)) {
    return HealthStatus.DEGRADED;
  }
  
  return HealthStatus.HEALTHY;
}

function parseRedisInfo(info) {
  const lines = info.split('\r\n');
  const parsed = {};
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      parsed[key] = value;
    }
  }
  
  return {
    used_memory: parsed.used_memory,
    used_memory_human: parsed.used_memory_human,
    used_memory_peak: parsed.used_memory_peak,
    memory_fragmentation_ratio: parsed.mem_fragmentation_ratio,
    connected_clients: parsed.connected_clients
  };
}

// 🎯 PLACEHOLDER FUNCTIONS FOR ACTUAL IMPLEMENTATION

async function checkStorageHealth() {
  // Implement storage health check
  return { status: 'healthy', available_space: '95%' };
}

async function checkAIServicesHealth() {
  // Implement AI services health check
  return { status: 'healthy', models_loaded: 5 };
}

async function checkPaymentGatewayHealth() {
  // Implement payment gateway health check
  return { status: 'healthy', transactions_processed: 1500 };
}

async function checkEmailServiceHealth() {
  // Implement email service health check
  return { status: 'healthy', delivery_rate: '98%' };
}

async function checkSMSServiceHealth() {
  // Implement SMS service health check
  return { status: 'healthy', delivery_rate: '99%' };
}

async function checkPushNotificationsHealth() {
  // Implement push notifications health check
  return { status: 'healthy', devices_registered: 5000 };
}

async function getSystemInfo() {
  return {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
}

async function getPerformanceInfo() {
  return {
    response_times: { p50: 150, p95: 450, p99: 800 },
    throughput: { rps: 120, concurrent: 45 },
    error_rates: { overall: '0.5%', by_endpoint: {} }
  };
}

async function getDatabaseStatistics() {
  return {
    total_tables: 25,
    connection_count: 12,
    performance: 'optimal'
  };
}

async function checkApplicationLiveness() {
  // Simple check to verify application is responsive
  return true;
}

async function getHealthHistory() {
  // Return last 24 hours of health data
  return [];
}

async function buildDependencyGraph() {
  return SERVICE_DEPENDENCIES;
}

async function getActiveConnections() { return 45; }
async function getRequestCount() { return 10000; }
async function getErrorCount() { return 50; }
async function getAverageResponseTime() { return 200; }
async function getUserCount() { return 5000; }
async function getActiveUserCount() { return 1200; }
async function getServiceCount() { return 850; }
async function getTransactionCount() { return 15000; }
async function getPercentileResponseTime(p) { return 150; }
async function getRequestsPerSecond() { return 120; }
async function getConcurrentConnections() { return 45; }
async function getOverallErrorRate() { return '0.5%'; }
async function getErrorRatesByEndpoint() { return {}; }
async function getCPUUsage() { return 45; }
async function getDiskUsage() { return '75%'; }

function generateSecurityRecommendations(checks) {
  return checks
    .filter(check => check.status !== 'secure')
    .map(check => check.recommendation)
    .filter(rec => rec);
}

// 🛑 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  console.error('Health Route Error:', error);
  
  res.status(500).json({
    success: false,
    status: HealthStatus.UNHEALTHY,
    timestamp: new Date().toISOString(),
    error: 'Health monitoring system error',
    code: 'HEALTH_MONITORING_ERROR'
  });
});

module.exports = router;