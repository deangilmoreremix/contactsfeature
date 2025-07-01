import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Trophy } from 'lucide-react';

const kpiData = [
  {
    title: 'Active Deals',
    value: '47',
    change: '+12.5%',
    trend: 'up',
    icon: Target,
    color: 'bg-blue-500'
  },
  {
    title: 'Pipeline Value',
    value: '$2.4M',
    change: '+18.2%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-green-500'
  },
  {
    title: 'Average Deal Size',
    value: '$51,064',
    change: '+5.7%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-purple-500'
  },
  {
    title: 'Won Value',
    value: '$892K',
    change: '-2.3%',
    trend: 'down',
    icon: Trophy,
    color: 'bg-yellow-500'
  }
];

export const KPICards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <GlassCard key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${kpi.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center space-x-1 ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{kpi.change}</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</h3>
              <p className="text-sm text-gray-600">{kpi.title}</p>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};