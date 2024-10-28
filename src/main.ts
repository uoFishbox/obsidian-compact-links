import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";

import { createAliasLinkPlugin } from "./createCompactAliasLinkPlugin";
import { createCompactUrlPlugin } from "./createCompactUrlPlugin";
import { CompactLinksSettings, DisplayMode } from "./types";

const DEFAULT_SETTINGS: CompactLinksSettings = {
	disableInSourceMode: false,
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
			id: "toggle-alias-only-view",
			name: "Toggle alias only view",
			callback: () => {
				this.settings.aliasLinks.enable =
					!this.settings.aliasLinks.enable;
				this.saveSettings();
				this.app.workspace.updateOptions();
			},
		});
		this.addCommand({
			id: "toggle-smart-url-view",
			name: "Toggle smart-url-view",
			callback: () => {
				this.settings.urls.enable = !this.settings.urls.enable;
				this.saveSettings();
				this.app.workspace.updateOptions();
			},
		});

		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const isSourceMode = activeView.getState()
						.source as boolean;

					if (this.settings.disableInSourceMode) {
						if (isSourceMode) {
							this.turnOffPluginsTemporarily();
						} else {
							await this.turnOnPluginsFromLocalSettings();
						}
					}
				}
			})
		);
	}

	onunload() {}

	updateDecorations(activeView: MarkdownView) {
		const editorview = activeView.editor.cm;
		editorview.setState(editorview.state);
	}

	turnOffPluginsTemporarily() {
		this.settings.aliasLinks.enable = false;
		this.settings.urls.enable = false;
		this.app.workspace.updateOptions();
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			this.updateDecorations(activeView);
		}
	}

	async turnOnPluginsFromLocalSettings() {
		const localSettings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		this.settings.aliasLinks.enable = localSettings.aliasLinks.enable;
		this.settings.urls.enable = localSettings.urls.enable;
		this.app.workspace.updateOptions();
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			this.updateDecorations(activeView);
		}
	}
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

		containerEl.createEl("h2", { text: "General" });

		new Setting(containerEl)
			.setName("Disable plugin in Source mode")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.disableInSourceMode)
					.onChange(async (value) => {
						this.plugin.settings.disableInSourceMode = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h2", { text: "Alias Only View" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
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
				.setName("Disable during text selection")
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

		containerEl.createEl("h2", { text: "Smart URL View" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
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
