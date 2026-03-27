describe('Utility Functions Unit Tests', () => {
  describe('String Utilities', () => {
    it('should format phone numbers correctly', () => {
      const { formatPhoneNumber } = require('../../utils/formatters');
      
      expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('+254712345678')).toBe('+254712345678');
      expect(formatPhoneNumber('112345678')).toBe('+254112345678');
    });

    it('should generate random strings', () => {
      const { generateRandomString } = require('../../utils/helpers');
      
      const random1 = generateRandomString(10);
      const random2 = generateRandomString(10);

      expect(random1).toHaveLength(10);
      expect(random2).toHaveLength(10);
      expect(random1).not.toBe(random2);
    });

    it('should slugify strings correctly', () => {
      const { slugify } = require('../../utils/formatters');
      
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Node.js & Express!')).toBe('nodejs-express');
      expect(slugify('  Trim  Spaces  ')).toBe('trim-spaces');
    });
  });

  describe('Date Utilities', () => {
    it('should format dates correctly', () => {
      const { formatDate } = require('../../utils/formatters');
      
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should calculate time differences', () => {
      const { timeDifference } = require('../../utils/helpers');
      
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T12:30:00');
      
      expect(timeDifference(start, end)).toBe(2.5); // 2.5 hours
    });

    it('should validate date ranges', () => {
      const { isValidDateRange } = require('../../utils/validators');
      
      const validRange = {
        start: new Date('2024-01-15'),
        end: new Date('2024-01-20')
      };

      const invalidRange = {
        start: new Date('2024-01-20'),
        end: new Date('2024-01-15')
      };

      expect(isValidDateRange(validRange)).toBe(true);
      expect(isValidDateRange(invalidRange)).toBe(false);
    });
  });

  describe('Number Utilities', () => {
    it('should format currency correctly', () => {
      const { formatCurrency } = require('../../utils/formatters');
      
      expect(formatCurrency(5000)).toBe('KSh 5,000');
      expect(formatCurrency(1234.56)).toBe('KSh 1,234.56');
    });

    it('should calculate percentages', () => {
      const { calculatePercentage } = require('../../utils/helpers');
      
      expect(calculatePercentage(50, 200)).toBe(25);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
    });

    it('should round numbers correctly', () => {
      const { roundToDecimal } = require('../../utils/helpers');
      
      expect(roundToDecimal(123.4567, 2)).toBe(123.46);
      expect(roundToDecimal(123.4547, 2)).toBe(123.45);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email addresses', () => {
      const { isValidEmail } = require('../../utils/validators');
      
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@sub.domain.com')).toBe(true);
    });

    it('should validate Kenyan phone numbers', () => {
      const { isValidPhoneNumber } = require('../../utils/validators');
      
      expect(isValidPhoneNumber('+254712345678')).toBe(true);
      expect(isValidPhoneNumber('0712345678')).toBe(true);
      expect(isValidPhoneNumber('+255712345678')).toBe(false); // Tanzania
      expect(isValidPhoneNumber('12345')).toBe(false);
    });

    it('should validate strong passwords', () => {
      const { isStrongPassword } = require('../../utils/validators');
      
      expect(isStrongPassword('StrongPass123!')).toBe(true);
      expect(isStrongPassword('weak')).toBe(false);
      expect(isStrongPassword('NoNumber!')).toBe(false);
      expect(isStrongPassword('Noupper123!')).toBe(false);
    });
  });

  describe('Security Utilities', () => {
    it('should sanitize user input', () => {
      const { sanitizeInput } = require('../../utils/security');
      
      const dangerousInput = '<script>alert("xss")</script>Hello';
      const safeInput = 'Hello';
      
      expect(sanitizeInput(dangerousInput)).toBe('Hello');
      expect(sanitizeInput(safeInput)).toBe('Hello');
    });

    it('should mask sensitive data', () => {
      const { maskSensitiveData } = require('../../utils/security');
      
      expect(maskSensitiveData('+254712345678')).toBe('+254******678');
      expect(maskSensitiveData('1234567890123456')).toBe('123456******3456');
      expect(maskSensitiveData('test@example.com')).toBe('te****@example.com');
    });

    it('should generate secure tokens', () => {
      const { generateSecureToken } = require('../../utils/security');
      
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);

      expect(token1).toHaveLength(64); // 32 bytes in hex
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });
});