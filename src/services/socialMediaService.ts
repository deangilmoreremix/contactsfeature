/**
 * Social Media Monitoring and Integration Service
 * Monitors social media activity and integrates with platforms
 */

export interface SocialProfile {
  id: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'youtube';
  username: string;
  profileUrl: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  lastUpdated: string;
  isVerified?: boolean;
  bio?: string;
  website?: string;
  location?: string;
}

export interface SocialPost {
  id: string;
  platform: string;
  authorId: string;
  content: string;
  url: string;
  timestamp: string;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  sentiment?: 'positive' | 'negative' | 'neutral';
  hashtags: string[];
  mentions: string[];
  mediaUrls: string[];
  contactId?: string;
}

export interface SocialMention {
  id: string;
  platform: string;
  postId: string;
  contactId: string;
  mentionType: 'tag' | 'reply' | 'share' | 'like';
  content: string;
  url: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  engagement: number;
}

export interface SocialMonitoringConfig {
  id: string;
  contactId: string;
  platforms: string[];
  keywords: string[];
  isActive: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  lastChecked: string;
}

export class SocialMediaService {
  private static instance: SocialMediaService;
  private profiles: Map<string, SocialProfile[]> = new Map();
  private posts: Map<string, SocialPost[]> = new Map();
  private mentions: Map<string, SocialMention[]> = new Map();
  private monitoringConfigs: Map<string, SocialMonitoringConfig> = new Map();

  static getInstance(): SocialMediaService {
    if (!SocialMediaService.instance) {
      SocialMediaService.instance = new SocialMediaService();
    }
    return SocialMediaService.instance;
  }

  /**
   * Add social media profile for a contact
   */
  addProfile(contactId: string, profile: Omit<SocialProfile, 'lastUpdated'>): SocialProfile {
    const newProfile: SocialProfile = {
      ...profile,
      lastUpdated: new Date().toISOString()
    };

    const contactProfiles = this.profiles.get(contactId) || [];
    contactProfiles.push(newProfile);
    this.profiles.set(contactId, contactProfiles);

    return newProfile;
  }

  /**
   * Get social profiles for a contact
   */
  getProfiles(contactId: string): SocialProfile[] {
    return this.profiles.get(contactId) || [];
  }

  /**
   * Update social profile data
   */
  async updateProfile(contactId: string, platform: string, updates: Partial<SocialProfile>): Promise<boolean> {
    const contactProfiles = this.profiles.get(contactId);
    if (!contactProfiles) return false;

    const profileIndex = contactProfiles.findIndex(p => p.platform === platform);
    if (profileIndex === -1) return false;

    contactProfiles[profileIndex] = {
      ...contactProfiles[profileIndex],
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    this.profiles.set(contactId, contactProfiles);
    return true;
  }

  /**
   * Remove social profile
   */
  removeProfile(contactId: string, platform: string): boolean {
    const contactProfiles = this.profiles.get(contactId);
    if (!contactProfiles) return false;

    const filteredProfiles = contactProfiles.filter(p => p.platform !== platform);
    this.profiles.set(contactId, filteredProfiles);
    return true;
  }

  /**
   * Monitor social media activity for a contact
   */
  async monitorContact(contactId: string, platforms: string[], keywords: string[]): Promise<SocialPost[]> {
    // In a real implementation, this would call social media APIs
    // For demo purposes, we'll simulate monitoring

    const mockPosts: SocialPost[] = [];

    for (const platform of platforms) {
      // Simulate finding posts based on keywords
      for (const keyword of keywords) {
        if (Math.random() > 0.7) { // 30% chance of finding a post
          const post: SocialPost = {
            id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            platform,
            authorId: contactId,
            content: `Sample post about ${keyword} on ${platform}`,
            url: `https://${platform}.com/post/sample`,
            timestamp: new Date().toISOString(),
            engagement: {
              likes: Math.floor(Math.random() * 100),
              shares: Math.floor(Math.random() * 20),
              comments: Math.floor(Math.random() * 10),
              views: Math.floor(Math.random() * 1000)
            },
            sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative',
            hashtags: keywords.slice(0, 2),
            mentions: [],
            mediaUrls: [],
            contactId
          };
          mockPosts.push(post);
        }
      }
    }

    // Store posts
    const existingPosts = this.posts.get(contactId) || [];
    this.posts.set(contactId, [...existingPosts, ...mockPosts]);

    return mockPosts;
  }

  /**
   * Get social posts for a contact
   */
  getPosts(contactId: string, limit: number = 50): SocialPost[] {
    const posts = this.posts.get(contactId) || [];
    return posts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Analyze social media sentiment
   */
  analyzeSentiment(posts: SocialPost[]): {
    overallSentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
  } {
    const sentiments = posts.map(p => p.sentiment || 'neutral');
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;

    const total = sentiments.length;
    const sentimentScore = total > 0 ? (positiveCount - negativeCount) / total : 0;

    let overallSentiment: 'positive' | 'negative' | 'neutral';
    if (sentimentScore > 0.1) overallSentiment = 'positive';
    else if (sentimentScore < -0.1) overallSentiment = 'negative';
    else overallSentiment = 'neutral';

    return {
      overallSentiment,
      sentimentScore,
      positiveCount,
      negativeCount,
      neutralCount
    };
  }

  /**
   * Set up social media monitoring for a contact
   */
  setupMonitoring(config: Omit<SocialMonitoringConfig, 'id' | 'lastChecked'>): SocialMonitoringConfig {
    const monitoringConfig: SocialMonitoringConfig = {
      ...config,
      id: `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastChecked: new Date().toISOString()
    };

    this.monitoringConfigs.set(config.contactId, monitoringConfig);
    return monitoringConfig;
  }

  /**
   * Get monitoring configuration for a contact
   */
  getMonitoringConfig(contactId: string): SocialMonitoringConfig | undefined {
    return this.monitoringConfigs.get(contactId);
  }

  /**
   * Run monitoring check for all active configurations
   */
  async runMonitoringChecks(): Promise<void> {
    const activeConfigs = Array.from(this.monitoringConfigs.values())
      .filter(config => config.isActive);

    for (const config of activeConfigs) {
      try {
        const newPosts = await this.monitorContact(config.contactId, config.platforms, config.keywords);

        if (newPosts.length > 0) {
          // Check if we should send alerts
          if (config.alertFrequency === 'immediate') {
            await this.sendMonitoringAlert(config.contactId, newPosts);
          }
        }

        // Update last checked
        config.lastChecked = new Date().toISOString();
        this.monitoringConfigs.set(config.contactId, config);

      } catch (error) {
        console.error(`Failed to monitor contact ${config.contactId}:`, error);
      }
    }
  }

  /**
   * Send monitoring alert
   */
  private async sendMonitoringAlert(contactId: string, posts: SocialPost[]): Promise<void> {
    // In a real implementation, this would send notifications via email, SMS, or in-app notifications
    console.log(`Social media alert for contact ${contactId}: ${posts.length} new posts detected`);

    // Create mentions from posts
    const mentions: SocialMention[] = posts.map(post => ({
      id: `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: post.platform,
      postId: post.id,
      contactId,
      mentionType: 'tag', // Could be determined based on content analysis
      content: post.content,
      url: post.url,
      timestamp: post.timestamp,
      sentiment: post.sentiment || 'neutral',
      engagement: post.engagement.likes + post.engagement.shares + post.engagement.comments
    }));

    const existingMentions = this.mentions.get(contactId) || [];
    this.mentions.set(contactId, [...existingMentions, ...mentions]);
  }

  /**
   * Get social mentions for a contact
   */
  getMentions(contactId: string, limit: number = 50): SocialMention[] {
    const mentions = this.mentions.get(contactId) || [];
    return mentions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Generate social media report for a contact
   */
  generateSocialReport(contactId: string): {
    profiles: SocialProfile[];
    recentPosts: SocialPost[];
    sentimentAnalysis: any;
    engagementMetrics: any;
    recommendations: string[];
  } {
    const profiles = this.getProfiles(contactId);
    const recentPosts = this.getPosts(contactId, 20);
    const sentimentAnalysis = this.analyzeSentiment(recentPosts);

    // Calculate engagement metrics
    const totalEngagement = recentPosts.reduce((sum, post) =>
      sum + post.engagement.likes + post.engagement.shares + post.engagement.comments, 0
    );

    const avgEngagement = recentPosts.length > 0 ? totalEngagement / recentPosts.length : 0;

    const engagementMetrics = {
      totalPosts: recentPosts.length,
      totalEngagement,
      averageEngagement: avgEngagement,
      topPerformingPost: recentPosts.reduce((top, post) => {
        const engagement = post.engagement.likes + post.engagement.shares + post.engagement.comments;
        const topEngagement = top.engagement.likes + top.engagement.shares + top.engagement.comments;
        return engagement > topEngagement ? post : top;
      }, recentPosts[0])
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (sentimentAnalysis.overallSentiment === 'negative') {
      recommendations.push('Consider reaching out to address potential concerns');
    }

    if (avgEngagement < 10) {
      recommendations.push('Posts may need more engaging content or better timing');
    }

    if (profiles.length === 0) {
      recommendations.push('Add social media profiles to enable monitoring');
    }

    if (recentPosts.length === 0) {
      recommendations.push('No recent activity detected - consider increasing monitoring frequency');
    }

    return {
      profiles,
      recentPosts,
      sentimentAnalysis,
      engagementMetrics,
      recommendations
    };
  }

  /**
   * Get platform-specific URLs and features
   */
  getPlatformInfo(platform: string): {
    baseUrl: string;
    apiEndpoint?: string;
    features: string[];
  } {
    switch (platform) {
      case 'linkedin':
        return {
          baseUrl: 'https://linkedin.com/in/',
          apiEndpoint: 'https://api.linkedin.com/v2',
          features: ['Professional networking', 'Company insights', 'Job changes', 'Content sharing']
        };
      case 'twitter':
        return {
          baseUrl: 'https://twitter.com/',
          apiEndpoint: 'https://api.twitter.com/2',
          features: ['Real-time updates', 'Hashtag monitoring', 'Influencer tracking', 'Trend analysis']
        };
      case 'facebook':
        return {
          baseUrl: 'https://facebook.com/',
          apiEndpoint: 'https://graph.facebook.com',
          features: ['Page monitoring', 'Group activity', 'Event tracking', 'Ad performance']
        };
      case 'instagram':
        return {
          baseUrl: 'https://instagram.com/',
          apiEndpoint: 'https://graph.instagram.com',
          features: ['Visual content', 'Story monitoring', 'Hashtag tracking', 'Influencer analysis']
        };
      case 'youtube':
        return {
          baseUrl: 'https://youtube.com/channel/',
          apiEndpoint: 'https://www.googleapis.com/youtube/v3',
          features: ['Video content', 'Channel analytics', 'Comment monitoring', 'Subscriber tracking']
        };
      default:
        return {
          baseUrl: '',
          features: []
        };
    }
  }
}

export const socialMediaService = SocialMediaService.getInstance();