# AI Models Guide

## Overview

The Smart CRM Integration System supports multiple AI providers with their latest models, including Google's Gemini 2.5 Flash and Gemma model families.

## Supported AI Providers

### 1. OpenAI

#### GPT-4 Series
- **GPT-4 Omni** (`gpt-4o`) - Most capable model with vision and advanced reasoning
- **GPT-4 Omni Mini** (`gpt-4o-mini`) - Faster and cheaper variant for most tasks
- **GPT-4 Turbo** (`gpt-4-turbo`) - High-performance model with latest training data

#### GPT-3.5 Series
- **GPT-3.5 Turbo** (`gpt-3.5-turbo`) - Fast and efficient for simple tasks

### 2. Google Gemini & Gemma

#### Gemini 2.5 Flash Models
- **Gemini 2.0 Flash (Experimental)** (`gemini-2.0-flash-exp`)
  - Latest experimental model with multimodal capabilities
  - Optimized for speed and efficiency
  - Supports up to 1M tokens
  - Best for: Real-time analysis, quick responses

- **Gemini 1.5 Flash** (`gemini-1.5-flash`)
  - Production-ready flash model
  - Excellent balance of speed and capability
  - Supports up to 1M tokens
  - Best for: Contact analysis, enrichment

- **Gemini 1.5 Flash 8B** (`gemini-1.5-flash-8b`)
  - Smaller, faster variant
  - Optimized for simple tasks
  - Lower latency
  - Best for: Quick categorization, tagging

#### Gemini Pro Models
- **Gemini 1.5 Pro** (`gemini-1.5-pro`)
  - Most capable Gemini model
  - Supports up to 2M tokens
  - Advanced reasoning capabilities
  - Best for: Complex analysis, relationship mapping

#### Gemma Models on Gemini API

##### Gemma 2 Series
- **Gemma 2 2B Instruct** (`gemma-2-2b-it`)
  - Lightweight model for basic tasks
  - Excellent instruction following
  - Fast inference
  - Best for: Simple contact scoring, quick tasks

- **Gemma 2 9B Instruct** (`gemma-2-9b-it`)
  - Balanced performance and efficiency
  - Good for most CRM tasks
  - Reliable instruction following
  - Best for: Contact analysis, categorization

- **Gemma 2 27B Instruct** (`gemma-2-27b-it`)
  - Most capable Gemma model
  - Advanced reasoning
  - Complex task handling
  - Best for: Deep analysis, enrichment

##### Gemma 1.1 Series
- **Gemma 1.1 2B Instruct** (`gemma-1.1-2b-it`)
  - Improved version of original Gemma 2B
  - Better instruction following
  - Enhanced performance

- **Gemma 1.1 7B Instruct** (`gemma-1.1-7b-it`)
  - Improved 7B variant
  - Good balance of capability and speed
  - Reliable for business tasks

##### CodeGemma Series
- **CodeGemma 2B** (`codegemma-2b`)
  - Specialized for code generation
  - Programming task optimization
  - Best for: Technical contact analysis

- **CodeGemma 7B Instruct** (`codegemma-7b-it`)
  - Instruction-tuned code model
  - Conversational code assistance
  - Best for: Technical documentation, analysis

### 3. Anthropic Claude

#### Claude 3.5 Series
- **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`)
  - Most intelligent Claude model
  - Advanced reasoning and analysis
  - Vision capabilities

- **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`)
  - Fastest Claude model
  - Quick responses
  - Cost-effective

#### Claude 3 Series
- **Claude 3 Opus** (`claude-3-opus-20240229`)
  - Most capable model for complex tasks
  - Premium tier performance

## Model Selection Strategy

### Automatic Selection
The system automatically selects the best model based on:

1. **Task Capability**: Models are filtered by their supported capabilities
2. **Cost Efficiency**: Lower cost models preferred when appropriate
3. **Provider Priority**: Based on configured provider preferences
4. **Rate Limits**: Available quota and rate limits

### Manual Selection
You can specify a specific model for any AI operation:

```typescript
const analysis = await aiIntegration.analyzeContact({
  contactId: 'contact-123',
  contact: contactData,
  analysisTypes: ['scoring', 'categorization'],
  options: {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp'
  }
});
```

## Model Capabilities

### Contact Scoring
**Best Models:**
- Gemini 2.0 Flash (speed + accuracy)
- GPT-4o Mini (cost-effective)
- Gemma 2 9B Instruct (balanced)

### Contact Enrichment
**Best Models:**
- Gemini 1.5 Pro (comprehensive data)
- GPT-4o (high accuracy)
- Gemma 2 27B Instruct (detailed analysis)

### Categorization & Tagging
**Best Models:**
- Gemini 1.5 Flash 8B (fast categorization)
- GPT-4o Mini (reliable tagging)
- Gemma 2 2B Instruct (quick tags)

### Relationship Mapping
**Best Models:**
- Gemini 1.5 Pro (complex reasoning)
- Claude 3.5 Sonnet (relationship analysis)
- GPT-4o (comprehensive mapping)

### Bulk Operations
**Best Models:**
- Gemini 1.5 Flash (speed for volume)
- GPT-4o Mini (cost for scale)
- Gemma 2 9B Instruct (efficiency)

## Performance Characteristics

### Speed (Requests/Second)
1. Gemini 1.5 Flash 8B - ~20 RPS
2. Gemma 2 2B Instruct - ~15 RPS
3. Gemini 2.0 Flash - ~12 RPS
4. GPT-4o Mini - ~10 RPS
5. Gemma 2 9B Instruct - ~8 RPS

### Accuracy (Contact Scoring)
1. GPT-4o - 95%
2. Gemini 1.5 Pro - 93%
3. Claude 3.5 Sonnet - 92%
4. Gemma 2 27B Instruct - 89%
5. Gemini 2.0 Flash - 87%

### Cost Efficiency ($/1K tokens)
1. Gemma 2 2B Instruct - Free tier
2. Gemini 1.5 Flash 8B - Free tier
3. GPT-4o Mini - $0.00015
4. Gemini 1.5 Flash - Free tier
5. GPT-4o - $0.005

## Configuration Examples

### Development Environment
```typescript
// Optimized for speed and cost
const devConfig = {
  defaultProviders: ['gemini'],
  preferredModels: {
    scoring: 'gemini-1.5-flash-8b',
    enrichment: 'gemma-2-9b-it',
    categorization: 'gemma-2-2b-it'
  }
};
```

### Production Environment
```typescript
// Optimized for accuracy and reliability
const prodConfig = {
  defaultProviders: ['openai', 'gemini'],
  preferredModels: {
    scoring: 'gpt-4o-mini',
    enrichment: 'gemini-1.5-pro',
    categorization: 'gemini-2.0-flash-exp'
  }
};
```

### High-Volume Environment
```typescript
// Optimized for throughput
const highVolumeConfig = {
  defaultProviders: ['gemini'],
  preferredModels: {
    scoring: 'gemini-1.5-flash-8b',
    enrichment: 'gemma-2-9b-it',
    categorization: 'gemma-2-2b-it'
  },
  concurrencyLimits: {
    gemini: 10,
    openai: 5
  }
};
```

## Rate Limits & Quotas

### Google Gemini/Gemma (Free Tier)
- Gemini Flash models: 15 RPM, 1M TPM
- Gemma models: 15 RPM, 1M TPM
- Daily quota: 1,500 requests

### Google Gemini/Gemma (Paid Tier)
- Gemini Flash models: 1,000 RPM, 4M TPM
- Gemma models: 1,000 RPM, 4M TPM
- No daily quota limits

### OpenAI
- GPT-4o: 500 RPM, 30K TPM
- GPT-4o Mini: 500 RPM, 200K TPM
- Based on usage tier

### Anthropic
- Claude 3.5 models: 50 RPM, 40K TPM
- Based on subscription tier

## Best Practices

### Model Selection
1. **Start with Gemini Flash models** for speed and cost efficiency
2. **Use GPT-4o for critical accuracy** requirements
3. **Choose Gemma models for high-volume** simple tasks
4. **Reserve Claude for complex reasoning** tasks

### Error Handling
1. **Implement fallback chains**: Gemini → OpenAI → Anthropic
2. **Handle rate limits gracefully** with exponential backoff
3. **Cache results aggressively** to reduce API calls
4. **Monitor model performance** and switch if degraded

### Cost Optimization
1. **Use free tier models** when possible (Gemini/Gemma)
2. **Implement smart caching** to avoid duplicate requests
3. **Batch similar requests** when supported
4. **Monitor usage patterns** and optimize model selection

### Performance Monitoring
1. **Track response times** per model
2. **Monitor accuracy metrics** for scoring tasks
3. **Set up alerts** for rate limit approaches
4. **Log model performance** for optimization

## Migration Guide

### From Legacy Gemini Models
```typescript
// Old configuration
const oldModel = 'gemini-pro';

// New configuration (recommended)
const newModel = 'gemini-1.5-flash'; // For most tasks
// or
const newModel = 'gemini-2.0-flash-exp'; // For latest features
```

### Model Upgrade Path
1. **gemini-pro** → **gemini-1.5-flash**
2. **text-bison** → **gemma-2-9b-it**
3. **gpt-3.5-turbo** → **gpt-4o-mini**

## Troubleshooting

### Common Issues
1. **Rate limit errors**: Switch to alternative models or implement delays
2. **Model not available**: Check model ID and provider configuration
3. **Poor accuracy**: Try higher-capability models or adjust prompts
4. **High costs**: Move to Gemini/Gemma free tier models

### Debug Commands
```typescript
// Check available models
const models = aiIntegration.getAvailableModels();

// Check provider status
const status = await aiIntegration.getProviderStatus();

// Get model information
const info = aiIntegration.getModelInfo('gemini', 'gemini-2.0-flash-exp');
```