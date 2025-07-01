import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { 
  Search, 
  Bell, 
  Settings, 
  ChevronDown,
  BarChart3,
  Users,
  TrendingUp,
  Bot,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  FileText,
  Zap,
  Video,
  PieChart,
  Globe
} from 'lucide-react';

const aiTools = [
  { name: 'Email Composer', icon: Mail },
  { name: 'Email Analysis', icon: BarChart3 },
  { name: 'Meeting Summary', icon: Calendar },
  { name: 'Smart Search', icon: Search },
  { name: 'Business Analysis', icon: TrendingUp },
  { name: 'Subject Line Optimizer', icon: Zap },
  { name: 'Content Generator', icon: FileText },
  { name: 'Document Analysis', icon: FileText },
  { name: 'Form Validation', icon: Settings },
  { name: 'Live Deal Analysis', icon: PieChart },
  { name: 'Instant Response', icon: MessageSquare },
  { name: 'Real-time Email Composer', icon: Mail },
  { name: 'Voice Analysis Real-time', icon: MessageSquare },
  { name: 'Customer Health Monitoring', icon: Users },
  { name: 'Content Calendar', icon: Calendar },
  { name: 'Social Media Manager', icon: Globe },
  { name: 'Brand Voice Generator', icon: MessageSquare },
  { name: 'Lead Scoring', icon: TrendingUp },
  { name: 'Proposal Generator', icon: FileText },
  { name: 'Meeting Agenda', icon: Calendar },
  { name: 'Call Script Generator', icon: Phone },
  { name: 'Reasoning Email', icon: Bot },
  { name: 'Reasoning Proposal', icon: Bot },
  { name: 'Reasoning Script', icon: Bot },
  { name: 'Reasoning Objection', icon: Bot },
  { name: 'Reasoning Social', icon: Bot },
];

const salesTools = [
  { name: 'Sales Dashboard', icon: BarChart3 },
  { name: 'Lead Automation', icon: Bot },
  { name: 'Circle Prospecting', icon: TrendingUp },
  { name: 'Appointments', icon: Calendar },
  { name: 'Phone System', icon: Phone },
  { name: 'Invoicing', icon: FileText },
];

const communicationTools = [
  { name: 'Video Email', icon: Video },
  { name: 'Text Messages', icon: MessageSquare },
  { name: 'Email Composer', icon: Mail },
  { name: 'Campaigns', icon: TrendingUp },
];

const contentTools = [
  { name: 'Content Library', icon: FileText },
  { name: 'Voice Profiles', icon: MessageSquare },
  { name: 'Business Analysis', icon: BarChart3 },
];

export const EnhancedNavbar: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const Dropdown = ({ title, items, isOpen }: { title: string; items: any[]; isOpen: boolean }) => (
    <div className="relative">
      <button
        onClick={() => toggleDropdown(title)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-white/20 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-between p-4">
        {/* Left Side - Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg">Smart CRM</span>
          </div>
          
          <nav className="flex items-center space-x-1">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">
              Dashboard
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
              Contacts
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
              Pipeline
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
              AI Goals
            </button>
            
            <Dropdown 
              title="AI Tools (29+)" 
              items={aiTools} 
              isOpen={activeDropdown === 'AI Tools (29+)'} 
            />
            <Dropdown 
              title="Sales Tools" 
              items={salesTools} 
              isOpen={activeDropdown === 'Sales Tools'} 
            />
            <Dropdown 
              title="Communication" 
              items={communicationTools} 
              isOpen={activeDropdown === 'Communication'} 
            />
            <Dropdown 
              title="Content" 
              items={contentTools} 
              isOpen={activeDropdown === 'Content'} 
            />
          </nav>
        </div>

        {/* Right Side - Search, Notifications, Profile */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 cursor-pointer">
            <AvatarWithStatus
              src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
              alt="User Avatar"
              size="sm"
              status="active"
            />
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};