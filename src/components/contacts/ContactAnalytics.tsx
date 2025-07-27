import React, { useState } from 'react';
import { useContactAI } from '../../contexts/AIContext';
import { usePredictiveAnalytics } from '../../hooks/useAdvancedAI';
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
  RefreshCw,
  Sparkles,
  Brain,
  Layers,
  CheckCircle
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
  const [showPredictive, setShowPredictive] = useState(false);
  
  // Connect to AI services for predictive analytics
  const { generateInsights, contactInsights, isContactProcessing } = useContactAI(contact.id);
  
  // Connect to Advanced Predictive Analytics
  const {
    generatePredictions,
    analyzeTrends,
    assessRisk,
    predictions,
    trendAnalysis,
    riskAssessment,
    isPredicting
  } = usePredictiveAnalytics(contact.id);
  
  const handleGeneratePredictions = async () => {
    try {
      await generatePredictions(contact, ['conversion', 'response_time', 'engagement']);
      await analyzeTrends(contact, timeRange as any);
      await assessRisk(contact);
      setShowPredictive(true);
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    }
  };

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
          <ModernButton 
            variant="primary" 
            size="sm" 
            className="flex items-center space-x-2"
            onClick={handleGeneratePredictions}
            loading={isContactProcessing || isPredicting}
          >
            <Brain className="w-4 h-4" />
            <span>{isPredicting ? 'Analyzing...' : 'AI Predictions'}</span>
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </ModernButton>
        </div>
      </div>

      {/* Advanced Predictive Analytics Panel */}
      {(showPredictive && (predictions.length > 0 || riskAssessment)) && (
        <div className="space-y-6">
          {/* Predictions Overview */}
          {predictions.length > 0 && (
            <GlassCard className="p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-blue-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                Predictive Intelligence
                <Sparkles className="w-4 h-4 ml-2 text-yellow-500" />
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {predictions.map((prediction, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 capitalize">
                        {prediction.predictionType.replace('_', ' ')}
                      </h5>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {prediction.confidence}% confident
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="text-2xl font-bold text-purple-600">
                        {prediction.predictionType === 'conversion' ? `${prediction.value}%` :
                         prediction.predictionType === 'response_time' ? `${prediction.value.toFixed(1)}h` :
                         `${prediction.value}`}
                      </div>
                      <div className="text-sm text-gray-600">{prediction.timeframe}</div>
                    </div>
                    <div className="space-y-1">
                      {prediction.reasoning.slice(0, 2).map((reason, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-start">
                          <span className="text-purple-500 mr-1">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Risk Assessment */}
          {riskAssessment && (
            <GlassCard className="p-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                Risk Assessment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                      riskAssessment.overallRisk === 'low' ? 'bg-green-500' :
                      riskAssessment.overallRisk === 'medium' ? 'bg-yellow-500' :
                      riskAssessment.overallRisk === 'high' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}>
                      {riskAssessment.riskScore}
                    </div>
                    <div>
                      <div className="text-lg font-semibold capitalize">{riskAssessment.overallRisk} Risk</div>
                      <div className="text-sm text-gray-600">Overall Risk Level</div>
                    </div>
                  </div>
                  
                  {riskAssessment.riskFactors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Risk Factors:</h5>
                      <div className="space-y-2">
                        {riskAssessment.riskFactors.map((factor, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border-l-4 border-red-400">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                factor.impact === 'high' ? 'bg-red-100 text-red-800' :
                                factor.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {factor.impact}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{factor.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  {riskAssessment.opportunities.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-1 text-green-600" />
                        Opportunities:
                      </h5>
                      <div className="space-y-2">
                        {riskAssessment.opportunities.map((opp, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border-l-4 border-green-400">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{opp.opportunity}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                opp.potential === 'high' ? 'bg-green-100 text-green-800' :
                                opp.potential === 'medium' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {opp.potential}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{opp.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {riskAssessment.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">AI Recommendations:</h5>
                      <ul className="space-y-1">
                        {riskAssessment.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Trend Analysis */}
          {trendAnalysis && (
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Trend Analysis & Forecast
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trendAnalysis.trends.map((trend, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 capitalize">{trend.metric.replace('_', ' ')}</h5>
                      <div className={`flex items-center space-x-1 ${
                        trend.direction === 'increasing' ? 'text-green-600' :
                        trend.direction === 'decreasing' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {trend.direction === 'increasing' ? <TrendingUp className="w-4 h-4" /> :
                         trend.direction === 'decreasing' ? <TrendingUp className="w-4 h-4 transform rotate-180" /> :
                         <Activity className="w-4 h-4" />}
                        <span className="text-sm font-medium capitalize">{trend.direction}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Strength: {(trend.strength * 100).toFixed(1)}%
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      trend.significance === 'high' ? 'bg-red-100 text-red-800' :
                      trend.significance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {trend.significance.toUpperCase()} SIGNIFICANCE
                    </div>
                  </div>
                ))}
              </div>
              
              {trendAnalysis.seasonality.detected && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-900">Seasonality Detected</span>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {trendAnalysis.seasonality.confidence}% confident
                    </span>
                  </div>
                  <p className="text-sm text-purple-800">{trendAnalysis.seasonality.pattern}</p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      )}

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
            <p className="text-xs text-green-600 mt-1">
              {predictions.find(p => p.predictionType === 'engagement') ? 
                `AI Predicted: ${predictions.find(p => p.predictionType === 'engagement')?.value}%` :
                '+12% from last month'
              }
            </p>
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
            <p className="text-xs text-green-600 mt-1">
              {predictions.find(p => p.predictionType === 'conversion') ? 
                `AI Predicted: ${predictions.find(p => p.predictionType === 'conversion')?.value}%` :
                '+5% from last month'
              }
            </p>
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
            <p className="text-xs text-red-600 mt-1">
              {predictions.find(p => p.predictionType === 'response_time') ? 
                `AI Predicted: ${predictions.find(p => p.predictionType === 'response_time')?.value.toFixed(1)}h` :
                '+0.8h from last month'
              }
            </p>
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
            <p className="text-xs text-green-600 mt-1">
              {riskAssessment ? 
                `Risk Level: ${riskAssessment.overallRisk}` :
                '+$15K from last month'
              }
            </p>
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