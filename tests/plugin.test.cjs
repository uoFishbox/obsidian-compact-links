const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EditorState } = require("@codemirror/state");
const { Plugin, MarkdownView, loadSettings } = require("./runtime.cjs");

test("loading, source mode changes, and settings updates configure every editor without redundant dispatch", async () => {
	const callbacks = {};
	const views = [];
	let ready;
	const app = { workspace: {
		on(name, callback) { callbacks[name] = callback; },
		onLayoutReady(callback) { ready = callback; },
		getLeavesOfType() { return views.map((view) => ({ view })); },
	} };
	const plugin = new Plugin(app);
	plugin.data = { disableInSourceMode: true };
	await plugin.onload();
	function editor(source) {
		const cm = {
			state: EditorState.create({ extensions: [plugin.registeredExtension] }),
			dispatches: 0,
			dispatch(transaction) {
				this.dispatches++;
				this.state = this.state.update(transaction).state;
			},
		};
		const view = new MarkdownView(cm, source);
		views.push(view);
		return view;
	}
	const source = editor(true);
	const live = editor(false);
	const cm = source.editor.cm;
	ready();
	assert.deepEqual(plugin.extensionCompartment.get(cm.state), []);
	assert.equal(cm.dispatches, 1);
	assert.equal(live.editor.cm.dispatches, 0);
	callbacks["layout-change"]();
	assert.equal(cm.dispatches, 1);
	source.source = false;
	callbacks["layout-change"]();
	assert.equal(plugin.extensionCompartment.get(cm.state), plugin.extensionCompartment.get(live.editor.cm.state));
	plugin.settings = loadSettings({ disableWhenSelected: true });
	await plugin.saveSettings();
	assert.equal(plugin.savedData.disableWhenSelected, true);
	assert.equal(plugin.extensionCompartment.get(cm.state), plugin.extensionCompartment.get(live.editor.cm.state));
	assert.equal(cm.dispatches, 3);
	assert.equal(live.editor.cm.dispatches, 1);
});
