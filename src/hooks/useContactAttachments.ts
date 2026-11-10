import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';

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

      const mapped = await Promise.all((data || []).map((att: any) => toAttachment(att)));
      setAttachments(mapped);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load attachments', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // The bucket is private: files are only reachable through short-lived signed URLs.
  const getSignedUrl = async (filePath: string): Promise<string> => {
    const { data, error: urlError } = await supabase.storage
      .from('contact-attachments')
      .createSignedUrl(filePath, 3600);
    if (urlError) throw urlError;
    return data.signedUrl;
  };

  const toAttachment = async (row: any): Promise<ContactAttachment> => {
    let publicUrl: string | undefined;
    try {
      publicUrl = await getSignedUrl(row.file_path);
    } catch (urlErr) {
      logger.warn('Could not sign attachment URL', { id: row.id, error: urlErr });
    }
    return {
      id: row.id,
      contactId: row.contact_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size ?? 0,
      mimeType: row.mime_type ?? '',
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      ...(publicUrl ? { publicUrl } : {})
    };
  };

  const uploadFile = async (file: File): Promise<ContactAttachment> => {
    if (!contactId) throw new Error('No contact selected');
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Storage policies require the first path segment to be the owner's user id.
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${contactId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contact-attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;
      setUploadProgress(100);

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

      const attachment = await toAttachment(data);

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

  const downloadAttachment = async (attachment: ContactAttachment) => {
    const url = attachment.publicUrl || await getSignedUrl(attachment.filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.fileName;
    link.click();
  };

  useEffect(() => {
    void loadAttachments();
  }, [contactId]);

  return {
    attachments,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadFile,
    deleteAttachment,
    downloadAttachment,
    refetch: loadAttachments
  };
}
