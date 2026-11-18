const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EditorState, StateEffect } = require("@codemirror/state");
const { Plugin, editorLivePreviewField, setLivePreview } = require("./runtime.cjs");

test("saving settings updates the extension for open and newly created editors", async () => {
	const editors = [];
	let updates = 0;
	const app = { workspace: {
		updateOptions() {
			updates++;
			for (const editor of editors) {
				editor.refresh(plugin.registeredExtension);
			}
		},
	} };
	const plugin = new Plugin(app);
	plugin.data = { disableInSourceMode: true };
	await plugin.onload();
	const registered = plugin.registeredExtension;
	const startupExtension = registered[0];

	function openSourceEditor() {
		const editor = {
			state: EditorState.create({ extensions: [editorLivePreviewField, registered] }),
			refresh(extensions) {
				this.state = this.state.update({
					effects: StateEffect.reconfigure.of([editorLivePreviewField, extensions]),
				}).state;
				this.viewPlugin = extensions[0].create(this);
			},
			get visibleRanges() {
				this.extractions++;
				return [];
			},
			extractions: 0,
		};
		editor.state = editor.state.update({ effects: setLivePreview.of(false) }).state;
		editor.refresh(registered);
		editors.push(editor);
		return editor;
	}

	const existing = openSourceEditor();
	assert.equal(existing.extractions, 0);

	plugin.settings.disableInSourceMode = false;
	await plugin.saveSettings();

	assert.equal(plugin.savedData.disableInSourceMode, false);
	assert.equal(plugin.registeredExtension, registered);
	assert.notEqual(registered[0], startupExtension);
	assert.equal(updates, 1);
	assert.equal(existing.extractions, 1);
	assert.equal(openSourceEditor().extractions, 1);
});
