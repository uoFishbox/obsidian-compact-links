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

export class CompactMdLinkExt {
	private _decorations: DecorationSet;
	private _lastViewport: { from: number; to: number }[] = [];
	private _cachedDecorations: Map<string, Range<Decoration>> = new Map();

	constructor(
		private readonly settings: CompactLinksSettings,
		private readonly view: EditorView
	) {
		this._decorations = this.buildDecorations(view);
	}

	get decorations(): DecorationSet {
		return this._decorations;
	}

	update(update: ViewUpdate): void {
		if (
			update.docChanged ||
			update.selectionSet ||
			this.isViewportSignificantlyChanged(update)
		) {
			this._decorations = this.buildDecorations(update.view);
		}
	}

	private isViewportSignificantlyChanged(update: ViewUpdate): boolean {
		const currentViewport = update.view.visibleRanges;
		const hasChanged =
			this._lastViewport.length !== currentViewport.length ||
			this._lastViewport.some(
				(range, i) =>
					Math.abs(range.from - currentViewport[i].from) > 100 ||
					Math.abs(range.to - currentViewport[i].to) > 100
			);

		if (hasChanged) {
			this._lastViewport = [...currentViewport];
			return true;
		}
		return false;
	}

	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.shouldBuildDecorations(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;
		this.processVisibleRanges(view, ranges, cursor);
		return Decoration.set(ranges, true); // 'true' for better performance
	}

	private shouldBuildDecorations(view: EditorView): boolean {
		return (
			this.settings.compactMarkdownLinks.enable &&
			!(this.hasSelection(view) && this.settings.disableWhenSelected)
		);
	}

	private processVisibleRanges(
		view: EditorView,
		ranges: Range<Decoration>[],
		cursor: number
	): void {
		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter: (node) => this.processNode(node, cursor, ranges, view),
			});
		}
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[],
		view: EditorView
	): void {
		if (!this.isUrlNode(node)) return;

		const urlRange = { start: node.from, end: node.to };
		if (this.isCursorInRange(cursor, urlRange)) return;

		// generate cache key
		const cacheKey = `${urlRange.start}-${urlRange.end}`;
		const cachedDecoration = this._cachedDecorations.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const url = view.state.doc.sliceString(urlRange.start, urlRange.end);
		const parsedUrl = UrlParser.parse(url);
		if (parsedUrl.isUrl) {
			this.addUrlDecoration(
				ranges,
				url,
				parsedUrl,
				view,
				urlRange,
				cacheKey
			);
		}
	}

	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private readonly isUrlNode = (node: NodeInfo): boolean => {
		return (
			node.type.name.includes("string_url") ||
			node.type.name.includes("string_strong_url")
		);
	};

	private isCursorInRange(
		cursor: number,
		range: { start: number; end: number }
	): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	private addUrlDecoration(
		ranges: Range<Decoration>[],
		url: string,
		parsedUrl: ParsedUrl,
		view: EditorView,
		urlRange: { start: number; end: number },
		cacheKey: string
	): void {
		const { displayText, className } = this.getDisplayProperties(parsedUrl);
		const decoration = Decoration.replace({
			widget: new CompactMdLinkWidget(
				url,
				displayText,
				className,
				view,
				urlRange,
				this.settings.compactMarkdownLinks.enableTooltip
			),
		}).range(urlRange.start, urlRange.end);

		// save to cache
		this._cachedDecorations.set(cacheKey, decoration);
		ranges.push(decoration);
	}

	private getDisplayProperties(parsedUrl: ParsedUrl): {
		displayText: string;
		className: string;
	} {
		return this.settings.compactMarkdownLinks.displayMode === "domain"
			? this.getDomainDisplayProperties(parsedUrl)
			: {
					displayText: COMPACT_MD_LINK_DECORATION.hidden.defaultText,
					className: COMPACT_MD_LINK_DECORATION.hidden.className,
					// eslint-disable-next-line no-mixed-spaces-and-tabs
			  };
	}

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
}
