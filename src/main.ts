import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { createSuppressAliasExtension } from "./suppressAliasExtension";
import { CompactLinksWithAliasSettings } from "./types";

const DEFAULT_SETTINGS: CompactLinksWithAliasSettings = {
	diablePluginWhenSelected: true,
	enablePlugin: true,
};

export default class CompactLinksWithAliasPlugin extends Plugin {
	settings: CompactLinksWithAliasSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension(
			createSuppressAliasExtension(this.settings)
		);
		this.addSettingTab(new CompactLinksWithAliasSettingTab(this.app, this));
		this.addCommand({
			id: "toggle-compact-links-with-alias",
			name: "Toggle Compact Links with Alias",
			callback: () => {
				this.settings.enablePlugin = !this.settings.enablePlugin;
				this.saveSettings();
				this.app.workspace.updateOptions();
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.app.workspace.updateOptions();
		this.registerEditorExtension(
			createSuppressAliasExtension(this.settings)
		);
	}
}

class CompactLinksWithAliasSettingTab extends PluginSettingTab {
	plugin: CompactLinksWithAliasPlugin;

	constructor(app: App, plugin: CompactLinksWithAliasPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Enable plugin").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.enablePlugin)
				.onChange(async (value) => {
					this.plugin.settings.enablePlugin = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName("Unhide link names when text selection begins")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.diablePluginWhenSelected)
					.onChange(async (value) => {
						this.plugin.settings.diablePluginWhenSelected = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
