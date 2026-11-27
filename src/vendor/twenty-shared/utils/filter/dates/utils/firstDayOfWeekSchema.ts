import { FirstDayOfTheWeek } from '../../../../types/FirstDayOfTheWeek';
import z from 'zod/v4';

export const firstDayOfWeekSchema = z.enum([
  FirstDayOfTheWeek.MONDAY,
  FirstDayOfTheWeek.SATURDAY,
  FirstDayOfTheWeek.SUNDAY,
]);

export type FirstDayOfTheWeekSchema = z.infer<typeof firstDayOfWeekSchema>;
