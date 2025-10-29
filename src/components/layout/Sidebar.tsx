import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  Home,
  Users,
  BarChart3,
  Calendar,
  Settings,
  HelpCircle,
  TrendingUp,
  FileText,
  Star,
  CheckSquare,
  Brain
} from 'lucide-react';

interface SidebarProps {
  onContactsClick?: () => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', active: true, key: 'dashboard', featureId: 'nav_dashboard' },
  { icon: Users, label: 'Contacts', active: false, key: 'contacts', featureId: 'nav_contacts' },
  { icon: TrendingUp, label: 'Pipeline', active: false, key: 'pipeline', featureId: 'nav_pipeline' },
  { icon: CheckSquare, label: 'Tasks', active: false, key: 'tasks', featureId: 'nav_tasks' },
  { icon: Calendar, label: 'Appointments', active: false, key: 'appointments', featureId: 'nav_appointments' },
  { icon: Brain, label: 'AI Tools', active: false, key: 'ai_tools', featureId: 'nav_ai_tools' },
  { icon: FileText, label: 'Reports', active: false, key: 'reports', featureId: null },
  { icon: Settings, label: 'Settings', active: false, key: 'settings', featureId: null },
  { icon: HelpCircle, label: 'Help', active: false, key: 'help', featureId: null },
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
              const button = (
                <button
                  key={index}
                  onClick={() => handleItemClick(item.key)}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${item.active
                      ? 'bg-blue-500/20 text-blue-600'
                      : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );

              return item.featureId ? (
                <SmartTooltip
                  key={index}
                  featureId={item.featureId}
                  position="right"
                >
                  {button}
                </SmartTooltip>
              ) : (
                <div key={index} className="relative group">
                  {button}
                  <span className="absolute left-12 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </GlassCard>
    </div>
  );
};