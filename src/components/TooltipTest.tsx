import React from 'react';
import { SmartTooltip } from './ui/SmartTooltip';
import { ResearchTooltip, AutoFillTooltip, ToolbarTooltip, GoalsTooltip } from './ui/AITooltipContent';
import { AIResearchButton } from './ui/AIResearchButton';
import { AIAutoFillButton } from './ui/AIAutoFillButton';
import { CustomizableAIToolbar } from './ui/CustomizableAIToolbar';
import { ModernButton } from './ui/ModernButton';

export const TooltipTest: React.FC = () => {
  const testFormData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/johndoe'
    }
  };

  const testContact = {
    id: 'test-1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    title: 'Software Engineer',
    phone: '+1-555-0123',
    industry: 'Technology',
    status: 'lead' as const,
    interestLevel: 'hot' as const,
    sources: ['LinkedIn'],
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/johndoe'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiScore: 85,
    notes: 'Test contact for tooltip verification'
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tooltip Test Suite</h1>

        {/* Basic SmartTooltip Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Basic SmartTooltip Test</h2>
          <SmartTooltip
            content={<div className="p-2"><strong>Basic Tooltip!</strong><br />This is a simple tooltip test.</div>}
            position="top"
            delay={300}
          >
            <ModernButton variant="primary">Hover for Basic Tooltip</ModernButton>
          </SmartTooltip>
        </div>

        {/* AI Research Button Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Research Button Test</h2>
          <AIResearchButton
            searchType="auto"
            searchQuery={{
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              company: 'Tech Corp'
            }}
            onDataFound={(data) => console.log('Research data:', data)}
          />
        </div>

        {/* AI Auto-Fill Button Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Auto-Fill Button Test</h2>
          <AIAutoFillButton
            formData={testFormData}
            onAutoFill={(data) => console.log('Auto-fill data:', data)}
          />
        </div>

        {/* AI Toolbar Test */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Toolbar Test</h2>
          <CustomizableAIToolbar
            entityType="contact"
            entityId="test-1"
            entityData={testContact}
            location="test"
            layout="grid"
            size="md"
          />
        </div>

        {/* Individual Tooltip Content Tests */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Individual Tooltip Content Tests</h2>
          <div className="grid grid-cols-2 gap-4">
            <SmartTooltip content={<ResearchTooltip />} position="top" delay={300}>
              <ModernButton variant="outline">Research Tooltip</ModernButton>
            </SmartTooltip>

            <SmartTooltip content={<AutoFillTooltip />} position="top" delay={300}>
              <ModernButton variant="outline">Auto-Fill Tooltip</ModernButton>
            </SmartTooltip>

            <SmartTooltip content={<ToolbarTooltip toolName="leadScoring" />} position="top" delay={300}>
              <ModernButton variant="outline">Lead Scoring Tooltip</ModernButton>
            </SmartTooltip>

            <SmartTooltip content={<GoalsTooltip />} position="top" delay={300}>
              <ModernButton variant="outline">Goals Tooltip</ModernButton>
            </SmartTooltip>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• Hover over each button above to test tooltips</li>
            <li>• Tooltips should appear after a short delay</li>
            <li>• Check browser console for any JavaScript errors</li>
            <li>• Verify tooltips are positioned correctly and visible</li>
          </ul>
        </div>
      </div>
    </div>
  );
};