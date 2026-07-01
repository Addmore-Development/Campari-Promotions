import { redis } from '../config';

const LOCATION_TTL = 7200; // 2 hour expiry — covers a full shift

export interface LiveLocation {
  userId:          string;
  lat:             number;
  lng:             number;
  timestamp:       number;
  // Rich metadata
  shiftId?:        string;
  jobId?:          string;
  jobTitle?:       string;
  venue?:          string;
  promoterName?:   string;
  promoterPhoto?:  string;
  checkInTime?:    string;
  hourlyRate?:     number;
  hoursWorked?:    number;
  currentEarnings?: number;
}

export const setLiveLocation = async (
  userId: string,
  lat: number,
  lng: number,
  meta?: Record<string, any>
): Promise<void> => {
  const data: LiveLocation = {
    userId,
    lat,
    lng,
    timestamp: Date.now(),
    ...meta,
  };
  await redis.set(`live:${userId}`, JSON.stringify(data), 'EX', LOCATION_TTL);
};

export const clearLiveLocation = async (userId: string): Promise<void> => {
  await redis.del(`live:${userId}`);
};

export const getLiveLocation = async (userId: string): Promise<LiveLocation | null> => {
  try {
    const val = await redis.get(`live:${userId}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

export const getAllLiveLocations = async (): Promise<LiveLocation[]> => {
  try {
    const keys = await redis.keys('live:*');
    if (!keys.length) return [];
    const values = await redis.mget(...keys);
    const locations: LiveLocation[] = [];
    for (const val of values) {
      if (val) {
        try { locations.push(JSON.parse(val)); } catch { /* skip malformed */ }
      }
    }
    return locations;
  } catch {
    return [];
  }
};