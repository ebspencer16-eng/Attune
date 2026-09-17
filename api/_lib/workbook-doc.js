/**
 * The workbook's own document, as something a PDF can be made of.
 *
 * ── WHY IT CONVERTS RATHER THAN RE-RENDERS ────────────────────────────────
 * Ellie: "I just want the PDF to be viewable through the app. People can
 * download and print or they can zoom in."
 *
 * The workbook is built as a Word document by api/generate-workbook.js, two
 * and a half thousand lines of layout. Writing a second renderer that lays the
 * same content out as a PDF would be two documents to keep in step by hand,
 * and the first couple whose PDF said something different would never know
 * which one was right.
 *
 * So the real document is converted: docx to HTML by mammoth, HTML to a
 * pdfmake definition here. What a reader sees is what was generated.
 *
 * ── WHAT SURVIVES AND WHAT DOES NOT ───────────────────────────────────────
 * Headings, paragraphs, bold, lists and tables survive. Colour, gradient bars
 * and the page furniture do not: docx carries those as run properties and
 * tables of empty coloured cells, and none of it is in the HTML a converter
 * produces. This is the document's words and structure, set in the product's
 * own faces, not a facsimile of the Word file.
 */

import { Parser } from 'htmlparser2';

/** Rules and gradient bars are tables of empty cells. They are decoration. */
const hasWords = (node) => {
  if (!node) return false;
  if (typeof node === 'string') return node.trim().length > 0;
  if (Array.isArray(node)) return node.some(hasWords);
  if (node.text != null) return hasWords(node.text);
  // A table cell is a stack of nodes. Missing this read every table as empty,
  // which dropped the real ones along with the decorative ones.
  if (node.stack) return hasWords(node.stack);
  if (node.table) return node.table.body.some((row) => row.some(hasWords));
  if (node.ul) return node.ul.some(hasWords);
  if (node.ol) return node.ol.some(hasWords);
  return false;
};

/** Which style a heading level uses. */
const HEADING_STYLE = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4' };

/**
 * Turn the converted HTML into pdfmake content.
 *
 * Written as a small stack machine rather than with a DOM, because the only
 * shapes that appear are the ones mammoth emits: headings, paragraphs, lists,
 * tables, and bold or italic runs inside them.
 *
 * @param {string} html
 * @returns {Array} pdfmake content
 */
export function htmlToPdfContent(html) {
  const content = [];
  // Where new nodes are being appended. The top of this is always the thing
  // currently being filled: the page, a list, a table cell.
  const sinks = [content];
  const sink = () => sinks[sinks.length - 1];

  // The paragraph being built, and the marks that apply to the next text.
  let runs = null;
  let style = null;
  let bold = 0;
  let italic = 0;

  // Tables, which can nest inside cells.
  const tables = [];

  const flush = () => {
    if (!runs) return;
    /**
     * ── THE DOCUMENT'S OTHER HEADINGS ────────────────────────────────────
     * Fourteen of the workbook's headings are real Word headings; the rest are
     * big bold runs in ordinary paragraphs, which is fine in Word and arrives
     * here as a paragraph whose every run is bold. Treating that shape as a
     * heading gives those lines their weight back without a mapping table of
     * which strings are titles. A bold phrase inside a sentence is not this
     * shape, because the rest of the sentence is not bold.
     */
    const allBold = runs.length > 0
      && runs.every((r) => typeof r === 'object' && r.bold && String(r.text || '').trim());
    const node = { text: runs, style: style || (allBold ? 'h3' : undefined) };
    if (hasWords(node)) sink().push(node);
    runs = null;
    style = null;
  };

  const parser = new Parser({
    onopentag(name) {
      if (HEADING_STYLE[name]) { flush(); runs = []; style = HEADING_STYLE[name]; return; }
      if (name === 'p') { flush(); runs = []; return; }
      if (name === 'br') { if (runs) runs.push('\n'); return; }
      if (name === 'strong' || name === 'b') { bold += 1; return; }
      if (name === 'em' || name === 'i') { italic += 1; return; }
      if (name === 'ul' || name === 'ol') {
        flush();
        const list = { [name]: [], style: 'list' };
        sink().push(list);
        sinks.push(list[name]);
        return;
      }
      if (name === 'li') { flush(); runs = []; return; }
      if (name === 'table') {
        flush();
        const table = { rows: [], cell: null };
        tables.push(table);
        return;
      }
      if (name === 'tr') { const t = tables[tables.length - 1]; if (t) t.rows.push([]); return; }
      if (name === 'td' || name === 'th') {
        const t = tables[tables.length - 1];
        if (!t) return;
        flush();
        const cell = [];
        t.rows[t.rows.length - 1].push(cell);
        sinks.push(cell);
        return;
      }
    },

    ontext(text) {
      if (!runs) {
        // Text outside a paragraph, which mammoth produces inside table cells.
        if (!text.trim()) return;
        runs = [];
      }
      runs.push({ text, bold: bold > 0, italics: italic > 0 });
    },

    onclosetag(name) {
      if (HEADING_STYLE[name] || name === 'p' || name === 'li') { flush(); return; }
      if (name === 'strong' || name === 'b') { bold = Math.max(0, bold - 1); return; }
      if (name === 'em' || name === 'i') { italic = Math.max(0, italic - 1); return; }
      if (name === 'ul' || name === 'ol') { flush(); sinks.pop(); return; }
      if (name === 'td' || name === 'th') { flush(); sinks.pop(); return; }
      if (name === 'table') {
        flush();
        const t = tables.pop();
        if (!t) return;
        const body = t.rows.filter((row) => row.length);
        if (!body.length) return;
        // Every row has to have the same number of cells or pdfmake throws.
        const width = Math.max(...body.map((row) => row.length));
        const square = body.map((row) => {
          const cells = row.map((cell) => (cell.length ? { stack: cell } : { text: '' }));
          while (cells.length < width) cells.push({ text: '' });
          return cells;
        });
        const node = {
          table: { headerRows: 0, widths: Array.from({ length: width }, () => '*'), body: square },
          layout: 'attune',
          style: 'table',
        };
        // A table of empty cells was a rule or a gradient bar in Word.
        if (hasWords(node)) sink().push(node);
      }
    },
  }, { decodeEntities: true });

  parser.write(html);
  parser.end();
  flush();
  return content;
}

/** The document, ready for pdfmake. */
export function workbookDocDefinition(html, { title = 'Attune workbook' } = {}) {
  return {
    info: { title, author: 'Attune Relationships' },
    pageSize: 'LETTER',
    pageMargins: [56, 64, 56, 64],
    content: htmlToPdfContent(html),
    defaultStyle: { font: 'DMSans', fontSize: 10.5, lineHeight: 1.45, color: '#1E1610' },
    styles: {
      h1: { font: 'Playfair', fontSize: 22, bold: true, margin: [0, 18, 0, 8], color: '#1E1610' },
      h2: { font: 'Playfair', fontSize: 16, bold: true, margin: [0, 16, 0, 6], color: '#1E1610' },
      h3: { font: 'DMSans', fontSize: 12, bold: true, margin: [0, 12, 0, 4], color: '#1E1610' },
      h4: { font: 'DMSans', fontSize: 11, bold: true, margin: [0, 10, 0, 3], color: '#8C7A68' },
      list: { margin: [0, 0, 0, 8] },
      table: { margin: [0, 6, 0, 12], fontSize: 9.5 },
    },
    // Page numbers, because it is a document someone may print.
    footer: (current, total) => ({
      text: `${current} of ${total}`,
      alignment: 'center',
      fontSize: 8,
      color: '#8C7A68',
      margin: [0, 16, 0, 0],
    }),
  };
}

/** A quiet table rule, in the product's stone. */
export const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#E8DDD0',
  vLineColor: () => '#E8DDD0',
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 7,
  paddingRight: () => 7,
};
