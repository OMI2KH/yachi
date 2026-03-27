'use strict';

const { EncryptionService, AuthenticationService } = require('../../utils/security');
const { ROLES } = require('../../utils/constants');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create admin user
    const hashedPassword = await AuthenticationService.hashPassword('Admin123!');
    
    const adminUser = await queryInterface.bulkInsert('Users', [{
      email: 'admin@yachi.com',
      phone: '+251911223344',
      password: hashedPassword,
      firstName: 'Yachi',
      lastName: 'Admin',
      username: 'yachiadmin',
      role: ROLES.SUPER_ADMIN,
      emailVerified: true,
      phoneVerified: true,
      faydaVerified: true,
      selfieVerified: true,
      documentVerified: true,
      verificationStatus: 'verified',
      verificationScore: 100,
      status: 'active',
      twoFactorEnabled: false,
      level: 10,
      experience: 10000,
      totalPoints: 10000,
      rating: 5.0,
      reviewCount: 0,
      completedJobs: 0,
      responseRate: 100.0,
      availability: 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    }], { returning: true });

    // Create gamification profile for admin
    await queryInterface.bulkInsert('GamificationProfiles', [{
      userId: adminUser[0].id,
      totalPoints: 10000,
      availablePoints: 5000,
      level: 10,
      experience: 10000,
      currentStreak: 365,
      longestStreak: 365,
      lastActivityDate: new Date(),
      achievements: [
        { id: 'founder', name: 'Platform Founder', earnedAt: new Date() },
        { id: 'super_admin', name: 'Super Administrator', earnedAt: new Date() }
      ],
      badges: [
        { id: 'early_adopter', name: 'Early Adopter', rarity: 'legendary' },
        { id: 'verified_pro', name: 'Verified Pro', rarity: 'epic' }
      ],
      stats: {
        challengesCompleted: 50,
        rewardsRedeemed: 25,
        pointsByCategory: {
          engagement: 3000,
          completion: 4000,
          quality: 2000,
          social: 500,
          verification: 500
        },
        dailyAverage: 27.4
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    console.log('✅ Admin user created successfully');
  },

  async down(queryInterface, Sequelize) {
    // Remove admin user and related data
    await queryInterface.bulkDelete('GamificationProfiles', {});
    await queryInterface.bulkDelete('Users', { email: 'admin@yachi.com' });
  }
};