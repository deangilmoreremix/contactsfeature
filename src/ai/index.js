/**
 * AI API Key Gating System
 * 
 * A modular React system that allows users to explore the app freely,
 * but REQUIRES them to input their API key (OpenAI or Google Gemini)
 * only when they attempt to use AI-powered features.
 * 
 * @package @smartcrm/ai-key-gating
 * @version 1.0.0
 * 
 * ## Installation
 * 
 * ```bash
 * npm install @smartcrm/ai-key-gating
 * ```
 * 
 * ## Quick Start
 * 
 * ```jsx
 * import { ApiKeyProvider, ApiKeyModal, RequireApiKey, useApiKey } from './ai';
 * 
 * // Wrap your app
 * function App() {
 *   return (
 *     <ApiKeyProvider>
 *       <Dashboard />
 *       <ApiKeyModal />
 *     </ApiKeyProvider>
 *   );
 * }
 * 
 * // Use RequireApiKey to protect AI features
 * function GenerateImageButton() {
 *   return (
 *     <RequireApiKey provider="openai">
 *       <button onClick={generateImage}>Generate Image</button>
 *     </RequireApiKey>
 *   );
 * }
 * 
 * // Or use the hook directly
 * function AIAssistant() {
 *   const { apiKeys, hasKey, requireKey } = useApiKey();
 *   
 *   const handleAI = async () => {
 *     if (await requireKey('gemini')) {
 *       // Key exists, proceed with AI feature
 *     }
 *   };
 * }
 * ```
 */

// Context & Provider
export { ApiKeyProvider, useApiKey } from './context/ApiKeyContext';

// Hooks
export { useApiKey as default } from './hooks/useApiKey';

// Components
export { ApiKeyModal } from './components/ApiKeyModal';
export { RequireApiKey } from './components/RequireApiKey';
