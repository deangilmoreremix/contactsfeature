import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

const metrics = [
  {
    icon: DollarSign,
    label: 'Monthly Recurring Revenue',
    value: '3,450,890',
    change: '+28% vs last month',
    changeLabel: '+28% vs last month',
    color: 'bg-green-500',
    trend: 'up',
    badge: '+28% vs last month'
  },
  {
    icon: Users,
    label: 'New Customers This Month',
    value: '156',
    change: '+42.7%',
    changeLabel: '+42.7%',
    color: 'bg-blue-500',
    trend: 'up',
    badge: '+47 vs last month'
  },
  {
    icon: Calendar,
    label: 'Active Playbook Executions',
    value: '23',
    change: '+9 this week',
    changeLabel: '+9 this week',
    color: 'bg-purple-500',
    trend: 'up',
    badge: '+9 this week'
  }
];

export const MetricsCards: React.FC = () => {
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Target values for animation
  const targetValues = [3450890, 156, 23];

  useEffect(() => {
    // Start animation after component mounts with a slight delay
    const timer = setTimeout(() => {
      setIsAnimating(true);
      animateValues();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const animateValues = () => {
    const duration = 2500; // 2.5 seconds
    const steps = 75;
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
    if (index === 0) { // MRR
      return `$${Math.floor(value / 1000000)}.${Math.floor((value % 1000000) / 100000)}M`;
    }
    return value.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const animatedValue = animatedValues[index];

        return (
          <GlassCard key={index} className="p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`${metric.color} p-3 rounded-lg shadow-md animate-pulse`}>
                <Icon className="w-6 h-6 text-white animate-bounce" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <p className="text-2xl font-bold text-gray-900 transition-all duration-500">
                  {isAnimating ? formatValue(animatedValue || 0, index) : '0'}
                  {isAnimating && <span className="animate-pulse text-green-500 ml-1">↗</span>}
                </p>
                {index === 0 && isAnimating && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-semibold animate-fade-in">
                    +28% vs last month
                  </span>
                )}
                {index === 1 && isAnimating && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-semibold animate-fade-in">
                    +47 vs last month
                  </span>
                )}
                {index === 2 && isAnimating && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-semibold animate-fade-in">
                    +9 this week
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{metric.label}</p>
              {isAnimating && (
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-purple-500'} h-2 rounded-full transition-all duration-1000 ease-out animate-pulse`}
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