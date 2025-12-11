import React, { useState, useEffect } from 'react';
import { ResearchThinkingAnimation, useResearchThinking } from '../ui/ResearchThinkingAnimation';
import { CitationBadge } from '../ui/CitationBadge';
import { ResearchStatusOverlay, useResearchStatus } from '../ui/ResearchStatusOverlay';
import { webSearchService } from '../../services/webSearchService';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { Contact } from '../../types';
import { edgeFunctionService } from '../../services/edgeFunctionService';
import { analyticsService } from '../../services/analyticsService';
import { SDRPersonaSelector } from './SDRPersonaSelector';
import {
  Zap,
  Play,
  Pause,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Settings,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Filter,
  ArrowRight,
  Bell,
  RefreshCw,
  Sparkles,
  Brain,
  Award,
  Eye,
  X
} from 'lucide-react';

interface AutomationRule {
    id: string;
    name: string;
    description: string;
    trigger: string;
    actions: AutomationAction[];
    isActive: boolean;
    lastTriggered?: string | undefined;
    triggerCount: number;
    successRate: number;
    category?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
}

interface AutomationAction {
   id: string;
   type: 'email' | 'sms' | 'call' | 'task' | 'wait' | 'tag' | 'webhook' | 'notification';
   description: string;
   delay?: string;
   template?: string;
   config?: any;
   isActive?: boolean;
}

interface AutomationPanelProps {
  contact: Contact;
}

const actionIcons = {
   email: Mail,
   sms: MessageSquare,
   call: Phone,
   task: CheckCircle,
   wait: Clock,
   tag: Target,
   webhook: Zap,
   notification: Bell
};

const actionColors = {
   email: 'bg-blue-500',
   sms: 'bg-green-500',
   call: 'bg-purple-500',
   task: 'bg-orange-500',
   wait: 'bg-gray-500',
   tag: 'bg-pink-500',
   webhook: 'bg-indigo-500',
   notification: 'bg-yellow-500'
};

// Sample automation rules
const sampleAutomations: AutomationRule[] = [
   {
     id: '1',
     name: 'New Lead Welcome Sequence',
     description: 'Automated welcome series for new leads with educational content',
     trigger: 'Contact created with status "lead"',
     isActive: true,
     lastTriggered: '2024-01-20T10:30:00Z',
     triggerCount: 15,
     successRate: 78,
     category: 'Lead Nurturing',
     tags: ['welcome', 'onboarding'],
     createdAt: '2024-01-15T09:00:00Z',
     updatedAt: '2024-01-20T10:30:00Z',
     actions: [
       { id: 'action-1-1', type: 'email', description: 'Send welcome email', template: 'Welcome Template', isActive: true },
       { id: 'action-1-2', type: 'wait', description: 'Wait 2 days', delay: '2 days', isActive: true },
       { id: 'action-1-3', type: 'email', description: 'Send educational content', template: 'Education Template', isActive: true },
       { id: 'action-1-4', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
       { id: 'action-1-5', type: 'task', description: 'Schedule follow-up call', isActive: true }
     ]
   },
   {
     id: '2',
     name: 'High-Value Prospect Nurturing',
     description: 'Intensive follow-up sequence for high-value prospects',
     trigger: 'AI score > 80 and interest level = "hot"',
     isActive: true,
     lastTriggered: '2024-01-25T14:15:00Z',
     triggerCount: 8,
     successRate: 92,
     category: 'Sales Acceleration',
     tags: ['priority', 'high-value'],
     createdAt: '2024-01-10T11:00:00Z',
     updatedAt: '2024-01-25T14:15:00Z',
     actions: [
       { id: 'action-2-1', type: 'task', description: 'Schedule immediate call', isActive: true },
       { id: 'action-2-2', type: 'email', description: 'Send personalized proposal', template: 'Proposal Template', isActive: true },
       { id: 'action-2-3', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
       { id: 'action-2-4', type: 'call', description: 'Follow-up call reminder', isActive: true },
       { id: 'action-2-5', type: 'tag', description: 'Add "Priority" tag', isActive: true }
     ]
   },
   {
     id: '3',
     name: 'Engagement Recovery',
     description: 'Re-engage contacts who haven\'t responded in 14 days',
     trigger: 'No response in 14 days',
     isActive: false,
     lastTriggered: '2024-01-18T09:00:00Z',
     triggerCount: 12,
     successRate: 45,
     category: 'Re-engagement',
     tags: ['recovery', 'inactive'],
     createdAt: '2024-01-05T14:00:00Z',
     updatedAt: '2024-01-18T09:00:00Z',
     actions: [
       { id: 'action-3-1', type: 'email', description: 'Send re-engagement email', template: 'Re-engagement Template', isActive: true },
       { id: 'action-3-2', type: 'wait', description: 'Wait 5 days', delay: '5 days', isActive: true },
       { id: 'action-3-3', type: 'sms', description: 'Send follow-up SMS', isActive: true },
       { id: 'action-3-4', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
       { id: 'action-3-5', type: 'tag', description: 'Add "Unresponsive" tag', isActive: true }
     ]
   },
   {
     id: '4',
     name: 'Customer Onboarding Flow',
     description: 'Comprehensive onboarding sequence for new customers',
     trigger: 'Deal closed and contract signed',
     isActive: true,
     lastTriggered: '2024-01-28T16:45:00Z',
     triggerCount: 6,
     successRate: 85,
     category: 'Customer Success',
     tags: ['onboarding', 'customer'],
     createdAt: '2024-01-08T10:30:00Z',
     updatedAt: '2024-01-28T16:45:00Z',
     actions: [
       { id: 'action-4-1', type: 'email', description: 'Send welcome package', template: 'Customer Welcome', isActive: true },
       { id: 'action-4-2', type: 'task', description: 'Schedule onboarding call', isActive: true },
       { id: 'action-4-3', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
       { id: 'action-4-4', type: 'email', description: 'Send setup instructions', template: 'Setup Guide', isActive: true },
       { id: 'action-4-5', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
       { id: 'action-4-6', type: 'task', description: 'Check setup completion', isActive: true },
       { id: 'action-4-7', type: 'notification', description: 'Notify team of new customer', isActive: true }
     ]
   },
   {
     id: '5',
     name: 'Contract Renewal Reminder',
     description: 'Automated reminders for upcoming contract renewals',
     trigger: 'Contract expires in 60 days',
     isActive: true,
     lastTriggered: '2024-01-22T12:00:00Z',
     triggerCount: 9,
     successRate: 76,
     category: 'Retention',
     tags: ['renewal', 'contract'],
     createdAt: '2024-01-12T08:15:00Z',
     updatedAt: '2024-01-22T12:00:00Z',
     actions: [
       { id: 'action-5-1', type: 'email', description: 'Send renewal reminder', template: 'Renewal Notice', isActive: true },
       { id: 'action-5-2', type: 'wait', description: 'Wait 30 days', delay: '30 days', isActive: true },
       { id: 'action-5-3', type: 'task', description: 'Schedule renewal discussion', isActive: true },
       { id: 'action-5-4', type: 'wait', description: 'Wait 15 days', delay: '15 days', isActive: true },
       { id: 'action-5-5', type: 'email', description: 'Send final renewal notice', template: 'Final Renewal', isActive: true },
       { id: 'action-5-6', type: 'tag', description: 'Add "Renewal Due" tag', isActive: true }
     ]
   },
   {
     id: '6',
     name: 'Lead Qualification Sequence',
     description: 'Progressive qualification steps for inbound leads',
     trigger: 'Lead submitted contact form',
     isActive: true,
     lastTriggered: '2024-01-27T11:30:00Z',
     triggerCount: 23,
     successRate: 68,
     category: 'Lead Qualification',
     tags: ['qualification', 'scoring'],
     createdAt: '2024-01-14T13:45:00Z',
     updatedAt: '2024-01-27T11:30:00Z',
     actions: [
       { id: 'action-6-1', type: 'email', description: 'Send qualification questionnaire', template: 'Lead Qualifier', isActive: true },
       { id: 'action-6-2', type: 'wait', description: 'Wait 2 days', delay: '2 days', isActive: true },
       { id: 'action-6-3', type: 'task', description: 'Review qualification responses', isActive: true },
       { id: 'action-6-4', type: 'tag', description: 'Apply qualification score', isActive: true },
       { id: 'action-6-5', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
       { id: 'action-6-6', type: 'email', description: 'Send personalized follow-up', template: 'Qualified Lead', isActive: true }
     ]
   }
];

interface AutomationTemplate {
   id: string;
   name: string;
   description: string;
   category: string;
   triggers: string[];
   actions: AutomationAction[];
   isEditable: boolean;
   usageCount: number;
   createdBy: string;
   tags: string[];
}

const automationTemplates: AutomationTemplate[] = [
    {
      id: 'template-1',
      name: 'Lead Nurturing',
      description: 'Standard lead nurturing sequence with educational content',
      category: 'Lead Management',
      triggers: ['New lead', 'Form submission', 'Demo request'],
      isEditable: true,
      usageCount: 45,
      createdBy: 'System',
      tags: ['nurturing', 'education'],
      actions: [
        { id: 'temp-1-1', type: 'email', description: 'Send welcome email', template: 'Welcome Template', isActive: true },
        { id: 'temp-1-2', type: 'wait', description: 'Wait 2 days', delay: '2 days', isActive: true },
        { id: 'temp-1-3', type: 'email', description: 'Send product brochure', template: 'Product Info', isActive: true },
        { id: 'temp-1-4', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-1-5', type: 'task', description: 'Schedule follow-up call', isActive: true }
      ]
    },
    {
      id: 'template-2',
      name: 'Customer Onboarding',
      description: 'Post-sale onboarding automation with setup guidance',
      category: 'Customer Success',
      triggers: ['Deal closed', 'Contract signed', 'Payment received'],
      isEditable: true,
      usageCount: 32,
      createdBy: 'System',
      tags: ['onboarding', 'setup'],
      actions: [
        { id: 'temp-2-1', type: 'email', description: 'Send welcome package', template: 'Customer Welcome', isActive: true },
        { id: 'temp-2-2', type: 'task', description: 'Schedule onboarding call', isActive: true },
        { id: 'temp-2-3', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
        { id: 'temp-2-4', type: 'email', description: 'Send setup instructions', template: 'Setup Guide', isActive: true },
        { id: 'temp-2-5', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-2-6', type: 'task', description: 'Check setup completion', isActive: true }
      ]
    },
    {
      id: 'template-3',
      name: 'Contract Renewal Reminder',
      description: 'Automated reminders for upcoming contract renewals',
      category: 'Retention',
      triggers: ['Contract expiring soon', '60 days before renewal', '30 days before renewal'],
      isEditable: true,
      usageCount: 28,
      createdBy: 'System',
      tags: ['renewal', 'retention'],
      actions: [
        { id: 'temp-3-1', type: 'email', description: 'Send renewal reminder', template: 'Renewal Notice', isActive: true },
        { id: 'temp-3-2', type: 'wait', description: 'Wait 30 days', delay: '30 days', isActive: true },
        { id: 'temp-3-3', type: 'task', description: 'Schedule renewal discussion', isActive: true },
        { id: 'temp-3-4', type: 'wait', description: 'Wait 15 days', delay: '15 days', isActive: true },
        { id: 'temp-3-5', type: 'email', description: 'Send final renewal notice', template: 'Final Renewal', isActive: true }
      ]
    },
    {
      id: 'template-4',
      name: 'Event Follow-up',
      description: 'Post-event engagement sequence for attendees',
      category: 'Event Management',
      triggers: ['Event attended', 'Webinar completed', 'Demo attended'],
      isEditable: true,
      usageCount: 19,
      createdBy: 'System',
      tags: ['events', 'follow-up'],
      actions: [
        { id: 'temp-4-1', type: 'email', description: 'Send event recap', template: 'Event Recap', isActive: true },
        { id: 'temp-4-2', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
        { id: 'temp-4-3', type: 'email', description: 'Send related resources', template: 'Resource Pack', isActive: true },
        { id: 'temp-4-4', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-4-5', type: 'task', description: 'Schedule follow-up meeting', isActive: true }
      ]
    },
    {
      id: 'template-5',
      name: 'Re-engagement Campaign',
      description: 'Win back inactive contacts with personalized messaging',
      category: 'Re-engagement',
      triggers: ['No activity for 30 days', 'Unopened emails', 'No response'],
      isEditable: true,
      usageCount: 15,
      createdBy: 'System',
      tags: ['re-engagement', 'inactive'],
      actions: [
        { id: 'temp-5-1', type: 'email', description: 'Send re-engagement email', template: 'We Miss You', isActive: true },
        { id: 'temp-5-2', type: 'wait', description: 'Wait 5 days', delay: '5 days', isActive: true },
        { id: 'temp-5-3', type: 'sms', description: 'Send follow-up SMS', isActive: true },
        { id: 'temp-5-4', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
        { id: 'temp-5-5', type: 'email', description: 'Send special offer', template: 'Re-engagement Offer', isActive: true }
      ]
    },
    {
      id: 'template-6',
      name: 'Lead Qualification',
      description: 'Progressive qualification steps for inbound leads',
      category: 'Lead Management',
      triggers: ['Lead submitted form', 'Downloaded resource', 'Requested demo'],
      isEditable: true,
      usageCount: 37,
      createdBy: 'System',
      tags: ['qualification', 'scoring'],
      actions: [
        { id: 'temp-6-1', type: 'email', description: 'Send qualification questionnaire', template: 'Lead Qualifier', isActive: true },
        { id: 'temp-6-2', type: 'wait', description: 'Wait 2 days', delay: '2 days', isActive: true },
        { id: 'temp-6-3', type: 'task', description: 'Review qualification responses', isActive: true },
        { id: 'temp-6-4', type: 'tag', description: 'Apply qualification score', isActive: true },
        { id: 'temp-6-5', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
        { id: 'temp-6-6', type: 'email', description: 'Send personalized follow-up', template: 'Qualified Lead', isActive: true }
      ]
    },
    {
      id: 'template-7',
      name: 'Newsletter Subscription',
      description: 'Welcome sequence for new newsletter subscribers',
      category: 'Marketing',
      triggers: ['Newsletter signup', 'Email subscription', 'Content download'],
      isEditable: true,
      usageCount: 52,
      createdBy: 'System',
      tags: ['newsletter', 'marketing'],
      actions: [
        { id: 'temp-7-1', type: 'email', description: 'Send welcome to newsletter', template: 'Newsletter Welcome', isActive: true },
        { id: 'temp-7-2', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-7-3', type: 'email', description: 'Send first newsletter', template: 'Weekly Newsletter', isActive: true },
        { id: 'temp-7-4', type: 'tag', description: 'Add "Subscriber" tag', isActive: true }
      ]
    },
    {
      id: 'template-8',
      name: 'Trial Conversion',
      description: 'Convert free trial users to paid customers',
      category: 'Conversion',
      triggers: ['Trial started', '7 days before trial ends', 'Trial extended'],
      isEditable: true,
      usageCount: 24,
      createdBy: 'System',
      tags: ['trial', 'conversion'],
      actions: [
        { id: 'temp-8-1', type: 'email', description: 'Send trial welcome', template: 'Trial Welcome', isActive: true },
        { id: 'temp-8-2', type: 'wait', description: 'Wait 5 days', delay: '5 days', isActive: true },
        { id: 'temp-8-3', type: 'email', description: 'Send feature highlight', template: 'Feature Demo', isActive: true },
        { id: 'temp-8-4', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
        { id: 'temp-8-5', type: 'email', description: 'Send upgrade offer', template: 'Upgrade Offer', isActive: true },
        { id: 'temp-8-6', type: 'task', description: 'Schedule conversion call', isActive: true }
      ]
    },
    {
      id: 'template-9',
      name: 'High-Value Prospect Acceleration',
      description: 'Intensive follow-up for high-scoring prospects',
      category: 'Sales Acceleration',
      triggers: ['AI score > 85', 'Hot lead status', 'Large deal size'],
      isEditable: true,
      usageCount: 18,
      createdBy: 'System',
      tags: ['priority', 'acceleration'],
      actions: [
        { id: 'temp-9-1', type: 'task', description: 'Schedule immediate call', isActive: true },
        { id: 'temp-9-2', type: 'email', description: 'Send personalized proposal', template: 'Proposal Template', isActive: true },
        { id: 'temp-9-3', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
        { id: 'temp-9-4', type: 'notification', description: 'Follow-up call reminder', isActive: true },
        { id: 'temp-9-5', type: 'tag', description: 'Add "Priority" tag', isActive: true }
      ]
    },
    {
      id: 'template-10',
      name: 'Customer Feedback Collection',
      description: 'Gather feedback after key interactions',
      category: 'Customer Success',
      triggers: ['Deal closed', 'Support ticket resolved', 'Product delivered'],
      isEditable: true,
      usageCount: 31,
      createdBy: 'System',
      tags: ['feedback', 'survey'],
      actions: [
        { id: 'temp-10-1', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
        { id: 'temp-10-2', type: 'email', description: 'Send feedback survey', template: 'Feedback Survey', isActive: true },
        { id: 'temp-10-3', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-10-4', type: 'email', description: 'Follow-up if no response', template: 'Feedback Reminder', isActive: true },
        { id: 'temp-10-5', type: 'webhook', description: 'Update contact record', isActive: true }
      ]
    },
    {
      id: 'template-11',
      name: 'Referral Program Enrollment',
      description: 'Encourage satisfied customers to refer others',
      category: 'Growth',
      triggers: ['Customer satisfaction > 90%', 'Deal closed successfully', 'Positive review'],
      isEditable: true,
      usageCount: 22,
      createdBy: 'System',
      tags: ['referral', 'growth'],
      actions: [
        { id: 'temp-11-1', type: 'email', description: 'Send referral invitation', template: 'Referral Invite', isActive: true },
        { id: 'temp-11-2', type: 'wait', description: 'Wait 5 days', delay: '5 days', isActive: true },
        { id: 'temp-11-3', type: 'email', description: 'Send referral toolkit', template: 'Referral Resources', isActive: true },
        { id: 'temp-11-4', type: 'tag', description: 'Add "Referral Eligible" tag', isActive: true }
      ]
    },
    {
      id: 'template-12',
      name: 'Abandoned Cart Recovery',
      description: 'Re-engage contacts who abandoned processes',
      category: 'Conversion',
      triggers: ['Cart abandoned', 'Demo not completed', 'Form partially filled'],
      isEditable: true,
      usageCount: 29,
      createdBy: 'System',
      tags: ['recovery', 'abandoned'],
      actions: [
        { id: 'temp-12-1', type: 'wait', description: 'Wait 1 day', delay: '1 day', isActive: true },
        { id: 'temp-12-2', type: 'email', description: 'Send recovery email', template: 'Cart Recovery', isActive: true },
        { id: 'temp-12-3', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-12-4', type: 'email', description: 'Send discount offer', template: 'Recovery Offer', isActive: true },
        { id: 'temp-12-5', type: 'task', description: 'Schedule recovery call', isActive: true }
      ]
    },
    {
      id: 'template-13',
      name: 'Industry News Alerts',
      description: 'Share relevant industry updates',
      category: 'Engagement',
      triggers: ['New industry news', 'Company milestones', 'Market changes'],
      isEditable: true,
      usageCount: 16,
      createdBy: 'System',
      tags: ['news', 'industry'],
      actions: [
        { id: 'temp-13-1', type: 'webhook', description: 'Monitor news sources', isActive: true },
        { id: 'temp-13-2', type: 'email', description: 'Send personalized alert', template: 'Industry Update', isActive: true },
        { id: 'temp-13-3', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
        { id: 'temp-13-4', type: 'email', description: 'Send follow-up insights', template: 'Industry Analysis', isActive: true }
      ]
    },
    {
      id: 'template-14',
      name: 'Birthday/Celebration Recognition',
      description: 'Personal touch for special dates',
      category: 'Relationship Building',
      triggers: ['Birthday approaching', 'Work anniversary', 'Company milestone'],
      isEditable: true,
      usageCount: 41,
      createdBy: 'System',
      tags: ['birthday', 'celebration'],
      actions: [
        { id: 'temp-14-1', type: 'wait', description: 'Wait until date', delay: 'until date', isActive: true },
        { id: 'temp-14-2', type: 'email', description: 'Send personalized greeting', template: 'Birthday Card', isActive: true },
        { id: 'temp-14-3', type: 'tag', description: 'Add celebration tag', isActive: true },
        { id: 'temp-14-4', type: 'task', description: 'Schedule follow-up', isActive: true }
      ]
    },
    {
      id: 'template-15',
      name: 'Competitor Monitoring',
      description: 'Alert on competitor activities',
      category: 'Intelligence',
      triggers: ['Competitor news', 'Market share changes', 'New product launches'],
      isEditable: true,
      usageCount: 12,
      createdBy: 'System',
      tags: ['competitor', 'intelligence'],
      actions: [
        { id: 'temp-15-1', type: 'webhook', description: 'Monitor competitor data', isActive: true },
        { id: 'temp-15-2', type: 'email', description: 'Send intelligence brief', template: 'Competitor Alert', isActive: true },
        { id: 'temp-15-3', type: 'webhook', description: 'Update contact strategy', isActive: true }
      ]
    },
    {
      id: 'template-16',
      name: 'Training Program Enrollment',
      description: 'Guide contacts through learning paths',
      category: 'Education',
      triggers: ['New customer', 'Skill gap identified', 'Product upgrade'],
      isEditable: true,
      usageCount: 27,
      createdBy: 'System',
      tags: ['training', 'education'],
      actions: [
        { id: 'temp-16-1', type: 'email', description: 'Send training invitation', template: 'Training Invite', isActive: true },
        { id: 'temp-16-2', type: 'wait', description: 'Wait 2 days', delay: '2 days', isActive: true },
        { id: 'temp-16-3', type: 'email', description: 'Send first training module', template: 'Module 1', isActive: true },
        { id: 'temp-16-4', type: 'task', description: 'Schedule training call', isActive: true }
      ]
    },
    {
      id: 'template-17',
      name: 'Partnership Outreach',
      description: 'Build strategic partnerships',
      category: 'Business Development',
      triggers: ['Mutual connections', 'Industry events', 'Shared interests'],
      isEditable: true,
      usageCount: 14,
      createdBy: 'System',
      tags: ['partnership', 'business-development'],
      actions: [
        { id: 'temp-17-1', type: 'email', description: 'Send partnership proposal', template: 'Partnership Intro', isActive: true },
        { id: 'temp-17-2', type: 'wait', description: 'Wait 5 days', delay: '5 days', isActive: true },
        { id: 'temp-17-3', type: 'task', description: 'Schedule discovery call', isActive: true },
        { id: 'temp-17-4', type: 'email', description: 'Send partnership resources', template: 'Partnership Kit', isActive: true }
      ]
    },
    {
      id: 'template-18',
      name: 'Compliance Reminder',
      description: 'Ensure regulatory compliance',
      category: 'Compliance',
      triggers: ['Annual review due', 'Policy updates', 'Regulatory changes'],
      isEditable: true,
      usageCount: 33,
      createdBy: 'System',
      tags: ['compliance', 'regulatory'],
      actions: [
        { id: 'temp-18-1', type: 'email', description: 'Send compliance reminder', template: 'Compliance Notice', isActive: true },
        { id: 'temp-18-2', type: 'wait', description: 'Wait 14 days', delay: '14 days', isActive: true },
        { id: 'temp-18-3', type: 'email', description: 'Send follow-up', template: 'Compliance Follow-up', isActive: true },
        { id: 'temp-18-4', type: 'webhook', description: 'Update compliance status', isActive: true }
      ]
    },
    {
      id: 'template-19',
      name: 'Seasonal Campaign',
      description: 'Time-based marketing campaigns',
      category: 'Marketing',
      triggers: ['Holiday approaching', 'Season start', 'Industry events'],
      isEditable: true,
      usageCount: 38,
      createdBy: 'System',
      tags: ['seasonal', 'campaign'],
      actions: [
        { id: 'temp-19-1', type: 'email', description: 'Send seasonal greeting', template: 'Seasonal Campaign', isActive: true },
        { id: 'temp-19-2', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
        { id: 'temp-19-3', type: 'email', description: 'Send promotional offer', template: 'Seasonal Offer', isActive: true },
        { id: 'temp-19-4', type: 'tag', description: 'Add seasonal tag', isActive: true }
      ]
    },
    {
      id: 'template-20',
      name: 'Account Health Monitoring',
      description: 'Proactively manage account relationships',
      category: 'Account Management',
      triggers: ['Low engagement', 'Declining metrics', 'Contract milestone'],
      isEditable: true,
      usageCount: 25,
      createdBy: 'System',
      tags: ['account-health', 'monitoring'],
      actions: [
        { id: 'temp-20-1', type: 'webhook', description: 'Analyze account health', isActive: true },
        { id: 'temp-20-2', type: 'email', description: 'Send health check email', template: 'Health Check', isActive: true },
        { id: 'temp-20-3', type: 'wait', description: 'Wait 7 days', delay: '7 days', isActive: true },
        { id: 'temp-20-4', type: 'task', description: 'Schedule account review', isActive: true },
        { id: 'temp-20-5', type: 'email', description: 'Send improvement recommendations', template: 'Account Insights', isActive: true }
      ]
    }
 ];

export const AutomationPanel: React.FC<AutomationPanelProps> = ({ contact }) => {
    const [activeTab, setActiveTab] = useState('active');
    const [automations, setAutomations] = useState<AutomationRule[]>(sampleAutomations);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [draggedAction, setDraggedAction] = useState<{ automationId: string; actionIndex: number } | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [ruleForm, setRuleForm] = useState({
      name: '',
      description: '',
      trigger: '',
      isActive: true,
      category: 'Custom',
      actions: [] as AutomationAction[]
    });

    // Inline editing states
    const [editingAction, setEditingAction] = useState<{ruleId: string; actionId: string} | null>(null);
    const [actionEditForm, setActionEditForm] = useState<Partial<AutomationAction>>({});

    // Template editing states
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AutomationTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState<Partial<AutomationTemplate>>({});

   // Research state management
   const researchThinking = useResearchThinking();
   const researchStatus = useResearchStatus();
   const [researchSources, setResearchSources] = useState<any[]>([]);

  const tabs = [
    { id: 'active', label: 'Active Rules', icon: Play },
    { id: 'suggestions', label: 'AI Suggestions', icon: Brain },
    { id: 'templates', label: 'Templates', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => 
      auto.id === id ? { ...auto, isActive: !auto.isActive } : auto
    ));
  };

  const optimizeRule = async (ruleId: string, suggestions: any[]) => {
    setIsOptimizing(true);
    try {
      console.log('Optimizing rule:', ruleId, suggestions);
      // Update the automation with optimizations
      setAutomations(prev => prev.map(auto =>
        auto.id === ruleId ? { ...auto, successRate: Math.min(100, auto.successRate + 10) } : auto
      ));
      // In real implementation, call API to optimize
    } catch (error) {
      console.error('Failed to optimize rule:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateSuggestions = async () => {
     researchThinking.startResearch('🔍 Researching company for automation opportunities...');

     try {
       setLoading(true);
       setError(null);

       researchThinking.moveToAnalyzing('🌐 Analyzing company news and industry trends...');

       // Check if this is mock data
       const isMockData = contact.isMockData || contact.dataSource === 'mock' || contact.createdBy === 'demo';

       let searchResults: any = { content: '', sources: [] };

       if (!isMockData) {
         // Perform web search for company and industry context
         const searchQuery = `${contact.company} ${contact.firstName} ${contact.lastName} company news industry trends automation opportunities`;
         const systemPrompt = `You are an automation strategist. Analyze this contact's company and industry to suggest intelligent automation opportunities. Focus on triggers based on company events, industry trends, and contact behavior patterns.`;
         const userPrompt = `Analyze ${contact.firstName} ${contact.lastName} at ${contact.company} for automation opportunities. Suggest intelligent triggers based on company news, industry trends, and optimal automation timing.`;

         searchResults = await webSearchService.searchWithAI(
           searchQuery,
           systemPrompt,
           userPrompt,
           {
             includeSources: true,
             searchContextSize: 'high'
           }
         );
       }

       researchThinking.moveToSynthesizing('🤖 Generating intelligent automation suggestions...');

       // Convert search results to citations
       const sources = (searchResults.sources || []).map((source: any) => ({
         url: source.url,
         title: source.title,
         domain: source.domain,
         type: 'company' as const,
         confidence: 85,
         timestamp: new Date(),
         snippet: searchResults.content.substring(0, 200) + '...'
       }));

       setResearchSources(sources);

       // Generate mock suggestions for demo or real suggestions for actual contacts
       let suggestionsData: any[] = [];

       if (isMockData) {
         // Mock suggestions for demo contacts
         suggestionsData = [
           {
             id: 'suggestion-1',
             title: 'Company News Monitoring',
             type: 'new_rule',
             priority: 'high',
             confidence: 92,
             description: `Monitor ${contact.company} for news and automatically send personalized updates to ${contact.firstName}`,
             estimatedImpact: { efficiency: 35, coverage: 1, timesSaved: 2.5 },
             reasoning: [
               `Based on ${contact.company}'s industry position, news monitoring would be valuable`,
               'Contact has high engagement potential based on profile analysis',
               'Automated news alerts would demonstrate thought leadership'
             ],
             createdAt: new Date().toISOString()
           },
           {
             id: 'suggestion-2',
             title: 'Industry Trend Alerts',
             type: 'optimize_existing',
             priority: 'medium',
             confidence: 78,
             description: `Enhance existing nurturing sequence with ${contact.industry} trend updates`,
             estimatedImpact: { efficiency: 25, coverage: 15, timesSaved: 1.8 },
             reasoning: [
               'Contact works in dynamic industry requiring trend awareness',
               'Current sequence could benefit from industry context',
               'Would increase engagement rates significantly'
             ],
             createdAt: new Date().toISOString()
           },
           {
             id: 'suggestion-3',
             title: 'Personalized Content Series',
             type: 'merge_rules',
             priority: 'medium',
             confidence: 85,
             description: 'Combine multiple sequences into personalized content journey based on contact interests',
             estimatedImpact: { efficiency: 40, coverage: 8, timesSaved: 3.2 },
             reasoning: [
               'Contact has multiple touchpoints that could be streamlined',
               'Personalization would improve conversion rates',
               'Reduces redundant communications'
             ],
             createdAt: new Date().toISOString()
           }
         ];
       } else {
         // Generate automation suggestions with enhanced context
         // Generate AI suggestions based on web research and contact data
         const suggestions = (() => {
           // Generate AI suggestions based on contact data and web research
           const suggestions = [];

           // Analyze contact data for automation opportunities
           const hasHighScore = contact.aiScore && contact.aiScore > 80;
           const isHotLead = contact.interestLevel === 'hot';
           const hasCompany = contact.company && contact.company.trim() !== '';
           const hasIndustry = contact.industry && contact.industry.trim() !== '';
           const isInactive = contact.lastConnected && new Date(contact.lastConnected) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

           // Suggestion 1: Company news monitoring for high-value contacts
           if (hasHighScore && hasCompany) {
             suggestions.push({
               id: 'suggestion-company-news',
               title: 'Company News Monitoring',
               type: 'new_rule',
               priority: 'high',
               confidence: 92,
               description: `Monitor ${contact.company} for news and automatically send personalized updates to ${contact.firstName || contact.name.split(' ')[0]}`,
               estimatedImpact: { efficiency: 35, coverage: 1, timesSaved: 2.5 },
               reasoning: [
                 `Based on ${contact.company}'s industry position, news monitoring would be valuable`,
                 'Contact has high engagement potential based on profile analysis',
                 'Automated news alerts would demonstrate thought leadership'
               ],
               createdAt: new Date().toISOString()
             });
           }

           // Suggestion 2: Industry trend alerts
           if (hasIndustry && (searchResults?.sources?.length > 0 || contact.industry)) {
             suggestions.push({
               id: 'suggestion-industry-trends',
               title: 'Industry Trend Alerts',
               type: 'optimize_existing',
               priority: 'medium',
               confidence: 78,
               description: `Enhance existing nurturing sequence with ${contact.industry} trend updates`,
               estimatedImpact: { efficiency: 25, coverage: 15, timesSaved: 1.8 },
               reasoning: [
                 'Contact works in dynamic industry requiring trend awareness',
                 'Current sequence could benefit from industry context',
                 'Would increase engagement rates significantly'
               ],
               createdAt: new Date().toISOString()
             });
           }

           // Suggestion 3: Personalized content series
           if (isHotLead) {
             suggestions.push({
               id: 'suggestion-personalized-content',
               title: 'Personalized Content Series',
               type: 'merge_rules',
               priority: 'medium',
               confidence: 85,
               description: 'Combine multiple sequences into personalized content journey based on contact interests',
               estimatedImpact: { efficiency: 40, coverage: 8, timesSaved: 3.2 },
               reasoning: [
                 'Contact has multiple touchpoints that could be streamlined',
                 'Personalization would improve conversion rates',
                 'Reduces redundant communications'
               ],
               createdAt: new Date().toISOString()
             });
           }

           // Suggestion 4: Re-engagement sequence for inactive contacts
           if (isInactive) {
             suggestions.push({
               id: 'suggestion-re-engagement',
               title: 'Re-engagement Sequence',
               type: 'new_rule',
               priority: 'high',
               confidence: 88,
               description: `Create automated re-engagement sequence for ${contact.firstName || contact.name.split(' ')[0]} who hasn't been active recently`,
               estimatedImpact: { efficiency: 50, coverage: 1, timesSaved: 4.0 },
               reasoning: [
                 'Contact has been inactive for an extended period',
                 'Re-engagement sequences have high conversion potential',
                 'Automated approach ensures consistent follow-up'
               ],
               createdAt: new Date().toISOString()
             });
           }

           // Suggestion 5: Lead scoring automation
           if (!hasHighScore && contact.status === 'lead') {
             suggestions.push({
               id: 'suggestion-lead-scoring',
               title: 'Automated Lead Scoring',
               type: 'new_rule',
               priority: 'medium',
               confidence: 82,
               description: `Implement automated lead scoring based on ${contact.firstName || contact.name.split(' ')[0]}'s engagement and profile data`,
               estimatedImpact: { efficiency: 30, coverage: 1, timesSaved: 1.5 },
               reasoning: [
                 'Lead scoring would help prioritize this contact appropriately',
                 'Automated scoring ensures consistent evaluation criteria',
                 'Would improve sales team efficiency'
               ],
               createdAt: new Date().toISOString()
             });
           }

           // Suggestion 6: Follow-up reminder sequence
           if (contact.status === 'prospect' || contact.status === 'customer') {
             suggestions.push({
               id: 'suggestion-follow-up-reminder',
               title: 'Follow-up Reminder Sequence',
               type: 'new_rule',
               priority: 'high',
               confidence: 90,
               description: `Set up automated follow-up reminders for ${contact.firstName || contact.name.split(' ')[0]} in ${contact.status} stage`,
               estimatedImpact: { efficiency: 45, coverage: 1, timesSaved: 3.0 },
               reasoning: [
                 `Contact is in ${contact.status} stage and needs consistent follow-up`,
                 'Automated reminders ensure no opportunities are missed',
                 'Improves conversion rates in critical sales stages'
               ],
               createdAt: new Date().toISOString()
             });
           }

           return suggestions;
         })();

         suggestionsData = suggestions || [];
       }

       setSuggestions(suggestionsData);

       researchThinking.complete('✅ Intelligent automation suggestions generated!');

     } catch (error) {
       console.error('Failed to generate automation suggestions:', error);
       console.log('Error details:', {
         message: error instanceof Error ? error.message : 'Unknown error',
         stack: error instanceof Error ? error.stack : undefined,
         contact: contact.name,
         contactId: contact.id
       });
       researchThinking.complete('❌ Failed to generate suggestions');
       setError('Failed to generate automation suggestions');
     } finally {
       setLoading(false);
     }
   };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (isActive: boolean, successRate: number) => {
    if (!isActive) return 'text-gray-500 bg-gray-100';
    if (successRate >= 80) return 'text-green-600 bg-green-100';
    if (successRate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleActionDragStart = (automationId: string, actionIndex: number) => {
    setDraggedAction({ automationId, actionIndex });
  };

  const handleActionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleActionDrop = (e: React.DragEvent, automationId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedAction || draggedAction.automationId !== automationId) return;

    setAutomations(prev => prev.map(auto => {
      if (auto.id === automationId) {
        const actions = [...auto.actions];
        const [draggedActionData] = actions.splice(draggedAction.actionIndex, 1);
        if (draggedActionData) {
          actions.splice(targetIndex, 0, draggedActionData);
        }
        return { ...auto, actions };
      }
      return auto;
    }));

    setDraggedAction(null);
  };

  const handleCreateRule = () => {
     setRuleForm({
       name: '',
       description: '',
       trigger: '',
       isActive: true,
       category: '',
       actions: []
     });
     setEditingRule(null);
     setShowCreateModal(true);
   };

  const handleEditRule = (rule: AutomationRule) => {
   setRuleForm({
     name: rule.name,
     description: rule.description,
     trigger: rule.trigger,
     isActive: rule.isActive,
     category: rule.category || 'Custom',
     actions: [...rule.actions]
   });
   setEditingRule(rule);
   setShowCreateModal(true);
 };

  const handleSaveRule = () => {
     if (!ruleForm.name.trim() || !ruleForm.trigger.trim()) {
       alert('Please fill in all required fields');
       return;
     }

     const newRule: AutomationRule = {
       id: editingRule?.id || `rule-${Date.now()}`,
       name: ruleForm.name,
       description: ruleForm.description,
       trigger: ruleForm.trigger,
       isActive: ruleForm.isActive,
       actions: ruleForm.actions,
       lastTriggered: editingRule?.lastTriggered || undefined,
       triggerCount: editingRule?.triggerCount || 0,
       successRate: editingRule?.successRate || 0,
       category: editingRule?.category || 'Custom',
       tags: editingRule?.tags || [],
       createdAt: editingRule?.createdAt || new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     if (editingRule) {
       // Update existing rule
       setAutomations(prev => prev.map(rule =>
         rule.id === editingRule.id ? newRule : rule
       ));
     } else {
       // Add new rule
       setAutomations(prev => [...prev, newRule]);
     }

     setShowCreateModal(false);
     setRuleForm({
       name: '',
       description: '',
       trigger: '',
       isActive: true,
       category: 'Custom',
       actions: []
     });
     setEditingRule(null);
   };

  const handleQuickCreateAutomation = (suggestion: any) => {
    // Create a basic automation from the suggestion
    const newAutomation: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: suggestion.title,
      description: suggestion.description,
      trigger: suggestion.trigger || 'Manual trigger',
      isActive: false, // Start inactive so user can review
      actions: [
        {
          id: `action-${Date.now()}-1`,
          type: 'email',
          description: 'Send personalized email',
          template: 'Default Template',
          isActive: true
        },
        {
          id: `action-${Date.now()}-2`,
          type: 'wait',
          description: 'Wait for response',
          delay: '3 days',
          isActive: true
        },
        {
          id: `action-${Date.now()}-3`,
          type: 'task',
          description: 'Follow up',
          isActive: true
        }
      ],
      triggerCount: 0,
      successRate: 0,
      category: 'AI Generated',
      tags: ['ai-suggested'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setAutomations(prev => [...prev, newAutomation]);
    alert(`AI-suggested automation "${suggestion.title}" has been created! Review and customize it before activating.`);
  };

  const handleEditAction = (ruleId: string, actionId: string) => {
    const rule = automations.find(r => r.id === ruleId);
    const action = rule?.actions.find(a => a.id === actionId);
    if (action) {
      setEditingAction({ ruleId, actionId });
      setActionEditForm({ ...action });
    }
  };

  const handleSaveActionEdit = () => {
    if (!editingAction || !actionEditForm.description?.trim()) {
      return;
    }

    setAutomations(prev => prev.map(rule => {
      if (rule.id === editingAction.ruleId) {
        return {
          ...rule,
          actions: rule.actions.map(action =>
            action.id === editingAction.actionId
              ? { ...action, ...actionEditForm }
              : action
          ),
          updatedAt: new Date().toISOString()
        };
      }
      return rule;
    }));

    setEditingAction(null);
    setActionEditForm({});
  };

  const handleCancelActionEdit = () => {
    setEditingAction(null);
    setActionEditForm({});
  };

  const handleToggleAction = (ruleId: string, actionId: string) => {
    setAutomations(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          actions: rule.actions.map(action =>
            action.id === actionId
              ? { ...action, isActive: !action.isActive }
              : action
          ),
          updatedAt: new Date().toISOString()
        };
      }
      return rule;
    }));
  };

  const handleDeleteAction = (ruleId: string, actionId: string) => {
    setAutomations(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          actions: rule.actions.filter(action => action.id !== actionId),
          updatedAt: new Date().toISOString()
        };
      }
      return rule;
    }));
  };

  const handleUseTemplate = (template: AutomationTemplate) => {
    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: `${template.name} (Copy)`,
      description: template.description,
      trigger: template.triggers[0] || 'Custom trigger',
      isActive: false,
      actions: template.actions.map(action => ({ ...action, id: `action-${Date.now()}-${Math.random()}` })),
      triggerCount: 0,
      successRate: 0,
      category: template.category,
      tags: [...template.tags],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setAutomations(prev => [...prev, newRule]);
    alert(`Template "${template.name}" has been added to your automations. Edit it to customize the trigger and actions.`);
  };

  const handleEditTemplate = (template: AutomationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ ...template });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name?.trim() || !templateForm.description?.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // In a real app, this would save to a database
    // For now, we'll just update the local array
    const updatedTemplate = { ...editingTemplate!, ...templateForm };
    const index = automationTemplates.findIndex(t => t.id === editingTemplate!.id);
    if (index !== -1) {
      automationTemplates[index] = updatedTemplate;
    }

    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm({});
    alert('Template updated successfully!');
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this automation rule?')) {
      setAutomations(prev => prev.filter(rule => rule.id !== ruleId));
    }
  };

  const handleAddAction = () => {
      setRuleForm(prev => ({
        ...prev,
        actions: [...prev.actions, {
          id: `action-${Date.now()}`,
          type: 'email',
          description: 'New action',
          isActive: true
        }]
      }));
    };

  const handleUpdateAction = (index: number, updates: Partial<AutomationAction>) => {
    setRuleForm(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      )
    }));
  };

  const handleRemoveAction = (index: number) => {
    setRuleForm(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
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

      {/* Template Edit Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                  </h3>
                  <p className="text-sm text-gray-600">Customize automation template</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name || ''}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Lead Nurturing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={templateForm.category || ''}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    <option value="Lead Management">Lead Management</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Retention">Retention</option>
                    <option value="Re-engagement">Re-engagement</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Event Management">Event Management</option>
                    <option value="Conversion">Conversion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={templateForm.description || ''}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe what this template does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Common Triggers</label>
                <input
                  type="text"
                  value={(templateForm.triggers || []).join(', ')}
                  onChange={(e) => setTemplateForm(prev => ({
                    ...prev,
                    triggers: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., New lead, Form submission, Demo request"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <ModernButton
                variant="outline"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={handleSaveTemplate}
                disabled={!templateForm.name?.trim() || !templateForm.description?.trim()}
              >
                Save Template
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingRule ? 'Edit Automation Rule' : 'Create New Automation Rule'}
                  </h3>
                  <p className="text-sm text-gray-600">Configure triggers and actions for automated workflows</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!editingRule && (
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Quick setup with common template
                      setRuleForm({
                        name: 'Quick Lead Nurture',
                        description: 'Basic nurturing sequence for new leads',
                        trigger: 'Contact created with status "lead"',
                        isActive: true,
                        category: 'Lead Management',
                        actions: [
                          { id: 'quick-1', type: 'email', description: 'Send welcome email', template: 'Welcome Template', isActive: true },
                          { id: 'quick-2', type: 'wait', description: 'Wait 3 days', delay: '3 days', isActive: true },
                          { id: 'quick-3', type: 'task', description: 'Schedule follow-up call', isActive: true }
                        ]
                      });
                    }}
                    className="text-xs"
                  >
                    Quick Setup
                  </ModernButton>
                )}
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
                    <input
                      type="text"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., New Lead Welcome Sequence"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={ruleForm.category || ''}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      <option value="Lead Management">Lead Management</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="Retention">Retention</option>
                      <option value="Re-engagement">Re-engagement</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Event Management">Event Management</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Describe what this automation rule does..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Condition *</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={ruleForm.trigger}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, trigger: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Contact created with status 'lead'"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setRuleForm(prev => ({ ...prev, trigger: 'Contact created with status "lead"' }))}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        New Lead
                      </button>
                      <button
                        onClick={() => setRuleForm(prev => ({ ...prev, trigger: 'AI score > 80 and interest level = "hot"' }))}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        High-Value Prospect
                      </button>
                      <button
                        onClick={() => setRuleForm(prev => ({ ...prev, trigger: 'No response in 14 days' }))}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        No Response
                      </button>
                      <button
                        onClick={() => setRuleForm(prev => ({ ...prev, trigger: 'Deal closed and contract signed' }))}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        Deal Closed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={ruleForm.isActive}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Rule is active</label>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-gray-900">Actions</h4>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={handleAddAction}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Action</span>
                  </ModernButton>
                </div>

                <div className="space-y-3">
                  {ruleForm.actions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <select
                        value={action.type}
                        onChange={(e) => handleUpdateAction(index, { type: e.target.value as AutomationAction['type'] })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="call">Call</option>
                        <option value="task">Task</option>
                        <option value="wait">Wait</option>
                        <option value="tag">Tag</option>
                        <option value="webhook">Webhook</option>
                        <option value="notification">Notification</option>
                      </select>

                      <input
                        type="text"
                        value={action.description}
                        onChange={(e) => handleUpdateAction(index, { description: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Action description"
                      />

                      {action.type === 'wait' && (
                        <input
                          type="text"
                          value={action.delay || ''}
                          onChange={(e) => handleUpdateAction(index, { delay: e.target.value })}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 2 days"
                        />
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={action.isActive !== false}
                          onChange={(e) => handleUpdateAction(index, { isActive: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          title="Action is active"
                        />
                        <button
                          onClick={() => handleRemoveAction(index)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <ModernButton
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={handleSaveRule}
                disabled={!ruleForm.name.trim() || !ruleForm.trigger.trim()}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-7 h-7 mr-3 text-yellow-500" />
            Automation Center
          </h3>
          <p className="text-gray-600">Intelligent automation rules for {contact.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <ModernButton variant="outline" size="sm" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            <ModernButton 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateSuggestions}
              loading={loading}
              className="flex items-center space-x-2 bg-purple-50 text-purple-700 border-purple-200"
            >
              <Brain className="w-4 h-4" />
              <span>{loading ? 'Analyzing...' : 'AI Suggestions'}</span>
              <Sparkles className="w-3 h-3 text-yellow-500" />
            </ModernButton>
          </ModernButton>
          <ModernButton
            variant="primary"
            size="sm"
            onClick={handleCreateRule}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Rule</span>
          </ModernButton>
        </div>
      </div>

      {/* Automation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4" aria-label={`${automations.filter(a => a.isActive).length} active automation rules`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{automations.filter(a => a.isActive).length}</p>
              <p className="text-sm text-gray-600">Active Rules</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(automations.reduce((sum, a) => sum + a.successRate, 0) / automations.length)}%
              </p>
              <p className="text-sm text-gray-600">Avg Success Rate</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {suggestions.length}
              </p>
              <p className="text-sm text-gray-600">AI Suggestions</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">2.4h</p>
              <p className="text-sm text-gray-600">Time Saved</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-label={`Switch to ${tab.label} tab`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* SDR Personas Section */}
      <div className="mb-8">
        <SDRPersonaSelector
          contact={contact}
          categoryFilter={[
            'course_creator_nurture',
            'trial_to_paid_conversion',
            'upsell_cross_sell',
            'churn_winback',
            'list_reactivation',
            'abandoned_cart_recovery'
          ]}
          title="Lifecycle & Nurture SDRs"
          description="AI-powered SDR personas for lifecycle management and lead nurturing"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {automations.map((automation) => (
            <GlassCard key={automation.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{automation.name}</h4>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      getStatusColor(automation.isActive, automation.successRate)
                    }`}>
                      {automation.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {automation.successRate}% success rate
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{automation.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Trigger: {automation.trigger}</span>
                    {automation.lastTriggered && (
                      <span>Last triggered: {formatDate(automation.lastTriggered)}</span>
                    )}
                    <span>{automation.triggerCount} total triggers</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAutomation(automation.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      automation.isActive
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-label={automation.isActive ? `Pause automation rule ${automation.name}` : `Activate automation rule ${automation.name}`}
                  >
                    {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => handleEditRule(automation)}
                    aria-label={`Edit automation rule ${automation.name}`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => handleDeleteRule(automation.id)}
                    aria-label={`Delete automation rule ${automation.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Action Flow */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-gray-700">Action Flow:</h5>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRuleForm({
                        name: automation.name,
                        description: automation.description,
                        trigger: automation.trigger,
                        isActive: automation.isActive,
                        category: automation.category || 'Custom',
                        actions: [...automation.actions]
                      });
                      setEditingRule(automation);
                      setShowCreateModal(true);
                    }}
                    className="text-xs"
                  >
                    Edit Actions
                  </ModernButton>
                </div>
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {automation.actions.map((action, index) => {
                    const Icon = actionIcons[action.type] || Mail;
                    const color = actionColors[action.type] || 'bg-gray-500';

                    return (
                      <React.Fragment key={action.id}>
                        <div
                          className={`flex flex-col items-center space-y-1 min-w-0 flex-shrink-0 cursor-move relative group ${
                            action.isActive === false ? 'opacity-50' : ''
                          }`}
                          draggable
                          onDragStart={() => handleActionDragStart(automation.id, index)}
                          onDragOver={handleActionDragOver}
                          onDrop={(e) => handleActionDrop(e, automation.id, index)}
                        >
                          {editingAction?.ruleId === automation.id && editingAction?.actionId === action.id ? (
                            <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg min-w-64">
                              <div className="space-y-3">
                                <select
                                  value={actionEditForm.type || action.type}
                                  onChange={(e) => setActionEditForm(prev => ({ ...prev, type: e.target.value as AutomationAction['type'] }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="email">Email</option>
                                  <option value="sms">SMS</option>
                                  <option value="call">Call</option>
                                  <option value="task">Task</option>
                                  <option value="wait">Wait</option>
                                  <option value="tag">Tag</option>
                                  <option value="webhook">Webhook</option>
                                  <option value="notification">Notification</option>
                                </select>
                                <input
                                  type="text"
                                  value={actionEditForm.description || action.description}
                                  onChange={(e) => setActionEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Action description"
                                />
                                {(actionEditForm.type || action.type) === 'wait' && (
                                  <input
                                    type="text"
                                    value={actionEditForm.delay || action.delay || ''}
                                    onChange={(e) => setActionEditForm(prev => ({ ...prev, delay: e.target.value }))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="e.g., 2 days"
                                  />
                                )}
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleCancelActionEdit}
                                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveActionEdit}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center relative`}>
                                <Icon className="w-4 h-4 text-white" />
                                {action.isActive === false && (
                                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                                    <X className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-600 text-center max-w-20 truncate" title={action.description}>
                                {action.description}
                              </span>
                              {action.delay && (
                                <span className="text-xs text-gray-400">{action.delay}</span>
                              )}
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditAction(automation.id, action.id)}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit action"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleToggleAction(automation.id, action.id)}
                                  className={`p-1 rounded ${
                                    action.isActive === false
                                      ? 'text-green-400 hover:text-green-600 hover:bg-green-50'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                  }`}
                                  title={action.isActive === false ? 'Enable action' : 'Disable action'}
                                >
                                  {action.isActive === false ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteAction(automation.id, action.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete action"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {index < automation.actions.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <GlassCard className="p-8">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No AI suggestions available</p>
                  <ModernButton
                    variant="primary"
                    onClick={handleGenerateSuggestions}
                    loading={isOptimizing}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Suggestions</span>
                  </ModernButton>
                </div>
              </div>
            </GlassCard>
          ) : (
            suggestions.map((suggestion) => (
              <GlassCard key={suggestion.id} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    suggestion.type === 'new_rule' ? 'bg-green-500' :
                    suggestion.type === 'optimize_existing' ? 'bg-blue-500' :
                    suggestion.type === 'merge_rules' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{suggestion.title}</h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500 capitalize">{suggestion.type.replace('_', ' ')}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">{suggestion.confidence}%</div>
                        <p className="text-xs text-gray-500">Confidence</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{suggestion.description}</p>
                    
                    <div className="bg-white p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Expected Impact:</h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Efficiency:</span>
                          <span className="font-medium text-green-600 ml-1">+{suggestion.estimatedImpact.efficiency}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Coverage:</span>
                          <span className="font-medium text-blue-600 ml-1">{suggestion.estimatedImpact.coverage} contacts</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Time Saved:</span>
                          <span className="font-medium text-purple-600 ml-1">{suggestion.estimatedImpact.timesSaved}h/week</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-blue-900 mb-2">AI Reasoning:</h5>
                      <ul className="space-y-1">
                        {suggestion.reasoning.map((reason: string, idx: number) => (
                          <li key={idx} className="text-sm text-blue-800 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created: {new Date(suggestion.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <ModernButton
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                          onClick={() => {
                            console.log('Review button clicked for suggestion:', suggestion.id, suggestion.title);
                            // Add review logic here
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          <span>Review</span>
                        </ModernButton>
                        <ModernButton
                          variant="primary"
                          size="sm"
                          className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-blue-600"
                          onClick={() => handleQuickCreateAutomation(suggestion)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Implement</span>
                        </ModernButton>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {activeTab === 'templates' && (
         <div className="space-y-6">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Automation Templates</h3>
               <p className="text-gray-600">Pre-built automation workflows you can customize</p>
             </div>
             <ModernButton
               variant="primary"
               size="sm"
               onClick={() => {
                 setTemplateForm({
                   name: '',
                   description: '',
                   category: '',
                   triggers: [],
                   actions: [],
                   isEditable: true,
                   usageCount: 0,
                   createdBy: 'User',
                   tags: []
                 });
                 setEditingTemplate(null);
                 setShowTemplateModal(true);
               }}
               className="flex items-center space-x-2"
             >
               <Plus className="w-4 h-4" />
               <span>Create Template</span>
             </ModernButton>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {automationTemplates.map((template, index) => (
               <GlassCard key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                 <div className="flex items-start justify-between mb-3">
                   <div className="flex-1">
                     <div className="flex items-center space-x-2 mb-2">
                       <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                       <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                         {template.category}
                       </span>
                     </div>
                     <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                     <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                       <span>Used {template.usageCount} times</span>
                       <span>By {template.createdBy}</span>
                     </div>
                   </div>
                   <div className="flex space-x-2">
                     {template.isEditable && (
                       <button
                         onClick={() => handleEditTemplate(template)}
                         className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         title="Edit template"
                       >
                         <Edit className="w-4 h-4" />
                       </button>
                     )}
                     <ModernButton
                       variant="primary"
                       size="sm"
                       onClick={() => handleUseTemplate(template)}
                       className="text-xs"
                     >
                       Use Template
                     </ModernButton>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <div>
                     <p className="text-sm font-medium text-gray-700 mb-2">Common Triggers:</p>
                     <div className="flex flex-wrap gap-1">
                       {template.triggers.slice(0, 3).map((trigger, idx) => (
                         <span key={idx} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                           {trigger}
                         </span>
                       ))}
                       {template.triggers.length > 3 && (
                         <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                           +{template.triggers.length - 3} more
                         </span>
                       )}
                     </div>
                   </div>

                   <div>
                     <p className="text-sm font-medium text-gray-700 mb-2">Actions ({template.actions.length}):</p>
                     <div className="flex flex-wrap gap-1">
                       {template.actions.slice(0, 4).map((action, idx) => {
                         const Icon = actionIcons[action.type] || Mail;
                         const color = actionColors[action.type] || 'bg-gray-500';
                         return (
                           <div key={idx} className={`flex items-center space-x-1 ${color} text-white text-xs px-2 py-1 rounded-md`}>
                             <Icon className="w-3 h-3" />
                             <span className="capitalize">{action.type}</span>
                           </div>
                         );
                       })}
                       {template.actions.length > 4 && (
                         <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                           +{template.actions.length - 4} more
                         </span>
                       )}
                     </div>
                   </div>

                   {template.tags.length > 0 && (
                     <div>
                       <p className="text-sm font-medium text-gray-700 mb-2">Tags:</p>
                       <div className="flex flex-wrap gap-1">
                         {template.tags.map((tag, idx) => (
                           <span key={idx} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-md">
                             {tag}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               </GlassCard>
             ))}
           </div>
         </div>
       )}

      {activeTab === 'analytics' && (
         <div className="space-y-6">
           <GlassCard className="p-6">
             <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
               <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
               Automation Performance Analytics
             </h4>
             <div className="space-y-4">
               {automations.map((automation) => {
                 // Get real analytics data for non-mock contacts
                 const isMockData = contact.isMockData || contact.dataSource === 'mock' || contact.createdBy === 'demo';
                 const analyticsData = isMockData ? null : analyticsService.getToolMetrics(`automation-${automation.id}`);

                 return (
                   <div key={automation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                     <div>
                       <h5 className="font-medium text-gray-900">{automation.name}</h5>
                       <p className="text-sm text-gray-600">
                         {analyticsData ? analyticsData.usageCount : automation.triggerCount} triggers
                         {analyticsData && (
                           <span className="ml-2 text-xs text-blue-600">
                             ({analyticsData.averageResponseTime.toFixed(0)}ms avg response)
                           </span>
                         )}
                       </p>
                       {automation.category && (
                         <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                           {automation.category}
                         </span>
                       )}
                     </div>
                     <div className="flex items-center space-x-4">
                       <div className="text-right">
                         <p className="text-sm font-medium text-gray-900">
                           {analyticsData ? Math.round(analyticsData.successRate) : automation.successRate}%
                         </p>
                         <p className="text-xs text-gray-500">Success Rate</p>
                         {analyticsData && analyticsData.errorRate > 0 && (
                           <p className="text-xs text-red-500">
                             {analyticsData.errorRate.toFixed(1)}% errors
                           </p>
                         )}
                       </div>
                       <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                         <div
                           className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                           style={{ width: `${analyticsData ? analyticsData.successRate : automation.successRate}%` }}
                         />
                       </div>
                       <ModernButton
                         variant="outline"
                         size="sm"
                         onClick={async () => {
                           if (!isMockData) {
                             const sessionId = analyticsService.startTracking('automation-optimization', 'optimize-rule', contact.id);
                             try {
                               await optimizeRule(automation.id, []);
                               analyticsService.endTracking(sessionId, true, undefined, 'automation-engine');
                             } catch (error) {
                               analyticsService.endTracking(sessionId, false, error instanceof Error ? error.message : 'Unknown error');
                             }
                           } else {
                             await optimizeRule(automation.id, []);
                           }
                         }}
                         loading={isOptimizing}
                         className="flex items-center space-x-1"
                       >
                         <Brain className="w-3 h-3" />
                         <span>Optimize</span>
                       </ModernButton>
                     </div>
                   </div>
                 );
               })}
             </div>
           </GlassCard>

           {/* Overall Analytics Summary */}
           {(() => {
             const isMockData = contact.isMockData || contact.dataSource === 'mock' || contact.createdBy === 'demo';
             return !isMockData ? (
               <GlassCard className="p-6">
                 <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                   <Award className="w-5 h-5 mr-2 text-green-500" />
                   Overall Automation Performance
                 </h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {(() => {
                     const overallMetrics = analyticsService.getMetrics();
                     return (
                       <>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-blue-600">{overallMetrics.totalRequests}</p>
                           <p className="text-sm text-gray-600">Total Actions</p>
                         </div>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-green-600">
                             {overallMetrics.totalRequests > 0 ? Math.round((overallMetrics.successfulRequests / overallMetrics.totalRequests) * 100) : 0}%
                           </p>
                           <p className="text-sm text-gray-600">Success Rate</p>
                         </div>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-purple-600">{Math.round(overallMetrics.averageResponseTime)}ms</p>
                           <p className="text-sm text-gray-600">Avg Response</p>
                         </div>
                         <div className="text-center">
                           <p className="text-2xl font-bold text-orange-600">{overallMetrics.failedRequests}</p>
                           <p className="text-sm text-gray-600">Failed Actions</p>
                         </div>
                       </>
                     );
                   })()}
                 </div>
               </GlassCard>
             ) : null;
           })()}
         </div>
       )}
    </div>
    </>
  );
};