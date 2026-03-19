import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  UserProduct,
  CreateProductInput,
  UpdateProductInput,
} from '../types/userProduct';

interface UseUserProductsReturn {
  products: UserProduct[];
  loading: boolean;
  error: string | null;
  createProduct: (input: CreateProductInput) => Promise<UserProduct | null>;
  updateProduct: (id: string, input: UpdateProductInput) => Promise<UserProduct | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  duplicateProduct: (id: string, newName: string) => Promise<UserProduct | null>;
  archiveProduct: (id: string) => Promise<boolean>;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => UserProduct | undefined;
}

export function useUserProducts(): UseUserProductsReturn {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProducts([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setProducts(data as UserProduct[]);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (input: CreateProductInput): Promise<UserProduct | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to create a product');
        return null;
      }

      const { data, error: createError } = await supabase
        .from('user_products')
        .insert({
          ...input,
          user_id: user.id,
          pricing_model: input.pricing_model || 'custom',
          pricing_tiers: input.pricing_tiers || [],
          features: input.features || [],
          target_industries: input.target_industries || [],
          target_company_sizes: input.target_company_sizes || [],
          target_titles: input.target_titles || [],
          target_departments: input.target_departments || [],
          value_propositions: input.value_propositions || [],
          pain_points_addressed: input.pain_points_addressed || [],
          competitive_advantages: input.competitive_advantages || [],
          use_cases: input.use_cases || [],
          collateral_urls: input.collateral_urls || [],
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      const newProduct = data as UserProduct;
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
      return null;
    }
  }, []);

  const updateProduct = useCallback(async (
    id: string,
    input: UpdateProductInput
  ): Promise<UserProduct | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('user_products')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedProduct = data as UserProduct;
      setProducts(prev =>
        prev.map(p => (p.id === id ? updatedProduct : p))
      );
      return updatedProduct;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
      return null;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('user_products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setProducts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      return false;
    }
  }, []);

  const duplicateProduct = useCallback(async (
    id: string,
    newName: string
  ): Promise<UserProduct | null> => {
    try {
      const original = products.find(p => p.id === id);
      if (!original) {
        setError('Product not found');
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in');
        return null;
      }

      const { id: _, user_id: __, created_at: ___, updated_at: ____, ...productData } = original;

      const { data, error: duplicateError } = await supabase
        .from('user_products')
        .insert({
          ...productData,
          name: newName,
          user_id: user.id,
        })
        .select()
        .single();

      if (duplicateError) {
        throw duplicateError;
      }

      const duplicatedProduct = data as UserProduct;
      setProducts(prev => [duplicatedProduct, ...prev]);
      return duplicatedProduct;
    } catch (err) {
      console.error('Error duplicating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate product');
      return null;
    }
  }, [products]);

  const archiveProduct = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateProduct(id, { is_active: false });
    return result !== null;
  }, [updateProduct]);

  const getProductById = useCallback((id: string): UserProduct | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    archiveProduct,
    refreshProducts: fetchProducts,
    getProductById,
  };
}
