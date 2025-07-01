import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AvatarWithStatus } from '../ui/AvatarWithStatus';
import { ModernButton } from '../ui/ModernButton';
import { 
  Edit, 
  Mail, 
  Phone, 
  Plus, 
  MessageSquare,
  FileText,
  Calendar,
  MoreHorizontal,
  User,
  Globe,
  Clock
} from 'lucide-react';

const socialPlatforms = [
  { icon: MessageSquare, color: 'bg-green-500', name: 'WhatsApp' },
  { icon: Globe, color: 'bg-blue-500', name: 'LinkedIn' },
  { icon: Mail, color: 'bg-blue-600', name: 'Email' },
  { icon: MessageSquare, color: 'bg-purple-500', name: 'Discord' },
];

export const CustomerProfile: React.FC = () => {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer Profile</h3>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Edit className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="relative inline-block mb-4">
          <AvatarWithStatus
            src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2"
            alt="Eva Robinson"
            size="xl"
            status="active"
          />
        </div>
        <h4 className="text-xl font-semibold text-gray-900 mb-1">Eva Robinson</h4>
        <p className="text-gray-600 text-sm">CEO, Inc. Alabama Machinery & Supply</p>
      </div>

      <div className="flex justify-center space-x-3 mb-8">
        <ModernButton variant="outline" size="sm" className="p-2">
          <Edit className="w-4 h-4" />
        </ModernButton>
        <ModernButton variant="outline" size="sm" className="p-2">
          <Mail className="w-4 h-4" />
        </ModernButton>
        <ModernButton variant="outline" size="sm" className="p-2">
          <Phone className="w-4 h-4" />
        </ModernButton>
        <ModernButton variant="outline" size="sm" className="p-2">
          <Plus className="w-4 h-4" />
        </ModernButton>
        <ModernButton variant="outline" size="sm" className="p-2">
          <FileText className="w-4 h-4" />
        </ModernButton>
        <ModernButton variant="outline" size="sm" className="p-2">
          <Calendar className="w-4 h-4" />
        </ModernButton>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-semibold text-gray-900">Detailed Information</h5>
            <div className="flex space-x-2">
              <button className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">First Name</p>
                  <p className="text-sm text-gray-600">Eva</p>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Name</p>
                  <p className="text-sm text-gray-600">Robinson</p>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">Eva@alabamamachineries.com</p>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone Number</p>
                  <p className="text-sm text-gray-600">+91 120 222 313</p>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Socials</p>
                  <div className="flex space-x-2 mt-2">
                    {socialPlatforms.map((social, index) => {
                      const Icon = social.icon;
                      return (
                        <div 
                          key={index} 
                          className={`${social.color} p-1.5 rounded-lg text-white hover:opacity-80 transition-opacity cursor-pointer`}
                          title={social.name}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Connected</p>
                  <p className="text-sm text-gray-600">06/15/2023 at 7:16 pm</p>
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};