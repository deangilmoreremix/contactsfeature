import { supabase } from '../lib/supabase';
import type { Contact } from '../types/contact';
import type {
  UserProduct,
  ProductDraft,
  DraftType,
  DraftTone,
  PersonalizationToken,
  ProductContactMatch,
} from '../types/userProduct';

interface DraftGenerationContext {
  product: UserProduct;
  contact: Contact;
  match?: ProductContactMatch;
  tone: DraftTone;
}

interface GeneratedDraft {
  subject?: string;
  body: string;
  personalization_tokens: Record<string, PersonalizationToken>;
}

const TONE_MODIFIERS: Record<DraftTone, { style: string; phrases: string[] }> = {
  formal: {
    style: 'professional and structured',
    phrases: ['I would like to', 'Please allow me to', 'I am writing to', 'Would you be available'],
  },
  casual: {
    style: 'friendly and conversational',
    phrases: ['Hey', 'Quick note', 'Just wanted to', 'How about'],
  },
  urgent: {
    style: 'direct and action-oriented',
    phrases: ['Time-sensitive', 'Act now', 'Immediate opportunity', 'Do not miss'],
  },
  friendly: {
    style: 'warm and personable',
    phrases: ['Hope you are doing well', 'I noticed', 'Thought of you', 'Would love to'],
  },
  professional: {
    style: 'balanced and business-appropriate',
    phrases: ['I wanted to reach out', 'Based on', 'Looking forward to', 'Happy to discuss'],
  },
};

export class DraftGenerationService {
  private buildPersonalizationTokens(
    product: UserProduct,
    contact: Contact,
    match?: ProductContactMatch
  ): Record<string, PersonalizationToken> {
    const tokens: Record<string, PersonalizationToken> = {};

    tokens['contact_name'] = {
      key: 'contact_name',
      value: contact.name || 'there',
      source: 'contact',
    };

    tokens['contact_first_name'] = {
      key: 'contact_first_name',
      value: contact.name?.split(' ')[0] || 'there',
      source: 'contact',
    };

    tokens['contact_company'] = {
      key: 'contact_company',
      value: contact.company || 'your company',
      source: 'contact',
    };

    tokens['contact_title'] = {
      key: 'contact_title',
      value: contact.title || contact.job_title || 'professional',
      source: 'contact',
    };

    tokens['contact_industry'] = {
      key: 'contact_industry',
      value: contact.industry || 'your industry',
      source: 'contact',
    };

    tokens['product_name'] = {
      key: 'product_name',
      value: product.name,
      source: 'product',
    };

    tokens['product_tagline'] = {
      key: 'product_tagline',
      value: product.tagline || product.description?.slice(0, 100) || '',
      source: 'product',
    };

    if (product.value_propositions.length > 0) {
      tokens['main_value_prop'] = {
        key: 'main_value_prop',
        value: product.value_propositions[0].title,
        source: 'product',
      };
    }

    if (product.pain_points_addressed.length > 0) {
      tokens['key_pain_point'] = {
        key: 'key_pain_point',
        value: product.pain_points_addressed[0],
        source: 'product',
      };
    }

    if (match?.why_buy_reasons?.length) {
      tokens['why_buy'] = {
        key: 'why_buy',
        value: match.why_buy_reasons[0],
        source: 'ai_generated',
      };
    }

    return tokens;
  }

  generateEmailDraft(context: DraftGenerationContext): GeneratedDraft {
    const { product, contact, match, tone } = context;
    const tokens = this.buildPersonalizationTokens(product, contact, match);
    const toneStyle = TONE_MODIFIERS[tone];

    const firstName = tokens['contact_first_name'].value;
    const company = tokens['contact_company'].value;
    const industry = tokens['contact_industry'].value;
    const productName = tokens['product_name'].value;

    const painPoint = product.pain_points_addressed[0] || 'improving efficiency';
    const valueProp = product.value_propositions[0]?.title || product.tagline || 'transform your business';
    const useCase = product.use_cases[0] || 'streamline operations';

    let subject = '';
    let opening = '';
    let body = '';
    let cta = '';

    switch (tone) {
      case 'formal':
        subject = `${productName}: A Strategic Solution for ${company}`;
        opening = `Dear ${firstName},\n\nI am reaching out to introduce ${productName}, a solution specifically designed for ${industry} professionals like yourself.`;
        body = `\n\nOrganizations in your sector often face challenges with ${painPoint}. Our platform addresses this by ${valueProp}.\n\nNotable applications include ${useCase}, which has proven valuable for companies similar to ${company}.`;
        cta = `\n\nI would welcome the opportunity to discuss how ${productName} might benefit your team. Would you be available for a brief conversation next week?`;
        break;

      case 'casual':
        subject = `Quick thought for ${company}`;
        opening = `Hey ${firstName}!\n\nHope this finds you well. Came across ${company} and thought you might find ${productName} interesting.`;
        body = `\n\nWe help ${industry} teams tackle ${painPoint} - basically ${valueProp}.\n\nA lot of folks use it for ${useCase} and see great results.`;
        cta = `\n\nWant to hop on a quick call? Would love to hear more about what you are working on!`;
        break;

      case 'urgent':
        subject = `[Time-Sensitive] ${productName} Opportunity for ${company}`;
        opening = `${firstName},\n\nI have limited spots available this quarter for new ${productName} implementations and wanted to reach out directly.`;
        body = `\n\n${industry} companies are seeing immediate impact by addressing ${painPoint} head-on. ${valueProp} is driving real results.\n\nOur ${useCase} approach has accelerated outcomes for similar organizations.`;
        cta = `\n\nCan we connect this week? I would hate for ${company} to miss this window.`;
        break;

      case 'friendly':
        subject = `Thought of ${company} - ${productName}`;
        opening = `Hi ${firstName}!\n\nI have been following ${company}'s work in ${industry} and was impressed. It got me thinking you might appreciate ${productName}.`;
        body = `\n\nWe created it specifically to help with ${painPoint}. The idea is simple: ${valueProp}.\n\nMany of our users love how it handles ${useCase} - it is become a go-to for them.`;
        cta = `\n\nWould love to learn more about your current setup and see if there is a fit. Coffee chat sometime?`;
        break;

      default:
        subject = `${productName} for ${company}`;
        opening = `Hi ${firstName},\n\nI wanted to reach out about ${productName}, which I believe could be valuable for ${company}.`;
        body = `\n\nWe specialize in helping ${industry} organizations address ${painPoint}. Our approach: ${valueProp}.\n\nOne popular use case is ${useCase}, which many of our clients have found impactful.`;
        cta = `\n\nWould you be open to a brief conversation to explore if there is alignment with your goals?\n\nLooking forward to connecting.`;
    }

    const fullBody = `${opening}${body}${cta}\n\nBest regards`;

    return {
      subject,
      body: fullBody,
      personalization_tokens: tokens,
    };
  }

  generateCallScriptDraft(context: DraftGenerationContext): GeneratedDraft {
    const { product, contact, match } = context;
    const tokens = this.buildPersonalizationTokens(product, contact, match);

    const firstName = tokens['contact_first_name'].value;
    const company = tokens['contact_company'].value;
    const title = tokens['contact_title'].value;
    const productName = tokens['product_name'].value;

    const painPoints = product.pain_points_addressed.slice(0, 2);
    const objections = match?.objections_anticipated || ['budget', 'timing'];
    const whyBuy = match?.why_buy_reasons || product.value_propositions.map(v => v.title);

    const script = `
CALL SCRIPT: ${productName} for ${company}

---

OPENER (First 10 seconds)
"Hi ${firstName}, this is [Your Name] with ${productName}. I know you are busy as ${title} at ${company}, so I will be brief. Do you have 2 minutes?"

If yes, continue. If no: "No problem - when would be a better time to connect?"

---

HOOK (The reason for the call)
"I am reaching out because we have been helping ${contact.industry || 'companies'} like yours with ${painPoints[0] || 'improving efficiency'}. ${company} came up as a potential fit."

---

DISCOVERY QUESTIONS
1. "How is ${company} currently handling ${painPoints[0] || 'this challenge'}?"
2. "What would success look like for your team in this area?"
3. "Who else would be involved in evaluating a solution like this?"

---

VALUE PROPOSITION
${whyBuy.slice(0, 3).map((reason, i) => `${i + 1}. ${reason}`).join('\n')}

---

OBJECTION HANDLING

If "Not interested":
"I understand. Many of our current clients said the same thing initially. What specifically made you feel it is not a fit?"

If "No budget":
"Budget is always a consideration. Our clients typically see ROI within [timeframe]. Would it help to see a cost-benefit breakdown?"

If "Bad timing":
"When would be a better time to revisit this? I can set a reminder to follow up."

${objections.slice(0, 2).map(obj => `If "${obj}": [Prepare your response]`).join('\n\n')}

---

CLOSE
"Based on what you have shared, I think a quick 20-minute demo would show you exactly how this works for ${contact.industry || 'companies like yours'}. Does [day] at [time] work, or is [alternative] better?"

---

FOLLOW-UP NOTE
If call unsuccessful, send follow-up email within 24 hours referencing the call.
    `.trim();

    return {
      subject: `Call Script: ${firstName} at ${company}`,
      body: script,
      personalization_tokens: tokens,
    };
  }

  generateSMSDraft(context: DraftGenerationContext): GeneratedDraft {
    const { product, contact, tone } = context;
    const tokens = this.buildPersonalizationTokens(product, contact);

    const firstName = tokens['contact_first_name'].value;
    const productName = tokens['product_name'].value;
    const valueProp = product.value_propositions[0]?.title || product.tagline || 'boost results';

    let body = '';

    switch (tone) {
      case 'formal':
        body = `Hi ${firstName}, this is [Name] from ${productName}. I would like to share how we help with ${valueProp}. May I send more info? Reply YES or call [number].`;
        break;
      case 'casual':
        body = `Hey ${firstName}! [Name] here from ${productName}. Thought you might like what we do - ${valueProp}. Interested in chatting? Reply or give me a call!`;
        break;
      case 'urgent':
        body = `${firstName} - limited spots for ${productName} this month. ${valueProp}. Reply NOW for priority access or call [number].`;
        break;
      default:
        body = `Hi ${firstName}, [Name] from ${productName}. We help with ${valueProp}. Would love to connect - reply or call [number] when convenient.`;
    }

    return {
      body,
      personalization_tokens: tokens,
    };
  }

  generateLinkedInDraft(context: DraftGenerationContext): GeneratedDraft {
    const { product, contact, tone } = context;
    const tokens = this.buildPersonalizationTokens(product, contact);

    const firstName = tokens['contact_first_name'].value;
    const company = tokens['contact_company'].value;
    const title = tokens['contact_title'].value;
    const industry = tokens['contact_industry'].value;
    const productName = tokens['product_name'].value;

    const painPoint = product.pain_points_addressed[0] || 'growth challenges';
    let body = '';

    switch (tone) {
      case 'formal':
        body = `Dear ${firstName},

I came across your profile and was impressed by your work as ${title} at ${company}.

I lead ${productName}, and we specialize in helping ${industry} professionals address ${painPoint}.

I would value the opportunity to connect and exchange insights. Would you be open to a brief conversation?

Best regards`;
        break;

      case 'casual':
        body = `Hey ${firstName}!

Saw your profile - love what ${company} is doing in ${industry}.

I run ${productName} and we help folks like you with ${painPoint}. Thought we might have some good stuff to chat about.

Open to connecting?`;
        break;

      case 'friendly':
        body = `Hi ${firstName},

I have been following ${company}'s journey and really admire what you are building. As someone who works with ${industry} leaders on ${painPoint}, I thought we might have some interesting conversations.

Would love to connect and learn more about your work!

Cheers`;
        break;

      default:
        body = `Hi ${firstName},

Your work at ${company} caught my attention. I help ${industry} professionals tackle ${painPoint} through ${productName}.

I think there could be some synergies worth exploring. Would you be open to connecting?

Looking forward to it`;
    }

    return {
      subject: `Connection Request: ${firstName} from ${company}`,
      body,
      personalization_tokens: tokens,
    };
  }

  generateDraft(
    draftType: DraftType,
    context: DraftGenerationContext
  ): GeneratedDraft {
    switch (draftType) {
      case 'email':
        return this.generateEmailDraft(context);
      case 'call_script':
        return this.generateCallScriptDraft(context);
      case 'sms':
        return this.generateSMSDraft(context);
      case 'linkedin':
        return this.generateLinkedInDraft(context);
      default:
        return this.generateEmailDraft(context);
    }
  }

  async createAndSaveDraft(
    product: UserProduct,
    contact: Contact,
    userId: string,
    draftType: DraftType,
    tone: DraftTone = 'professional',
    match?: ProductContactMatch
  ): Promise<ProductDraft | null> {
    const context: DraftGenerationContext = {
      product,
      contact,
      match,
      tone,
    };

    const generated = this.generateDraft(draftType, context);

    const { data, error } = await supabase
      .from('product_drafts')
      .insert({
        product_id: product.id,
        contact_id: contact.id,
        user_id: userId,
        draft_type: draftType,
        subject: generated.subject,
        body: generated.body,
        tone,
        personalization_tokens: generated.personalization_tokens,
        is_edited: false,
        is_sent: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving draft:', error);
      return null;
    }

    return data as ProductDraft;
  }

  async batchCreateDrafts(
    product: UserProduct,
    contacts: Contact[],
    userId: string,
    draftType: DraftType,
    tone: DraftTone = 'professional',
    matches?: Map<string, ProductContactMatch>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProductDraft[]> {
    const drafts: ProductDraft[] = [];
    const batchSize = 20;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchDrafts = batch.map(contact => {
        const match = matches?.get(contact.id);
        const context: DraftGenerationContext = {
          product,
          contact,
          match,
          tone,
        };
        const generated = this.generateDraft(draftType, context);

        return {
          product_id: product.id,
          contact_id: contact.id,
          user_id: userId,
          draft_type: draftType,
          subject: generated.subject,
          body: generated.body,
          tone,
          personalization_tokens: generated.personalization_tokens,
          is_edited: false,
          is_sent: false,
        };
      });

      const { data, error } = await supabase
        .from('product_drafts')
        .insert(batchDrafts)
        .select();

      if (error) {
        console.error('Error in batch draft save:', error);
      } else if (data) {
        drafts.push(...(data as ProductDraft[]));
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, contacts.length), contacts.length);
      }
    }

    return drafts;
  }
}

export const draftGenerationService = new DraftGenerationService();
