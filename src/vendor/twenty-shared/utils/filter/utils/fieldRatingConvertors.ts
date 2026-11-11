import { RATING_VALUES } from '../../../constants/RatingValues';
import { FieldRatingValue } from '../../../types/FieldRatingValue';

export const convertGreaterThanOrEqualRatingToArrayOfRatingValues = (
  greaterThanValue: number,
) =>
  RATING_VALUES.filter(
    (ratingValue) => Number(ratingValue.split('_')[1]) >= greaterThanValue,
  );

export const convertLessThanOrEqualRatingToArrayOfRatingValues = (
  lessThanValue: number,
) =>
  RATING_VALUES.filter(
    (ratingValue) => Number(ratingValue.split('_')[1]) <= lessThanValue,
  );

export const convertRatingToRatingValue = (rating: number) =>
  `RATING_${rating}` as FieldRatingValue;
