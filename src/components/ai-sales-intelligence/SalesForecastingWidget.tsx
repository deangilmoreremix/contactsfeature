import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { TrendingUp, TrendingDown, DollarSign, Target, RefreshCw, BarChart3 } from 'lucide-react';

interface ForecastData {
  accuracy: number;
  pipelineValue: number;
  winProbability: number;
  trends: Array<{
    period: string;
    value: number;
    change: number;
  }>;
  predictions: Array<{
    month: string;
    projected: number;
    confidence: number;
  }>;
  insights: string[];
}

interface SalesForecastingWidgetProps {
  onViewDetails?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export const SalesForecastingWidget: React.FC<SalesForecastingWidgetProps> = ({
  onViewDetails,
  onRefresh,
  compact = false
}) => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateForecast = async () => {
    setLoading(true);
    try {
      // Get pipeline data from your existing data source
      const pipelineData = await getPipelineData();
      const historicalData = await getHistoricalData();

      const response = await supabase.functions.invoke('sales-forecasting', {
        body: {
          pipeline: pipelineData,
          historicalData: historicalData,
          timeRange: '6months',
          confidenceLevel: 0.85
        }
      });

      if (response.data?.forecast) {
        setForecast(response.data.forecast);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to update forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    updateForecast();

    const interval = setInterval(() => {
      updateForecast();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const getPipelineData = async () => {
    // This would integrate with your existing pipeline data
    // For now, return mock data structure
    return {
      totalValue: 2500000,
      dealCount: 45,
      averageDealSize: 55555,
      byStage: {
        prospecting: { count: 15, value: 500000 },
        qualification: { count: 12, value: 800000 },
        proposal: { count: 10, value: 750000 },
        negotiation: { count: 5, value: 450000 },
        closed: { count: 3, value: 200000 }
      }
    };
  };

  const getHistoricalData = async () => {
    // This would integrate with your historical sales data
    return {
      monthlyRevenue: [
        { month: '2024-01', revenue: 180000 },
        { month: '2024-02', revenue: 220000 },
        { month: '2024-03', revenue: 195000 },
        { month: '2024-04', revenue: 240000 },
        { month: '2024-05', revenue: 210000 },
        { month: '2024-06', revenue: 280000 }
      ],
      winRate: 0.73,
      averageSalesCycle: 45,
      conversionRates: {
        prospectingToQualification: 0.8,
        qualificationToProposal: 0.65,
        proposalToNegotiation: 0.75,
        negotiationToClosed: 0.85
      }
    };
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (compact) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Sales Forecast</span>
          </div>
          <ModernButton
            variant="ghost"
            size="sm"
            onClick={updateForecast}
            loading={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </ModernButton>
        </div>

        {forecast && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Accuracy</span>
              <span className="text-xs font-medium text-blue-600">{forecast.accuracy}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Pipeline</span>
              <span className="text-xs font-medium text-green-600">{formatCurrency(forecast.pipelineValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Win Rate</span>
              <span className="text-xs font-medium text-purple-600">{forecast.winProbability}%</span>
            </div>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sales Forecasting</h2>
            <p className="text-sm text-gray-600">AI-powered pipeline predictions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <ModernButton
            variant="outline"
            size="sm"
            onClick={updateForecast}
            loading={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </ModernButton>
        </div>
      </div>

      {forecast && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {forecast.accuracy}%
              </div>
              <div className="text-sm text-gray-600">Forecast Accuracy</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(forecast.pipelineValue)}
                </span>
              </div>
              <div className="text-sm text-gray-600">Pipeline Value</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">
                  {forecast.winProbability}%
                </span>
              </div>
              <div className="text-sm text-gray-600">Win Probability</div>
            </div>
          </div>

          {/* Trends */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Forecast Trends</h3>
            <div className="space-y-3">
              {forecast.trends?.slice(0, 3).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getChangeIcon(trend.change)}
                    <span className="text-sm font-medium text-gray-900">{trend.period}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(trend.value)}
                    </div>
                    <div className={`text-xs ${getChangeColor(trend.change)}`}>
                      {trend.change > 0 ? '+' : ''}{trend.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {forecast.insights && forecast.insights.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Insights</h3>
              <div className="space-y-3">
                {forecast.insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-500 mt-1">💡</span>
                    <span className="text-sm text-gray-700">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              onClick={onViewDetails || (() => {})}
              className="flex-1"
            >
              📊 View Details
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onRefresh || updateForecast}
              className="flex-1"
            >
              🔄 Refresh Data
            </ModernButton>
          </div>
        </>
      )}

      {!forecast && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Forecast Data</h3>
          <p className="text-gray-600 mb-6">
            Generate your first AI-powered sales forecast to get insights on pipeline performance and predictions.
          </p>
          <ModernButton
            variant="primary"
            onClick={updateForecast}
          >
            🚀 Generate Forecast
          </ModernButton>
        </div>
      )}
    </GlassCard>
  );
};