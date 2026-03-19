import { useState } from 'react';
import {
  Package,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2,
  Users,
  Target,
  FileText,
  TrendingUp,
  Building,
  Briefcase,
  Check,
  List,
  ArrowRight,
} from 'lucide-react';
import type { UserProduct } from '../../types/userProduct';

interface ProductCardProps {
  product: UserProduct;
  matchCount?: number;
  highFitCount?: number;
  draftCount?: number;
  isSelected?: boolean;
  onSelect?: (productId: string) => void;
  onEdit: (product: UserProduct) => void;
  onDuplicate: (product: UserProduct) => void;
  onArchive: (product: UserProduct) => void;
  onDelete: (product: UserProduct) => void;
  onViewMatches: (product: UserProduct) => void;
  displayMode?: 'grid' | 'list';
}

export function ProductCard({
  product,
  matchCount = 0,
  highFitCount = 0,
  draftCount = 0,
  isSelected = false,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onViewMatches,
  displayMode = 'grid',
}: ProductCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getPricingLabel = () => {
    switch (product.pricing_model) {
      case 'subscription':
        return 'Subscription';
      case 'one-time':
        return 'One-Time';
      case 'freemium':
        return 'Freemium';
      default:
        return 'Custom';
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(product.id);
    }
  };

  if (displayMode === 'list') {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border ${
          product.is_active
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-gray-300 dark:border-gray-600 opacity-75'
        } shadow-sm hover:shadow-md transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
        }`}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Selection Checkbox */}
          {onSelect && (
            <button
              onClick={handleSelect}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-blue-500 border-blue-500 dark:bg-blue-400 dark:border-blue-400'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          )}

          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {product.name}
              </h3>
              {product.category && (
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full shrink-0">
                  {product.category}
                </span>
              )}
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full shrink-0">
                {getPricingLabel()}
              </span>
              {!product.is_active && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full shrink-0">
                  Archived
                </span>
              )}
            </div>
            {product.tagline && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {product.tagline}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{matchCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{highFitCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Fit</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{draftCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={() => {
                        onEdit(product);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onDuplicate(product);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        onArchive(product);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      {product.is_active ? 'Archive' : 'Restore'}
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        onDelete(product);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onViewMatches(product)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              View
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border ${
        product.is_active
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-gray-300 dark:border-gray-600 opacity-75'
      } shadow-sm hover:shadow-md transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Selection Checkbox */}
            {onSelect && (
              <button
                onClick={handleSelect}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500 dark:bg-blue-400 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            )}

            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h3>
              {product.tagline && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{product.tagline}</p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={() => {
                      onEdit(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onArchive(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    {product.is_active ? 'Archive' : 'Restore'}
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      onDelete(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {product.category && (
            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              {product.category}
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
            {getPricingLabel()}
          </span>
          {!product.is_active && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
              Archived
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
              <Users className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{matchCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Matches</p>
          </div>
          <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <Target className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{highFitCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">High Fit</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{draftCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {product.target_industries.length > 0 && (
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {product.target_industries.slice(0, 3).join(', ')}
                {product.target_industries.length > 3 && ` +${product.target_industries.length - 3}`}
              </p>
            </div>
          )}
          {product.target_titles.length > 0 && (
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {product.target_titles.slice(0, 3).join(', ')}
                {product.target_titles.length > 3 && ` +${product.target_titles.length - 3}`}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => onViewMatches(product)}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Find Matching Contacts
        </button>
      </div>
    </div>
  );
}
