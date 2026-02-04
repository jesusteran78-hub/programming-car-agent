/**
 * Google Calendar Integration Service
 * Syncs appointments with Google Calendar for Programming Car
 *
 * @module src/services/google-calendar
 */
const { google } = require('googleapis');
const logger = require('../core/logger').child('GoogleCalendar');

// Configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

let calendarClient = null;
let authClient = null;

/**
 * Initialize Google Calendar client with Service Account
 * Uses the service account's own calendar (no impersonation needed)
 * @returns {Promise<object>} Calendar API client
 */
async function initializeCalendar() {
  if (calendarClient) {
    return calendarClient;
  }

  try {
    // Check for required environment variables
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      logger.warn('Google Calendar credentials not configured - running in mock mode');
      return null;
    }

    // Create JWT auth client using service account (NO subject = uses own calendar)
    authClient = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: SCOPES,
      // NO subject - service account uses its OWN calendar
    });

    // Authorize
    await authClient.authorize();

    // Create calendar client
    calendarClient = google.calendar({ version: 'v3', auth: authClient });

    logger.info('Google Calendar initialized successfully (using service account calendar)');
    return calendarClient;
  } catch (error) {
    logger.error('Failed to initialize Google Calendar:', error.message);
    return null;
  }
}

/**
 * Create a calendar event for an appointment
 * @param {object} appointment - Appointment details
 * @param {string} appointment.date - Date (YYYY-MM-DD)
 * @param {string} appointment.time - Time (HH:MM)
 * @param {string} appointment.serviceType - Type of service
 * @param {string} appointment.clientName - Client name
 * @param {string} appointment.clientPhone - Client phone
 * @param {string} appointment.vehicle - Vehicle info
 * @param {string} appointment.location - Service location
 * @param {string} appointment.notes - Additional notes
 * @returns {Promise<object>} Created event or error
 */
async function createAppointment(appointment) {
  const calendar = await initializeCalendar();

  const {
    date,
    time,
    serviceType,
    clientName = 'Cliente',
    clientPhone = '',
    vehicle = '',
    location = '',
    notes = '',
  } = appointment;

  // Build event details
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour duration

  const eventDetails = {
    summary: `🔧 ${serviceType} - ${clientName}`,
    description: `
📞 Cliente: ${clientName}
☎️ Teléfono: ${clientPhone}
🚗 Vehículo: ${vehicle}
📍 Ubicación: ${location}
📝 Notas: ${notes}

---
Creado automáticamente por Alex (Programming Car OS)
    `.trim(),
    location: location,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    colorId: '11', // Red for work appointments
  };

  // If no calendar client, return mock response
  if (!calendar) {
    logger.info('Mock mode: Would create event:', eventDetails.summary);
    return {
      success: true,
      mock: true,
      event: {
        id: `mock-${Date.now()}`,
        summary: eventDetails.summary,
        start: eventDetails.start,
        end: eventDetails.end,
        htmlLink: null,
      },
    };
  }

  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: eventDetails,
      sendUpdates: 'none',
    });

    logger.info(`Calendar event created: ${response.data.id}`);
    return {
      success: true,
      event: {
        id: response.data.id,
        summary: response.data.summary,
        start: response.data.start,
        end: response.data.end,
        htmlLink: response.data.htmlLink,
      },
    };
  } catch (error) {
    logger.error('Failed to create calendar event:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check calendar availability for a specific date/time range
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM) - optional
 * @param {string} endTime - End time (HH:MM) - optional
 * @returns {Promise<object>} Availability info with existing events
 */
async function checkAvailability(date, startTime = '08:00', endTime = '18:00') {
  const calendar = await initializeCalendar();

  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(`${date}T${endTime}:00`);

  // If no calendar client, return mock availability
  if (!calendar) {
    logger.info('Mock mode: Checking availability for', date);
    return {
      success: true,
      mock: true,
      date,
      available: true,
      events: [],
      busySlots: [],
      freeSlots: [{ start: startTime, end: endTime }],
    };
  }

  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    const busySlots = events.map((event) => ({
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      summary: event.summary,
    }));

    // Calculate free slots (simplified)
    const freeSlots = calculateFreeSlots(startTime, endTime, busySlots);

    logger.info(`Availability check for ${date}: ${events.length} events found`);
    return {
      success: true,
      date,
      available: freeSlots.length > 0,
      events: events.map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date,
      })),
      busySlots,
      freeSlots,
    };
  } catch (error) {
    logger.error('Failed to check availability:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get events for a date range (week view)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<object>} Events in range
 */
async function getEventsInRange(startDate, endDate) {
  const calendar = await initializeCalendar();

  const startDateTime = new Date(`${startDate}T00:00:00`);
  const endDateTime = new Date(`${endDate}T23:59:59`);

  if (!calendar) {
    logger.info('Mock mode: Getting events for range', startDate, '-', endDate);
    return {
      success: true,
      mock: true,
      events: [],
    };
  }

  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const events = (response.data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: e.start.dateTime || e.start.date,
      end: e.end.dateTime || e.end.date,
    }));

    logger.info(`Found ${events.length} events for ${startDate} to ${endDate}`);
    return { success: true, events };
  } catch (error) {
    logger.error('Failed to get events:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a calendar event
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<object>} Deletion result
 */
async function deleteEvent(eventId) {
  const calendar = await initializeCalendar();

  if (!calendar) {
    logger.info('Mock mode: Would delete event:', eventId);
    return { success: true, mock: true };
  }

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    logger.info(`Calendar event deleted: ${eventId}`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete event:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate free time slots given busy periods
 * @param {string} dayStart - Start of day (HH:MM)
 * @param {string} dayEnd - End of day (HH:MM)
 * @param {Array} busySlots - Array of busy time slots
 * @returns {Array} Array of free time slots
 */
function calculateFreeSlots(dayStart, dayEnd, busySlots) {
  if (!busySlots || busySlots.length === 0) {
    return [{ start: dayStart, end: dayEnd }];
  }

  const freeSlots = [];
  let currentStart = dayStart;

  // Sort busy slots by start time
  const sorted = busySlots.sort((a, b) => {
    const aTime = new Date(a.start).getTime();
    const bTime = new Date(b.start).getTime();
    return aTime - bTime;
  });

  for (const slot of sorted) {
    const slotStart = new Date(slot.start);
    const slotStartTime = slotStart.toTimeString().slice(0, 5);

    if (currentStart < slotStartTime) {
      freeSlots.push({ start: currentStart, end: slotStartTime });
    }

    const slotEnd = new Date(slot.end);
    currentStart = slotEnd.toTimeString().slice(0, 5);
  }

  // Add remaining time after last busy slot
  if (currentStart < dayEnd) {
    freeSlots.push({ start: currentStart, end: dayEnd });
  }

  return freeSlots;
}

/**
 * Format events for WhatsApp display
 * @param {Array} events - Events array
 * @param {string} title - Section title
 * @returns {string} Formatted message
 */
function formatEventsForWhatsApp(events, title = 'Agenda') {
  if (!events || events.length === 0) {
    return `📅 *${title}*\nNo hay citas programadas.`;
  }

  let message = `📅 *${title}* (${events.length})\n\n`;

  events.forEach((event, i) => {
    const start = new Date(event.start);
    const dateStr = start.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = start.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    message += `${i + 1}. *${dateStr} ${timeStr}*\n`;
    message += `   ${event.summary}\n`;
    if (event.location) {
      message += `   📍 ${event.location}\n`;
    }
    message += '\n';
  });

  return message.trim();
}

module.exports = {
  initializeCalendar,
  createAppointment,
  checkAvailability,
  getEventsInRange,
  deleteEvent,
  formatEventsForWhatsApp,
};
