/**
 * Apollo.io API Service
 * Handles lead enrichment and search for Viper outreach
 *
 * @module src/services/apollo
 */
require('dotenv').config();

const logger = require('../core/logger').child('Apollo');

const APOLLO_API_URL = 'https://api.apollo.io/v1';
const API_KEY = process.env.APOLLO_API_KEY;

/**
 * Search for people/contacts in Apollo
 * @param {object} params - Search parameters
 * @param {string} params.keywords - Keywords to search (e.g., "transmission repair")
 * @param {string[]} params.locations - Array of locations (e.g., ["Florida, US"])
 * @param {string[]} params.titles - Job titles to filter
 * @param {number} params.perPage - Results per page (max 100)
 * @param {number} params.page - Page number
 * @returns {Promise<object>}
 */
async function searchPeople(params) {
  if (!API_KEY) {
    return { success: false, error: 'APOLLO_API_KEY not configured' };
  }

  const {
    keywords = '',
    locations = [],
    titles = [],
    perPage = 25,
    page = 1,
  } = params;

  try {
    const response = await fetch(`${APOLLO_API_URL}/mixed_people/api_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        q_keywords: keywords,
        person_locations: locations,
        person_titles: titles,
        per_page: perPage,
        page: page,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apollo API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    logger.info(`Apollo search returned ${data.people?.length || 0} results`);

    return {
      success: true,
      people: data.people || [],
      pagination: data.pagination || {},
      total: data.pagination?.total_entries || 0,
    };
  } catch (e) {
    logger.error('Apollo search error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Search for companies/organizations in Apollo
 * @param {object} params - Search parameters
 * @param {string} params.keywords - Keywords to search
 * @param {string[]} params.locations - Array of locations
 * @param {string[]} params.industries - Industry filters
 * @param {number} params.perPage - Results per page
 * @param {number} params.page - Page number
 * @returns {Promise<object>}
 */
async function searchCompanies(params) {
  if (!API_KEY) {
    return { success: false, error: 'APOLLO_API_KEY not configured' };
  }

  const {
    keywords = '',
    locations = [],
    industries = [],
    perPage = 25,
    page = 1,
  } = params;

  try {
    const response = await fetch(`${APOLLO_API_URL}/mixed_companies/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        q_keywords: keywords,
        organization_locations: locations,
        organization_industry_tag_ids: industries,
        per_page: perPage,
        page: page,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apollo API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    logger.info(`Apollo company search returned ${data.organizations?.length || 0} results`);

    return {
      success: true,
      companies: data.organizations || [],
      pagination: data.pagination || {},
      total: data.pagination?.total_entries || 0,
    };
  } catch (e) {
    logger.error('Apollo company search error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Enrich a person with additional data
 * @param {object} params - Person identifiers
 * @param {string} params.email - Email address
 * @param {string} params.linkedinUrl - LinkedIn profile URL
 * @returns {Promise<object>}
 */
async function enrichPerson(params) {
  if (!API_KEY) {
    return { success: false, error: 'APOLLO_API_KEY not configured' };
  }

  const { email, linkedinUrl } = params;

  try {
    const response = await fetch(`${APOLLO_API_URL}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        email: email,
        linkedin_url: linkedinUrl,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apollo enrich error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      person: data.person || null,
    };
  } catch (e) {
    logger.error('Apollo enrich error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get saved lists from Apollo account
 * @returns {Promise<object>}
 */
async function getSavedLists() {
  if (!API_KEY) {
    return { success: false, error: 'APOLLO_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${APOLLO_API_URL}/labels`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apollo lists error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      lists: data.labels || [],
    };
  } catch (e) {
    logger.error('Apollo lists error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get contacts from a saved list
 * @param {string} listId - Apollo list ID
 * @param {number} perPage - Results per page
 * @param {number} page - Page number
 * @returns {Promise<object>}
 */
async function getListContacts(listId, perPage = 100, page = 1) {
  if (!API_KEY) {
    return { success: false, error: 'APOLLO_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${APOLLO_API_URL}/mixed_people/api_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        label_ids: [listId],
        per_page: perPage,
        page: page,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apollo list contacts error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      contacts: data.people || [],
      pagination: data.pagination || {},
      total: data.pagination?.total_entries || 0,
    };
  } catch (e) {
    logger.error('Apollo list contacts error:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Search for transmission shops in a specific state
 * Convenience function for Viper
 * @param {string} state - US state (e.g., "Florida")
 * @param {number} limit - Max results
 * @returns {Promise<object>}
 */
async function searchTransmissionShops(state = 'Florida', limit = 100) {
  return searchPeople({
    keywords: 'transmission repair',
    locations: [`${state}, United States`],
    titles: ['Owner', 'Manager', 'Service Manager', 'General Manager'],
    perPage: limit,
    page: 1,
  });
}

/**
 * Transform Apollo contact to outreach_leads format
 * @param {object} contact - Apollo contact object
 * @returns {object} - Formatted lead object
 */
function transformToLead(contact) {
  return {
    contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    business_name: contact.organization?.name || contact.organization_name || '',
    email: contact.email || '',
    phone: contact.phone_numbers?.[0]?.sanitized_number || contact.organization?.phone || '',
    website: contact.organization?.website_url || '',
    city: contact.city || '',
    state: contact.state || '',
    country: contact.country || 'United States',
    title: contact.title || '',
    linkedin_url: contact.linkedin_url || '',
    source: 'apollo',
    apollo_id: contact.id || '',
    tags: contact.organization?.keywords?.slice(0, 10) || [],
    raw_data: contact,
  };
}

module.exports = {
  searchPeople,
  searchCompanies,
  enrichPerson,
  getSavedLists,
  getListContacts,
  searchTransmissionShops,
  transformToLead,
};
