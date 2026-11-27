import React, { useCallback, useEffect, useState } from 'react';
import { Mail, MessageSquare, Plus, Trash2, Star, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';
import {
  messagingProviderService,
  PROVIDER_LABELS,
  FIELD_LABELS,
  type MessagingProvider,
  type ProviderCatalog,
  type ProviderId,
} from '../../services/messagingProviderService';

const inputClass =
  'w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

const SECRET_FIELDS = new Set(['apiKey', 'authToken']);

export const MessagingProvidersPanel: React.FC = () => {
  const [providers, setProviders] = useState<MessagingProvider[]>([]);
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<ProviderId | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({});

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await messagingProviderService.list();
      setProviders(r.providers);
      setCatalog(r.supported);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startAdd = (p: ProviderId) => {
    setAdding(p);
    setForm({});
    setFromAddress('');
    setFromName('');
  };

  const save = async () => {
    if (!adding || !catalog) return;
    setSaving(true);
    setError(null);
    try {
      await messagingProviderService.save({
        provider: adding,
        credentials: form,
        from_address: fromAddress.trim(),
        from_name: fromName.trim() || undefined,
      });
      setAdding(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save provider');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (p: MessagingProvider) => {
    const to = (testTo[p.id] || '').trim();
    if (!to) return;
    setTesting(p.id);
    try {
      const r = await messagingProviderService.test(p.id, to);
      setTestResult((s) => ({ ...s, [p.id]: { ok: r.success, message: r.success ? 'Test message sent' : r.error || 'Test failed' } }));
      await load();
    } catch (e) {
      setTestResult((s) => ({ ...s, [p.id]: { ok: false, message: e instanceof Error ? e.message : 'Test failed' } }));
    } finally {
      setTesting(null);
    }
  };

  const channelBlock = (channel: 'email' | 'sms') => {
    const Icon = channel === 'email' ? Mail : MessageSquare;
    const options = catalog?.[channel] ?? [];
    const rows = providers.filter((p) => p.channel === channel);
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
            <Icon className="w-4 h-4" /> {channel === 'email' ? 'Email providers' : 'SMS providers'}
          </h4>
          <div className="flex gap-2 flex-wrap">
            {options.map((p) => (
              <ModernButton key={p} size="toolbar" variant="outline" onClick={() => startAdd(p)}>
                <Plus className="w-4 h-4" /> {PROVIDER_LABELS[p]}
              </ModernButton>
            ))}
          </div>
        </div>

        {rows.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {channel === 'email'
              ? 'No email provider connected. Emails and sequences cannot be sent until you add one.'
              : 'No SMS provider connected. Connect Twilio to send text messages.'}
          </p>
        )}

        {rows.map((p) => (
          <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {PROVIDER_LABELS[p.provider]}
                  {p.is_default && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Default</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {p.from_name ? `${p.from_name} · ` : ''}
                  {p.from_address} · {Object.values(p.credentials_hint).join(' · ')}
                </div>
              </div>
              <div className="flex gap-2">
                {!p.is_default && (
                  <ModernButton
                    size="toolbar"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await messagingProviderService.setDefault(p.id);
                        await load();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Could not set default provider');
                      }
                    }}
                  >
                    <Star className="w-4 h-4" /> Make default
                  </ModernButton>
                )}
                <ModernButton
                  size="toolbar"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await messagingProviderService.remove(p.id);
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not remove provider');
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </ModernButton>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                className={`${inputClass} max-w-xs`}
                placeholder={channel === 'email' ? 'Send a test to…' : '+14155550123'}
                value={testTo[p.id] || ''}
                onChange={(e) => setTestTo((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <ModernButton size="toolbar" variant="primary" disabled={testing === p.id} onClick={() => runTest(p)}>
                {testing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send test
              </ModernButton>
              {testResult[p.id] && (
                <span
                  className={`text-sm flex items-center gap-1 ${testResult[p.id]?.ok ? 'text-green-700' : 'text-red-700'}`}
                >
                  {testResult[p.id]?.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {testResult[p.id]?.message}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading providers…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect your own email and SMS accounts. Credentials are encrypted on the server and are never shown again
        after saving.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {channelBlock('email')}
      {channelBlock('sms')}

      {adding && catalog && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 bg-blue-50/40 dark:bg-blue-900/10">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Connect {PROVIDER_LABELS[adding]}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.fields[adding].concat(adding === 'mailgun' ? ['region'] : []).map((f) => (
              <label key={f} className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <span>{FIELD_LABELS[f] || f}</span>
                <input
                  className={inputClass}
                  type={SECRET_FIELDS.has(f) ? 'password' : 'text'}
                  autoComplete="off"
                  value={form[f] || ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
                />
              </label>
            ))}
            <label className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <span>{adding === 'twilio' ? 'From phone number (E.164)' : 'From email address'}</span>
              <input className={inputClass} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
            </label>
            {adding !== 'twilio' && (
              <label className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <span>From name (optional)</span>
                <input className={inputClass} value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <ModernButton size="toolbar" variant="primary" disabled={saving} onClick={save}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save provider
            </ModernButton>
            <ModernButton size="toolbar" variant="outline" onClick={() => setAdding(null)}>
              Cancel
            </ModernButton>
          </div>
        </div>
      )}
    </div>
  );
};
