/* =============================================
   ZeroWaste – Generador de PDF sin dependencias
   Archivo: backend/services/pdf.service.js
   Construye reportes con texto, tablas y paginación.
   ============================================= */
'use strict';

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - (MARGIN * 2);

const COLORS = {
  primary: [30, 122, 70],
  primaryDark: [20, 86, 49],
  accent: [47, 158, 91],
  text: [31, 42, 36],
  muted: [85, 102, 91],
  line: [218, 228, 221],
  soft: [230, 244, 234],
  rowAlt: [248, 250, 248],
  white: [255, 255, 255]
};

function colorCommand (color, stroke) {
  return `${(color[0] / 255).toFixed(3)} ${(color[1] / 255).toFixed(3)} ${(color[2] / 255).toFixed(3)} ${stroke ? 'RG' : 'rg'}`;
}

function normalizeText (value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x00-\xFF]/g, '?');
}

function escapePdf (value) {
  return normalizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function estimateWidth (text, size) {
  return String(text || '').length * size * 0.52;
}

function truncate (text, maxChars) {
  const value = String(text === null || text === undefined ? '' : text);
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(1, maxChars - 1)) + '…';
}

function formatDate (value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

class ReportPdf {
  constructor (report) {
    this.report = report;
    this.pages = [];
    this.current = [];
    this.y = PAGE_H - 112;
    this.newPage();
  }

  newPage () {
    if (this.current.length > 0) {
      this.drawFooter();
      this.pages.push(this.current.join('\n'));
    }
    this.current = [];
    this.drawHeader();
  }

  drawHeader () {
    const isContinuation = this.pages.length > 0;
    this.rect(0, PAGE_H - 88, PAGE_W, 88, COLORS.primary);
    this.rect(0, PAGE_H - 92, PAGE_W, 4, COLORS.accent);

    this.text(isContinuation ? this.report.title + ' (continuación)' : this.report.title, MARGIN, PAGE_H - 42, 19, 'F2', COLORS.white);
    this.text(this.report.subtitle || 'Reporte generado por ZeroWaste', MARGIN, PAGE_H - 62, 9.5, 'F1', [210, 235, 220]);

    const generated = 'Generado: ' + formatDate(new Date());
    this.text(generated, PAGE_W - MARGIN - 150, PAGE_H - 62, 8, 'F1', [210, 235, 220]);

    if (this.report.usuario) {
      this.text(this.report.usuario, PAGE_W - MARGIN - 200, PAGE_H - 42, 9, 'F2', COLORS.white);
    }

    this.y = PAGE_H - 112;
  }

  drawFooter () {
    const pageNumber = this.pages.length + 1;
    this.line(MARGIN, 34, PAGE_W - MARGIN, 34, COLORS.line, 0.6);
    this.text('ZeroWaste · Reporte generado automáticamente', MARGIN, 22, 7.5, 'F1', COLORS.muted);
    this.text('Página ' + pageNumber, PAGE_W - MARGIN - 40, 22, 7.5, 'F1', COLORS.muted);
  }

  ensureSpace (height) {
    if (this.y - height < 58) this.newPage();
  }

  rect (x, y, w, h, color) {
    this.current.push(`q ${colorCommand(color)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q`);
  }

  line (x1, y1, x2, y2, color, width) {
    this.current.push(
      `q ${colorCommand(color, true)} ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`
    );
  }

  text (value, x, y, size, font, color, align, width) {
    const safe = normalizeText(value);
    let drawX = x;
    if (align === 'right' && width) drawX = x + width - estimateWidth(safe, size);
    if (align === 'center' && width) drawX = x + (width - estimateWidth(safe, size)) / 2;

    this.current.push(
      `BT ${colorCommand(color)} /${font} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(safe)}) Tj ET`
    );
  }

  addSummary (items) {
    if (!Array.isArray(items) || items.length === 0) return;

    this.ensureSpace(70);
    const gap = 8;
    const colW = (CONTENT_W - gap) / 2;

    for (let i = 0; i < items.length; i += 2) {
      this.ensureSpace(46);
      const rowY = this.y - 36;

      for (let col = 0; col < 2; col++) {
        const item = items[i + col];
        if (!item) continue;
        const x = MARGIN + col * (colW + gap);
        this.rect(x, rowY, colW, 34, COLORS.rowAlt);
        this.rect(x, rowY, 3, 34, COLORS.primary);
        this.text(item.label, x + 10, rowY + 21, 7.5, 'F1', COLORS.muted);
        this.text(item.value, x + 10, rowY + 8, 11, 'F2', COLORS.text);
      }
      this.y -= 42;
    }
    this.y -= 4;
  }

  addSection (title) {
    this.ensureSpace(40);
    this.y -= 6;
    this.text(title, MARGIN, this.y, 12.5, 'F2', COLORS.primaryDark);
    this.y -= 7;
    this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, COLORS.line, 0.8);
    this.y -= 14;
  }

  addTable (columns, rows) {
    if (!Array.isArray(columns) || columns.length === 0) return;

    const safeRows = Array.isArray(rows) && rows.length > 0
      ? rows
      : [columns.map((_, index) => (index === 0 ? 'Sin registros' : ''))];

    const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
    const widths = columns.map((col) => ((col.width || 1) / totalWeight) * CONTENT_W);
    const rowHeight = 18;

    const drawHeaderRow = () => {
      this.ensureSpace(rowHeight + 4);
      const y = this.y - rowHeight;
      this.rect(MARGIN, y, CONTENT_W, rowHeight, COLORS.soft);
      let x = MARGIN;
      columns.forEach((col, index) => {
        const maxChars = Math.max(4, Math.floor((widths[index] - 8) / 4.4));
        this.text(truncate(col.label, maxChars), x + 4, y + 5.5, 7.8, 'F2', COLORS.primaryDark);
        x += widths[index];
      });
      this.y -= rowHeight;
    };

    drawHeaderRow();

    safeRows.forEach((row, rowIndex) => {
      if (this.y - rowHeight < 58) {
        this.newPage();
        drawHeaderRow();
      }

      const y = this.y - rowHeight;
      if (rowIndex % 2 === 1) {
        this.rect(MARGIN, y, CONTENT_W, rowHeight, COLORS.rowAlt);
      }
      this.line(MARGIN, y, PAGE_W - MARGIN, y, COLORS.line, 0.35);

      let x = MARGIN;
      columns.forEach((col, colIndex) => {
        const rawValue = row[colIndex];
        const padding = 4;
        const maxChars = Math.max(4, Math.floor((widths[colIndex] - padding * 2) / 4.1));
        const value = truncate(rawValue === null || rawValue === undefined ? '-' : rawValue, maxChars);
        const align = col.align || 'left';
        this.text(
          value,
          x + padding,
          y + 5.5,
          7.6,
          'F1',
          COLORS.text,
          align,
          widths[colIndex] - padding * 2
        );
        x += widths[colIndex];
      });

      this.y -= rowHeight;
    });

    this.y -= 8;
  }

  finish () {
    if (this.current.length > 0) {
      this.drawFooter();
      this.pages.push(this.current.join('\n'));
    }
    return this.pages;
  }
}

function assemblePdf (pages, report) {
  const objects = [];
  const pageObjects = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  let nextId = 5;
  pages.forEach((content) => {
    const contentId = nextId++;
    const pageId = nextId++;
    const streamLength = Buffer.byteLength(content, 'latin1');

    objects[contentId] = `<< /Length ${streamLength} >>\nstream\n${content}\nendstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    pageObjects.push(`${pageId} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjects.join(' ')}] /Count ${pages.length} >>`;

  // Si el documento está vacío, generar al menos una página válida.
  if (pages.length === 0) {
    objects[5] = '<< /Length 0 >>\nstream\n\nendstream';
    objects[6] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 5 0 R >>`;
    objects[2] = '<< /Type /Pages /Kids [6 0 R] /Count 1 >>';
  }

  const maxId = objects.length - 1;
  let pdf = '%PDF-1.4\n';
  const offsets = new Array(maxId + 1).fill(0);

  for (let id = 1; id <= maxId; id++) {
    if (!objects[id]) continue;
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= maxId; id++) {
    pdf += `${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

function buildPdf (report) {
  const doc = new ReportPdf(report);

  if (report.summary && report.summary.length > 0) {
    doc.addSummary(report.summary);
  }

  (report.sections || []).forEach((section) => {
    doc.addSection(section.heading);
    if (section.note) {
      doc.text(section.note, MARGIN, doc.y, 8, 'F1', COLORS.muted);
      doc.y -= 14;
    }
    doc.addTable(section.columns, section.rows);
  });

  return assemblePdf(doc.finish(), report);
}

module.exports = { buildPdf };
