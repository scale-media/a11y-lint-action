/**
 * Lightweight HTML tag parser for Liquid/HTML templates.
 * Treats {{ ... }} and {% ... %} as opaque text tokens (potentially non-empty).
 * Does NOT build a full DOM; walks opening/closing tags and extracts attributes.
 */

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)?\/?>/g;
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9_:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
const LIQUID_OUTPUT_RE = /\{\{[^}]*\}\}/;
const LIQUID_TAG_RE = /\{%[^%]*%\}/;

function lineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

function hasLiquid(text) {
  return LIQUID_OUTPUT_RE.test(text) || LIQUID_TAG_RE.test(text);
}

function isEmptyContent(raw) {
  if (!raw) return true;
  const stripped = raw
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\{%[^%]*%\}/g, '')
    .trim();
  if (hasLiquid(raw)) return false;
  return stripped.length === 0;
}

function parseAttributes(attrString) {
  if (!attrString) return {};
  const attrs = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    attrs[name] = value;
  }
  return attrs;
}

function extractTags(source) {
  const tags = [];
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(source)) !== null) {
    const full = match[0];
    const tagName = match[1].toLowerCase();
    const attrRaw = match[2] || '';
    const isClosing = full.startsWith('</');
    const selfClosing = full.endsWith('/>') || ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'source', 'track', 'col', 'embed', 'wbr'].includes(tagName);

    tags.push({
      tagName,
      attrs: parseAttributes(attrRaw),
      attrRaw,
      isClosing,
      selfClosing,
      index: match.index,
      line: lineNumber(source, match.index),
      end: match.index + full.length,
    });
  }
  return tags;
}

function getInnerContent(source, openTag, tags) {
  if (openTag.selfClosing) return '';
  const closeIdx = tags.findIndex(
    (t) => t.isClosing && t.tagName === openTag.tagName && t.index > openTag.index
  );
  if (closeIdx === -1) return '';
  const closeTag = tags[closeIdx];
  return source.slice(openTag.end, closeTag.index);
}

module.exports = { extractTags, getInnerContent, parseAttributes, hasLiquid, isEmptyContent, lineNumber };
