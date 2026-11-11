import { RecordFilterValueDependencies } from '../../types/RecordFilterValueDependencies';
import { RecordGqlOperationFilter } from '../../types/RecordGqlOperationFilter';
import {
  turnRecordFilterGroupsIntoGqlOperationFilter,
  type RecordFilter,
  type RecordFilterGroup,
} from './turnRecordFilterGroupIntoGqlOperationFilter';
import {
  type FieldShared,
  turnRecordFilterIntoRecordGqlOperationFilter,
} from './turnRecordFilterIntoGqlOperationFilter';
import { isDefined } from '../validation/isDefined';

export const computeRecordGqlOperationFilter = ({
  fieldMetadataItems,
  recordFilters,
  recordFilterGroups,
  filterValueDependencies,
}: {
  recordFilters: Omit<RecordFilter, 'id'>[];
  fieldMetadataItems: FieldShared[];
  recordFilterGroups: RecordFilterGroup[];
  filterValueDependencies: RecordFilterValueDependencies;
}): RecordGqlOperationFilter => {
  const fieldMetadataItemById = new Map(
    fieldMetadataItems.map((field) => [field.id, field]),
  );

  const regularRecordGqlOperationFilter: RecordGqlOperationFilter[] =
    recordFilters
      .filter((filter) => !isDefined(filter.recordFilterGroupId))
      .map((regularFilter) => {
        return turnRecordFilterIntoRecordGqlOperationFilter({
          recordFilter: regularFilter,
          fieldMetadataItemById,
          filterValueDependencies,
        });
      })
      .filter(isDefined);

  const outermostFilterGroupId = recordFilterGroups.find(
    (recordFilterGroup) => !recordFilterGroup.parentRecordFilterGroupId,
  )?.id;

  const advancedRecordGqlOperationFilter =
    turnRecordFilterGroupsIntoGqlOperationFilter({
      filterValueDependencies,
      filters: recordFilters,
      fieldMetadataItemById,
      recordFilterGroups,
      currentRecordFilterGroupId: outermostFilterGroupId,
    });

  const recordGqlOperationFilters = [
    ...regularRecordGqlOperationFilter,
    advancedRecordGqlOperationFilter,
  ].filter(isDefined);

  const [firstRecordGqlOperationFilter] = recordGqlOperationFilters;

  if (!isDefined(firstRecordGqlOperationFilter)) {
    return {};
  }

  if (recordGqlOperationFilters.length === 1) {
    return firstRecordGqlOperationFilter;
  }

  const recordGqlOperationFilter = {
    and: recordGqlOperationFilters,
  };

  return recordGqlOperationFilter;
};
