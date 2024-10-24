import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

// Remember to rename these classes and interfaces!

interface AliasLinkShortenerSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AliasLinkShortenerSettings = {
	mySetting: "default",
};

export default class AliasLinkShortenerPlugin extends Plugin {
	settings!: AliasLinkShortenerSettings;

	async onload() {
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AliasLinkShortenerSettingTab(this.app, this));
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
	}
}
class AliasLinkShortenerSettingTab extends PluginSettingTab {
	plugin: AliasLinkShortenerPlugin;

	constructor(app: App, plugin: AliasLinkShortenerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
