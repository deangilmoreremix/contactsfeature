import {
  MessageSquare, Linkedin, Mail, Twitter, Facebook, Instagram,
  User, Building, Tag, Activity
} from 'lucide-react';

export const interestColors = {
  hot: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  cold: 'bg-gray-400'
};

export const interestLabels = {
  hot: 'Hot Client',
  medium: 'Medium Interest',
  low: 'Low Interest',
  cold: 'Non Interest'
};

export const sourceColors: { [key: string]: string } = {
  'LinkedIn': 'bg-blue-600',
  'Facebook': 'bg-blue-500',
  'Email': 'bg-green-500',
  'Website': 'bg-purple-500',
  'Referral': 'bg-orange-500',
  'Typeform': 'bg-pink-500',
  'Cold Call': 'bg-gray-600'
};

export const socialPlatforms = [
  { icon: MessageSquare, color: 'bg-green-500', name: 'WhatsApp', key: 'whatsapp' },
  { icon: Linkedin, color: 'bg-blue-500', name: 'LinkedIn', key: 'linkedin' },
  { icon: Mail, color: 'bg-blue-600', name: 'Email', key: 'email' },
  { icon: Twitter, color: 'bg-blue-400', name: 'Twitter', key: 'twitter' },
  { icon: Facebook, color: 'bg-blue-700', name: 'Facebook', key: 'facebook' },
  { icon: Instagram, color: 'bg-pink-500', name: 'Instagram', key: 'instagram' },
];

export const contactTabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'journey', label: 'Journey', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: Tag },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'automation', label: 'Automation', icon: Building },
  { id: 'sales-intelligence', label: 'Sales Intelligence', icon: Tag },
  { id: 'ai-insights', label: 'AI Insights', icon: User },
  { id: 'email', label: 'Email', icon: Mail },
];

export const quickSourceSuggestions = ['LinkedIn', 'Website', 'Email', 'Cold Call', 'Referral'];