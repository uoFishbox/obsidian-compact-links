import { Plugin } from "obsidian";
import type { Extension } from "@codemirror/state";
import { createCompactLinksExtension } from "./cmplugins/CompactLinksPlugin";
import { CompactLinksSettingTab } from "./settingsTab";
import { loadSettings } from "./settings";

export default class CompactLinksPlugin extends Plugin {
	settings = loadSettings();
	private readonly editorExtensions: Extension[] = [];

	async onload(): Promise<void> {
		this.settings = loadSettings(await this.loadData());
		this.editorExtensions[0] = createCompactLinksExtension(this.settings);
		this.registerEditorExtension(this.editorExtensions);
		this.addSettingTab(new CompactLinksSettingTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.editorExtensions[0] = createCompactLinksExtension(this.settings);
		this.app.workspace.updateOptions();
	}
}
