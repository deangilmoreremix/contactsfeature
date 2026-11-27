import { ViewFilterOperand } from '../../types/ViewFilterOperand';
import { isDefined } from '../validation/isDefined';

import { isRecordFilterOperandExpectingValue } from './isRecordFilterOperandExpectingValue';

export const isRecordFilterValueValid = (recordFilter: {
  operand: ViewFilterOperand;
  value: string | undefined;
}): boolean => {
  if (!isRecordFilterOperandExpectingValue(recordFilter.operand)) {
    return true;
  }

  return (
    isDefined(recordFilter.value) &&
    recordFilter.value !== '' &&
    recordFilter.value !== '[]'
  );
};
