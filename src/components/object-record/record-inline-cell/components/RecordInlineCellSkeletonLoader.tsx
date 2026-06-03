import { useRecordInlineCellContext } from './RecordInlineCellContext';
import { Skeleton } from '../../../../components/ui/skeleton';

export const RecordInlineCellSkeletonLoader = () => {
  const { isDisplayModeFixHeight } = useRecordInlineCellContext();

  return (
    <div
      className="flex items-center h-6 w-full"
      style={{ height: isDisplayModeFixHeight ? 16 : undefined }}
    >
      <Skeleton className="h-4 w-full" />
    </div>
  );
};
