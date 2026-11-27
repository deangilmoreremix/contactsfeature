import z from 'zod/v4';

export const relativeDateFilterDirectionSchema = z.enum([
  'NEXT',
  'THIS',
  'PAST',
]);

export type RelativeDateFilterDirection = z.infer<
  typeof relativeDateFilterDirectionSchema
>;
