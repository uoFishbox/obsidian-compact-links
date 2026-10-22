import { App, PluginSettingTab, Setting } from "obsidian";
import type CompactLinksPlugin from "./main";

export class CompactLinksSettingTab extends PluginSettingTab {
	constructor(app: App, readonly plugin: CompactLinksPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		const markdown = settings.compactMarkdownLinks;
		const alt = markdown.CompactMdLinkAltSettings;
		const url = markdown.CompactMdLinkUrlSettings;
		containerEl.empty();

		containerEl.createEl("h2", { text: "General" });
		this.addToggle("Disable in source mode", settings.disableInSourceMode, (value) => {
			settings.disableInSourceMode = value;
		});
		this.addToggle("Disable while text is selected", settings.disableWhenSelected, (value) => {
			settings.disableWhenSelected = value;
		});

		containerEl.createEl("h2", { text: "Compact Aliased Internal Links" });
		this.addToggle("Enable", settings.compactAliasedLinks.enable, (value) => {
			settings.compactAliasedLinks.enable = value;
		});

		containerEl.createEl("h2", { text: "Compact Markdown Links" });
		this.addToggle("Display full text in tooltip on hover", markdown.enableTooltip, (value) => {
			markdown.enableTooltip = value;
		});

		containerEl.createEl("p", { text: "Alt text shortening" });
		this.addToggle("Enable", alt.enable, (value) => { alt.enable = value; }, true);
		if (alt.enable) {
			new Setting(containerEl)
				.setName("Display length")
				.setDesc("Number of characters to display. CJK characters are treated as two characters.")
				.addText((text) => text
					.setPlaceholder("20")
					.setValue(String(alt.displayLength))
					.onChange(async (value) => {
						const length = Number(value);
						if (!Number.isSafeInteger(length) || length < 1) return;
						alt.displayLength = length;
						await this.plugin.saveSettings();
					}));
		}

		containerEl.createEl("p", { text: "URL shortening" });
		this.addToggle("Enable", url.enable, (value) => { url.enable = value; }, true);
		if (url.enable) {
			new Setting(containerEl)
				.setName("URL display format")
				.setDesc(url.displayMode === "domain"
					? "Display format: [Title](domain)"
					: "Display format: [Title](...)")
				.addDropdown((dropdown) => dropdown
					.addOptions({ hidden: "Hidden", domain: "Show domain" })
					.setValue(url.displayMode)
					.onChange(async (value) => {
						if (value !== "domain" && value !== "hidden") return;
						url.displayMode = value;
						await this.plugin.saveSettings();
						this.display();
					}));
		}
	}

	private addToggle(
		name: string,
		value: boolean,
		update: (value: boolean) => void,
		redisplay = false
	): void {
		new Setting(this.containerEl).setName(name).addToggle((toggle) => toggle
			.setValue(value)
			.onChange(async (enabled) => {
				update(enabled);
				await this.plugin.saveSettings();
				if (redisplay) this.display();
			}));
	}
}
