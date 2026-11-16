import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { AgentButton } from './AgentButton';
import { Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDealStore, type DealRow } from '../../store/useDealStore';
import { normalizeStage, daysSinceUpdate } from '../../lib/analytics/pipeline';
import { streamFunction } from '../../services/liveFunction';
import { StreamingOutput } from '../ui/StreamingOutput';
import { healthFromPartial } from '../../lib/streaming/previews';

interface DealHealth {
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: Array<{ name: string; score: number; status: 'good' | 'warning' | 'critical'; rationale: string }>;
  risks: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>;
  recommendations: string[];
  nextActions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; timeline: string }>;
  dataGaps: string[];
}

interface DealHealthPanelProps {
  /** The contact whose deal(s) should be analysed. Deals are read from the `deals` table. */
  contactId: string;
  contactName?: string;
}

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation'];

const scoreColor = (score: number) => (score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600');
const scoreIcon = (score: number) =>
  score >= 80 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className={`w-5 h-5 ${score >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />;
const riskColor = (level: string) =>
  ({ low: 'text-green-600 bg-green-50', medium: 'text-yellow-600 bg-yellow-50', high: 'text-orange-600 bg-orange-50', critical: 'text-red-600 bg-red-50' } as Record<string, string>)[level] || 'text-gray-600 bg-gray-50';

export function buildHealthReport(deal: DealRow, health: DealHealth, contactName?: string): string {
  const lines = [
    `Deal Health Report: ${deal.title || contactName || deal.id}`,
    `Stage: ${deal.stage || 'unknown'}  |  Value: ${Number(deal.value) || 0}`,
    `Health score: ${health.healthScore}/100  |  Risk: ${health.riskLevel}`,
    '',
    'Indicators:',
    ...health.indicators.map((i) => `- ${i.name}: ${i.score}/100 (${i.status}) ${i.rationale}`),
    '',
    'Recommendations:',
    ...health.recommendations.map((r) => `- ${r}`),
    '',
    'Next actions:',
    ...health.nextActions.map((a) => `- [${a.priority}] ${a.action} (${a.timeline})`),
  ];
  if (health.dataGaps.length) lines.push('', 'Missing data:', ...health.dataGaps.map((g) => `- ${g}`));
  return lines.join('\n');
}

export const DealHealthPanel: React.FC<DealHealthPanelProps> = ({ contactId, contactName }) => {
  const { deals, loaded, loading: dealsLoading, error: dealsError, fetchDeals, createDeal } = useDealStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [healthByDeal, setHealthByDeal] = useState<Record<string, DealHealth>>({});
  const [analyzing, setAnalyzing] = useState(false);
  // Live run: status line + the structured result as it is written (partial JSON)
  const [live, setLive] = useState<{ label: string; steps: string[]; partial: unknown }>({ label: '', steps: [], partial: undefined });
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: contactName || '', value: '', stage: 'lead' });

  useEffect(() => { if (!loaded) void fetchDeals(); }, [loaded, fetchDeals]);

  const contactDeals = useMemo(() => deals.filter((d) => d.contact_id === contactId), [deals, contactId]);
  const deal = useMemo(
    () => contactDeals.find((d) => d.id === selectedId) ?? contactDeals.find((d) => normalizeStage(d.stage).kind === 'open') ?? contactDeals[0] ?? null,
    [contactDeals, selectedId],
  );
  const health = deal ? healthByDeal[deal.id] ?? null : null;
  // While analysing, show the draft that is filling in; afterwards the saved analysis (same layout).
  const liveDraft = useMemo(() => (analyzing ? healthFromPartial(live.partial) : null), [analyzing, live.partial]);
  const view = health ?? liveDraft;

  const analyze = async () => {
    if (!deal) return;
    setAnalyzing(true);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    setLive({ label: 'Starting…', steps: [], partial: undefined });
    try {
      const { result } = await streamFunction<{ data?: DealHealth }>('/.netlify/functions/deal-health-analysis', { dealId: deal.id }, {
        signal: ac.signal,
        onStatus: (label) => setLive((l) => ({ ...l, label, steps: l.steps[l.steps.length - 1] === label ? l.steps : [...l.steps, label] })),
        onPartial: (partial) => setLive((l) => ({ ...l, partial })),
      });
      if (!result?.data) throw new Error('Analysis failed');
      setHealthByDeal((prev) => ({ ...prev, [deal.id]: result.data as DealHealth }));
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      abortRef.current = null;
      setAnalyzing(false);
    }
  };

  const submitDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const created = await createDeal({
        contact_id: contactId,
        title: draft.title.trim() || contactName || 'Deal',
        value: Math.max(0, Number(draft.value) || 0),
        stage: draft.stage,
      });
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create deal');
    } finally {
      setCreating(false);
    }
  };

  const copyReport = async () => {
    if (!deal || !health) return;
    try {
      await navigator.clipboard.writeText(buildHealthReport(deal, health, contactName));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const idle = daysSinceUpdate(deal ?? { id: '', stage: null, value: null }) ;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg"><Heart className="w-5 h-5 text-red-600" /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deal Health Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">AI risk assessment from this deal's real data</p>
          </div>
        </div>
        {deal && (
          <div className="flex items-center space-x-2">
            <AgentButton agentId="ai-ae-agent" dealId={deal.id} variant="outline" size="sm">AI AE</AgentButton>
            <ModernButton variant="outline" size="toolbar" onClick={analyze} loading={analyzing}>
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </ModernButton>
          </div>
        )}
      </div>

      {error && <div role="alert" className="mb-4 p-3 text-sm rounded-lg bg-red-50 text-red-700">{error}</div>}
      {dealsError && !deal && <div role="alert" className="mb-4 p-3 text-sm rounded-lg bg-red-50 text-red-700">{dealsError}</div>}

      {analyzing && (
        <StreamingOutput
          className="mb-4"
          state={{ status: 'streaming', text: '', label: live.label, steps: live.steps, reasoning: '' }}
          display=""
          onStop={() => abortRef.current?.abort()}
        />
      )}

      {dealsLoading && !loaded && <p className="text-sm text-gray-500">Loading deals...</p>}

      {loaded && !deal && (
        <form onSubmit={submitDeal} className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No deal is linked to this contact yet. Create one to track its health.
          </p>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Deal title" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div className="flex gap-3">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" type="number" min="0" placeholder="Value" value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            <select className="flex-1 border rounded-lg px-3 py-2 text-sm" value={draft.stage}
              onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <ModernButton size="toolbar" variant="primary" type="submit" loading={creating}>Create deal</ModernButton>
        </form>
      )}

      {deal && (
        <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {contactDeals.length > 1 ? (
            <select className="border rounded-lg px-2 py-1 mb-2" value={deal.id} onChange={(e) => setSelectedId(e.target.value)}>
              {contactDeals.map((d) => <option key={d.id} value={d.id}>{d.title || d.id.slice(0, 8)} ({d.stage})</option>)}
            </select>
          ) : (
            <div className="font-medium">{deal.title || contactName}</div>
          )}
          <div className="text-xs text-gray-500">
            Stage {deal.stage || 'unknown'} · Value {Number(deal.value) || 0}
            {idle !== null && ` · last updated ${idle}d ago`}
          </div>
        </div>
      )}

      {deal && view && (
        <>
          {view.healthScore !== null && (
            <div className="text-center mb-6">
              <div className={`text-4xl font-bold mb-2 ${scoreColor(view.healthScore)}`}>{view.healthScore}/100</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">Overall Health Score</div>
              {view.riskLevel && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${riskColor(view.riskLevel)}`}>
                  <span className="capitalize">{view.riskLevel} Risk</span>
                </div>
              )}
            </div>
          )}

          {view.indicators.length > 0 && <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Health Indicators</h4>
            {view.indicators.map((i, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">{scoreIcon(i.score)}<span className="text-sm font-medium text-gray-900 dark:text-gray-100">{i.name}</span></div>
                  <div className={`text-sm font-medium ${scoreColor(i.score)}`}>{i.score}/100</div>
                </div>
                {i.rationale && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{i.rationale}</p>}
              </div>
            ))}
          </div>}

          {view.recommendations.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recommendations</h4>
                {view.recommendations.length > 2 && (
                  <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600 dark:text-blue-400">
                    {expanded ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {view.recommendations.slice(0, expanded ? undefined : 2).map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view.nextActions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Next Steps</h4>
              <div className="space-y-2">
                {view.nextActions.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">→</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{a.action} <span className="text-xs text-gray-500">({a.priority}, {a.timeline})</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view.dataGaps.length > 0 && (
            <div className="mb-6 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Missing data that limits this analysis</h4>
              <ul className="list-disc ml-5 text-sm text-gray-600 dark:text-gray-300">
                {view.dataGaps.map((g, idx) => <li key={idx}>{g}</li>)}
              </ul>
            </div>
          )}

          {health && (
            <ModernButton size="toolbar" variant="primary" onClick={copyReport} className="w-full">
              {copied ? 'Copied' : 'Copy report'}
            </ModernButton>
          )}
        </>
      )}

      {deal && !health && !analyzing && (
        <div className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-4">Run the analysis to see health, risks and next steps for this deal.</p>
          <ModernButton size="toolbar" variant="primary" onClick={analyze}>Run Health Analysis</ModernButton>
        </div>
      )}
    </GlassCard>
  );
};
