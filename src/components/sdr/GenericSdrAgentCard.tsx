import React, { useEffect, useState } from 'react';
import { Copy, Check, Save, Loader2 } from 'lucide-react';
import { Contact } from '../../types/contact';
import { useSdrRun, SdrLiveBar } from './SdrLive';
import { saveSdrDraft } from '../../utils/sdrDraftUtils';
import { OUTBOUND_PERSONAS } from '../../agents/personas';

export interface SdrResultField {
  key: string;
  label: string;
  kind?: 'text' | 'list' | 'badge';
}

export interface GenericSdrAgentConfig {
  /** Netlify function name, e.g. "linkedin-sdr" */
  slug: string;
  title: string;
  emoji: string;
  description: string;
  buttonLabel: string;
  fields: SdrResultField[];
  /** Keys used to build the draft saved to the emails table (omit to hide Save Draft). */
  draft?: { subjectKey?: string; bodyKey: string };
}

interface Props {
  contact?: Contact;
  config: GenericSdrAgentConfig;
}

const box: React.CSSProperties = {
  borderRadius: 12,
  padding: 16,
  border: '1px solid var(--sdr-e2e8f0)',
  background: 'var(--sdr-surface)',
  maxWidth: 520,
  flex: '1 1 340px',
};

const smallBtn: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 40,
  padding: '0 16px',
  borderRadius: 8,
  fontSize: 14,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

/** Shared UI for the Agents-SDK SDR agents (LinkedIn, WhatsApp, Event, Referral, ...). */
export const GenericSdrAgentCard: React.FC<Props> = ({ contact, config }) => {
  const [contactId, setContactId] = useState(contact?.id || '');
  const [personaId, setPersonaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = useSdrRun<Record<string, any>>();
  const loading = run.loading;
  const result = run.live as Record<string, any> | null;
  const [copied, setCopied] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (contact?.id) setContactId(contact.id);
  }, [contact?.id]);

  const start = async () => {
    setError(null);
    run.reset();
    setDraftSaved(false);
    if (!contactId) {
      setError('Please enter a contact ID.');
      return;
    }
    await run.runFunction(`/.netlify/functions/${config.slug}`, { contactId, personaId: personaId || undefined });
  };

  const textOf = (): string =>
    config.fields
      .map((f) => {
        const v = result?.[f.key];
        return `${f.label}:\n${Array.isArray(v) ? v.map((x) => `- ${x}`).join('\n') : v ?? ''}`;
      })
      .join('\n\n');

  const copy = async () => {
    await navigator.clipboard.writeText(textOf());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveDraft = async () => {
    if (!result || !config.draft) return;
    const r = await saveSdrDraft({
      contactId,
      subject: String(result[config.draft.subjectKey || ''] || config.title),
      body: String(result[config.draft.bodyKey] || ''),
      agentType: config.slug,
    });
    if (r.success) setDraftSaved(true);
    else setError(r.error || 'Could not save draft');
  };

  return (
    <div style={box}>
      <h2 style={{ margin: '0 0 8px' }}>
        {config.emoji} {config.title}
      </h2>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: 'var(--sdr-4a5568)' }}>{config.description}</p>

      {(error || run.streamError) && (
        <div style={{ marginBottom: 10, padding: '6px 8px', borderRadius: 8, background: 'var(--sdr-fff5f5)', color: 'var(--sdr-c53030)', fontSize: 12 }}>
          ⚠️ {error || run.streamError}
        </div>
      )}

      {contact ? (
        <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--sdr-f0fdf4)', border: '1px solid var(--sdr-bbf7d0)' }}>
          <div style={{ fontSize: 12, color: 'var(--sdr-166534)', fontWeight: 500 }}>Target: {contact.name}</div>
          <div style={{ fontSize: 11, color: 'var(--sdr-15803d)' }}>{contact.email || 'No email on file'}</div>
        </div>
      ) : (
        <input
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          placeholder="Enter contact UUID"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--sdr-cbd5e0)', fontSize: 13, marginBottom: 8 }}
        />
      )}

      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Persona</label>
      <select
        value={personaId}
        onChange={(e) => setPersonaId(e.target.value)}
        style={{ width: '100%', height: 40, padding: '0 10px', borderRadius: 8, border: '1px solid var(--sdr-cbd5e0)', fontSize: 13, marginBottom: 10 }}
      >
        <option value="">Default voice</option>
        {OUTBOUND_PERSONAS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={start}
        disabled={loading}
        style={{ width: '100%', height: 40, padding: '0 16px', borderRadius: 8, border: 'none', background: loading ? '#a0aec0' : '#2b6cb0', color: '#ffffff', fontWeight: 600, fontSize: 14, cursor: loading ? 'default' : 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}
      >
        {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        {loading ? 'Working…' : config.buttonLabel}
      </button>

      <SdrLiveBar run={run} />

      {result && (
        <div style={{ borderRadius: 8, border: '1px solid var(--sdr-e2e8f0)', background: 'var(--sdr-f7fafc)', padding: 8 }}>
          {config.fields.map((f) => {
            const v = result[f.key];
            if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
            return (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--sdr-718096)', marginBottom: 2 }}>{f.label}</div>
                {Array.isArray(v) ? (
                  <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18 }}>
                    {v.map((x: string, i: number) => (
                      <li key={i} style={{ wordBreak: 'break-word' }}>{x}</li>
                    ))}
                  </ul>
                ) : f.kind === 'badge' ? (
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{String(v)}</span>
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0, fontFamily: 'inherit', wordBreak: 'break-word' }}>{String(v)}</pre>
                )}
              </div>
            );
          })}
          <div style={{ display: loading ? 'none' : 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={copy} style={{ ...smallBtn, border: '1px solid var(--sdr-d1d5db)', background: copied ? 'var(--sdr-f0fdf4)' : 'var(--sdr-surface)', color: copied ? 'var(--sdr-166534)' : 'var(--sdr-374151)' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {config.draft && (
              <button type="button" onClick={saveDraft} disabled={draftSaved} style={{ ...smallBtn, border: 'none', background: draftSaved ? 'var(--sdr-dcfce7)' : '#2563eb', color: draftSaved ? 'var(--sdr-166534)' : 'white', fontWeight: 500 }}>
                <Save size={14} />
                {draftSaved ? 'Draft saved' : 'Save draft'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
