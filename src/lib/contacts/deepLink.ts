/** `?contact=<id>&tab=<tab>` deep links to a contact's detail view. */
export interface ContactDeepLink {
  contactId: string | null;
  tab: string | null;
}

export function parseContactLink(search: string): ContactDeepLink {
  const params = new URLSearchParams(search);
  const contactId = params.get('contact')?.trim() || null;
  const tab = params.get('tab')?.trim() || null;
  return { contactId, tab: contactId ? tab : null };
}

export function buildContactLink(
  location: { origin: string; pathname: string },
  contactId: string,
  tab?: string | null,
): string {
  const query = `contact=${encodeURIComponent(contactId)}${tab ? `&tab=${encodeURIComponent(tab)}` : ''}`;
  return `${location.origin}${location.pathname}?${query}`;
}

/** New `search` string with contact/tab set (or removed when contactId is null); other params are kept. */
export function withContactParams(search: string, contactId: string | null, tab?: string | null): string {
  const params = new URLSearchParams(search);
  params.delete('contact');
  params.delete('tab');
  if (contactId) {
    params.set('contact', contactId);
    if (tab) params.set('tab', tab);
  }
  const out = params.toString();
  return out ? `?${out}` : '';
}
