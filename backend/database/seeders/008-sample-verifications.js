'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get verified provider IDs
    const providers = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE verificationStatus = "verified" AND role IN ("provider", "graduate")',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const sampleVerifications = [];

    providers.forEach(provider => {
      sampleVerifications.push(
        {
          userId: provider.id,
          documentType: 'fayda_id',
          documentNumber: 'ET123456789',
          documentImage: '/images/verifications/fayda-sample.jpg',
          issuingAuthority: 'Ethiopian Government',
          issueDate: new Date('2020-01-15'),
          expiryDate: new Date('2030-01-15'),
          status: 'verified',
          verifiedBy: 1, // Admin user
          verifiedAt: new Date(),
          verificationScore: 95,
          confidenceScore: 0.98,
          metadata: {
            verificationMethod: 'ai_scan',
            scanQuality: 'high',
            documentFront: true,
            documentBack: true
          },
          createdAt: new Date('2023-01-10'),
          updatedAt: new Date('2023-01-10')
        },
        {
          userId: provider.id,
          documentType: 'selfie',
          documentNumber: null,
          documentImage: '/images/verifications/selfie-sample.jpg',
          issuingAuthority: null,
          issueDate: null,
          expiryDate: null,
          status: 'verified',
          verifiedBy: 1, // Admin user
          verifiedAt: new Date(),
          verificationScore: 92,
          confidenceScore: 0.96,
          metadata: {
            verificationMethod: 'liveness_detection',
            livenessScore: 0.94,
            faceMatchScore: 0.98,
            qualityCheck: 'passed'
          },
          createdAt: new Date('2023-01-11'),
          updatedAt: new Date('2023-01-11')
        },
        {
          userId: provider.id,
          documentType: 'degree_certificate',
          documentNumber: 'BSC-CS-2020-123',
          documentImage: '/images/verifications/degree-sample.jpg',
          issuingAuthority: 'Addis Ababa University',
          issueDate: new Date('2020-06-30'),
          expiryDate: null,
          status: 'verified',
          verifiedBy: 1, // Admin user
          verifiedAt: new Date(),
          verificationScore: 88,
          confidenceScore: 0.92,
          metadata: {
            verificationMethod: 'manual_review',
            degreeType: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            institutionVerified: true
          },
          createdAt: new Date('2023-01-12'),
          updatedAt: new Date('2023-01-12')
        }
      );
    });

    await queryInterface.bulkInsert('WorkerVerifications', sampleVerifications);
    console.log('✅ Sample verifications created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('WorkerVerifications', {});
  }
};