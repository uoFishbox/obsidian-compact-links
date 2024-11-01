import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewUpdate,
} from "@codemirror/view";
import { CompactMdLinkWidget } from "./CompactMdLinkWidget";
import { COMPACT_MD_LINK_DECORATION } from "./constants";
import { CompactLinksSettings, NodeInfo, ParsedUrl } from "./types";
import { UrlParser } from "./urlParser";

export class CompactMdLinkUrlExtension {
	private decorations: DecorationSet = Decoration.none;
	private lastViewport: { from: number; to: number }[] = [];
	private cachedDecorations: Map<string, Range<Decoration>> = new Map();

	constructor(
		private readonly settings: CompactLinksSettings,
		private readonly view: EditorView
	) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (this.shouldRebuildDecorations(update)) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	get decorationSet(): DecorationSet {
		return this.decorations;
	}

	/**
	 * determine if decorations should be rebuilt
	 */
	private shouldRebuildDecorations(update: ViewUpdate): boolean {
		const requiresDocChange =
			update.docChanged ||
			update.selectionSet ||
			this.isViewportSignificantlyChanged(update);

		const decorationsEnabled =
			this.settings.compactMarkdownLinks.CompactMdLinkUrlSettings.enable;

		const shouldDisable =
			this.hasSelection(update.view) && this.settings.disableWhenSelected;

		return requiresDocChange && decorationsEnabled && !shouldDisable;
	}

	/**
	 * check if the viewport has significantly changed
	 */
	private isViewportSignificantlyChanged(update: ViewUpdate): boolean {
		const currentViewport = update.view.visibleRanges;

		const hasChanged =
			this.lastViewport.length !== currentViewport.length ||
			!this.lastViewport.every(
				(range, i) =>
					Math.abs(range.from - currentViewport[i].from) <= 100 &&
					Math.abs(range.to - currentViewport[i].to) <= 100
			);

		if (hasChanged) {
			this.lastViewport = currentViewport.map((range) => ({ ...range }));
		}

		return hasChanged;
	}

	/**
	 * build decorations
	 */
	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.shouldBuildDecorations(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;

		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter: (node) =>
					this.handleSyntaxNode(node, cursor, ranges, view),
			});
		}

		return Decoration.set(ranges, true); // パフォーマンス向上のために 'true'
	}

	/**
	 * determine if decorations should be built
	 */
	private shouldBuildDecorations(view: EditorView): boolean {
		const urlSettings =
			this.settings.compactMarkdownLinks.CompactMdLinkUrlSettings;
		const hasSelection = this.hasSelection(view);

		return (
			urlSettings.enable &&
			!(hasSelection && this.settings.disableWhenSelected)
		);
	}

	/**
	 * process syntax node
	 */
	private handleSyntaxNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[],
		view: EditorView
	): void {
		if (!this.isUrlNode(node)) return;

		const urlRange = { start: node.from, end: node.to };

		if (this.isCursorInside(urlRange, cursor)) return;

		const cacheKey = this.generateCacheKey(urlRange);
		const cachedDecoration = this.cachedDecorations.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const url = view.state.doc.sliceString(urlRange.start, urlRange.end);
		const parsedUrl = UrlParser.parse(url);

		if (parsedUrl.isUrl) {
			const decoration = this.createUrlDecoration(
				url,
				parsedUrl,
				view,
				urlRange
			);
			this.cachedDecorations.set(cacheKey, decoration);
			ranges.push(decoration);
		}
	}

	/**
	 * create URL decoration
	 */
	private createUrlDecoration(
		url: string,
		parsedUrl: ParsedUrl,
		view: EditorView,
		urlRange: { start: number; end: number }
	): Range<Decoration> {
		const { displayText, className } =
			this.determineDisplayProperties(parsedUrl);

		return Decoration.replace({
			widget: new CompactMdLinkWidget(
				url,
				displayText,
				className,
				view,
				urlRange,
				this.settings.compactMarkdownLinks.enableTooltip
			),
		}).range(urlRange.start, urlRange.end);
	}

	/**
	 * determine display properties
	 */
	private determineDisplayProperties(parsedUrl: ParsedUrl): {
		displayText: string;
		className: string;
	} {
		const displayMode =
			this.settings.compactMarkdownLinks.CompactMdLinkUrlSettings
				.displayMode;

		return displayMode === "domain"
			? this.getDomainDisplayProperties(parsedUrl)
			: {
					displayText: COMPACT_MD_LINK_DECORATION.hidden.defaultText,
					className: COMPACT_MD_LINK_DECORATION.hidden.className,
					// eslint-disable-next-line no-mixed-spaces-and-tabs
			  };
	}

	/**
	 * get domain display properties
	 */
	private getDomainDisplayProperties(parsedUrl: ParsedUrl): {
		displayText: string;
		className: string;
	} {
		const displayText = parsedUrl.scheme
			? `${parsedUrl.scheme}://${parsedUrl.domain}`
			: parsedUrl.domain;

		const className = parsedUrl.scheme
			? `${COMPACT_MD_LINK_DECORATION.domain.className} ${COMPACT_MD_LINK_DECORATION.domain.schemeClassName}`
			: COMPACT_MD_LINK_DECORATION.domain.className;

		return { displayText, className };
	}

	/**
	 * check if there is a selection
	 */
	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	/**
	 * whether the node is a URL node
	 */
	private isUrlNode(node: NodeInfo): boolean {
		const typeName = node.type.name.toLowerCase();
		return (
			typeName.includes("string_url") ||
			typeName.includes("string_strong_url")
		);
	}

	/**
	 * whether the cursor is inside the range
	 */
	private isCursorInside(
		range: { start: number; end: number },
		cursor: number
	): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	/**
	 * generate cache key
	 */
	private generateCacheKey(range: { start: number; end: number }): string {
		return `${range.start}-${range.end}`;
	}
}
