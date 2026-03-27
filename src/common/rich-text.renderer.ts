import { parse, HTMLElement } from 'node-html-parser';

/**
 * Options for rendering a rich-text HTML block onto a pdfkit document.
 *
 * All fields are optional — omit them to use sensible defaults.
 */
export interface RichTextRenderOpts {
  /** Base font size in pt. Explicit font-size spans in the HTML override this. Default: 9 */
  fontSize?: number;
  /** Base pdfkit font name. Default: 'Helvetica' */
  font?: string;
  /** Base text colour (hex). Default: '#000000' */
  color?: string;
  /**
   * Inherited text alignment from a parent container.
   * The <p> node's own style="text-align:…" takes precedence over this.
   * Default: 'justify'
   */
  align?: 'left' | 'right' | 'center' | 'justify';
}

// ── Internal types ────────────────────────────────────────────────────────────

interface TextSegment {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  underline: boolean;
  strike: boolean;
}

type PdfAlign = 'left' | 'right' | 'center' | 'justify';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip editor artefacts and collapse all whitespace (including raw \n) to single spaces. */
export function cleanRichText(raw: string): string {
  return raw
    .replace(/\u200B/g, '')      // zero-width space
    .replace(/\u00A0/g, ' ')     // &nbsp;
    .replace(/[\r\n\t]+/g, ' ')  // raw newlines/tabs → space
    .replace(/\s{2,}/g, ' ')     // collapse multiple spaces
    .trim();
}

/** Convert CSS px to pdf pt (96 dpi screen → 72 dpi print). */
function pxToPt(px: number): number {
  return +(px * 0.75).toFixed(1);
}

/**
 * Parse a colour value from a CSS style string.
 * Handles both #hex and rgb(r,g,b) — execCommand('foreColor') may produce either
 * depending on whether styleWithCSS is active in the browser.
 */
function parseStyleColor(style: string, fallback: string): string {
  const hexM = style.match(/color\s*:\s*(#[0-9a-fA-F]{3,6})/i);
  if (hexM) return hexM[1];
  const rgbM = style.match(/color\s*:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbM) {
    const r = parseInt(rgbM[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbM[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbM[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return fallback;
}

/**
 * Resolve a pdfkit font name from a base font + bold/italic flags.
 * Works with Helvetica variants; extend as needed for custom fonts.
 */
function resolveFont(base: string, italic: boolean, bold: boolean): string {
  if (bold && italic) return 'Helvetica-BoldOblique';
  if (bold)           return 'Helvetica-Bold';
  if (italic)         return 'Helvetica-Oblique';
  return base;
}

/** Read text-align from a node's own style attribute. */
function getNodeAlign(node: HTMLElement, fallback: PdfAlign): PdfAlign {
  const s = node.getAttribute?.('style') || '';
  const m = s.match(/text-align\s*:\s*(left|right|center|justify)/i);
  return m ? (m[1] as PdfAlign) : fallback;
}

// ── Segment extraction ────────────────────────────────────────────────────────

/**
 * Walk a node's inline children and collect one TextSegment per formatting run.
 *
 * Handles both tag-based and CSS-based formatting, because execCommand output
 * varies depending on whether styleWithCSS is active in the browser:
 *
 *   bold          → <b> | <strong> | span[font-weight:bold/700]
 *   italic        → <i> | <em>     | span[font-style:italic]
 *   underline     → <u>            | span[text-decoration:underline]
 *   strikethrough → <s> | <strike> | span[text-decoration:line-through]
 *   colour        → <font color="…"> | span[color:#hex] | span[color:rgb(…)]
 *   font-size     → span[font-size:Npx]  (converted px→pt)
 */
function extractSegments(node: HTMLElement, opts: RichTextRenderOpts): TextSegment[] {
  const baseFont     = opts.font     ?? 'Helvetica';
  const baseFontSize = opts.fontSize ?? 9;
  const baseColor    = opts.color    ?? '#000000';
  const segs: TextSegment[] = [];

  function walk(
    nodes: HTMLElement[],
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strike: boolean,
    size: number,
    color: string,
  ) {
    for (const n of nodes) {
      const tag = (n as any).tagName?.toLowerCase();

      if (!tag) {
        const text = cleanRichText(n.text);
        if (text) {
          segs.push({ text, font: resolveFont(baseFont, italic, bold), fontSize: size, color, underline, strike });
        }
        continue;
      }

      if (tag === 'em' || tag === 'i') {
        walk(n.childNodes as HTMLElement[], bold, true, underline, strike, size, color);
      } else if (tag === 'strong' || tag === 'b') {
        walk(n.childNodes as HTMLElement[], true, italic, underline, strike, size, color);
      } else if (tag === 'u') {
        walk(n.childNodes as HTMLElement[], bold, italic, true, strike, size, color);
      } else if (tag === 's' || tag === 'strike') {
        walk(n.childNodes as HTMLElement[], bold, italic, underline, true, size, color);
      } else if (tag === 'font') {
        // <font color="…"> — execCommand('foreColor') without styleWithCSS
        const colorAttr = (n as HTMLElement).getAttribute?.('color') || '';
        walk(n.childNodes as HTMLElement[], bold, italic, underline, strike, size, colorAttr || color);
      } else if (tag === 'span') {
        const s = (n as HTMLElement).getAttribute?.('style') || '';
        const sizeM = s.match(/font-size\s*:\s*([\d.]+)px/i);
        walk(
          n.childNodes as HTMLElement[],
          bold      || /font-weight\s*:\s*(bold|700)/i.test(s),
          italic    || /font-style\s*:\s*italic/i.test(s),
          underline || /text-decoration[^;]*underline/i.test(s),
          strike    || /text-decoration[^;]*line-through/i.test(s),
          sizeM ? pxToPt(parseFloat(sizeM[1])) : size,
          parseStyleColor(s, color),
        );
      } else {
        walk(n.childNodes as HTMLElement[], bold, italic, underline, strike, size, color);
      }
    }
  }

  walk(node.childNodes as HTMLElement[], false, false, false, false, baseFontSize, baseColor);
  return segs;
}

// ── Block renderers ───────────────────────────────────────────────────────────

/** Default heading fallback sizes (pt) — only used when no explicit font-size span is present. */
const HEADING_SIZES: Record<string, number> = { h1: 13, h2: 11, h3: 10 };

function renderSegments(
  doc: PDFKit.PDFDocument,
  segs: TextSegment[],
  x: number,
  pageWidth: number,
  align: PdfAlign,
) {
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const isLast = i === segs.length - 1;
    const segAlign = (isLast ? align : undefined) as PdfAlign | undefined;
    doc.fontSize(seg.fontSize).font(seg.font).fillColor(seg.color);

    if (i === 0) {
      doc.text(seg.text, x, doc.y, {
        width: pageWidth,
        align: segAlign,
        continued: !isLast,
        underline: seg.underline,
        strike: seg.strike,
      });
    } else {
      doc.text(seg.text, {
        align: segAlign,
        continued: !isLast,
        underline: seg.underline,
        strike: seg.strike,
      });
    }
  }
}

function renderHeadingNode(
  doc: PDFKit.PDFDocument,
  node: HTMLElement,
  x: number,
  pageWidth: number,
  tag: string,
  headingColor = '#1C242F',
) {
  // Headings are bold by default; user-set font sizes inside override HEADING_SIZES
  const segs = extractSegments(node, {
    font: 'Helvetica-Bold',
    fontSize: HEADING_SIZES[tag] ?? 10,
    color: headingColor,
  });
  if (segs.length === 0) return;

  doc.moveDown(0.3);
  renderSegments(doc, segs, x, pageWidth, getNodeAlign(node, 'left'));
  doc.moveDown(0.05);
  // Reset to default body style so subsequent text is not affected
  doc.fontSize(9).font('Helvetica').fillColor('#000000');
}

function renderParagraphNode(
  doc: PDFKit.PDFDocument,
  node: HTMLElement,
  x: number,
  pageWidth: number,
  opts: RichTextRenderOpts,
) {
  const segs = extractSegments(node, opts);
  if (segs.length === 0) return;

  renderSegments(doc, segs, x, pageWidth, getNodeAlign(node, opts.align ?? 'justify'));
  doc.moveDown(0.3);
}

function renderListNode(
  doc: PDFKit.PDFDocument,
  node: HTMLElement,
  x: number,
  pageWidth: number,
  ordered: boolean,
  opts: RichTextRenderOpts,
) {
  const items = node.querySelectorAll('li');
  const indent = 14;

  items.forEach((li, i) => {
    const segs = extractSegments(li as HTMLElement, opts);
    if (segs.length === 0) return;

    const prefix = ordered ? `${i + 1}.  ` : '–  ';
    const prefixSeg: TextSegment = {
      text: prefix,
      font: opts.font ?? 'Helvetica',
      fontSize: opts.fontSize ?? 9,
      color: opts.color ?? '#000000',
      underline: false,
      strike: false,
    };

    renderSegments(doc, [prefixSeg, ...segs], x + indent, pageWidth - indent, 'justify');
    doc.moveDown(0.15);
  });

  doc.moveDown(0.2);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render a rich-text HTML string (from the VMS rich text editor) onto a
 * pdfkit document at the given x position and width.
 *
 * Supported HTML structures:
 *   <h1> / <h2> / <h3>   — section headings (bold, user font-size respected)
 *   <p>                  — paragraph (all inline formatting preserved)
 *   <ul> / <ol>          — bullet / numbered lists
 *   <b> / <strong>       — bold (tag or span style)
 *   <i> / <em>           — italic (tag or span style)
 *   <u>                  — underline
 *   <s> / <strike>       — strikethrough
 *   <font color="…">     — colour (execCommand without styleWithCSS)
 *   span[style]          — font-size (px→pt), colour (hex/rgb), bold, italic,
 *                          underline, strikethrough via inline styles
 *   text-align on <p> or parent <div>  — left / center / right / justify
 *
 * @param doc       A pdfkit PDFDocument instance
 * @param html      Raw HTML from the rich text editor
 * @param x         Left edge x position (pt)
 * @param pageWidth Text block width (pt)
 * @param opts      Optional base styling overrides
 */
export function renderRichText(
  doc: PDFKit.PDFDocument,
  html: string,
  x: number,
  pageWidth: number,
  opts: RichTextRenderOpts = {},
): void {
  if (!html?.trim()) return;

  const root = parse(html);

  function walk(nodes: HTMLElement[], bold = false, italic = false, wOpts: RichTextRenderOpts = opts) {
    for (const node of nodes) {
      const tag = (node as any).tagName?.toLowerCase();

      if (!tag) {
        // Bare text node outside any block element
        const text = cleanRichText(node.text);
        if (text) {
          doc
            .fontSize(wOpts.fontSize ?? 9)
            .font(resolveFont(wOpts.font ?? 'Helvetica', italic, bold))
            .fillColor(wOpts.color ?? '#000000')
            .text(text, x, doc.y, { width: pageWidth, align: wOpts.align ?? 'justify' });
        }
        continue;
      }

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        renderHeadingNode(doc, node as HTMLElement, x, pageWidth, tag);
      } else if (tag === 'p') {
        renderParagraphNode(doc, node as HTMLElement, x, pageWidth, wOpts);
      } else if (tag === 'ul') {
        renderListNode(doc, node as HTMLElement, x, pageWidth, false, wOpts);
      } else if (tag === 'ol') {
        renderListNode(doc, node as HTMLElement, x, pageWidth, true, wOpts);
      } else if (tag === 'br') {
        doc.moveDown(0.3);
      } else if (tag === 'em' || tag === 'i') {
        walk(node.childNodes as HTMLElement[], bold, true, wOpts);
      } else if (tag === 'strong' || tag === 'b') {
        walk(node.childNodes as HTMLElement[], true, italic, wOpts);
      } else if (tag === 'span') {
        const s = (node as HTMLElement).getAttribute?.('style') || '';
        walk(
          node.childNodes as HTMLElement[],
          bold   || /font-weight\s*:\s*(bold|700)/i.test(s),
          italic || /font-style\s*:\s*italic/i.test(s),
          wOpts,
        );
      } else {
        // div, section, blockquote, etc. — recurse; propagate text-align if present
        const s = (node as HTMLElement).getAttribute?.('style') || '';
        const alignM = s.match(/text-align\s*:\s*(left|right|center|justify)/i);
        walk(
          node.childNodes as HTMLElement[],
          bold,
          italic,
          alignM ? { ...wOpts, align: alignM[1] as PdfAlign } : wOpts,
        );
      }
    }
  }

  walk(root.childNodes as HTMLElement[]);
}
