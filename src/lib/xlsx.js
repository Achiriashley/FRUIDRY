import { deflateRawSync } from "node:zlib";

// Writes a small Excel file (.xlsx) without a library: one or more sheets of text,
// numbers and dates. Rows are arrays of cells (strings, numbers, { date: "2026-10-12" },
// or empty); { bold, cells } makes a row bold. The first row of each sheet is bold,
// numbers get thousands separators, dates are real dates (so they sort and filter), and
// columns are sized to fit. Text is never read as a formula.

// ---------- Zip container (an .xlsx file is a zip of XML files) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_DATE_1980 = 0x21; // 1 January 1980: zip dates are required, not meaningful here

function zip(files) {
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const { name, data } of files) {
    const fileName = Buffer.from(name, "utf8");
    const packed = deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // file names are UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_DATE_1980, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(fileName.length, 26);
    parts.push(local, fileName, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_DATE_1980, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(fileName.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, fileName);

    offset += local.length + fileName.length + packed.length;
  }
  const centralDirectory = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralDirectory, end]);
}

// ---------- Spreadsheet XML ----------

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELS = "http://schemas.openxmlformats.org/package/2006/relationships";
const TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml";

// Text safe inside XML: escaped, without the control characters XML doesn't allow.
// "_x0041_" is how Excel writes special characters, so a typed one is escaped too.
function xmlText(value) {
  return String(value)
    .replace(/_(x[0-9A-Fa-f]{4}_)/g, "_x005F_$1")
    .replace(/[^\x09\x0a\x0d\x20-퟿-�\u{10000}-\u{10ffff}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 0 -> "A", 25 -> "Z", 26 -> "AA"
function columnName(index) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

// Cell styles (see styles.xml below).
const STYLE = { text: 0, boldText: 1, number: 2, boldNumber: 3, date: 4 };

// Excel stores a date as the number of days since 30 December 1899.
const DAY_MS = 86_400_000;
function excelDate(text) {
  const [year, month, day] = String(text).split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  return Number.isFinite(time) ? (time - Date.UTC(1899, 11, 30)) / DAY_MS : null;
}
const isDate = (value) => value !== null && typeof value === "object" && "date" in value;

function cellXml(value, ref, bold) {
  if (value === null || value === undefined || value === "") return "";
  if (isDate(value)) {
    const serial = excelDate(value.date);
    if (serial === null) return "";
    return `<c r="${ref}" s="${STYLE.date}"><v>${serial}</v></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${bold ? STYLE.boldNumber : STYLE.number}"><v>${value}</v></c>`;
  }
  const style = bold ? ` s="${STYLE.boldText}"` : "";
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

function sheetXml(rows) {
  const normalized = rows.map((row, i) =>
    Array.isArray(row) ? { cells: row, bold: i === 0 } : { cells: row.cells, bold: row.bold },
  );
  const widths = [];
  for (const { cells } of normalized) {
    cells.forEach((value, i) => {
      const length = isDate(value)
        ? 10
        : typeof value === "number"
          ? value.toLocaleString("en").length
          : String(value ?? "").length;
      widths[i] = Math.min(60, Math.max(widths[i] ?? 8, length + 2));
    });
  }
  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const body = normalized
    .map(({ cells, bold }, r) => {
      const xml = cells
        .map((value, c) => cellXml(value, `${columnName(c)}${r + 1}`, bold))
        .join("");
      return `<row r="${r + 1}">${xml}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="${MAIN}">${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${body}</sheetData></worksheet>`
  );
}

const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="${MAIN}">` +
  `<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/>` +
  `<numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="5">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

// Excel refuses sheet names over 31 characters or with []:*?/\ in them.
const sheetName = (name) =>
  String(name)
    .replace(/[[\]:*?/\\]/g, " ")
    .slice(0, 31) || "Sheet";

// sheets: [{ name, rows }] -> the .xlsx file's bytes.
export function buildXlsx(sheets) {
  const xml = (text) => Buffer.from(text, "utf8");
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
  const files = [
    {
      name: "[Content_Types].xml",
      data: xml(
        `${header}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="${TYPE}.sheet.main+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="${TYPE}.styles+xml"/>` +
          sheets
            .map(
              (_, i) =>
                `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${TYPE}.worksheet+xml"/>`,
            )
            .join("") +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: xml(
        `${header}<Relationships xmlns="${PACKAGE_RELS}">` +
          `<Relationship Id="rId1" Type="${RELS}/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: xml(
        `${header}<workbook xmlns="${MAIN}" xmlns:r="${RELS}"><sheets>` +
          sheets
            .map(
              (sheet, i) =>
                `<sheet name="${xmlText(sheetName(sheet.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
            )
            .join("") +
          `</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xml(
        `${header}<Relationships xmlns="${PACKAGE_RELS}">` +
          sheets
            .map(
              (_, i) =>
                `<Relationship Id="rId${i + 1}" Type="${RELS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
            )
            .join("") +
          `<Relationship Id="rId${sheets.length + 1}" Type="${RELS}/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "xl/styles.xml", data: xml(STYLES_XML) },
    ...sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: xml(sheetXml(sheet.rows)),
    })),
  ];
  return zip(files);
}
