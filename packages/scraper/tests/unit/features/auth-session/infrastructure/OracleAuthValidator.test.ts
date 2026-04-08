import { describe, it, expect } from 'vitest';
import { OracleAuthValidator } from '@scraper/features/auth-session/infrastructure/OracleAuthValidator';

describe('OracleAuthValidator', () => {
  const validator = new OracleAuthValidator();

  describe('isValid', () => {
    it('should return false if cookies are empty', () => {
      expect(validator.isValid([])).toBe(false);
      expect(validator.isValid(null as any)).toBe(false);
    });

    it('should return false if authToken is missing', () => {
      const cookies = [{ name: 'ora_session', value: 'v', expires: Date.now() / 1000 + 1000 }];
      expect(validator.isValid(cookies)).toBe(false);
    });

    it('should return true if authToken and an active session cookie exist', () => {
      const cookies = [
        { name: 'authToken', value: 'some.jwt.token', expires: Date.now() / 1000 + 1000 },
        { name: 'ora_session', value: 'v', expires: Date.now() / 1000 + 1000 }
      ];
      expect(validator.isValid(cookies)).toBe(true);
    });

    it('should return true if session cookie is a session-only cookie (expires <= 0)', () => {
      const cookies = [
        { name: 'authToken', value: 'token', expires: 0 },
        { name: 'OAMAuthnCookie', value: 'v', expires: 0 }
      ];
      expect(validator.isValid(cookies)).toBe(true);
    });

    it('should return false if session cookies are expired', () => {
      const cookies = [
        { name: 'authToken', value: 'token', expires: Date.now() / 1000 + 1000 },
        { name: 'ora_session', value: 'v', expires: Date.now() / 1000 - 1000 }
      ];
      expect(validator.isValid(cookies)).toBe(false);
    });
  });

  describe('getExpiry', () => {
    it('should return null if no critical cookies have expiry', () => {
      expect(validator.getExpiry([])).toBeNull();
    });

    it('should return the minimum expiry from matching auth cookies', () => {
      const now = Date.now() / 1000;
      const cookies = [
        { name: 'ora_session', expires: now + 2000 },
        { name: 'OAMAuthnCookie', expires: now + 1500 },
        { name: 'GP_AUTH_XYZ', expires: now + 1800 },
        { name: 'other', expires: now + 500 } // Should ignore
      ];
      expect(validator.getExpiry(cookies)).toBeCloseTo(now + 1500, 1);
    });

    it('should include JWT expiry if present and in the future', () => {
      const now = Math.round(Date.now() / 1000);
      const future = now + 1000;
      
      // Mock JWT with exp
      const payload = Buffer.from(JSON.stringify({ exp: future })).toString('base64');
      const token = `header.${payload}.signature`;

      const cookies = [
        { name: 'authToken', value: token, expires: now + 2000 },
        { name: 'ora_session', expires: now + 3000 }
      ];

      expect(validator.getExpiry(cookies)).toBe(future);
    });
  });
});
