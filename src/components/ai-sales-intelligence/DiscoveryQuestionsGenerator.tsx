import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { MessageSquare, Copy, CheckCircle, RefreshCw, Users, Building, Target } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role?: string;
  industry?: string;
  companySize?: number;
}

interface MeetingContext {
  type: 'discovery' | 'demo' | 'follow_up' | 'negotiation' | 'closing';
  duration: number; // minutes
  objective: string;
  previousMeetings?: number;
}

interface GeneratedQuestions {
  questions: Array<{
    id: string;
    question: string;
    category: 'business' | 'technical' | 'personal' | 'decision_making';
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
  summary: {
    totalQuestions: number;
    categories: Record<string, number>;
    estimatedDuration: number;
    keyThemes: string[];
  };
}

interface DiscoveryQuestionsGeneratorProps {
  contact: Contact;
  meetingContext: MeetingContext;
  onCopyQuestions?: (questions: string[]) => void;
  onRegenerate?: () => void;
  onSaveTemplate?: () => void;
}

export const DiscoveryQuestionsGenerator: React.FC<DiscoveryQuestionsGeneratorProps> = ({
  contact,
  meetingContext,
  onCopyQuestions,
  onRegenerate,
  onSaveTemplate
}) => {
  const [questions, setQuestions] = useState<GeneratedQuestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedQuestions, setCopiedQuestions] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const generateQuestions = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('discovery-questions', {
        body: {
          contact: {
            name: contact.name,
            role: contact.role,
            company: contact.company,
            industry: contact.industry,
            companySize: contact.companySize
          },
          meetingContext,
          preferences: {
            questionCount: 12,
            includeTechnical: meetingContext.type === 'demo',
            includePersonal: meetingContext.type === 'discovery',
            focusAreas: getFocusAreas(meetingContext.type)
          }
        }
      });

      if (response.data?.questions) {
        setQuestions(response.data.questions);
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFocusAreas = (meetingType: string): string[] => {
    switch (meetingType) {
      case 'discovery':
        return ['pain_points', 'goals', 'timeline', 'budget'];
      case 'demo':
        return ['current_solution', 'requirements', 'integration', 'training'];
      case 'follow_up':
        return ['feedback', 'objections', 'next_steps', 'timeline'];
      case 'negotiation':
        return ['terms', 'pricing', 'timeline', 'support'];
      case 'closing':
        return ['final_objections', 'implementation', 'success_metrics'];
      default:
        return ['general'];
    }
  };

  const copyQuestion = async (question: string, questionId: string) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedQuestions(prev => new Set([...prev, questionId]));
      setTimeout(() => {
        setCopiedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(questionId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy question:', error);
    }
  };

  const copyAllQuestions = () => {
    if (!questions) return;

    const allQuestions = questions.questions
      .filter(q => selectedCategory === 'all' || q.category === selectedCategory)
      .map(q => q.question)
      .join('\n\n');

    navigator.clipboard.writeText(allQuestions);
    onCopyQuestions?.(questions.questions.map(q => q.question));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business': return <Building className="w-4 h-4" />;
      case 'technical': return <Target className="w-4 h-4" />;
      case 'personal': return <Users className="w-4 h-4" />;
      case 'decision_making': return <CheckCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business': return 'text-blue-600 bg-blue-50';
      case 'technical': return 'text-green-600 bg-green-50';
      case 'personal': return 'text-purple-600 bg-purple-50';
      case 'decision_making': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredQuestions = questions?.questions.filter(q =>
    selectedCategory === 'all' || q.category === selectedCategory
  ) || [];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Discovery Questions</h2>
            <p className="text-sm text-gray-600">AI-generated strategic questions for {meetingContext.type} meetings</p>
          </div>
        </div>
        <ModernButton
          variant="outline"
          size="sm"
          onClick={generateQuestions}
          loading={loading}
        >
          {loading ? 'Generating...' : '🎯 Generate'}
        </ModernButton>
      </div>

      {/* Meeting Context Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Meeting Type</div>
            <div className="text-sm font-medium text-gray-900 capitalize">{meetingContext.type}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Duration</div>
            <div className="text-sm font-medium text-gray-900">{meetingContext.duration} min</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Contact</div>
            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Company</div>
            <div className="text-sm font-medium text-gray-900">{contact.company}</div>
          </div>
        </div>
      </div>

      {questions && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">{questions.summary.totalQuestions}</div>
                <div className="text-xs text-gray-600">Total Questions</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{questions.summary.estimatedDuration}</div>
                <div className="text-xs text-gray-600">Est. Minutes</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {Object.keys(questions.summary.categories).length}
                </div>
                <div className="text-xs text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{questions.summary.keyThemes.length}</div>
                <div className="text-xs text-gray-600">Key Themes</div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 text-sm rounded-full transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({questions.questions.length})
              </button>
              {Object.entries(questions.summary.categories).map(([category, count]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-sm rounded-full transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4 mb-6">
            {filteredQuestions.map((q, index) => (
              <div key={q.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getCategoryColor(q.category)}`}>
                      {getCategoryIcon(q.category)}
                      <span className="capitalize">{q.category.replace('_', ' ')}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(q.priority)}`}>
                      {q.priority} priority
                    </div>
                  </div>
                  <ModernButton
                    variant="ghost"
                    size="sm"
                    onClick={() => copyQuestion(q.question, q.id)}
                  >
                    {copiedQuestions.has(q.id) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </ModernButton>
                </div>

                <p className="text-gray-900 mb-2">{q.question}</p>
                <p className="text-sm text-gray-600">{q.reasoning}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <ModernButton
              variant="primary"
              onClick={copyAllQuestions}
              className="flex-1"
            >
              📋 Copy All Questions
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onRegenerate || (() => {})}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </ModernButton>
            <ModernButton
              variant="outline"
              onClick={onSaveTemplate || (() => {})}
            >
              💾 Save Template
            </ModernButton>
          </div>
        </>
      )}

      {!questions && !loading && (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Strategic Questions</h3>
          <p className="text-gray-600 mb-6">
            Create personalized discovery questions tailored to {contact.name}'s role and your meeting objectives.
          </p>
          <ModernButton
            variant="primary"
            onClick={generateQuestions}
          >
            🎯 Generate Questions
          </ModernButton>
        </div>
      )}
    </GlassCard>
  );
};