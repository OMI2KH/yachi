"use strict";

module.exports = {
  async up(queryInterface) {
    // Insert default premium plans
    await queryInterface.bulkInsert('premium_plans', [
      {
        id: queryInterface.sequelize.literal('gen_random_uuid()'),
        name: 'premium_listing',
        description: 'Highlighted listing with priority placement',
        price: 299.00,
        currency: 'ETB',
        duration_days: 30,
        features: JSON.stringify(['featured', 'priority_search', 'highlighted_ui']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: queryInterface.sequelize.literal('gen_random_uuid()'),
        name: 'premium_badge',
        description: 'Verified premium badge for increased trust',
        price: 399.00,
        currency: 'ETB',
        duration_days: 30,
        features: JSON.stringify(['verified_badge', 'trust_mark']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert default advertisement package
    await queryInterface.bulkInsert('ad_packages', [
      {
        id: queryInterface.sequelize.literal('gen_random_uuid()'),
        name: 'premium_ad_weekly',
        description: 'Premium advertisement (negotiated premium placement by platform team)',
        price: 9999.00,
        currency: 'ETB',
        duration_days: 7,
        impressions_per_day: 10,
        max_duration_seconds: 30,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('premium_plans', { name: ['premium_listing', 'premium_badge'] });
    await queryInterface.bulkDelete('ad_packages', { name: 'premium_ad_weekly' });
  }
};
