import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const baseUrl = process.env.URL || 'https://contacts.smartcrm.vip';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Logging out...</title>
        <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
      </head>
      <body>
        <script>
          (function() {
            const identity = window.netlifyIdentity;
            if (identity) {
              identity.init();
              identity.logout();
              setTimeout(function() {
                window.location.href = '${baseUrl}';
              }, 100);
            } else {
              window.location.href = '${baseUrl}';
            }
          })();
        </script>
      </body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: html,
  };
};