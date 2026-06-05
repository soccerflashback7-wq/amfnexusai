import { createServer } from '../dist/server/server.js';

let app = null;

export default async function handler(req, res) {
  if (!app) {
    app = await createServer();
  }
  
  await app.emit('request', req, res);
}
