'use strict';

const { SERVICE_CATEGORIES } = require('../../utils/constants');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get provider IDs
    const providers = await queryInterface.sequelize.query(
      'SELECT id, username FROM Users WHERE role IN ("provider", "graduate")',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const sampleServices = [
      {
        providerId: providers[0].id, // Alemayehu - Plumber
        title: 'Emergency Plumbing Repair',
        description: 'Fast and reliable emergency plumbing services for leaks, clogs, and pipe repairs. Available 24/7 for urgent plumbing issues in Addis Ababa.',
        category: 'construction',
        subcategory: 'plumbing',
        price: 350.00,
        currency: 'ETB',
        duration: 60,
        latitude: 9.0054,
        longitude: 38.7636,
        address: {
          street: 'Bole Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/plumbing-1.jpg',
          '/images/services/plumbing-2.jpg'
        ],
        primaryImage: '/images/services/plumbing-1.jpg',
        tags: ['emergency', 'plumbing', 'repair', 'leak', 'clog'],
        requirements: ['Describe the issue', 'Provide access to plumbing'],
        rating: 4.8,
        reviewCount: 23,
        bookingCount: 45,
        viewCount: 156,
        status: 'active',
        featured: true,
        premiumListing: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: providers[0].id,
        title: 'Bathroom Installation Service',
        description: 'Complete bathroom installation including sink, toilet, shower, and plumbing connections. Quality workmanship guaranteed.',
        category: 'construction',
        subcategory: 'plumbing',
        price: 2500.00,
        currency: 'ETB',
        duration: 240,
        latitude: 9.0054,
        longitude: 38.7636,
        address: {
          street: 'Bole Road',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/bathroom-1.jpg',
          '/images/services/bathroom-2.jpg'
        ],
        primaryImage: '/images/services/bathroom-1.jpg',
        tags: ['bathroom', 'installation', 'plumbing', 'renovation'],
        requirements: ['Provide bathroom dimensions', 'Choose fixtures in advance'],
        rating: 4.7,
        reviewCount: 18,
        bookingCount: 32,
        viewCount: 89,
        status: 'active',
        featured: false,
        premiumListing: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: providers[1].id, // Helen - Electrician
        title: 'Home Electrical Wiring',
        description: 'Professional electrical wiring services for homes and apartments. Certified electrician with modern equipment and safety standards.',
        category: 'construction',
        subcategory: 'electrical',
        price: 500.00,
        currency: 'ETB',
        duration: 120,
        latitude: 8.9806,
        longitude: 38.7578,
        address: {
          street: 'Megenagna',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/electrical-1.jpg',
          '/images/services/electrical-2.jpg'
        ],
        primaryImage: '/images/services/electrical-1.jpg',
        tags: ['electrical', 'wiring', 'installation', 'safety'],
        requirements: ['Provide building plan', 'Ensure power is off during work'],
        rating: 4.9,
        reviewCount: 35,
        bookingCount: 67,
        viewCount: 234,
        status: 'active',
        featured: true,
        premiumListing: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: providers[1].id,
        title: 'Smart Home Installation',
        description: 'Transform your home with smart technology. Installation of smart lights, security systems, and home automation.',
        category: 'technology',
        subcategory: 'smart_home',
        price: 1200.00,
        currency: 'ETB',
        duration: 180,
        latitude: 8.9806,
        longitude: 38.7578,
        address: {
          street: 'Megenagna',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/smart-home-1.jpg',
          '/images/services/smart-home-2.jpg'
        ],
        primaryImage: '/images/services/smart-home-1.jpg',
        tags: ['smart home', 'automation', 'technology', 'installation'],
        requirements: ['WiFi network required', 'Compatible devices'],
        rating: 4.8,
        reviewCount: 22,
        bookingCount: 41,
        viewCount: 167,
        status: 'active',
        featured: false,
        premiumListing: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: providers[2].id, // Dawit - Carpenter
        title: 'Custom Furniture Making',
        description: 'Handcrafted custom furniture made to your specifications. Quality woodworking for homes and offices.',
        category: 'construction',
        subcategory: 'carpentry',
        price: 1500.00,
        currency: 'ETB',
        duration: 300,
        latitude: 9.0320,
        longitude: 38.7504,
        address: {
          street: 'Kazanches',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/furniture-1.jpg',
          '/images/services/furniture-2.jpg'
        ],
        primaryImage: '/images/services/furniture-1.jpg',
        tags: ['furniture', 'custom', 'woodworking', 'carpentry'],
        requirements: ['Provide design specifications', 'Discuss wood type preferences'],
        rating: 4.7,
        reviewCount: 28,
        bookingCount: 52,
        viewCount: 143,
        status: 'active',
        featured: true,
        premiumListing: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: providers[3].id, // Sara - Tutor
        title: 'Python Programming Lessons',
        description: 'Learn Python programming from basics to advanced concepts. Personalized lessons for beginners and intermediate learners.',
        category: 'education',
        subcategory: 'programming',
        price: 200.00,
        currency: 'ETB',
        duration: 60,
        latitude: 9.0227,
        longitude: 38.7469,
        address: {
          street: 'Sarbet',
          city: 'Addis Ababa',
          state: 'Addis Ababa',
          country: 'Ethiopia'
        },
        images: [
          '/images/services/programming-1.jpg',
          '/images/services/programming-2.jpg'
        ],
        primaryImage: '/images/services/programming-1.jpg',
        tags: ['programming', 'python', 'lessons', 'education'],
        requirements: ['Laptop with Python installed', 'Basic computer knowledge'],
        rating: 4.9,
        reviewCount: 19,
        bookingCount: 34,
        viewCount: 98,
        status: 'active',
        featured: false,
        premiumListing: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Services', sampleServices);
    console.log('✅ Sample services created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Services', {});
  }
};