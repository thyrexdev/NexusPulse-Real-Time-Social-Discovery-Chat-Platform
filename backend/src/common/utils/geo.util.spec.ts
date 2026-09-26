import {
  getFlagEmoji,
  getCountryName,
  extractClientIp,
  resolveGeoLocation,
} from './geo.util';

describe('GeoUtil', () => {
  describe('getFlagEmoji', () => {
    it('should convert 2-letter ISO country code to emoji flag', () => {
      expect(getFlagEmoji('EG')).toBe('🇪🇬');
      expect(getFlagEmoji('US')).toBe('🇺🇸');
      expect(getFlagEmoji('DE')).toBe('🇩🇪');
      expect(getFlagEmoji('GB')).toBe('🇬🇧');
      expect(getFlagEmoji('SA')).toBe('🇸🇦');
    });

    it('should return globe for invalid country code', () => {
      expect(getFlagEmoji('')).toBe('🌐');
      expect(getFlagEmoji('E')).toBe('🌐');
      expect(getFlagEmoji('EGY')).toBe('🌐');
    });
  });

  describe('getCountryName', () => {
    it('should resolve standard country code to English name', () => {
      expect(getCountryName('EG')).toBe('Egypt');
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('DE')).toBe('Germany');
    });

    it('should handle unknown code gracefully', () => {
      expect(getCountryName('UNKNOWN')).toBe('Unknown Region');
    });
  });

  describe('extractClientIp', () => {
    it('should prioritize cf-connecting-ip', () => {
      const headers = {
        'cf-connecting-ip': '156.192.1.1',
        'x-real-ip': '10.0.0.1',
        'x-forwarded-for': '192.168.1.1',
      };
      expect(extractClientIp(headers)).toBe('156.192.1.1');
    });

    it('should extract first IP from x-forwarded-for', () => {
      const headers = {
        'x-forwarded-for': '41.233.1.1, 10.0.0.2',
      };
      expect(extractClientIp(headers)).toBe('41.233.1.1');
    });

    it('should strip ::ffff: prefix from remote address', () => {
      expect(extractClientIp({}, '::ffff:127.0.0.1')).toBe('127.0.0.1');
    });
  });

  describe('resolveGeoLocation', () => {
    it('should support mock header override for dev testing', () => {
      const geo = resolveGeoLocation({ 'x-mock-country': 'FR' });
      expect(geo.countryCode).toBe('FR');
      expect(geo.country).toBe('France');
      expect(geo.flag).toBe('🇫🇷');
    });

    it('should provide fallback for localhost / loopback IPs', () => {
      const geo = resolveGeoLocation({}, '127.0.0.1');
      expect(geo.countryCode).toBe('EG');
      expect(geo.country).toBe('Egypt');
      expect(geo.flag).toBe('🇪🇬');
    });

    it('should resolve valid public Egyptian IP to Egypt', () => {
      // 156.192.0.1 is Telecom Egypt
      const geo = resolveGeoLocation({ 'x-real-ip': '156.192.0.1' });
      expect(geo.countryCode).toBe('EG');
      expect(geo.country).toBe('Egypt');
      expect(geo.flag).toBe('🇪🇬');
    });

    it('should resolve valid public US IP to United States', () => {
      // 8.8.8.8 is Google Public DNS (US)
      const geo = resolveGeoLocation({ 'x-real-ip': '8.8.8.8' });
      expect(geo.countryCode).toBe('US');
      expect(geo.country).toBe('United States');
      expect(geo.flag).toBe('🇺🇸');
    });
  });
});
