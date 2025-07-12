/**
 * Parse content from request body (always expects text content)
 */
export function parseContentFromBody(body: unknown): Buffer {
  if (typeof body === 'string') {
    return Buffer.from(body, 'utf-8');
  }
  if (body && typeof body === 'object' && 'content' in body) {
    const content = (body as { content: unknown }).content;
    if (typeof content === 'string') {
      return Buffer.from(content, 'utf-8');
    }
  }
  throw new Error('Content must be provided as text in the request body');
}

