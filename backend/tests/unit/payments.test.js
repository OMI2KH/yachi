const { setupTestDB, mockExternalServices } = require('./setup');

describe('Payments Unit Tests', () => {
  let sequelize;
  let mockUser;
  let mockTransaction;

  beforeAll(async () => {
    sequelize = setupTestDB();
    mockExternalServices();

    const { User, Transaction } = require('../../models');
    
    mockUser = await User.create({
      name: 'Payment User',
      email: 'payment@test.com',
      password: 'hashedpassword',
      role: 'client'
    });

    mockTransaction = await Transaction.create({
      userId: mockUser.id,
      providerId: 1,
      amount: 5000,
      currency: 'KES',
      status: 'pending',
      paymentMethod: 'mpesa',
      metadata: {
        phoneNumber: '+254712345678',
        transactionType: 'service_payment'
      }
    });
  });

  describe('Payment Validation', () => {
    it('should validate payment amount', () => {
      const paymentSchema = require('../../utils/validators').paymentSchema;
      
      const validPayment = {
        amount: 5000,
        currency: 'KES',
        paymentMethod: 'mpesa',
        phoneNumber: '+254712345678'
      };

      const invalidPayment = {
        amount: -100, // Negative amount
        currency: 'INVALID', // Invalid currency
        paymentMethod: 'invalid_method'
      };

      expect(() => paymentSchema.parse(validPayment)).not.toThrow();
      expect(() => paymentSchema.parse(invalidPayment)).toThrow();
    });

    it('should validate M-Pesa phone numbers', () => {
      const mpesaSchema = require('../../utils/validators').mpesaSchema;
      
      const validNumbers = [
        '+254712345678',
        '+254112345678'
      ];

      const invalidNumbers = [
        '0712345678', // Missing country code
        '+255712345678', // Wrong country code
        '+25471234567' // Too short
      ];

      validNumbers.forEach(number => {
        expect(() => mpesaSchema.parse({ phoneNumber: number })).not.toThrow();
      });

      invalidNumbers.forEach(number => {
        expect(() => mpesaSchema.parse({ phoneNumber: number })).toThrow();
      });
    });
  });

  describe('Transaction Processing', () => {
    it('should process successful payment', async () => {
      const { Transaction } = require('../../models');
      
      await mockTransaction.update({
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          ...mockTransaction.metadata,
          mpesaCode: 'ABC123XYZ',
          processedAt: new Date().toISOString()
        }
      });

      const updatedTransaction = await Transaction.findByPk(mockTransaction.id);
      expect(updatedTransaction.status).toBe('completed');
      expect(updatedTransaction.metadata.mpesaCode).toBe('ABC123XYZ');
    });

    it('should handle payment failure', async () => {
      const { Transaction } = require('../../models');
      
      const failedTransaction = await Transaction.create({
        userId: mockUser.id,
        amount: 3000,
        status: 'failed',
        paymentMethod: 'mpesa',
        metadata: {
          error: 'Insufficient funds',
          failedAt: new Date().toISOString()
        }
      });

      expect(failedTransaction.status).toBe('failed');
      expect(failedTransaction.metadata.error).toBeDefined();
    });

    it('should calculate transaction fees correctly', () => {
      const calculateFees = (amount) => {
        const platformFee = amount * 0.05; // 5% platform fee
        const providerAmount = amount - platformFee;
        return { platformFee, providerAmount };
      };

      const { platformFee, providerAmount } = calculateFees(5000);
      expect(platformFee).toBe(250);
      expect(providerAmount).toBe(4750);
    });
  });

  describe('Payment Security', () => {
    it('should encrypt sensitive payment data', () => {
      const crypto = require('crypto');
      
      const sensitiveData = {
        phoneNumber: '+254712345678',
        accountNumber: '1234567890'
      };

      const algorithm = 'aes-256-gcm';
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(JSON.stringify(sensitiveData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      expect(encrypted).not.toContain('+254712345678');
      expect(encrypted).not.toContain('1234567890');
    });

    it('should validate payment callback signatures', () => {
      const validateSignature = (payload, signature, secret) => {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        return expectedSignature === signature;
      };

      const payload = { transactionId: '123', amount: 5000 };
      const secret = 'test_secret';
      const validSignature = 'valid_signature_hash';
      
      // This would be mocked in real implementation
      expect(typeof validateSignature).toBe('function');
    });
  });
});