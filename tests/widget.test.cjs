const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CompactMdLinkWidget, textTruncator, UrlParser, tooltips } = require("./runtime.cjs");

test("truncation respects CJK width and never splits a Unicode surrogate pair", () => {
	assert.equal(textTruncator("abc", 3), "abc");
	assert.equal(textTruncator("日本語", 4), "日本...");
	assert.equal(textTruncator("a日本", 3), "a日...");
	assert.equal(textTruncator("😀ab", 2), "😀a...");
	assert.equal(textTruncator("", 1), "");
});

test("URL parsing keeps custom schemes, hides HTTP schemes, and rejects relative paths", () => {
	assert.deepEqual(UrlParser.parse("https://example.com/path"), { isUrl: true, scheme: "", domain: "example.com" });
	assert.deepEqual(UrlParser.parse("obsidian://open?vault=test"), { isUrl: true, scheme: "obsidian", domain: "open" });
	assert.equal(UrlParser.parse("relative/path").isUrl, false);
});

test("relative paths are rejected without invoking the throwing URL constructor", (t) => {
	const URLConstructor = t.mock.method(global, "URL");
	for (const url of ["relative/path", "./image.png", "../note.md", "/note", "//example.com", "#heading", "?query=1", ""]) {
		assert.equal(UrlParser.parse(url).isUrl, false, url);
	}
	assert.equal(URLConstructor.mock.callCount(), 0);
});

test("absolute URL validation still accepts extended schemes and whitespace and rejects malformed hosts", () => {
	for (const url of ["git+ssh://example.com/path", "app.v2://open", "app2://open", "mailto:user@example.com",
		" \thttps://example.com/path\r\n", "ht\ntps://example.com/path"]) {
		assert.equal(UrlParser.parse(url).isUrl, true, url);
	}
	for (const url of ["https://", "https://[invalid", "https://example.com:invalid"]) {
		assert.equal(UrlParser.parse(url).isUrl, false, url);
	}
});

test("widget reuse checks text, positions, CSS, and tooltip settings", () => {
	const create = (text = "full", range = { from: 2, to: 8 }, tooltip = true, css = "compact-url-domain") =>
		new CompactMdLinkWidget(text, "short", css, range, tooltip);
	const widget = create();
	assert.equal(widget.eq(create()), true);
	assert.equal(widget.eq(create("changed")), false);
	assert.equal(widget.eq(create("full", { from: 3, to: 9 })), false);
	assert.equal(widget.eq(create("full", { from: 2, to: 8 }, false)), false);
	assert.equal(widget.eq(create("full", { from: 2, to: 8 }, true, "other")), false);
});

test("widget click selects the full text and tooltip receives plain text", () => {
	const events = {};
	const span = { addEventListener(name, callback) { events[name] = callback; } };
	let selection;
	let focused = false;
	const view = {
		dom: { ownerDocument: { createElement() { return span; } } },
		dispatch(transaction) { selection = transaction.selection; },
		focus() { focused = true; },
	};
	const fullText = "<img onerror=alert(1)>";
	const widget = new CompactMdLinkWidget(fullText, "short", "compact", { from: 2, to: 8 }, true);
	assert.equal(widget.toDOM(view), span);
	assert.equal(span.textContent, "short");
	assert.equal(tooltips.at(-1)[1], fullText);
	events.click();
	assert.deepEqual(selection, { anchor: 2, head: 8 });
	assert.equal(focused, true);
});
