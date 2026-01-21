import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Package,
  DollarSign,
  Target,
  Lightbulb,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  UserProduct,
  CreateProductInput,
  PricingModel,
  PricingTier,
  ValueProposition,
  CompanySize,
  PRODUCT_CATEGORIES,
  COMMON_INDUSTRIES,
  COMMON_DEPARTMENTS,
  COMMON_TITLES,
} from '../../types/userProduct';

interface ProductWizardProps {
  product?: UserProduct;
  onSave: (input: CreateProductInput) => Promise<void>;
  onClose: () => void;
}

type WizardStep = 'basics' | 'pricing' | 'targeting' | 'value' | 'review';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'basics', label: 'Basic Info', icon: <Package className="w-4 h-4" /> },
  { key: 'pricing', label: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'targeting', label: 'Target Market', icon: <Target className="w-4 h-4" /> },
  { key: 'value', label: 'Value Props', icon: <Lightbulb className="w-4 h-4" /> },
  { key: 'review', label: 'Review', icon: <Check className="w-4 h-4" /> },
];

const CATEGORIES = [
  'SaaS',
  'Consulting',
  'Agency Services',
  'Training/Coaching',
  'Hardware',
  'Professional Services',
  'Subscription Box',
  'Marketplace',
  'Platform',
  'Other',
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Real Estate',
  'E-commerce',
  'Manufacturing',
  'Education',
  'Legal',
  'Marketing',
  'Hospitality',
  'Retail',
  'Construction',
  'Non-profit',
  'Government',
  'Media',
  'Transportation',
  'Energy',
  'Agriculture',
];

const DEPARTMENTS = [
  'Executive',
  'Sales',
  'Marketing',
  'Engineering',
  'Product',
  'Operations',
  'Finance',
  'HR',
  'Customer Success',
  'IT',
  'Legal',
  'Procurement',
];

const TITLES = [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'CMO',
  'VP',
  'Director',
  'Manager',
  'Head of',
  'Lead',
  'Senior',
  'Founder',
  'Owner',
  'Partner',
];

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: 'startup', label: 'Startup (1-50)' },
  { value: 'smb', label: 'SMB (51-200)' },
  { value: 'mid-market', label: 'Mid-Market (201-1000)' },
  { value: 'enterprise', label: 'Enterprise (1000+)' },
];

export function ProductWizard({ product, onSave, onClose }: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(product?.name || '');
  const [tagline, setTagline] = useState(product?.tagline || '');
  const [description, setDescription] = useState(product?.description || '');
  const [category, setCategory] = useState(product?.category || '');
  const [features, setFeatures] = useState<string[]>(product?.features || ['']);

  const [pricingModel, setPricingModel] = useState<PricingModel>(product?.pricing_model || 'custom');
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(
    product?.pricing_tiers?.length ? product.pricing_tiers : [{ name: '', price: '', features: [] }]
  );

  const [targetIndustries, setTargetIndustries] = useState<string[]>(product?.target_industries || []);
  const [targetCompanySizes, setTargetCompanySizes] = useState<CompanySize[]>(product?.target_company_sizes || []);
  const [targetTitles, setTargetTitles] = useState<string[]>(product?.target_titles || []);
  const [targetDepartments, setTargetDepartments] = useState<string[]>(product?.target_departments || []);
  const [idealCustomerProfile, setIdealCustomerProfile] = useState(product?.ideal_customer_profile || '');

  const [valuePropositions, setValuePropositions] = useState<ValueProposition[]>(
    product?.value_propositions?.length ? product.value_propositions : [{ title: '', description: '' }]
  );
  const [painPoints, setPainPoints] = useState<string[]>(product?.pain_points_addressed || ['']);
  const [competitiveAdvantages, setCompetitiveAdvantages] = useState<string[]>(product?.competitive_advantages || ['']);
  const [useCases, setUseCases] = useState<string[]>(product?.use_cases || ['']);

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'basics':
        return name.trim().length > 0;
      case 'pricing':
        return true;
      case 'targeting':
        return true;
      case 'value':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: CreateProductInput = {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        category: category || undefined,
        pricing_model: pricingModel,
        pricing_tiers: pricingTiers.filter(t => t.name.trim()),
        features: features.filter(f => f.trim()),
        target_industries: targetIndustries,
        target_company_sizes: targetCompanySizes,
        target_titles: targetTitles,
        target_departments: targetDepartments,
        ideal_customer_profile: idealCustomerProfile.trim() || undefined,
        value_propositions: valuePropositions.filter(v => v.title.trim()),
        pain_points_addressed: painPoints.filter(p => p.trim()),
        competitive_advantages: competitiveAdvantages.filter(c => c.trim()),
        use_cases: useCases.filter(u => u.trim()),
      };
      await onSave(input);
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setSaving(false);
    }
  };

  const addListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => [...prev, '']);
  };

  const updateListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter(prev => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSelection = <T extends string>(
    current: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T
  ) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const renderBasicsStep = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., SmartCRM Pro"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Tagline
        </label>
        <input
          type="text"
          value={tagline}
          onChange={e => setTagline(e.target.value)}
          placeholder="e.g., The AI-powered CRM for modern sales teams"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe your product in detail..."
          rows={4}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Key Features
        </label>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={feature}
                onChange={e => updateListItem(setFeatures, index, e.target.value)}
                placeholder="e.g., AI-powered lead scoring"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {features.length > 1 && (
                <button
                  onClick={() => removeListItem(setFeatures, index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem(setFeatures)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Feature
          </button>
        </div>
      </div>
    </div>
  );

  const renderPricingStep = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pricing Model
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['subscription', 'one-time', 'freemium', 'custom'] as PricingModel[]).map(model => (
            <button
              key={model}
              onClick={() => setPricingModel(model)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                pricingModel === model
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium capitalize">{model.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pricing Tiers (Optional)
        </label>
        <div className="space-y-4">
          {pricingTiers.map((tier, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tier.name}
                  onChange={e => {
                    const updated = [...pricingTiers];
                    updated[index] = { ...tier, name: e.target.value };
                    setPricingTiers(updated);
                  }}
                  placeholder="Tier name (e.g., Pro)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={tier.price}
                  onChange={e => {
                    const updated = [...pricingTiers];
                    updated[index] = { ...tier, price: e.target.value };
                    setPricingTiers(updated);
                  }}
                  placeholder="Price (e.g., $99/mo)"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {pricingTiers.length > 1 && (
                  <button
                    onClick={() => setPricingTiers(prev => prev.filter((_, i) => i !== index))}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => setPricingTiers(prev => [...prev, { name: '', price: '', features: [] }])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
      </div>
    </div>
  );

  const renderTargetingStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Industries
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map(industry => (
            <button
              key={industry}
              onClick={() => toggleSelection(targetIndustries, setTargetIndustries, industry)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                targetIndustries.includes(industry)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Company Sizes
        </label>
        <div className="flex flex-wrap gap-2">
          {COMPANY_SIZES.map(size => (
            <button
              key={size.value}
              onClick={() => toggleSelection(targetCompanySizes, setTargetCompanySizes, size.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                targetCompanySizes.includes(size.value)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Titles
        </label>
        <div className="flex flex-wrap gap-2">
          {TITLES.map(title => (
            <button
              key={title}
              onClick={() => toggleSelection(targetTitles, setTargetTitles, title)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                targetTitles.includes(title)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Departments
        </label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              onClick={() => toggleSelection(targetDepartments, setTargetDepartments, dept)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                targetDepartments.includes(dept)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Ideal Customer Profile (ICP)
        </label>
        <textarea
          value={idealCustomerProfile}
          onChange={e => setIdealCustomerProfile(e.target.value)}
          placeholder="Describe your ideal customer in detail..."
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const renderValueStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Value Propositions
        </label>
        <div className="space-y-3">
          {valuePropositions.map((vp, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vp.title}
                  onChange={e => {
                    const updated = [...valuePropositions];
                    updated[index] = { ...vp, title: e.target.value };
                    setValuePropositions(updated);
                  }}
                  placeholder="Value prop title"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {valuePropositions.length > 1 && (
                  <button
                    onClick={() => setValuePropositions(prev => prev.filter((_, i) => i !== index))}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                value={vp.description}
                onChange={e => {
                  const updated = [...valuePropositions];
                  updated[index] = { ...vp, description: e.target.value };
                  setValuePropositions(updated);
                }}
                placeholder="Describe this value proposition..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}
          <button
            onClick={() => setValuePropositions(prev => [...prev, { title: '', description: '' }])}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Value Proposition
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Pain Points Addressed
        </label>
        <div className="space-y-2">
          {painPoints.map((point, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={point}
                onChange={e => updateListItem(setPainPoints, index, e.target.value)}
                placeholder="e.g., Manual data entry taking too long"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {painPoints.length > 1 && (
                <button
                  onClick={() => removeListItem(setPainPoints, index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem(setPainPoints)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Pain Point
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Competitive Advantages
        </label>
        <div className="space-y-2">
          {competitiveAdvantages.map((advantage, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={advantage}
                onChange={e => updateListItem(setCompetitiveAdvantages, index, e.target.value)}
                placeholder="e.g., Only solution with AI-native architecture"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {competitiveAdvantages.length > 1 && (
                <button
                  onClick={() => removeListItem(setCompetitiveAdvantages, index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem(setCompetitiveAdvantages)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Advantage
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Use Cases
        </label>
        <div className="space-y-2">
          {useCases.map((useCase, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={useCase}
                onChange={e => updateListItem(setUseCases, index, e.target.value)}
                placeholder="e.g., Automated lead qualification"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {useCases.length > 1 && (
                <button
                  onClick={() => removeListItem(setUseCases, index)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addListItem(setUseCases)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Use Case
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Name:</dt>
          <dd className="text-gray-900">{name || '-'}</dd>
          <dt className="text-gray-500">Tagline:</dt>
          <dd className="text-gray-900">{tagline || '-'}</dd>
          <dt className="text-gray-500">Category:</dt>
          <dd className="text-gray-900">{category || '-'}</dd>
          <dt className="text-gray-500">Pricing:</dt>
          <dd className="text-gray-900 capitalize">{pricingModel.replace('-', ' ')}</dd>
        </dl>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Target Market</h4>
        <div className="space-y-2 text-sm">
          {targetIndustries.length > 0 && (
            <p><span className="text-gray-500">Industries:</span> {targetIndustries.join(', ')}</p>
          )}
          {targetCompanySizes.length > 0 && (
            <p><span className="text-gray-500">Company Sizes:</span> {targetCompanySizes.join(', ')}</p>
          )}
          {targetTitles.length > 0 && (
            <p><span className="text-gray-500">Titles:</span> {targetTitles.join(', ')}</p>
          )}
          {targetDepartments.length > 0 && (
            <p><span className="text-gray-500">Departments:</span> {targetDepartments.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Value & Features</h4>
        <div className="space-y-2 text-sm">
          {features.filter(f => f.trim()).length > 0 && (
            <p><span className="text-gray-500">Features:</span> {features.filter(f => f.trim()).join(', ')}</p>
          )}
          {valuePropositions.filter(v => v.title.trim()).length > 0 && (
            <p><span className="text-gray-500">Value Props:</span> {valuePropositions.filter(v => v.title.trim()).map(v => v.title).join(', ')}</p>
          )}
          {painPoints.filter(p => p.trim()).length > 0 && (
            <p><span className="text-gray-500">Pain Points:</span> {painPoints.filter(p => p.trim()).join(', ')}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 ${
                  index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : index === currentStepIndex
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${
                  index === currentStepIndex ? 'text-blue-600' : ''
                }`}>
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {currentStep === 'basics' && renderBasicsStep()}
          {currentStep === 'pricing' && renderPricingStep()}
          {currentStep === 'targeting' && renderTargetingStep()}
          {currentStep === 'value' && renderValueStep()}
          {currentStep === 'review' && renderReviewStep()}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSave}
              disabled={saving || !canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
