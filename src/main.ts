import { MarkdownView, Plugin } from "obsidian";
import { Compartment, Extension } from "@codemirror/state";
import { createCompactLinksExtension } from "./cmplugins/CompactLinksPlugin";
import { CompactLinksSettingTab } from "./settingsTab";
import { loadSettings } from "./settings";

export default class CompactLinksPlugin extends Plugin {
	settings = loadSettings();
	private readonly extensionCompartment = new Compartment();
	private extension: Extension = [];
	private readonly disabledExtension: Extension = [];

	async onload(): Promise<void> {
		this.settings = loadSettings(await this.loadData());
		this.extension = createCompactLinksExtension(this.settings);
		this.registerEditorExtension(this.extensionCompartment.of(this.extension));
		this.addSettingTab(new CompactLinksSettingTab(this.app, this));
		this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshEditors()));
		this.app.workspace.onLayoutReady(() => this.refreshEditors());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Create once per settings change, then share the definition across editors.
		this.extension = createCompactLinksExtension(this.settings);
		this.refreshEditors();
	}

	private refreshEditors(): void {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			if (!(leaf.view instanceof MarkdownView)) continue;
			const view = leaf.view;
			const editor = view.editor?.cm;
			if (!editor) continue;

			const extension = this.settings.disableInSourceMode && view.getState().source
				? this.disabledExtension
				: this.extension;
			const current = this.extensionCompartment.get(editor.state);
			if (current !== undefined && current !== extension) {
				editor.dispatch({ effects: this.extensionCompartment.reconfigure(extension) });
			}
		}
	}
}
