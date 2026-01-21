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
} from 'lucide-react';
import type { UserProduct } from '../../types/userProduct';

interface ProductCardProps {
  product: UserProduct;
  matchCount?: number;
  highFitCount?: number;
  draftCount?: number;
  onEdit: (product: UserProduct) => void;
  onDuplicate: (product: UserProduct) => void;
  onArchive: (product: UserProduct) => void;
  onDelete: (product: UserProduct) => void;
  onViewMatches: (product: UserProduct) => void;
}

export function ProductCard({
  product,
  matchCount = 0,
  highFitCount = 0,
  draftCount = 0,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onViewMatches,
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

  return (
    <div className={`bg-white rounded-xl border ${product.is_active ? 'border-gray-200' : 'border-gray-300 opacity-75'} shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              {product.tagline && (
                <p className="text-sm text-gray-500 line-clamp-1">{product.tagline}</p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onEdit(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onArchive(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    {product.is_active ? 'Archive' : 'Restore'}
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete(product);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              {product.category}
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {getPricingLabel()}
          </span>
          {!product.is_active && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              Archived
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <Users className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{matchCount}</p>
            <p className="text-xs text-gray-500">Matches</p>
          </div>
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <Target className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-emerald-600">{highFitCount}</p>
            <p className="text-xs text-gray-500">High Fit</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{draftCount}</p>
            <p className="text-xs text-gray-500">Drafts</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {product.target_industries.length > 0 && (
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 line-clamp-1">
                {product.target_industries.slice(0, 3).join(', ')}
                {product.target_industries.length > 3 && ` +${product.target_industries.length - 3}`}
              </p>
            </div>
          )}
          {product.target_titles.length > 0 && (
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 line-clamp-1">
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
