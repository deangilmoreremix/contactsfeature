import React, { useState } from 'react';
import { Contact } from '../../types/contact';
import { OUTBOUND_PERSONAS, OutboundPersonaId } from '../../agents/personas';
import { ModernButton } from '../ui/ModernButton';
import { SmartTooltip } from '../ui/SmartTooltip';
import {
  Send,
  Users,
  Target,
  MessageSquare,
  Zap,
  Building,
  Globe,
  Star,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Calendar,
  UserCheck,
  Heart,
  Award,
  Briefcase,
  Newspaper,
  DollarSign
} from 'lucide-react';

interface SDRPersonaSelectorProps {
  contact: Contact;
  categoryFilter?: string[];
  title?: string;
  description?: string;
}

export const SDRPersonaSelector: React.FC<SDRPersonaSelectorProps> = ({
  contact,
  categoryFilter,
  title = "SDR Personas",
  description = "Select an AI-powered persona to engage with this contact"
}) => {
  const [selectedPersona, setSelectedPersona] = useState<OutboundPersonaId | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Filter personas based on category if provided
  const filteredPersonas = categoryFilter
    ? OUTBOUND_PERSONAS.filter(persona => categoryFilter.includes(persona.id))
    : OUTBOUND_PERSONAS;

  // Group personas by category for better organization
  const personaGroups = {
    'Sales & Outreach': filteredPersonas.filter(p =>
      ['cold_saas_founder', 'b2b_saas_sdr', 'high_ticket_coach', 'agency_retainer_builder', 'local_biz_offer', 'd2c_brand_sales'].includes(p.id)
    ),
    'Lifecycle & Nurture': filteredPersonas.filter(p =>
      ['course_creator_nurture', 'trial_to_paid_conversion', 'upsell_cross_sell', 'churn_winback', 'list_reactivation', 'abandoned_cart_recovery'].includes(p.id)
    ),
    'Events & Engagement': filteredPersonas.filter(p =>
      ['webinar_invite', 'webinar_followup', 'community_engagement', 'vip_concierge', 'app_user_onboarding'].includes(p.id)
    ),
    'Partnerships & Growth': filteredPersonas.filter(p =>
      ['influencer_collab_hunter', 'software_affiliate_partnership', 'newsletter_sponsor_outreach', 'affiliate_recruitment', 'partnership_channel_reseller', 'marketplace_seller_outreach', 'ecommerce_wholesale_outreach'].includes(p.id)
    ),
    'Product & Marketing': filteredPersonas.filter(p =>
      ['product_launch_outreach', 'beta_user_recruitment', 'review_testimonial_request', 'product_feedback_research', 'pr_media_outreach', 'investor_update_outreach'].includes(p.id)
    )
  };

  const getPersonaIcon = (personaId: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'cold_saas_founder': Send,
      'b2b_saas_sdr': Target,
      'high_ticket_coach': Users,
      'agency_retainer_builder': Building,
      'local_biz_offer': Briefcase,
      'd2c_brand_sales': Star,
      'course_creator_nurture': MessageSquare,
      'trial_to_paid_conversion': TrendingUp,
      'upsell_cross_sell': DollarSign,
      'churn_winback': RotateCcw,
      'list_reactivation': Heart,
      'abandoned_cart_recovery': ShoppingCart,
      'webinar_invite': Calendar,
      'webinar_followup': UserCheck,
      'community_engagement': Users,
      'vip_concierge': Award,
      'app_user_onboarding': Zap,
      'influencer_collab_hunter': Star,
      'software_affiliate_partnership': DollarSign,
      'newsletter_sponsor_outreach': Newspaper,
      'affiliate_recruitment': Users,
      'partnership_channel_reseller': Building,
      'marketplace_seller_outreach': ShoppingCart,
      'ecommerce_wholesale_outreach': Building,
      'product_launch_outreach': Zap,
      'beta_user_recruitment': Star,
      'review_testimonial_request': Heart,
      'product_feedback_research': MessageSquare,
      'pr_media_outreach': Newspaper,
      'investor_update_outreach': DollarSign
    };
    return iconMap[personaId] || Target;
  };

  const [lastRunPersona, setLastRunPersona] = useState<OutboundPersonaId | null>(null);
  const [runTimestamp, setRunTimestamp] = useState<Date | null>(null);

  const handleRunPersona = async (personaId: OutboundPersonaId) => {
    setSelectedPersona(personaId);
    setIsRunning(true);

    try {
      // Here you would integrate with the actual SDR execution logic
      // For now, we'll simulate the process
      console.log(`Running SDR persona ${personaId} for contact ${contact.id}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would call the appropriate SDR function
      // based on the persona type

      setLastRunPersona(personaId);
      setRunTimestamp(new Date());

    } catch (error) {
      console.error('Failed to run SDR persona:', error);
    } finally {
      setIsRunning(false);
      setSelectedPersona(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Target className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {/* Persona Groups */}
      {Object.entries(personaGroups).map(([groupName, personas]) => {
        if (personas.length === 0) return null;

        return (
          <div key={groupName} className="space-y-4">
            <h4 className="text-md font-medium text-gray-800 border-b border-gray-200 pb-2">
              {groupName}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona) => {
                const Icon = getPersonaIcon(persona.id);
                const isSelected = selectedPersona === persona.id;
                const isLoading = isSelected && isRunning;

                return (
                  <div
                    key={persona.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm leading-tight">
                          {persona.label}
                        </h5>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Tone:</span> {persona.defaultTone}
                      </div>
                      <SmartTooltip featureId={`sdr-persona-${persona.id}`}>
                        <ModernButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunPersona(persona.id)}
                          disabled={isRunning}
                          className="text-xs px-3 py-1"
                        >
                          {isLoading ? 'Running...' : 'Run SDR'}
                        </ModernButton>
                      </SmartTooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">About SDR Personas</h4>
            <p className="text-sm text-blue-800 mt-1">
              Each SDR persona is optimized for specific outreach scenarios and communication styles.
              Select the persona that best matches your current engagement goal with {contact.firstName || contact.name}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};