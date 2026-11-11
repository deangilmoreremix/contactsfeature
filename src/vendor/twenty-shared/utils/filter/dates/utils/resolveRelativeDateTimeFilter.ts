import { addUnitToZonedDateTime } from './addUnitToZonedDateTime';
import { getNextPeriodStart } from './getNextPeriodStart';
import { getPeriodStart } from './getPeriodStart';
import { type RelativeDateFilter } from './relativeDateFilterSchema';
import { subUnitFromZonedDateTime } from './subUnitFromZonedDateTime';
import { isDefined } from '../../../validation/isDefined';
import { type Temporal } from 'temporal-polyfill';

export const resolveRelativeDateTimeFilter = (
  relativeDateFilter: RelativeDateFilter,
  referenceZonedDateTime: Temporal.ZonedDateTime,
) => {
  const { direction, amount, unit, firstDayOfTheWeek } = relativeDateFilter;

  switch (direction) {
    case 'NEXT': {
      if (!isDefined(amount)) {
        throw new Error('Amount is required');
      }

      const startOfNextPeriod = getNextPeriodStart(
        referenceZonedDateTime,
        unit,
        firstDayOfTheWeek,
      );

      return {
        ...relativeDateFilter,
        start: startOfNextPeriod,
        end: addUnitToZonedDateTime(startOfNextPeriod, unit, amount),
      };
    }
    case 'PAST': {
      if (!isDefined(amount)) {
        throw new Error('Amount is required');
      }

      const startOfCurrentPeriod = getPeriodStart(
        referenceZonedDateTime,
        unit,
        firstDayOfTheWeek,
      );

      return {
        ...relativeDateFilter,
        start: subUnitFromZonedDateTime(startOfCurrentPeriod, unit, amount),
        end: startOfCurrentPeriod,
      };
    }
    case 'THIS':
      return {
        ...relativeDateFilter,
        start: getPeriodStart(referenceZonedDateTime, unit, firstDayOfTheWeek),
        end: getNextPeriodStart(
          referenceZonedDateTime,
          unit,
          firstDayOfTheWeek,
        ),
      };
  }
};
