import React from 'react';
import { ViewType } from '../../types/view';
import { useView } from '../../contexts/ViewContext';
import {
  LayoutList,
  Table,
  LayoutGrid,
  Calendar,
  BarChart3,
  GitBranch
} from 'lucide-react';

const viewConfig = [
  { type: 'list' as ViewType, icon: LayoutList, label: 'List', description: 'Card view with detailed information' },
  { type: 'table' as ViewType, icon: Table, label: 'Table', description: 'Spreadsheet view with sortable columns' },
  { type: 'kanban' as ViewType, icon: LayoutGrid, label: 'Kanban', description: 'Drag & drop pipeline management' },
  { type: 'calendar' as ViewType, icon: Calendar, label: 'Calendar', description: 'Activity timeline with scheduling' },
  { type: 'dashboard' as ViewType, icon: BarChart3, label: 'Dashboard', description: 'Analytics and insights' },
  { type: 'timeline' as ViewType, icon: GitBranch, label: 'Timeline', description: 'Chronological contact journey' }
];

export function ViewSwitcher() {
  const { currentView, setCurrentView } = useView();

  return (
    <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 border border-gray-200 dark:border-gray-700">
      {viewConfig.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.type;

        return (
          <button
            key={view.type}
            onClick={() => setCurrentView(view.type)}
            className={`
              group relative flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
            title={view.description}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline text-sm font-medium">
              {view.label}
            </span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
              {view.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
