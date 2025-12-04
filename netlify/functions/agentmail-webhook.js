exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    const { event_type, message } = payload;

    if (event_type === 'message.sent') {
      return {
        statusCode: 200,
        body: 'OK'
      };
    }

    if (!message || !message.message_id || !message.inbox_id || (!message.from_ && !message.from)) {
      return {
        statusCode: 200,
        body: 'OK'
      };
    }

    const fromField = message.from_ || message.from;
    let senderEmail, senderName;

    if (fromField.includes('<')) {
      const match = fromField.match(/^(.+?)\s*<(.+)>$/);
      if (match) {
        senderName = match[1].trim();
        senderEmail = match[2];
      } else {
        senderEmail = fromField;
      }
    } else {
      senderEmail = fromField;
    }

    console.log('event_type:', event_type);
    console.log('senderEmail:', senderEmail);
    console.log('subject:', message.subject);
    console.log('thread_id:', message.thread_id);
    console.log('body:', message.text || message.body || message.html);

    return {
      statusCode: 200,
      body: 'OK'
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 200,
      body: 'OK'
    };
  }
};
