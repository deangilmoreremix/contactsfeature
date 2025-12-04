import { createWebhook } from '../lib/agentmailClient';

async function main() {
  try {
    const webhook = await createWebhook({
      url: process.env.PUBLIC_API_URL!,
      clientId: 'smartcrm-main-webhook'
    });
    console.log('Webhook registered:', webhook);
  } catch (error) {
    console.error('Failed to register webhook:', error);
  }
}

main();
