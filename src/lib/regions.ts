/** Shared region constants used across the app */

/** Mapping from user profile region string → ISO country code */
export const REGION_TO_COUNTRY: Record<string, string> = {
  taiwan: 'TW',
  hong_kong: 'HK',
  singapore: 'SG',
  malaysia: 'MY',
  japan: 'JP',
  south_korea: 'KR',
  thailand: 'TH',
  indonesia: 'ID',
};

/** Reverse mapping: ISO country code → profile region string */
export const COUNTRY_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_TO_COUNTRY).map(([k, v]) => [v, k]),
);

/** Country codes with active content coverage (order used in UI) */
export const ACTIVE_COUNTRY_CODES = ['TW', 'JP', 'HK', 'SG', 'MY', 'KR', 'TH', 'ID'] as const;

/** Cookie name set by middleware for IP-based geo detection */
export const GEO_COOKIE = 'jn-geo';

/** localStorage key for guest region preference */
export const REGION_STORAGE_KEY = 'jn-region';
