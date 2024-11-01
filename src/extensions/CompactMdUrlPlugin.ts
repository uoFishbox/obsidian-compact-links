import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewUpdate,
} from "@codemirror/view";
import { CompactMdLinkWidget } from "../components/CompactMdLinkWidget";
import { COMPACT_MD_LINK_DECORATION } from "../constants";
import { CompactLinksSettings, NodeInfo, ParsedUrl } from "../types";
import { DecorationCache } from "../utils/DecorationCache";
import { UrlParser } from "../utils/UrlParser";

export interface UrlRange {
	start: number;
	end: number;
}

export interface DisplayProperties {
	displayText: string;
	className: string;
}

export class CompactMdUrlPlugin implements PluginValue {
	private _decorations: DecorationSet;
	private decorationCache: DecorationCache;

	constructor(
		private readonly settings: CompactLinksSettings,
		private readonly view: EditorView
	) {
		this.decorationCache = new DecorationCache();
		this._decorations = this.buildDecorations(view);
	}

	getDecorations(): DecorationSet {
		return this._decorations;
	}

	update(update: ViewUpdate): void {
		if (this.shouldInvalidateCache(update)) {
			this.decorationCache.clear();
			this._decorations = this.buildDecorations(update.view);
		}
	}

	destroy(): void {
		this.decorationCache.clear();
	}

	get decorations(): DecorationSet {
		return this._decorations;
	}

	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.isDecorationEnabled(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;

		this.decorationCache.clear();

		this.processVisibleRanges(view, ranges, cursor);
		return Decoration.set(ranges, true);
	}

	private isDecorationEnabled(view: EditorView): boolean {
		const { CompactMdLinkUrlSettings } = this.settings.compactMarkdownLinks;
		return (
			CompactMdLinkUrlSettings.enable &&
			!(this.hasSelection(view) && this.settings.disableWhenSelected)
		);
	}

	private processVisibleRanges(
		view: EditorView,
		ranges: Range<Decoration>[],
		cursor: number
	): void {
		view.visibleRanges.forEach(({ from, to }) => {
			this.processVisibleRange(view, ranges, cursor, from, to);
		});
	}

	private processVisibleRange(
		view: EditorView,
		ranges: Range<Decoration>[],
		cursor: number,
		from: number,
		to: number
	): void {
		syntaxTree(view.state).iterate({
			from,
			to,
			enter: (node) => this.processNode(node, cursor, ranges, view),
		});
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[],
		view: EditorView
	): void {
		if (!this.isUrlNode(node)) return;

		const urlRange: UrlRange = { start: node.from, end: node.to };
		if (this.isCursorInRange(cursor, urlRange)) return;
		this.processUrlDecoration(view, ranges, urlRange);
	}

	private processUrlDecoration(
		view: EditorView,
		ranges: Range<Decoration>[],
		urlRange: UrlRange
	): void {
		const cacheKey = this.decorationCache.generateKey(
			urlRange.start,
			urlRange.end
		);
		const cachedDecoration = this.decorationCache.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const url = view.state.doc.sliceString(urlRange.start, urlRange.end);
		const parsedUrl = UrlParser.parse(url);

		if (parsedUrl.isUrl) {
			this.createAndAddDecoration(
				ranges,
				url,
				parsedUrl,
				view,
				urlRange,
				cacheKey
			);
		}
	}

	private createAndAddDecoration(
		ranges: Range<Decoration>[],
		url: string,
		parsedUrl: ParsedUrl,
		view: EditorView,
		urlRange: UrlRange,
		cacheKey: string
	): void {
		const displayProps = this.getDisplayProperties(parsedUrl);
		const decoration = this.createDecoration(
			url,
			displayProps,
			view,
			urlRange
		);

		this.decorationCache.set(cacheKey, decoration);
		ranges.push(decoration);
	}

	private createDecoration(
		url: string,
		displayProps: DisplayProperties,
		view: EditorView,
		urlRange: UrlRange
	): Range<Decoration> {
		return Decoration.replace({
			widget: new CompactMdLinkWidget(
				url,
				displayProps.displayText,
				displayProps.className,
				view,
				urlRange,
				this.settings.compactMarkdownLinks.enableTooltip
			),
		}).range(urlRange.start, urlRange.end);
	}

	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private isUrlNode(node: NodeInfo): boolean {
		return (
			node.type.name.includes("string_url") ||
			node.type.name.includes("string_strong_url")
		);
	}

	private isCursorInRange(cursor: number, range: UrlRange): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	private getDisplayProperties(parsedUrl: ParsedUrl): DisplayProperties {
		return this.settings.compactMarkdownLinks.CompactMdLinkUrlSettings
			.displayMode === "domain"
			? this.getDomainDisplayProperties(parsedUrl)
			: this.getHiddenDisplayProperties();
	}

	private getDomainDisplayProperties(
		parsedUrl: ParsedUrl
	): DisplayProperties {
		const displayText = parsedUrl.scheme
			? `${parsedUrl.scheme}://${parsedUrl.domain}`
			: parsedUrl.domain;
		const className = parsedUrl.scheme
			? `${COMPACT_MD_LINK_DECORATION.domain.className} ${COMPACT_MD_LINK_DECORATION.domain.schemeClassName}`
			: COMPACT_MD_LINK_DECORATION.domain.className;
		return { displayText, className };
	}

	private getHiddenDisplayProperties(): DisplayProperties {
		return {
			displayText: COMPACT_MD_LINK_DECORATION.hidden.defaultText,
			className: COMPACT_MD_LINK_DECORATION.hidden.className,
		};
	}

	private shouldInvalidateCache(update: ViewUpdate): boolean {
		return (
			update.docChanged || update.selectionSet || update.viewportChanged
		);
	}
}
