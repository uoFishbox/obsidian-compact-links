export type UrlDisplayMode = "hidden" | "domain";

export interface CompactLinksSettings {
	disableInSourceMode: boolean;
	disableWhenSelected: boolean;
	compactAliasedLinks: { enable: boolean };
	compactMarkdownLinks: {
		enableTooltip: boolean;
		CompactMdLinkUrlSettings: {
			enable: boolean;
			displayMode: UrlDisplayMode;
		};
		CompactMdLinkAltSettings: {
			enable: boolean;
			displayLength: number;
		};
	};
}

export interface ParsedUrl {
	isUrl: boolean;
	scheme: string;
	domain: string;
}

export interface TextRange {
	from: number;
	to: number;
}
