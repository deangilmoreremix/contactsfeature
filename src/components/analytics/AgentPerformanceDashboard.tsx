// src/components/analytics/AgentPerformanceDashboard.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalContacts: number;
  responseRate: number;
  conversionRate: number;
  averageResponseTime: number;
  messagesSent: number;
  meetingsBooked: number;
  revenueGenerated: number;
}

interface PerformanceData {
  metrics: AgentMetrics[];
  trends: {
    period: string;
    responseRate: number;
    conversionRate: number;
  }[];
  channelBreakdown: {
    channel: string;
    messages: number;
    responses: number;
  }[];
}

export const AgentPerformanceDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await fetchAgentPerformanceData(timeRange);
      setPerformanceData(data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentPerformanceData = async (range: string): Promise<PerformanceData> => {
    // Get agent metrics
    const { data: metrics } = await supabase
      .from('agent_performance_metrics')
      .select('*')
      .gte('period_start', getDateRange(range));

    // Get trend data
    const { data: trends } = await supabase
      .from('agent_performance_trends')
      .select('*')
      .gte('date', getDateRange(range))
      .order('date');

    // Get channel breakdown
    const { data: channels } = await supabase
      .from('channel_performance')
      .select('*')
      .gte('date', getDateRange(range));

    return {
      metrics: metrics || [],
      trends: trends || [],
      channelBreakdown: channels || []
    };
  };

  const getDateRange = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
    }
    return now.toISOString();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="p-6">Loading performance data...</div>;
  }

  if (!performanceData) {
    return <div className="p-6">No performance data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agent Performance Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {performanceData.metrics.map((metric) => (
          <div key={metric.agentId} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg">{metric.agentName}</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Rate:</span>
                <span className="font-medium">{(metric.responseRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Conversion Rate:</span>
                <span className="font-medium">{(metric.conversionRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Meetings Booked:</span>
                <span className="font-medium">{metric.meetingsBooked}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="responseRate"
              stroke="#8884d8"
              name="Response Rate %"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="conversionRate"
              stroke="#82ca9d"
              name="Conversion Rate %"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Channel Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={performanceData.channelBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ channel, messages }) => `${channel}: ${messages}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="messages"
              >
                {performanceData.channelBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Response Rates by Channel</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData.channelBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="responses" fill="#82ca9d" name="Responses" />
              <Bar dataKey="messages" fill="#8884d8" name="Messages Sent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Comparison */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Agent Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData.metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="agentName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="responseRate" fill="#8884d8" name="Response Rate %" />
            <Bar dataKey="conversionRate" fill="#82ca9d" name="Conversion Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
        <div className="space-y-2">
          {performanceData.metrics
            .filter(m => m.responseRate < 0.15)
            .map(metric => (
              <div key={metric.agentId} className="flex items-center justify-between p-3 bg-white rounded">
                <span>{metric.agentName} has low response rate. Consider trying different personas or adjusting messaging timing.</span>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                  Optimize
                </button>
              </div>
            ))}
          {performanceData.metrics
            .filter(m => m.conversionRate > 0.25)
            .map(metric => (
              <div key={metric.agentId} className="flex items-center justify-between p-3 bg-green-50 rounded">
                <span>{metric.agentName} is performing excellently! Consider scaling this approach.</span>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                  Scale
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};