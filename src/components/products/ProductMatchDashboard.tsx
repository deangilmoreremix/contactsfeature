import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Download,
  Mail,
  Phone,
  MessageSquare,
  Linkedin,
  CheckCircle2,
  Circle,
  User,
  Building,
  Briefcase,
  Target,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import type {
  UserProduct,
  ProductContactMatchWithContact,
  DraftType,
  getMatchTier,
  getMatchTierColor,
  getMatchTierLabel,
} from '../../types/userProduct';
import { useProductMatches, useProductDrafts } from '../../hooks/useProductMatches';

interface ProductMatchDashboardProps {
  product: UserProduct;
  onBack: () => void;
  onContactClick?: (contactId: string) => void;
}

type ViewMode = 'all' | 'high' | 'medium' | 'low';

export function ProductMatchDashboard({
  product,
  onBack,
  onContactClick,
}: ProductMatchDashboardProps) {
  const {
    matches,
    loading,
    calculating,
    progress,
    fetchMatchesForProduct,
    calculateMatchesForProduct,
    getMatchesByTier,
    stats,
  } = useProductMatches();

  const {
    generateBatchDrafts,
    generating,
    progress: draftProgress,
  } = useProductDrafts();

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  useEffect(() => {
    fetchMatchesForProduct(product.id);
  }, [product.id, fetchMatchesForProduct]);

  const tiers = getMatchesByTier();

  const displayedMatches = viewMode === 'all'
    ? matches
    : viewMode === 'high'
    ? tiers.high
    : viewMode === 'medium'
    ? tiers.medium
    : tiers.low;

  const toggleSelectAll = () => {
    if (selectedContacts.size === displayedMatches.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(displayedMatches.map(m => m.contact_id)));
    }
  };

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const selectAllHighFit = () => {
    setSelectedContacts(new Set(tiers.high.map(m => m.contact_id)));
    setViewMode('all');
  };

  const handleGenerateDrafts = async (draftType: DraftType) => {
    if (selectedContacts.size === 0) return;
    await generateBatchDrafts(product, Array.from(selectedContacts), draftType);
    setShowDraftModal(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-100';
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Title', 'Industry', 'Match Score', 'Top Reason'];
    const rows = displayedMatches.map(m => [
      m.contact.name || '',
      m.contact.email || '',
      m.contact.company || '',
      m.contact.title || '',
      m.contact.industry || '',
      m.match_score.toString(),
      m.match_reasons[0]?.reason || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.name}-matches.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500">Contact Matches</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => calculateMatchesForProduct(product)}
                disabled={calculating}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating...' : 'Recalculate'}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {(calculating || generating) && progress && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                {calculating ? 'Calculating matches' : 'Generating drafts'}: {progress.completed} / {progress.total}
              </span>
              <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setViewMode('all')}
            className={`p-4 rounded-xl border-2 transition-all ${
              viewMode === 'all'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Matches</p>
          </button>
          <button
            onClick={() => setViewMode('high')}
            className={`p-4 rounded-xl border-2 transition-all ${
              viewMode === 'high'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-emerald-600">{stats.highFit}</p>
            <p className="text-sm text-gray-500">High Fit (80+)</p>
          </button>
          <button
            onClick={() => setViewMode('medium')}
            className={`p-4 rounded-xl border-2 transition-all ${
              viewMode === 'medium'
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-amber-600">{stats.mediumFit}</p>
            <p className="text-sm text-gray-500">Medium Fit (50-79)</p>
          </button>
          <button
            onClick={() => setViewMode('low')}
            className={`p-4 rounded-xl border-2 transition-all ${
              viewMode === 'low'
                ? 'border-gray-500 bg-gray-100'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-600">{stats.lowFit}</p>
            <p className="text-sm text-gray-500">Low Fit (0-49)</p>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedContacts.size === displayedMatches.length && displayedMatches.length > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
                {selectedContacts.size > 0 ? `${selectedContacts.size} selected` : 'Select all'}
              </button>
              {stats.highFit > 0 && (
                <button
                  onClick={selectAllHighFit}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Select all high fit
                </button>
              )}
            </div>

            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDraftModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Drafts ({selectedContacts.size})
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading matches...</p>
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No matches found</p>
              <button
                onClick={() => calculateMatchesForProduct(product)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Calculate Matches
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedMatches.map(match => (
                <div
                  key={match.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <button
                      onClick={() => toggleContact(match.contact_id)}
                      className="shrink-0"
                    >
                      {selectedContacts.has(match.contact_id) ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </button>

                    <div
                      className="flex-1 flex items-center gap-4 cursor-pointer"
                      onClick={() => onContactClick?.(match.contact_id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                        {match.contact.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {match.contact.name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {match.contact.title && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" />
                              {match.contact.title}
                            </span>
                          )}
                          {match.contact.company && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {match.contact.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1.5 rounded-full font-semibold text-sm ${getScoreColor(match.match_score)}`}>
                        {match.match_score}%
                      </div>

                      <button
                        onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {expandedMatch === match.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedMatch === match.id && (
                    <div className="px-4 pb-4 ml-9">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Match Reasons</h4>
                          <div className="space-y-1.5">
                            {match.match_reasons.slice(0, 5).map((reason, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  reason.score_contribution > 15 ? 'bg-emerald-500' :
                                  reason.score_contribution > 5 ? 'bg-amber-500' : 'bg-gray-400'
                                }`} />
                                <span className="text-gray-600">{reason.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {match.recommended_approach && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Recommended Approach</h4>
                            <p className="text-sm text-gray-600">{match.recommended_approach}</p>
                          </div>
                        )}

                        {match.why_buy_reasons.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Why They Should Buy</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                              {match.why_buy_reasons.slice(0, 3).map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {match.objections_anticipated.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Anticipated Objections</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                              {match.objections_anticipated.slice(0, 3).map((obj, i) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Score breakdown:</p>
                          <div className="flex items-center gap-3 text-xs">
                            <span>Industry: {match.industry_score}</span>
                            <span>Size: {match.company_size_score}</span>
                            <span>Title: {match.title_score}</span>
                            <span>Tags: {match.tags_score}</span>
                            <span>Status: {match.status_score}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generate Drafts for {selectedContacts.size} Contacts
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the type of content to generate:
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleGenerateDrafts('email')}
                disabled={generating}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <Mail className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium">Email</span>
              </button>
              <button
                onClick={() => handleGenerateDrafts('call_script')}
                disabled={generating}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <Phone className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium">Call Script</span>
              </button>
              <button
                onClick={() => handleGenerateDrafts('sms')}
                disabled={generating}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <MessageSquare className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium">SMS</span>
              </button>
              <button
                onClick={() => handleGenerateDrafts('linkedin')}
                disabled={generating}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <Linkedin className="w-6 h-6 text-blue-700" />
                <span className="text-sm font-medium">LinkedIn</span>
              </button>
            </div>

            {generating && draftProgress && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating: {draftProgress.completed} / {draftProgress.total}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${(draftProgress.completed / draftProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowDraftModal(false)}
                disabled={generating}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
