export type ReportSummary = Array<[label: string, value: string | number]>;

type ReportOptions = {
  title: string;
  companyName: string;
  siteName: string;
  headers: string[];
  rows: string[][];
  filters?: string[];
  summary?: ReportSummary;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 38;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 30;
const BODY_FONT = 7.5;
const LINE_HEIGHT = 9;

export function downloadTablePdf(
  title: string,
  companyName: string,
  siteName: string,
  headers: string[],
  rows: string[][],
  filters: string[] = [],
  summary: ReportSummary = [],
) {
  const pdf = buildTablePdf({
    title,
    companyName,
    siteName,
    headers,
    rows,
    filters,
    summary,
  });
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildTablePdf(options: ReportOptions) {
  const widths = columnWidths(options.headers);
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = 0;

  const startPage = (first: boolean) => {
    if (commands.length) pages.push(commands);
    commands = [];
    drawPageHeader(
      commands,
      options.title,
      options.companyName,
      options.siteName,
      first ? (options.filters ?? []) : [],
    );
    y = 684;
    if (first && options.summary?.length) {
      y = drawSummary(commands, options.summary, y);
    }
    y -= 10;
    drawTableHeader(commands, options.headers, widths, y);
    y -= 27;
  };

  startPage(true);
  if (!options.rows.length) {
    drawText(
      commands,
      "No records match the selected report filters.",
      MARGIN + 8,
      y - 18,
      9,
      "F1",
      "0.35 0.38 0.37",
    );
  }
  options.rows.forEach((row, rowIndex) => {
    const wrapped = options.headers.map((_, index) =>
      wrapText(
        statusLabel(row[index] ?? "") ?? row[index] ?? "",
        widths[index] - 10,
        BODY_FONT,
      ),
    );
    const rowHeight = Math.max(
      28,
      Math.max(...wrapped.map((lines) => lines.length)) * LINE_HEIGHT + 12,
    );
    if (y - rowHeight < FOOTER_Y + 24) startPage(false);
    drawTableRow(commands, wrapped, widths, y, rowIndex % 2 === 1);
    y -= rowHeight;
  });
  pages.push(commands);
  pages.forEach((page, index) =>
    drawFooter(page, options.companyName, index + 1, pages.length),
  );
  return encodePdf(pages);
}

function drawPageHeader(
  commands: string[],
  title: string,
  companyName: string,
  siteName: string,
  filters: string[],
) {
  commands.push(
    "0.08 0.36 0.25 rg",
    `0 ${PAGE_HEIGHT - 82} ${PAGE_WIDTH} 82 re f`,
  );
  drawText(
    commands,
    companyName.toUpperCase(),
    MARGIN,
    800,
    11,
    "F2",
    "1 1 1",
    1.3,
  );
  drawText(commands, "Asset Management Report", MARGIN, 778, 19, "F2", "1 1 1");
  drawText(
    commands,
    title.replace(/ Report$/i, ""),
    MARGIN,
    738,
    15,
    "F2",
    "0.08 0.19 0.15",
  );
  drawText(
    commands,
    `Site: ${siteName}`,
    MARGIN,
    718,
    9,
    "F1",
    "0.25 0.29 0.27",
  );
  drawText(
    commands,
    `Generated: ${new Date().toLocaleString("en-AU")}`,
    320,
    718,
    9,
    "F1",
    "0.25 0.29 0.27",
  );
  if (filters.length)
    drawText(
      commands,
      `Reporting Period / Filters: ${filters.join(" | ")}`,
      MARGIN,
      700,
      8,
      "F1",
      "0.25 0.29 0.27",
    );
  commands.push(
    "0.75 0.79 0.77 RG",
    `${MARGIN} 692 m ${PAGE_WIDTH - MARGIN} 692 l S`,
  );
}

function drawSummary(commands: string[], summary: ReportSummary, top: number) {
  drawText(commands, "SUMMARY", MARGIN, top, 8, "F2", "0.08 0.36 0.25", 1);
  const gap = 7;
  const width = (TABLE_WIDTH - gap * (summary.length - 1)) / summary.length;
  summary.forEach(([label, value], index) => {
    const x = MARGIN + index * (width + gap);
    commands.push(
      "0.95 0.97 0.96 rg",
      `${x} ${top - 48} ${width} 38 re f`,
      "0.82 0.86 0.84 RG",
      `${x} ${top - 48} ${width} 38 re S`,
    );
    drawText(
      commands,
      String(value),
      x + 7,
      top - 26,
      13,
      "F2",
      "0.08 0.36 0.25",
    );
    drawText(
      commands,
      label.toUpperCase(),
      x + 7,
      top - 40,
      6.2,
      "F2",
      "0.35 0.39 0.37",
    );
  });
  return top - 54;
}

function drawTableHeader(
  commands: string[],
  headers: string[],
  widths: number[],
  top: number,
) {
  let x = MARGIN;
  headers.forEach((header, index) => {
    commands.push(
      "0.86 0.91 0.88 rg",
      `${x} ${top - 27} ${widths[index]} 27 re f`,
      "0.52 0.60 0.56 RG",
      `${x} ${top - 27} ${widths[index]} 27 re S`,
    );
    drawText(
      commands,
      header.toUpperCase(),
      x + 5,
      top - 17,
      6.4,
      "F2",
      "0.08 0.25 0.18",
    );
    x += widths[index];
  });
}

function drawTableRow(
  commands: string[],
  cells: string[][],
  widths: number[],
  top: number,
  alternate: boolean,
) {
  const height = Math.max(
    28,
    Math.max(...cells.map((lines) => lines.length)) * LINE_HEIGHT + 12,
  );
  let x = MARGIN;
  cells.forEach((lines, index) => {
    if (alternate)
      commands.push(
        "0.975 0.98 0.978 rg",
        `${x} ${top - height} ${widths[index]} ${height} re f`,
      );
    commands.push(
      "0.72 0.76 0.74 RG",
      `${x} ${top - height} ${widths[index]} ${height} re S`,
    );
    const status = (lines[0] ?? "").startsWith("[");
    lines.forEach((line, lineIndex) =>
      drawText(
        commands,
        line,
        x + 5,
        top - 12 - lineIndex * LINE_HEIGHT,
        BODY_FONT,
        status ? "F2" : "F1",
        status ? "0.08 0.36 0.25" : "0.16 0.18 0.17",
      ),
    );
    x += widths[index];
  });
}

function statusLabel(value: string) {
  const normalized = value.trim().replaceAll("_", " ").toUpperCase();
  const display =
    normalized === "REQUIRES FOLLOW UP" ? "REQUIRES FOLLOW-UP" : normalized;
  return /^(PASS|FAIL|REQUIRES ACTION|ACTIVE|OUT OF SERVICE|DISPOSED|ARCHIVED|COMPLETED|REQUIRES FOLLOW-UP)$/.test(
    display,
  )
    ? `[${display}]`
    : undefined;
}

function drawFooter(
  commands: string[],
  companyName: string,
  page: number,
  total: number,
) {
  commands.push(
    "0.78 0.81 0.79 RG",
    `${MARGIN} 48 m ${PAGE_WIDTH - MARGIN} 48 l S`,
  );
  drawText(
    commands,
    `${companyName.toUpperCase()} - OPERATIONAL / COMPLIANCE REPORT`,
    MARGIN,
    FOOTER_Y,
    6.5,
    "F1",
    "0.4 0.43 0.42",
  );
  drawText(
    commands,
    `Page ${page} of ${total}`,
    PAGE_WIDTH - MARGIN - 56,
    FOOTER_Y,
    7,
    "F2",
    "0.25 0.29 0.27",
  );
}

function drawText(
  commands: string[],
  text: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  colour: string,
  spacing = 0,
) {
  commands.push(
    `${colour} rg`,
    `BT /${font} ${size} Tf ${spacing} Tc ${x} ${y} Td (${escapePdf(text)}) Tj ET`,
  );
}

function wrapText(value: string, width: number, fontSize: number) {
  const text = sanitise(value || "-");
  const max = Math.max(3, Math.floor(width / (fontSize * 0.5)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const chunks =
      word.length > max
        ? (word.match(new RegExp(`.{1,${max}}`, "g")) ?? [word])
        : [word];
    chunks.forEach((chunk) => {
      if (!line) line = chunk;
      else if (`${line} ${chunk}`.length <= max) line += ` ${chunk}`;
      else {
        lines.push(line);
        line = chunk;
      }
    });
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
}

function columnWidths(headers: string[]) {
  const known: Record<number, number[]> = {
    7: [98, 62, 66, 92, 76, 76, 49],
    9: [68, 54, 52, 43, 92, 58, 42, 58, 52],
  };
  const widths =
    known[headers.length] ??
    Array(headers.length).fill(TABLE_WIDTH / headers.length);
  const scale = TABLE_WIDTH / widths.reduce((sum, width) => sum + width, 0);
  return widths.map((width) => width * scale);
}

function encodePdf(pages: string[][]) {
  const objects: string[] = [];
  const add = (value: string) => (objects.push(value), objects.length);
  const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  pages.forEach((commands) => {
    const stream = commands.join("\n");
    contentIds.push(
      add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
    );
    pageIds.push(add(""));
  });
  const pagesId = objects.length + 1;
  add(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
  );
  pageIds.forEach((id, index) => {
    objects[id - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
  });
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer << /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function sanitise(value: string) {
  return value.replaceAll(/[–—]/g, "-").replaceAll(/[^\x20-\x7E]/g, "-");
}
function escapePdf(value: string) {
  return sanitise(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}
