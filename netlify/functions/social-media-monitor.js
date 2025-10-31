/**
 * Netlify Function: Social Media Monitor
 * Monitors social media platforms for mentions, engagement, and sentiment analysis
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// API Keys (should be stored securely)
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

exports.handler = async (event, context) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get active social media monitoring configurations
    const { data: configs, error: configError } = await supabase
      .from('social_media_configs')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      console.error('Config fetch error:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch configurations' })
      };
    }

    const results = [];

    // Process each configuration
    for (const config of configs) {
      try {
        const platformResults = await monitorPlatform(config);
        results.push(...platformResults);

        // Store results in database
        for (const result of platformResults) {
          await supabase.from('social_media_mentions').insert({
            config_id: config.id,
            platform: config.platform,
            post_id: result.id,
            content: result.content,
            author: result.author,
            engagement: result.engagement,
            sentiment: result.sentiment,
            url: result.url,
            posted_at: result.posted_at,
            metadata: result.metadata
          });
        }
      } catch (platformError) {
        console.error(`Error monitoring ${config.platform}:`, platformError);
        results.push({
          platform: config.platform,
          error: platformError.message,
          success: false
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results: results,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Social media monitoring error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Monitoring failed',
        details: error.message
      })
    };
  }
};

/**
 * Monitor a specific social media platform
 */
async function monitorPlatform(config) {
  switch (config.platform) {
    case 'twitter':
      return await monitorTwitter(config);
    case 'linkedin':
      return await monitorLinkedIn(config);
    case 'facebook':
      return await monitorFacebook(config);
    case 'instagram':
      return await monitorInstagram(config);
    case 'youtube':
      return await monitorYouTube(config);
    default:
      throw new Error(`Unsupported platform: ${config.platform}`);
  }
}

/**
 * Monitor Twitter for mentions and engagement
 */
async function monitorTwitter(config) {
  if (!TWITTER_BEARER_TOKEN) {
    throw new Error('Twitter API token not configured');
  }

  const results = [];

  try {
    // Search for mentions of configured keywords/handles
    const searchQuery = config.search_terms.map(term =>
      term.startsWith('@') ? term : `"${term}"`
    ).join(' OR ');

    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&max_results=100&tweet.fields=created_at,author_id,public_metrics,context_annotations`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();

    for (const tweet of data.data || []) {
      const sentiment = await analyzeSentiment(tweet.text);
      const engagement = {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0
      };

      results.push({
        id: tweet.id,
        platform: 'twitter',
        content: tweet.text,
        author: tweet.author_id,
        engagement: engagement,
        sentiment: sentiment,
        url: `https://twitter.com/i/status/${tweet.id}`,
        posted_at: tweet.created_at,
        metadata: {
          context_annotations: tweet.context_annotations,
          search_terms: config.search_terms
        }
      });
    }

  } catch (error) {
    console.error('Twitter monitoring error:', error);
    throw error;
  }

  return results;
}

/**
 * Monitor LinkedIn for company updates and mentions
 */
async function monitorLinkedIn(config) {
  if (!LINKEDIN_ACCESS_TOKEN) {
    throw new Error('LinkedIn API token not configured');
  }

  const results = [];

  try {
    // Search LinkedIn posts and updates
    const searchQuery = config.search_terms.join(' ');
    const response = await fetch(
      `https://api.linkedin.com/v2/search?q=${encodeURIComponent(searchQuery)}&type=posts&count=50`,
      {
        headers: {
          'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json();

    for (const post of data.elements || []) {
      const sentiment = await analyzeSentiment(post.text || '');
      const engagement = {
        likes: post.socialDetail?.totalSocialActivityCounts?.numLikes || 0,
        comments: post.socialDetail?.totalSocialActivityCounts?.numComments || 0,
        shares: post.socialDetail?.totalSocialActivityCounts?.numShares || 0
      };

      results.push({
        id: post.id,
        platform: 'linkedin',
        content: post.text || post.commentary || '',
        author: post.author,
        engagement: engagement,
        sentiment: sentiment,
        url: post.permaLink || `https://linkedin.com/feed/update/${post.id}`,
        posted_at: post.created?.time,
        metadata: {
          post_type: post.type,
          visibility: post.visibility,
          search_terms: config.search_terms
        }
      });
    }

  } catch (error) {
    console.error('LinkedIn monitoring error:', error);
    throw error;
  }

  return results;
}

/**
 * Monitor Facebook for page mentions and posts
 */
async function monitorFacebook(config) {
  if (!FACEBOOK_ACCESS_TOKEN) {
    throw new Error('Facebook API token not configured');
  }

  const results = [];

  try {
    // Search Facebook posts and mentions
    const searchQuery = config.search_terms.join(' ');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/search?type=post&q=${encodeURIComponent(searchQuery)}&access_token=${FACEBOOK_ACCESS_TOKEN}&fields=id,message,created_time,from,likes.summary(true),comments.summary(true),shares`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data = await response.json();

    for (const post of data.data || []) {
      const sentiment = await analyzeSentiment(post.message || '');
      const engagement = {
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0
      };

      results.push({
        id: post.id,
        platform: 'facebook',
        content: post.message || '',
        author: post.from,
        engagement: engagement,
        sentiment: sentiment,
        url: `https://facebook.com/${post.id}`,
        posted_at: post.created_time,
        metadata: {
          post_type: 'post',
          search_terms: config.search_terms
        }
      });
    }

  } catch (error) {
    console.error('Facebook monitoring error:', error);
    throw error;
  }

  return results;
}

/**
 * Monitor Instagram for brand mentions
 */
async function monitorInstagram(config) {
  // Instagram monitoring would require Instagram Business API
  // This is a placeholder for future implementation
  console.log('Instagram monitoring not yet implemented');
  return [];
}

/**
 * Monitor YouTube for video mentions and comments
 */
async function monitorYouTube(config) {
  // YouTube monitoring would require YouTube Data API
  // This is a placeholder for future implementation
  console.log('YouTube monitoring not yet implemented');
  return [];
}

/**
 * Analyze sentiment of text content
 */
async function analyzeSentiment(text) {
  // Simple sentiment analysis - in production, use a proper NLP service
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'perfect'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointed', 'poor'];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 1;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 1;
  });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}