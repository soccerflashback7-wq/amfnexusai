import { createServer } from '../dist/server/index.mjs';

let server;

export default async function handler(req, res) {
  if (!server) {
    server = await createServer();
  }
  
  // Forward the request to your TanStack Start server
  await new Promise((resolve, reject) => {
    const mockRes = {
      statusCode: 200,
      setHeader: (name, value) => res.setHeader(name, value),
      end: (body) => {
        res.end(body);
        resolve();
      },
      write: (chunk) => res.write(chunk),
    };
    
    req.url = req.url || '/';
    server.emit('request', req, mockRes);
  });
}
