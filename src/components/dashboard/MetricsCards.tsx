import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

const metrics = [
  {
    icon: DollarSign,
    label: 'Won from Deals This Month',
    value: '1,980,130',
    change: '+11% vs last month',
    changeLabel: '+11% vs last month',
    color: 'bg-yellow-500',
    trend: 'up',
    badge: '+11% vs last month'
  },
  {
    icon: Users,
    label: 'New Customer for Week',
    value: '89',
    change: '+12.5%',
    changeLabel: '+12.5%',
    color: 'bg-blue-500',
    trend: 'up',
    badge: '+12 vs last month'
  },
  {
    icon: Calendar,
    label: 'New Tasks for Week',
    value: '31',
    change: '+4 today',
    changeLabel: '+4 today',
    color: 'bg-gray-600',
    trend: 'up',
    badge: '+4 today'
  }
];

export const MetricsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <GlassCard key={index} className="p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`${metric.color} p-3 rounded-lg shadow-md`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {index === 0 && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-semibold">
                    +11% vs last month
                  </span>
                )}
                {index === 1 && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-semibold">
                    +12 vs last month
                  </span>
                )}
                {index === 2 && (
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold">
                    +4 today
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{metric.label}</p>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};