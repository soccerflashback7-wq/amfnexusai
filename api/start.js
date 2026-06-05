import serverModule from '../../dist/server/server.js';

// Your server exports a fetch handler
const server = serverModule.default || serverModule;

export default async function handler(req, res) {
  try {
    // Convert Node.js req/res to Fetch API
    const url = `https://${req.headers.host}${req.url}`;
    
    // Build fetch request headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, value);
    }
    
    // Get request body if any
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }
    
    // Create fetch request
    const fetchRequest = new Request(url, {
      method: req.method,
      headers: headers,
      body: body,
    });
    
    // Call your server's fetch handler
    const response = await server.fetch(fetchRequest, {}, {});
    
    // Convert fetch response back to Node.js response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
    
  } catch (error) {
    console.error('Serverless function error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body><h1>Server Error</h1><p>' + error.message + '</p></body></html>');
  }
}
