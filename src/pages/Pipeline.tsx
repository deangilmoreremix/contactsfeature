import React from 'react';
import { PipelineAIToolbar } from '../components/pipeline/PipelineAIToolbar';
import { GlassCard } from '../components/ui/GlassCard';

const Pipeline: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Pipeline AI Agents Toolbar */}
      <PipelineAIToolbar />

      {/* Main Pipeline Content */}
      <div className="flex-1 p-6">
        <GlassCard className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sales Pipeline</h2>
            <p className="text-gray-600 mb-6">
              Your sales pipeline with AI-powered insights and automation.
            </p>
            <div className="text-sm text-gray-500">
              Use the AI agents above to optimize your pipeline performance.
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Pipeline;