import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContactStore } from '../hooks/useContactStore';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalContacts: number;
  hotLeads: number;
  activeDeals: number;
  revenue: number;
  contactsChange: number;
  leadsChange: number;
  dealsChange: number;
  revenueChange: number;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  contact: string;
  description: string;
  timestamp: string;
}

export default function Dashboard() {
  const { contacts } = useContactStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    hotLeads: 0,
    activeDeals: 0,
    revenue: 0,
    contactsChange: 0,
    leadsChange: 0,
    dealsChange: 0,
    revenueChange: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Sample data for charts
  const salesData = [
    { month: 'Jan', revenue: 42000, deals: 12 },
    { month: 'Feb', revenue: 51000, deals: 15 },
    { month: 'Mar', revenue: 48000, deals: 14 },
    { month: 'Apr', revenue: 61000, deals: 18 },
    { month: 'May', revenue: 72000, deals: 22 },
    { month: 'Jun', revenue: 68000, deals: 20 },
  ];

  const leadSourceData = [
    { name: 'LinkedIn', value: 35, color: '#0A66C2' },
    { name: 'Email', value: 25, color: '#10B981' },
    { name: 'Referral', value: 20, color: '#F59E0B' },
    { name: 'Website', value: 15, color: '#8B5CF6' },
    { name: 'Other', value: 5, color: '#6B7280' },
  ];

  const pipelineData = [
    { stage: 'Prospect', count: 24 },
    { stage: 'Qualified', count: 18 },
    { stage: 'Proposal', count: 12 },
    { stage: 'Negotiation', count: 8 },
    { stage: 'Closed Won', count: 15 },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [contacts]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate stats from contacts
      const hotLeads = contacts.filter(c => c.interestLevel === 'hot').length;
      const totalContacts = contacts.length;

      // Simulate data changes
      const contactsChange = 12.5;
      const leadsChange = 8.3;
      const dealsChange = -3.2;
      const revenueChange = 15.7;

      setStats({
        totalContacts,
        hotLeads,
        activeDeals: 48,
        revenue: 342500,
        contactsChange,
        leadsChange,
        dealsChange,
        revenueChange,
      });

      // Load recent activities
      setRecentActivities([
        {
          id: '1',
          type: 'call',
          contact: 'Jane Doe',
          description: 'Discussed Q2 renewal and expansion opportunities',
          timestamp: '5 minutes ago',
        },
        {
          id: '2',
          type: 'email',
          contact: 'Cameron Williamson',
          description: 'Sent proposal for enterprise plan',
          timestamp: '1 hour ago',
        },
        {
          id: '3',
          type: 'meeting',
          contact: 'Leslie Alexander',
          description: 'Product demo scheduled',
          timestamp: '2 hours ago',
        },
        {
          id: '4',
          type: 'task',
          contact: 'Robert Chen',
          description: 'Follow-up on pricing inquiry completed',
          timestamp: '3 hours ago',
        },
        {
          id: '5',
          type: 'call',
          contact: 'Jonah Jude',
          description: 'Technical implementation discussion',
          timestamp: '5 hours ago',
        },
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'task': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-600';
      case 'email': return 'bg-green-100 text-green-600';
      case 'meeting': return 'bg-purple-100 text-purple-600';
      case 'task': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            {stats.contactsChange >= 0 ? (
              <div className="flex items-center text-green-600 text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                {stats.contactsChange}%
              </div>
            ) : (
              <div className="flex items-center text-red-600 text-sm">
                <ArrowDown className="w-4 h-4 mr-1" />
                {Math.abs(stats.contactsChange)}%
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalContacts}</h3>
          <p className="text-gray-600 text-sm mt-1">Total Contacts</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            {stats.leadsChange >= 0 ? (
              <div className="flex items-center text-green-600 text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                {stats.leadsChange}%
              </div>
            ) : (
              <div className="flex items-center text-red-600 text-sm">
                <ArrowDown className="w-4 h-4 mr-1" />
                {Math.abs(stats.leadsChange)}%
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.hotLeads}</h3>
          <p className="text-gray-600 text-sm mt-1">Hot Leads</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            {stats.dealsChange >= 0 ? (
              <div className="flex items-center text-green-600 text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                {stats.dealsChange}%
              </div>
            ) : (
              <div className="flex items-center text-red-600 text-sm">
                <ArrowDown className="w-4 h-4 mr-1" />
                {Math.abs(stats.dealsChange)}%
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.activeDeals}</h3>
          <p className="text-gray-600 text-sm mt-1">Active Deals</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            {stats.revenueChange >= 0 ? (
              <div className="flex items-center text-green-600 text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                {stats.revenueChange}%
              </div>
            ) : (
              <div className="flex items-center text-red-600 text-sm">
                <ArrowDown className="w-4 h-4 mr-1" />
                {Math.abs(stats.revenueChange)}%
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            ${(stats.revenue / 1000).toFixed(0)}K
          </h3>
          <p className="text-gray-600 text-sm mt-1">Total Revenue</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={leadSourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {leadSourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sales Pipeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="stage" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.contact}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white cursor-pointer hover:shadow-lg transition-shadow">
          <Calendar className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Schedule Meeting</h3>
          <p className="text-blue-100 text-sm">Set up your next call or demo</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white cursor-pointer hover:shadow-lg transition-shadow">
          <Users className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Add Contact</h3>
          <p className="text-purple-100 text-sm">Create a new contact entry</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white cursor-pointer hover:shadow-lg transition-shadow">
          <Target className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Create Deal</h3>
          <p className="text-green-100 text-sm">Start tracking a new opportunity</p>
        </div>
      </div>
    </div>
  );
}
