import React, { useState } from 'react';
import { Clock, Users, DollarSign, Target, CheckCircle } from 'lucide-react';
import { ModernButton } from '../ui/ModernButton';

interface Tactic {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
  successMetrics: string[];
  dependencies?: string[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface Phase {
  id: string;
  name: string;
  timeline: string;
  objectives: string[];
  tactics: Tactic[];
  milestones: Milestone[];
}

interface PlaybookPhasesProps {
  phases: Phase[];
  onExecutePhase: (phaseId: string) => void;
}

export const PlaybookPhases: React.FC<PlaybookPhasesProps> = ({
  phases,
  onExecutePhase
}) => {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [draggedPhase, setDraggedPhase] = useState<string | null>(null);

  const getPhaseIcon = (phaseName: string) => {
    if (phaseName.toLowerCase().includes('discovery')) return <Users className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('proposal')) return <Target className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('negotiation')) return <DollarSign className="w-5 h-5" />;
    if (phaseName.toLowerCase().includes('closing')) return <Target className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleDragStart = (phaseId: string) => {
    setDraggedPhase(phaseId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetPhaseId: string) => {
    e.preventDefault();
    // Drag and drop logic would be implemented here
    setDraggedPhase(null);
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Phases</h3>
      <div className="space-y-4">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
            draggable
            onDragStart={() => handleDragStart(phase.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, phase.id)}
          >
            <div
              className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setSelectedPhase(
                selectedPhase === phase.id ? null : phase.id
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    {getPhaseIcon(phase.name)}
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-900">
                      Phase {index + 1}: {phase.name}
                    </h4>
                    <p className="text-sm text-gray-600">{phase.timeline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {phase.tactics.length} tactics
                  </span>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => onExecutePhase?.(phase.id)}
                    aria-label={`Execute phase ${phase.name}`}
                  >
                    Execute
                  </ModernButton>
                </div>
              </div>
            </div>

            {selectedPhase === phase.id && (
              <div className="p-4 border-t border-gray-200">
                {/* Objectives */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Objectives</h5>
                  <ul className="space-y-1">
                    {phase.objectives.map((objective, objIndex) => (
                      <li key={objIndex} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tactics */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Tactics</h5>
                  <div className="space-y-3">
                    {phase.tactics.map((tactic) => (
                      <div key={tactic.id} className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <h6 className="text-sm font-medium text-gray-900">
                            {tactic.name}
                          </h6>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(tactic.priority)}`}>
                            {tactic.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{tactic.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Effort: {tactic.estimatedEffort}</span>
                          <span>{tactic.successMetrics.length} metrics</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Milestones</h5>
                  <div className="space-y-2">
                    {phase.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {milestone.name}
                          </span>
                          <span className="text-xs text-gray-600 ml-2">
                            Due: {new Date(milestone.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">{milestone.owner}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {milestone.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};