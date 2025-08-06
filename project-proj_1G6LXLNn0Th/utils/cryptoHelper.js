// Crypto Helper Functions for iFlytek API
// Using Web Crypto API and fallback implementations

class CryptoHelper {
  static async md5(string) {
    try {
      // Use Web Crypto API if available
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(string);
        const hashBuffer = await window.crypto.subtle.digest('MD5', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback simple hash (not secure, for demo only)
        return this.simpleMD5(string);
      }
    } catch (error) {
      console.warn('MD5 crypto failed, using fallback:', error);
      return this.simpleMD5(string);
    }
  }

  static async hmacSHA1(data, key) {
    try {
      // Use Web Crypto API if available
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const dataToSign = encoder.encode(data);
        
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-1' },
          false,
          ['sign']
        );
        
        const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
        return new Uint8Array(signature);
      } else {
        // Fallback simple implementation
        return this.simpleHMAC(data, key);
      }
    } catch (error) {
      console.warn('HMAC-SHA1 crypto failed, using fallback:', error);
      return this.simpleHMAC(data, key);
    }
  }

  // Simple MD5 fallback (not cryptographically secure)
  static simpleMD5(string) {
    let hash = 0;
    if (string.length === 0) return hash.toString(16);
    for (let i = 0; i < string.length; i++) {
      const char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // Simple HMAC fallback
  static simpleHMAC(data, key) {
    // Very basic implementation for demo
    const combined = key + data;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return new Uint8Array([Math.abs(hash) % 256]);
  }

  // Convert byte array to base64
  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Export for global use
window.CryptoHelper = CryptoHelper;