import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { ModernButton } from '../ui/ModernButton';
import { Search, Bell, Settings, ChevronDown } from 'lucide-react';

const navigationTabs = [
  { label: 'Book Summaries', active: false },
  { label: 'Founders', active: false },
  { label: 'Finance', active: false },
  { label: 'Contacts', active: true },
  { label: 'Growth', active: false },
  { label: 'Contact', active: false },
  { label: 'Projects', active: false },
];

export const TopBar: React.FC = () => {
  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-between p-4">
        {/* Left Side - Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg">salesforce</span>
          </div>
          
          <nav className="flex space-x-1">
            {navigationTabs.map((tab, index) => (
              <button
                key={index}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${tab.active 
                    ? 'bg-black text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Side - Search, Notifications, Profile */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <AvatarWithStatus
              src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
              alt="User Avatar"
              size="sm"
              status="active"
            />
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};