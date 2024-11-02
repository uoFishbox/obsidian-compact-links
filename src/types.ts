export interface CompactAliasLinksSettings {
	enable: boolean;
}
export interface CompactMdLinkSettings {
	enableTooltip: boolean;
	CompactMdLinkUrlSettings: CompactMdLinkUrlSettings;
	CompactMdLinkAltSettings: CompactMdLinkAltSettings;
}

interface CompactMdLinkUrlSettings {
	enable: boolean;
	displayMode: UrlDisplayMode;
}

interface CompactMdLinkAltSettings {
	enable: boolean;
	displayMode: AltDisplayMode;
	displayLength: number;
}

export type UrlDisplayMode = "hidden" | "domain" | "custom";
export type AltDisplayMode = "truncated" | "custom";

export interface CompactLinksSettings {
	disableInSourceMode: boolean;
	disableWhenSelected: boolean;
	compactAliasedLinks: CompactAliasLinksSettings;
	compactMarkdownLinks: CompactMdLinkSettings;
}

export interface ParsedUrl {
	isUrl: boolean;
	scheme: string;
	domain: string;
}

export interface AliasDecorationRange {
	startPos: number;
	pipePos: number;
}

export interface SyntaxNode {
	from: number;
	to: number;
	type: { name: string };
	nextSibling: SyntaxNode | null;
	parent: SyntaxNode | null;
}

export interface NodeInfo {
	type: { name: string };
	from: number;
	to: number;
	node: {
		nextSibling: SyntaxNode | null;
		parent: SyntaxNode | null;
	};
}
