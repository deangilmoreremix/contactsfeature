import { AnimatePresence, motion } from 'framer-motion';
import { Pencil } from 'lucide-react';

export const RecordInlineCellEditButton = ({
  Icon,
  onClick,
}: {
  Icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      >
        <Icon ?? { Pencil } className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  </AnimatePresence>
);
