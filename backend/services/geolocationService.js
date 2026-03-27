// services/geolocationService.js
const { Sequelize } = require('sequelize');
const redis = require('../config/redis');
const { YachiAI } = require('./yachiAI');
const { YachiAnalytics } = require('./yachiAnalytics');
const logger = require('../utils/logger');

class GeolocationService {
  constructor() {
    this.earthRadiusKm = 6371;
    this.earthRadiusMiles = 3959;
    this.supportedCountries = ['ET', 'KE', 'TZ', 'UG', 'RW']; // East Africa focus
    this.cacheTimeout = 3600; // 1 hour cache
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(coord1, coord2, unit = 'km') {
    try {
      const [lat1, lon1] = coord1;
      const [lat2, lon2] = coord2;

      const dLat = this.degreesToRadians(lat2 - lat1);
      const dLon = this.degreesToRadians(lon2 - lon1);

      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.degreesToRadians(lat1)) * 
        Math.cos(this.degreesToRadians(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const radius = unit === 'miles' ? this.earthRadiusMiles : this.earthRadiusKm;

      return Math.round(radius * c * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Distance calculation error:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  /**
   * Convert degrees to radians
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find workers within a specified radius
   */
  async findWorkersInRadius(centerCoords, radius, filters = {}) {
    const cacheKey = `workers:radius:${centerCoords.join(',')}:${radius}:${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [centerLat, centerLon] = centerCoords;

      // Calculate bounding box for initial filtering
      const boundingBox = this.calculateBoundingBox(centerLat, centerLon, radius);
      
      let whereClause = {
        role: { [Sequelize.Op.in]: ['provider', 'graduate'] },
        status: 'active',
        latitude: {
          [Sequelize.Op.between]: [boundingBox.minLat, boundingBox.maxLat]
        },
        longitude: {
          [Sequelize.Op.between]: [boundingBox.minLon, boundingBox.maxLon]
        }
      };

      // Apply additional filters
      if (filters.skills && filters.skills.length > 0) {
        whereClause.skills = { [Sequelize.Op.overlap]: filters.skills };
      }

      if (filters.minRating) {
        whereClause.rating = { [Sequelize.Op.gte]: filters.minRating };
      }

      if (filters.availability) {
        whereClause.availability = filters.availability;
      }

      const { User, Service, Review } = require('../models');

      // Get initial candidates within bounding box
      const candidates = await User.findAll({
        where: whereClause,
        include: [
          {
            model: Service,
            as: 'services',
            attributes: ['id', 'title', 'category', 'price'],
            where: { status: 'active' }
          },
          {
            model: Review,
            as: 'reviews',
            attributes: ['rating'],
            required: false
          }
        ],
        attributes: [
          'id', 'name', 'avatar', 'skills', 'rating', 'level',
          'latitude', 'longitude', 'location', 'availability',
          'faydaVerified', 'responseTime', 'joinedAt'
        ]
      });

      // Calculate exact distances and filter by radius
      const workersInRadius = candidates
        .map(worker => {
          const distance = this.calculateDistance(
            centerCoords,
            [worker.latitude, worker.longitude],
            'km'
          );
          
          return {
            ...worker.toJSON(),
            distance,
            proximity: this.getProximityLevel(distance)
          };
        })
        .filter(worker => worker.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      // Enhance with AI-powered ranking
      const rankedWorkers = await this.rankWorkersByRelevance(
        workersInRadius, 
        centerCoords, 
        filters
      );

      const result = {
        workers: rankedWorkers,
        summary: {
          total: rankedWorkers.length,
          radius,
          center: {
            coordinates: centerCoords,
            address: await this.reverseGeocode(centerCoords)
          },
          distribution: this.analyzeWorkerDistribution(rankedWorkers)
        }
      };

      // Cache the result
      await redis.setex(cacheKey, this.cacheTimeout, JSON.stringify(result));

      // Track analytics
      await YachiAnalytics.trackLocationSearch({
        centerCoords,
        radius,
        resultCount: rankedWorkers.length,
        filters
      });

      return result;

    } catch (error) {
      logger.error('Find workers in radius error:', error);
      throw new Error('Failed to find workers in specified area');
    }
  }

  /**
   * Calculate bounding box for efficient database queries
   */
  calculateBoundingBox(lat, lon, radius) {
    const latDelta = (radius / this.earthRadiusKm) * (180 / Math.PI);
    const lonDelta = (radius / this.earthRadiusKm) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lon - lonDelta,
      maxLon: lon + lonDelta
    };
  }

  /**
   * AI-powered worker ranking based on multiple factors
   */
  async rankWorkersByRelevance(workers, centerCoords, filters) {
    try {
      const rankingFactors = workers.map(worker => ({
        workerId: worker.id,
        distance: worker.distance,
        rating: worker.rating || 0,
        experience: this.calculateExperienceScore(worker.joinedAt),
        verification: this.calculateVerificationScore(worker),
        responseTime: worker.responseTime || 24,
        skillsMatch: filters.skills ? 
          this.calculateSkillsMatch(worker.skills, filters.skills) : 0.5,
        availability: this.calculateAvailabilityScore(worker.availability),
        completionRate: worker.completionRate || 0.95
      }));

      // Use AI to calculate relevance scores
      const relevanceScores = await YachiAI.calculateWorkerRelevance({
        workers: rankingFactors,
        searchLocation: centerCoords,
        filters
      });

      // Combine AI scores with other factors
      return workers
        .map(worker => {
          const factors = rankingFactors.find(f => f.workerId === worker.id);
          const aiScore = relevanceScores[worker.id] || 0.5;

          const finalScore = this.calculateFinalScore({
            aiScore,
            distance: factors.distance,
            rating: factors.rating,
            experience: factors.experience,
            verification: factors.verification,
            responseTime: factors.responseTime,
            skillsMatch: factors.skillsMatch,
            availability: factors.availability,
            completionRate: factors.completionRate
          });

          return {
            ...worker,
            relevanceScore: finalScore,
            rankingFactors: {
              distance: factors.distance,
              rating: factors.rating,
              experience: factors.experience,
              verification: factors.verification
            }
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error('Worker ranking error:', error);
      // Fallback to simple distance-based sorting
      return workers.sort((a, b) => a.distance - b.distance);
    }
  }

  /**
   * Calculate final relevance score with weighted factors
   */
  calculateFinalScore(factors) {
    const weights = {
      aiScore: 0.25,
      distance: 0.20,
      rating: 0.15,
      experience: 0.10,
      verification: 0.10,
      responseTime: 0.08,
      skillsMatch: 0.07,
      availability: 0.03,
      completionRate: 0.02
    };

    return Object.keys(weights).reduce((score, key) => {
      return score + (factors[key] * weights[key]);
    }, 0);
  }

  /**
   * Calculate experience score based on join date
   */
  calculateExperienceScore(joinedAt) {
    const joinDate = new Date(joinedAt);
    const monthsActive = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsActive >= 24) return 1.0; // 2+ years
    if (monthsActive >= 12) return 0.8; // 1-2 years
    if (monthsActive >= 6) return 0.6;  // 6-12 months
    if (monthsActive >= 3) return 0.4;  // 3-6 months
    return 0.2; // < 3 months
  }

  /**
   * Calculate verification score
   */
  calculateVerificationScore(worker) {
    let score = 0;
    if (worker.faydaVerified) score += 0.4;
    // Add other verification factors
    return score;
  }

  /**
   * Calculate skills match percentage
   */
  calculateSkillsMatch(workerSkills, requiredSkills) {
    if (!workerSkills || !requiredSkills) return 0;
    
    const matchingSkills = workerSkills.filter(skill => 
      requiredSkills.includes(skill)
    );
    
    return matchingSkills.length / requiredSkills.length;
  }

  /**
   * Calculate availability score
   */
  calculateAvailabilityScore(availability) {
    const scores = {
      available: 1.0,
      busy: 0.6,
      away: 0.3,
      unavailable: 0.0
    };
    
    return scores[availability] || 0.0;
  }

  /**
   * Get proximity level based on distance
   */
  getProximityLevel(distance) {
    if (distance <= 2) return 'very_close';
    if (distance <= 5) return 'close';
    if (distance <= 10) return 'nearby';
    if (distance <= 25) return 'moderate';
    return 'far';
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates) {
    const cacheKey = `geocode:${coordinates.join(',')}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Use a geocoding service (mock implementation)
      const address = await this.mockReverseGeocode(coordinates);
      
      await redis.setex(cacheKey, this.cacheTimeout * 24, JSON.stringify(address));
      return address;

    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Mock reverse geocoding implementation
   * In production, integrate with Google Maps, Mapbox, or similar service
   */
  async mockReverseGeocode([lat, lon]) {
    // This is a mock implementation
    // Replace with actual geocoding service integration
    const addresses = [
      'Bole, Addis Ababa, Ethiopia',
      'Megenagna, Addis Ababa, Ethiopia',
      'Piassa, Addis Ababa, Ethiopia',
      'Kazanchis, Addis Ababa, Ethiopia',
      'Sar Bet, Addis Ababa, Ethiopia'
    ];
    
    const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
    
    return {
      formatted: randomAddress,
      components: {
        neighborhood: randomAddress.split(', ')[0],
        city: 'Addis Ababa',
        country: 'Ethiopia'
      },
      coordinates: { lat, lon }
    };
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address) {
    const cacheKey = `geocode:address:${Buffer.from(address).toString('base64')}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Mock geocoding implementation
      const coordinates = await this.mockGeocodeAddress(address);
      
      await redis.setex(cacheKey, this.cacheTimeout * 24, JSON.stringify(coordinates));
      return coordinates;

    } catch (error) {
      logger.error('Geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Mock geocoding implementation
   */
  async mockGeocodeAddress(address) {
    // Mock coordinates for common locations in Addis Ababa
    const locationMap = {
      'bole': [8.9806, 38.7994],
      'megenagna': [9.0226, 38.7868],
      'piassa': [9.0300, 38.7500],
      'kaza': [9.0186, 38.7575],
      'sarbet': [9.0100, 38.7700],
      'addis ababa': [9.0054, 38.7636]
    };

    const normalizedAddress = address.toLowerCase();
    let coordinates = [9.0054, 38.7636]; // Default to Addis Ababa center

    for (const [key, coords] of Object.entries(locationMap)) {
      if (normalizedAddress.includes(key)) {
        coordinates = coords;
        break;
      }
    }

    return {
      coordinates,
      confidence: 0.8,
      address: address
    };
  }

  /**
   * Analyze worker distribution in search results
   */
  analyzeWorkerDistribution(workers) {
    const distribution = {
      byProximity: {
        very_close: 0,
        close: 0,
        nearby: 0,
        moderate: 0,
        far: 0
      },
      byRating: {
        '5_star': 0,
        '4_star': 0,
        '3_star': 0,
        '2_star': 0,
        '1_star': 0
      },
      byExperience: {
        expert: 0,
        intermediate: 0,
        beginner: 0
      }
    };

    workers.forEach(worker => {
      // Count by proximity
      distribution.byProximity[worker.proximity]++;

      // Count by rating
      const rating = Math.floor(worker.rating || 0);
      if (rating >= 4.5) distribution.byRating['5_star']++;
      else if (rating >= 3.5) distribution.byRating['4_star']++;
      else if (rating >= 2.5) distribution.byRating['3_star']++;
      else if (rating >= 1.5) distribution.byRating['2_star']++;
      else distribution.byRating['1_star']++;

      // Count by experience
      distribution.byExperience[worker.level || 'beginner']++;
    });

    return distribution;
  }

  /**
   * Calculate service area coverage for a worker
   */
  async calculateServiceArea(workerId, maxDistance) {
    try {
      const { User, Transaction } = require('../models');

      const worker = await User.findByPk(workerId, {
        attributes: ['id', 'latitude', 'longitude', 'location']
      });

      if (!worker || !worker.latitude || !worker.longitude) {
        throw new Error('Worker location not found');
      }

      // Get completed transactions with client locations
      const transactions = await Transaction.findAll({
        where: {
          providerId: workerId,
          status: 'completed'
        },
        include: [{
          model: User,
          as: 'client',
          attributes: ['id', 'latitude', 'longitude', 'location']
        }],
        attributes: ['id', 'createdAt']
      });

      const serviceLocations = transactions
        .map(t => t.client)
        .filter(client => client && client.latitude && client.longitude);

      // Calculate coverage statistics
      const coverage = {
        totalJobs: serviceLocations.length,
        averageDistance: 0,
        maxDistance: 0,
        serviceRadius: 0,
        coverageArea: this.calculateCoverageArea(serviceLocations, [worker.latitude, worker.longitude]),
        frequentLocations: this.identifyFrequentLocations(serviceLocations)
      };

      // Calculate distances
      if (serviceLocations.length > 0) {
        const distances = serviceLocations.map(client => 
          this.calculateDistance(
            [worker.latitude, worker.longitude],
            [client.latitude, client.longitude],
            'km'
          )
        );

        coverage.averageDistance = Math.round(
          distances.reduce((a, b) => a + b, 0) / distances.length
        );
        coverage.maxDistance = Math.max(...distances);
        coverage.serviceRadius = Math.min(coverage.maxDistance, maxDistance);
      }

      return coverage;

    } catch (error) {
      logger.error('Service area calculation error:', error);
      throw new Error('Failed to calculate service area');
    }
  }

  /**
   * Calculate coverage area based on job locations
   */
  calculateCoverageArea(locations, center) {
    if (locations.length === 0) return null;

    const distances = locations.map(loc => 
      this.calculateDistance(center, [loc.latitude, loc.longitude], 'km')
    );

    return {
      center,
      radius: Math.max(...distances),
      area: Math.PI * Math.pow(Math.max(...distances), 2),
      density: locations.length / (Math.PI * Math.pow(Math.max(...distances), 2))
    };
  }

  /**
   * Identify frequent service locations
   */
  identifyFrequentLocations(locations) {
    const locationCounts = {};
    
    locations.forEach(loc => {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      locationCounts[key] = (locationCounts[key] || 0) + 1;
    });

    return Object.entries(locationCounts)
      .map(([coords, count]) => ({
        coordinates: coords.split(',').map(Number),
        address: locations.find(l => 
          l.latitude.toFixed(4) === coords.split(',')[0] &&
          l.longitude.toFixed(4) === coords.split(',')[1]
        )?.location,
        jobCount: count
      }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 5); // Top 5 frequent locations
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lon) {
    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLon = lon >= -180 && lon <= 180;
    
    return isValidLat && isValidLon;
  }

  /**
   * Get distance matrix between multiple points
   */
  async calculateDistanceMatrix(origins, destinations, unit = 'km') {
    try {
      const matrix = [];

      for (const origin of origins) {
        const row = [];
        for (const destination of destinations) {
          const distance = this.calculateDistance(origin, destination, unit);
          row.push({
            distance,
            duration: this.estimateTravelTime(distance, 'car'), // Default to car
            unit
          });
        }
        matrix.push(row);
      }

      return matrix;
    } catch (error) {
      logger.error('Distance matrix calculation error:', error);
      throw new Error('Failed to calculate distance matrix');
    }
  }

  /**
   * Estimate travel time based on distance and transport mode
   */
  estimateTravelTime(distance, mode = 'car') {
    const averageSpeeds = {
      car: 40, // km/h in city traffic
      motorcycle: 35,
      bicycle: 15,
      walking: 5
    };

    const speed = averageSpeeds[mode] || 30;
    const hours = distance / speed;
    const minutes = Math.ceil(hours * 60);

    return {
      minutes,
      text: `${minutes} min`,
      mode
    };
  }

  /**
   * Get nearby popular locations
   */
  async getNearbyPointsOfInterest(coordinates, radius = 5, types = ['all']) {
    try {
      // Mock implementation - integrate with actual POI service
      const pois = [
        {
          name: 'Bole International Airport',
          type: 'airport',
          coordinates: [8.9771, 38.7993],
          distance: this.calculateDistance(coordinates, [8.9771, 38.7993], 'km')
        },
        {
          name: 'Edna Mall',
          type: 'shopping_mall',
          coordinates: [8.9876, 38.7890],
          distance: this.calculateDistance(coordinates, [8.9876, 38.7890], 'km')
        },
        {
          name: 'Black Lion Hospital',
          type: 'hospital',
          coordinates: [9.0200, 38.7639],
          distance: this.calculateDistance(coordinates, [9.0200, 38.7639], 'km')
        }
      ];

      return pois
        .filter(poi => poi.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

    } catch (error) {
      logger.error('POI search error:', error);
      return [];
    }
  }
}

// Create singleton instance
const geolocationService = new GeolocationService();

module.exports = { geolocationService };