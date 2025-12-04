import React, { useState } from 'react';
import { FloatingFeatureImage } from './FloatingFeatureImage';
import { X, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ModernButton } from '../ui/ModernButton';

interface FeatureImage {
  id: string;
  src: string;
  alt: string;
  title: string;
  description: string;
  fullDescription: string;
  floatAnimation: 'gentle' | 'diagonal' | 'wave' | 'bounce' | 'medium';
  glowColor: string;
}

export const FeatureImageGallery: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<FeatureImage | null>(null);

  const featureImages: FeatureImage[] = [
    {
      id: 'contacts',
      src: '/contacts_smartcrm.png',
      alt: 'Smart CRM Contacts Interface',
      title: 'AI-Powered Contact Management',
      description: 'Intelligent contact cards with AI insights, scoring, and automated actions',
      fullDescription: 'Experience the most advanced contact management system with AI-powered scoring, real-time insights, intelligent categorization, and automated enrichment. Visualize engagement levels, track interaction history, and get predictive recommendations for optimal follow-up timing.',
      floatAnimation: 'gentle',
      glowColor: '#3b82f6'
    },
    {
      id: 'email',
      src: '/email.png',
      alt: 'AI Email Composer and Tools',
      title: 'AI Email Composer & Tools',
      description: 'Generate personalized emails with AI, templates, and analytics',
      fullDescription: 'Transform your email outreach with AI-powered composition, smart templates, sentiment analysis, and comprehensive analytics. Generate context-aware emails in multiple tones, schedule campaigns, track engagement, and optimize your messaging with machine learning insights.',
      floatAnimation: 'diagonal',
      glowColor: '#22c55e'
    },
    {
      id: 'journey',
      src: '/journey.png',
      alt: 'Contact Journey Timeline',
      title: 'Visual Journey Timeline',
      description: 'Track complete customer journey with interactions and milestones',
      fullDescription: 'Visualize the entire customer journey from first touch to conversion. Track all interactions, milestones, communications, and touchpoints in a beautiful timeline view. AI-powered pattern recognition identifies optimal engagement moments and predicts next best actions.',
      floatAnimation: 'wave',
      glowColor: '#f97316'
    },
    {
      id: 'new_contact',
      src: '/new_contact.png',
      alt: 'New Contact Creation Form',
      title: 'Smart Contact Creation',
      description: 'AI-assisted contact creation with auto-fill and enrichment',
      fullDescription: 'Create contacts faster with AI-powered auto-fill, intelligent field suggestions, and automatic data enrichment. Simply enter a name or company, and watch as AI finds emails, phone numbers, social profiles, and company data from across the web.',
      floatAnimation: 'bounce',
      glowColor: '#ec4899'
    },
    {
      id: 'export',
      src: '/export.png',
      alt: 'Data Export and Integration',
      title: 'Export & Integration Hub',
      description: 'Seamless data export and third-party integrations',
      fullDescription: 'Export your contact data in multiple formats (CSV, Excel, JSON) with customizable field mapping. Integrate seamlessly with popular CRMs, email platforms, and marketing tools. Automate data sync with webhooks and API connections.',
      floatAnimation: 'medium',
      glowColor: '#a855f7'
    }
  ];

  const handleImageClick = (image: FeatureImage) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="relative">
      <div className="text-center mb-12">
        <h3 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center space-x-3">
          <Sparkles className="w-10 h-10 text-yellow-500" />
          <span>Live Feature Showcase</span>
          <Sparkles className="w-10 h-10 text-yellow-500" />
        </h3>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Watch our features come to life! Hover over any screenshot to see interactive effects,
          and click to explore detailed views.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
        {featureImages.map((image, index) => (
          <div
            key={image.id}
            className="aspect-[4/3] relative"
            style={{ minHeight: '300px' }}
          >
            <FloatingFeatureImage
              src={image.src}
              alt={image.alt}
              title={image.title}
              description={image.description}
              floatAnimation={image.floatAnimation}
              glowColor={image.glowColor}
              delay={index * 150}
              onClick={() => handleImageClick(image)}
            />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in-up"
          onClick={closeModal}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="p-8">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="relative">
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="w-full h-auto rounded-xl shadow-2xl"
                    style={{
                      boxShadow: `0 0 60px ${selectedImage.glowColor}40, 0 0 100px ${selectedImage.glowColor}20`
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-xl border-4"
                    style={{
                      borderColor: selectedImage.glowColor,
                      boxShadow: `inset 0 0 40px ${selectedImage.glowColor}20`
                    }}
                  />
                </div>

                <div className="flex flex-col justify-center space-y-6">
                  <div>
                    <div
                      className="inline-block px-4 py-2 rounded-full text-sm font-semibold text-white mb-4"
                      style={{ backgroundColor: selectedImage.glowColor }}
                    >
                      Feature Spotlight
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                      {selectedImage.title}
                    </h2>
                    <p className="text-xl text-gray-600 leading-relaxed">
                      {selectedImage.fullDescription}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-2 h-2 rounded-full mt-2"
                        style={{ backgroundColor: selectedImage.glowColor }}
                      />
                      <p className="text-gray-600">AI-powered automation and intelligent insights</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-2 h-2 rounded-full mt-2"
                        style={{ backgroundColor: selectedImage.glowColor }}
                      />
                      <p className="text-gray-600">Real-time data enrichment and validation</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-2 h-2 rounded-full mt-2"
                        style={{ backgroundColor: selectedImage.glowColor }}
                      />
                      <p className="text-gray-600">Seamless integration with your existing workflow</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 pt-4">
                    <ModernButton
                      variant="primary"
                      className="flex items-center space-x-2"
                      style={{ backgroundColor: selectedImage.glowColor }}
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Try This Feature</span>
                    </ModernButton>
                    <ModernButton
                      variant="outline"
                      onClick={closeModal}
                    >
                      Close
                    </ModernButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      <div className="mt-16 text-center">
        <p className="text-gray-600 mb-6">
          Each feature is designed to save you time and increase conversions
        </p>
        <ModernButton
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Explore All Features
        </ModernButton>
      </div>
    </div>
  );
};
