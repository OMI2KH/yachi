// Minimal verification service stub used in tests
module.exports = {
  verifyDocument: async (document) => {
    // Return a fake verification result
    return { success: true, id: 'verif_stub', score: 0.98 };
  },

  verifySelfie: async (image) => {
    return { success: true, id: 'selfie_stub', match: true };
  },

  analyzeDocument: async (document) => {
    return { extracted: {}, confidence: 0.95 };
  }
};
