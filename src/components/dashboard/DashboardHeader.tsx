import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { ChevronDown, Play } from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  const [timeFrame, setTimeFrame] = useState('This Month');

  const timeFrameOptions = ['This Week', 'This Month', 'This Quarter', 'This Year'];

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Your real-time sales performance overview</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Frame Selector */}
          <div className="relative">
            <select 
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="appearance-none bg-white/80 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeFrameOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Take Tour Button */}
          <ModernButton variant="outline" className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Take Tour</span>
          </ModernButton>
        </div>
      </div>
    </GlassCard>
  );
};