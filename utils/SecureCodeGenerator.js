// File: utils/SecureCodeGenerator.js
const crypto = require('crypto');

class SecureCodeGenerator {
  constructor() {
    // Character set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (33 chars, no 0, 1, I, O to avoid confusion)
    this.charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.charsetLength = this.charset.length;
    this.codeLength = 10;
    this.displayFormat = /^(.{4})(.{4})(.{2})$/.source;
  }

  /**
   * Generate a cryptographically secure activation code
   * @returns {string} 10-character code without hyphens
   */
  generateSecureCode() {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      
      // Generate cryptographically secure random bytes
      const randomBytes = crypto.randomBytes(16); // Extra bytes for better entropy
      let code = '';

      // Convert random bytes to our charset
      for (let i = 0; i < this.codeLength; i++) {
        const randomValue = randomBytes[i] % this.charsetLength;
        code += this.charset[randomValue];
      }

      // Validate code strength
      if (this.isCodeStrong(code)) {
        return code;
      }
    }

    throw new Error('Failed to generate strong code after maximum attempts');
  }

  /**
   * Validate code strength against weak patterns
   * @param {string} code - The generated code
   * @returns {boolean} true if code is strong
   */
  isCodeStrong(code) {
    // Check for consecutive identical characters (AAA, BBB, etc.)
    if (/(.)\1{2,}/.test(code)) {
      return false;
    }

    // Check for sequential patterns (ABC, 234, etc.)
    for (let i = 0; i < code.length - 2; i++) {
      const char1Index = this.charset.indexOf(code[i]);
      const char2Index = this.charset.indexOf(code[i + 1]);
      const char3Index = this.charset.indexOf(code[i + 2]);

      // Check ascending sequence
      if (char2Index === char1Index + 1 && char3Index === char2Index + 1) {
        return false;
      }

      // Check descending sequence
      if (char2Index === char1Index - 1 && char3Index === char2Index - 1) {
        return false;
      }
    }

    // Check for repeated patterns (ABAB, XYXY, etc.)
    if (/(.{2,})\1/.test(code)) {
      return false;
    }

    // Ensure minimum entropy (at least 4 different characters)
    const uniqueChars = new Set(code).size;
    if (uniqueChars < 4) {
      return false;
    }

    return true;
  }

  /**
   * Format code for display with hyphens
   * @param {string} code - The raw code
   * @returns {string} Formatted code (XXXX-XXXX-XX)
   */
  formatCodeForDisplay(code) {
    if (code.length !== this.codeLength) {
      throw new Error('Invalid code length for formatting');
    }
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`;
  }

  /**
   * Calculate collision probability for given batch size
   * @param {number} batchSize - Number of codes to generate
   * @returns {number} Collision probability
   */
  calculateCollisionProbability(batchSize) {
    const totalPossibleCodes = Math.pow(this.charsetLength, this.codeLength);
    // Using birthday paradox approximation
    const probability = 1 - Math.exp(-Math.pow(batchSize, 2) / (2 * totalPossibleCodes));
    return probability;
  }

  /**
   * Verify cryptographic entropy of generated code
   * @param {string} code - The code to verify
   * @returns {object} Entropy analysis
   */
  verifyEntropy(code) {
    const charFrequency = {};
    for (const char of code) {
      charFrequency[char] = (charFrequency[char] || 0) + 1;
    }

    // Calculate Shannon entropy
    let entropy = 0;
    const codeLength = code.length;
    
    for (const freq of Object.values(charFrequency)) {
      const probability = freq / codeLength;
      entropy -= probability * Math.log2(probability);
    }

    // Maximum possible entropy for our charset
    const maxEntropy = Math.log2(this.charsetLength);
    const entropyRatio = entropy / maxEntropy;

    return {
      shannonEntropy: entropy,
      maxPossibleEntropy: maxEntropy,
      entropyRatio: entropyRatio,
      isHighEntropy: entropyRatio > 0.8 // Consider high entropy if > 80% of maximum
    };
  }
}

module.exports = SecureCodeGenerator;