/**
 * Static a11y lint rules for Shopify Liquid / HTML templates.
 *
 * Each rule is { id, severity, description, check(tags, source, filePath) }.
 * check() returns an array of { ruleId, severity, line, message }.
 *
 * Severity:
 *   "error"   - blocks the PR
 *   "warning" - annotates the PR but does not block
 */

const { extractTags, getInnerContent, hasLiquid, isEmptyContent } = require('./parser');

const AMBIGUOUS_ALT = new Set([
  'image', 'img', 'photo', 'picture', 'pic', 'graphic', 'icon',
  'logo', 'banner', 'spacer', 'blank', 'untitled', 'placeholder',
]);

const GENERIC_LINK_TEXT = new Set([
  'click here', 'click', 'here', 'learn more', 'read more', 'more',
  'more info', 'details', 'link', 'this link', 'go', 'go here',
  'tap here', 'continue', 'see more', 'view', 'view more',
  'shop now', 'buy now', 'find out more',
]);

const AUTOCOMPLETE_HINTS = {
  email: 'email', password: 'current-password', username: 'username',
  tel: 'tel', phone: 'tel', 'given-name': 'given-name',
  'family-name': 'family-name', name: 'name',
  'street-address': 'street-address', 'postal-code': 'postal-code',
  'cc-number': 'cc-number', 'cc-name': 'cc-name',
};

const IMPLICIT_ROLES = {
  nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo',
  aside: 'complementary', button: 'button', a: 'link',
  ul: 'list', ol: 'list', li: 'listitem', table: 'table',
  form: 'form', article: 'article', section: 'region',
};

function findings(ruleId, severity, line, message) {
  return { ruleId, severity, line, message };
}

const rules = [
  {
    id: 'img-missing-alt',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName === 'img' && !t.isClosing && !('alt' in t.attrs)) {
          results.push(findings('img-missing-alt', 'error', t.line,
            '<img> is missing an alt attribute. Use alt="" for decorative images.'));
        }
      }
      return results;
    },
  },
  {
    id: 'input-missing-label',
    severity: 'error',
    check(tags, source) {
      const results = [];
      const labelFors = new Set();
      for (const t of tags) {
        if (t.tagName === 'label' && t.attrs.for) labelFors.add(t.attrs.for);
      }
      for (const t of tags) {
        if (!['input', 'select', 'textarea'].includes(t.tagName) || t.isClosing) continue;
        if (t.attrs.type === 'hidden' || t.attrs.type === 'submit' || t.attrs.type === 'button') continue;
        const hasLabel = (t.attrs.id && labelFors.has(t.attrs.id))
          || t.attrs['aria-label'] || t.attrs['aria-labelledby'];
        if (!hasLabel) {
          const hasWrappingLabel = (() => {
            const before = source.slice(Math.max(0, t.index - 200), t.index);
            return /<label\b[^>]*>(?:(?!<\/label>).)*$/s.test(before);
          })();
          if (!hasWrappingLabel) {
            results.push(findings('input-missing-label', 'error', t.line,
              `<${t.tagName}> has no associated <label>, aria-label, or aria-labelledby.`));
          }
        }
      }
      return results;
    },
  },
  {
    id: 'html-missing-lang',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName === 'html' && !t.isClosing) {
          const lang = t.attrs.lang || '';
          const liquidLang = hasLiquid(t.attrRaw);
          if (!lang && !liquidLang) {
            results.push(findings('html-missing-lang', 'error', t.line,
              '<html> is missing a lang attribute.'));
          }
        }
      }
      return results;
    },
  },
  {
    id: 'empty-heading',
    severity: 'error',
    check(tags, source) {
      const results = [];
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      for (const t of tags) {
        if (!headings.includes(t.tagName) || t.isClosing) continue;
        const inner = getInnerContent(source, t, tags);
        if (isEmptyContent(inner)) {
          results.push(findings('empty-heading', 'error', t.line,
            `<${t.tagName}> is empty. Headings must have text content.`));
        }
      }
      return results;
    },
  },
  {
    id: 'empty-link',
    severity: 'error',
    check(tags, source) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'a' || t.isClosing) continue;
        if (t.attrs['aria-label'] || t.attrs['aria-labelledby']) continue;
        const inner = getInnerContent(source, t, tags);
        if (isEmptyContent(inner)) {
          results.push(findings('empty-link', 'error', t.line,
            '<a> has no accessible name. Add text, aria-label, or aria-labelledby.'));
        }
      }
      return results;
    },
  },
  {
    id: 'empty-button',
    severity: 'error',
    check(tags, source) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'button' || t.isClosing) continue;
        if (t.attrs['aria-label'] || t.attrs['aria-labelledby']) continue;
        const inner = getInnerContent(source, t, tags);
        if (isEmptyContent(inner)) {
          results.push(findings('empty-button', 'error', t.line,
            '<button> has no accessible name. Add text, aria-label, or aria-labelledby.'));
        }
      }
      return results;
    },
  },
  {
    id: 'iframe-missing-title',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName === 'iframe' && !t.isClosing && !t.attrs.title && !t.attrs['aria-label']) {
          results.push(findings('iframe-missing-title', 'error', t.line,
            '<iframe> is missing a title attribute.'));
        }
      }
      return results;
    },
  },
  {
    id: 'missing-document-title',
    severity: 'error',
    check(tags, source, filePath) {
      if (!filePath.includes('layout/') && !filePath.includes('layout\\')) return [];
      const hasTitle = tags.some((t) => t.tagName === 'title' && !t.isClosing);
      if (!hasTitle) {
        return [findings('missing-document-title', 'error', 1,
          'Layout file is missing a <title> element in <head>.')];
      }
      return [];
    },
  },
  {
    id: 'duplicate-id',
    severity: 'error',
    check(tags) {
      const results = [];
      const seen = new Map();
      for (const t of tags) {
        if (t.isClosing || !t.attrs.id) continue;
        const id = t.attrs.id;
        if (hasLiquid(id)) continue;
        if (seen.has(id)) {
          results.push(findings('duplicate-id', 'error', t.line,
            `Duplicate id="${id}" (first seen on line ${seen.get(id)}).`));
        } else {
          seen.set(id, t.line);
        }
      }
      return results;
    },
  },
  {
    id: 'aria-hidden-on-focusable',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing) continue;
        if (t.attrs['aria-hidden'] !== 'true') continue;
        const focusable = ['a', 'button', 'input', 'select', 'textarea'].includes(t.tagName)
          || (t.attrs.tabindex && t.attrs.tabindex !== '-1');
        if (focusable) {
          results.push(findings('aria-hidden-on-focusable', 'error', t.line,
            `<${t.tagName}> has aria-hidden="true" but is focusable. This creates a ghost focus stop.`));
        }
      }
      return results;
    },
  },
  {
    id: 'no-redundant-role',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing || !t.attrs.role) continue;
        const implicit = IMPLICIT_ROLES[t.tagName];
        if (implicit && t.attrs.role === implicit) {
          results.push(findings('no-redundant-role', 'error', t.line,
            `<${t.tagName} role="${t.attrs.role}"> is redundant. <${t.tagName}> already has that role implicitly.`));
        }
      }
      return results;
    },
  },
  {
    id: 'nested-interactive',
    severity: 'error',
    check(tags, source) {
      const results = [];
      const interactive = ['a', 'button', 'input', 'select', 'textarea'];
      for (const outer of tags) {
        if (!interactive.includes(outer.tagName) || outer.isClosing || outer.selfClosing) continue;
        const inner = getInnerContent(source, outer, tags);
        const innerTags = [];
        const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b/g;
        let m;
        while ((m = re.exec(inner)) !== null) {
          innerTags.push(m[1].toLowerCase());
        }
        for (const child of innerTags) {
          if (interactive.includes(child)) {
            results.push(findings('nested-interactive', 'error', outer.line,
              `<${child}> is nested inside <${outer.tagName}>. Interactive elements must not be nested.`));
            break;
          }
        }
      }
      return results;
    },
  },
  {
    id: 'marquee-detected',
    severity: 'error',
    check(tags) {
      return tags
        .filter((t) => t.tagName === 'marquee' && !t.isClosing)
        .map((t) => findings('marquee-detected', 'error', t.line,
          '<marquee> is deprecated and causes motion/seizure issues. Use CSS animations with prefers-reduced-motion.'));
    },
  },
  {
    id: 'meta-refresh-redirect',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName === 'meta' && (t.attrs['http-equiv'] || '').toLowerCase() === 'refresh') {
          results.push(findings('meta-refresh-redirect', 'error', t.line,
            '<meta http-equiv="refresh"> auto-redirects or refreshes, breaking user control (WCAG 2.2.1).'));
        }
      }
      return results;
    },
  },
  {
    id: 'placeholder-as-label',
    severity: 'error',
    check(tags) {
      const results = [];
      const labelFors = new Set();
      for (const t of tags) {
        if (t.tagName === 'label' && t.attrs.for) labelFors.add(t.attrs.for);
      }
      for (const t of tags) {
        if (!['input', 'textarea'].includes(t.tagName) || t.isClosing) continue;
        if (t.attrs.type === 'hidden' || t.attrs.type === 'submit' || t.attrs.type === 'button') continue;
        if (!t.attrs.placeholder) continue;
        const hasLabel = (t.attrs.id && labelFors.has(t.attrs.id))
          || t.attrs['aria-label'] || t.attrs['aria-labelledby'];
        if (!hasLabel) {
          results.push(findings('placeholder-as-label', 'error', t.line,
            `<${t.tagName}> uses placeholder as its only label. Add a <label>, aria-label, or aria-labelledby.`));
        }
      }
      return results;
    },
  },
  {
    id: 'missing-visible-focus',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing) continue;
        const style = t.attrs.style || '';
        if (/outline\s*:\s*(none|0)\b/.test(style)) {
          results.push(findings('missing-visible-focus', 'error', t.line,
            'Inline style removes focus outline. Keyboard users need a visible focus indicator.'));
        }
      }
      return results;
    },
  },
  {
    id: 'div-button-pattern',
    severity: 'error',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing) continue;
        if (!['div', 'span'].includes(t.tagName)) continue;
        if (t.attrs.onclick && !t.attrs.role && !t.attrs.tabindex) {
          results.push(findings('div-button-pattern', 'error', t.line,
            `<${t.tagName} onclick="..."> should be a <button>. If not possible, add role="button", tabindex="0", and a keydown handler.`));
        }
      }
      return results;
    },
  },

  // --- Warnings (non-blocking) ---

  {
    id: 'ambiguous-alt',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'img' || t.isClosing) continue;
        const alt = (t.attrs.alt || '').trim().toLowerCase();
        if (!alt) continue;
        const looksLikeFile = /\.(png|jpe?g|gif|webp|svg|avif)(\b|$)/i.test(alt);
        if (AMBIGUOUS_ALT.has(alt) || looksLikeFile || /^image\s*\d*$/.test(alt)) {
          results.push(findings('ambiguous-alt', 'warning', t.line,
            `alt="${t.attrs.alt}" is generic or a filename. Use descriptive alt text.`));
        }
      }
      return results;
    },
  },
  {
    id: 'generic-link-text',
    severity: 'warning',
    check(tags, source) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'a' || t.isClosing) continue;
        const inner = getInnerContent(source, t, tags).trim();
        if (hasLiquid(inner)) continue;
        const text = inner.replace(/<[^>]*>/g, '').trim().toLowerCase().replace(/[.!?]+$/g, '');
        if (GENERIC_LINK_TEXT.has(text)) {
          results.push(findings('generic-link-text', 'warning', t.line,
            `Link text "${inner.trim()}" is generic. Use text that describes the destination.`));
        }
      }
      return results;
    },
  },
  {
    id: 'positive-tabindex',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing) continue;
        const ti = parseInt(t.attrs.tabindex, 10);
        if (ti > 0) {
          results.push(findings('positive-tabindex', 'warning', t.line,
            `tabindex="${t.attrs.tabindex}" overrides natural focus order. Use tabindex="0" or "-1".`));
        }
      }
      return results;
    },
  },
  {
    id: 'meta-viewport-scalable',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'meta' || t.isClosing) continue;
        if ((t.attrs.name || '').toLowerCase() !== 'viewport') continue;
        const content = t.attrs.content || '';
        if (/user-scalable\s*=\s*no/i.test(content) || /maximum-scale\s*=\s*1(\b|\.0)/i.test(content)) {
          results.push(findings('meta-viewport-scalable', 'warning', t.line,
            'Viewport meta disables or restricts zoom. Remove user-scalable=no and maximum-scale=1.'));
        }
      }
      return results;
    },
  },
  {
    id: 'autoplay-without-muted',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (!['video', 'audio'].includes(t.tagName) || t.isClosing) continue;
        if ('autoplay' in t.attrs && !('muted' in t.attrs)) {
          results.push(findings('autoplay-without-muted', 'warning', t.line,
            `<${t.tagName} autoplay> without muted may auto-play audio, interfering with screen readers.`));
        }
      }
      return results;
    },
  },
  {
    id: 'heading-skip',
    severity: 'warning',
    check(tags) {
      const results = [];
      let lastLevel = 0;
      for (const t of tags) {
        const m = t.tagName.match(/^h([1-6])$/);
        if (!m || t.isClosing) continue;
        const level = parseInt(m[1], 10);
        if (lastLevel > 0 && level > lastLevel + 1) {
          results.push(findings('heading-skip', 'warning', t.line,
            `<h${level}> follows <h${lastLevel}>, skipping a level. Use sequential headings.`));
        }
        lastLevel = level;
      }
      return results;
    },
  },
  {
    id: 'link-opens-new-tab-no-warning',
    severity: 'warning',
    check(tags, source) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'a' || t.isClosing) continue;
        if (t.attrs.target !== '_blank') continue;
        const label = t.attrs['aria-label'] || '';
        const inner = getInnerContent(source, t, tags);
        const combined = (label + ' ' + inner).toLowerCase();
        if (!/new (tab|window)|opens in|external/.test(combined)) {
          results.push(findings('link-opens-new-tab-no-warning', 'warning', t.line,
            'Link opens in a new tab (target="_blank") with no indication to the user.'));
        }
      }
      return results;
    },
  },
  {
    id: 'multiple-h1',
    severity: 'warning',
    check(tags) {
      const h1s = tags.filter((t) => t.tagName === 'h1' && !t.isClosing);
      if (h1s.length > 1) {
        return h1s.slice(1).map((t) => findings('multiple-h1', 'warning', t.line,
          'Multiple <h1> elements detected. Use a single <h1> per page.'));
      }
      return [];
    },
  },
  {
    id: 'no-main-landmark',
    severity: 'warning',
    check(tags, _source, filePath) {
      if (!filePath.includes('layout/') && !filePath.includes('layout\\')) return [];
      const hasMain = tags.some((t) => t.tagName === 'main' && !t.isClosing);
      if (!hasMain) {
        return [findings('no-main-landmark', 'warning', 1,
          'Layout file has no <main> landmark. Wrap primary content in <main>.')];
      }
      return [];
    },
  },
  {
    id: 'missing-skip-link',
    severity: 'warning',
    check(tags, _source, filePath) {
      if (!filePath.includes('layout/') && !filePath.includes('layout\\')) return [];
      const earlyLinks = tags.filter((t) => t.tagName === 'a' && !t.isClosing).slice(0, 10);
      const hasSkip = earlyLinks.some((t) => {
        const href = (t.attrs.href || '').toLowerCase();
        return href.startsWith('#') && /main|content|skip/.test(href);
      });
      if (!hasSkip) {
        return [findings('missing-skip-link', 'warning', 1,
          'Layout file has no skip-to-content link near the start of the page.')];
      }
      return [];
    },
  },
  {
    id: 'svg-missing-accessible-name',
    severity: 'warning',
    check(tags, source) {
      const results = [];
      for (const t of tags) {
        if (t.tagName !== 'svg' || t.isClosing) continue;
        if (t.attrs['aria-hidden'] === 'true') continue;
        if (t.attrs['aria-label'] || t.attrs['aria-labelledby']) continue;
        const inner = getInnerContent(source, t, tags);
        if (!/<title\b/i.test(inner)) {
          results.push(findings('svg-missing-accessible-name', 'warning', t.line,
            'Inline <svg> has no accessible name. Add aria-hidden="true" (decorative) or aria-label / <title> (meaningful).'));
        }
      }
      return results;
    },
  },
  {
    id: 'th-missing-scope',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.tagName === 'th' && !t.isClosing && !t.attrs.scope && !t.attrs.headers) {
          results.push(findings('th-missing-scope', 'warning', t.line,
            '<th> is missing a scope attribute (scope="col" or scope="row").'));
        }
      }
      return results;
    },
  },
  {
    id: 'accesskey-used',
    severity: 'warning',
    check(tags) {
      const results = [];
      for (const t of tags) {
        if (t.isClosing || !t.attrs.accesskey) continue;
        results.push(findings('accesskey-used', 'warning', t.line,
          `accesskey="${t.attrs.accesskey}" often collides with browser/AT shortcuts. Prefer visible buttons and skip links.`));
      }
      return results;
    },
  },
];

function runRules(source, filePath) {
  const tags = extractTags(source);
  const allFindings = [];
  for (const rule of rules) {
    const results = rule.check(tags, source, filePath);
    allFindings.push(...results);
  }
  allFindings.sort((a, b) => (a.line || 0) - (b.line || 0));
  return allFindings;
}

module.exports = { runRules, rules };
