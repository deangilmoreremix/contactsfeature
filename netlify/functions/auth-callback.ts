import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const baseUrl = process.env.URL || 'https://contacts.smartcrm.vip';
  
  if (event.httpMethod === 'GET') {
    const { token, refresh_token } = event.queryStringParameters || {};
    
    if (token) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Login Successful</title>
              <style>
                body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
                .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .success { color: #10b981; font-size: 48px; }
                h1 { color: #1f2937; margin: 1rem 0; }
                p { color: #6b7280; }
                .close { margin-top: 1.5rem; }
                button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 14px; }
                button:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">✓</div>
                <h1>Login Successful</h1>
                <p>You're now logged in. You can close this window.</p>
                <div class="close">
                  <button onclick="window.close()">Close Window</button>
                </div>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ type: 'netlify-auth-success' }, '*');
                  }
                </script>
              </div>
            </body>
          </html>
        `,
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Callback</title>
            <style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              h1 { color: #1f2937; margin: 1rem 0; }
              p { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Authentication</h1>
              <p>This is the auth callback handler for Netlify Identity.</p>
            </div>
          </body>
        </html>
      `,
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ 
          message: 'Auth callback received', 
          data: body 
        }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};