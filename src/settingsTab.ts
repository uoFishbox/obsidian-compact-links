import { App, PluginSettingTab } from "obsidian";
import type { SettingDefinitionItem, SettingDefinitionRender } from "obsidian";
import type CompactLinksPlugin from "./main";

export class CompactLinksSettingTab extends PluginSettingTab {
	constructor(app: App, readonly plugin: CompactLinksPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const settings = this.plugin.settings;
		const markdown = settings.compactMarkdownLinks;
		const alt = markdown.CompactMdLinkAltSettings;
		const url = markdown.CompactMdLinkUrlSettings;

		return [
			this.toggle("Disable in source mode", settings.disableInSourceMode, (value) => {
				settings.disableInSourceMode = value;
			}),
			this.toggle("Disable while text is selected", settings.disableWhenSelected, (value) => {
				settings.disableWhenSelected = value;
			}),
			{
				type: "group",
				heading: "Compact aliased internal links",
				items: [
					this.toggle("Enable", settings.compactAliasedLinks.enable, (value) => {
						settings.compactAliasedLinks.enable = value;
					}),
				],
			},
			{
				type: "group",
				heading: "Compact Markdown links",
				items: [
					this.toggle("Display full text in tooltip on hover", markdown.enableTooltip, (value) => {
						markdown.enableTooltip = value;
					}),
					{
						...this.toggle("Shorten image alt text", alt.enable, (value) => { alt.enable = value; }),
						desc: "Applies only to Markdown image embeds in the form ![alt](link).",
					},
					{
						name: "Display length",
						desc: "Number of characters to display. CJK characters are treated as two characters.",
						visible: () => alt.enable,
						render: (setting) => {
							setting.addText((text) => text
								.setPlaceholder("20")
								.setValue(String(alt.displayLength))
								.onChange(async (value) => {
									const length = Number(value);
									if (!Number.isSafeInteger(length) || length < 1) return;
									alt.displayLength = length;
									await this.plugin.saveSettings();
								}));
						},
					},
					this.toggle("URL shortening", url.enable, (value) => { url.enable = value; }),
					{
						name: "URL display format",
						desc: url.displayMode === "domain"
							? "Display format: [Title](domain)"
							: "Display format: [Title](...)",
						visible: () => url.enable,
						render: (setting) => {
							setting.addDropdown((dropdown) => dropdown
								.addOptions({ hidden: "Hidden", domain: "Show domain" })
								.setValue(url.displayMode)
								.onChange(async (value) => {
									if (value !== "domain" && value !== "hidden") return;
									url.displayMode = value;
									await this.plugin.saveSettings();
									this.update();
								}));
						},
					},
				],
			},
		];
	}

	private toggle(name: string, value: boolean, setValue: (value: boolean) => void): SettingDefinitionRender {
		return {
			name,
			render: (setting) => {
				setting.addToggle((toggle) => toggle
					.setValue(value)
					.onChange(async (enabled) => {
						setValue(enabled);
						await this.plugin.saveSettings();
						this.refreshDomState();
					}));
			},
		};
	}
}
