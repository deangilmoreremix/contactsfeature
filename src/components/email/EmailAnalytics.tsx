import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../../types/contact';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  Eye,
  MousePointer,
  MessageSquare,
  Clock,
  Target,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface EmailMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  averageResponseTime: number; // hours
  bestSendTime: string;
  bestSendDay: string;
}

interface EmailRecord {
  id: string;
  subject: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  status: 'sent' | 'opened' | 'clicked' | 'replied';
  sequenceStep?: number;
  templateUsed?: string;
}

interface EmailAnalyticsProps {
  contact: Contact;
  emailHistory?: EmailRecord[];
  timeRange?: '7d' | '30d' | '90d' | '1y';
  onExport?: (data: any) => void;
  className?: string;
}

const mockEmailHistory: EmailRecord[] = [
  {
    id: '1',
    subject: 'Introduction and Project Discussion',
    sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    openedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    clickedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    repliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    status: 'replied',
    sequenceStep: 1,
    templateUsed: 'Introduction Template'
  },
  {
    id: '2',
    subject: 'Follow-up on Previous Discussion',
    sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'opened',
    sequenceStep: 2,
    templateUsed: 'Follow-up Template'
  },
  {
    id: '3',
    subject: 'Project Proposal Review',
    sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'sent',
    sequenceStep: 3,
    templateUsed: 'Proposal Template'
  }
];

export const EmailAnalytics: React.FC<EmailAnalyticsProps> = ({
  contact,
  emailHistory = mockEmailHistory,
  timeRange = '30d',
  onExport,
  className = ''
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate metrics from email history
  const metrics: EmailMetrics = useMemo(() => {
    const totalSent = emailHistory.length;
    const totalOpened = emailHistory.filter(email => email.openedAt).length;
    const totalClicked = emailHistory.filter(email => email.clickedAt).length;
    const totalReplied = emailHistory.filter(email => email.repliedAt).length;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalReplied,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      averageResponseTime: 24, // Mock data - would calculate from actual response times
      bestSendTime: '10:00 AM',
      bestSendDay: 'Tuesday'
    };
  }, [emailHistory]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i): string => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0]!;
    });

    return last7Days.map(dateStr => {
      const dayEmails = emailHistory.filter(email =>
        email.sentAt.toISOString().split('T')[0] === dateStr
      );

      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
        sent: dayEmails.length,
        opened: dayEmails.filter(e => e.openedAt).length,
        clicked: dayEmails.filter(e => e.clickedAt).length,
        replied: dayEmails.filter(e => e.repliedAt).length
      };
    });
  }, [emailHistory]);

  const performanceData = useMemo(() => [
    { name: 'Open Rate', value: metrics.openRate, target: 25, color: '#3b82f6' },
    { name: 'Click Rate', value: metrics.clickRate, target: 5, color: '#10b981' },
    { name: 'Reply Rate', value: metrics.replyRate, target: 10, color: '#f59e0b' }
  ], [metrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const exportData = {
      contact: `${contact.firstName} ${contact.lastName}`,
      metrics,
      emailHistory,
      generatedAt: new Date().toISOString()
    };

    onExport?.(exportData);

    // Create and download CSV
    const csvContent = [
      ['Subject', 'Sent Date', 'Status', 'Opened', 'Clicked', 'Replied', 'Template Used'].join(','),
      ...emailHistory.map(email => [
        `"${email.subject}"`,
        email.sentAt.toISOString().split('T')[0],
        email.status,
        email.openedAt ? 'Yes' : 'No',
        email.clickedAt ? 'Yes' : 'No',
        email.repliedAt ? 'Yes' : 'No',
        email.templateUsed || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-analytics-${contact.firstName}-${contact.lastName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'replied': return 'text-green-600 bg-green-100';
      case 'clicked': return 'text-blue-600 bg-blue-100';
      case 'opened': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'replied': return <MessageSquare className="w-4 h-4" />;
      case 'clicked': return <MousePointer className="w-4 h-4" />;
      case 'opened': return <Eye className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-3 text-blue-500" />
            Email Analytics
          </h3>
          <p className="text-gray-600">Performance metrics for {contact.firstName} {contact.lastName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </ModernButton>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </ModernButton>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalSent}</p>
              <p className="text-sm text-gray-600">Emails Sent</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.openRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Open Rate</p>
              <p className="text-xs text-green-600 mt-1">
                Target: {performanceData[0]?.target}%
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.clickRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Click Rate</p>
              <p className="text-xs text-green-600 mt-1">
                Target: {performanceData[1]?.target}%
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.replyRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Reply Rate</p>
              <p className="text-xs text-green-600 mt-1">
                Target: {performanceData[2]?.target}%
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>
      </div>

      {/* Performance Chart */}
      <GlassCard className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          Email Performance Over Time
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Area type="monotone" dataKey="sent" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="opened" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
            <Area type="monotone" dataKey="clicked" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            <Area type="monotone" dataKey="replied" stackId="4" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-500" />
            Performance vs Targets
          </h4>
          <div className="space-y-4">
            {performanceData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-600">
                    {item.value.toFixed(1)}% / {item.target}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
                <div className="flex items-center text-xs">
                  {item.value >= item.target ? (
                    <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-orange-500 mr-1" />
                  )}
                  <span className={item.value >= item.target ? 'text-green-600' : 'text-orange-600'}>
                    {item.value >= item.target ? 'Target met' : `${(item.target - item.value).toFixed(1)}% below target`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-500" />
            Insights & Recommendations
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Best Send Time</p>
                <p className="text-sm text-gray-600">{metrics.bestSendTime} on {metrics.bestSendDay}s</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Response Time</p>
                <p className="text-sm text-gray-600">Average: {metrics.averageResponseTime} hours</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Improvement Areas</p>
                <p className="text-sm text-gray-600">
                  {metrics.openRate < 20 ? 'Focus on compelling subject lines' :
                   metrics.clickRate < 3 ? 'Improve email content and CTAs' :
                   'Great performance! Keep up the good work'}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Email History */}
      <GlassCard className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-gray-500" />
          Email History
        </h4>
        <div className="space-y-3">
          {emailHistory.map((email) => (
            <div key={email.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${getStatusColor(email.status)}`}>
                  {getStatusIcon(email.status)}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{email.subject}</h5>
                  <p className="text-sm text-gray-600">
                    Sent {email.sentAt.toLocaleDateString()}
                    {email.sequenceStep && ` • Step ${email.sequenceStep}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {email.openedAt && (
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    Opened
                  </span>
                )}
                {email.clickedAt && (
                  <span className="flex items-center">
                    <MousePointer className="w-4 h-4 mr-1" />
                    Clicked
                  </span>
                )}
                {email.repliedAt && (
                  <span className="flex items-center text-green-600">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Replied
                  </span>
                )}
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(email.status)}`}>
                  {email.status}
                </span>
              </div>
            </div>
          ))}

          {emailHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No email history available</p>
              <p className="text-xs text-gray-400 mt-1">
                Send some emails to start tracking performance
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};