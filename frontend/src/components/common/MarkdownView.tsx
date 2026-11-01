import React from 'react';

export interface MarkdownViewProps {
  content: string;
  className?: string;
  variant?: 'assistant' | 'user';
}

interface BlockCode {
  type: 'codeblock';
  language?: string;
  code: string;
}

interface BlockHeading {
  type: 'heading';
  level: number;
  text: string;
}

interface BlockList {
  type: 'list';
  ordered: boolean;
  start?: number;
  items: string[];
}

interface Blockquote {
  type: 'blockquote';
  text: string;
}

interface BlockParagraph {
  type: 'paragraph';
  lines: string[];
}

type Block = BlockCode | BlockHeading | BlockList | Blockquote | BlockParagraph;

/**
 * Validates URLs against an allowlist of safe protocols to prevent XSS.
 * Prohibits javascript:, vbscript:, data:, and other unsafe schemes.
 */
function isSafeUrl(url: string): boolean {
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

/**
 * Parses inline markdown tokens into safe React elements.
 * Supports: bold (**text**, __text__), italic (*text*, _text_),
 * bold+italic (***text***, ___text___), inline code (`code`),
 * safe links ([anchor](url)), and line breaks.
 */
function parseInline(text: string, variant: 'assistant' | 'user', keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let tokenIdx = 0;

  // Regex to match the next markdown token in text
  const tokenRegex = /(`[^`\n]+`|\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_|\[([^\]]+)\]\(([^)]+)\)|\n)/;

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining);
    if (!match) {
      nodes.push(<React.Fragment key={`${keyPrefix}_txt_${tokenIdx++}`}>{remaining}</React.Fragment>);
      break;
    }

    const matchStart = match.index;
    const matchStr = match[0];

    // Push preceding plain text
    if (matchStart > 0) {
      const leadingText = remaining.slice(0, matchStart);
      nodes.push(<React.Fragment key={`${keyPrefix}_txt_${tokenIdx++}`}>{leadingText}</React.Fragment>);
    }

    if (matchStr === '\n') {
      nodes.push(<br key={`${keyPrefix}_br_${tokenIdx++}`} />);
    } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
      // Inline code
      const codeContent = matchStr.slice(1, -1);
      nodes.push(
        <code
          key={`${keyPrefix}_code_${tokenIdx++}`}
          className={
            variant === 'user'
              ? 'px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[11px] border border-white/30'
              : 'px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#1E3A5F] font-mono text-[11px] border border-[#D9E2EC]'
          }
        >
          {codeContent}
        </code>
      );
    } else if (
      (matchStr.startsWith('***') && matchStr.endsWith('***')) ||
      (matchStr.startsWith('___') && matchStr.endsWith('___'))
    ) {
      // Bold + Italic
      const inner = matchStr.slice(3, -3);
      nodes.push(
        <strong
          key={`${keyPrefix}_bi_${tokenIdx++}`}
          className={variant === 'user' ? 'font-bold italic text-white' : 'font-bold italic text-[#0F172A]'}
        >
          {parseInline(inner, variant, `${keyPrefix}_bi_${tokenIdx}`)}
        </strong>
      );
    } else if (
      (matchStr.startsWith('**') && matchStr.endsWith('**')) ||
      (matchStr.startsWith('__') && matchStr.endsWith('__'))
    ) {
      // Bold
      const inner = matchStr.slice(2, -2);
      nodes.push(
        <strong
          key={`${keyPrefix}_b_${tokenIdx++}`}
          className={variant === 'user' ? 'font-semibold text-white' : 'font-semibold text-[#0F172A]'}
        >
          {parseInline(inner, variant, `${keyPrefix}_b_${tokenIdx}`)}
        </strong>
      );
    } else if (
      (matchStr.startsWith('*') && matchStr.endsWith('*')) ||
      (matchStr.startsWith('_') && matchStr.endsWith('_'))
    ) {
      // Italic
      const inner = matchStr.slice(1, -1);
      nodes.push(
        <em key={`${keyPrefix}_i_${tokenIdx++}`} className="italic">
          {parseInline(inner, variant, `${keyPrefix}_i_${tokenIdx}`)}
        </em>
      );
    } else if (matchStr.startsWith('[') && match[2] && match[3]) {
      // Link [text](url)
      const linkText = match[2];
      const linkUrl = match[3];

      if (isSafeUrl(linkUrl)) {
        nodes.push(
          <a
            key={`${keyPrefix}_a_${tokenIdx++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              variant === 'user'
                ? 'underline text-white font-medium hover:text-white/80'
                : 'text-[#4779A8] hover:text-[#1E3A5F] underline underline-offset-2 font-medium transition-colors'
            }
          >
            {parseInline(linkText, variant, `${keyPrefix}_a_txt_${tokenIdx}`)}
          </a>
        );
      } else {
        // Unsafe scheme: render text without anchor tag to prevent script execution
        nodes.push(<React.Fragment key={`${keyPrefix}_unsafe_${tokenIdx++}`}>{linkText}</React.Fragment>);
      }
    } else {
      nodes.push(<React.Fragment key={`${keyPrefix}_raw_${tokenIdx++}`}>{matchStr}</React.Fragment>);
    }

    remaining = remaining.slice(matchStart + matchStr.length);
  }

  return nodes;
}

/**
 * Splits markdown content into structural block elements:
 * code blocks, headings, lists, blockquotes, and paragraphs.
 */
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  let currentList: { ordered: boolean; start?: number; items: string[] } | null = null;
  let currentParagraph: string[] = [];

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

    // Check code block fence ```
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

    // Check empty line
    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Check heading: # Heading
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

    // Check unordered list item: - item or * item
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

    // Check ordered list item: 1. item
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

    // Check blockquote: > text
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

    // Regular paragraph line
    flushList();
    currentParagraph.push(rawLine);
  }

  // Flush any remaining active blocks
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

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  className = '',
  variant = 'assistant',
}) => {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div
      className={`space-y-2 text-xs leading-relaxed break-words overflow-hidden ${
        variant === 'user' ? 'text-white' : 'text-[#172B45]'
      } ${className}`}
    >
      {blocks.map((block, bIdx) => {
        const blockKey = `blk_${bIdx}`;

        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h1
                  key={blockKey}
                  className={`text-sm font-bold tracking-tight mt-2 mb-1 ${
                    variant === 'user' ? 'text-white' : 'text-[#1E3A5F]'
                  }`}
                >
                  {parseInline(block.text, variant, blockKey)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={blockKey}
                  className={`text-[13px] font-bold tracking-tight mt-2 mb-1 ${
                    variant === 'user' ? 'text-white' : 'text-[#1E3A5F]'
                  }`}
                >
                  {parseInline(block.text, variant, blockKey)}
                </h2>
              );
            }
            return (
              <h3
                key={blockKey}
                className={`text-xs font-bold tracking-tight mt-1.5 mb-1 ${
                  variant === 'user' ? 'text-white' : 'text-[#1E3A5F]'
                }`}
              >
                {parseInline(block.text, variant, blockKey)}
              </h3>
            );
          }

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            const listClass = block.ordered
              ? 'list-decimal pl-4 space-y-1 my-1.5'
              : 'list-disc pl-4 space-y-1 my-1.5';

            return (
              <ListTag
                key={blockKey}
                start={block.start}
                className={`${listClass} ${variant === 'user' ? 'text-white' : 'text-[#172B45]'}`}
              >
                {block.items.map((item, itemIdx) => (
                  <li key={`${blockKey}_li_${itemIdx}`} className="leading-relaxed">
                    {parseInline(item, variant, `${blockKey}_li_${itemIdx}`)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'blockquote': {
            return (
              <blockquote
                key={blockKey}
                className={`border-l-2 pl-2.5 py-1 my-1.5 italic rounded-r text-[11px] ${
                  variant === 'user'
                    ? 'border-white/50 bg-white/10 text-white/90'
                    : 'border-[#4779A8] bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                {parseInline(block.text, variant, blockKey)}
              </blockquote>
            );
          }

          case 'codeblock': {
            return (
              <div
                key={blockKey}
                className="my-2 rounded-lg bg-[#0F172A] border border-[#1E293B] overflow-hidden"
              >
                {block.language && (
                  <div className="px-3 py-1 bg-[#1E293B]/70 border-b border-[#334155] text-[10px] font-mono text-[#94A3B8] uppercase">
                    {block.language}
                  </div>
                )}
                <pre className="p-2.5 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto whitespace-pre">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          }

          case 'paragraph': {
            const paragraphText = block.lines.join('\n');
            return (
              <p key={blockKey} className="leading-relaxed">
                {parseInline(paragraphText, variant, blockKey)}
              </p>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};