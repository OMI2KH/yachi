'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sampleRewards = [
      {
        id: 'r1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f',
        name: '10% Service Discount',
        description: 'Get 10% off your next service booking. Valid for 30 days.',
        type: 'discount',
        pointsCost: 500,
        quantityAvailable: 1000,
        maxPerUser: 3,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isActive: true,
        metadata: {
          discountType: 'percentage',
          discountValue: 10,
          validDays: 30,
          icon: 'discount'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'r2a2e2f2-2a2b-2c2d-2e2f-2a2b2c2d2e2f',
        name: 'Verified Pro Badge',
        description: 'Exclusive badge showing you are a verified professional on Yachi.',
        type: 'badge',
        pointsCost: 1000,
        quantityAvailable: null, // Unlimited
        maxPerUser: 1,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        metadata: {
          badgeType: 'verified_pro',
          rarity: 'epic',
          icon: 'verified_badge'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'r3a3e3f3-3a3b-3c3d-3e3f-3a3b3c3d3e3f',
        name: 'Featured Listing (1 Week)',
        description: 'Get your service featured on the homepage for 1 week.',
        type: 'feature',
        pointsCost: 1500,
        quantityAvailable: 50,
        maxPerUser: 2,
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
        isActive: true,
        metadata: {
          featureType: 'featured_listing',
          durationDays: 7,
          icon: 'featured'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'r4a4e4f4-4a4b-4c4d-4e4f-4a4b4c4d4e4f',
        name: 'Yachi T-Shirt',
        description: 'Limited edition Yachi branded t-shirt. Available in multiple sizes.',
        type: 'physical',
        pointsCost: 2500,
        quantityAvailable: 100,
        maxPerUser: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
        isActive: true,
        metadata: {
          size: ['S', 'M', 'L', 'XL'],
          color: ['Black', 'White', 'Blue'],
          shipping: 'free',
          icon: 'tshirt'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'r5a5e5f5-5a5b-5c5d-5e5f-5a5b5c5d5e5f',
        name: 'Priority Support Access',
        description: 'Get priority customer support for 1 month with faster response times.',
        type: 'feature',
        pointsCost: 800,
        quantityAvailable: 200,
        maxPerUser: 1,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        metadata: {
          featureType: 'priority_support',
          durationDays: 30,
          icon: 'support'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'r6a6e6f6-6a6b-6c6d-6e6f-6a6b6c6d6e6f',
        name: 'Digital Certificate of Excellence',
        description: 'Official Yachi certificate recognizing your outstanding service quality.',
        type: 'digital',
        pointsCost: 2000,
        quantityAvailable: null,
        maxPerUser: 1,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        metadata: {
          certificateType: 'excellence',
          downloadable: true,
          shareable: true,
          icon: 'certificate'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Rewards', sampleRewards);
    console.log('✅ Sample rewards created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Rewards', {});
  }
};