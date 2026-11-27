import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { DollarSign, Target, RefreshCw, BarChart3, TrendingUp } from 'lucide-react';
import { useDealStore } from '../../store/useDealStore';
import { computePipelineAnalytics, wonRevenueByMonth } from '../../lib/analytics/pipeline';
import { streamFunction } from '../../services/liveFunction';
import { StreamingOutput } from '../ui/StreamingOutput';
import { forecastFromPartial } from '../../lib/streaming/previews';

interface AiForecast {
  projectedWonNext90Days: { low: number; expected: number; high: number };
  confidence: 'low' | 'medium' | 'high';
  insights: string[];
  risks: string[];
  recommendedActions: string[];
  caveats: string[];
}

interface SalesForecastingWidgetProps {
  compact?: boolean;
}

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};
const pct = (n: number | null) => (n === null ? 'n/a' : `${Math.round(n * 100)}%`);

export const SalesForecastingWidget: React.FC<SalesForecastingWidgetProps> = ({ compact = false }) => {
  const { deals, loaded, loading, error: loadError, fetchDeals } = useDealStore();
  const [forecast, setForecast] = useState<AiForecast | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  // Live run: status line + the forecast as it is written (partial JSON)
  const [live, setLive] = useState<{ label: string; steps: string[]; partial: unknown }>({ label: '', steps: [], partial: undefined });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (!loaded) void fetchDeals(); }, [loaded, fetchDeals]);

  // Deterministic numbers come straight from the deals table; no AI involved.
  const analytics = useMemo(() => computePipelineAnalytics(deals), [deals]);
  const monthly = useMemo(() => wonRevenueByMonth(deals, 6), [deals]);

  const generate = async () => {
    setRunning(true);
    setError(null);
    setReason(null);
    const ac = new AbortController();
    abortRef.current = ac;
    setLive({ label: 'Starting…', steps: [], partial: undefined });
    try {
      const { result } = await streamFunction<{ data?: { forecast?: AiForecast | null; reason?: string | null } }>('/.netlify/functions/sales-forecasting', {
        deals: deals.map((d) => ({ id: d.id, stage: d.stage, value: d.value, created_at: d.created_at, updated_at: d.updated_at, closed_at: d.closed_at })),
      }, {
        signal: ac.signal,
        onStatus: (label) => setLive((l) => ({ ...l, label, steps: l.steps[l.steps.length - 1] === label ? l.steps : [...l.steps, label] })),
        onPartial: (partial) => setLive((l) => ({ ...l, partial })),
      });
      if (!result?.data) throw new Error('Forecast failed');
      setForecast(result.data.forecast ?? null);
      setReason(result.data.reason ?? null);
      setGeneratedAt(new Date());
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : 'Forecast failed');
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  };

  const draft = useMemo(() => (running ? forecastFromPartial(live.partial) : null), [running, live.partial]);
  const busy = running || loading;
  const noDeals = loaded && deals.length === 0;

  if (compact) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Pipeline</span>
          </div>
          <ModernButton variant="ghost" size="toolbar" onClick={() => void fetchDeals()} loading={loading}>
            <RefreshCw className="w-4 h-4" />
          </ModernButton>
        </div>
        {noDeals ? (
          <p className="text-xs text-gray-500">No deals yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-600">Open pipeline</span><span className="font-medium text-green-600">{formatCurrency(analytics.openValue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Weighted</span><span className="font-medium text-blue-600">{formatCurrency(analytics.weightedValue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Win rate</span><span className="font-medium text-purple-600">{pct(analytics.winRate)}</span></div>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Forecasting</h2>
            <p className="text-sm text-gray-600">Pipeline analytics from your deals, with an AI projection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && <span className="text-xs text-gray-500">Forecast {generatedAt.toLocaleTimeString()}</span>}
          <ModernButton variant="outline" size="toolbar" onClick={() => void fetchDeals()} loading={loading}>
            <RefreshCw className="w-4 h-4" />
          </ModernButton>
        </div>
      </div>

      {(error || loadError) && <div role="alert" className="mb-4 p-3 text-sm rounded-lg bg-red-50 text-red-700">{error || loadError}</div>}

      {noDeals && !loadError && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h3>
          <p className="text-gray-600">Create a deal from a contact's Sales Intelligence tab and your pipeline analytics will appear here.</p>
        </div>
      )}

      {deals.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1"><DollarSign className="w-5 h-5 text-green-600" /><span className="text-2xl font-bold text-green-600">{formatCurrency(analytics.openValue)}</span></div>
              <div className="text-sm text-gray-600">Open pipeline ({analytics.openCount})</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{formatCurrency(analytics.weightedValue)}</div>
              <div className="text-sm text-gray-600">Weighted (stage odds)</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1"><Target className="w-5 h-5 text-purple-600" /><span className="text-2xl font-bold text-purple-600">{pct(analytics.winRate)}</span></div>
              <div className="text-sm text-gray-600">Win rate ({analytics.wonCount}W / {analytics.lostCount}L)</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <div className="text-2xl font-bold text-gray-700 mb-1">{analytics.avgCycleDays === null ? 'n/a' : `${Math.round(analytics.avgCycleDays)}d`}</div>
              <div className="text-sm text-gray-600">Avg sales cycle</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">By stage</h3>
            <div className="space-y-2">
              {analytics.stages.map((s) => (
                <div key={s.stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium text-gray-900 capitalize">{s.stage.replace(/_/g, ' ')}</span>
                  <span className="text-gray-600">{s.count} deal{s.count === 1 ? '' : 's'} · {formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Weighted value uses fixed per-stage win odds (e.g. proposal 50%), not learned from your history.</p>
          </div>

          {monthly.some((m) => m.revenue > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Won revenue, last 6 months</h3>
              <div className="grid grid-cols-6 gap-2 text-center text-xs">
                {monthly.map((m) => (
                  <div key={m.month} className="p-2 bg-gray-50 rounded-lg"><div className="text-gray-500">{m.month.slice(5)}</div><div className="font-medium text-gray-900">{formatCurrency(m.revenue)}</div></div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <ModernButton size="toolbar" variant="primary" onClick={generate} loading={busy}>
              {forecast ? 'Refresh AI forecast' : 'Generate AI forecast'}
            </ModernButton>
          </div>

          {reason && <div className="p-3 text-sm rounded-lg bg-yellow-50 text-yellow-800">{reason}</div>}

          {running && (
            <StreamingOutput
              className="mb-4"
              state={{ status: 'streaming', text: '', label: live.label, steps: live.steps, reasoning: '' }}
              display=""
              onStop={() => abortRef.current?.abort()}
            />
          )}

          {(forecast || draft) && (() => {
            const f = draft ?? {
              projected: { low: forecast!.projectedWonNext90Days.low, expected: forecast!.projectedWonNext90Days.expected, high: forecast!.projectedWonNext90Days.high },
              confidence: forecast!.confidence, insights: forecast!.insights, risks: forecast!.risks, recommendedActions: forecast!.recommendedActions, caveats: forecast!.caveats,
            };
            return (
              <div className="space-y-4">
                {f.projected.expected !== null && (
                  <div className="p-4 rounded-lg bg-blue-50">
                    <div className="text-sm text-gray-600">Projected revenue won, next 90 days{f.confidence ? ` (${f.confidence} confidence)` : ''}</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatCurrency(f.projected.expected)}
                      {f.projected.low !== null && f.projected.high !== null && (
                        <span className="ml-2 text-sm font-normal text-gray-600">range {formatCurrency(f.projected.low)} to {formatCurrency(f.projected.high)}</span>
                      )}
                    </div>
                  </div>
                )}
                {f.insights.length > 0 && <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">{f.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>}
                {f.recommendedActions.length > 0 && (
                  <div><h4 className="text-sm font-medium text-gray-900 mb-1">Recommended actions</h4><ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">{f.recommendedActions.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                )}
                {f.caveats.length > 0 && <ul className="list-disc ml-5 text-xs text-gray-500 space-y-1">{f.caveats.map((t, i) => <li key={i}>{t}</li>)}</ul>}
              </div>
            );
          })()}
        </>
      )}
    </GlassCard>
  );
};
