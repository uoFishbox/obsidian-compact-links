import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

import { createAliasLinkPlugin } from "./createCompactAliasLinkExtension";
import { createCompactUrlPlugin } from "./createCompactUrlExtension";
import { CompactLinksSettings, DisplayMode } from "./types";

const DEFAULT_SETTINGS: CompactLinksSettings = {
	disableInSourceMode: false,
	disableWhenSelected: false,
	aliasLinks: { enable: true },
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
			id: "toggle-compact-aliased-links",
			name: "Toggle compact aliased links",
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

		// this.registerEvent(
		// 	this.app.workspace.on("layout-change", async () => {
		// 		const activeView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (activeView) {
		// 			const isSourceMode = activeView.getState()
		// 				.source as boolean;

		// 			if (this.settings.disableInSourceMode) {
		// 				if (isSourceMode) {
		// 					this.turnOffPluginsTemporarily();
		// 				} else {
		// 					await this.turnOnPluginsFromLocalSettings();
		// 				}
		// 			}
		// 		}
		// 	})
		// );
	}

	onunload() {}

	// updateDecorations(activeView: MarkdownView) {
	// 	const editorview = activeView.editor.cm;
	// 	editorview.setState(editorview.state);
	// }

	// turnOffPluginsTemporarily() {
	// 	this.settings.aliasLinks.enable = false;
	// 	this.settings.urls.enable = false;
	// 	this.app.workspace.updateOptions();
	// 	const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
	// 	if (activeView) {
	// 		this.updateDecorations(activeView);
	// 	}
	// }

	// async turnOnPluginsFromLocalSettings() {
	// 	const localSettings = Object.assign(
	// 		{},
	// 		DEFAULT_SETTINGS,
	// 		await this.loadData()
	// 	);
	// 	this.settings.aliasLinks.enable = localSettings.aliasLinks.enable;
	// 	this.settings.urls.enable = localSettings.urls.enable;
	// 	this.app.workspace.updateOptions();
	// 	const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
	// 	if (activeView) {
	// 		this.updateDecorations(activeView);
	// 	}
	// }
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

		// new Setting(containerEl)
		// 	.setName("Disable plugin in source mode")
		// 	.addToggle((toggle) =>
		// 		toggle
		// 			.setValue(this.plugin.settings.disableInSourceMode)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.disableInSourceMode = value;
		// 				await this.plugin.saveSettings();
		// 			})
		// 	);

		new Setting(containerEl)
			.setName("Disable while text is selected")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.disableWhenSelected)
					.onChange(async (value) => {
						this.plugin.settings.disableWhenSelected = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h2", { text: "Compact Aliased Links" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.aliasLinks.enable)
				.onChange(async (value) => {
					this.plugin.settings.aliasLinks.enable = value;
					await this.plugin.saveSettings();
				})
		);

		containerEl.createEl("h2", { text: "Compact External Links" });

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
				.setName("URL display format")
				.setDesc(description)
				.addDropdown((dropdown) =>
					dropdown
						.addOptions({
							hidden: "Hidden",
							domain: "Show domain",
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
