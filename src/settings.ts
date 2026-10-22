import { CompactLinksSettings } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: {};
}

function booleanOr(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

// Build fresh nested objects and accept only the settings supported by the UI.
export function loadSettings(data: unknown = null): CompactLinksSettings {
	const general = asRecord(data);
	const aliases = asRecord(general.compactAliasedLinks);
	const markdown = asRecord(general.compactMarkdownLinks);
	const url = asRecord(markdown.CompactMdLinkUrlSettings);
	const alt = asRecord(markdown.CompactMdLinkAltSettings);
	const length = alt.displayLength;

	return {
		disableInSourceMode: booleanOr(general.disableInSourceMode, false),
		disableWhenSelected: booleanOr(general.disableWhenSelected, false),
		compactAliasedLinks: { enable: booleanOr(aliases.enable, true) },
		compactMarkdownLinks: {
			enableTooltip: booleanOr(markdown.enableTooltip, true),
			CompactMdLinkUrlSettings: {
				enable: booleanOr(url.enable, true),
				displayMode: url.displayMode === "hidden" ? "hidden" : "domain",
			},
			CompactMdLinkAltSettings: {
				enable: booleanOr(alt.enable, true),
				displayLength: typeof length === "number" && Number.isSafeInteger(length) && length > 0
					? length
					: 20,
			},
		},
	};
}
