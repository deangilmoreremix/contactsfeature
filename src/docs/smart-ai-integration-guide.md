# Smart AI Integration Guide

## Overview

The Smart CRM AI Integration system provides intelligent task-based routing between Gemma and OpenAI models, optimizing for performance, cost, and accuracy based on specific requirements.

## Architecture

### Core Components

1. **Task Router Service** - Intelligent model selection based on task requirements
2. **Enhanced AI Integration Service** - Orchestrates AI operations with optimal models
3. **Smart AI Hooks** - React hooks for easy integration
4. **Performance Monitoring** - Tracks and optimizes model performance

### Key Features

- **Automatic Model Selection** - Chooses optimal models based on task requirements
- **Cost Optimization** - Prefers free Gemma models when appropriate
- **Performance Tracking** - Monitors success rates and response times
- **Fallback Chains** - Automatic failover between providers
- **Bulk Processing** - Optimized for high-volume operations

## Supported Tasks

### Contact Scoring
- **Best Models**: Gemma 2-9B, GPT-4o Mini, Gemma 2-27B
- **Optimization**: Balances accuracy and speed
- **Use Case**: Qualifying leads, prioritizing prospects

### Contact Enrichment
- **Best Models**: GPT-4o, Gemini 1.5 Pro, Gemma 2-27B
- **Optimization**: Focuses on accuracy and data quality
- **Use Case**: Filling missing contact information

### Categorization & Tagging
- **Best Models**: Gemma 2-2B, Gemini Flash 8B, GPT-4o Mini
- **Optimization**: Prioritizes speed and cost efficiency
- **Use Case**: Organizing contacts, bulk processing

### Lead Qualification
- **Best Models**: GPT-4o, Gemma 2-27B, GPT-4o Mini
- **Optimization**: High accuracy for business decisions
- **Use Case**: Qualifying prospects, sales pipeline

### Relationship Mapping
- **Best Models**: GPT-4o, Gemini 1.5 Pro
- **Optimization**: Maximum accuracy for complex analysis
- **Use Case**: Finding connections, network analysis

## Usage Examples

### Basic Contact Scoring

```typescript
import { useSmartAI } from '../hooks/useSmartAI';

const { smartScoreContact } = useSmartAI();

// Score a contact with automatic model selection
const result = await smartScoreContact(contactId, contact, 'medium');
```

### Advanced Analysis with Custom Requirements

```typescript
import { enhancedAI } from '../services/enhanced-ai-integration.service';

const result = await enhancedAI.smartAnalyzeContact({
  contactId: 'contact-123',
  contact: contactData,
  analysisTypes: ['contact_scoring', 'categorization', 'tagging'],
  urgency: 'high',
  requirements: {
    accuracy: 'critical',
    speed: 'fast',
    cost: 'medium',
    complexity: 'expert',
    volume: 'single'
  }
});
```

### Bulk Analysis with Constraints

```typescript
const bulkResult = await enhancedAI.smartBulkAnalysis({
  contacts: contactArray,
  analysisType: 'contact_scoring',
  urgency: 'medium',
  costLimit: 5.00,
  timeLimit: 30000
});
```

## Model Selection Logic

### Task Requirements Matrix

| Task | Accuracy | Speed | Cost | Complexity | Preferred Models |
|------|----------|-------|------|------------|------------------|
| Contact Scoring | High | Fast | Low | Medium | Gemma 2-9B, GPT-4o Mini |
| Enrichment | Critical | Medium | Medium | Complex | GPT-4o, Gemini 1.5 Pro |
| Categorization | Medium | Realtime | Free | Simple | Gemma 2-2B, Gemini Flash 8B |
| Tagging | Medium | Realtime | Free | Simple | Gemma 2-2B, Gemini Flash 8B |
| Relationships | Critical | Medium | Medium | Expert | GPT-4o, Gemini 1.5 Pro |

### Urgency Impact

- **Low**: Cost-optimized selection, prefers free models
- **Medium**: Balanced approach between cost and performance
- **High**: Accuracy-focused, willing to pay for quality
- **Critical**: Maximum accuracy regardless of cost

### Volume Considerations

- **Single**: Individual contact analysis
- **Batch**: Small groups (5-50 contacts)
- **Bulk**: Large volumes (50+ contacts), optimizes for speed
- **Streaming**: Real-time processing, prioritizes latency

## Performance Optimization

### Cost Savings Strategies

1. **Free Tier Usage**: Leverages Gemma and Gemini free models when possible
2. **Task Matching**: Routes simple tasks to smaller, faster models
3. **Bulk Optimization**: Processes multiple contacts efficiently
4. **Caching**: Prevents duplicate API calls

### Speed Optimizations

1. **Model Selection**: Chooses fastest appropriate model
2. **Batch Processing**: Groups similar requests
3. **Parallel Execution**: Processes multiple requests concurrently
4. **Response Caching**: Stores results for reuse

### Accuracy Improvements

1. **Task-Specific Models**: Uses models optimized for each task type
2. **Fallback Chains**: Retries with different models on failure
3. **Confidence Scoring**: Tracks and improves model reliability
4. **Performance Monitoring**: Continuously optimizes based on results

## Configuration Options

### Task Context Configuration

```typescript
const taskContext: TaskContext = {
  taskType: 'contact_scoring',
  requirements: {
    accuracy: 'high',
    speed: 'fast',
    cost: 'low',
    complexity: 'medium',
    volume: 'single'
  },
  urgency: 'medium',
  businessContext: 'B2B software sales'
};
```

### Provider Preferences

```typescript
// Prefer cost efficiency
const costOptimized = {
  requirements: { cost: 'free', speed: 'fast' }
};

// Prefer accuracy
const accuracyOptimized = {
  requirements: { accuracy: 'critical', cost: 'medium' }
};

// Prefer speed
const speedOptimized = {
  requirements: { speed: 'realtime', accuracy: 'medium' }
};
```

## Monitoring and Analytics

### Performance Metrics

- **Success Rate**: Percentage of successful operations
- **Average Response Time**: Latency across all models
- **Cost Per Operation**: Average cost breakdown
- **Model Utilization**: Usage patterns by model type

### Real-time Monitoring

```typescript
import { useTaskOptimization } from '../hooks/useSmartAI';

const { getInsights, performance } = useTaskOptimization();

// Get current performance data
const currentStats = performance;

// Get model recommendations
const recommendations = getInsights();
```

## Best Practices

### 1. Task-Appropriate Model Selection

- Use **Gemma models** for high-volume, simple tasks
- Use **OpenAI models** for complex analysis requiring high accuracy
- Use **Gemini Flash models** for real-time applications

### 2. Cost Management

- Set cost limits for bulk operations
- Monitor usage patterns and adjust accordingly
- Leverage free tier models when accuracy requirements permit

### 3. Performance Optimization

- Implement appropriate caching strategies
- Use bulk operations for multiple contacts
- Monitor and adjust based on performance metrics

### 4. Error Handling

- Implement fallback chains for reliability
- Monitor failure rates and adjust model selection
- Provide graceful degradation for failed operations

## Troubleshooting

### Common Issues

1. **Rate Limits**: Automatic failover to alternative models
2. **High Costs**: Adjust task requirements to prefer free models
3. **Low Accuracy**: Increase accuracy requirements or use premium models
4. **Slow Performance**: Optimize batch sizes and model selection

### Debug Information

```typescript
// Get detailed performance breakdown
const stats = enhancedAI.getPerformanceInsights();

// Get model recommendations for specific tasks
const recommendations = taskRouter.getTaskRecommendations('contact_scoring');

// Monitor real-time model performance
const performance = taskRouter.getPerformanceStats();
```

### Performance Tuning

1. **Adjust Requirements**: Modify task requirements based on results
2. **Update Preferences**: Change model preferences based on performance
3. **Monitor Costs**: Track spending and adjust limits accordingly
4. **Optimize Batching**: Adjust batch sizes for optimal throughput

## Advanced Features

### Custom Task Profiles

Create custom task profiles for specific business needs:

```typescript
const customProfile = {
  taskType: 'custom_analysis',
  gemmaModels: [
    { model: 'gemma-2-9b-it', score: 90, reasoning: 'Optimized for custom logic' }
  ],
  openaiModels: [
    { model: 'gpt-4o', score: 95, reasoning: 'Superior accuracy for custom analysis' }
  ],
  defaultRequirements: { 
    accuracy: 'high', 
    speed: 'medium', 
    cost: 'low', 
    complexity: 'complex', 
    volume: 'single' 
  }
};
```

### Dynamic Model Selection

Implement dynamic model selection based on real-time performance:

```typescript
// Automatically adjust model selection based on current performance
const dynamicSelection = await taskRouter.selectOptimalModel({
  taskType: 'contact_scoring',
  requirements: {
    accuracy: 'high',
    speed: 'fast',
    cost: 'low'
  }
});
```

### Performance-Based Optimization

The system continuously learns and optimizes based on actual performance:

- **Success Rate Tracking**: Models with higher success rates get preference
- **Response Time Optimization**: Faster models are preferred for time-sensitive tasks
- **Cost Efficiency**: Tracks cost per successful operation and optimizes accordingly

This intelligent system ensures that your CRM always uses the most appropriate AI model for each specific task, maximizing both performance and cost efficiency.