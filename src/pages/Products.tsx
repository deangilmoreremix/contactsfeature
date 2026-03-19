import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  FileText,
  RefreshCw,
  ArrowLeft,
  LayoutGrid,
  List,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useUserProducts } from '../hooks/useUserProducts';
import { useProductMatches, useProductDrafts } from '../hooks/useProductMatches';
import { ProductCard } from '../components/products/ProductCard';
import { ProductWizard } from '../components/products/ProductWizard';
import { ProductMatchDashboard } from '../components/products/ProductMatchDashboard';
import { DraftManager } from '../components/products/DraftManager';
import { ModernButton } from '../components/ui/ModernButton';
import { SmartTooltip } from '../components/ui/SmartTooltip';
import type { UserProduct, CreateProductInput } from '../types/userProduct';
import { supabase } from '../lib/supabase';
import Fuse from 'fuse.js';

type ViewMode = 'library' | 'matches' | 'drafts';
type DisplayMode = 'grid' | 'list';

interface ProductStats {
  [productId: string]: {
    matchCount: number;
    highFitCount: number;
    draftCount: number;
  };
}

interface ProductsProps {
  onNavigateBack?: () => void;
}

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

const sortOptions = [
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
];

export default function Products({ onNavigateBack }: ProductsProps) {
  const {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    archiveProduct,
    refreshProducts,
  } = useUserProducts();

  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UserProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productStats, setProductStats] = useState<ProductStats>({});

  const fuse = useMemo(() => new Fuse(products, {
    keys: ['name', 'tagline', 'category', 'description'],
    threshold: 0.3,
  }), [products]);

  useEffect(() => {
    const fetchStats = async () => {
      const stats: ProductStats = {};

      for (const product of products) {
        const [matchesRes, draftsRes] = await Promise.all([
          supabase
            .from('product_contact_matches')
            .select('match_score', { count: 'exact' })
            .eq('product_id', product.id),
          supabase
            .from('product_drafts')
            .select('id', { count: 'exact' })
            .eq('product_id', product.id),
        ]);

        const matches = matchesRes.data || [];
        const highFit = matches.filter(m => (m.match_score || 0) >= 80).length;

        stats[product.id] = {
          matchCount: matchesRes.count || 0,
          highFitCount: highFit,
          draftCount: draftsRes.count || 0,
        };
      }

      setProductStats(stats);
    };

    if (products.length > 0) {
      fetchStats();
    }
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults.map(r => r.item);
    }

    if (activeFilter === 'active') {
      result = result.filter(p => p.is_active);
    } else if (activeFilter === 'archived') {
      result = result.filter(p => !p.is_active);
    }

    switch (sortBy) {
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
    }

    return result;
  }, [products, searchQuery, activeFilter, sortBy, fuse]);

  const handleSaveProduct = async (input: CreateProductInput) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, input);
      } else {
        await createProduct(input);
      }
      setEditingProduct(null);
      setShowWizard(false);
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleEdit = (product: UserProduct) => {
    setEditingProduct(product);
    setShowWizard(true);
  };

  const handleDuplicate = async (product: UserProduct) => {
    const newName = `${product.name} (Copy)`;
    await duplicateProduct(product.id, newName);
  };

  const handleArchive = async (product: UserProduct) => {
    if (product.is_active) {
      await archiveProduct(product.id);
    } else {
      await updateProduct(product.id, { is_active: true });
    }
  };

  const handleDelete = async (product: UserProduct) => {
    if (confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`)) {
      await deleteProduct(product.id);
    }
  };

  const handleViewMatches = (product: UserProduct) => {
    setSelectedProduct(product);
    setViewMode('matches');
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkArchive = async () => {
    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId);
      if (product?.is_active) {
        await archiveProduct(productId);
      }
    }
    setSelectedProducts([]);
  };

  const activeFilterLabel = filterOptions.find(f => f.value === activeFilter)?.label || 'All';
  const sortLabel = sortOptions.find(s => s.value === sortBy)?.label || 'Newest First';

  if (viewMode === 'matches' && selectedProduct) {
    return (
      <ProductMatchDashboard
        product={selectedProduct}
        onBack={() => {
          setSelectedProduct(null);
          setViewMode('library');
        }}
      />
    );
  }

  if (viewMode === 'drafts') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('library')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Products
                </button>
                <span className="text-gray-400">/</span>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Drafts</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-65px)]">
          <DraftManager />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {onNavigateBack && (
                <button
                  onClick={onNavigateBack}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              )}
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  My Products
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {filteredProducts.length} products found
                  {selectedProducts.length > 0 && ` • ${selectedProducts.length} selected`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SmartTooltip featureId="view_drafts_button">
                <ModernButton
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('drafts')}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Drafts</span>
                </ModernButton>
              </SmartTooltip>

              <SmartTooltip featureId="add_product_button">
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingProduct(null);
                    setShowWizard(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </ModernButton>
              </SmartTooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFilterDropdownOpen(!isFilterDropdownOpen);
                setIsSortDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Filter className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{activeFilterLabel}</span>
            </button>
            {isFilterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {filterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setActiveFilter(option.value);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        activeFilter === option.value
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSortDropdownOpen(!isSortDropdownOpen);
                setIsFilterDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">Sort: {sortLabel}</span>
            </button>
            {isSortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        sortBy === option.value
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={refreshProducts}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setDisplayMode('grid')}
              className={`p-2 ${displayMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              className={`p-2 ${displayMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkArchive}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Archive Selected
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="text-sm text-gray-500 hover:underline"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first product to start matching contacts'}
            </p>
            {!searchQuery && (
              <ModernButton
                variant="primary"
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Product
              </ModernButton>
            )}
          </div>
        ) : (
          <div className={displayMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                matchCount={productStats[product.id]?.matchCount || 0}
                highFitCount={productStats[product.id]?.highFitCount || 0}
                draftCount={productStats[product.id]?.draftCount || 0}
                isSelected={selectedProducts.includes(product.id)}
                onSelect={() => handleProductSelect(product.id)}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewMatches={handleViewMatches}
                displayMode={displayMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <ProductWizard
          product={editingProduct || undefined}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowWizard(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
