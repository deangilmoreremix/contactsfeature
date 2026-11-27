import { PartialFieldMetadataItem } from '../../types/PartialFieldMetadataItem';
import { RecordGqlOperationFilter, RelationFilter } from '../../types/RecordGqlOperationFilter';
import { isNonEmptyArray } from '../array/isNonEmptyArray';
import { computeMorphRelationJoinColumnNames } from './computeMorphRelationJoinColumnNames';
import { type FieldShared } from './turnRecordFilterIntoGqlOperationFilter';

export const computeEmptyGqlOperationFilterForMorphRelation = ({
  correspondingFieldMetadataItem,
}: {
  correspondingFieldMetadataItem: Pick<PartialFieldMetadataItem, 'name'> &
    Pick<FieldShared, 'morphRelations'>;
}): RecordGqlOperationFilter => {
  const { name, morphRelations } = correspondingFieldMetadataItem;

  if (!isNonEmptyArray(morphRelations)) {
    return { [`${name}Id`]: { is: 'NULL' } satisfies RelationFilter };
  }

  return {
    and: computeMorphRelationJoinColumnNames({
      fieldMetadataItem: correspondingFieldMetadataItem,
    }).map((joinColumnName) => ({
      [joinColumnName]: { is: 'NULL' } satisfies RelationFilter,
    })),
  };
};
