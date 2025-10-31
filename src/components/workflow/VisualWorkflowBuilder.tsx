import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { CitationBadge } from '../ui/CitationBadge';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import {
  Zap,
  Play,
  Square,
  Settings,
  Plus,
  Trash2,
  ArrowRight,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Database,
  Webhook,
  Code,
  Filter,
  Target,
  Users,
  DollarSign,
  BarChart3,
  Save,
  Download,
  Upload,
  Copy,
  Eye,
  Edit,
  X,
  Move,
  RotateCcw
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay' | 'split' | 'merge' | 'end';
  label: string;
  description: string;
  position: { x: number; y: number };
  config: any;
  connections: string[];
  status?: 'idle' | 'running' | 'completed' | 'error';
}

interface WorkflowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  condition?: string;
  label?: string;
}

interface VisualWorkflowBuilderProps {
  workflowId?: string;
  initialWorkflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    metadata: any;
  };
  onSave?: (workflow: any) => void;
  onExecute?: (workflowId: string) => void;
  onDuplicate?: (workflowId: string) => void;
}

const nodeTypes = {
  trigger: {
    icon: Zap,
    color: 'bg-yellow-500',
    label: 'Trigger',
    description: 'Workflow starting point'
  },
  condition: {
    icon: GitBranch,
    color: 'bg-blue-500',
    label: 'Condition',
    description: 'Decision point'
  },
  action: {
    icon: Play,
    color: 'bg-green-500',
    label: 'Action',
    description: 'Execute task'
  },
  delay: {
    icon: Clock,
    color: 'bg-gray-500',
    label: 'Delay',
    description: 'Wait period'
  },
  split: {
    icon: GitBranch,
    color: 'bg-purple-500',
    label: 'Split',
    description: 'Parallel paths'
  },
  merge: {
    icon: Target,
    color: 'bg-indigo-500',
    label: 'Merge',
    description: 'Combine paths'
  },
  end: {
    icon: CheckCircle,
    color: 'bg-red-500',
    label: 'End',
    description: 'Workflow completion'
  }
};

const actionTypes = [
  { id: 'email', label: 'Send Email', icon: Mail, category: 'communication' },
  { id: 'sms', label: 'Send SMS', icon: MessageSquare, category: 'communication' },
  { id: 'call', label: 'Schedule Call', icon: Phone, category: 'communication' },
  { id: 'meeting', label: 'Schedule Meeting', icon: Calendar, category: 'communication' },
  { id: 'update_field', label: 'Update Field', icon: Database, category: 'data' },
  { id: 'webhook', label: 'Call Webhook', icon: Webhook, category: 'integration' },
  { id: 'api_call', label: 'API Call', icon: Code, category: 'integration' },
  { id: 'create_task', label: 'Create Task', icon: CheckCircle, category: 'productivity' },
  { id: 'add_tag', label: 'Add Tag', icon: Target, category: 'organization' },
  { id: 'assign_user', label: 'Assign User', icon: Users, category: 'organization' },
  { id: 'update_deal', label: 'Update Deal', icon: DollarSign, category: 'sales' },
  { id: 'create_report', label: 'Generate Report', icon: BarChart3, category: 'analytics' }
];

export const VisualWorkflowBuilder: React.FC<VisualWorkflowBuilderProps> = ({
  workflowId,
  initialWorkflow,
  onSave,
  onExecute,
  onDuplicate
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow?.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialWorkflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; startPos: { x: number; y: number } } | null>(null);
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.metadata?.name || 'New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState(initialWorkflow?.metadata?.description || '');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<any>(null);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const researchThinking = useResearchThinking();
  const researchStatus = useResearchStatus();

  // Initialize with basic workflow structure if empty
  useEffect(() => {
    if (nodes.length === 0) {
      const startNode: WorkflowNode = {
        id: 'start',
        type: 'trigger',
        label: 'Workflow Start',
        description: 'Trigger when contact is created',
        position: { x: 100, y: 100 },
        config: { triggerType: 'contact_created' },
        connections: []
      };

      const endNode: WorkflowNode = {
        id: 'end',
        type: 'end',
        label: 'Workflow End',
        description: 'Workflow completed',
        position: { x: 500, y: 100 },
        config: {},
        connections: []
      };

      setNodes([startNode, endNode]);
    }
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connecting) {
      setConnecting(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create new node at click position
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: 'action',
      label: 'New Action',
      description: 'Configure this action',
      position: { x, y },
      config: {},
      connections: []
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
    setShowNodePanel(true);
  };

  const handleNodeDragStart = (e: React.DragEvent, node: WorkflowNode) => {
    setDraggedNode(node);
    e.dataTransfer.setData('text/plain', node.id);
  };

  const handleNodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !draggedNode) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(prev => prev.map(node =>
      node.id === draggedNode.id
        ? { ...node, position: { x, y } }
        : node
    ));

    setDraggedNode(null);
  };

  const handleNodeClick = (node: WorkflowNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    setShowNodePanel(true);
  };

  const handleConnectionStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setConnecting({
      sourceId: nodeId,
      startPos: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    });
  };

  const handleConnectionEnd = (targetId: string) => {
    if (!connecting || connecting.sourceId === targetId) {
      setConnecting(null);
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      sourceId: connecting.sourceId,
      targetId,
      condition: 'true'
    };

    setEdges(prev => [...prev, newEdge]);
    setConnecting(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.sourceId !== nodeId && edge.targetId !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setShowNodePanel(false);
    }
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  };

  const handleSaveWorkflow = () => {
    const workflow = {
      id: workflowId || `workflow_${Date.now()}`,
      name: workflowName,
      description: workflowDescription,
      nodes,
      edges,
      metadata: {
        name: workflowName,
        description: workflowDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    onSave?.(workflow);
  };

  const handleExecuteWorkflow = async () => {
    if (!workflowId && !onExecute) return;

    setIsRunning(true);
    try {
      await onExecute?.(workflowId || 'temp');
      setExecutionStatus({ status: 'completed', message: 'Workflow executed successfully' });
    } catch (error) {
      setExecutionStatus({ status: 'error', message: 'Workflow execution failed' });
    } finally {
      setIsRunning(false);
    }
  };

  const renderNode = (node: WorkflowNode) => {
    const nodeType = nodeTypes[node.type];
    const Icon = nodeType.icon;
    const isSelected = selectedNode?.id === node.id;
    const isConnecting = connecting?.sourceId === node.id;

    return (
      <div
        key={node.id}
        className={`absolute cursor-move select-none transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        } ${isConnecting ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: 'translate(-50%, -50%)'
        }}
        draggable
        onDragStart={(e) => handleNodeDragStart(e, node)}
        onClick={(e) => handleNodeClick(node, e)}
      >
        <div className={`flex items-center space-x-3 p-3 rounded-lg shadow-lg border-2 ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        } hover:shadow-xl transition-shadow`}>
          <div className={`w-10 h-10 rounded-lg ${nodeType.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{node.label}</div>
            <div className="text-xs text-gray-500 truncate">{node.description}</div>
          </div>

          {/* Connection points */}
          <div className="flex items-center space-x-1">
            <div
              className="w-3 h-3 bg-green-500 rounded-full cursor-crosshair hover:bg-green-600 transition-colors"
              onClick={(e) => handleConnectionStart(node.id, e)}
              title="Connect from this node"
            />
            <div
              className="w-3 h-3 bg-blue-500 rounded-full cursor-crosshair hover:bg-blue-600 transition-colors"
              onClick={(e) => handleConnectionEnd(node.id)}
              title="Connect to this node"
            />
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNode(node.id);
            }}
            className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete node"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderEdge = (edge: WorkflowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.sourceId);
    const targetNode = nodes.find(n => n.id === edge.targetId);

    if (!sourceNode || !targetNode) return null;

    const x1 = sourceNode.position.x + 100; // Approximate node width
    const y1 = sourceNode.position.y;
    const x2 = targetNode.position.x - 50; // Approximate connection point
    const y2 = targetNode.position.y;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g key={edge.id}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#3b82f6"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        {edge.label && (
          <text
            x={midX}
            y={midY - 10}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {edge.label}
          </text>
        )}
        <circle
          cx={midX}
          cy={midY}
          r="8"
          fill="white"
          stroke="#ef4444"
          strokeWidth="2"
          className="cursor-pointer hover:fill-red-50"
          onClick={() => handleDeleteEdge(edge.id)}
        />
        <text
          x={midX}
          y={midY + 3}
          textAnchor="middle"
          className="text-xs fill-red-500 pointer-events-none"
        >
          ×
        </text>
      </g>
    );
  };

  return (
    <>
      {/* Research Status Overlay */}
      <ResearchStatusOverlay
        status={researchStatus.status}
        onClose={() => researchStatus.reset()}
        position="top"
        size="md"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Zap className="w-6 h-6 mr-3 text-blue-500" />
              Visual Workflow Builder
            </h3>
            <p className="text-gray-600">Create sophisticated automated workflows with visual design</p>
          </div>

          <div className="flex items-center space-x-3">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </ModernButton>

            <ModernButton
              variant="outline"
              size="sm"
              onClick={handleSaveWorkflow}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </ModernButton>

            <ModernButton
              variant="primary"
              size="sm"
              onClick={handleExecuteWorkflow}
              loading={isRunning}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? 'Running...' : 'Execute'}</span>
            </ModernButton>
          </div>
        </div>

        {/* Workflow Metadata */}
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter workflow name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this workflow does"
              />
            </div>
          </div>
        </GlassCard>

        {/* Canvas */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Workflow Canvas</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Nodes: {nodes.length}</span>
              <span>•</span>
              <span>Connections: {edges.length}</span>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="relative w-full h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
            onClick={handleCanvasClick}
            onDrop={handleNodeDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />

            {/* SVG for edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#3b82f6"
                  />
                </marker>
              </defs>

              {edges.map(renderEdge)}
            </svg>

            {/* Connecting line */}
            {connecting && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1={connecting.startPos.x}
                  y1={connecting.startPos.y}
                  x2={connecting.startPos.x}
                  y2={connecting.startPos.y}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
              </svg>
            )}

            {/* Nodes */}
            {nodes.map(renderNode)}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>💡 <strong>Tip:</strong> Click on the canvas to add new nodes, drag nodes to reposition them, and click the green/blue dots to create connections.</p>
          </div>
        </GlassCard>

        {/* Node Configuration Panel */}
        {showNodePanel && selectedNode && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Configure Node</h4>
              <button
                onClick={() => setShowNodePanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Type
                </label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => {
                    const newType = e.target.value as WorkflowNode['type'];
                    setSelectedNode(prev => prev ? { ...prev, type: newType } : null);
                    setNodes(prev => prev.map(node =>
                      node.id === selectedNode.id
                        ? { ...node, type: newType }
                        : node
                    ));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(nodeTypes).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setSelectedNode(prev => prev ? { ...prev, label: newLabel } : null);
                    setNodes(prev => prev.map(node =>
                      node.id === selectedNode.id
                        ? { ...node, label: newLabel }
                        : node
                    ));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={selectedNode.description}
                  onChange={(e) => {
                    const newDescription = e.target.value;
                    setSelectedNode(prev => prev ? { ...prev, description: newDescription } : null);
                    setNodes(prev => prev.map(node =>
                      node.id === selectedNode.id
                        ? { ...node, description: newDescription }
                        : node
                    ));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Type-specific configuration */}
              {selectedNode.type === 'action' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Type
                  </label>
                  <select
                    value={selectedNode.config?.actionType || ''}
                    onChange={(e) => {
                      const actionType = e.target.value;
                      setSelectedNode(prev => prev ? {
                        ...prev,
                        config: { ...prev.config, actionType }
                      } : null);
                      setNodes(prev => prev.map(node =>
                        node.id === selectedNode.id
                          ? { ...node, config: { ...node.config, actionType } }
                          : node
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select action type</option>
                    {actionTypes.map(action => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedNode.type === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delay Duration
                  </label>
                  <input
                    type="text"
                    value={selectedNode.config?.delay || ''}
                    onChange={(e) => {
                      const delay = e.target.value;
                      setSelectedNode(prev => prev ? {
                        ...prev,
                        config: { ...prev.config, delay }
                      } : null);
                      setNodes(prev => prev.map(node =>
                        node.id === selectedNode.id
                          ? { ...node, config: { ...node.config, delay } }
                          : node
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2 days, 1 hour, 30 minutes"
                  />
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <textarea
                    value={selectedNode.config?.condition || ''}
                    onChange={(e) => {
                      const condition = e.target.value;
                      setSelectedNode(prev => prev ? {
                        ...prev,
                        config: { ...prev.config, condition }
                      } : null);
                      setNodes(prev => prev.map(node =>
                        node.id === selectedNode.id
                          ? { ...node, config: { ...node.config, condition } }
                          : node
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="e.g., contact.aiScore > 80 AND contact.status === 'hot'"
                  />
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Execution Status */}
        {executionStatus && (
          <GlassCard className={`p-4 ${executionStatus.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center space-x-3">
              {executionStatus.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {executionStatus.status === 'completed' ? 'Workflow Completed' : 'Workflow Failed'}
                </p>
                <p className="text-sm text-gray-600">{executionStatus.message}</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </>
  );
};