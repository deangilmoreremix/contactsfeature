import { useEffect, useRef, useState } from 'react';
import { Check, Pin, PinOff } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GlassCard } from '../../ui/GlassCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  PINNABLE_CHARTS,
  buildChartData,
  loadPinnedCharts,
  savePinnedCharts,
  togglePinned,
  type ChartDealLike,
  type ChartId,
} from '../../../lib/analytics/contactCharts';
import type { Contact } from '../../../types/contact';
import { supabase } from '../../../lib/supabase';

/** Pinned chart ids for the signed-in user (localStorage, per user). Nothing is pinned by default. */
export function usePinnedCharts() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<ChartId[]>(() => loadPinnedCharts(null));

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (!alive || !uid) return;
        setUserId(uid);
        setPinned(loadPinnedCharts(uid));
      } catch { /* offline / signed out: keep the anonymous list */ }
    })();
    return () => { alive = false; };
  }, []);

  const toggle = (id: ChartId) =>
    setPinned((prev) => {
      const next = togglePinned(prev, id);
      savePinnedCharts(userId, next);
      return next;
    });

  return { pinned, toggle };
}

interface PinChartMenuProps {
  pinned: ChartId[];
  onToggle: (id: ChartId) => void;
  dealsAvailable: boolean;
  onOpen?: () => void;
}

export function PinChartMenu({ pinned, onToggle, dealsAvailable, onOpen }: PinChartMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const items = PINNABLE_CHARTS.filter((c) => !c.needsDeals || dealsAvailable || pinned.includes(c.id));

  return (
    <div className="relative -my-1.5" ref={ref}>
      <ModernButton
        size="toolbar"
        variant="outline"
        icon={Pin}
        onClick={() => { setOpen((v) => { if (!v) onOpen?.(); return !v; }); }}
        title="Pin a chart to the dashboard"
      >
        Pin chart
      </ModernButton>
      {open && (
        <div
          role="menu"
          aria-label="Pin chart"
          className="absolute right-0 mt-2 w-64 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
        >
          {items.map((c) => {
            const on = pinned.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => onToggle(c.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span>{c.title}</span>
                {on && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' };

interface PinnedChartsProps {
  ids: ChartId[];
  contacts: Contact[];
  deals: ChartDealLike[];
  onUnpin: (id: ChartId) => void;
}

/** The pinned chart cards (same card chrome as the built-in dashboard charts). Renders nothing when empty. */
export function PinnedCharts({ ids, contacts, deals, onUnpin }: PinnedChartsProps) {
  if (!ids.length) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="pinned-charts">
      {ids.map((id) => {
        const meta = PINNABLE_CHARTS.find((c) => c.id === id);
        if (!meta) return null;
        const data = buildChartData(id, contacts, deals);
        const empty = data.every((d) => d.value === 0);
        return (
          <GlassCard key={id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">{meta.title}</h4>
              <button
                type="button"
                onClick={() => onUnpin(id)}
                aria-label={`Unpin ${meta.title}`}
                title="Unpin"
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <PinOff className="w-4 h-4" />
              </button>
            </div>
            {empty ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">No data to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                {meta.kind === 'pie' ? (
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                      {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : meta.kind === 'line' ? (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {/* One colour (like the Top Industries card): bar height carries the value, not hue. */}
                    <Bar dataKey="value" fill="#8B5CF6" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
