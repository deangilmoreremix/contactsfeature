import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { MoreHorizontal, ArrowRight } from 'lucide-react';

const interactions = [
  {
    id: 1,
    type: 'Royal Package Opportunity',
    value: '11,250$',
    date: 'Oct 12',
    status: 'active',
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    participants: [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  },
  {
    id: 2,
    type: 'Third Deal Most Useful',
    value: '21,300$',
    date: 'Oct 9',
    status: 'success',
    bgColor: 'bg-teal-500',
    textColor: 'text-white',
    participants: [
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  },
  {
    id: 3,
    type: 'Absolute Success Deal',
    value: '2,100$',
    date: 'Oct 12',
    status: 'pending',
    bgColor: 'bg-black',
    textColor: 'text-white',
    participants: [
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  },
  {
    id: 4,
    type: 'Royal Package Opportunity',
    value: '4,160$',
    date: 'Oct 11',
    status: 'warning',
    bgColor: 'bg-yellow-400',
    textColor: 'text-black',
    participants: [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  },
  {
    id: 5,
    type: 'Adaptive Business Services',
    value: '3,140$',
    date: 'Oct 7',
    status: 'success',
    bgColor: 'bg-gray-300',
    textColor: 'text-black',
    participants: [
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  },
  {
    id: 6,
    type: 'Second deal Common Service',
    value: '12,350$',
    date: 'Oct 5',
    status: 'active',
    bgColor: 'bg-gray-300',
    textColor: 'text-black',
    participants: [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=2'
    ]
  }
];

export const InteractionHistory: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Interaction History</h2>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-600 hover:bg-white/50 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-white/50 rounded-lg transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {interactions.map((interaction) => (
          <div 
            key={interaction.id} 
            className={`
              ${interaction.bgColor} ${interaction.textColor} 
              rounded-2xl p-5 hover:scale-105 transition-all duration-300 cursor-pointer
              shadow-lg hover:shadow-xl
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium opacity-90">{interaction.date}</span>
              <button className={`p-1.5 rounded-lg transition-colors ${
                interaction.textColor === 'text-white' ? 'hover:bg-white/20' : 'hover:bg-black/10'
              }`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-sm mb-3 leading-tight">{interaction.type}</h3>
              <p className="text-2xl font-bold">{interaction.value}</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {interaction.participants.slice(0, 3).map((participant, i) => (
                  <div key={i} className="relative">
                    <img
                      src={participant}
                      alt={`Participant ${i + 1}`}
                      className="w-8 h-8 rounded-full border-3 border-white object-cover shadow-lg ring-2 ring-white/50"
                    />
                  </div>
                ))}
                {interaction.participants.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-3 border-white bg-gray-400 flex items-center justify-center shadow-lg ring-2 ring-white/50">
                    <span className="text-xs font-semibold text-white">+{interaction.participants.length - 3}</span>
                  </div>
                )}
              </div>
              <ArrowRight className="w-5 h-5 opacity-70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};