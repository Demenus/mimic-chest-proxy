import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Proxy = require('http-mitm-proxy').Proxy;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : 8888;

// Configure SSL certificates directory for http-mitm-proxy
// http-mitm-proxy will generate CA certificates here if they don't exist
const projectRoot = join(__dirname, '..');
const certDir = join(projectRoot, 'certs');
const caDir = join(certDir, 'ca');

// Create http-mitm-proxy instance
const proxy = new Proxy();

// Handle proxy errors
proxy.onError(function (ctx, err, errorKind) {
  // ctx may be null
  const url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
  console.error(`${errorKind} on ${url}:`, err.message || err);
});

// Enable gunzip to decompress gzipped responses
proxy.use(Proxy.gunzip);

// Handle all requests
proxy.onRequest(function (ctx, callback) {
  // Disable SSL certificate validation for MITM
  ctx.proxyToServerRequestOptions.rejectUnauthorized = false;

  const host = ctx.clientToProxyRequest.headers.host || '';
  const url = ctx.clientToProxyRequest.url || '';
  const method = ctx.clientToProxyRequest.method || 'GET';
  const fullUrl = `${host}${url}`;

  console.log(`[${new Date().toISOString()}] ${method} ${fullUrl}`);

  // Continue with the request
  return callback();
});

// Intercept responses to modify HTML content for specific URLs
proxy.onResponse(function (ctx, callback) {
  const host = ctx.clientToProxyRequest.headers.host || '';
  const url = ctx.clientToProxyRequest.url || '';
  const fullUrl = `${host}${url}`;

  // Check if this is the target URL
  const isTargetUrl = host === 'httpforever.com' && (url === '/' || url === '');

  if (isTargetUrl && ctx.serverToProxyResponse) {
    const contentType = ctx.serverToProxyResponse.headers['content-type'] || '';

    // Only modify HTML responses
    if (contentType.includes('text/html')) {
      console.log(`[DEBUG] Intercepting HTML response for ${fullUrl}`);

      // Store original chunks to modify later
      const chunks = [];

      // Remove content-length header since we'll modify the content
      delete ctx.serverToProxyResponse.headers['content-length'];
      delete ctx.serverToProxyResponse.headers['Content-Length'];

      // Intercept response data to collect chunks
      ctx.onResponseData(function (ctx, chunk, callback) {
        chunks.push(chunk);
        // Don't send this chunk yet, we'll send modified content later
        return callback(null, null);
      });

      // Modify and send response when complete
      ctx.onResponseEnd(function (ctx, callback) {
        if (chunks.length > 0) {
          // Combine all chunks into a single buffer
          const fullContent = Buffer.concat(chunks);
          let htmlContent = fullContent.toString('utf8');

          console.log(`[DEBUG] Modifying HTML content for ${host}${url}`);
          console.log(`[DEBUG] Original content length: ${fullContent.length} bytes`);

          // Log a sample of HTML to see what we're working with
          const htmlSample = htmlContent.substring(0, Math.min(1000, htmlContent.length));
          console.log(`[DEBUG] HTML sample (first 1000 chars):`, htmlSample);

          // Replace the title tag
          // Handle both <title>...</title> and <TITLE>...</TITLE>
          const originalTitleMatch = htmlContent.match(/<title[^>]*>.*?<\/title>/i);
          if (originalTitleMatch) {
            console.log(`[DEBUG] Found title: ${originalTitleMatch[0]}`);
          }

          htmlContent = htmlContent.replace(
            /<title[^>]*>.*?<\/title>/gi,
            '<title>PEPITO</title>'
          );

          // If no title tag exists, add one in the head section
          if (!/<title[^>]*>/i.test(htmlContent)) {
            console.log(`[DEBUG] No title tag found, adding one`);
            // Try to insert before </head>
            if (/<\/head>/i.test(htmlContent)) {
              htmlContent = htmlContent.replace(/<\/head>/i, '<title>PEPITO</title></head>');
            } else if (/<head[^>]*>/i.test(htmlContent)) {
              // Insert after <head>
              htmlContent = htmlContent.replace(/(<head[^>]*>)/i, '$1<title>PEPITO</title>');
            } else {
              // If no head tag, add it at the beginning
              htmlContent = '<head><title>PEPITO</title></head>' + htmlContent;
            }
          }

          // Replace specific h2: <h2>HTTP FOREVER</h2> -> <h2>PEPITO</h2>
          // Handle spaces, tabs, and newlines around the exact text "HTTP FOREVER"
          htmlContent = htmlContent.replace(
            /<h2>\s*HTTP FOREVER\s*<\/h2>/gi,
            '<h2>PEPITO</h2>'
          );

          // Convert back to buffer
          const modifiedContent = Buffer.from(htmlContent, 'utf8');
          console.log(`[DEBUG] Modified content length: ${modifiedContent.length} bytes`);

          // Prepare headers
          const headers = { ...ctx.serverToProxyResponse.headers };
          headers['Content-Type'] = 'text/html; charset=utf-8';
          headers['Content-Length'] = modifiedContent.length.toString();

          const statusCode = ctx.serverToProxyResponse.statusCode || 200;

          // Send the modified content
          // Check if headers have already been sent
          if (!ctx.proxyToClientResponse.headersSent) {
            ctx.proxyToClientResponse.writeHead(statusCode, headers);
          }
          ctx.proxyToClientResponse.write(modifiedContent);
          ctx.proxyToClientResponse.end();

          console.log(`[DEBUG] Modified HTML sent for ${host}${url}`);
          console.log(`Response ${statusCode} for ${host}${url} (MODIFIED)`);
        } else {
          console.log(`[DEBUG] No chunks collected for ${host}${url}`);
        }
        return callback();
      });
    }
  }

  return callback();
});

// Start the proxy server
// http-mitm-proxy will automatically generate CA certificates in sslCaDir if they don't exist
const listenOptions = {
  port: PORT,
  host: '0.0.0.0',
  silent: false,
  sslCaDir: caDir, // Directory where CA certificates will be stored/generated
};

proxy.listen(listenOptions, function () {
  console.log(`Simple proxy server listening on port ${PORT}`);
  console.log(`Configure Chrome with: --proxy-server=http://localhost:${PORT}`);
  console.log(`Test with: http://httpforever.com/`);
  console.log('');
  console.log('IMPORTANT: To avoid ERR_CERT_AUTHORITY_INVALID errors:');
  console.log('1. The proxy will generate a CA certificate in:', caDir);
  console.log('2. Install the CA certificate (ca.pem or ca.crt) in Chrome:');
  console.log('   - Chrome Settings > Privacy and Security > Security > Manage certificates');
  console.log('   - Or use: --ignore-certificate-errors-spki-list flag (less secure)');
  console.log('   - Or use: --ignore-certificate-errors flag (for testing only)');
});

