import { useRef, useState } from 'react';
import { Download, File as FileIcon, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useContactAttachments } from '../../../hooks/useContactAttachments';
import { formatFileSize, getFileKind, type FileKind } from '../../../lib/files/fileKind';
import { isUuid } from '../../../lib/records/contactRecords';

const ICONS: Record<FileKind, typeof FileIcon> = {
  image: FileImage,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  text: FileText,
  archive: FileIcon,
  other: FileIcon,
};

export function FilesSection({ contactId }: { contactId: string }) {
  const { attachments, uploading, error, uploadFile, deleteAttachment, downloadAttachment } = useContactAttachments(contactId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported = isUuid(contactId);

  const upload = async (files: FileList | File[]) => {
    setMessage(null);
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Upload failed');
      }
    }
  };

  return (
    <GlassCard className="p-5">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Files</h4>

      {supported ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mb-3 ${
            dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drop files here or{' '}
            <button type="button" onClick={() => inputRef.current?.click()} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              browse
            </button>
          </p>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && void upload(e.target.files)} />
          {uploading && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploading…</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">File storage is available for contacts saved in your database.</p>
      )}

      {(message || error) && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{message ?? error?.message}</p>}

      {attachments.length === 0 ? (
        supported && <p className="text-sm text-gray-500 dark:text-gray-400">No files yet.</p>
      ) : (
        <ul>
          {attachments.map((a) => {
            const kind = getFileKind(a.fileName, a.mimeType);
            const Icon = ICONS[kind];
            return (
              <li key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                {kind === 'image' && a.publicUrl ? (
                  <img src={a.publicUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{a.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(a.fileSize)}</p>
                </div>
                <button type="button" onClick={() => void downloadAttachment(a)} aria-label={`Download ${a.fileName}`} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  <Download className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => void deleteAttachment(a)} aria-label={`Delete ${a.fileName}`} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
