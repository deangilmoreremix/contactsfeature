import type { Contact } from '../../types';

/** Payload accepted by the contact store / API when creating a contact (server fills id and timestamps). */
export type NewContactInput = Omit<Contact, 'createdAt' | 'id' | 'updatedAt'>;

/**
 * Test fixtures are intentionally partial (no `name` / `avatarSrc`, sometimes no lastName at all) to exercise
 * validation and defaulting. This narrows them to the create-payload type at the call boundary only.
 */
export const asNewContact = (fixture: object): NewContactInput => fixture as unknown as NewContactInput;

/** Same idea for fixtures handed to code that expects a full `Contact`. */
export const asContact = (fixture: object): Contact => fixture as unknown as Contact;
