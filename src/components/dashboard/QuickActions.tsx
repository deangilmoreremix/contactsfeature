import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Plus, UserPlus, Calendar, Mail, Bot } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'New Deal',
      description: 'Create a new sales opportunity',
      icon: Plus,
      color: 'bg-blue-500'
    },
    {
      title: 'New Contact',
      description: 'Add a new contact to CRM',
      icon: UserPlus,
      color: 'bg-green-500'
    },
    {
      title: 'Schedule Meeting',
      description: 'AI-powered meeting agenda',
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      title: 'Send Email',
      description: 'AI email composer tool',
      icon: Mail,
      color: 'bg-yellow-500'
    }
  ];

  return (
    <GlassCard className="p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className={`${action.color} p-3 rounded-lg w-fit mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};