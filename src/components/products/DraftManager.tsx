import { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Phone,
  MessageSquare,
  Linkedin,
  Copy,
  Check,
  Edit3,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  Filter,
  X,
  ChevronDown,
  User,
  Building,
  Package,
} from 'lucide-react';
import type {
  ProductDraft,
  ProductDraftWithDetails,
  DraftType,
  DraftTone,
} from '../../types/userProduct';
import { useProductDrafts } from '../../hooks/useProductMatches';

interface DraftManagerProps {
  productId?: string;
  contactId?: string;
}

const DRAFT_TYPE_ICONS: Record<DraftType, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  call_script: <Phone className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
};

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  email: 'Email',
  call_script: 'Call Script',
  sms: 'SMS',
  linkedin: 'LinkedIn',
};

const TONE_OPTIONS: { value: DraftTone; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
];

export function DraftManager({ productId, contactId }: DraftManagerProps) {
  const {
    drafts,
    loading,
    fetchDrafts,
    updateDraft,
    markAsSent,
    deleteDraft,
    regenerateDraft,
    generating,
  } = useProductDrafts();

  const [filterType, setFilterType] = useState<DraftType | 'all'>('all');
  const [filterSent, setFilterSent] = useState<'all' | 'sent' | 'unsent'>('all');
  const [selectedDraft, setSelectedDraft] = useState<ProductDraftWithDetails | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts({ productId, contactId });
  }, [productId, contactId, fetchDrafts]);

  const filteredDrafts = drafts.filter(draft => {
    if (filterType !== 'all' && draft.draft_type !== filterType) return false;
    if (filterSent === 'sent' && !draft.is_sent) return false;
    if (filterSent === 'unsent' && draft.is_sent) return false;
    return true;
  });

  const handleCopy = async (draft: ProductDraftWithDetails) => {
    const text = draft.draft_type === 'email'
      ? `Subject: ${draft.subject}\n\n${draft.body}`
      : draft.body;

    await navigator.clipboard.writeText(text);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (draft: ProductDraftWithDetails) => {
    setSelectedDraft(draft);
    setEditedSubject(draft.subject || '');
    setEditedBody(draft.body);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;

    await updateDraft(selectedDraft.id, {
      subject: editedSubject,
      body: editedBody,
    });

    setEditMode(false);
    setSelectedDraft(null);
    fetchDrafts({ productId, contactId });
  };

  const handleMarkSent = async (draftId: string) => {
    await markAsSent(draftId);
    fetchDrafts({ productId, contactId });
  };

  const handleDelete = async (draftId: string) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      await deleteDraft(draftId);
      if (selectedDraft?.id === draftId) {
        setSelectedDraft(null);
      }
    }
  };

  const handleRegenerate = async (draft: ProductDraftWithDetails, newTone?: DraftTone) => {
    await regenerateDraft(draft as ProductDraft, newTone);
    fetchDrafts({ productId, contactId });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3">My Drafts</h2>

          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as DraftType | 'all')}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="call_script">Call Script</option>
                <option value="sms">SMS</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <select
                value={filterSent}
                onChange={e => setFilterSent(e.target.value as 'all' | 'sent' | 'unsent')}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="unsent">Unsent</option>
                <option value="sent">Sent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No drafts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDrafts.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => {
                    setSelectedDraft(draft);
                    setEditMode(false);
                  }}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedDraft?.id === draft.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${
                      draft.draft_type === 'email' ? 'bg-blue-100 text-blue-600' :
                      draft.draft_type === 'call_script' ? 'bg-green-100 text-green-600' :
                      draft.draft_type === 'sms' ? 'bg-purple-100 text-purple-600' :
                      'bg-sky-100 text-sky-600'
                    }`}>
                      {DRAFT_TYPE_ICONS[draft.draft_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {draft.contact?.name || 'Unknown Contact'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {draft.contact?.company || draft.product?.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {draft.is_sent ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle className="w-3 h-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(draft.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-gray-50 flex flex-col">
        {selectedDraft ? (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedDraft.draft_type === 'email' ? 'bg-blue-100 text-blue-600' :
                    selectedDraft.draft_type === 'call_script' ? 'bg-green-100 text-green-600' :
                    selectedDraft.draft_type === 'sms' ? 'bg-purple-100 text-purple-600' :
                    'bg-sky-100 text-sky-600'
                  }`}>
                    {DRAFT_TYPE_ICONS[selectedDraft.draft_type]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {DRAFT_TYPE_LABELS[selectedDraft.draft_type]}
                    </h3>
                    <p className="text-sm text-gray-500">
                      For {selectedDraft.contact?.name} at {selectedDraft.contact?.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedDraft.is_sent && (
                    <button
                      onClick={() => handleMarkSent(selectedDraft.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Sent
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(selectedDraft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    {copiedId === selectedDraft.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(selectedDraft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <div className="relative group">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-10">
                      {TONE_OPTIONS.map(tone => (
                        <button
                          key={tone.value}
                          onClick={() => handleRegenerate(selectedDraft, tone.value)}
                          disabled={generating}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedDraft.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {editMode ? (
                <div className="max-w-3xl space-y-4">
                  {selectedDraft.draft_type === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={e => setEditedSubject(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={editedBody}
                      onChange={e => setEditedBody(e.target.value)}
                      rows={20}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditedSubject(selectedDraft.subject || '');
                        setEditedBody(selectedDraft.body);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {selectedDraft.draft_type === 'email' && selectedDraft.subject && (
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm text-gray-500">Subject:</p>
                        <p className="font-medium text-gray-900">{selectedDraft.subject}</p>
                      </div>
                    )}
                    <div className="px-6 py-4">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
                        {selectedDraft.body}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {selectedDraft.product?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {selectedDraft.contact?.name}
                    </span>
                    <span>Tone: {selectedDraft.tone}</span>
                    {selectedDraft.is_edited && (
                      <span className="text-amber-600">Edited</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a draft to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
