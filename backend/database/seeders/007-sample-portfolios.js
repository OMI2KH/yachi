'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get provider IDs
    const providers = await queryInterface.sequelize.query(
      'SELECT id, username FROM Users WHERE role IN ("provider", "graduate")',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const samplePortfolios = [
      {
        userId: providers[0].id, // Alemayehu - Plumber
        title: 'Modern Bathroom Installation',
        description: 'Complete bathroom renovation with modern fixtures and efficient plumbing system.',
        category: 'plumbing',
        imageUrl: '/images/portfolio/bathroom-reno-1.jpg',
        thumbnailUrl: '/images/portfolio/bathroom-reno-1-thumb.jpg',
        tags: ['bathroom', 'renovation', 'plumbing', 'modern'],
        isPublic: true,
        qualityScore: 4.8,
        metadata: {
          projectType: 'residential',
          duration: '3 days',
          materials: ['ceramic tiles', 'chrome fixtures', 'PVC pipes'],
          clientReview: 'Excellent workmanship and attention to detail'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: providers[0].id,
        title: 'Kitchen Plumbing Upgrade',
        description: 'Upgraded kitchen plumbing with new sink installation and garbage disposal unit.',
        category: 'plumbing',
        imageUrl: '/images/portfolio/kitchen-plumbing-1.jpg',
        thumbnailUrl: '/images/portfolio/kitchen-plumbing-1-thumb.jpg',
        tags: ['kitchen', 'plumbing', 'upgrade', 'sink'],
        isPublic: true,
        qualityScore: 4.6,
        metadata: {
          projectType: 'residential',
          duration: '1 day',
          materials: ['stainless steel sink', 'garbage disposal', 'copper pipes']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: providers[1].id, // Helen - Electrician
        title: 'Smart Home Automation',
        description: 'Complete smart home setup with automated lighting, security, and climate control.',
        category: 'electrical',
        imageUrl: '/images/portfolio/smart-home-1.jpg',
        thumbnailUrl: '/images/portfolio/smart-home-1-thumb.jpg',
        tags: ['smart home', 'automation', 'lighting', 'security'],
        isPublic: true,
        qualityScore: 4.9,
        metadata: {
          projectType: 'residential',
          duration: '2 days',
          technologies: ['Philips Hue', 'Nest Thermostat', 'Ring Security'],
          features: ['voice control', 'mobile app', 'scheduling']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: providers[2].id, // Dawit - Carpenter
        title: 'Custom Dining Table',
        description: 'Handcrafted solid wood dining table with custom design and finish.',
        category: 'woodworking',
        imageUrl: '/images/portfolio/dining-table-1.jpg',
        thumbnailUrl: '/images/portfolio/dining-table-1-thumb.jpg',
        tags: ['furniture', 'custom', 'woodworking', 'dining'],
        isPublic: true,
        qualityScore: 4.7,
        metadata: {
          projectType: 'custom furniture',
          duration: '5 days',
          materials: ['solid oak', 'natural finish'],
          dimensions: '180cm x 90cm x 75cm'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: providers[3].id, // Sara - Tutor
        title: 'Python Web Development Project',
        description: 'Student project building a complete web application using Python and Django.',
        category: 'education',
        imageUrl: '/images/portfolio/python-project-1.jpg',
        thumbnailUrl: '/images/portfolio/python-project-1-thumb.jpg',
        tags: ['python', 'web development', 'education', 'project'],
        isPublic: true,
        qualityScore: 4.8,
        metadata: {
          projectType: 'educational',
          technologies: ['Python', 'Django', 'HTML/CSS', 'JavaScript'],
          features: ['user authentication', 'database integration', 'responsive design']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Portfolios', samplePortfolios);
    console.log('✅ Sample portfolios created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Portfolios', {});
  }
};