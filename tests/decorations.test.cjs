const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EditorState, EditorSelection } = require("@codemirror/state");
const { Language, defineLanguageFacet } = require("@codemirror/language");
const { Parser, NodeType, Tree } = require("@lezer/common");
const { buildLinkDecorations, createCompactLinksExtension, loadSettings, UrlParser } = require("./runtime.cjs");

// Use real Lezer trees with Obsidian's token names; Obsidian's parser is host-provided.
function stateWithTokens(doc, tokens = [], selection = EditorSelection.cursor(0)) {
	class FixtureParser extends Parser {
		createParse(input) {
			return {
				parsedPos: input.length,
				stoppedAt: null,
				stopAt(pos) { this.stoppedAt = pos; },
				advance() {
					return new Tree(NodeType.define({ id: 0, name: "Document", top: true }),
						tokens.map(([name, from, to], i) => new Tree(
							NodeType.define({ id: i + 1, name }), [], [], to - from)),
						tokens.map(([, from]) => from), input.length);
				},
			};
		}
	}
	return EditorState.create({
		doc, selection,
		extensions: [new Language(defineLanguageFacet(), new FixtureParser()), EditorState.allowMultipleSelections.of(true)],
	});
}

function decorations(state, settings = loadSettings(), visible = [{ from: 0, to: state.doc.length }]) {
	const found = [];
	buildLinkDecorations(state, visible, settings).between(0, state.doc.length, (from, to, value) => {
		found.push({ from, to, value });
	});
	return found;
}

const aliasDoc = " [[Long note|Alias]]";
const aliasTokens = [
	["formatting-link-start", 1, 3], ["hmd-internal-link", 3, 12],
	["link-alias-pipe", 12, 13], ["hmd-internal-link", 13, 18], ["formatting-link-end", 18, 20],
];

test("alias title is hidden until a cursor enters the title, including its boundaries", () => {
	const state = stateWithTokens(aliasDoc, aliasTokens);
	assert.deepEqual(decorations(state).map(({ from, to }) => [from, to]), [[3, 12]]);
	for (const head of [3, 7, 12]) {
		assert.equal(decorations(state.update({ selection: { anchor: head } }).state).length, 0);
	}
	assert.equal(decorations(state.update({ selection: { anchor: 15 } }).state).length, 1);
});

test("an unaliased link does not consume the pipe of the following link", () => {
	const state = stateWithTokens(" [[A]] [[B|C]]", [
		["formatting-link-start", 1, 3], ["hmd-internal-link", 3, 4], ["formatting-link-end", 4, 6],
		["formatting-link-start", 7, 9], ["hmd-internal-link", 9, 10], ["link-alias-pipe", 10, 11],
		["hmd-internal-link", 11, 12], ["formatting-link-end", 12, 14],
	]);
	assert.deepEqual(decorations(state).map(({ from, to }) => [from, to]), [[9, 10]]);
});

test("URL mode chooses domain or placeholder and rejects invalid URLs", () => {
	const doc = " [Title](https://example.com/a)";
	const state = stateWithTokens(doc, [["string_url", 9, doc.length - 1]]);
	const settings = loadSettings();
	assert.equal(decorations(state, settings)[0].value.spec.widget.displayText, "example.com");
	settings.compactMarkdownLinks.CompactMdLinkUrlSettings.displayMode = "hidden";
	assert.equal(decorations(state, settings)[0].value.spec.widget.displayText, "...");
	assert.equal(decorations(state.update({ selection: { anchor: 10 } }).state, settings).length, 0);
	assert.equal(decorations(stateWithTokens(" [x](relative)", [["string_url", 5, 13]])).length, 0);
});

test("secondary cursors and secondary selections also reveal compacted text", () => {
	const state = stateWithTokens(aliasDoc, aliasTokens, EditorSelection.create([
		EditorSelection.cursor(0), EditorSelection.cursor(5),
	]));
	assert.equal(decorations(state).length, 0);
	const settings = loadSettings({ disableWhenSelected: true });
	const selected = stateWithTokens(aliasDoc, aliasTokens, EditorSelection.create([
		EditorSelection.cursor(0), EditorSelection.range(15, 17),
	]));
	assert.equal(decorations(selected, settings).length, 0);
});

test("visible ranges do not duplicate decorations for a syntax node crossing their edges", () => {
	const state = stateWithTokens(aliasDoc, aliasTokens);
	assert.equal(decorations(state, loadSettings(), [{ from: 1, to: 2 }, { from: 2, to: 20 }]).length, 1);
});

test("image alt text spans viewport edges and updates after an edit at the same position", () => {
	let state = stateWithTokens(" ![abcdefgh](image.png)");
	const settings = loadSettings({ compactMarkdownLinks: { CompactMdLinkAltSettings: { displayLength: 3 } } });
	const visible = [{ from: 5, to: 7 }, { from: 8, to: 10 }];
	let found = decorations(state, settings, visible);
	assert.equal(found.length, 1);
	assert.equal(found[0].value.spec.widget.displayText, "abc...");
	assert.deepEqual([found[0].from, found[0].to], [3, 11]);
	state = state.update({ changes: { from: 3, to: 11, insert: "12345678" } }).state;
	found = decorations(state, settings, visible);
	assert.equal(found[0].value.spec.widget.displayText, "123...");
	assert.equal(decorations(stateWithTokens(" ![abc](image.png)"), settings).length, 0);
});

test("feature switches independently suppress their own decorations", () => {
	const settings = loadSettings({ compactAliasedLinks: { enable: false } });
	assert.equal(decorations(stateWithTokens(aliasDoc, aliasTokens), settings).length, 0);
	settings.compactMarkdownLinks.CompactMdLinkUrlSettings.enable = false;
	assert.equal(decorations(stateWithTokens(" https://example.com", [["string_url", 1, 20]]), settings).length, 0);
	settings.compactMarkdownLinks.CompactMdLinkAltSettings.enable = false;
	assert.equal(decorations(stateWithTokens(" ![" + "a".repeat(40) + "](image)"), settings).length, 0);
});

test("view updates rebuild after scrolling and background syntax parsing", () => {
	const state = stateWithTokens(aliasDoc, aliasTokens);
	const view = { state, visibleRanges: [{ from: 0, to: state.doc.length }] };
	const extension = createCompactLinksExtension(loadSettings());
	const plugin = extension.create(view);
	assert.equal(plugin.decorations.size, 1);
	view.visibleRanges = [{ from: 14, to: state.doc.length }];
	plugin.update({ state, startState: state, view, viewportChanged: true });
	assert.equal(plugin.decorations.size, 0);
	view.visibleRanges = [{ from: 0, to: state.doc.length }];
	plugin.update({ state, startState: stateWithTokens(aliasDoc), view });
	assert.equal(plugin.decorations.size, 1);
});

test("cursor movement reuses URL candidates, including one initially expanded at the cursor", (t) => {
	const doc = " [Title](https://example.com/a)";
	let state = stateWithTokens(doc, [["string_url", 9, doc.length - 1]], EditorSelection.cursor(10));
	const settings = loadSettings({ compactMarkdownLinks: { CompactMdLinkAltSettings: { enable: false } } });
	const parse = t.mock.method(UrlParser, "parse");
	const slices = t.mock.method(EditorState.prototype, "sliceDoc");
	const view = { state, visibleRanges: [{ from: 0, to: doc.length }] };
	const plugin = createCompactLinksExtension(settings).create(view);
	assert.equal(plugin.decorations.size, 0);
	assert.equal(parse.mock.callCount(), 1);
	const initialSlices = slices.mock.callCount();

	for (const [head, expected] of [[0, 1], [9, 0], [doc.length - 1, 0], [doc.length, 1]]) {
		const next = state.update({ selection: { anchor: head } }).state;
		view.state = next;
		plugin.update({ state: next, startState: state, view, selectionSet: true });
		assert.equal(plugin.decorations.size, expected);
		state = next;
	}
	assert.equal(parse.mock.callCount(), 1);
	assert.equal(slices.mock.callCount(), initialSlices);
});

test("cached alias candidates respect secondary cursors and inclusive title boundaries", () => {
	let state = stateWithTokens(aliasDoc, aliasTokens);
	const view = { state, visibleRanges: [{ from: 0, to: state.doc.length }] };
	const plugin = createCompactLinksExtension(loadSettings()).create(view);
	for (const [head, expected] of [[3, 0], [7, 0], [12, 0], [15, 1]]) {
		const next = state.update({ selection: EditorSelection.create([
			EditorSelection.cursor(0), EditorSelection.cursor(head),
		]) }).state;
		view.state = next;
		plugin.update({ state: next, startState: state, view, selectionSet: true });
		assert.equal(plugin.decorations.size, expected);
		state = next;
	}
});

test("alt candidates spanning viewport edges are reused without rescanning long lines", (t) => {
	const doc = " ![abcdefgh](image.png)" + "x".repeat(100000);
	let state = stateWithTokens(doc);
	const settings = loadSettings({ compactMarkdownLinks: { CompactMdLinkAltSettings: { displayLength: 3 } } });
	const slices = t.mock.method(EditorState.prototype, "sliceDoc");
	const view = { state, visibleRanges: [{ from: 5, to: 7 }, { from: 8, to: 10 }] };
	const plugin = createCompactLinksExtension(settings).create(view);
	assert.equal(plugin.decorations.size, 1);
	const initialSlices = slices.mock.callCount();
	assert.ok(initialSlices > 0);
	for (const [head, expected] of [[3, 0], [11, 0], [0, 1]]) {
		const next = state.update({ selection: { anchor: head } }).state;
		view.state = next;
		plugin.update({ state: next, startState: state, view, selectionSet: true });
		assert.equal(plugin.decorations.size, expected);
		state = next;
	}
	assert.equal(slices.mock.callCount(), initialSlices);
});

test("edits invalidate cached alt text and defer extraction while a secondary selection disables compaction", (t) => {
	let state = stateWithTokens(" ![abcdefgh](image.png)");
	const settings = loadSettings({ disableWhenSelected: true,
		compactMarkdownLinks: { CompactMdLinkAltSettings: { displayLength: 3 } } });
	const slices = t.mock.method(EditorState.prototype, "sliceDoc");
	const view = { state, visibleRanges: [{ from: 0, to: state.doc.length }] };
	const plugin = createCompactLinksExtension(settings).create(view);
	function update(spec) {
		const transaction = state.update(spec);
		view.state = transaction.state;
		plugin.update({ state: transaction.state, startState: state, view,
			docChanged: transaction.docChanged, selectionSet: transaction.selection !== undefined });
		state = transaction.state;
	}
	function displayText() {
		return plugin.decorations.iter().value.spec.widget.displayText;
	}
	assert.equal(displayText(), "abc...");
	update({ changes: { from: 3, to: 11, insert: "12345678" } });
	assert.equal(displayText(), "123...");
	update({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.range(4, 6)]) });
	assert.equal(plugin.decorations.size, 0);
	const beforeEdit = slices.mock.callCount();
	update({ changes: { from: 3, to: 11, insert: "zyxwvuts" } });
	assert.equal(plugin.decorations.size, 0);
	assert.equal(slices.mock.callCount(), beforeEdit);
	update({ selection: { anchor: 0 } });
	assert.equal(displayText(), "zyx...");
});

test("an initially disabled view waits until the selection clears to extract candidates", (t) => {
	const state = stateWithTokens(" ![abcdefgh](image.png)", [], EditorSelection.range(4, 6));
	const settings = loadSettings({ disableWhenSelected: true,
		compactMarkdownLinks: { CompactMdLinkAltSettings: { displayLength: 3 } } });
	const slices = t.mock.method(EditorState.prototype, "sliceDoc");
	const view = { state, visibleRanges: [{ from: 0, to: state.doc.length }] };
	const plugin = createCompactLinksExtension(settings).create(view);
	assert.equal(plugin.decorations.size, 0);
	assert.equal(slices.mock.callCount(), 0);
	const next = state.update({ selection: { anchor: 0 } }).state;
	view.state = next;
	plugin.update({ state: next, startState: state, view, selectionSet: true });
	assert.ok(slices.mock.callCount() > 0);
	assert.equal(plugin.decorations.size, 1);
});
