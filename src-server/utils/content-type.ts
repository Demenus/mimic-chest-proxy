/**
 * Detect content type from buffer
 */
export function detectContentType(buffer: Buffer): string {
  if (buffer.length === 0) {
    return 'text/plain';
  }

  const text = buffer.toString('utf-8').trim();
  
  // JSON
  if (text.length > 0) {
    try {
      JSON.parse(text);
      return 'application/json';
    } catch {
      // Not JSON
    }
  }

  // HTML - check for HTML tags
  if (text.startsWith('<!') || text.startsWith('<html') || text.includes('<html')) {
    return 'text/html; charset=utf-8';
  }

  // JavaScript - check for common JS patterns
  if (text.includes('function') || 
      text.includes('const ') || 
      text.includes('let ') || 
      text.includes('var ') ||
      text.includes('=>') ||
      text.includes('//') ||
      text.includes('/*')) {
    return 'application/javascript; charset=utf-8';
  }

  // Check for image signatures
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
  }

  // Default to text/plain
  return 'text/plain; charset=utf-8';
}

