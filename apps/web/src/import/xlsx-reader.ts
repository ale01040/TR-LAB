import { Unzip, UnzipInflate, zipSync } from 'fflate';
import { read, utils } from 'xlsx';
import { workbookSchema, type WorkbookData } from '@tr-lab/contracts';
const limits = {
  compressed: 10 * 1024 * 1024,
  expanded: 32 * 1024 * 1024,
  entries: 1000,
  cells: 100000,
};
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let n = index;
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function inspectXlsxContainer(
  bytes: Uint8Array,
  expandedLimit = limits.expanded,
): Record<string, Uint8Array> {
  if (
    bytes.length > limits.compressed ||
    bytes.length < 22 ||
    bytes[0] !== 80 ||
    bytes[1] !== 75 ||
    bytes[2] !== 3 ||
    bytes[3] !== 4
  )
    throw new Error('File XLSX non valido o superiore a 10 MiB.');
  // Un archivio troncato non deve essere interpretato come un workbook parziale.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    end + 22 + view.getUint16(end + 20, true) !== bytes.length ||
    view.getUint16(end + 10, true) > limits.entries
  )
    throw new Error('Contenitore ZIP incompleto o non supportato.');
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    view.getUint16(end + 8, true) !== view.getUint16(end + 10, true)
  )
    throw new Error('ZIP multidisco non supportato.');
  const directory = new Map<string, { size: number; crc: number }>();
  let cursor = view.getUint32(end + 16, true);
  const directoryEnd = cursor + view.getUint32(end + 12, true);
  if (directoryEnd !== end) throw new Error('Directory ZIP non valida o ZIP64 non supportato.');
  while (cursor < directoryEnd) {
    if (cursor + 46 > directoryEnd || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error('Directory ZIP incompleta.');
    const flags = view.getUint16(cursor + 8, true),
      size = view.getUint32(cursor + 24, true),
      nameLength = view.getUint16(cursor + 28, true),
      length =
        46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (
      cursor + length > directoryEnd ||
      flags & 1 ||
      size === 0xffffffff ||
      size > expandedLimit ||
      view.getUint16(cursor + 34, true) !== 0
    )
      throw new Error('ZIP cifrato, ZIP64 o dimensioni non supportate.');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    if (directory.has(name)) throw new Error('Parte ZIP duplicata.');
    directory.set(name, { size, crc: view.getUint32(cursor + 16, true) });
    cursor += length;
  }
  const files: Record<string, Uint8Array> = Object.create(null);
  let expanded = 0,
    cellCount = 0;
  const names = new Set<string>();
  let finished = 0;
  const unzip = new Unzip((file) => {
    const name = file.name;
    if (
      names.size >= limits.entries ||
      names.has(name.toLowerCase()) ||
      /(^\/|\\|(^|\/)\.\.(\/|$)|\0)/.test(name) ||
      /vbaProject|embeddings\/|externalLinks\//i.test(name)
    )
      throw new Error('Il file contiene parti duplicate, attive o esterne non ammesse.');
    names.add(name.toLowerCase());
    const expected = directory.get(name);
    if (!expected) throw new Error('Parte locale assente dalla directory ZIP.');
    let parts: Uint8Array[] = [];
    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      expanded += chunk.byteLength;
      if (expanded > expandedLimit) {
        file.terminate();
        throw new Error('Contenuto decompresso superiore al limite locale.');
      }
      parts.push(chunk);
      if (final) {
        finished++;
        if (parts.length) {
          const size = parts.reduce((n, p) => n + p.length, 0);
          const joined = new Uint8Array(size);
          let offset = 0;
          for (const part of parts) {
            joined.set(part, offset);
            offset += part.length;
          }
          parts = [];
          if (size !== expected.size || crc32(joined) !== expected.crc)
            throw new Error('Dimensioni o checksum ZIP non validi.');
          files[name] = joined;
          if (!/\.(xml|rels)$/i.test(name)) return;
          const xml = new TextDecoder('utf-8', { fatal: true }).decode(joined);
          if (/<!DOCTYPE|<!ENTITY|\0/i.test(xml))
            throw new Error('XML con entità o codifica non supportata.');
          if (name.startsWith('xl/worksheets/')) {
            cellCount += (xml.match(/<(?:[\w.-]+:)?c\b/g) ?? []).length;
            if (cellCount > limits.cells) throw new Error('Il file supera 100.000 celle.');
          }
        }
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Blocchi compressi piccoli limitano anche l'allocazione prima del callback di controllo.
  for (let offset = 0; offset < bytes.length; offset += 1024)
    unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  if (
    finished !== names.size ||
    names.size !== view.getUint16(end + 10, true) ||
    !names.has('[content_types].xml') ||
    !names.has('xl/workbook.xml')
  )
    throw new Error('Il contenitore non è un workbook XLSX completo.');
  return files;
}
export function readWorkbook(bytes: Uint8Array): WorkbookData {
  const files = inspectXlsxContainer(bytes);
  const relationships = files['xl/_rels/workbook.xml.rels'];
  if (relationships) {
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(relationships),
      targets = new Set<string>();
    for (const tag of xml.match(/<(?:[\w.-]+:)?Relationship\b[^>]*>/g) ?? []) {
      const attributes = new Map(
        [...tag.matchAll(/\b([\w:]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => [
          m[1]!,
          m[3] ?? m[4] ?? '',
        ]),
      );
      if (!attributes.get('Type')?.endsWith('/worksheet')) continue;
      const target = attributes.get('Target');
      if (!target || attributes.get('TargetMode') === 'External')
        throw new Error('Riferimento del foglio non supportato.');
      const url = new URL(target, 'https://xlsx.invalid/xl/');
      const path = decodeURIComponent(url.pathname).slice(1);
      if (url.origin !== 'https://xlsx.invalid' || url.search || url.hash || targets.has(path))
        throw new Error('Fogli esterni o parti riutilizzate non supportati.');
      targets.add(path);
    }
  }
  // Il parser riceve header ricostruiti dai byte limitati e verificati, mai dimensioni dichiarate false.
  const safeBytes = zipSync(files, { level: 0 });
  const workbook = read(safeBytes, {
    type: 'array',
    cellFormula: true,
    sheetStubs: true,
    cellDates: false,
    cellHTML: false,
    cellText: false,
    bookVBA: false,
  });
  if (workbook.SheetNames.length > 20) throw new Error('Il file supera 20 fogli.');
  if (
    new Set(workbook.SheetNames.map((n) => n.trim().toLocaleLowerCase('it-IT'))).size !==
    workbook.SheetNames.length
  )
    throw new Error('Nomi dei fogli duplicati.');
  let textSize = 0,
    parsedCells = 0;
  const rows = new Set<string>();
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) throw new Error('Foglio assente.');
    const cells = Object.entries(sheet)
      .filter(([address]) => /^[A-Z]+[1-9]\d*$/.test(address))
      .map(([address, cell]) => {
        const position = utils.decode_cell(address);
        parsedCells++;
        rows.add(`${name}:${position.r}`);
        if (parsedCells > limits.cells || rows.size > 50000)
          throw new Error('Il file supera i limiti complessivi di righe o celle.');
        const value: unknown = cell.t === 'z' || cell.t === 'e' ? null : cell.v;
        textSize += (typeof value === 'string' ? value.length : 0) + (cell.f?.length ?? 0);
        if (textSize > 4 * 1024 * 1024)
          throw new Error('Il contenuto testuale supera il limite locale.');
        if (
          value !== undefined &&
          value !== null &&
          !['string', 'number', 'boolean'].includes(typeof value)
        )
          throw new Error('Tipo di cella non supportato.');
        return {
          address,
          row: position.r + 1,
          column: position.c + 1,
          value: value ?? null,
          formula: cell.f ?? null,
        };
      });
    return { name, cells };
  });
  return workbookSchema.parse({ sheets });
}
