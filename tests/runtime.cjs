const path = require("node:path");
const Module = require("node:module");
const { buildSync } = require("esbuild");

class Plugin {
	constructor(app) { this.app = app; }
	async loadData() { return this.data; }
	async saveData(data) { this.savedData = data; }
	registerEditorExtension(extension) { this.registeredExtension = extension; }
	addSettingTab() {}
	registerEvent() {}
}

class MarkdownView {
	constructor(editor, source = false) {
		this.editor = { cm: editor };
		this.source = source;
	}
	getState() { return { source: this.source }; }
}

const tooltips = [];
const obsidian = {
	Plugin,
	MarkdownView,
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
module.exports = { ...runtime.exports, MarkdownView, tooltips };
