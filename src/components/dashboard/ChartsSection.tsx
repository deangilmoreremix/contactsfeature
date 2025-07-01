import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const pipelineStageData = [
  { stage: 'Qualification', deals: 15, value: 420000 },
  { stage: 'Proposal', deals: 12, value: 680000 },
  { stage: 'Negotiation', deals: 8, value: 920000 },
  { stage: 'Closed Won', deals: 5, value: 340000 }
];

const probabilityData = [
  { range: '0-25%', count: 12, color: '#ef4444' },
  { range: '26-50%', count: 18, color: '#f59e0b' },
  { range: '51-75%', count: 14, color: '#3b82f6' },
  { range: '76-100%', count: 8, color: '#10b981' }
];

const monthlyTrendData = [
  { month: 'Jan', deals: 24, value: 1200000 },
  { month: 'Feb', deals: 28, value: 1450000 },
  { month: 'Mar', deals: 32, value: 1680000 },
  { month: 'Apr', deals: 30, value: 1580000 },
  { month: 'May', deals: 35, value: 1820000 },
  { month: 'Jun', deals: 38, value: 1950000 }
];

export const ChartsSection: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      {/* Pipeline by Stage Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline by Stage</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pipelineStageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" fontSize={12} />
            <YAxis fontSize={12} />
            <Bar dataKey="deals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Deal Probability Distribution */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Probability</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={probabilityData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="count"
            >
              {probabilityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {probabilityData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600">{item.range}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Monthly Trend */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Line 
              type="monotone" 
              dataKey="deals" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
};