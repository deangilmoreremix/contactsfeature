import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';
import { 
  Mail, 
  Sparkles, 
  Copy, 
  CheckCircle, 
  Loader2,
  Send,
  Settings,
  BarChart3
} from 'lucide-react';

export const InteractiveEmailComposer: React.FC = () => {
  const [settings, setSettings] = useState({
    purpose: 'introduction',
    tone: 'professional',
    length: 'medium'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{subject: string, body: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleContact = {
    name: 'Sarah Johnson',
    title: 'VP of Marketing',
    company: 'Innovation Labs',
    industry: 'Technology'
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const templates = {
        introduction: {
          subject: {
            professional: `Introduction from Smart CRM - ${sampleContact.company} Partnership Opportunity`,
            friendly: `Hi ${sampleContact.name.split(' ')[0]}! Exploring partnership with ${sampleContact.company}`,
            formal: `Formal Introduction: Partnership Inquiry for ${sampleContact.company}`,
            direct: `Partnership Opportunity - ${sampleContact.company}`
          },
          body: {
            professional: `Dear ${sampleContact.name},\n\nI hope this email finds you well. I'm reaching out because I believe our solutions could significantly benefit ${sampleContact.company}'s marketing initiatives.\n\nAs a ${sampleContact.title} in the ${sampleContact.industry} industry, you understand the challenges of managing customer relationships effectively. Our Smart CRM Dashboard has helped similar companies increase their conversion rates by 40% through AI-powered insights and automated workflows.\n\nI'd love to schedule a brief 15-minute call to discuss how we might be able to support your team's goals. Would you be available next week?\n\nBest regards,\n[Your Name]\n[Your Title]\nSmart CRM Team`,
            friendly: `Hi ${sampleContact.name.split(' ')[0]}!\n\nHope you're having a great day! I came across ${sampleContact.company} and was really impressed by your work in the ${sampleContact.industry} space.\n\nI thought you might be interested in our Smart CRM Dashboard - it's been a game-changer for marketing teams like yours. We're helping companies automate their sales processes and get AI-powered insights that actually move the needle.\n\nWould love to chat sometime about what you're working on at ${sampleContact.company}. Maybe we could grab a virtual coffee next week?\n\nCheers,\n[Your Name]`,
            formal: `Dear Ms. Johnson,\n\nI am writing to formally introduce Smart CRM Dashboard and explore potential collaboration opportunities with ${sampleContact.company}.\n\nGiven your position as ${sampleContact.title} and your company's prominence in the ${sampleContact.industry} sector, I believe our advanced customer relationship management solution could provide substantial value to your organization.\n\nOur platform offers AI-powered contact scoring, automated workflow management, and predictive analytics that have demonstrated measurable improvements in sales performance for our clients.\n\nI would be honored to schedule a presentation at your convenience to discuss how our solution aligns with ${sampleContact.company}'s strategic objectives.\n\nRespectfully,\n[Your Name]\n[Your Title]\nSmart CRM Dashboard`,
            direct: `${sampleContact.name},\n\nI'll keep this brief - our Smart CRM Dashboard can help ${sampleContact.company} increase sales conversion by 40%.\n\nKey benefits:\n• AI-powered contact scoring\n• Automated email generation\n• Predictive analytics\n• 2+ hours saved daily per rep\n\nInterested in a 15-minute demo?\n\n[Your Name]\nSmart CRM Team`
          }
        },
        'follow-up': {
          subject: {
            professional: `Following up: Smart CRM Discussion with ${sampleContact.company}`,
            friendly: `Quick follow-up from our chat, ${sampleContact.name.split(' ')[0]}!`,
            formal: `Follow-up Correspondence: Smart CRM Proposal for ${sampleContact.company}`,
            direct: `Follow-up: ${sampleContact.company} CRM Solution`
          },
          body: {
            professional: `Hi ${sampleContact.name},\n\nI wanted to follow up on our recent conversation about how Smart CRM could enhance ${sampleContact.company}'s customer relationship management.\n\nAs discussed, here are the key benefits we reviewed:\n• 40% increase in conversion rates\n• AI-powered contact insights\n• Automated workflow management\n• Significant time savings for your team\n\nI've attached the case study from a similar ${sampleContact.industry} company that saw remarkable results within 30 days.\n\nShall we schedule a demo for your team next week?\n\nBest regards,\n[Your Name]`,
            friendly: `Hey ${sampleContact.name.split(' ')[0]}!\n\nJust wanted to circle back after our chat about Smart CRM. I'm still excited about the potential to help ${sampleContact.company} streamline your sales process!\n\nI found that case study I mentioned - really think you'll find it interesting how another ${sampleContact.industry} company transformed their pipeline.\n\nWant to set up a quick demo for the team? I promise it'll be worth the 20 minutes!\n\nTalk soon,\n[Your Name]`,
            formal: `Dear Ms. Johnson,\n\nI am writing to follow up on our previous correspondence regarding the Smart CRM Dashboard solution for ${sampleContact.company}.\n\nAs per our discussion, I have prepared a comprehensive proposal outlining how our platform can address the specific challenges you mentioned regarding customer relationship management in the ${sampleContact.industry} sector.\n\nThe proposal includes detailed implementation timelines, expected ROI calculations, and relevant case studies from similar organizations.\n\nI would be pleased to present these findings to your executive team at your earliest convenience.\n\nSincerely,\n[Your Name]`,
            direct: `${sampleContact.name},\n\nFollowing up on Smart CRM for ${sampleContact.company}.\n\nNext steps:\n1. 20-minute demo (your choice of time)\n2. Review ROI projections\n3. Implementation timeline\n\nReady to move forward?\n\n[Your Name]`
          }
        },
        proposal: {
          subject: {
            professional: `Smart CRM Proposal for ${sampleContact.company} - Marketing Team Enhancement`,
            friendly: `Exciting proposal for ${sampleContact.company}'s marketing success!`,
            formal: `Formal Proposal: Smart CRM Implementation for ${sampleContact.company}`,
            direct: `${sampleContact.company} CRM Proposal - 40% Conversion Increase`
          },
          body: {
            professional: `Dear ${sampleContact.name},\n\nThank you for the opportunity to present this proposal for ${sampleContact.company}'s customer relationship management enhancement.\n\nBased on our discussions about your marketing team's challenges, I've prepared a comprehensive solution that addresses:\n\n• Lead qualification and scoring automation\n• Personalized communication at scale\n• Predictive analytics for better forecasting\n• Workflow optimization for your team\n\nImplementation Timeline: 2-4 weeks\nExpected ROI: 300% within 6 months\nTraining & Support: Comprehensive onboarding included\n\nI'm confident this solution will transform how your team manages customer relationships and drives revenue growth.\n\nLet's schedule a call to review the details.\n\nBest regards,\n[Your Name]`,
            friendly: `Hi ${sampleContact.name.split(' ')[0]}!\n\nI'm super excited to share this proposal for ${sampleContact.company}! After our conversations, I really think Smart CRM is going to be a game-changer for your marketing team.\n\nHere's what we've put together:\n\n✨ Custom AI scoring for your leads\n✨ Automated email sequences that actually convert\n✨ Analytics dashboard your team will love\n✨ Training and support every step of the way\n\nThe best part? Most teams see results in the first 30 days. Can't wait to get started!\n\nWhen's a good time to walk through everything?\n\nExcited to partner with you!\n[Your Name]`,
            formal: `Dear Ms. Johnson,\n\nPlease find enclosed our formal proposal for the implementation of Smart CRM Dashboard at ${sampleContact.company}.\n\nThis comprehensive solution has been specifically designed to address the requirements outlined in our previous consultations, with particular focus on enhancing your marketing department's operational efficiency.\n\nKey deliverables include:\n• Complete system implementation and configuration\n• Staff training and certification programs\n• Ongoing technical support and maintenance\n• Performance monitoring and optimization\n\nWe are confident that this solution will deliver measurable improvements to your customer acquisition and retention metrics.\n\nI look forward to your review and feedback.\n\nRespectfully submitted,\n[Your Name]`,
            direct: `${sampleContact.name},\n\nAttached: Smart CRM proposal for ${sampleContact.company}\n\nBottom line:\n• $50K investment\n• 40% conversion rate increase\n• 2 weeks implementation\n• 6-month ROI guarantee\n\nDecision needed by: [Date]\n\nQuestions?\n\n[Your Name]`
          }
        }
      };

      const selectedTemplate = templates[settings.purpose as keyof typeof templates];
      const subject = selectedTemplate.subject[settings.tone as keyof typeof selectedTemplate.subject];
      const body = selectedTemplate.body[settings.tone as keyof typeof selectedTemplate.body];

      setGeneratedEmail({ subject, body });
      setIsGenerating(false);
    }, 2500);
  };

  const handleCopy = () => {
    if (generatedEmail) {
      const fullEmail = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
      navigator.clipboard.writeText(fullEmail).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const getQualityScore = () => {
    if (!generatedEmail) return 0;
    
    let score = 70; // Base score
    
    // Adjust based on length
    const wordCount = generatedEmail.body.split(' ').length;
    if (wordCount >= 50 && wordCount <= 200) score += 10;
    
    // Adjust based on tone
    if (settings.tone === 'professional') score += 10;
    if (settings.tone === 'friendly') score += 5;
    
    // Adjust based on purpose
    if (settings.purpose === 'introduction') score += 5;
    
    return Math.min(100, score);
  };

  return (
    <GlassCard className="p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-green-500 p-3 rounded-xl mr-3">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Interactive AI Email Composer</h3>
          <p className="text-gray-600">Generate personalized emails with AI in real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Sample Contact */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Target Contact
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Name:</span> {sampleContact.name}</div>
              <div><span className="font-medium">Title:</span> {sampleContact.title}</div>
              <div><span className="font-medium">Company:</span> {sampleContact.company}</div>
              <div><span className="font-medium">Industry:</span> {sampleContact.industry}</div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Purpose
              </label>
              <select
                value={settings.purpose}
                onChange={(e) => setSettings(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="introduction">Introduction</option>
                <option value="follow-up">Follow-up</option>
                <option value="proposal">Proposal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['professional', 'friendly', 'formal', 'direct'].map((tone) => (
                  <label 
                    key={tone} 
                    className={`
                      flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors
                      ${settings.tone === tone 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={tone}
                      checked={settings.tone === tone}
                      onChange={() => setSettings(prev => ({ ...prev, tone }))}
                      className="sr-only"
                    />
                    <span className="capitalize text-sm">{tone}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['short', 'medium', 'long'].map((length) => (
                  <label 
                    key={length} 
                    className={`
                      flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors
                      ${settings.length === length 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="length"
                      value={length}
                      checked={settings.length === length}
                      onChange={() => setSettings(prev => ({ ...prev, length }))}
                      className="sr-only"
                    />
                    <span className="capitalize text-sm">{length}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <ModernButton
            variant="primary"
            onClick={handleGenerate}
            loading={isGenerating}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI is generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Email</span>
              </>
            )}
          </ModernButton>
        </div>

        {/* Email Preview */}
        <div className="space-y-4">
          {generatedEmail ? (
            <>
              {/* Quality Score */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-green-900 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Quality Analysis
                  </h4>
                  <span className="text-2xl font-bold text-green-600">{getQualityScore()}%</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-800">Clarity</div>
                    <div className="text-green-600">95%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-800">Engagement</div>
                    <div className="text-green-600">88%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-800">Response Rate</div>
                    <div className="text-green-600">78%</div>
                  </div>
                </div>
              </div>

              {/* Subject Line */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Subject Line</h4>
                  <span className="text-xs text-gray-500">{generatedEmail.subject.length} chars</span>
                </div>
                <p className="font-medium text-gray-900">{generatedEmail.subject}</p>
              </div>

              {/* Email Body */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Email Body</h4>
                  <span className="text-xs text-gray-500">{generatedEmail.body.split(' ').length} words</span>
                </div>
                <div className="whitespace-pre-line text-gray-700 text-sm">
                  {generatedEmail.body}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <ModernButton
                  variant="outline"
                  onClick={handleCopy}
                  className="flex items-center space-x-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Email</span>
                    </>
                  )}
                </ModernButton>
                <ModernButton
                  variant="primary"
                  className="flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Email</span>
                </ModernButton>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-500 mb-2">Ready to Generate</h4>
              <p className="text-gray-400 text-sm">
                Adjust the settings and click "Generate Email" to see AI create a personalized message
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Interactive Demo</span>
        </div>
        <p className="text-sm text-blue-800 mt-1">
          This demo shows how our AI email composer works. The real application supports custom templates, multiple AI models, and advanced personalization features.
        </p>
      </div>
    </GlassCard>
  );
};