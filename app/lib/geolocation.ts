/**
 * Geolocation and Delivery Service for MacSunny Electronics
 * Calculates delivery costs based on distance and location zones in Ghana
 */

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  region?: string;
}

export interface DeliveryZone {
  _id?: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  maxDistance: number;
  regions: string[];
  enabled?: boolean;
}

// MacSunny store location (Accra, Ghana - update with actual coordinates)
export const STORE_LOCATION: Location = {
  latitude: 5.6037,
  longitude: -0.1870,
  address: 'MacSunny Electronics, Accra, Ghana',
  city: 'Accra',
  region: 'Greater Accra',
};

// Default delivery zones (fallback if database is unavailable)
const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    name: 'Accra Metro',
    basePrice: 10,
    pricePerKm: 2,
    maxDistance: 15,
    regions: ['Greater Accra', 'Accra'],
    enabled: true,
  },
  {
    name: 'Greater Accra Extended',
    basePrice: 20,
    pricePerKm: 3,
    maxDistance: 50,
    regions: ['Tema', 'Kasoa', 'Madina', 'Spintex'],
    enabled: true,
  },
  {
    name: 'Regional Capitals',
    basePrice: 50,
    pricePerKm: 5,
    maxDistance: 300,
    regions: ['Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Sunyani', 'Koforidua'],
    enabled: true,
  },
  {
    name: 'Other Regions',
    basePrice: 80,
    pricePerKm: 7,
    maxDistance: 500,
    regions: [],
    enabled: true,
  },
];

// Cache for delivery settings
let cachedSettings: { zones: DeliveryZone[]; freeDeliveryThreshold: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch delivery zones from database
 */
async function fetchDeliverySettings(): Promise<{ zones: DeliveryZone[]; freeDeliveryThreshold: number }> {
  // Return cached settings if valid
  if (cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_DURATION) {
    return { zones: cachedSettings.zones, freeDeliveryThreshold: cachedSettings.freeDeliveryThreshold };
  }

  try {
    const response = await fetch('/api/admin/delivery-settings', {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      const enabledZones = data.zones.filter((z: DeliveryZone) => z.enabled !== false);
      
      cachedSettings = {
        zones: enabledZones,
        freeDeliveryThreshold: data.freeDeliveryThreshold || 500,
        timestamp: Date.now(),
      };
      
      return { zones: enabledZones, freeDeliveryThreshold: data.freeDeliveryThreshold };
    }
  } catch (error) {
    console.error('Failed to fetch delivery settings, using defaults:', error);
  }

  // Return defaults if fetch fails
  return { zones: DEFAULT_DELIVERY_ZONES, freeDeliveryThreshold: 500 };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Determine delivery zone based on location
 */
export async function getDeliveryZone(location: Location): Promise<DeliveryZone> {
  const { zones } = await fetchDeliverySettings();
  
  const distance = calculateDistance(
    STORE_LOCATION.latitude,
    STORE_LOCATION.longitude,
    location.latitude,
    location.longitude
  );

  // Find matching zone by region or distance
  for (const zone of zones) {
    if (location.city && zone.regions.some(r => location.city?.includes(r))) {
      return zone;
    }
    if (location.region && zone.regions.some(r => location.region?.includes(r))) {
      return zone;
    }
    if (distance <= zone.maxDistance) {
      return zone;
    }
  }

  // Default to last zone (Other Regions)
  return zones[zones.length - 1];
}

/**
 * Calculate delivery cost
 */
export async function calculateDeliveryCost(
  customerLocation: Location,
  cartTotal: number
): Promise<{
  zone: DeliveryZone;
  distance: number;
  deliveryCost: number;
  estimatedTime: string;
  freeDelivery: boolean;
}> {
  const { zones, freeDeliveryThreshold } = await fetchDeliverySettings();
  
  const distance = calculateDistance(
    STORE_LOCATION.latitude,
    STORE_LOCATION.longitude,
    customerLocation.latitude,
    customerLocation.longitude
  );

  const zone = await getDeliveryZone(customerLocation);
  
  // Calculate cost: base price + (distance * price per km)
  let deliveryCost = zone.basePrice + distance * zone.pricePerKm;

  // Free delivery for orders above threshold
  const freeDelivery = cartTotal >= freeDeliveryThreshold;
  if (freeDelivery) {
    deliveryCost = 0;
  }

  // Estimate delivery time based on distance
  const hoursPerKm = 0.05; // Approx 20 km/h average speed in Ghana
  const estimatedHours = Math.ceil(distance * hoursPerKm + 2); // Add 2 hours for processing
  const estimatedTime =
    estimatedHours < 24
      ? `${estimatedHours} hours`
      : `${Math.ceil(estimatedHours / 24)} days`;

  return {
    zone,
    distance: Math.round(distance * 10) / 10,
    deliveryCost: Math.round(deliveryCost * 100) / 100,
    estimatedTime,
    freeDelivery,
  };
}

/**
 * Get current location using browser geolocation API
 */
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const address = await reverseGeocode(latitude, longitude);
          resolve({
            latitude,
            longitude,
            address: address.formatted,
            city: address.city,
            region: address.region,
          });
        } catch (error) {
          // Fallback without address details
          resolve({
            latitude,
            longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          });
        }
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
}

/**
 * Reverse geocode coordinates to address (using free Nominatim API)
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ formatted: string; city?: string; region?: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MacSunnyElectronics/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return {
      formatted: data.display_name || `${lat}, ${lon}`,
      city: data.address?.city || data.address?.town || data.address?.suburb,
      region: data.address?.state || data.address?.region,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      formatted: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    };
  }
}

/**
 * Geocode address to coordinates (using free Nominatim API)
 */
export async function geocodeAddress(address: string): Promise<Location> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address + ', Ghana'
      )}&limit=1`,
      {
        headers: {
          'User-Agent': 'MacSunnyElectronics/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn('Geocoding failed, using fallback');
      // Return fallback coordinates for Accra
      return {
        latitude: 5.6037,
        longitude: -0.1870,
        address: address,
        city: 'Accra',
        region: 'Greater Accra Region',
      };
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn('Address not found, using fallback for Accra');
      // Return fallback coordinates for Accra instead of throwing error
      return {
        latitude: 5.6037,
        longitude: -0.1870,
        address: address,
        city: 'Accra',
        region: 'Greater Accra Region',
      };
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      address: data[0].display_name,
      city: data[0].address?.city || data[0].address?.town,
      region: data[0].address?.state || data[0].address?.region,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Don't throw - return fallback Accra coordinates
    return {
      latitude: 5.6037,
      longitude: -0.1870,
      address: address,
      city: 'Accra',
      region: 'Greater Accra Region',
    };
  }
}
