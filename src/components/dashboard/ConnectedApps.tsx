import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ExternalLink, Zap, Target, FileText } from 'lucide-react';

const connectedApps = [
  {
    name: 'Smart CRM Closer',
    description: 'Advanced deal closing platform',
    icon: Target,
    color: 'bg-blue-500',
    status: 'Connected'
  },
  {
    name: 'FunnelCraft AI',
    description: 'AI-powered funnel builder',
    icon: Zap,
    color: 'bg-purple-500',
    status: 'Connected'
  },
  {
    name: 'Content AI',
    description: 'Content generation platform',
    icon: FileText,
    color: 'bg-green-500',
    status: 'Connected'
  }
];

export const ConnectedApps: React.FC = () => {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Connected Applications</h3>
        <ExternalLink className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {connectedApps.map((app, index) => {
          const Icon = app.icon;
          return (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className={`${app.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{app.name}</h4>
                  <p className="text-sm text-gray-600">{app.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600 font-medium">{app.status}</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};