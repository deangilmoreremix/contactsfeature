/**
 * Companies: a derived grouping of contacts by (normalised) company name. No table, nothing stored.
 */
import type { Contact } from '../../types/contact';

export interface CompanyDealLike {
  id: string;
  contact_id: string | null;
  title?: string | null;
  stage?: string | null;
  value?: number | string | null;
  closed_at?: string | null;
}

export interface CompanyDeal {
  id: string;
  title: string;
  stage: string;
  value: number;
  contactId: string;
}

export interface Company {
  /** Normalised key (lower-case, no legal suffix / punctuation). */
  key: string;
  /** Display name: the most common spelling among the contacts. */
  name: string;
  contacts: Contact[];
  count: number;
  /** Average of the contacts' AI scores (contacts without a score are ignored); null when none has one. */
  avgAiScore: number | null;
  /** Most recent activity (ISO) across the contacts, or null. */
  lastActivity: string | null;
  openDeals: CompanyDeal[];
  openDealValue: number;
}

const LEGAL_SUFFIX = /\b(incorporated|inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|sa|ag|bv|pty)\b\.?/g;

/** Key used to decide that "Acme, Inc." and "ACME inc" are the same company. Empty string = no company. */
export function normalizeCompany(name: string | null | undefined): string {
  if (!name) return '';
  const base = String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ');
  const stripped = base.replace(LEGAL_SUFFIX, ' ').replace(/\s+/g, ' ').trim();
  // A name that is nothing but a suffix ("Co") keeps its own letters.
  return stripped || base.replace(/\s+/g, ' ').trim();
}

const time = (iso?: string | null): number => {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
};

/** Latest of lastConnected / updatedAt / createdAt as ISO, or null. */
export function contactLastActivity(c: Pick<Contact, 'lastConnected' | 'updatedAt' | 'createdAt'>): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const v of [c.lastConnected, c.updatedAt, c.createdAt]) {
    const t = time(v);
    if (!Number.isNaN(t) && t > bestT) { bestT = t; best = v as string; }
  }
  return best;
}

const isOpenDeal = (d: CompanyDealLike): boolean => {
  if (d.closed_at) return false;
  const stage = String(d.stage ?? '').toLowerCase();
  return !/(^|[_\s-])(won|lost)($|[_\s-])/.test(stage) && stage !== 'customer';
};

function pickDisplayName(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = names[0] ?? '';
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) { best = n; bestCount = c; }
  }
  return best;
}

/**
 * Group contacts by company. Contacts with no company are left out. Sorted by people count (desc),
 * then name. `deals` (optional) adds the open deals of the company's people.
 */
export function buildCompanies(contacts: Contact[], deals: CompanyDealLike[] = []): Company[] {
  const byKey = new Map<string, Contact[]>();
  for (const c of contacts) {
    const key = normalizeCompany(c.company);
    if (!key) continue;
    const list = byKey.get(key);
    if (list) list.push(c);
    else byKey.set(key, [c]);
  }
  const dealsByContact = new Map<string, CompanyDealLike[]>();
  for (const d of deals) {
    if (!d.contact_id || !isOpenDeal(d)) continue;
    const list = dealsByContact.get(d.contact_id);
    if (list) list.push(d);
    else dealsByContact.set(d.contact_id, [d]);
  }

  const out: Company[] = [];
  for (const [key, people] of byKey) {
    const scored = people.filter((p) => typeof p.aiScore === 'number' && Number.isFinite(p.aiScore) && (p.aiScore as number) > 0);
    let last: string | null = null;
    let lastT = -Infinity;
    for (const p of people) {
      const a = contactLastActivity(p);
      const t = time(a);
      if (a && !Number.isNaN(t) && t > lastT) { lastT = t; last = a; }
    }
    const openDeals: CompanyDeal[] = [];
    for (const p of people) {
      for (const d of dealsByContact.get(p.id) ?? []) {
        const value = Number(d.value);
        openDeals.push({ id: d.id, title: d.title || 'Untitled deal', stage: String(d.stage ?? ''), value: Number.isFinite(value) ? value : 0, contactId: p.id });
      }
    }
    out.push({
      key,
      name: pickDisplayName(people.map((p) => String(p.company).trim())),
      contacts: people,
      count: people.length,
      avgAiScore: scored.length ? Math.round(scored.reduce((n, p) => n + (p.aiScore as number), 0) / scored.length) : null,
      lastActivity: last,
      openDeals,
      openDealValue: openDeals.reduce((n, d) => n + d.value, 0),
    });
  }
  return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function findCompany(companies: Company[], name: string | null | undefined): Company | undefined {
  const key = normalizeCompany(name);
  return key ? companies.find((c) => c.key === key) : undefined;
}

/** Newest-first activity entries for a company's people (for the detail panel timeline). */
export interface CompanyActivityEntry {
  contactId: string;
  contactName: string;
  at: string;
  kind: 'connected' | 'updated' | 'created';
}

export function companyTimeline(company: Company, limit = 12): CompanyActivityEntry[] {
  const entries: CompanyActivityEntry[] = [];
  for (const p of company.contacts) {
    const add = (at: string | undefined, kind: CompanyActivityEntry['kind']) => {
      if (at && !Number.isNaN(time(at))) entries.push({ contactId: p.id, contactName: p.name, at, kind });
    };
    add(p.lastConnected, 'connected');
    // updatedAt/createdAt are bookkeeping: only add them when they add information.
    if (p.updatedAt && p.updatedAt !== p.lastConnected) add(p.updatedAt, 'updated');
    if (p.createdAt && p.createdAt !== p.updatedAt) add(p.createdAt, 'created');
  }
  return entries.sort((a, b) => time(b.at) - time(a.at)).slice(0, limit);
}
