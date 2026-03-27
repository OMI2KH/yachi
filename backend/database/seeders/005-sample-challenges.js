'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const sampleChallenges = [
      {
        id: 'c1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f',
        title: 'Complete Your Profile',
        description: 'Add your profile picture, bio, and skills to complete your profile setup.',
        category: 'onboarding',
        difficulty: 'easy',
        pointsReward: 50,
        requirements: {
          actions: ['upload_avatar', 'add_bio', 'add_skills'],
          requiredCount: 3
        },
        duration: null,
        startDate: null,
        endDate: null,
        maxCompletions: 1,
        isActive: true,
        metadata: {
          icon: 'profile',
          color: 'blue'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'c2a2e2f2-2a2b-2c2d-2e2f-2a2b2c2d2e2f',
        title: 'First Service Booking',
        description: 'Complete your first service booking as a client or provider.',
        category: 'engagement',
        difficulty: 'medium',
        pointsReward: 100,
        requirements: {
          actions: ['complete_booking'],
          bookingType: 'first'
        },
        duration: null,
        startDate: null,
        endDate: null,
        maxCompletions: 1,
        isActive: true,
        metadata: {
          icon: 'booking',
          color: 'green'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'c3a3e3f3-3a3b-3c3d-3e3f-3a3b3c3d3e3f',
        title: 'Verification Champion',
        description: 'Complete all verification steps including ID, selfie, and document verification.',
        category: 'verification',
        difficulty: 'hard',
        pointsReward: 200,
        requirements: {
          verifications: ['fayda_id', 'selfie', 'document'],
          requiredCount: 3
        },
        duration: null,
        startDate: null,
        endDate: null,
        maxCompletions: 1,
        isActive: true,
        metadata: {
          icon: 'verified',
          color: 'gold'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'c4a4e4f4-4a4b-4c4d-4e4f-4a4b4c4d4e4f',
        title: 'Weekly Streak',
        description: 'Use Yachi for 7 consecutive days to maintain your activity streak.',
        category: 'engagement',
        difficulty: 'medium',
        pointsReward: 150,
        requirements: {
          streakDays: 7,
          actions: ['daily_login']
        },
        duration: 7,
        startDate: null,
        endDate: null,
        maxCompletions: null,
        isActive: true,
        metadata: {
          icon: 'streak',
          color: 'orange'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'c5a5e5f5-5a5b-5c5d-5e5f-5a5b5c5d5e5f',
        title: 'Five Star Rating',
        description: 'Receive a 5-star rating from 5 different clients.',
        category: 'quality',
        difficulty: 'expert',
        pointsReward: 300,
        requirements: {
          rating: 5,
          minCount: 5,
          uniqueUsers: true
        },
        duration: null,
        startDate: null,
        endDate: null,
        maxCompletions: 1,
        isActive: true,
        metadata: {
          icon: 'star',
          color: 'purple'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'c6a6e6f6-6a6b-6c6d-6e6f-6a6b6c6d6e6f',
        title: 'Social Connector',
        description: 'Refer 3 friends to join Yachi and complete their profiles.',
        category: 'social',
        difficulty: 'medium',
        pointsReward: 250,
        requirements: {
          referrals: 3,
          completeProfile: true
        },
        duration: null,
        startDate: null,
        endDate: null,
        maxCompletions: null,
        isActive: true,
        metadata: {
          icon: 'referral',
          color: 'teal'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Challenges', sampleChallenges);
    console.log('✅ Sample challenges created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Challenges', {});
  }
};