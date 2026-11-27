// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validationService } from '../src/services/validation.service';

describe('sanitizePartialContact', () => {
  it('does not add or blank fields that were not sent', () => {
    const out = validationService.sanitizePartialContact({ status: 'lead' });
    expect(out).toEqual({ status: 'lead' });
    expect(Object.keys(out)).toEqual(['status']);
  });

  it('still sanitizes the fields that are sent', () => {
    const out = validationService.sanitizePartialContact({ company: ' <b>Acme</b> ', email: ' A@B.COM ' });
    expect(out.company).toBe('Acme');
    expect(out.email).toBe('a@b.com');
  });

  it('documents the old behaviour this replaces', () => {
    const old = validationService.sanitizeContact({ status: 'lead' });
    expect(old.firstName).toBe(''); // the bug: partial updates blanked other fields
  });
});
