import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { createAliasLinkPlugin } from "./createCompactAliasLinkPlugin";
import { createCompactUrlPlugin } from "./createCompactUrlPlugin";
import { CompactLinksSettings, DisplayMode } from "./types";

const DEFAULT_SETTINGS: CompactLinksSettings = {
	aliasLinks: { disableWhenSelected: true, enable: true },
	urls: { displayMode: "domain", enable: true },
};

export default class CompactLinksPlugin extends Plugin {
	settings: CompactLinksSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension(createAliasLinkPlugin(this.settings));
		this.registerEditorExtension(createCompactUrlPlugin(this.settings));
		this.addSettingTab(new CompactLinksSettingTab(this.app, this));
		this.addCommand({
			id: "toggle-compact-links-with-alias",
			name: "Toggle compact links with alias",
			callback: () => {
				this.settings.aliasLinks.enable =
					!this.settings.aliasLinks.enable;
				this.saveSettings();
				this.app.workspace.updateOptions();
			},
		});
		this.addCommand({
			id: "toggle-compact-external-links",
			name: "Toggle compact external links",
			callback: () => {
				this.settings.urls.enable = !this.settings.urls.enable;
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
		this.registerEditorExtension(createAliasLinkPlugin(this.settings));
		this.registerEditorExtension(createCompactUrlPlugin(this.settings));
	}
}

class CompactLinksSettingTab extends PluginSettingTab {
	plugin: CompactLinksPlugin;

	constructor(app: App, plugin: CompactLinksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Compact links with aliases")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.aliasLinks.enable)
					.onChange(async (value) => {
						this.plugin.settings.aliasLinks.enable = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.aliasLinks.enable) {
			new Setting(containerEl)
				.setName("Unhide link names when text selection begins")
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.aliasLinks.disableWhenSelected
						)
						.onChange(async (value) => {
							this.plugin.settings.aliasLinks.disableWhenSelected =
								value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName("Compact external links")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.urls.enable)
					.onChange(async (value) => {
						this.plugin.settings.urls.enable = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.urls.enable) {
			// if displaymode is set to domain, show the description of the display mode.
			let description = "";
			if (this.plugin.settings.urls.displayMode === "domain") {
				description = "Display format: [Title](domain)";
			} else {
				description = "Display format: [Title](...)";
			}

			new Setting(containerEl)
				.setName("Display mode")
				.setDesc(description)
				.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							hide: "Hide",
							domain: "Domain",
						})
						.setValue(this.plugin.settings.urls.displayMode)
						.onChange(async (value) => {
							this.plugin.settings.urls.displayMode =
								value as DisplayMode;
							await this.plugin.saveSettings();
							this.display();
						})
				);
		}
	}
}
