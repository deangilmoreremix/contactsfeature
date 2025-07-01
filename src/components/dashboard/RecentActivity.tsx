import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const upcomingDeals = [
  {
    id: 1,
    company: 'TechCorp Solutions',
    value: '$85,000',
    probability: '85%',
    dueDate: 'Tomorrow',
    contact: 'Sarah Johnson',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
    status: 'active'
  },
  {
    id: 2,
    company: 'Innovation Labs',
    value: '$120,000',
    probability: '60%',
    dueDate: 'Friday',
    contact: 'Mike Chen',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
    status: 'pending'
  },
  {
    id: 3,
    company: 'Global Dynamics',
    value: '$95,500',
    probability: '75%',
    dueDate: 'Next Week',
    contact: 'Emily Davis',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
    status: 'success'
  }
];

const recentActivities = [
  {
    type: 'deal',
    icon: TrendingUp,
    title: 'Deal moved to negotiation',
    description: 'TechCorp Solutions - $85,000',
    time: '2 hours ago',
    color: 'text-blue-600'
  },
  {
    type: 'task',
    icon: CheckCircle,
    title: 'Task completed',
    description: 'Follow-up call with Innovation Labs',
    time: '4 hours ago',
    color: 'text-green-600'
  },
  {
    type: 'meeting',
    icon: Calendar,
    title: 'Meeting scheduled',
    description: 'Product demo with Global Dynamics',
    time: '6 hours ago',
    color: 'text-purple-600'
  },
  {
    type: 'alert',
    icon: AlertCircle,
    title: 'Deal at risk',
    description: 'No activity on Enterprise Corp deal',
    time: '1 day ago',
    color: 'text-yellow-600'
  }
];

export const RecentActivity: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Upcoming Deals */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deals</h3>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {upcomingDeals.map((deal) => (
            <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/80 transition-colors">
              <div className="flex items-center space-x-3">
                <AvatarWithStatus
                  src={deal.avatar}
                  alt={deal.contact}
                  size="sm"
                  status={deal.status as any}
                />
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{deal.company}</h4>
                  <p className="text-xs text-gray-600">{deal.contact}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 text-sm">{deal.value}</p>
                <p className="text-xs text-gray-600">{deal.probability} • {deal.dueDate}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Activity Feed */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">24 completed</span>
            <span className="text-sm text-gray-600">•</span>
            <span className="text-sm text-gray-600">8 pending</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {recentActivities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50/80 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                  <Icon className={`w-4 h-4 ${activity.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{activity.title}</h4>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};