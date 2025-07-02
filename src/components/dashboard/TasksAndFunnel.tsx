import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { MoreHorizontal, ArrowRight, Calendar, UserPlus, Users, Plus } from 'lucide-react';

const taskData = [
  { 
    day: 'Mon', 
    tasks: 2, 
    assignees: [
      { id: '1', name: 'Jane Doe', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '2', name: 'John Smith', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'inactive' }
    ]
  },
  { 
    day: 'Tue', 
    tasks: 0, 
    assignees: []
  },
  { 
    day: 'Wed', 
    tasks: 3, 
    assignees: [
      { id: '3', name: 'Darlene Robertson', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '4', name: 'Eva Robinson', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '5', name: 'Wade Warren', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'pending' }
    ]
  },
  { 
    day: 'Thu', 
    tasks: 1, 
    assignees: [
      { id: '6', name: 'Jonah Jude', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' }
    ]
  },
  { 
    day: 'Fri', 
    tasks: 4, 
    assignees: [
      { id: '1', name: 'Jane Doe', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '2', name: 'John Smith', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '3', name: 'Darlene Robertson', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '4', name: 'Eva Robinson', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' }
    ]
  },
  { 
    day: 'Sat', 
    tasks: 2, 
    assignees: [
      { id: '5', name: 'Wade Warren', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' },
      { id: '6', name: 'Jonah Jude', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' }
    ]
  },
  { 
    day: 'Sun', 
    tasks: 1, 
    assignees: [
      { id: '2', name: 'John Smith', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2', status: 'active' }
    ]
  },
];

const funnelData = [
  { stage: 'Total in Pipeline', value: '350,500', color: 'bg-gray-600' },
  { stage: 'Qualification', value: '92,350$', color: 'bg-gray-500' },
  { stage: 'Royal Package Opportunity', value: '67,120$', color: 'bg-gray-400' },
  { stage: 'Value Proposition', value: '28,980$', color: 'bg-gray-300' },
];

// New component to display assignee avatars
const TaskAssignees: React.FC<{ 
  assignees: Array<{ id: string; name: string; avatar: string; status?: string }>;
  maxVisible?: number;
  size?: 'sm' | 'md';
  onClick?: (id: string) => void;
}> = ({ 
  assignees, 
  maxVisible = 3,
  size = 'sm',
  onClick 
}) => {
  if (!assignees.length) {
    return (
      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
        0
      </div>
    );
  }

  const visibleAssignees = assignees.slice(0, maxVisible);
  const remainingCount = assignees.length - maxVisible;
  
  return (
    <div className="flex -space-x-2">
      {visibleAssignees.map((assignee) => (
        <div 
          key={assignee.id} 
          className="relative cursor-pointer hover:z-10 transition-all hover:transform hover:scale-110"
          onClick={() => onClick && onClick(assignee.id)}
          title={assignee.name}
        >
          <AvatarWithStatus
            src={assignee.avatar}
            alt={assignee.name}
            size={size}
            status={assignee.status as any || 'active'}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="relative z-10 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white shadow-sm">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// Calendar day component with avatar support
const CalendarDay: React.FC<{
  day: number;
  isToday?: boolean;
  assignees?: Array<{ id: string; name: string; avatar: string; status?: string }>;
  onClick?: () => void;
}> = ({ 
  day, 
  isToday = false,
  assignees = [], 
  onClick 
}) => {
  const hasAssignees = assignees.length > 0;
  
  return (
    <div 
      className="p-1 flex flex-col items-center"
      onClick={onClick}
    >
      <div className={`
        ${isToday ? 'bg-blue-500 text-white' : hasAssignees ? 'bg-gray-100' : 'text-gray-600'}
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1
        ${hasAssignees ? 'ring-2 ring-blue-200' : ''}
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}
      `}>
        {day}
      </div>
      
      {hasAssignees && (
        <div className="flex justify-center -mt-1">
          <TaskAssignees 
            assignees={assignees} 
            maxVisible={2} 
            size="sm" 
          />
        </div>
      )}
    </div>
  );
};

export const TasksAndFunnel: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const today = new Date().getDate();

  // Mock calendar data - for each day, randomly assign avatars based on our contacts
  const calendarData = Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
    // Randomly determine if this day has assignees
    const hasAssignees = Math.random() > 0.65;
    if (!hasAssignees) return { day, assignees: [] };
    
    // Get 1-4 random assignees from our task data
    const allAssignees = taskData.flatMap(t => t.assignees);
    const uniqueAssignees = [...new Map(allAssignees.map(a => [a.id, a])).values()];
    const shuffled = [...uniqueAssignees].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 4) + 1;
    
    return {
      day,
      assignees: shuffled.slice(0, count)
    };
  });

  const handleAssigneeClick = (id: string) => {
    console.log(`Clicked on assignee: ${id}`);
    // In a real implementation, this would open the contact details modal
    // You could call the onContactsClick function from props here
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    console.log(`Clicked on day: ${day}`);
    // In a real implementation, this might open a modal to create/view tasks for this day
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Tasks Schedule */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Tasks Schedule</h3>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <UserPlus className="w-5 h-5" />
            </button>
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
          <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="font-medium text-gray-500">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {calendarData.map(({ day, assignees }) => (
              <CalendarDay 
                key={day} 
                day={day} 
                isToday={day === today}
                assignees={assignees}
                onClick={() => handleDayClick(day)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {taskData.map((task, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="font-medium text-gray-700">{task.day}</div>
                <TaskAssignees 
                  assignees={task.assignees} 
                  onClick={handleAssigneeClick}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{task.tasks} tasks</span>
                <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Day Details */}
        {selectedDay && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-blue-800">October {selectedDay}</h5>
              <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-blue-700">
              {calendarData[selectedDay - 1].assignees.length > 0
                ? `${calendarData[selectedDay - 1].assignees.length} assignees with scheduled tasks`
                : 'No tasks scheduled for this day'}
            </p>
            {calendarData[selectedDay - 1].assignees.length > 0 && (
              <div className="mt-2 flex items-center space-x-2">
                <TaskAssignees 
                  assignees={calendarData[selectedDay - 1].assignees}
                  maxVisible={5}
                  onClick={handleAssigneeClick}
                />
              </div>
            )}
          </div>
        )}
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

        {/* Added Team Overview */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Assignments
            </h4>
            <button className="p-1 rounded hover:bg-blue-100 text-blue-700">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {[...new Map(taskData.flatMap(t => t.assignees).map(a => [a.id, a])).values()].map((assignee) => (
              <div key={assignee.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AvatarWithStatus
                    src={assignee.avatar}
                    alt={assignee.name}
                    size="sm"
                    status={assignee.status as any || 'active'}
                  />
                  <span className="text-sm font-medium text-gray-800">{assignee.name}</span>
                </div>
                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  {taskData.filter(t => t.assignees.some(a => a.id === assignee.id)).length} days
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};