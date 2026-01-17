/**
 * Multi-Agent System for Programming Car
 * Central dispatcher that routes owner commands to specialized departments
 */

const DEPARTMENTS = {
  ventas: {
    name: 'Ventas',
    emoji: '💰',
    description: 'Clientes, cotizaciones, precios, leads',
    keywords: ['cliente', 'lead', 'precio', 'cotiza', 'venta', 'pendiente'],
  },
  marketing: {
    name: 'Marketing',
    emoji: '📱',
    description: 'Redes sociales, contenido, publicaciones',
    keywords: ['publica', 'post', 'video', 'tiktok', 'instagram', 'facebook', 'contenido', 'redes'],
  },
  operaciones: {
    name: 'Operaciones',
    emoji: '🔧',
    description: 'Agenda, trabajos, técnico, FCC',
    keywords: ['agenda', 'trabajo', 'cita', 'fcc', 'llave', 'programar', 'tecnico'],
  },
  contabilidad: {
    name: 'Contabilidad',
    emoji: '📊',
    description: 'Ingresos, gastos, reportes financieros',
    keywords: ['ingreso', 'gasto', 'dinero', 'ganancia', 'reporte', 'finanza', 'cobr'],
  },
};

/**
 * Detect which department should handle the message
 * @param {string} message - User message
 * @returns {string|null} Department key or null
 */
function detectDepartment(message) {
  const lowerMsg = message.toLowerCase();

  // Direct department commands (e.g., "ventas status", "marketing publica")
  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    if (lowerMsg.startsWith(key)) {
      return key;
    }
  }

  // Keyword-based detection
  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    for (const keyword of dept.keywords) {
      if (lowerMsg.includes(keyword)) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Get help text for all departments
 * @returns {string}
 */
function getDepartmentsHelp() {
  let help = '🏢 **DEPARTAMENTOS DISPONIBLES**\n\n';

  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    help += `${dept.emoji} **${dept.name}** (\`${key}\`)\n`;
    help += `   ${dept.description}\n\n`;
  }

  help += '💡 Usa: `[departamento] [comando]`\n';
  help += 'Ejemplo: `ventas status`, `marketing publica hoy`';

  return help;
}

module.exports = {
  DEPARTMENTS,
  detectDepartment,
  getDepartmentsHelp,
};
