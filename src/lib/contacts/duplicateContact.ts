/**
 * Factory for "Duplicate record": same tags / custom fields / profile, new identity.
 * Timeline, files, activity log, favorite flag, position, AI score and soft-delete state are NOT carried.
 */
import type { Contact } from '../../types/contact';

export type ContactCopyInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

const COPY_SUFFIX = ' (copy)';

/** `jane@x.com` -> `jane+copy@x.com` (then `+copy2`, ...) so the copy never collides with a unique email. */
export function copyEmail(email: string | undefined, existing: Iterable<string> = []): string {
  const raw = (email ?? '').trim();
  const at = raw.lastIndexOf('@');
  if (at <= 0) return raw;
  const taken = new Set([...existing].map((e) => e.trim().toLowerCase()));
  const local = raw.slice(0, at);
  const domain = raw.slice(at);
  let candidate = `${local}+copy${domain}`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${local}+copy${n}${domain}`;
  return candidate;
}

export function buildDuplicateContact(source: Contact, existingEmails: Iterable<string> = []): ContactCopyInput {
  const {
    id: _id, createdAt: _c, updatedAt: _u, activityLog: _a, deletedAt: _d, position: _p,
    isFavorite: _f, aiScore: _s, ...rest
  } = source as Contact & Record<string, unknown>;
  void _id; void _c; void _u; void _a; void _d; void _p; void _f; void _s;
  const name = `${(source.name || `${source.firstName ?? ''} ${source.lastName ?? ''}`).trim() || 'Contact'}${COPY_SUFFIX}`;
  const lastName = `${(source.lastName ?? '').trim()}${COPY_SUFFIX}`.trim();
  return {
    ...(rest as unknown as ContactCopyInput),
    name,
    lastName,
    email: copyEmail(source.email, existingEmails),
    tags: source.tags ? [...source.tags] : source.tags,
    sources: source.sources ? [...source.sources] : source.sources,
    customFields: source.customFields ? JSON.parse(JSON.stringify(source.customFields)) : source.customFields,
    socialProfiles: source.socialProfiles ? { ...source.socialProfiles } : source.socialProfiles,
    isFavorite: false,
  } as ContactCopyInput;
}
