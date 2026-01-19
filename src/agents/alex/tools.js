/**
 * ATLAS Agent: Alex (Sales)
 * GPT Tool Definitions
 *
 * @module src/agents/alex/tools
 */

/**
 * Tool definitions for OpenAI function calling
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_system_status',
      description:
        'Obtiene el estado del sistema: leads recientes, solicitudes de precio pendientes, y métricas. SOLO usar cuando Jesús (el dueño) pida reportes o status.',
      parameters: {
        type: 'object',
        properties: {
          include_leads: {
            type: 'boolean',
            description: 'Incluir lista de leads recientes',
          },
          include_pending: {
            type: 'boolean',
            description: 'Incluir solicitudes de precio pendientes',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_vin',
      description:
        'Busca detalles técnicos de un vehículo (Año, Marca, Modelo, Motor, FCC ID de llave) usando su VIN. AUTOMÁTICAMENTE incluye el FCC ID correcto del Libro Maestro si existe. Úsalo SIEMPRE que identifiques un VIN. El resultado incluirá: year, make, model, engine, fcc_info (array de FCCs), recommended_fcc.',
      parameters: {
        type: 'object',
        properties: {
          vin: {
            type: 'string',
            description: 'El número de identificación del vehículo (17 caracteres).',
          },
        },
        required: ['vin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_key_info',
      description:
        'Busca información de llaves (FCC ID) y enlaces de compra para un auto específico. Úsalo cuando el cliente pregunte por llaves o copias.',
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'string', description: 'Año del auto (ej: 2019)' },
          make: { type: 'string', description: 'Marca del auto (ej: Toyota)' },
          model: { type: 'string', description: 'Modelo del auto (ej: Corolla)' },
        },
        required: ['year', 'make', 'model'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_internal_key_cost',
      description:
        'Busca el COSTO REAL de una llave en proveedores (UHS/Locksmith Keyless) usando el FCC ID. USAR SOLO PARA USO INTERNO.',
      parameters: {
        type: 'object',
        properties: {
          fcc_id: { type: 'string', description: 'El FCC ID de la llave (ej: HYQ12BDM)' },
          make: { type: 'string', description: 'Marca del auto' },
          model: { type: 'string', description: 'Modelo del auto' },
          year: { type: 'integer', description: 'Año del auto' },
        },
        required: ['fcc_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_status',
      description:
        'Actualiza el estado del cliente en el CRM. Usar cuando el cliente avanza en el pipeline de ventas.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['NUEVO', 'COTIZANDO', 'PROGRAMADO', 'COMPLETADO', 'PERDIDO'],
            description: 'Nuevo estado del cliente',
          },
          notes: { type: 'string', description: 'Notas adicionales (opcional)' },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_appointment',
      description:
        'Programa una cita para servicio. Usar cuando el cliente confirma fecha y hora.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha de la cita (YYYY-MM-DD)' },
          time: { type: 'string', description: 'Hora de la cita (HH:MM)' },
          service_type: { type: 'string', description: 'Tipo de servicio (llaves, módulos, diagnóstico)' },
          location: { type: 'string', description: 'Dirección o ZIP code del cliente' },
          notes: { type: 'string', description: 'Notas adicionales' },
        },
        required: ['date', 'time', 'service_type'],
      },
    },
  },
];

/**
 * Gets all tool definitions
 * @returns {Array}
 */
function getTools() {
  return TOOLS;
}

/**
 * Gets a specific tool by name
 * @param {string} name - Tool name
 * @returns {object|null}
 */
function getTool(name) {
  return TOOLS.find((t) => t.function.name === name) || null;
}

/**
 * Gets tool names as array
 * @returns {string[]}
 */
function getToolNames() {
  return TOOLS.map((t) => t.function.name);
}

module.exports = {
  TOOLS,
  getTools,
  getTool,
  getToolNames,
};
