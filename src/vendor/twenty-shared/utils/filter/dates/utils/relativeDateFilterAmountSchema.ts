import z from 'zod/v4';

export const relativeDateFilterAmountSchema = z
  .union([z.coerce.number().int().positive(), z.literal('undefined')])
  .transform((val) => (val === 'undefined' ? undefined : val));
