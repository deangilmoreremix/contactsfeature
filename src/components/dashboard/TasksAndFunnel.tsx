import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { MoreHorizontal, ArrowRight, Calendar } from 'lucide-react';

const taskData = [
  { day: 'Mon', tasks: 2, color: 'bg-blue-500' },
  { day: 'Tue', tasks: 0, color: 'bg-gray-200' },
  { day: 'Wed', tasks: 3, color: 'bg-green-500' },
  { day: 'Thu', tasks: 1, color: 'bg-yellow-500' },
  { day: 'Fri', tasks: 4, color: 'bg-red-500' },
  { day: 'Sat', tasks: 2, color: 'bg-purple-500' },
  { day: 'Sun', tasks: 1, color: 'bg-teal-500' },
];

const funnelData = [
  { stage: 'Total in Pipeline', value: '350,500', color: 'bg-gray-600' },
  { stage: 'Qualification', value: '92,350$', color: 'bg-gray-500' },
  { stage: 'Royal Package Opportunity', value: '67,120$', color: 'bg-gray-400' },
  { stage: 'Value Proposition', value: '28,980$', color: 'bg-gray-300' },
];

export const TasksAndFunnel: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Tasks Schedule */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Tasks Schedule</h3>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-2xl font-bold text-gray-900 mb-2">October</h4>
          <div className="grid grid-cols-7 gap-2 text-center text-sm">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <div key={day} className="p-2">
                <span className={`
                  ${day === 11 ? 'bg-blue-500 text-white' : 'text-gray-600'}
                  ${day === 16 ? 'bg-teal-500 text-white' : ''}
                  ${day === 18 ? 'bg-yellow-500 text-white' : ''}
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                `}>
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {taskData.map((task, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${task.color}`} />
                <span className="text-sm font-medium text-gray-700">{task.day}</span>
              </div>
              <span className="text-sm text-gray-600">{task.tasks} tasks</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Stage Funnel */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Stage Funnel</h3>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {funnelData.map((stage, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                <span className="text-sm font-semibold text-gray-900">{stage.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${stage.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${(4 - index) * 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Weighted</span>
            <span className="text-sm font-medium text-gray-700">Total</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};