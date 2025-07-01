import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types/contact';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  DollarSign, 
  Activity, 
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Users,
  Award,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

interface ContactAnalyticsProps {
  contact: Contact;
}

// Sample analytics data
const engagementData = [
  { month: 'Jan', emails: 12, calls: 4, meetings: 2, responses: 8 },
  { month: 'Feb', emails: 15, calls: 6, meetings: 3, responses: 12 },
  { month: 'Mar', emails: 18, calls: 5, meetings: 4, responses: 14 },
  { month: 'Apr', emails: 22, calls: 8, meetings: 5, responses: 18 },
  { month: 'May', emails: 20, calls: 7, meetings: 6, responses: 16 },
  { month: 'Jun', emails: 25, calls: 9, meetings: 7, responses: 20 }
];

const channelPerformance = [
  { name: 'Email', value: 45, responses: 32, color: '#3b82f6' },
  { name: 'Phone', value: 25, responses: 22, color: '#10b981' },
  { name: 'LinkedIn', value: 20, responses: 15, color: '#0077b5' },
  { name: 'SMS', value: 10, responses: 8, color: '#8b5cf6' }
];

const responseTimeData = [
  { day: 'Mon', avgTime: 4.2, interactions: 8 },
  { day: 'Tue', avgTime: 2.8, interactions: 12 },
  { day: 'Wed', avgTime: 3.5, interactions: 10 },
  { day: 'Thu', avgTime: 2.1, interactions: 15 },
  { day: 'Fri', avgTime: 5.8, interactions: 6 },
  { day: 'Sat', avgTime: 8.2, interactions: 2 },
  { day: 'Sun', avgTime: 12.5, interactions: 1 }
];

const dealProgressData = [
  { stage: 'Lead', value: 15, date: '2024-01-15' },
  { stage: 'Qualified', value: 35, date: '2024-01-18' },
  { stage: 'Demo', value: 55, date: '2024-01-22' },
  { stage: 'Proposal', value: 75, date: '2024-01-25' },
  { stage: 'Negotiation', value: 85, date: '2024-01-28' }
];

export const ContactAnalytics: React.FC<ContactAnalyticsProps> = ({ contact }) => {
  const [timeRange, setTimeRange] = useState('6m');
  const [selectedMetric, setSelectedMetric] = useState('engagement');

  const timeRanges = [
    { value: '1m', label: 'Last Month' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' }
  ];

  const metrics = [
    { id: 'engagement', label: 'Engagement', icon: Activity },
    { id: 'response', label: 'Response Rate', icon: MessageSquare },
    { id: 'pipeline', label: 'Pipeline Progress', icon: TrendingUp },
    { id: 'channels', label: 'Channel Performance', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Contact Analytics</h3>
          <p className="text-gray-600">Detailed performance metrics for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </ModernButton>
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </ModernButton>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">85%</p>
            <p className="text-sm text-gray-600">Engagement Score</p>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">78%</p>
            <p className="text-sm text-gray-600">Response Rate</p>
            <p className="text-xs text-green-600 mt-1">+5% from last month</p>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">3.2h</p>
            <p className="text-sm text-gray-600">Avg Response Time</p>
            <p className="text-xs text-red-600 mt-1">+0.8h from last month</p>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">$85K</p>
            <p className="text-sm text-gray-600">Pipeline Value</p>
            <p className="text-xs text-green-600 mt-1">+$15K from last month</p>
          </div>
        </GlassCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            Engagement Trends
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Area type="monotone" dataKey="emails" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="calls" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="meetings" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Channel Performance */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
            Channel Performance
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={channelPerformance}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {channelPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Response Time Analysis */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-500" />
            Response Time by Day
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Bar dataKey="avgTime" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Deal Progress */}
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-yellow-500" />
            Deal Progression
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dealProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Detailed Metrics Table */}
      <GlassCard className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Metric</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">This Period</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Previous Period</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Change</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Trend</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'Total Interactions', current: '52', previous: '47', change: '+10.6%', trend: 'up' },
                { metric: 'Email Opens', current: '42', previous: '38', change: '+10.5%', trend: 'up' },
                { metric: 'Call Duration (avg)', current: '18.5 min', previous: '16.2 min', change: '+14.2%', trend: 'up' },
                { metric: 'Meeting Attendance', current: '95%', previous: '88%', change: '+8.0%', trend: 'up' },
                { metric: 'Response Speed', current: '3.2 hours', previous: '2.4 hours', change: '+33.3%', trend: 'down' }
              ].map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{row.metric}</td>
                  <td className="py-3 px-4 text-gray-700">{row.current}</td>
                  <td className="py-3 px-4 text-gray-700">{row.previous}</td>
                  <td className={`py-3 px-4 font-medium ${
                    row.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {row.change}
                  </td>
                  <td className="py-3 px-4">
                    {row.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};