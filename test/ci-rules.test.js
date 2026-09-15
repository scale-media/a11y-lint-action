const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runRules } = require('../rules');

function find(source, ruleId, filePath = 'sections/test.liquid') {
  return runRules(source, filePath).filter((f) => f.ruleId === ruleId);
}

describe('img-missing-alt', () => {
  it('flags <img> without alt', () => {
    assert.ok(find('<img src="a.png">',  'img-missing-alt').length > 0);
  });
  it('passes <img alt="">', () => {
    assert.equal(find('<img src="a.png" alt="">',  'img-missing-alt').length, 0);
  });
  it('passes <img alt="Photo of cat">', () => {
    assert.equal(find('<img src="a.png" alt="Photo of cat">',  'img-missing-alt').length, 0);
  });
});

describe('input-missing-label', () => {
  it('flags <input> with no label', () => {
    assert.ok(find('<input type="text">',  'input-missing-label').length > 0);
  });
  it('passes with matching <label for="">', () => {
    assert.equal(find('<label for="x">Name</label><input id="x" type="text">',  'input-missing-label').length, 0);
  });
  it('passes with aria-label', () => {
    assert.equal(find('<input type="text" aria-label="Search">',  'input-missing-label').length, 0);
  });
  it('ignores hidden inputs', () => {
    assert.equal(find('<input type="hidden" name="token">',  'input-missing-label').length, 0);
  });
  it('ignores submit buttons', () => {
    assert.equal(find('<input type="submit" value="Go">',  'input-missing-label').length, 0);
  });
});

describe('html-missing-lang', () => {
  it('flags <html> without lang', () => {
    assert.ok(find('<html><head></head></html>',  'html-missing-lang').length > 0);
  });
  it('passes with lang attribute', () => {
    assert.equal(find('<html lang="en">',  'html-missing-lang').length, 0);
  });
  it('passes with Liquid lang', () => {
    assert.equal(find('<html lang="{{ request.locale.iso_code }}">',  'html-missing-lang').length, 0);
  });
});

describe('empty-heading', () => {
  it('flags empty <h2>', () => {
    assert.ok(find('<h2></h2>',  'empty-heading').length > 0);
  });
  it('passes when heading has text', () => {
    assert.equal(find('<h2>About</h2>',  'empty-heading').length, 0);
  });
  it('passes when heading has Liquid output', () => {
    assert.equal(find('<h2>{{ section.settings.title }}</h2>',  'empty-heading').length, 0);
  });
});

describe('empty-link', () => {
  it('flags empty <a>', () => {
    assert.ok(find('<a href="/"></a>',  'empty-link').length > 0);
  });
  it('passes with text', () => {
    assert.equal(find('<a href="/">Home</a>',  'empty-link').length, 0);
  });
  it('passes with Liquid output', () => {
    assert.equal(find('<a href="/">{{ section.settings.link_text }}</a>',  'empty-link').length, 0);
  });
  it('passes with aria-label', () => {
    assert.equal(find('<a href="/" aria-label="Home"></a>',  'empty-link').length, 0);
  });
});

describe('empty-button', () => {
  it('flags empty <button>', () => {
    assert.ok(find('<button></button>',  'empty-button').length > 0);
  });
  it('passes with text', () => {
    assert.equal(find('<button>Submit</button>',  'empty-button').length, 0);
  });
});

describe('iframe-missing-title', () => {
  it('flags <iframe> without title', () => {
    assert.ok(find('<iframe src="/embed"></iframe>',  'iframe-missing-title').length > 0);
  });
  it('passes with title', () => {
    assert.equal(find('<iframe src="/embed" title="Video player"></iframe>',  'iframe-missing-title').length, 0);
  });
});

describe('missing-document-title (layout only)', () => {
  it('flags layout file with no <title>', () => {
    assert.ok(find('<html><head></head><body></body></html>',  'missing-document-title', 'layout/theme.liquid').length > 0);
  });
  it('passes layout file with <title>', () => {
    assert.equal(find('<html><head><title>My Store</title></head></html>',  'missing-document-title', 'layout/theme.liquid').length, 0);
  });
  it('skips non-layout files', () => {
    assert.equal(find('<html><head></head></html>',  'missing-document-title', 'sections/hero.liquid').length, 0);
  });
});

describe('duplicate-id', () => {
  it('flags duplicate static IDs', () => {
    assert.ok(find('<div id="main">A</div><div id="main">B</div>',  'duplicate-id').length > 0);
  });
  it('ignores Liquid-based IDs', () => {
    assert.equal(find('<div id="{{ id1 }}">A</div><div id="{{ id1 }}">B</div>',  'duplicate-id').length, 0);
  });
});

describe('aria-hidden-on-focusable', () => {
  it('flags <button aria-hidden="true">', () => {
    assert.ok(find('<button aria-hidden="true">X</button>',  'aria-hidden-on-focusable').length > 0);
  });
  it('passes on non-focusable', () => {
    assert.equal(find('<div aria-hidden="true">icon</div>',  'aria-hidden-on-focusable').length, 0);
  });
});

describe('no-redundant-role', () => {
  it('flags <nav role="navigation">', () => {
    assert.ok(find('<nav role="navigation">X</nav>',  'no-redundant-role').length > 0);
  });
  it('passes if role differs from implicit', () => {
    assert.equal(find('<nav role="tablist">X</nav>',  'no-redundant-role').length, 0);
  });
});

describe('nested-interactive', () => {
  it('flags <a> containing <button>', () => {
    assert.ok(find('<a href="/"><button>Go</button></a>',  'nested-interactive').length > 0);
  });
});

describe('ambiguous-alt (warning)', () => {
  it('flags generic alt text', () => {
    assert.ok(find('<img src="x.png" alt="image">',  'ambiguous-alt').length > 0);
  });
  it('flags filename as alt', () => {
    assert.ok(find('<img src="x.png" alt="banner.png">',  'ambiguous-alt').length > 0);
  });
  it('passes descriptive alt', () => {
    assert.equal(find('<img src="x.png" alt="Team photo at offsite 2024">',  'ambiguous-alt').length, 0);
  });
});

describe('generic-link-text (warning)', () => {
  it('flags "Click here"', () => {
    assert.ok(find('<a href="/">Click here</a>',  'generic-link-text').length > 0);
  });
  it('passes descriptive text', () => {
    assert.equal(find('<a href="/">View our pricing plans</a>',  'generic-link-text').length, 0);
  });
  it('ignores Liquid content', () => {
    assert.equal(find('<a href="/">{{ block.settings.text }}</a>',  'generic-link-text').length, 0);
  });
});

describe('positive-tabindex (warning)', () => {
  it('flags tabindex > 0', () => {
    assert.ok(find('<div tabindex="5">X</div>',  'positive-tabindex').length > 0);
  });
  it('passes tabindex="0"', () => {
    assert.equal(find('<div tabindex="0">X</div>',  'positive-tabindex').length, 0);
  });
});

describe('heading-skip (warning)', () => {
  it('flags h1 -> h3', () => {
    assert.ok(find('<h1>Title</h1><h3>Sub</h3>',  'heading-skip').length > 0);
  });
  it('passes sequential headings', () => {
    assert.equal(find('<h1>Title</h1><h2>Sub</h2>',  'heading-skip').length, 0);
  });
});

describe('link-opens-new-tab-no-warning (warning)', () => {
  it('flags target="_blank" without mention', () => {
    assert.ok(find('<a href="/" target="_blank">Go</a>',  'link-opens-new-tab-no-warning').length > 0);
  });
  it('passes when aria-label mentions new tab', () => {
    assert.equal(find('<a href="/" target="_blank" aria-label="Go (opens in new tab)">Go</a>',  'link-opens-new-tab-no-warning').length, 0);
  });
});

describe('div-button-pattern', () => {
  it('flags <div onclick="..."> without role', () => {
    assert.ok(find('<div onclick="foo()">X</div>',  'div-button-pattern').length > 0);
  });
  it('passes real button', () => {
    assert.equal(find('<button onclick="foo()">X</button>',  'div-button-pattern').length, 0);
  });
});

describe('meta-refresh-redirect', () => {
  it('flags meta refresh', () => {
    assert.ok(find('<meta http-equiv="refresh" content="5;url=/">',  'meta-refresh-redirect').length > 0);
  });
});

describe('autoplay-without-muted (warning)', () => {
  it('flags autoplay without muted', () => {
    assert.ok(find('<video autoplay src="v.mp4"></video>',  'autoplay-without-muted').length > 0);
  });
  it('passes autoplay muted', () => {
    assert.equal(find('<video autoplay muted src="v.mp4"></video>',  'autoplay-without-muted').length, 0);
  });
});

describe('meta-viewport-scalable (warning)', () => {
  it('flags user-scalable=no', () => {
    assert.ok(find('<meta name="viewport" content="width=device-width, user-scalable=no">',  'meta-viewport-scalable').length > 0);
  });
  it('passes normal viewport', () => {
    assert.equal(find('<meta name="viewport" content="width=device-width, initial-scale=1">',  'meta-viewport-scalable').length, 0);
  });
});

describe('marquee-detected', () => {
  it('flags <marquee>', () => {
    assert.ok(find('<marquee>Sale!</marquee>',  'marquee-detected').length > 0);
  });
});

describe('placeholder-as-label', () => {
  it('flags input with only placeholder', () => {
    assert.ok(find('<input type="text" placeholder="Email">',  'placeholder-as-label').length > 0);
  });
  it('passes when label exists', () => {
    assert.equal(find('<label for="e">Email</label><input id="e" type="text" placeholder="Email">',  'placeholder-as-label').length, 0);
  });
});

describe('missing-visible-focus', () => {
  it('flags inline outline:none', () => {
    assert.ok(find('<a href="/" style="outline: none;">X</a>',  'missing-visible-focus').length > 0);
  });
});

describe('svg-missing-accessible-name (warning)', () => {
  it('flags svg without aria-hidden or title', () => {
    assert.ok(find('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',  'svg-missing-accessible-name').length > 0);
  });
  it('passes decorative svg', () => {
    assert.equal(find('<svg aria-hidden="true"><path d="M0 0"/></svg>',  'svg-missing-accessible-name').length, 0);
  });
  it('passes svg with <title>', () => {
    assert.equal(find('<svg><title>Icon</title><path d="M0 0"/></svg>',  'svg-missing-accessible-name').length, 0);
  });
});

describe('th-missing-scope (warning)', () => {
  it('flags <th> without scope', () => {
    assert.ok(find('<table><tr><th>Name</th></tr></table>',  'th-missing-scope').length > 0);
  });
  it('passes with scope', () => {
    assert.equal(find('<table><tr><th scope="col">Name</th></tr></table>',  'th-missing-scope').length, 0);
  });
});

describe('no-main-landmark (layout only, warning)', () => {
  it('flags layout with no <main>', () => {
    assert.ok(find('<html><body></body></html>',  'no-main-landmark', 'layout/theme.liquid').length > 0);
  });
  it('passes when <main> present', () => {
    assert.equal(find('<html><body><main>Content</main></body></html>',  'no-main-landmark', 'layout/theme.liquid').length, 0);
  });
});

describe('missing-skip-link (layout only, warning)', () => {
  it('flags layout with no skip link', () => {
    assert.ok(find('<html><body><nav></nav></body></html>',  'missing-skip-link', 'layout/theme.liquid').length > 0);
  });
  it('passes when skip link present', () => {
    assert.equal(find('<html><body><a href="#main-content">Skip</a></body></html>',  'missing-skip-link', 'layout/theme.liquid').length, 0);
  });
});

describe('multiple-h1 (warning)', () => {
  it('flags two h1s', () => {
    assert.ok(find('<h1>Title</h1><h1>Other</h1>',  'multiple-h1').length > 0);
  });
  it('passes single h1', () => {
    assert.equal(find('<h1>Title</h1>',  'multiple-h1').length, 0);
  });
});

describe('accesskey-used (warning)', () => {
  it('flags accesskey', () => {
    assert.ok(find('<a href="/" accesskey="s">Skip</a>',  'accesskey-used').length > 0);
  });
});

describe('Liquid-aware content detection', () => {
  it('does not flag heading with Liquid output', () => {
    assert.equal(find('<h2>{{ section.settings.title }}</h2>',  'empty-heading').length, 0);
  });
  it('does not flag heading with Liquid tag', () => {
    assert.equal(find('<h2>{% if show %}Title{% endif %}</h2>',  'empty-heading').length, 0);
  });
  it('does not flag <a> with Liquid content', () => {
    assert.equal(find('<a href="/">{{ section.settings.link_text }}</a>',  'empty-link').length, 0);
  });
});
