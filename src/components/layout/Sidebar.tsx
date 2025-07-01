import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { 
  Home, 
  Users, 
  BarChart3, 
  Calendar, 
  Settings, 
  HelpCircle,
  TrendingUp,
  FileText,
  Star
} from 'lucide-react';

interface SidebarProps {
  onContactsClick?: () => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', active: true, key: 'dashboard' },
  { icon: Users, label: 'Contacts', active: false, key: 'contacts' },
  { icon: TrendingUp, label: 'Leads', active: false, key: 'leads' },
  { icon: BarChart3, label: 'Analytics', active: false, key: 'analytics' },
  { icon: Calendar, label: 'Calendar', active: false, key: 'calendar' },
  { icon: FileText, label: 'Reports', active: false, key: 'reports' },
  { icon: Star, label: 'Favorites', active: false, key: 'favorites' },
  { icon: Settings, label: 'Settings', active: false, key: 'settings' },
  { icon: HelpCircle, label: 'Help', active: false, key: 'help' },
];

export const Sidebar: React.FC<SidebarProps> = ({ onContactsClick }) => {
  const handleItemClick = (key: string) => {
    if (key === 'contacts' && onContactsClick) {
      onContactsClick();
    }
  };

  return (
    <div className="w-16 h-full flex flex-col py-6">
      <GlassCard className="flex-1 p-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-col space-y-4">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleItemClick(item.key)}
                  className={`
                    p-2 rounded-lg transition-all duration-200 group relative
                    ${item.active 
                      ? 'bg-blue-500/20 text-blue-600' 
                      : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="absolute left-12 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </GlassCard>
    </div>
  );
};