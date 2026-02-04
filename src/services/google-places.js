/**
 * Google Places API Service
 * Search for local businesses (transmission shops, auto repair, etc.)
 *
 * @module src/services/google-places
 */
require('dotenv').config();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * Search for businesses near a location
 * @param {object} params - Search parameters
 * @param {string} params.query - Search query (e.g., "transmission repair")
 * @param {string} params.location - City, State (e.g., "Miami, Florida")
 * @param {number} params.radius - Search radius in meters (default: 50000 = 50km)
 * @returns {Promise<object>}
 */
async function searchPlaces(params) {
  const { query, location, radius = 50000 } = params;

  if (!API_KEY) {
    return { success: false, error: 'GOOGLE_PLACES_API_KEY not configured' };
  }

  try {
    // First, geocode the location to get lat/lng
    const geoResult = await geocodeLocation(location);
    if (!geoResult.success) {
      return geoResult;
    }

    const { lat, lng } = geoResult;

    // Search for places
    const searchUrl = `${BASE_URL}/nearbysearch/json?` +
      `location=${lat},${lng}` +
      `&radius=${radius}` +
      `&keyword=${encodeURIComponent(query)}` +
      `&type=car_repair` +
      `&key=${API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { success: false, error: data.error_message || data.status };
    }

    const places = (data.results || []).map(transformPlace);

    return {
      success: true,
      places,
      total: places.length,
      nextPageToken: data.next_page_token,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Search for transmission shops in a city/state
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {number} radius - Search radius in meters
 * @returns {Promise<object>}
 */
async function searchTransmissionShops(city, state, radius = 50000) {
  return searchPlaces({
    query: 'transmission repair shop',
    location: `${city}, ${state}, USA`,
    radius,
  });
}

/**
 * Search for auto repair shops in a city/state
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {number} radius - Search radius in meters
 * @returns {Promise<object>}
 */
async function searchAutoRepairShops(city, state, radius = 50000) {
  return searchPlaces({
    query: 'auto repair shop',
    location: `${city}, ${state}, USA`,
    radius,
  });
}

/**
 * Get place details (phone, website, etc.)
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>}
 */
async function getPlaceDetails(placeId) {
  if (!API_KEY) {
    return { success: false, error: 'GOOGLE_PLACES_API_KEY not configured' };
  }

  try {
    const url = `${BASE_URL}/details/json?` +
      `place_id=${placeId}` +
      `&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,types,business_status` +
      `&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return { success: false, error: data.error_message || data.status };
    }

    return {
      success: true,
      place: transformPlaceDetails(data.result),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Geocode a location string to lat/lng
 * @param {string} location - Location string (e.g., "Miami, Florida")
 * @returns {Promise<object>}
 */
async function geocodeLocation(location) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(location)}` +
      `&key=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return { success: false, error: data.error_message || data.status };
    }

    const result = data.results[0];
    return {
      success: true,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Transform Google Place to lead format
 * @param {object} place - Google Place object
 * @returns {object}
 */
function transformPlace(place) {
  // Parse address components
  const address = place.vicinity || place.formatted_address || '';
  const parts = address.split(', ');

  return {
    place_id: place.place_id,
    business_name: place.name,
    address: address,
    city: parts[parts.length - 2] || '',
    rating: place.rating,
    total_ratings: place.user_ratings_total,
    is_open: place.opening_hours?.open_now,
    types: place.types,
    location: place.geometry?.location,
  };
}

/**
 * Transform place details to lead format
 * @param {object} place - Google Place details
 * @returns {object}
 */
function transformPlaceDetails(place) {
  // Parse address to extract city/state
  const addressParts = (place.formatted_address || '').split(', ');
  let city = '';
  let state = '';

  if (addressParts.length >= 3) {
    city = addressParts[addressParts.length - 3];
    const stateZip = addressParts[addressParts.length - 2] || '';
    state = stateZip.split(' ')[0];
  }

  return {
    business_name: place.name,
    address: place.formatted_address,
    city,
    state,
    country: 'United States',
    phone: place.formatted_phone_number,
    website: place.website,
    rating: place.rating,
    business_status: place.business_status,
    types: place.types,
    opening_hours: place.opening_hours,
  };
}

/**
 * Search and enrich places with details
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {number} limit - Max results to enrich
 * @returns {Promise<object>}
 */
async function searchAndEnrich(city, state, limit = 10) {
  // First search
  const searchResult = await searchTransmissionShops(city, state);

  if (!searchResult.success) {
    return searchResult;
  }

  // Get details for top results
  const enrichedPlaces = [];

  for (const place of searchResult.places.slice(0, limit)) {
    const details = await getPlaceDetails(place.place_id);
    if (details.success) {
      enrichedPlaces.push({
        ...place,
        ...details.place,
        source: 'google_places',
      });
    } else {
      enrichedPlaces.push({
        ...place,
        source: 'google_places',
      });
    }

    // Rate limit: 10 requests per second
    await new Promise((r) => setTimeout(r, 100));
  }

  return {
    success: true,
    places: enrichedPlaces,
    total: enrichedPlaces.length,
  };
}

/**
 * Convert Google Places result to outreach lead format
 * @param {object} place - Enriched place object
 * @returns {object}
 */
function toOutreachLead(place) {
  return {
    business_name: place.business_name,
    phone: place.phone || null,
    website: place.website || null,
    city: place.city || null,
    state: place.state || null,
    country: 'United States',
    source: 'google_places',
    status: 'new',
    tags: ['google-places', 'transmission'],
    raw_data: place,
  };
}

module.exports = {
  searchPlaces,
  searchTransmissionShops,
  searchAutoRepairShops,
  getPlaceDetails,
  geocodeLocation,
  searchAndEnrich,
  toOutreachLead,
};
