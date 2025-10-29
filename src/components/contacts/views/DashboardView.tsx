import React from 'react';
import { Contact } from '../../../types/contact';
import { GlassCard } from '../../ui/GlassCard';
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Activity,
  Star
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardViewProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

export function DashboardView({ contacts, onContactClick }: DashboardViewProps) {
  const totalContacts = contacts.length;
  const avgAIScore = contacts.reduce((sum, c) => sum + (c.aiScore || 0), 0) / totalContacts;
  const hotLeads = contacts.filter(c => c.interestLevel === 'hot').length;
  const customers = contacts.filter(c => c.status === 'customer').length;
  const conversionRate = totalContacts > 0 ? ((customers / totalContacts) * 100).toFixed(1) : 0;

  const statusDistribution = [
    { name: 'Leads', value: contacts.filter(c => c.status === 'lead').length, color: '#3B82F6' },
    { name: 'Prospects', value: contacts.filter(c => c.status === 'prospect').length, color: '#8B5CF6' },
    { name: 'Customers', value: contacts.filter(c => c.status === 'customer').length, color: '#10B981' },
    { name: 'Churned', value: contacts.filter(c => c.status === 'churned').length, color: '#EF4444' }
  ];

  const industryData = Object.entries(
    contacts.reduce((acc, c) => {
      const industry = c.industry || 'Unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count })).slice(0, 6);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      contacts: Math.floor(Math.random() * 20) + totalContacts * 0.8
    };
  });

  const topContacts = [...contacts]
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Contact Analytics Dashboard
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Contacts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalContacts}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12% this month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg AI Score</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgAIScore.toFixed(0)}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+5% from last week</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hot Leads</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{hotLeads}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Requires attention</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{conversionRate}%</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+2% this quarter</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Contact Trend (7 Days)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="contacts" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Top Industries</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            Top Contacts
          </h4>
          <div className="space-y-3">
            {topContacts.map((contact, index) => (
              <button
                key={contact.id}
                onClick={() => onContactClick(contact)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <img
                  src={contact.avatarSrc}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{contact.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{contact.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${contact.aiScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-8">
                    {contact.aiScore}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
