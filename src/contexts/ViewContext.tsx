import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ViewType, ViewFilterConfig, ViewSortConfig } from '../types/view';
import { viewPreferencesService } from '../services/viewPreferences.service';
import { logger } from '../services/logger.service';

interface ViewContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => Promise<void>;
  filters: Record<ViewType, ViewFilterConfig>;
  setFilters: (view: ViewType, filters: ViewFilterConfig) => Promise<void>;
  sortConfig: Record<ViewType, ViewSortConfig>;
  setSortConfig: (view: ViewType, sort: ViewSortConfig) => Promise<void>;
  isLoading: boolean;
  resetFilters: (view?: ViewType) => Promise<void>;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

const defaultFilters: ViewFilterConfig = {};
const defaultSort: ViewSortConfig = { field: 'createdAt', direction: 'desc' };

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentViewState] = useState<ViewType>('list');
  const [filters, setFiltersState] = useState<Record<ViewType, ViewFilterConfig>>({
    list: defaultFilters,
    table: defaultFilters,
    kanban: defaultFilters,
    calendar: defaultFilters,
    dashboard: defaultFilters,
    timeline: defaultFilters,
  });
  const [sortConfig, setSortConfigState] = useState<Record<ViewType, ViewSortConfig>>({
    list: defaultSort,
    table: defaultSort,
    kanban: defaultSort,
    calendar: defaultSort,
    dashboard: defaultSort,
    timeline: defaultSort,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);

      // Initialize with default values first to ensure ViewSwitcher renders
      setCurrentViewState('list');
      setFiltersState({
        list: defaultFilters,
        table: defaultFilters,
        kanban: defaultFilters,
        calendar: defaultFilters,
        dashboard: defaultFilters,
        timeline: defaultFilters,
      });
      setSortConfigState({
        list: defaultSort,
        table: defaultSort,
        kanban: defaultSort,
        calendar: defaultSort,
        dashboard: defaultSort,
        timeline: defaultSort,
      });

      // Try to load from Supabase, but don't fail if it doesn't work
      try {
        const viewPrefs = await viewPreferencesService.getUserViewPreferences();
        if (viewPrefs) {
          setCurrentViewState(viewPrefs.view_type);
        }

        const viewTypes: ViewType[] = ['list', 'table', 'kanban', 'calendar', 'dashboard', 'timeline'];
        const loadedFilters: Record<ViewType, ViewFilterConfig> = { ...filters };
        const loadedSorts: Record<ViewType, ViewSortConfig> = { ...sortConfig };

        for (const viewType of viewTypes) {
          const viewFilters = await viewPreferencesService.getViewFilters(viewType);
          if (viewFilters) {
            loadedFilters[viewType] = viewFilters.filter_config || defaultFilters;
            loadedSorts[viewType] = viewFilters.sort_config || defaultSort;
          }
        }

        setFiltersState(loadedFilters);
        setSortConfigState(loadedSorts);
      } catch (supabaseError) {
        // Supabase errors are expected in demo mode, just log and continue
        logger.info('Using default view preferences (Supabase not available)', supabaseError as Error);
      }
    } catch (error) {
      logger.error('Failed to load view preferences', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentView = async (view: ViewType) => {
    try {
      setCurrentViewState(view);
      await viewPreferencesService.setCurrentView(view);
    } catch (error) {
      logger.error('Failed to set current view', error as Error);
    }
  };

  const setFilters = async (view: ViewType, newFilters: ViewFilterConfig) => {
    try {
      const updatedFilters = { ...filters, [view]: newFilters };
      setFiltersState(updatedFilters);

      await viewPreferencesService.saveViewFilters(
        view,
        newFilters,
        sortConfig[view]
      );
    } catch (error) {
      logger.error('Failed to save filters', error as Error);
    }
  };

  const setSortConfig = async (view: ViewType, sort: ViewSortConfig) => {
    try {
      const updatedSort = { ...sortConfig, [view]: sort };
      setSortConfigState(updatedSort);

      await viewPreferencesService.saveViewFilters(
        view,
        filters[view],
        sort
      );
    } catch (error) {
      logger.error('Failed to save sort config', error as Error);
    }
  };

  const resetFilters = async (view?: ViewType) => {
    try {
      if (view) {
        const updatedFilters = { ...filters, [view]: defaultFilters };
        const updatedSort = { ...sortConfig, [view]: defaultSort };
        setFiltersState(updatedFilters);
        setSortConfigState(updatedSort);
      } else {
        setFiltersState({
          list: defaultFilters,
          table: defaultFilters,
          kanban: defaultFilters,
          calendar: defaultFilters,
          dashboard: defaultFilters,
          timeline: defaultFilters,
        });
        setSortConfigState({
          list: defaultSort,
          table: defaultSort,
          kanban: defaultSort,
          calendar: defaultSort,
          dashboard: defaultSort,
          timeline: defaultSort,
        });
      }

      await viewPreferencesService.resetViewPreferences(view);
    } catch (error) {
      logger.error('Failed to reset filters', error as Error);
    }
  };

  return (
    <ViewContext.Provider
      value={{
        currentView,
        setCurrentView,
        filters,
        setFilters,
        sortConfig,
        setSortConfig,
        isLoading,
        resetFilters,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
