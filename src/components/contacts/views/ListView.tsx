import React, { useState } from 'react';
import { Contact } from '../../../types/contact';
import { ViewDensity } from '../../../types/view';
import { AIEnhancedContactCard } from '../AIEnhancedContactCard';
import { ModernButton } from '../../ui/ModernButton';
import {
  LayoutList,
  Grid3x3,
  Maximize2,
  Minimize2,
  SlidersHorizontal
} from 'lucide-react';

interface ListViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

const densityConfig: Record<ViewDensity['type'], ViewDensity> = {
  compact: {
    type: 'compact',
    cardHeight: 120,
    padding: 12,
    fontSize: 'text-sm'
  },
  comfortable: {
    type: 'comfortable',
    cardHeight: 160,
    padding: 16,
    fontSize: 'text-base'
  },
  spacious: {
    type: 'spacious',
    cardHeight: 200,
    padding: 20,
    fontSize: 'text-lg'
  }
};

export function ListView({ contacts, onContactClick }: ListViewProps) {
  const [density, setDensity] = useState<ViewDensity['type']>('comfortable');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showDensityMenu, setShowDensityMenu] = useState(false);

  const currentDensity = densityConfig[density];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contacts
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({contacts.length} total)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Density Controls */}
          <div className="relative">
            <ModernButton
              variant="secondary"
              onClick={() => setShowDensityMenu(!showDensityMenu)}
              icon={SlidersHorizontal}
              className="text-sm"
            >
              Density
            </ModernButton>

            {showDensityMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setDensity('compact');
                      setShowDensityMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      density === 'compact'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Compact</span>
                  </button>
                  <button
                    onClick={() => {
                      setDensity('comfortable');
                      setShowDensityMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      density === 'comfortable'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <LayoutList className="w-4 h-4" />
                    <span className="text-sm font-medium">Comfortable</span>
                  </button>
                  <button
                    onClick={() => {
                      setDensity('spacious');
                      setShowDensityMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      density === 'spacious'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Spacious</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Display */}
      <div
        className={`
          overflow-y-auto
          ${viewMode === 'grid'
            ? 'grid gap-4 auto-rows-max'
            : 'flex flex-col gap-3'
          }
        `}
        style={{
          gridTemplateColumns: viewMode === 'grid'
            ? `repeat(auto-fill, minmax(${
                density === 'compact' ? '280px' :
                density === 'comfortable' ? '320px' :
                '360px'
              }, 1fr))`
            : undefined
        }}
      >
        {contacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onContactClick(contact)}
            className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
            style={{
              minHeight: viewMode === 'list' ? `${currentDensity.cardHeight}px` : undefined
            }}
          >
            <AIEnhancedContactCard
              contact={contact}
              density={density}
              viewMode={viewMode}
            />
          </div>
        ))}

        {contacts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <LayoutList className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No contacts found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Try adjusting your filters or add new contacts to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
