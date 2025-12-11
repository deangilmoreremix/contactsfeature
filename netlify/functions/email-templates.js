const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get query parameters
    const { category } = event.queryStringParameters || {};

    // Default email templates (fallback if database is empty) - Now with 27 templates!
    const defaultTemplates = [
      {
        id: 'welcome-template',
        name: 'Welcome Email',
        description: 'A warm welcome email for new contacts',
        subject: 'Welcome to {{company_name}}, {{first_name}}!',
        body: `Hi {{first_name}},

Welcome to {{company_name}}! We're excited to connect with you and explore how {{product_name}} can help {{client_company}}.

Here's what makes {{product_name}} special:
• {{benefit_1}}
• {{benefit_2}}
• Proven results across {{industry}} companies

Would you be available for a quick 15-minute call this week to discuss your {{pain_point}}?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'follow-up-template',
        name: 'Follow-Up Email',
        description: 'Professional follow-up after initial contact',
        subject: 'Following up on our conversation, {{first_name}}',
        body: `Hi {{first_name}},

I hope this email finds you well. I wanted to follow up on our recent conversation about {{pain_point}} at {{client_company}}.

Since we last spoke, I've been thinking about how {{product_name}} could specifically address your {{pain_point}} challenge. Our solution has helped similar {{industry}} companies:

• {{benefit_1}}
• {{benefit_2}}

Would you be open to a brief call to discuss how we might help {{client_company}}?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Follow-up',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'proposal-template',
        name: 'Proposal Email',
        description: 'Send proposals and detailed offerings',
        subject: 'Proposal: {{product_name}} for {{client_company}}',
        body: `Hi {{first_name}},

Thank you for taking the time to discuss {{pain_point}} with me. Based on our conversation, I've prepared a customized proposal for {{client_company}}.

The proposal includes:
• Detailed solution overview for {{pain_point}}
• Implementation timeline and next steps
• Investment breakdown and ROI projections
• Success metrics and milestones

I've attached the full proposal for your review. I'd be happy to walk through it with you and answer any questions.

When would be a good time for us to review this together?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Proposal',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'meeting-template',
        name: 'Meeting Request',
        description: 'Schedule meetings and calls',
        subject: 'Meeting Request: {{product_name}} Discussion',
        body: `Hi {{first_name}},

I enjoyed learning about {{pain_point}} at {{client_company}}. I'd like to schedule a brief call to discuss how {{product_name}} might help address your {{pain_point}}.

Here are a few times that work for me this week:
• Tuesday at 2:00 PM EST
• Wednesday at 10:00 AM EST
• Thursday at 3:00 PM EST

Please let me know which time works best for you, or suggest an alternative that fits your schedule.

Looking forward to our conversation!

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Meeting',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'closing-template',
        name: 'Closing Email',
        description: 'Move prospects toward final decision',
        subject: 'Moving forward with {{product_name}}, {{first_name}}',
        body: `Hi {{first_name}},

I wanted to follow up on our recent discussions about {{product_name}} for {{client_company}}. We've covered the solution details, timeline, and investment, and I'm confident this will deliver significant value for your {{pain_point}}.

To move forward, we would need:
• Final approval from your team
• Contract execution
• Implementation planning session

The next step would be scheduling a final review call with your decision-makers. Are you ready to move forward, or would you like to discuss any remaining questions?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Closing',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 're-engagement-template',
        name: 'Re-engagement Email',
        description: 'Reconnect with inactive contacts',
        subject: 'Checking in - {{product_name}} Update',
        body: `Hi {{first_name}},

I hope you're doing well. It's been a while since we last connected, and I wanted to share some updates about {{product_name}} that might be relevant to {{client_company}}'s {{pain_point}}.

Recent developments:
• {{benefit_1}}
• {{benefit_2}}
• New case studies from {{industry}} companies

I'd love to hear how things are going and whether there might be renewed interest in exploring how {{product_name}} could help {{client_company}}.

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Re-engagement',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'prospecting-template',
        name: 'Cold Outreach',
        description: 'Initial contact with new prospects',
        subject: '{{first_name}}, {{pain_point}} Solutions for {{client_company}}',
        body: `Hi {{first_name}},

I hope this email finds you well. I'm reaching out because I noticed {{client_company}} might be dealing with {{pain_point}} - a challenge many {{industry}} companies face.

At {{company_name}}, we've helped similar organizations:
• {{benefit_1}}
• {{benefit_2}}

I'd love to learn more about your current situation and share how {{product_name}} has helped companies like yours overcome similar challenges.

Would you be open to a quick conversation?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Prospecting',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'thank-you-followup',
        name: 'Thank You & Value Add Follow-Up',
        description: 'Express gratitude and provide additional value after meetings or calls',
        subject: 'Thank you for our conversation, {{first_name}}',
        body: `Hi {{first_name}},

Thank you for taking the time to speak with me today about {{pain_point}} at {{client_company}}. I enjoyed learning more about your {{industry}} challenges and how {{product_name}} might help.

As promised, here are the additional resources I mentioned:
• {{benefit_1}} - Implementation guide
• {{benefit_2}} - Case study from similar {{industry}} companies
• ROI calculator for {{product_name}}

I'm here if you have any questions about these materials or would like to discuss next steps.

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Follow-up',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'objection-handler',
        name: 'Common Objection Response',
        description: 'Address common sales objections with empathy and evidence',
        subject: 'Addressing your concerns about {{product_name}}, {{first_name}}',
        body: `Hi {{first_name}},

Thank you for sharing your concerns about {{product_name}}. I completely understand that {{pain_point}} is an important consideration for {{client_company}}.

Many of our {{industry}} clients initially had similar concerns, and here's what they've found:

{{benefit_1}} - This has helped them reduce costs by 30%
{{benefit_2}} - This has improved their efficiency significantly

I'd be happy to share specific examples from companies in your industry, or we could schedule a call to discuss your specific situation.

What would be most helpful for you right now?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'case-study-share',
        name: 'Case Study & Success Story Share',
        description: 'Share relevant case studies and success stories with prospects',
        subject: '{{client_company}} Success Story - {{product_name}}',
        body: `Hi {{first_name}},

I wanted to share a success story that might be relevant to {{client_company}}'s {{pain_point}}.

One of our {{industry}} clients faced similar challenges and implemented {{product_name}}. The results were impressive:

• {{benefit_1}}
• {{benefit_2}}
• 40% improvement in operational efficiency

I've attached the full case study for your review. Would you be interested in learning how we achieved these results?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'demo-request',
        name: 'Product Demo Request',
        description: 'Request product demonstrations or walkthroughs',
        subject: 'Product Demo: {{product_name}} for {{client_company}}',
        body: `Hi {{first_name}},

I'd like to schedule a personalized product demo of {{product_name}} for {{client_company}}. This would give you a chance to see firsthand how we address {{pain_point}}.

The demo typically takes 30 minutes and covers:
• Live demonstration of {{benefit_1}}
• {{benefit_2}} in action
• Q&A about your specific {{industry}} requirements

Here are a few times that work for me this week:
• Monday at 10:00 AM EST
• Tuesday at 2:00 PM EST
• Wednesday at 11:00 AM EST

Which time works best for you?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'Meeting',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'referral-request',
        name: 'Referral & Introduction Request',
        description: 'Politely ask for referrals and introductions to expand network',
        subject: 'Expanding our {{industry}} network, {{first_name}}',
        body: `Hi {{first_name}},

I hope this email finds you well. I'm reaching out because I'm always looking to connect with more {{industry}} leaders who might benefit from {{product_name}}.

{{client_company}} has been such a great partner, and I value the relationship we've built. If you know anyone in your network who might be dealing with {{pain_point}}, I'd love to be introduced.

There's no pressure at all - I just want to help more companies in our industry succeed.

Thank you for considering this!

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'newsletter-welcome',
        name: 'Newsletter Welcome Series',
        description: 'Welcome new subscribers and set expectations for newsletter content',
        subject: 'Welcome to {{company_name}} Insights, {{first_name}}!',
        body: `Hi {{first_name}},

Welcome to the {{company_name}} newsletter! I'm excited to share insights about {{industry}} trends, {{product_name}} updates, and strategies for addressing {{pain_point}}.

What to expect:
• Weekly insights on {{industry}} best practices
• {{benefit_1}} tips and strategies
• Exclusive access to {{benefit_2}} resources
• Invitations to webinars and events

Your first issue will arrive in your inbox soon. In the meantime, feel free to reply to this email with any specific topics you'd like me to cover.

Welcome aboard!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'webinar-invite',
        name: 'Webinar Invitation & Registration',
        description: 'Invite prospects to educational webinars and virtual events',
        subject: 'Exclusive Webinar: Solving {{pain_point}} in {{industry}}',
        body: `Hi {{first_name}},

I'm hosting a free webinar that I think would be valuable for {{client_company}}. The topic is "Solving {{pain_point}} in {{industry}}" and we'll cover:

• {{benefit_1}} strategies that work
• {{benefit_2}} implementation tips
• Live Q&A with industry experts
• Actionable takeaways you can implement immediately

Date: Next Tuesday at 11:00 AM EST
Duration: 45 minutes
Format: Live webinar with recording available

Register here: [Webinar Link]

Limited spots available - I'd love to see you there!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'renewal-reminder',
        name: 'Contract Renewal Reminder',
        description: 'Remind customers about upcoming contract renewals',
        subject: 'Your {{product_name}} renewal is approaching, {{first_name}}',
        body: `Hi {{first_name}},

I hope {{product_name}} is continuing to deliver value for {{client_company}}. I wanted to reach out about your upcoming renewal.

Your current plan expires in 30 days, and I wanted to make sure you have all the information you need to make the renewal decision.

Since we last renewed, we've added:
• {{benefit_1}}
• {{benefit_2}}
• Enhanced support and training options

I'd be happy to discuss renewal options or answer any questions you might have.

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'feedback-request',
        name: 'Customer Feedback Request',
        description: 'Request feedback from customers to improve products and services',
        subject: 'Your feedback helps us improve {{product_name}}, {{first_name}}',
        body: `Hi {{first_name}},

I hope {{product_name}} is serving {{client_company}} well. Your feedback is incredibly valuable to us as we continue to improve our solution.

Would you mind taking 2 minutes to share your thoughts? Specifically, I'd love to know:

1. What's working well for you?
2. What could we improve?
3. Any features you'd like to see added?

Your honest feedback helps us build a better {{product_name}} for everyone in the {{industry}}.

[Quick Feedback Survey Link]

Thank you in advance for your help!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'holiday-greeting',
        name: 'Holiday & Seasonal Greetings',
        description: 'Seasonal greetings and holiday messages for customers and prospects',
        subject: 'Happy Holidays from {{company_name}}, {{first_name}}!',
        body: `Hi {{first_name}},

As the holiday season approaches, I wanted to take a moment to thank you for your partnership with {{company_name}} this year.

It's been a pleasure working with {{client_company}} and seeing how {{product_name}} has helped address your {{pain_point}}. Here's to continued success in the coming year!

Wishing you and your team a joyful holiday season and a prosperous New Year.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'job-opportunity',
        name: 'Job Opportunity & Career Outreach',
        description: 'Reach out about job opportunities and career development',
        subject: 'Career Opportunity at {{company_name}}, {{first_name}}',
        body: `Hi {{first_name}},

I hope this email finds you well. I'm reaching out because I came across your background in {{industry}} and thought you might be interested in an opportunity at {{company_name}}.

We're looking for someone with your experience to help us address {{pain_point}} for our clients. The role involves:

• {{benefit_1}}
• {{benefit_2}}
• Working with cutting-edge {{product_name}} technology

If you're open to new opportunities, I'd love to learn more about your career goals and share details about this position.

No pressure at all - just wanted to make the connection.

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'partnership-inquiry',
        name: 'Strategic Partnership Inquiry',
        description: 'Inquire about potential strategic partnerships and collaborations',
        subject: 'Exploring Partnership Opportunities, {{first_name}}',
        body: `Hi {{first_name}},

I hope you're doing well. I'm reaching out from {{company_name}} because I believe there could be a valuable partnership opportunity between our organizations.

{{client_company}}'s expertise in {{industry}} and our focus on {{product_name}} could create synergies that benefit both our customers. Specifically, I'm thinking about:

• {{benefit_1}} for mutual clients
• {{benefit_2}} through combined offerings
• Joint marketing initiatives

I'd love to schedule a brief call to explore this further and see if there's alignment.

What are your thoughts?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'event-invitation',
        name: 'Event & Conference Invitation',
        description: 'Invite prospects to industry events, conferences, and trade shows',
        subject: 'Exclusive Invitation: {{industry}} Industry Event',
        body: `Hi {{first_name}},

I'm excited to invite you to an upcoming {{industry}} event that I think would be valuable for {{client_company}}.

Event: {{industry}} Leadership Summit
Date: March 15th, 2024
Location: San Francisco, CA
Focus: Solving {{pain_point}} through innovation

This year's agenda includes:
• {{benefit_1}} keynote presentations
• {{benefit_2}} networking opportunities
• Workshops on emerging {{industry}} trends

As a valued contact, you have complimentary access. I'd love to connect with you there.

Register here: [Event Registration Link]

Looking forward to seeing you!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'product-update',
        name: 'Product Update & Feature Announcement',
        description: 'Announce new features, updates, and product improvements',
        subject: 'Exciting {{product_name}} Updates - {{benefit_1}}',
        body: `Hi {{first_name}},

I'm thrilled to share some exciting updates to {{product_name}} that I know will help {{client_company}} with {{pain_point}}.

New Features:
• {{benefit_1}} - Now available in your dashboard
• {{benefit_2}} - Enhanced automation capabilities
• Improved user experience and performance

These updates are designed specifically for {{industry}} companies like yours. You can start using them immediately.

Check out the updates here: [Product Update Link]

I'd love to hear your thoughts once you've explored the new features!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'survey-invitation',
        name: 'Survey & Research Invitation',
        description: 'Invite customers and prospects to participate in surveys and research',
        subject: 'Your {{industry}} Insights Needed - Quick Survey',
        body: `Hi {{first_name}},

I'm conducting research on {{pain_point}} in the {{industry}} and would greatly value {{client_company}}'s perspective.

Your insights would help shape industry best practices and could influence how companies like yours approach {{pain_point}}.

The survey takes just 5 minutes and covers:
• Current challenges with {{pain_point}}
• Technology preferences in {{industry}}
• Future trends and expectations

Complete the survey here: [Survey Link]

As a thank you, participants receive a free guide on "{{benefit_1}} Strategies."

Thank you for your valuable input!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'testimonial-request',
        name: 'Testimonial & Review Request',
        description: 'Request testimonials and reviews from satisfied customers',
        subject: 'Would you share your {{product_name}} experience, {{first_name}}?',
        body: `Hi {{first_name}},

I hope {{product_name}} is continuing to deliver value for {{client_company}}. Your success story could really help other {{industry}} companies facing similar {{pain_point}} challenges.

Would you be willing to share a brief testimonial about your experience? It could be as simple as:

"{{product_name}} helped us {{benefit_1}} and {{benefit_2}}. Highly recommend for any {{industry}} company."

Your testimonial would be featured on our website and shared with prospects. There's no obligation, and I can help draft it if you'd prefer.

What are your thoughts?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'content-download',
        name: 'Content Download Offer',
        description: 'Offer valuable content downloads like guides, templates, and resources',
        subject: 'Free {{industry}} Guide: Solving {{pain_point}}',
        body: `Hi {{first_name}},

I thought you might find this resource valuable for {{client_company}}. We've created a comprehensive guide on "Solving {{pain_point}} in {{industry}}" that includes:

• {{benefit_1}} strategies and tactics
• {{benefit_2}} implementation frameworks
• Real-world case studies and examples
• Actionable checklists and templates

Download your free copy here: [Guide Download Link]

This guide has helped hundreds of {{industry}} leaders like yourself address {{pain_point}} more effectively.

Enjoy!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'pricing-discussion',
        name: 'Pricing Discussion Starter',
        description: 'Start conversations about pricing and investment options',
        subject: 'Investment Options for {{product_name}}, {{first_name}}',
        body: `Hi {{first_name}},

I wanted to follow up on our discussion about {{product_name}} and share some investment options for {{client_company}}.

Based on your {{pain_point}} requirements, here are three paths forward:

1. Starter Plan - $X/month
   • {{benefit_1}}
   • Basic support and training

2. Professional Plan - $Y/month
   • Everything in Starter
   • {{benefit_2}}
   • Priority support

3. Enterprise Plan - Custom pricing
   • Everything in Professional
   • Custom integrations
   • Dedicated success manager

Which option interests you most, or would you like to discuss a custom solution?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'onboarding-welcome',
        name: 'Customer Onboarding Welcome',
        description: 'Welcome new customers and guide them through onboarding',
        subject: 'Welcome to {{company_name}} - Your onboarding journey begins!',
        body: `Hi {{first_name}},

Welcome to {{company_name}}! I'm excited to have {{client_company}} as part of our community and to help you succeed with {{product_name}}.

Your onboarding journey:

Week 1: Getting Started
• Account setup and configuration
• {{benefit_1}} walkthrough
• Initial training session

Week 2: Implementation
• {{benefit_2}} setup
• Integration with your existing systems
• Best practices review

I'm here to support you every step of the way. Your success is our priority!

Let's schedule your kickoff call: [Calendar Link]

Welcome aboard!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'competitor-response',
        name: 'Competitor Comparison Response',
        description: 'Respond to competitor comparisons and positioning questions',
        subject: 'Why {{company_name}} vs. competitors, {{first_name}}',
        body: `Hi {{first_name}},

Thank you for asking about how {{product_name}} compares to other solutions. I appreciate you doing your due diligence for {{client_company}}.

While I can't speak specifically about competitors, here's what sets {{company_name}} apart for companies dealing with {{pain_point}}:

Our Unique Advantages:
• {{benefit_1}} - Something only we offer
• {{benefit_2}} - Proven in {{industry}} environments
• Superior support and success rates

I'd be happy to provide a detailed comparison or arrange a demo that shows these differences in action.

What specific aspects are most important to {{client_company}}?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_phone}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      },
      {
        id: 'milestone-celebration',
        name: 'Customer Milestone Celebration',
        description: 'Celebrate customer milestones and achievements',
        subject: 'Celebrating {{client_company}}\'s Success with {{product_name}}!',
        body: `Hi {{first_name}},

I wanted to take a moment to celebrate {{client_company}}'s impressive milestone with {{product_name}}!

Congratulations on:
• {{benefit_1}} - A significant achievement
• {{benefit_2}} - Outstanding results
• Becoming a {{product_name}} success story

Your success demonstrates what great leadership and the right tools can accomplish in {{industry}}. Stories like yours inspire other companies facing similar {{pain_point}} challenges.

Thank you for choosing {{company_name}} and for being such an amazing partner!

Best regards,
{{sender_name}}
{{sender_title}}
{{company_name}}`,
        variables: ['first_name', 'last_name', 'full_name', 'email', 'company', 'industry', 'client_company', 'pain_point', 'company_name', 'sender_name', 'sender_title', 'sender_phone', 'product_name', 'benefit_1', 'benefit_2'],
        category: 'General',
        isDefault: true,
        usageCount: 0
      }
    ];

    let templates = defaultTemplates;

    // Try to fetch from database first
    try {
      const { data: dbTemplates, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (!error && dbTemplates && dbTemplates.length > 0) {
        templates = dbTemplates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          subject: template.subject,
          body: template.body,
          variables: template.variables || [],
          category: template.category,
          isDefault: template.is_default || false,
          usageCount: template.usage_count || 0,
          lastUsed: template.last_used
        }));
      }
    } catch (dbError) {
      console.log('Database not available, using default templates:', dbError.message);
    }

    // Filter by category if specified
    if (category && category !== 'all') {
      templates = templates.filter(template =>
        template.category.toLowerCase() === category.toLowerCase()
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        templates,
        count: templates.length,
        category: category || 'all'
      })
    };

  } catch (error) {
    console.error('Error fetching email templates:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch email templates',
        details: error.message
      })
    };
  }
};