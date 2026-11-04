/* =============================================
   ZeroWaste – Reportes Controller
   Archivo: backend/controllers/reportes.controller.js
   ============================================= */
'use strict';

const ReportService = require('../services/report.service');

const TIPOS_VALIDOS = ['estadisticas', 'inventario', 'historial'];

function fechaArchivo () {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/reportes/:tipo?formato=pdf|excel
exports.descargarReporte = async (req, res) => {
  try {
    const tipo = TIPOS_VALIDOS.includes(req.params.tipo) ? req.params.tipo : 'estadisticas';
    const formato = String(req.query.formato || 'pdf').toLowerCase() === 'excel' ? 'excel' : 'pdf';

    let result;
    if (formato === 'excel') {
      result = await ReportService.buildExcelReport(req.usuario.id, tipo);
    } else {
      result = await ReportService.buildPdfReport(req.usuario.id, tipo);
    }

    const extension = formato === 'excel' ? 'xls' : 'pdf';
    const mime = formato === 'excel'
      ? 'application/vnd.ms-excel; charset=utf-8'
      : 'application/pdf';
    const tipoNombre = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const filename = `ZeroWaste_${tipoNombre}_${fechaArchivo()}.${extension}`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(result.buffer);
  } catch (err) {
    console.error('Error en descargarReporte:', err);
    res.status(500).json({ success: false, message: 'No se pudo generar el reporte', error: err.message });
  }
};
