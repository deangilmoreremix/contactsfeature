import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Contact } from '../../types';
import {
  Mail,
  Phone,
  MessageSquare,
  Video,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  Building,
  Upload,
  File,
  FileText,
  Image,
  X,
  Download,
  Eye,
  Plus
} from 'lucide-react';

interface JourneyEvent {
  id: string;
  type: 'interaction' | 'milestone' | 'status_change' | 'ai_insight' | 'file_upload';
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'in_progress';
  metadata?: {
    channel?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    score?: number;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
  };
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ContactJourneyTimelineProps {
  contact: Contact;
}

const eventIcons = {
  interaction: Mail,
  milestone: CheckCircle,
  status_change: TrendingUp,
  ai_insight: AlertCircle,
  file_upload: FileText
};

const statusColors = {
  completed: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  in_progress: 'text-blue-600 bg-blue-50'
};

const sentimentColors = {
  positive: 'text-green-600',
  neutral: 'text-gray-600',
  negative: 'text-red-600'
};

// Sample journey data - in a real app, this would come from your backend
const sampleJourneyEvents: JourneyEvent[] = [
  {
    id: '1',
    type: 'interaction',
    title: 'Initial Contact',
    description: 'First outreach email sent introducing our services',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'completed',
    metadata: {
      channel: 'email',
      sentiment: 'neutral'
    }
  },
  {
    id: '2',
    type: 'interaction',
    title: 'Discovery Call',
    description: 'Scheduled 30-minute discovery call to understand requirements',
    timestamp: '2024-01-18T14:00:00Z',
    status: 'completed',
    metadata: {
      channel: 'phone',
      sentiment: 'positive'
    }
  },
  {
    id: '3',
    type: 'milestone',
    title: 'Demo Completed',
    description: 'Product demo delivered, feedback collected',
    timestamp: '2024-01-22T11:00:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'ai_insight',
    title: 'AI Score Update',
    description: 'Lead score increased to 85/100 based on engagement patterns',
    timestamp: '2024-01-23T09:15:00Z',
    status: 'completed',
    metadata: {
      score: 85
    }
  },
  {
    id: '5',
    type: 'interaction',
    title: 'Follow-up Email',
    description: 'Sent personalized proposal based on discovery call insights',
    timestamp: '2024-01-25T16:30:00Z',
    status: 'completed',
    metadata: {
      channel: 'email',
      sentiment: 'positive'
    }
  },
  {
    id: '6',
    type: 'status_change',
    title: 'Status Changed',
    description: 'Contact moved from "Prospect" to "Qualified Lead"',
    timestamp: '2024-01-26T10:00:00Z',
    status: 'completed'
  }
];

export const ContactJourneyTimeline: React.FC<ContactJourneyTimelineProps> = ({ contact }) => {
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>(sampleJourneyEvents);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample uploaded files - in a real app, this would come from your backend
  const sampleFiles: UploadedFile[] = [
    {
      id: 'file-1',
      name: 'Proposal_Document.pdf',
      size: 2457600, // 2.4MB
      type: 'application/pdf',
      url: '#',
      uploadedAt: '2024-01-20T14:30:00Z',
      uploadedBy: 'Sam Rodriguez'
    },
    {
      id: 'file-2',
      name: 'Meeting_Notes.docx',
      size: 512000, // 512KB
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      url: '#',
      uploadedAt: '2024-01-18T11:15:00Z',
      uploadedBy: 'Sam Rodriguez'
    }
  ];

  useEffect(() => {
    setUploadedFiles(sampleFiles);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        // In a real implementation, you would upload to your storage service
        // For now, we'll simulate the upload
        const uploadedFile: UploadedFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: '#', // Would be the actual URL from your storage service
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Current User' // Would come from auth context
        };

        setUploadedFiles(prev => [...prev, uploadedFile]);

        // Add to journey events
        const fileEvent: JourneyEvent = {
          id: `event-${Date.now()}`,
          type: 'file_upload',
          title: 'File Uploaded',
          description: `Uploaded ${file.name} (${formatFileSize(file.size)})`,
          timestamp: new Date().toISOString(),
          status: 'completed',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileUrl: uploadedFile.url
          }
        };

        setJourneyEvents(prev => [fileEvent, ...prev]);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setShowFileUpload(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileDownload = (file: UploadedFile) => {
    // In a real implementation, this would download from your storage service
    window.open(file.url, '_blank');
  };

  const handleFileDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        // In a real implementation, you would delete from your storage service
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));

        // Remove from journey events
        setJourneyEvents(prev => prev.filter(e =>
          !(e.type === 'file_upload' && e.metadata?.fileName === uploadedFiles.find(f => f.id === fileId)?.name)
        ));
      } catch (error) {
        console.error('File deletion failed:', error);
        alert('File deletion failed. Please try again.');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (type: JourneyEvent['type']) => {
    const Icon = eventIcons[type];
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Header with File Upload */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contact Journey & Files</h3>
          <p className="text-sm text-gray-600">Timeline of interactions, milestones, and uploaded files for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* File Upload Button */}
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{contact.name}</span>
          </div>
          {contact.company && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Building className="w-4 h-4" />
              <span>{contact.company}</span>
            </div>
          )}
        </div>
      </div>

      {/* File Upload Section */}
      {showFileUpload && (
        <GlassCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">Upload Files</h4>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop files here, or click to select files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Select Files'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Uploaded Files Section */}
      {uploadedFiles.length > 0 && (
        <GlassCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">
                Uploaded Files ({uploadedFiles.length})
              </h4>
              <button
                onClick={() => setShowFileUpload(true)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add More</span>
              </button>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileIcon className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • Uploaded {formatTimestamp(file.uploadedAt)} by {file.uploadedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFileDownload(file)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Journey Timeline */}
      <GlassCard className="p-6">
        <div className="space-y-6">
          {journeyEvents.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const isLast = index === journeyEvents.length - 1;

            return (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                )}

                <div className="flex items-start space-x-4">
                  {/* Event icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    event.status === 'completed' ? 'bg-green-100 text-green-600' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                          {event.status && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
                              {event.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                        {/* Metadata */}
                        {event.metadata && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {event.metadata.channel && (
                              <span className="flex items-center space-x-1">
                                <span>Channel: {event.metadata.channel}</span>
                              </span>
                            )}
                            {event.metadata.sentiment && (
                              <span className={`flex items-center space-x-1 ${sentimentColors[event.metadata.sentiment]}`}>
                                <span>Sentiment: {event.metadata.sentiment}</span>
                              </span>
                            )}
                            {event.metadata.score && (
                              <span className="flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Score: {event.metadata.score}/100</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Journey Summary */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{journeyEvents.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {journeyEvents.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {journeyEvents.filter(e => e.type === 'interaction').length}
              </div>
              <div className="text-sm text-gray-600">Interactions</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};