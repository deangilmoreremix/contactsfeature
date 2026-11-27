import { FirstDayOfTheWeek } from '../../../../types/FirstDayOfTheWeek';
import { assertUnreachable } from '../../../assertUnreachable';
import { type FirstDayOfTheWeekSchema } from './firstDayOfWeekSchema';

export const getFirstDayOfTheWeekAsISONumber = (
  firstDayOfTheWeek: FirstDayOfTheWeekSchema,
): 1 | 6 | 7 => {
  switch (firstDayOfTheWeek) {
    case FirstDayOfTheWeek.MONDAY:
      return 1;
    case FirstDayOfTheWeek.SATURDAY:
      return 6;
    case FirstDayOfTheWeek.SUNDAY:
      return 7;
    default:
      return assertUnreachable(firstDayOfTheWeek);
  }
};
