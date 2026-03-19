import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileText,
  TrendingUp,
  LayoutGrid,
  List,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useUserProducts } from '../hooks/useUserProducts';
import { useProductMatches, useProductDrafts } from '../hooks/useProductMatches';
import { ProductCard } from '../components/products/ProductCard';
import { ProductWizard } from '../components/products/ProductWizard';
import { ProductMatchDashboard } from '../components/products/ProductMatchDashboard';
import { DraftManager } from '../components/products/DraftManager';
import type { UserProduct, CreateProductInput } from '../types/userProduct';
import { supabase } from '../lib/supabase';

type ViewMode = 'library' | 'matches' | 'drafts';

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
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UserProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [productStats, setProductStats] = useState<ProductStats>({});

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
        const highFit = matches.filter(m => m.match_score >= 80).length;

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

  const filteredProducts = products.filter(product => {
    if (!showArchived && !product.is_active) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.tagline?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSaveProduct = async (input: CreateProductInput) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, input);
    } else {
      await createProduct(input);
    }
    setEditingProduct(null);
    setShowWizard(false);
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('library')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Products
                </button>
                <span className="text-gray-400">/</span>
                <h1 className="text-lg font-semibold text-gray-900">My Drafts</h1>
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {onNavigateBack && (
                <button
                  onClick={onNavigateBack}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">My Products</h1>
                <p className="text-sm text-gray-500">
                  {products.filter(p => p.is_active).length} active products
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('drafts')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                View Drafts
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowWizard(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show archived</span>
          </label>

          <button
            onClick={refreshProducts}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first product to start matching contacts'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                matchCount={productStats[product.id]?.matchCount || 0}
                highFitCount={productStats[product.id]?.highFitCount || 0}
                draftCount={productStats[product.id]?.draftCount || 0}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewMatches={handleViewMatches}
              />
            ))}
          </div>
        )}
      </div>

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
