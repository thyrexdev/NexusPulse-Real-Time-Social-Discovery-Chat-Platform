import * as geoip from 'geoip-lite';

export interface GeoLocation {
  ip: string;
  countryCode: string;
  country: string;
  flag: string;
  city?: string;
}

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Converts a 2-letter ISO country code into an emoji flag.
 * e.g., 'EG' -> '🇪🇬', 'US' -> '🇺🇸'
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Resolve country name from 2-letter code with native Intl fallback.
 */
export function getCountryName(countryCode: string): string {
  if (!countryCode || countryCode === 'UNKNOWN') return 'Unknown Region';
  try {
    return REGION_NAMES.of(countryCode.toUpperCase()) || countryCode;
  } catch {
    return countryCode;
  }
}

/**
 * Clean and extract client IP from headers or connection.
 */
export function extractClientIp(headers: Record<string, string | string[] | undefined>, remoteAddress?: string): string {
  const cfIp = headers['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

  const realIp = headers['x-real-ip'];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;

  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const first = raw.split(',')[0].trim();
    if (first) return first;
  }

  if (remoteAddress) {
    // Strip ::ffff: prefix if present (IPv4 mapped to IPv6)
    return remoteAddress.replace(/^::ffff:/, '');
  }

  return '127.0.0.1';
}

const DEV_FALLBACK_COUNTRIES = [
  { code: 'EG', country: 'Egypt', flag: '🇪🇬' },
  { code: 'US', country: 'United States', flag: '🇺🇸' },
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', country: 'Germany', flag: '🇩🇪' },
  { code: 'SA', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', country: 'United Arab Emirates', flag: '🇦🇪' },
];

/**
 * Lookup Geo info for a given IP or request headers.
 */
export function resolveGeoLocation(
  headers: Record<string, string | string[] | undefined> = {},
  remoteAddress?: string,
): GeoLocation {
  const clientIp = extractClientIp(headers, remoteAddress);

  // Allow custom override via header for dev/testing
  const headerCountry = headers['x-mock-country'];
  if (headerCountry) {
    const code = (Array.isArray(headerCountry) ? headerCountry[0] : headerCountry).toUpperCase();
    return {
      ip: clientIp,
      countryCode: code,
      country: getCountryName(code),
      flag: getFlagEmoji(code),
    };
  }

  const isLocalOrPrivate =
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp.startsWith('192.168.') ||
    clientIp.startsWith('10.') ||
    clientIp.startsWith('172.16.') ||
    clientIp === 'localhost';

  if (isLocalOrPrivate) {
    // Provide a deterministic or realistic fallback for local testing
    // e.g. Egypt as primary test country
    return {
      ip: clientIp,
      countryCode: 'EG',
      country: 'Egypt',
      flag: '🇪🇬',
      city: 'Cairo',
    };
  }

  const geo = geoip.lookup(clientIp);
  if (geo && geo.country) {
    const code = geo.country.toUpperCase();
    return {
      ip: clientIp,
      countryCode: code,
      country: getCountryName(code),
      flag: getFlagEmoji(code),
      city: geo.city || undefined,
    };
  }

  return {
    ip: clientIp,
    countryCode: 'UN',
    country: 'Global',
    flag: '🌐',
  };
}
