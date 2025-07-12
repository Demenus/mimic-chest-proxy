import express from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let server: Server | null = null;

export async function startMimicServer(): Promise<number> {
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return new Promise((resolve, reject) => {
    server = createServer(app);

    server.listen(0, () => {
      const port = (server!.address() as AddressInfo).port;
      console.log(`Mimic server started on port ${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
}

