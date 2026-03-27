const { setupTestDB, mockExternalServices } = require('./setup');

describe('Services Unit Tests', () => {
  let sequelize;
  let mockService;
  let mockProvider;

  beforeAll(async () => {
    sequelize = setupTestDB();
    mockExternalServices();

    const { User, Service, Category } = require('../../models');
    
    mockProvider = await User.create({
      name: 'Service Provider',
      email: 'provider@test.com',
      password: 'hashedpassword',
      role: 'provider'
    });

    mockService = await Service.create({
      providerId: mockProvider.id,
      title: 'Test Service',
      description: 'This is a test service description',
      price: 2500,
      category: 'home_services',
      duration: 2,
      status: 'active',
      metadata: {
        features: ['feature1', 'feature2'],
        requirements: ['requirement1']
      }
    });
  });

  describe('Service Validation', () => {
    it('should validate service creation data', () => {
      const serviceSchema = require('../../utils/validators').serviceSchema;
      
      const validService = {
        title: 'Professional Plumbing',
        description: 'Expert plumbing services for homes and offices',
        price: 5000,
        category: 'plumbing',
        duration: 3,
        features: ['24/7 availability', 'emergency service'],
        requirements: ['must have water connection']
      };

      const invalidService = {
        title: 'AB', // Too short
        price: -100, // Negative price
        duration: 0 // Invalid duration
      };

      expect(() => serviceSchema.parse(validService)).not.toThrow();
      expect(() => serviceSchema.parse(invalidService)).toThrow();
    });

    it('should validate service price ranges', () => {
      const serviceSchema = require('../../utils/validators').serviceSchema;
      
      const reasonablePrice = { price: 5000 };
      const tooLowPrice = { price: 99 }; // Below minimum
      const tooHighPrice = { price: 1000001 }; // Above maximum

      expect(() => serviceSchema.parse(reasonablePrice)).not.toThrow();
      expect(() => serviceSchema.parse(tooLowPrice)).toThrow();
      expect(() => serviceSchema.parse(tooHighPrice)).toThrow();
    });
  });

  describe('Service CRUD Operations', () => {
    it('should create a service successfully', async () => {
      const { Service } = require('../../models');
      
      const newService = await Service.create({
        providerId: mockProvider.id,
        title: 'New Test Service',
        description: 'New service description',
        price: 3500,
        category: 'cleaning',
        status: 'active'
      });

      expect(newService.id).toBeDefined();
      expect(newService.title).toBe('New Test Service');
      expect(newService.price).toBe(3500);
    });

    it('should update service details', async () => {
      const updatedData = {
        title: 'Updated Service Title',
        price: 3000,
        description: 'Updated description'
      };

      await mockService.update(updatedData);
      await mockService.reload();

      expect(mockService.title).toBe('Updated Service Title');
      expect(mockService.price).toBe(3000);
    });

    it('should soft delete service', async () => {
      await mockService.update({ status: 'deleted' });
      
      const foundService = await Service.findOne({
        where: { id: mockService.id, status: 'active' }
      });

      expect(foundService).toBeNull();
    });
  });

  describe('Service Search and Filtering', () => {
    beforeEach(async () => {
      const { Service } = require('../../models');
      
      // Create multiple services for testing search
      await Service.bulkCreate([
        {
          providerId: mockProvider.id,
          title: 'Electrical Installation',
          description: 'Professional electrical installation',
          price: 4000,
          category: 'electrical',
          rating: 4.5,
          status: 'active'
        },
        {
          providerId: mockProvider.id,
          title: 'Plumbing Repair',
          description: 'Fix leaking pipes and faucets',
          price: 2500,
          category: 'plumbing',
          rating: 4.2,
          status: 'active'
        },
        {
          providerId: mockProvider.id,
          title: 'Home Cleaning',
          description: 'Complete home cleaning service',
          price: 2000,
          category: 'cleaning',
          rating: 4.8,
          status: 'inactive'
        }
      ]);
    });

    it('should search services by title', async () => {
      const { Service } = require('../../models');
      
      const electricalServices = await Service.findAll({
        where: {
          title: { $iLike: '%electrical%' },
          status: 'active'
        }
      });

      expect(electricalServices).toHaveLength(1);
      expect(electricalServices[0].title).toContain('Electrical');
    });

    it('should filter services by category', async () => {
      const { Service } = require('../../models');
      
      const plumbingServices = await Service.findAll({
        where: {
          category: 'plumbing',
          status: 'active'
        }
      });

      expect(plumbingServices).toHaveLength(1);
      expect(plumbingServices[0].category).toBe('plumbing');
    });

    it('should filter services by price range', async () => {
      const { Service } = require('../../models');
      
      const affordableServices = await Service.findAll({
        where: {
          price: { $between: [2000, 3000] },
          status: 'active'
        }
      });

      expect(affordableServices).toHaveLength(1);
      expect(affordableServices[0].price).toBeLessThanOrEqual(3000);
    });
  });
});