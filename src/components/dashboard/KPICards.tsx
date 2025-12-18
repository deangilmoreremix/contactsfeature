import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Trophy } from 'lucide-react';

const kpiData = [
  {
    title: 'Active Deals',
    value: '89',
    change: '+24.7%',
    trend: 'up',
    icon: Target,
    color: 'bg-blue-600'
  },
  {
    title: 'Pipeline Value',
    value: '$4.2M',
    change: '+31.8%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-green-600'
  },
  {
    title: 'Average Deal Size',
    value: '$72,450',
    change: '+18.3%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-blue-600'
  },
  {
    title: 'Monthly Recurring Revenue',
    value: '$1.8M',
    change: '+42.1%',
    trend: 'up',
    icon: Trophy,
    color: 'bg-purple-600'
  }
];

export const KPICards: React.FC = () => {
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Target values for animation
  const targetValues = [89, 4200000, 72450, 1800000];

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setIsAnimating(true);
      animateValues();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const animateValues = () => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = duration / steps;

    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedValues(prevValues =>
        prevValues.map((currentValue, index) => {
          const target = targetValues[index] || 0;
          const difference = target - 0; // Start from 0
          return Math.floor(0 + difference * progress);
        })
      );

      if (currentStep < steps) {
        setTimeout(animate, increment);
      }
    };

    animate();
  };

  const formatValue = (value: number, index: number) => {
    if (index === 1) { // Pipeline Value
      return `$${Math.floor(value / 1000000)}M`;
    } else if (index === 2) { // Average Deal Size
      return `$${value.toLocaleString()}`;
    } else if (index === 3) { // MRR
      return `$${Math.floor(value / 1000000)}.${Math.floor((value % 1000000) / 100000)}M`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
        const animatedValue = animatedValues[index];

        return (
          <GlassCard key={index} className="p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`${kpi.color} p-3 rounded-lg shadow-lg animate-pulse`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center space-x-1 ${
                kpi.trend === 'up' ? 'text-green-600 animate-bounce' : 'text-red-600'
              }`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{kpi.change}</span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1 transition-all duration-300">
                {isAnimating ? formatValue(animatedValue || 0, index) : '0'}
                {index === 0 && isAnimating && <span className="animate-pulse text-blue-500">↑</span>}
              </h3>
              <p className="text-sm text-gray-600">{kpi.title}</p>
              {isAnimating && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${((animatedValue || 0) / (targetValues[index] || 1)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};