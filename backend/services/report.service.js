/* =============================================
   ZeroWaste – Servicio de Reportes
   Archivo: backend/services/report.service.js
   Prepara los datos para PDF y Excel.
   ============================================= */
'use strict';

const db = require('../config/db');
const StatsService = require('./stats.service');
const { buildPdf } = require('./pdf.service');

const MOTIVO_LABEL = {
  consumido: 'Consumido',
  eliminado: 'Eliminado',
  cocinado: 'Usado en receta'
};

const CATEGORIA_LABEL = {
  frutas: 'Frutas y verduras',
  lacteos: 'Lácteos',
  cereales: 'Cereales',
  carnes: 'Carnes',
  bebidas: 'Bebidas',
  otros: 'Otros'
};

function formatDateTime (value) {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value).replace('T', ' ');
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateOnly (value) {
  if (!value) return '-';
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-').map(Number);
  const date = parts.length === 3 && parts.every((n) => !isNaN(n))
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(value);
  if (isNaN(date.getTime())) return raw || String(value);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function money (value) {
  return 'S/ ' + Number(value || 0).toFixed(2);
}

function xmlEscape (value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeSheetName (value, usedNames) {
  let name = String(value || 'Hoja')
    .replace(/[\\/*?:[\]]/g, '')
    .trim()
    .slice(0, 31) || 'Hoja';

  let candidate = name;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const extra = ` (${suffix})`;
    candidate = name.slice(0, 31 - extra.length) + extra;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function fetchReportData (usuarioId) {
  const [usuarioRes, stats, inventarioRes, consumosRes, cocinadosRes] = await Promise.all([
    db.query('SELECT id, nombre, email, username FROM usuarios WHERE id = $1', [usuarioId]),
    StatsService.getEstadisticasUsuario(usuarioId),
    db.query(`
      SELECT nombre, categoria, cantidad, ubicacion,
             TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
             (fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes
        FROM alimentos
       WHERE usuario_id = $1
       ORDER BY dias_restantes ASC, fecha_vencimiento ASC
    `, [usuarioId]),
    db.query(`
      SELECT nombre, categoria, cantidad, motivo,
             TO_CHAR(fecha_consumo, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_consumo
        FROM alimentos_consumidos
       WHERE usuario_id = $1
       ORDER BY fecha_consumo DESC, id DESC
       LIMIT 300
    `, [usuarioId]),
    db.query(`
      SELECT COALESCE(rc.receta_nombre, r.nombre, 'Receta #' || rc.receta_id) AS nombre,
             TO_CHAR(rc.fecha_cocinado, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_cocinado
        FROM recetas_cocinadas rc
        LEFT JOIN recetas r ON r.id = rc.receta_id
       WHERE rc.usuario_id = $1
       ORDER BY rc.fecha_cocinado DESC, rc.id DESC
       LIMIT 200
    `, [usuarioId])
  ]);

  return {
    usuario: usuarioRes.rows[0] || { nombre: 'Usuario', email: '' },
    stats,
    inventario: inventarioRes.rows,
    consumos: consumosRes.rows,
    cocinados: cocinadosRes.rows
  };
}

function buildSummary (stats, usuario) {
  return [
    { label: 'Usuario', value: usuario.nombre || 'Usuario' },
    { label: 'Correo', value: usuario.email || '-' },
    { label: 'Ahorro estimado', value: money(stats.dinero_ahorrado_pen) },
    { label: 'Desperdicio evitado', value: Number(stats.kg_desperdicio_evitado || 0).toFixed(1) + ' kg' },
    { label: 'Alimentos salvados', value: String(stats.alimentos_salvados_total || 0) },
    { label: 'Alimentos consumidos', value: String(stats.total_consumidos || 0) },
    { label: 'Recetas cocinadas', value: String(stats.recetas_cocinadas || 0) },
    { label: 'En inventario', value: String(stats.total_en_inventario || 0) }
  ];
}

function buildInventoryRows (inventario) {
  return inventario.map((item) => [
    item.nombre,
    CATEGORIA_LABEL[item.categoria] || item.categoria || 'Otros',
    item.cantidad,
    item.ubicacion || '-',
    formatDateOnly(item.fecha_vencimiento),
    item.dias_restantes <= 0 ? 'Vence hoy' : item.dias_restantes + ' días'
  ]);
}

function buildConsumedRows (consumos) {
  return consumos.map((item) => [
    formatDateTime(item.fecha_consumo),
    item.nombre,
    item.cantidad,
    MOTIVO_LABEL[item.motivo] || item.motivo || '-',
    CATEGORIA_LABEL[item.categoria] || item.categoria || 'Otros'
  ]);
}

function buildCookedRows (cocinados) {
  return cocinados.map((item) => [
    formatDateTime(item.fecha_cocinado),
    item.nombre
  ]);
}

function buildConsumptionTrendRows (stats) {
  return (stats.consumo_diario || []).map((item, index) => {
    const receta = (stats.recetas_diario || [])[index];
    return [
      item.label + ' (' + formatDateOnly(item.fecha) + ')',
      item.cantidad,
      receta ? receta.cantidad : 0
    ];
  });
}

function buildReportDefinition (tipo, data) {
  const { usuario, stats, inventario, consumos, cocinados } = data;

  const base = {
    usuario: [usuario.nombre, usuario.email].filter(Boolean).join(' · '),
    summary: buildSummary(stats, usuario)
  };

  if (tipo === 'inventario') {
    return {
      ...base,
      title: 'Reporte de inventario ZeroWaste',
      subtitle: 'Alimentos disponibles, ubicación y fechas de vencimiento',
      sections: [
        {
          heading: 'Inventario actual (' + inventario.length + ' alimentos)',
          columns: [
            { label: 'Alimento', width: 1.7 },
            { label: 'Categoría', width: 1.25 },
            { label: 'Cant.', width: 0.6, align: 'center' },
            { label: 'Ubicación', width: 1.1 },
            { label: 'Vence', width: 0.95 },
            { label: 'Días', width: 0.8, align: 'center' }
          ],
          rows: buildInventoryRows(inventario)
        }
      ]
    };
  }

  if (tipo === 'historial') {
    return {
      ...base,
      title: 'Historial de consumo ZeroWaste',
      subtitle: 'Alimentos consumidos, eliminados y recetas preparadas',
      summary: [
        { label: 'Alimentos consumidos', value: String(stats.total_consumidos || 0) },
        { label: 'Alimentos eliminados', value: String(stats.total_eliminados || 0) },
        { label: 'Recetas cocinadas', value: String(stats.recetas_cocinadas || 0) },
        { label: 'Registros totales', value: String(stats.registros_historial || 0) }
      ],
      sections: [
        {
          heading: 'Alimentos consumidos o eliminados',
          columns: [
            { label: 'Fecha', width: 1.5 },
            { label: 'Alimento', width: 1.8 },
            { label: 'Cant.', width: 0.55, align: 'center' },
            { label: 'Motivo', width: 1.15 },
            { label: 'Categoría', width: 1.3 }
          ],
          rows: buildConsumedRows(consumos)
        },
        {
          heading: 'Recetas cocinadas',
          columns: [
            { label: 'Fecha', width: 1.4 },
            { label: 'Receta', width: 4.5 }
          ],
          rows: buildCookedRows(cocinados)
        }
      ]
    };
  }

  return {
    ...base,
    title: 'Reporte de estadísticas e impacto',
    subtitle: 'Resumen de ahorro, consumo y actividad en ZeroWaste',
    sections: [
      {
        heading: 'Tendencia de consumo (últimos 7 días)',
        columns: [
          { label: 'Día', width: 2.2 },
          { label: 'Alimentos consumidos', width: 1.5, align: 'center' },
          { label: 'Recetas cocinadas', width: 1.5, align: 'center' }
        ],
        rows: buildConsumptionTrendRows(stats)
      },
      {
        heading: 'Historial de alimentos consumidos',
        columns: [
          { label: 'Fecha', width: 1.5 },
          { label: 'Alimento', width: 1.8 },
          { label: 'Cant.', width: 0.55, align: 'center' },
          { label: 'Motivo', width: 1.15 },
          { label: 'Categoría', width: 1.3 }
        ],
        rows: buildConsumedRows(consumos)
      },
      {
        heading: 'Recetas cocinadas',
        columns: [
          { label: 'Fecha', width: 1.4 },
          { label: 'Receta', width: 4.5 }
        ],
        rows: buildCookedRows(cocinados)
      },
      {
        heading: 'Inventario actual',
        columns: [
          { label: 'Alimento', width: 1.7 },
          { label: 'Categoría', width: 1.25 },
          { label: 'Cant.', width: 0.6, align: 'center' },
          { label: 'Ubicación', width: 1.1 },
          { label: 'Vence', width: 0.95 },
          { label: 'Días', width: 0.8, align: 'center' }
        ],
        rows: buildInventoryRows(inventario)
      }
    ]
  };
}

function buildExcel (report) {
  const usedNames = new Set();

  const summaryRows = [
    { type: 'title', value: report.title },
    { type: 'subtitle', value: report.subtitle || '' },
    { type: 'meta', value: 'Generado: ' + formatDateTime(new Date()) },
    { type: 'meta', value: 'Usuario: ' + (report.usuario || '-') },
    { type: 'blank' },
    ...report.summary.map((item) => ({ type: 'summary', label: item.label, value: item.value }))
  ];

  const summarySheet = `
    <Worksheet ss:Name="${xmlEscape(sanitizeSheetName('Resumen', usedNames))}">
      <Table>
        <Column ss:AutoFitWidth="0" ss:Width="180"/>
        <Column ss:AutoFitWidth="0" ss:Width="340"/>
        ${summaryRows.map((row) => {
          if (row.type === 'blank') return '<Row><Cell><Data ss:Type="String"></Data></Cell></Row>';
          if (row.type === 'title') {
            return `<Row><Cell ss:StyleID="Title"><Data ss:Type="String">${xmlEscape(row.value)}</Data></Cell></Row>`;
          }
          if (row.type === 'subtitle') {
            return `<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">${xmlEscape(row.value)}</Data></Cell></Row>`;
          }
          if (row.type === 'meta') {
            return `<Row><Cell ss:StyleID="Meta"><Data ss:Type="String">${xmlEscape(row.value)}</Data></Cell></Row>`;
          }
          return `<Row>
            <Cell ss:StyleID="Label"><Data ss:Type="String">${xmlEscape(row.label)}</Data></Cell>
            <Cell><Data ss:Type="String">${xmlEscape(row.value)}</Data></Cell>
          </Row>`;
        }).join('')}
      </Table>
    </Worksheet>`;

  const sectionSheets = report.sections.map((section) => {
    const sheetName = sanitizeSheetName(section.heading, usedNames);
    const columnsXml = section.columns
      .map((col, index) => `<Column ss:AutoFitWidth="0" ss:Width="${index === 0 ? 190 : 130}"/>`)
      .join('');

    const headerXml = `<Row>${section.columns.map((col) => (
      `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(col.label)}</Data></Cell>`
    )).join('')}</Row>`;

    const rowsXml = (section.rows && section.rows.length > 0 ? section.rows : [['Sin registros']])
      .map((row) => {
        const cells = section.columns.map((col, index) => {
          const value = row[index];
          const isNumber = typeof value === 'number' && isFinite(value);
          return `<Cell${col.align === 'center' ? ' ss:StyleID="Center"' : ''}><Data ss:Type="${isNumber ? 'Number' : 'String'}">${xmlEscape(value)}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
      }).join('');

    return `
      <Worksheet ss:Name="${xmlEscape(sheetName)}">
        <Table>
          ${columnsXml}
          ${headerXml}
          ${rowsXml}
        </Table>
      </Worksheet>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="16" ss:Color="#1E7A46"/>
    </Style>
    <Style ss:ID="Subtitle">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#55665B"/>
    </Style>
    <Style ss:ID="Meta">
      <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#7A8A80"/>
    </Style>
    <Style ss:ID="Label">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="10" ss:Color="#1F2A24"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1E7A46" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Center">
      <Alignment ss:Horizontal="Center"/>
    </Style>
  </Styles>
  ${summarySheet}
  ${sectionSheets}
</Workbook>`;
}

async function buildReport (usuarioId, tipo) {
  const data = await fetchReportData(usuarioId);
  return buildReportDefinition(tipo, data);
}

async function buildPdfReport (usuarioId, tipo) {
  const report = await buildReport(usuarioId, tipo);
  return { report, buffer: buildPdf(report) };
}

async function buildExcelReport (usuarioId, tipo) {
  const report = await buildReport(usuarioId, tipo);
  return { report, buffer: Buffer.from(buildExcel(report), 'utf8') };
}

module.exports = {
  buildReport,
  buildPdfReport,
  buildExcelReport,
  buildExcel,
  MOTIVO_LABEL,
  CATEGORIA_LABEL
};
