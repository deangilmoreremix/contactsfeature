exports.handler = async (event, context) => {
  try {
    const { task, dealId, workspaceId, options = {} } = JSON.parse(event.body);
    // Build prompt - simplified
    const prompt = `Perform task ${task} for deal ${dealId}. Options: ${JSON.stringify(options)}`;
    const model = 'gpt-5.2-instant'; // default
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    const data = await response.json();
    const result = data.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ result })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};