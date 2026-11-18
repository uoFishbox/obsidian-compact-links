const path = require("node:path");
const Module = require("node:module");
const { buildSync } = require("esbuild");
const { StateEffect, StateField } = require("@codemirror/state");

class Plugin {
	constructor(app) { this.app = app; }
	async loadData() { return this.data; }
	async saveData(data) { this.savedData = data; }
	registerEditorExtension(extension) { this.registeredExtension = extension; }
	addSettingTab() {}
}

const setLivePreview = StateEffect.define();
const editorLivePreviewField = StateField.define({
	create: () => true,
	update: (value, transaction) => transaction.effects.find((effect) => effect.is(setLivePreview))?.value ?? value,
});

const tooltips = [];
const obsidian = {
	Plugin,
	editorLivePreviewField,
	PluginSettingTab: class {},
	setTooltip: (...args) => tooltips.push(args),
};
const { outputFiles } = buildSync({
	stdin: {
		contents: `
			export { default as Plugin } from './src/main';
			export * from './src/settings';
			export * from './src/cmplugins/CompactLinksPlugin';
			export * from './src/components/CompactMdLinkWidget';
			export * from './src/utils/textTruncator';
			export * from './src/utils/urlParser';
		`,
		resolveDir: path.resolve(__dirname, ".."),
	},
	bundle: true,
	write: false,
	platform: "node",
	format: "cjs",
	external: ["obsidian", "@codemirror/*", "@lezer/*"],
});
const runtime = new Module(__filename);
runtime.require = (id) => id === "obsidian" ? obsidian : require(id);
runtime._compile(outputFiles[0].text, __filename);
module.exports = { ...runtime.exports, editorLivePreviewField, setLivePreview, tooltips };
