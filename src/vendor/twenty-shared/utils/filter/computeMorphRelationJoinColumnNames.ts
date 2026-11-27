import { PartialFieldMetadataItem } from '../../types/PartialFieldMetadataItem';
import { computeMorphRelationGqlFieldJoinColumnName } from '../fieldMetadata/compute-relation-gql-field-join-column-name';
import { type FieldShared } from './turnRecordFilterIntoGqlOperationFilter';

export const computeMorphRelationJoinColumnNames = ({
  fieldMetadataItem,
}: {
  fieldMetadataItem: Pick<PartialFieldMetadataItem, 'name'> &
    Pick<FieldShared, 'morphRelations'>;
}): string[] =>
  (fieldMetadataItem.morphRelations ?? []).map((morphRelation) =>
    computeMorphRelationGqlFieldJoinColumnName({
      fieldName: fieldMetadataItem.name,
      relationType: morphRelation.type,
      targetObjectMetadataNameSingular:
        morphRelation.targetObjectMetadata.nameSingular,
      targetObjectMetadataNamePlural:
        morphRelation.targetObjectMetadata.namePlural,
    }),
  );
