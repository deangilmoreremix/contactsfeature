import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModernButton } from './ui/ModernButton';
import { GlassCard } from './ui/GlassCard';
import {
  X,
  Wand2,
  Sparkles,
  Download,
  Upload,
  Image as ImageIcon,
  Settings,
  Palette,
  FileText,
  Smartphone,
  Monitor,
  Shirt
} from 'lucide-react';

/** --- CONFIG --- */
const MODEL = "gemini-2.5-flash-image-preview";

/** SmartCRM visual style block to inject into prompts */
const SMARTCRM_STYLE = `
SmartCRM visual style:
- Palette: deep blue #1E3A8A, electric teal #14B8A6, white, dark slate #0F172A
- Aesthetic: sleek, modern, minimal grid layouts with neon-teal glow edges and holographic UI cards
- Typography cues: bold geometric sans-serif for headers; clean sans-serif for body
- Elements: subtle circuit lines, soft shadows, gradient blue→teal glows, floating UI mockups
- Finish: sharp, high-contrast, crisp, professional, futuristic, legible in print and social
`;

/** Simple presets that set aspect ratio + prompt scaffolding */
type PresetKey = "poster" | "flyer" | "product" | "social1080" | "tshirt";

const PRESETS: Record<PresetKey, { label: string; aspect: string; scaffold: string; icon: any }> = {
  poster: {
    label: "Poster",
    aspect: "3:4",
    scaffold:
      "Design a vertical marketing POSTER with generous margins for bleed, headline area at top, hero visual centered, 3 benefit callouts with icons, CTA at bottom.",
    icon: FileText
  },
  flyer: {
    label: "Flyer",
    aspect: "4:5",
    scaffold:
      "Create a one-page FLYER: header, subheader, feature visual, 3 benefit bullets with glowing icons, footer with url. Plenty of whitespace; keep text highly legible.",
    icon: FileText
  },
  product: {
    label: "Product Mock",
    aspect: "16:9",
    scaffold:
      "Create a PRODUCT SHOWCASE: glowing laptop/phone mockups with SmartCRM dashboards in perspective, clean background, minimal overlay text.",
    icon: Monitor
  },
  social1080: {
    label: "Social 1080",
    aspect: "1:1",
    scaffold:
      "Create a square SOCIAL MEDIA AD (1080x1080): bold headline, minimal copy, central icon/hero UI card, strong brand presence.",
    icon: Smartphone
  },
  tshirt: {
    label: "T-Shirt",
    aspect: "1:1",
    scaffold:
      "Create a T-SHIRT graphic for dark fabric: neon line-art, limited color (teal/blue on black), concise typographic lockup.",
    icon: Shirt
  },
};

/** Utility: read a File to data URL */
async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${file.type || "image/png"};base64,${base64}`;
}

/** Utility: convert dataURL -> inlineData parts */
async function dataUrlToInlineData(dataUrl: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ab = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
  return {
    inlineData: {
      mimeType: blob.type || "image/png",
      data: base64,
    },
  };
}

/** Utility: trigger download of data URL as file */
function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

type Props = {
  open: boolean;
  onClose: () => void;
  contactData?: any; // Optional contact context
};

export default function GeminiImageModal({ open, onClose, contactData }: Props) {
  const [prompt, setPrompt] = useState(
    contactData ?
      `Create a professional marketing image for ${contactData.name} from ${contactData.company} featuring SmartCRM's AI contact management capabilities.` :
      "SmartCRM feature poster: headline, holographic UI cards, neon teal glow accents, premium print-ready composition."
  );
  const [featureName, setFeatureName] = useState(contactData?.title || "AI Contact Management");
  const [benefit, setBenefit] = useState(contactData?.company ? `Transform ${contactData.company}'s contact management with AI` : "Manage contacts intelligently with AI-powered insights.");
  const [aspect, setAspect] = useState<"1:1" | "4:5" | "3:4" | "16:9" | "9:16">("1:1");
  const [count, setCount] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedFiles, setSeedFiles] = useState<File[]>([]);
  const [seedPreviews, setSeedPreviews] = useState<string[]>([]);
  const [includeBrandStyle, setIncludeBrandStyle] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ai = useMemo(() => new GoogleGenerativeAI(import.meta.env['VITE_GEMINI_API_KEY'] || ''), []);

  useEffect(() => {
    if (!open) {
      // reset state when closing
      setImages([]);
      setError(null);
      setLoading(false);
      setSeedFiles([]);
      setSeedPreviews([]);
    }
  }, [open]);

  /** Apply a preset */
  function applyPreset(key: PresetKey) {
    const p = PRESETS[key];
    setAspect(p.aspect as any);
    setPrompt(
      `${p.scaffold}\n${includeBrandStyle ? SMARTCRM_STYLE : ''}\nSubject: SmartCRM ${featureName} — ${benefit}\nRender with aspect ${p.aspect}.`
    );
  }

  /** Build final text we send (encode AR + brand style) */
  function buildTextPrompt() {
    const base = [
      includeBrandStyle ? SMARTCRM_STYLE : "",
      `Subject: SmartCRM ${featureName} — ${benefit}`,
      `Aspect ratio: ${aspect}`,
      prompt,
      `Avoid: blurry, low quality, warped faces/hands, distorted text, over-cluttered layout.`,
      `Text must be crisp and legible where used.`,
    ]
      .filter(Boolean)
      .join("\n");
    return base;
  }

  async function onChooseFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSeedFiles(files);
    const previews = await Promise.all(files.map(fileToDataUrl));
    setSeedPreviews(previews);
  }

  function clearSeeds() {
    setSeedFiles([]);
    setSeedPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      // Build contents array: text + optional inline images
      const textPart = { text: buildTextPrompt() };

      let contents: any[] = [textPart];

      if (seedPreviews.length) {
        const inlines = await Promise.all(seedPreviews.map(dataUrlToInlineData));
        contents = [textPart, ...inlines];
      }

      const out: string[] = [];

      const model = ai.getGenerativeModel({ model: MODEL });

      for (let i = 0; i < Math.max(1, Math.min(6, count)); i++) {
        const res = await model.generateContent(contents);

        const parts = res?.response?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part?.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            out.push(`data:${mime};base64,${part.inlineData.data}`);
          }
        }
      }

      if (!out.length) throw new Error("No image returned. Try adjusting the prompt or seeds.");
      setImages(out);
    } catch (err: any) {
      setError(err?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-2 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-6xl h-[95vh] overflow-hidden flex animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matches ContactDetailView */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                Gemini AI Image Generator
                <Sparkles className="w-4 h-4 ml-2 text-purple-500" />
              </h2>
              <p className="text-gray-600 text-sm">Powered by Gemini 2.5 Flash • SmartCRM Integration</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* API Status */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Gemini API Connected</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-96 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Presets - Matches contacts module styling */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Palette className="w-4 h-4 mr-2 text-purple-500" />
                  Quick Presets
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PRESETS) as Array<PresetKey>).map((key) => {
                    const preset = PRESETS[key];
                    const Icon = preset.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => applyPreset(key)}
                        className="p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">{preset.label}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-tight">{preset.aspect}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand Style Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">SmartCRM Brand Style</p>
                  <p className="text-xs text-gray-600">Apply consistent visual branding</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={includeBrandStyle}
                    onChange={(e) => setIncludeBrandStyle(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Feature Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feature Name
                  </label>
                  <input
                    type="text"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AI Contact Management"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Benefit
                  </label>
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => setBenefit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Transform contact management with AI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="4:5">Portrait (4:5)</option>
                    <option value="3:4">Poster (3:4)</option>
                    <option value="16:9">Landscape (16:9)</option>
                    <option value="9:16">Story (9:16)</option>
                  </select>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Description
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe your design in detail (composition, style, lighting, copy, etc.)"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">{prompt.length}/1000</span>
                  <button className="text-xs text-blue-600 hover:text-blue-800">Enhance Prompt</button>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  Advanced Options
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Number of Variants</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Seed Images */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Reference Images (Optional)</label>
                    <input
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      type="file"
                      onChange={onChooseFiles}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {seedPreviews.length > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">{seedPreviews.length} image(s) selected</span>
                        <button
                          onClick={clearSeeds}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Upload reference images for editing, composition, or style transfer
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button - Uses ModernButton */}
              <ModernButton
                variant="primary"
                onClick={generate}
                loading={loading}
                disabled={!prompt.trim() || loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Wand2 className="w-4 h-4" />
                <span>{loading ? 'Generating with Gemini...' : 'Generate Images'}</span>
              </ModernButton>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Results Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Generated Images</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {images.length > 0 ? `${images.length} image${images.length > 1 ? 's' : ''} generated` : 'Ready for generation'}
                  </p>
                </div>

                {images.length > 0 && (
                  <ModernButton
                    variant="outline"
                    onClick={() => images.forEach((src, i) => downloadDataUrl(src, `smartcrm-gemini-${i + 1}.png`))}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </ModernButton>
                )}
              </div>
            </div>

            {/* Images Display */}
            <div className="flex-1 overflow-y-auto p-6">
              {images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {images.map((src, i) => (
                    <GlassCard key={i} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Variant {i + 1}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              SynthID Protected
                            </span>
                          </div>
                        </div>

                        <div className="relative group mb-3">
                          <img
                            src={src}
                            alt={`Gemini generated ${i + 1}`}
                            className="w-full rounded-lg shadow-sm"
                          />

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => downloadDataUrl(src, `smartcrm-gemini-${i + 1}.png`)}
                                className="p-3 bg-white/90 rounded-lg hover:bg-white transition-colors"
                                title="Download"
                              >
                                <Download className="w-5 h-5 text-gray-900" />
                              </button>
                              <button className="p-3 bg-white/90 rounded-lg hover:bg-white transition-colors" title="Edit">
                                <Settings className="w-5 h-5 text-gray-900" />
                              </button>
                              <button className="p-3 bg-white/90 rounded-lg hover:bg-white transition-colors" title="Use">
                                <ImageIcon className="w-5 h-5 text-gray-900" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Image Metadata */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Model:</span>
                            <span className="ml-2 font-medium">Gemini 2.5 Flash</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Aspect:</span>
                            <span className="ml-2 font-medium">{aspect}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full mb-4">
                    <Wand2 className="w-12 h-12 text-blue-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-500 mb-2">Ready for Gemini Generation</h4>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Configure your settings and click "Generate Images" to create AI-powered visuals using Google's Gemini 2.5 Flash model
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}