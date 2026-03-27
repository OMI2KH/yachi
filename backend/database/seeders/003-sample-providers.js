'use strict';

const { AuthenticationService } = require('../../utils/security');
const { ROLES, SERVICE_CATEGORIES } = require('../../utils/constants');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await AuthenticationService.hashPassword('Provider123!');
    
    const sampleProviders = [
      {
        email: 'alemayehu.tekalign@yachi.com',
        phone: '+251911334455',
        password: hashedPassword,
        firstName: 'Alemayehu',
        lastName: 'Tekalign',
        username: 'alemayehu_plumber',
        role: ROLES.PROVIDER,
        bio: 'Professional plumber with 8 years of experience. Specialized in residential and commercial plumbing services.',
        emailVerified: true,
        phoneVerified: true,
        faydaVerified: true,
        verificationStatus: 'verified',
        skills: ['plumbing', 'pipe fitting', 'drain cleaning', 'water heater installation'],
        latitude: 9.0054,
        longitude: 38.7636,
        address: {
          street: 'Bole Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        rating: 4.8,
        reviewCount: 47,
        completedJobs: 89,
        responseRate: 95.5,
        availability: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'helen.girma@yachi.com',
        phone: '+251922445566',
        password: hashedPassword,
        firstName: 'Helen',
        lastName: 'Girma',
        username: 'helen_electrician',
        role: ROLES.PROVIDER,
        bio: 'Certified electrician specializing in home electrical systems, wiring, and smart home installations.',
        emailVerified: true,
        phoneVerified: true,
        faydaVerified: true,
        verificationStatus: 'verified',
        skills: ['electrical wiring', 'smart home installation', 'circuit repair', 'lighting installation'],
        latitude: 8.9806,
        longitude: 38.7578,
        address: {
          street: 'Megenagna',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        rating: 4.9,
        reviewCount: 63,
        completedJobs: 112,
        responseRate: 98.2,
        availability: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'dawit.mengistu@yachi.com',
        phone: '+251933556677',
        password: hashedPassword,
        firstName: 'Dawit',
        lastName: 'Mengistu',
        username: 'dawit_carpenter',
        role: ROLES.PROVIDER,
        bio: 'Master carpenter with 12 years experience in furniture making, cabinetry, and home renovations.',
        emailVerified: true,
        phoneVerified: true,
        faydaVerified: true,
        verificationStatus: 'verified',
        skills: ['carpentry', 'furniture making', 'cabinet installation', 'woodworking'],
        latitude: 9.0320,
        longitude: 38.7504,
        address: {
          street: 'Kazanches',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        rating: 4.7,
        reviewCount: 38,
        completedJobs: 76,
        responseRate: 92.3,
        availability: 'busy',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'sara.jones@yachi.com',
        phone: '+251944667788',
        password: hashedPassword,
        firstName: 'Sara',
        lastName: 'Jones',
        username: 'sara_tutor',
        role: ROLES.GRADUATE,
        bio: 'Computer science graduate offering programming lessons and tech support services.',
        emailVerified: true,
        phoneVerified: true,
        faydaVerified: true,
        verificationStatus: 'verified',
        skills: ['programming', 'web development', 'python', 'javascript', 'tutoring'],
        latitude: 9.0227,
        longitude: 38.7469,
        address: {
          street: 'Sarbet',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        rating: 4.9,
        reviewCount: 29,
        completedJobs: 42,
        responseRate: 96.7,
        availability: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const providers = await queryInterface.bulkInsert('Users', sampleProviders, { returning: true });

    // Create gamification profiles for providers
    const gamificationProfiles = providers.map((provider, index) => ({
      userId: provider.id,
      totalPoints: [1200, 1800, 950, 1600][index],
      availablePoints: [600, 900, 475, 800][index],
      level: [3, 4, 2, 3][index],
      experience: [1200, 1800, 950, 1600][index],
      currentStreak: [15, 28, 7, 42][index],
      longestStreak: [30, 45, 21, 60][index],
      lastActivityDate: new Date(),
      achievements: [
        { id: 'verified_pro', name: 'Verified Professional', earnedAt: new Date() },
        { id: 'first_service', name: 'First Service Completed', earnedAt: new Date() }
      ],
      badges: [
        { id: 'five_star', name: 'Five Star Rating', rarity: 'rare' }
      ],
      stats: {
        challengesCompleted: [8, 12, 6, 10][index],
        rewardsRedeemed: [3, 5, 2, 4][index],
        pointsByCategory: {
          engagement: [300, 450, 200, 400][index],
          completion: [600, 900, 500, 800][index],
          quality: [200, 300, 150, 250][index],
          social: [50, 100, 75, 120][index],
          verification: [50, 50, 25, 30][index]
        },
        dailyAverage: [3.2, 4.8, 2.1, 3.9][index]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert('GamificationProfiles', gamificationProfiles);

    console.log('✅ Sample providers created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('GamificationProfiles', {});
    await queryInterface.bulkDelete('Users', { 
      email: {
        [Sequelize.Op.in]: [
          'alemayehu.tekalign@yachi.com',
          'helen.girma@yachi.com',
          'dawit.mengistu@yachi.com',
          'sara.jones@yachi.com'
        ]
      }
    });
  }
};