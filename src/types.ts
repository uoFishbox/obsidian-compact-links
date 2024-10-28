export interface CompactAliasLinksSettings {
	enable: boolean;
	disableWhenSelected: boolean;
}
export interface CompactUrlSettings {
	enable: boolean;
	displayMode: DisplayMode;
}

export type DisplayMode = "hide" | "domain";

export interface CompactLinksSettings {
	disableInSourceMode: boolean;
	aliasLinks: CompactAliasLinksSettings;
	urls: CompactUrlSettings;
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
