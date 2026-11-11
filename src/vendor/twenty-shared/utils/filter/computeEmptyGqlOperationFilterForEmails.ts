import { EmailsFilter, RecordGqlOperationFilter } from '../../types/RecordGqlOperationFilter';
import { PartialFieldMetadataItem } from '../../types/PartialFieldMetadataItem';
import { CustomError } from '../errors/CustomError';

import { type RecordFilter } from './turnRecordFilterGroupIntoGqlOperationFilter';
import { isNonEmptyString } from '@sniptt/guards';

export const computeEmptyGqlOperationFilterForEmails = ({
  recordFilter,
  correspondingFieldMetadataItem,
}: {
  recordFilter: Omit<RecordFilter, 'id'>;
  correspondingFieldMetadataItem: Pick<
    PartialFieldMetadataItem,
    'name' | 'type'
  >;
}): RecordGqlOperationFilter => {
  const subFieldName = recordFilter.subFieldName;
  const isSubFieldFilter = isNonEmptyString(subFieldName);

  if (isSubFieldFilter) {
    switch (subFieldName) {
      case 'primaryEmail': {
        return {
          or: [
            {
              [correspondingFieldMetadataItem.name]: {
                primaryEmail: { eq: '' },
              } satisfies EmailsFilter,
            },
            {
              [correspondingFieldMetadataItem.name]: {
                primaryEmail: { is: 'NULL' },
              } satisfies EmailsFilter,
            },
          ],
        };
      }
      case 'additionalEmails': {
        return {
          or: [
            {
              [correspondingFieldMetadataItem.name]: {
                additionalEmails: { is: 'NULL' },
              } satisfies EmailsFilter,
            },
            {
              [correspondingFieldMetadataItem.name]: {
                additionalEmails: { like: '[]' },
              } satisfies EmailsFilter,
            },
          ],
        };
      }
      default: {
        throw new CustomError(
          `Unknown subfield name ${subFieldName}`,
          'UNKNOWN_SUBFIELD_NAME',
        );
      }
    }
  }

  return {
    and: [
      {
        or: [
          {
            [correspondingFieldMetadataItem.name]: {
              primaryEmail: { eq: '' },
            } satisfies EmailsFilter,
          },
          {
            [correspondingFieldMetadataItem.name]: {
              primaryEmail: { is: 'NULL' },
            } satisfies EmailsFilter,
          },
        ],
      },
      {
        or: [
          {
            [correspondingFieldMetadataItem.name]: {
              additionalEmails: { is: 'NULL' },
            } satisfies EmailsFilter,
          },
          {
            [correspondingFieldMetadataItem.name]: {
              additionalEmails: { like: '[]' },
            } satisfies EmailsFilter,
          },
        ],
      },
    ],
  };
};
