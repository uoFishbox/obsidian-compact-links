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

export class CompactUrlPlugin {
	private _decorations: DecorationSet;

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
		if (this.shouldUpdateDecorations(update)) {
			this._decorations = this.buildDecorations(update.view);
		}
	}

	private shouldUpdateDecorations(update: ViewUpdate): boolean {
		return (
			update.docChanged || update.selectionSet || update.viewportChanged
		);
	}

	private buildDecorations(view: EditorView): DecorationSet {
		const hasSelection = this.hasSelection(this.view);
		if (
			!this.settings.compactMarkdownLinks.enable ||
			(hasSelection && this.settings.disableWhenSelected)
		) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;

		this.processVisibleRanges(view, ranges, cursor);
		return Decoration.set(ranges);
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

		const url = view.state.doc.sliceString(urlRange.start, urlRange.end);
		const parsedUrl = UrlParser.parse(url);
		if (parsedUrl.isUrl) {
			this.addUrlDecoration(ranges, url, parsedUrl, view, urlRange);
		}
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
		urlRange: { start: number; end: number }
	): void {
		const { displayText, className } = this.getDisplayProperties(parsedUrl);
		ranges.push(
			Decoration.replace({
				widget: new CompactMdLinkWidget(
					url,
					displayText,
					className,
					view,
					urlRange
				),
			}).range(urlRange.start, urlRange.end)
		);
	}

	private getDisplayProperties(parsedUrl: ParsedUrl): {
		displayText: string;
		className: string;
	} {
		if (this.settings.compactMarkdownLinks.displayMode === "domain") {
			return this.getDomainDisplayProperties(parsedUrl);
		}
		return {
			displayText: COMPACT_MD_LINK_DECORATION.hidden.defaultText,
			className: COMPACT_MD_LINK_DECORATION.hidden.className,
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
