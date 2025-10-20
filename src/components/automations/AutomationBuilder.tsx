import React, { useState, useEffect } from 'react';
import { automationService } from '../../services/automation.service';
import { ContactAutomation } from '../../types/automation';
import { Plus, Settings, Play, Pause, Trash2, Edit } from 'lucide-react';

export const AutomationBuilder: React.FC = () => {
  const [automations, setAutomations] = useState<ContactAutomation[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const activeAutomations = await automationService.getActiveAutomations();
      setAutomations(activeAutomations);
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = async (automationData: any) => {
    try {
      await automationService.createAutomation(automationData);
      await loadAutomations();
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create automation:', error);
    }
  };

  const handleToggleAutomation = async (automationId: string, isActive: boolean) => {
    try {
      await automationService.updateAutomation(automationId, { isActive });
      await loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    if (window.confirm('Are you sure you want to delete this automation?')) {
      try {
        await automationService.deleteAutomation(automationId);
        await loadAutomations();
      } catch (error) {
        console.error('Failed to delete automation:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="automation-builder max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Automations</h1>
          <p className="text-gray-600 mt-2">Create automated workflows for your contacts</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No automations yet</h3>
          <p className="text-gray-600 mb-6">Create your first automation to get started</p>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Create Your First Automation
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <div key={automation.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{automation.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    automation.type === 'scoring' ? 'bg-green-100 text-green-800' :
                    automation.type === 'followup' ? 'bg-blue-100 text-blue-800' :
                    automation.type === 'enrichment' ? 'bg-purple-100 text-purple-800' :
                    automation.type === 'transition' ? 'bg-orange-100 text-orange-800' :
                    automation.type === 'notification' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {automation.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAutomation(automation.id, !automation.isActive)}
                    className={`p-1 rounded ${
                      automation.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={automation.isActive ? 'Pause automation' : 'Resume automation'}
                  >
                    {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteAutomation(automation.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete automation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Trigger:</span> {automation.trigger.type}
                </div>
                <div>
                  <span className="font-medium">Conditions:</span> {automation.conditions.length}
                </div>
                <div>
                  <span className="font-medium">Actions:</span> {automation.actions.length}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created {new Date(automation.createdAt).toLocaleDateString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    automation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {automation.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreating && (
        <AutomationForm
          onSubmit={handleCreateAutomation}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
};

// Simple form component for creating automations
const AutomationForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'scoring' as const,
    trigger: { type: 'contact_created' as const },
    conditions: [],
    actions: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Create Automation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Automation Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Lead Scoring Automation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Automation Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scoring">Contact Scoring</option>
              <option value="followup">Follow-up</option>
              <option value="enrichment">Data Enrichment</option>
              <option value="transition">Status Transition</option>
              <option value="notification">Notification</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Create Automation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};