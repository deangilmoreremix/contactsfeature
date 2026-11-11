export type FileKind = 'image' | 'pdf' | 'spreadsheet' | 'document' | 'text' | 'archive' | 'other';

const EXT: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', avif: 'image',
  pdf: 'pdf',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', tsv: 'spreadsheet',
  doc: 'document', docx: 'document', rtf: 'document', odt: 'document',
  txt: 'text', md: 'text', json: 'text', log: 'text',
  zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive',
};

export function getFileKind(fileName: string, mimeType?: string): FileKind {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('spreadsheet') || mime === 'text/csv') return 'spreadsheet';
  if (mime.includes('word') || mime.includes('document')) return 'document';
  if (mime.startsWith('text/')) return 'text';
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  return EXT[ext] ?? 'other';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
