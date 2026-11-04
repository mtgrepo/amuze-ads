// src/common/pipes/xss-sanitize.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

// Comprehensive XSS patterns:
// Dangerous tags: <script>, <iframe>, <object>, <embed>, <svg>, <link>, <style>, <meta>, <base>, <form>
// Inline event handlers: onerror=, onload=, onclick=, onmouseover=, onfocus=, etc.
// Dangerous protocols: javascript:, vbscript:, data:text/html
// Encoded script tags: &lt;script, &#60;script, &#x3c;script, %3Cscript
const COMPREHENSIVE_XSS_REGEX = new RegExp(
  [
    /<\/?\s*(script|iframe|object|embed|svg|link|style|meta|base|applet|form)\b[^>]*>/i.source,
    /\bon[a-z]+\s*=/i.source,
    /(javascript|vbscript|livescript)\s*:/i.source,
    /data\s*:\s*text\/html/i.source,
    /(&lt;|&#0*60;|&#x0*3c;|%3c)\s*\/?\s*script\b/i.source,
  ].join('|'),
  'i',
);

@Injectable()
export class XssSanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (!['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }
    return this.validateAllInputs(value);
  }

  private validateAllInputs(value: unknown, fieldName?: string): unknown {
    // Check Strings
    if (typeof value === 'string') {
      // Layer 1: Check comprehensive XSS regex (catches raw, obfuscated, and encoded payloads)
      if (COMPREHENSIVE_XSS_REGEX.test(value)) {
        this.throwError(fieldName);
      }

      // Layer 2: Parse with sanitize-html with ZERO allowed tags.
      // If stripping HTML tags changes the string (and it wasn't just an innocent '<' or '>'),
      // it means an actual HTML tag like <img src=x> or <div> was injected.
      const stripped = sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
      });

      // Decode safe entities back (&amp;, &lt;, &gt;, &quot;, &#39;) so normal text like "a < b" or "Tom & Jerry" is allowed,
      // while actual HTML tags (<p>, <img>, <script>, <a href>) cause a mismatch and get blocked.
      const normalizedStripped = stripped
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');

      if (normalizedStripped !== value) {
        this.throwError(fieldName);
      }

      return value;
    }

    // Check Arrays recursively
    if (Array.isArray(value)) {
      return value.map((item) => this.validateAllInputs(item, fieldName));
    }

    // Check Nested Objects recursively
    if (
      value !== null &&
      typeof value === 'object' &&
      !(value instanceof Date) &&
      !Buffer.isBuffer(value)
    ) {
      const cleanedObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        cleanedObj[key] = this.validateAllInputs(val, key);
      }
      return cleanedObj;
    }

    return value;
  }

  private throwError(fieldName?: string): never {
    const target = fieldName ? ` in "${fieldName}"` : '';
    throw new BadRequestException(
      `HTML tags or potentially malicious scripts are not allowed${target}.`,
    );
  }
}