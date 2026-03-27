/**
 * Project Calculation Utilities
 * Centralized logic for project cost, time, and resource calculations
 * Optimized for Ethiopian construction industry standards
 */

const config = require('../config/config');
const { Project, Task, Material, Labor, ProjectPhase } = require('../models');

class ProjectCalculations {
  /**
   * Calculate total project cost including materials, labor, and overhead
   * @param {Object} project - Project instance with associations
   * @returns {Object} - Calculated costs breakdown
   */
  static async calculateProjectCost(project) {
    try {
      const materials = await this.calculateMaterialCosts(project.id);
      const labor = await this.calculateLaborCosts(project.id);
      const equipment = await this.calculateEquipmentCosts(project.id);
      
      // Calculate subtotal
      const subtotal = materials.total + labor.total + equipment.total;
      
      // Calculate Ethiopian VAT (15% standard rate)
      const vatRate = 0.15;
      const vat = subtotal * vatRate;
      
      // Calculate overhead (15-25% typical for Ethiopian construction)
      const overheadRate = project.isCommercial ? 0.25 : 0.15;
      const overhead = subtotal * overheadRate;
      
      // Calculate contingency (5-10% based on project risk)
      const contingencyRate = this.getContingencyRate(project.riskLevel);
      const contingency = subtotal * contingencyRate;
      
      // Calculate total
      const total = subtotal + vat + overhead + contingency;
      
      // Calculate ETB to USD conversion if needed
      const exchangeRate = await this.getCurrentExchangeRate();
      const totalUSD = total / exchangeRate;
      
      return {
        materials,
        labor,
        equipment,
        subtotal: this.formatCurrency(subtotal),
        vat: {
          amount: this.formatCurrency(vat),
          rate: vatRate
        },
        overhead: {
          amount: this.formatCurrency(overhead),
          rate: overheadRate
        },
        contingency: {
          amount: this.formatCurrency(contingency),
          rate: contingencyRate
        },
        total: this.formatCurrency(total),
        totalUSD: this.formatCurrency(totalUSD, 'USD'),
        exchangeRate,
        currency: 'ETB',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating project cost:', error);
      throw error;
    }
  }
  
  /**
   * Calculate material costs for a project
   * @param {number} projectId 
   * @returns {Object} - Material costs breakdown
   */
  static async calculateMaterialCosts(projectId) {
    const materials = await Material.findAll({
      where: { projectId },
      include: [{
        model: ProjectPhase,
        attributes: ['name', 'priority']
      }]
    });
    
    let total = 0;
    const breakdown = materials.map(material => {
      const quantity = material.quantity || 1;
      const unitPrice = material.unitPrice || 0;
      const cost = quantity * unitPrice;
      total += cost;
      
      return {
        id: material.id,
        name: material.name,
        quantity,
        unit: material.unit || 'pcs',
        unitPrice: this.formatCurrency(unitPrice),
        totalCost: this.formatCurrency(cost),
        phase: material.ProjectPhase?.name || 'General',
        supplier: material.supplier,
        deliveryStatus: material.deliveryStatus
      };
    });
    
    // Sort by phase priority
    breakdown.sort((a, b) => {
      const phaseA = materials.find(m => m.id === a.id)?.ProjectPhase?.priority || 999;
      const phaseB = materials.find(m => m.id === b.id)?.ProjectPhase?.priority || 999;
      return phaseA - phaseB;
    });
    
    return {
      breakdown,
      total: this.formatCurrency(total),
      count: materials.length
    };
  }
  
  /**
   * Calculate labor costs for a project
   * @param {number} projectId 
   * @returns {Object} - Labor costs breakdown
   */
  static async calculateLaborCosts(projectId) {
    const laborRecords = await Labor.findAll({
      where: { projectId },
      include: [{
        model: ProjectPhase,
        attributes: ['name', 'durationDays']
      }]
    });
    
    let total = 0;
    const breakdown = laborRecords.map(labor => {
      // Calculate based on Ethiopian labor standards
      const dailyRate = labor.dailyRate || this.getStandardLaborRate(labor.skillLevel);
      const workDays = labor.workDays || labor.ProjectPhase?.durationDays || 30;
      const overtimeHours = labor.overtimeHours || 0;
      const overtimeRate = dailyRate / 8 * 1.5; // 1.5x for overtime (Ethiopian standard)
      
      const regularPay = dailyRate * workDays;
      const overtimePay = overtimeHours * overtimeRate;
      const totalPay = regularPay + overtimePay;
      total += totalPay;
      
      return {
        id: labor.id,
        name: labor.name,
        skillLevel: labor.skillLevel,
        dailyRate: this.formatCurrency(dailyRate),
        workDays,
        overtimeHours,
        regularPay: this.formatCurrency(regularPay),
        overtimePay: this.formatCurrency(overtimePay),
        totalPay: this.formatCurrency(totalPay),
        phase: labor.ProjectPhase?.name || 'General',
        trade: labor.trade || 'General Labor'
      };
    });
    
    return {
      breakdown,
      total: this.formatCurrency(total),
      count: laborRecords.length,
      averageDailyRate: this.formatCurrency(total / breakdown.reduce((sum, item) => sum + item.workDays, 0) || 0)
    };
  }
  
  /**
   * Calculate equipment costs for a project
   * @param {number} projectId 
   * @returns {Object} - Equipment costs breakdown
   */
  static async calculateEquipmentCosts(projectId) {
    // In a real implementation, this would fetch from Equipment model
    // For now, using simplified calculation based on project size
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return {
        breakdown: [],
        total: this.formatCurrency(0),
        count: 0
      };
    }
    
    // Ethiopian equipment rental rates (approximate in ETB)
    const equipmentRates = {
      small: { // Small residential
        excavator: 15000,
        concrete_mixer: 3000,
        crane: 25000,
        generator: 5000
      },
      medium: { // Medium commercial
        excavator: 20000,
        concrete_mixer: 4000,
        crane: 35000,
        generator: 7000,
        bulldozer: 30000
      },
      large: { // Large industrial
        excavator: 25000,
        concrete_mixer: 5000,
        crane: 50000,
        generator: 10000,
        bulldozer: 40000,
        tower_crane: 80000
      }
    };
    
    const projectSize = this.getProjectSize(project.totalArea);
    const rates = equipmentRates[projectSize];
    const durationMonths = project.durationMonths || 6;
    
    let total = 0;
    const breakdown = Object.entries(rates).map(([equipment, monthlyRate]) => {
      const cost = monthlyRate * durationMonths;
      total += cost;
      
      return {
        equipment,
        monthlyRate: this.formatCurrency(monthlyRate),
        durationMonths,
        totalCost: this.formatCurrency(cost),
        category: this.getEquipmentCategory(equipment)
      };
    });
    
    return {
      breakdown,
      total: this.formatCurrency(total),
      count: breakdown.length,
      projectSize
    };
  }
  
  /**
   * Calculate project timeline and critical path
   * @param {Object} project 
   * @returns {Object} - Timeline analysis
   */
  static async calculateProjectTimeline(projectId) {
    const tasks = await Task.findAll({
      where: { projectId },
      order: [['startDate', 'ASC']]
    });
    
    if (tasks.length === 0) {
      return {
        totalDuration: 0,
        criticalPath: [],
        milestones: [],
        isOnSchedule: true
      };
    }
    
    // Calculate earliest start/finish times
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, {
        ...task.toJSON(),
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: Infinity,
        latestFinish: Infinity,
        slack: 0,
        dependencies: task.dependencies ? JSON.parse(task.dependencies) : []
      });
    });
    
    // Forward pass - calculate earliest times
    const sortedTasks = this.topologicalSort(tasks);
    sortedTasks.forEach(taskId => {
      const task = taskMap.get(taskId);
      let maxEarliestFinish = 0;
      
      task.dependencies.forEach(depId => {
        const dep = taskMap.get(depId);
        if (dep && dep.earliestFinish > maxEarliestFinish) {
          maxEarliestFinish = dep.earliestFinish;
        }
      });
      
      task.earliestStart = maxEarliestFinish;
      task.earliestFinish = maxEarliestFinish + (task.durationDays || 1);
    });
    
    // Backward pass - calculate latest times
    const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earliestFinish));
    
    sortedTasks.reverse().forEach(taskId => {
      const task = taskMap.get(taskId);
      let minLatestStart = projectDuration;
      
      // Find tasks that depend on this one
      Array.from(taskMap.entries()).forEach(([id, t]) => {
        if (t.dependencies.includes(taskId)) {
          if (t.latestStart < minLatestStart) {
            minLatestStart = t.latestStart;
          }
        }
      });
      
      if (minLatestStart === projectDuration) {
        // This is a final task
        task.latestFinish = projectDuration;
      } else {
        task.latestFinish = minLatestStart;
      }
      
      task.latestStart = task.latestFinish - (task.durationDays || 1);
      task.slack = task.latestStart - task.earliestStart;
    });
    
    // Identify critical path (tasks with zero slack)
    const criticalPath = Array.from(taskMap.values())
      .filter(task => task.slack === 0)
      .sort((a, b) => a.earliestStart - b.earliestStart);
    
    // Calculate milestones
    const milestones = this.identifyMilestones(tasks);
    
    // Check if project is on schedule
    const today = new Date();
    const overdueTasks = tasks.filter(task => 
      new Date(task.dueDate) < today && task.status !== 'completed'
    ).length;
    
    const completionRate = tasks.filter(t => t.status === 'completed').length / tasks.length;
    
    return {
      totalDuration: projectDuration,
      criticalPath: criticalPath.map(task => ({
        id: task.id,
        name: task.name,
        durationDays: task.durationDays,
        startDay: task.earliestStart,
        endDay: task.earliestFinish
      })),
      milestones,
      slackAnalysis: {
        totalTasks: tasks.length,
        criticalTasks: criticalPath.length,
        maxSlack: Math.max(...Array.from(taskMap.values()).map(t => t.slack)),
        averageSlack: Array.from(taskMap.values()).reduce((sum, t) => sum + t.slack, 0) / tasks.length
      },
      scheduleHealth: {
        isOnSchedule: overdueTasks === 0,
        overdueTasks,
        completionRate,
        estimatedCompletionDate: this.addDays(new Date(project.startDate), projectDuration)
      }
    };
  }
  
  /**
   * Calculate productivity metrics for Ethiopian construction
   * @param {Object} project 
   * @returns {Object} - Productivity metrics
   */
  static async calculateProductivityMetrics(projectId) {
    const project = await Project.findByPk(projectId, {
      include: [
        { model: Task, as: 'tasks' },
        { model: Labor, as: 'labors' }
      ]
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const completedTasks = project.tasks.filter(t => t.status === 'completed');
    const totalManDays = project.labors.reduce((sum, labor) => sum + (labor.workDays || 0), 0);
    
    // Ethiopian construction productivity benchmarks (m²/man-day)
    const benchmarks = {
      residential: 0.8,
      commercial: 0.6,
      industrial: 0.5,
      infrastructure: 0.4
    };
    
    const benchmark = benchmarks[project.type] || 0.5;
    const actualProductivity = project.totalArea / totalManDays;
    const productivityIndex = actualProductivity / benchmark;
    
    // Calculate schedule performance index (SPI)
    const plannedDays = project.durationMonths * 30;
    const actualDays = Math.floor((new Date() - new Date(project.startDate)) / (1000 * 60 * 60 * 24));
    const spi = plannedDays > 0 ? (completedTasks.length / project.tasks.length) / (actualDays / plannedDays) : 1;
    
    // Calculate cost performance index (CPI)
    const costData = await this.calculateProjectCost(project);
    const budget = project.budget || costData.total.amount;
    const actualCost = project.actualSpend || budget * 0.3; // Assuming 30% spent
    const cpi = budget > 0 ? budget / actualCost : 1;
    
    return {
      productivity: {
        actual: actualProductivity.toFixed(2),
        benchmark,
        index: productivityIndex.toFixed(2),
        rating: this.getProductivityRating(productivityIndex)
      },
      performanceIndices: {
        schedulePerformanceIndex: spi.toFixed(2),
        costPerformanceIndex: cpi.toFixed(2),
        overallPerformance: ((spi + cpi) / 2).toFixed(2)
      },
      resourceUtilization: {
        laborUtilization: (totalManDays / (project.labors.length * actualDays)).toFixed(2),
        equipmentUtilization: 0.7, // Placeholder - would come from equipment logs
        materialWasteRate: 0.05 // Placeholder - Ethiopian construction average
      },
      recommendations: this.generateRecommendations({
        productivityIndex,
        spi,
        cpi,
        projectType: project.type
      })
    };
  }
  
  /**
   * Calculate cash flow projections for Ethiopian construction projects
   * @param {Object} project 
   * @returns {Object} - Cash flow analysis
   */
  static async calculateCashFlow(projectId) {
    const project = await Project.findByPk(projectId);
    const costData = await this.calculateProjectCost(project);
    const timeline = await this.calculateProjectTimeline(projectId);
    
    // Typical Ethiopian construction payment schedule
    const paymentMilestones = [
      { name: 'Mobilization', percentage: 0.15, month: 0 },
      { name: 'Foundation', percentage: 0.20, month: 1 },
      { name: 'Superstructure', percentage: 0.25, month: 2 },
      { name: 'Enclosure', percentage: 0.20, month: 3 },
      { name: 'Finishes', percentage: 0.15, month: 4 },
      { name: 'Final', percentage: 0.05, month: 5 }
    ];
    
    const totalBudget = parseFloat(costData.total.replace(/[^0-9.-]+/g, ''));
    const durationMonths = project.durationMonths || 6;
    
    const projections = paymentMilestones.map(milestone => {
      const amount = totalBudget * milestone.percentage;
      const month = milestone.month;
      
      return {
        month: month + 1,
        milestone: milestone.name,
        amount: this.formatCurrency(amount),
        cumulative: this.formatCurrency(totalBudget * paymentMilestones
          .filter(m => m.month <= month)
          .reduce((sum, m) => sum + m.percentage, 0)),
        type: 'outflow'
      };
    });
    
    // Add inflow projections (client payments)
    const inflowProjections = paymentMilestones.map((milestone, index) => ({
      month: milestone.month + 1,
      description: `Payment for ${milestone.name}`,
      amount: this.formatCurrency(totalBudget * milestone.percentage * 0.9), // 90% of milestone value
      cumulative: this.formatCurrency(totalBudget * 0.9 * paymentMilestones
        .slice(0, index + 1)
        .reduce((sum, m) => sum + m.percentage, 0)),
      type: 'inflow'
    }));
    
    // Calculate cash flow metrics
    const totalOutflow = totalBudget;
    const totalInflow = totalBudget * 0.9; // Assuming 10% retention
    const netCashFlow = totalInflow - totalOutflow;
    
    return {
      projections: [...projections, ...inflowProjections].sort((a, b) => a.month - b.month),
      summary: {
        totalBudget: this.formatCurrency(totalBudget),
        totalInflow: this.formatCurrency(totalInflow),
        totalOutflow: this.formatCurrency(totalOutflow),
        netCashFlow: this.formatCurrency(netCashFlow),
        peakFunding: this.formatCurrency(this.calculatePeakFunding(projections)),
        durationMonths
      },
      assumptions: {
        retentionRate: 0.10,
        paymentTerms: '30 days',
        currency: 'ETB',
        vatIncluded: true
      },
      recommendations: netCashFlow < 0 ? 
        ['Consider securing working capital financing', 'Negotiate better payment terms with suppliers'] :
        ['Maintain current cash flow management practices']
    };
  }
  
  // ==================== HELPER METHODS ====================
  
  static formatCurrency(amount, currency = 'ETB') {
    if (isNaN(amount)) return `${currency} 0.00`;
    
    const formatter = new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: currency === 'ETB' ? 'ETB' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // For ETB, we don't have a currency symbol in Intl, so we handle it manually
    if (currency === 'ETB') {
      return `ETB ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }
    
    return formatter.format(amount);
  }
  
  static getContingencyRate(riskLevel) {
    const rates = {
      low: 0.05,
      medium: 0.075,
      high: 0.10,
      very_high: 0.15
    };
    return rates[riskLevel] || 0.075;
  }
  
  static getStandardLaborRate(skillLevel) {
    // Ethiopian construction labor rates in ETB (2024 approximate)
    const rates = {
      unskilled: 250,
      semi_skilled: 400,
      skilled: 600,
      foreman: 800,
      supervisor: 1200,
      engineer: 2000
    };
    return rates[skillLevel] || 400;
  }
  
  static getProjectSize(totalArea) {
    if (!totalArea) return 'medium';
    if (totalArea < 100) return 'small';
    if (totalArea < 1000) return 'medium';
    return 'large';
  }
  
  static getEquipmentCategory(equipment) {
    const categories = {
      excavator: 'earthmoving',
      bulldozer: 'earthmoving',
      concrete_mixer: 'concrete',
      crane: 'lifting',
      generator: 'power',
      tower_crane: 'lifting'
    };
    return categories[equipment] || 'general';
  }
  
  static topologicalSort(tasks) {
    const visited = new Set();
    const stack = [];
    
    function visit(taskId, taskMap, dependencies) {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      dependencies[taskId]?.forEach(depId => {
        visit(depId, taskMap, dependencies);
      });
      
      stack.push(taskId);
    }
    
    const taskMap = new Map();
    const dependencies = {};
    
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      dependencies[task.id] = task.dependencies ? JSON.parse(task.dependencies) : [];
    });
    
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        visit(task.id, taskMap, dependencies);
      }
    });
    
    return stack;
  }
  
  static identifyMilestones(tasks) {
    // Identify key milestones based on task dependencies and importance
    const milestones = [];
    
    tasks.forEach(task => {
      if (task.isMilestone || task.dependencies.length === 0) {
        milestones.push({
          name: task.name,
          date: task.startDate,
          type: task.dependencies.length === 0 ? 'start' : 'milestone',
          dependencies: task.dependencies ? JSON.parse(task.dependencies).length : 0
        });
      }
    });
    
    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  static getProductivityRating(index) {
    if (index >= 1.2) return 'Excellent';
    if (index >= 1.0) return 'Good';
    if (index >= 0.8) return 'Fair';
    return 'Needs Improvement';
  }
  
  static generateRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.productivityIndex < 0.8) {
      recommendations.push('Consider additional worker training programs');
      recommendations.push('Review equipment utilization and maintenance schedules');
    }
    
    if (metrics.spi < 0.9) {
      recommendations.push('Accelerate critical path activities');
      recommendations.push('Consider adding shift work for delayed tasks');
    }
    
    if (metrics.cpi < 0.9) {
      recommendations.push('Review material procurement strategies');
      recommendations.push('Consider value engineering for cost reduction');
    }
    
    if (metrics.projectType === 'residential') {
      recommendations.push('Optimize modular construction techniques where possible');
    }
    
    return recommendations.length > 0 ? recommendations : ['Project performance is satisfactory'];
  }
  
  static calculatePeakFunding(projections) {
    let peak = 0;
    let cumulative = 0;
    
    projections.forEach(proj => {
      cumulative += parseFloat(proj.amount.replace(/[^0-9.-]+/g, ''));
      if (cumulative > peak) {
        peak = cumulative;
      }
    });
    
    return peak;
  }
  
  static async getCurrentExchangeRate() {
    // In production, fetch from external API or database
    // For Ethiopia, typical rate is ~100 ETB to 1 USD
    return 100.0;
  }
}

module.exports = ProjectCalculations;