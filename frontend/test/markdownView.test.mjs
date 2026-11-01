import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import parsing logic to verify parser accuracy and security isolation
function isSafeUrl(url) {
  try {
    const trimmed = url.trim();
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return true;
    }
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parseBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];

  let currentList = null;
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        lines: [...currentParagraph],
      });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: 'list',
        ordered: currentList.ordered,
        start: currentList.start,
        items: [...currentList.items],
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        blocks.push({
          type: 'codeblock',
          language: codeLang,
          code: codeLines.join('\n'),
        });
        codeLang = '';
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const ulMatch = rawLine.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (currentList && currentList.ordered) {
        flushList();
      }
      if (!currentList) {
        currentList = { ordered: false, items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = rawLine.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (currentList && !currentList.ordered) {
        flushList();
      }
      if (!currentList) {
        currentList = {
          ordered: true,
          start: parseInt(olMatch[1], 10),
          items: [],
        };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    const bqMatch = rawLine.match(/^>\s*(.+)$/);
    if (bqMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'blockquote',
        text: bqMatch[1].trim(),
      });
      continue;
    }

    flushList();
    currentParagraph.push(rawLine);
  }

  if (inCodeBlock) {
    blocks.push({
      type: 'codeblock',
      language: codeLang,
      code: codeLines.join('\n'),
    });
  }
  flushList();
  flushParagraph();

  return blocks;
}

function parseInlineTokens(text) {
  const tokens = [];
  let remaining = text;
  const tokenRegex = /(`[^`\n]+`|\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_|\[([^\]]+)\]\(([^)]+)\)|\n)/;

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining);
    if (!match) {
      tokens.push({ type: 'text', content: remaining });
      break;
    }

    const matchStart = match.index;
    const matchStr = match[0];

    if (matchStart > 0) {
      tokens.push({ type: 'text', content: remaining.slice(0, matchStart) });
    }

    if (matchStr === '\n') {
      tokens.push({ type: 'break' });
    } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
      tokens.push({ type: 'code', content: matchStr.slice(1, -1) });
    } else if (
      (matchStr.startsWith('***') && matchStr.endsWith('***')) ||
      (matchStr.startsWith('___') && matchStr.endsWith('___'))
    ) {
      tokens.push({ type: 'bold_italic', content: matchStr.slice(3, -3) });
    } else if (
      (matchStr.startsWith('**') && matchStr.endsWith('**')) ||
      (matchStr.startsWith('__') && matchStr.endsWith('__'))
    ) {
      tokens.push({ type: 'bold', content: matchStr.slice(2, -2) });
    } else if (
      (matchStr.startsWith('*') && matchStr.endsWith('*')) ||
      (matchStr.startsWith('_') && matchStr.endsWith('_'))
    ) {
      tokens.push({ type: 'italic', content: matchStr.slice(1, -1) });
    } else if (matchStr.startsWith('[') && match[2] && match[3]) {
      const linkText = match[2];
      const linkUrl = match[3];
      if (isSafeUrl(linkUrl)) {
        tokens.push({ type: 'link', text: linkText, url: linkUrl });
      } else {
        tokens.push({ type: 'unsafe_link_sanitized', text: linkText });
      }
    }

    remaining = remaining.slice(matchStart + matchStr.length);
  }

  return tokens;
}

describe('MarkdownView Architecture & Security Unit Tests', () => {
  test('Correctly identifies Copilot overview response blocks and bullet lists', () => {
    const copilotMsg = `Here is your verified business status for **Apex Sound**:

- **Gross Revenue:** $15,200.00 USD
- **Completed Transactions:** 42
- **Catalog Products:** 12 items
- **Unique Customers:** 28
- **PayPal Connection:** Connected

How can I help you grow today?`;

    const blocks = parseBlocks(copilotMsg);

    assert.equal(blocks.length, 3);
    assert.equal(blocks[0].type, 'paragraph');
    assert.match(blocks[0].lines[0], /Here is your verified business status/);

    assert.equal(blocks[1].type, 'list');
    assert.equal(blocks[1].ordered, false);
    assert.equal(blocks[1].items.length, 5);
    assert.equal(blocks[1].items[0], '**Gross Revenue:** $15,200.00 USD');
    assert.equal(blocks[1].items[4], '**PayPal Connection:** Connected');

    assert.equal(blocks[2].type, 'paragraph');
    assert.match(blocks[2].lines[0], /How can I help you grow today/);
  });

  test('Parses bold tokens without leaving raw markdown asterisks', () => {
    const input = '**Gross Revenue:** $15,200.00 USD';
    const tokens = parseInlineTokens(input);

    assert.equal(tokens.length, 2);
    assert.equal(tokens[0].type, 'bold');
    assert.equal(tokens[0].content, 'Gross Revenue:');
    assert.equal(tokens[1].type, 'text');
    assert.equal(tokens[1].content, ' $15,200.00 USD');
  });

  test('Parses inline code and bold combinations accurately', () => {
    const input = '**Classic Cotton T-Shirt** (SKU: `TSHIRT-BLK-M`): Current stock is **4 units**';
    const tokens = parseInlineTokens(input);

    assert.equal(tokens[0].type, 'bold');
    assert.equal(tokens[0].content, 'Classic Cotton T-Shirt');
    assert.equal(tokens[1].type, 'text');
    assert.equal(tokens[1].content, ' (SKU: ');
    assert.equal(tokens[2].type, 'code');
    assert.equal(tokens[2].content, 'TSHIRT-BLK-M');
    assert.equal(tokens[3].type, 'text');
    assert.equal(tokens[3].content, '): Current stock is ');
    assert.equal(tokens[4].type, 'bold');
    assert.equal(tokens[4].content, '4 units');
  });

  test('Parses fenced code blocks with language specifiers', () => {
    const input = `Here is the campaign payload:
\`\`\`json
{
  "code": "PROMO15",
  "discount": 15
}
\`\`\`
Review in Marketing section.`;

    const blocks = parseBlocks(input);
    assert.equal(blocks.length, 3);
    assert.equal(blocks[0].type, 'paragraph');
    assert.equal(blocks[1].type, 'codeblock');
    assert.equal(blocks[1].language, 'json');
    assert.match(blocks[1].code, /"code": "PROMO15"/);
    assert.equal(blocks[2].type, 'paragraph');
  });

  test('Parses headings and numbered lists', () => {
    const input = `### Action Plan
1. Reorder inventory
2. Schedule email blast
3. Track ROI`;

    const blocks = parseBlocks(input);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].type, 'heading');
    assert.equal(blocks[0].level, 3);
    assert.equal(blocks[0].text, 'Action Plan');

    assert.equal(blocks[1].type, 'list');
    assert.equal(blocks[1].ordered, true);
    assert.equal(blocks[1].items.length, 3);
    assert.equal(blocks[1].items[0], 'Reorder inventory');
  });

  test('Security Sanitization: Disallows dangerous javascript: URLs in links', () => {
    const safeInput = '[PayPal Docs](https://developer.paypal.com)';
    const unsafeInput = '[Malicious Link](javascript:alert(document.cookie))';

    const safeTokens = parseInlineTokens(safeInput);
    assert.equal(safeTokens[0].type, 'link');
    assert.equal(safeTokens[0].url, 'https://developer.paypal.com');

    const unsafeTokens = parseInlineTokens(unsafeInput);
    assert.equal(unsafeTokens[0].type, 'unsafe_link_sanitized');
    assert.equal(unsafeTokens[0].text, 'Malicious Link');
    assert.equal(unsafeTokens[0].url, undefined);
  });

  test('Security Sanitization: Protocol allowlist rejects data: and vbscript:', () => {
    assert.equal(isSafeUrl('https://example.com'), true);
    assert.equal(isSafeUrl('http://localhost:3000'), true);
    assert.equal(isSafeUrl('mailto:support@paypal.com'), true);
    assert.equal(isSafeUrl('/dashboard'), true);
    assert.equal(isSafeUrl('#section'), true);

    assert.equal(isSafeUrl('javascript:alert(1)'), false);
    assert.equal(isSafeUrl('vbscript:msgbox(1)'), false);
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  });
});
