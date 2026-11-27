import { isValidUuid } from '../../../validation/isValidUuid';
import { isValidVariable } from '../../../validation/isValidVariable';
import { z } from 'zod/v4';

export const strictArrayOfUuidOrVariableSchema = z.preprocess(
  (value) => {
    try {
      if (typeof value === 'string') {
        if (isValidVariable(value) as boolean) {
          return [value];
        }
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [value];
        }
      }
      return Array.isArray(value) ? value : [value];
    } catch {
      return [];
    }
  },
  z.array(
    z.string().refine((val) => {
      return isValidUuid(val) || isValidVariable(val);
    }, 'Must be a valid UUID or a variable with {{ }} syntax'),
  ),
);

export const arrayOfUuidOrVariableSchema =
  strictArrayOfUuidOrVariableSchema.catch([]);
