import { supabase } from '../../lib/supabase';
import { logger } from '../../services/logger.service';

export interface ContactAttachment {
  id: string;
  contactId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  publicUrl?: string;
}

export function useContactAttachments(contactId: string | undefined) {
  const [attachments, setAttachments] = useState<ContactAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadAttachments = async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('contact_attachments')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const withUrls = (data || []).map((att: any) => ({
        ...att,
        publicUrl: getPublicUrl(att.file_path)
      }));

      setAttachments(withUrls as ContactAttachment[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load attachments', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('contact-attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadFile = async (file: File): Promise<ContactAttachment> => {
    if (!contactId) throw new Error('No contact selected');
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${contactId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contact-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          }
        });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('contact_attachments')
        .insert({
          contact_id: contactId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const attachment = {
        ...data,
        publicUrl: getPublicUrl(filePath)
      } as ContactAttachment;

      setAttachments(prev => [attachment, ...prev]);
      return attachment;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to upload file', error);
      setError(error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteAttachment = async (attachment: ContactAttachment) => {
    if (!confirm(`Delete ${attachment.fileName}?`)) return;
    try {
      const { error: storageError } = await supabase.storage
        .from('contact-attachments')
        .remove([attachment.filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('contact_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to delete attachment', error);
      setError(error);
      throw error;
    }
  };

  const downloadAttachment = (attachment: ContactAttachment) => {
    const url = attachment.publicUrl || getPublicUrl(attachment.filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.fileName;
    link.click();
  };

  return {
    attachments,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadFile,
    deleteAttachment,
    refetch: loadAttachments
  };
}
