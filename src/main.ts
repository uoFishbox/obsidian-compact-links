import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";

import { Compartment } from "@codemirror/state";
import { createAliasLinkExt } from "./createCompactAliasLinkExt";
import { createMdLinkAltExt } from "./createCompactMdLinkAltExt";
import { createMdLinkUrlExt } from "./createCompactMdLinkUrlExt";

import { CompactLinksSettings, UrlDisplayMode } from "./types";

const DEFAULT_SETTINGS: CompactLinksSettings = {
	disableInSourceMode: false,
	disableWhenSelected: false,
	compactAliasedLinks: { enable: true },
	compactMarkdownLinks: {
		enableTooltip: true,
		CompactMdLinkUrlSettings: {
			enable: true,
			displayMode: "domain",
		},
		CompactMdLinkAltSettings: {
			enable: true,
			displayMode: "truncated",
		},
	},
};

export default class CompactLinksPlugin extends Plugin {
	settings: CompactLinksSettings = DEFAULT_SETTINGS;
	private extensionCompartment = new Compartment();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CompactLinksSettingTab(this.app, this));

		// wrap the extension in a compartment
		const extension = this.extensionCompartment.of([
			createAliasLinkExt(this.settings),
			createMdLinkUrlExt(this.settings),
			createMdLinkAltExt(this.settings),
		]);
		this.registerEditorExtension(extension);

		// detect layout change
		this.registerEvent(
			this.app.workspace.on("layout-change", async () => {
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const isSourceMode = activeView.getState()
						.source as boolean;

					if (this.settings.disableInSourceMode) {
						const cm = activeView.editor.cm;
						if (isSourceMode) {
							// disable the extension
							cm.dispatch({
								effects: this.extensionCompartment.reconfigure(
									[]
								),
							});
						} else {
							// enable the extension
							cm.dispatch({
								effects: this.extensionCompartment.reconfigure([
									createAliasLinkExt(this.settings),
									createMdLinkUrlExt(this.settings),
									createMdLinkAltExt(this.settings),
								]),
							});
						}
					}
				}
			})
		);
	}

	onunload() {}

	updateExtension(): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const cm = activeView.editor.cm;
			cm.dispatch({
				effects: this.extensionCompartment.reconfigure([
					createAliasLinkExt(this.settings),
					createMdLinkUrlExt(this.settings),
					createMdLinkAltExt(this.settings),
				]),
			});
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
			.setName("Disable in source mode")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.disableInSourceMode)
					.onChange(async (value) => {
						this.plugin.settings.disableInSourceMode = value;
						await this.plugin.saveSettings();
						this.plugin.updateExtension();
					})
			);

		new Setting(containerEl)
			.setName("Disable while text is selected")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.disableWhenSelected)
					.onChange(async (value) => {
						this.plugin.settings.disableWhenSelected = value;
						await this.plugin.saveSettings();
						this.plugin.updateExtension();
					})
			);

		containerEl.createEl("h2", { text: "Compact Aliased Internal Links" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.compactAliasedLinks.enable)
				.onChange(async (value) => {
					this.plugin.settings.compactAliasedLinks.enable = value;
					await this.plugin.saveSettings();
					this.plugin.updateExtension();
				})
		);

		containerEl.createEl("h2", { text: "Compact Markdown Links" });

		new Setting(containerEl).setName("Show tooltip").addToggle((toggle) =>
			toggle
				.setValue(
					this.plugin.settings.compactMarkdownLinks.enableTooltip
				)
				.onChange(async (value) => {
					this.plugin.settings.compactMarkdownLinks.enableTooltip =
						value;
					await this.plugin.saveSettings();
					this.plugin.updateExtension();
				})
		);

		containerEl.createEl("p", { text: "Alt text shortening" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
			toggle
				.setValue(
					this.plugin.settings.compactMarkdownLinks
						.CompactMdLinkAltSettings.enable
				)
				.onChange(async (value) => {
					this.plugin.settings.compactMarkdownLinks.CompactMdLinkAltSettings.enable =
						value;
					await this.plugin.saveSettings();
					this.plugin.updateExtension();
					this.display();
				})
		);

		containerEl.createEl("p", { text: "URL shortening" });

		new Setting(containerEl).setName("Enable").addToggle((toggle) =>
			toggle
				.setValue(
					this.plugin.settings.compactMarkdownLinks
						.CompactMdLinkUrlSettings.enable
				)
				.onChange(async (value) => {
					this.plugin.settings.compactMarkdownLinks.CompactMdLinkUrlSettings.enable =
						value;
					await this.plugin.saveSettings();
					this.plugin.updateExtension();
					this.display();
				})
		);

		if (
			this.plugin.settings.compactMarkdownLinks.CompactMdLinkUrlSettings
				.enable
		) {
			let description = "";
			if (
				this.plugin.settings.compactMarkdownLinks
					.CompactMdLinkUrlSettings.displayMode === "domain"
			) {
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
						.setValue(
							this.plugin.settings.compactMarkdownLinks
								.CompactMdLinkUrlSettings.displayMode
						)
						.onChange(async (value) => {
							this.plugin.settings.compactMarkdownLinks.CompactMdLinkUrlSettings.displayMode =
								value as UrlDisplayMode;
							await this.plugin.saveSettings();
							this.plugin.updateExtension();
							this.display();
						})
				);
		}
	}
}
