const { WorkerSchema } = require('../../routes/workers');
const { calculateWorkerStats, calculateTrustScore } = require('../../routes/workers');
const { setupTestDB, mockExternalServices } = require('./setup');

describe('Workers Unit Tests', () => {
  let sequelize;
  let mockUser;

  beforeAll(async () => {
    sequelize = setupTestDB();
    mockExternalServices();

    // Create mock user
    const { User, Service, Review, Transaction } = require('../../models');
    mockUser = await User.create({
      name: 'Test Worker',
      email: 'worker@test.com',
      password: 'hashedpassword',
      role: 'provider',
      faydaVerified: true,
      selfieVerified: true,
      documentVerified: true
    });

    // Create mock services
    await Service.bulkCreate([
      {
        providerId: mockUser.id,
        title: 'Plumbing Service',
        description: 'Professional plumbing',
        price: 5000,
        rating: 4.5,
        status: 'active'
      },
      {
        providerId: mockUser.id,
        title: 'Electrical Work',
        description: 'Professional electrical',
        price: 3000,
        rating: 4.8,
        status: 'active'
      }
    ]);

    // Create mock reviews
    await Review.bulkCreate([
      {
        revieweeId: mockUser.id,
        rating: 5,
        comment: 'Excellent work!',
        serviceId: 1
      },
      {
        revieweeId: mockUser.id,
        rating: 4,
        comment: 'Good job',
        serviceId: 2
      }
    ]);

    // Create mock transactions
    await Transaction.bulkCreate([
      {
        providerId: mockUser.id,
        amount: 5000,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours later
      },
      {
        providerId: mockUser.id,
        amount: 3000,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour later
      }
    ]);
  });

  describe('Worker Schema Validation', () => {
    it('should validate fayda upload data', () => {
      const validData = {
        documentType: 'fayda_id',
        documentNumber: '123456789'
      };

      const invalidData = {
        documentType: 'invalid_type',
        documentNumber: '123'
      };

      expect(() => WorkerSchema.faydaUpload.parse(validData)).not.toThrow();
      expect(() => WorkerSchema.faydaUpload.parse(invalidData)).toThrow();
    });

    it('should validate availability data', () => {
      const validData = {
        status: 'available',
        schedule: {
          workingHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'Africa/Nairobi'
          },
          workingDays: [1, 2, 3, 4, 5],
          emergencyService: true
        },
        noticePeriod: 2
      };

      expect(() => WorkerSchema.availability.parse(validData)).not.toThrow();
    });

    it('should validate skills data', () => {
      const validData = {
        skills: ['plumbing', 'electrical'],
        proficiency: 'expert',
        certifications: ['Certified Plumber']
      };

      const invalidData = {
        skills: [], // Empty array should fail
        proficiency: 'invalid_level'
      };

      expect(() => WorkerSchema.skills.parse(validData)).not.toThrow();
      expect(() => WorkerSchema.skills.parse(invalidData)).toThrow();
    });
  });

  describe('Worker Stats Calculation', () => {
    it('should calculate worker stats correctly', async () => {
      const stats = await calculateWorkerStats(mockUser.id);

      expect(stats.services.total).toBe(2);
      expect(stats.services.averageRating).toBeCloseTo(4.65);
      expect(stats.reviews.total).toBe(2);
      expect(stats.reviews.averageRating).toBe(4.5);
      expect(stats.completion.totalJobs).toBe(2);
      expect(stats.completion.completedJobs).toBe(2);
      expect(stats.completion.completionRate).toBe(100);
      expect(stats.revenue.total).toBe(8000);
    });

    it('should handle zero data gracefully', async () => {
      const newUser = await require('../../models').User.create({
        name: 'New Worker',
        email: 'new@test.com',
        password: 'hashedpassword',
        role: 'provider'
      });

      const stats = await calculateWorkerStats(newUser.id);

      expect(stats.services.total).toBe(0);
      expect(stats.reviews.total).toBe(0);
      expect(stats.completion.totalJobs).toBe(0);
      expect(stats.revenue.total).toBe(0);
    });
  });

  describe('Trust Score Calculation', () => {
    it('should calculate trust score for verified worker', async () => {
      const trustScore = await calculateTrustScore(mockUser.id);
      
      expect(trustScore).toBeGreaterThanOrEqual(0);
      expect(trustScore).toBeLessThanOrEqual(100);
    });

    it('should calculate lower trust score for unverified worker', async () => {
      const unverifiedUser = await require('../../models').User.create({
        name: 'Unverified Worker',
        email: 'unverified@test.com',
        password: 'hashedpassword',
        role: 'provider',
        faydaVerified: false,
        selfieVerified: false,
        documentVerified: false
      });

      const trustScore = await calculateTrustScore(unverifiedUser.id);
      expect(trustScore).toBeLessThan(50);
    });
  });

  describe('Worker Search Validation', () => {
    it('should validate search parameters', () => {
      const validSearch = {
        query: 'plumbing',
        skills: ['plumbing', 'electrical'],
        minRating: 4,
        experience: 'expert',
        availability: 'immediate',
        verifiedOnly: true,
        page: 1,
        limit: 20
      };

      const invalidSearch = {
        minRating: 6, // Invalid rating
        page: 0, // Invalid page
        limit: 150 // Invalid limit
      };

      expect(() => WorkerSchema.search.parse(validSearch)).not.toThrow();
      expect(() => WorkerSchema.search.parse(invalidSearch)).toThrow();
    });
  });
});