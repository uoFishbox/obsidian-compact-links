import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewUpdate,
} from "@codemirror/view";
import { CompactMdLinkWidget } from "./CompactMdLinkWidget";
import { COMPACT_MD_LINK_ALT_DECORATION } from "./constants";
import { textTruncator } from "./textTruncator";
import { CompactLinksSettings, NodeInfo } from "./types";

export class CompactMdLinkAltExt {
	/*
    This class is responsible for creating decorations for the alt text of markdown links.
     */

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
				enter: (node) => {
					// console.log(node.from, node.to, node.type.name); <- for node debugging
					this.processNode(node, cursor, ranges, view);
				},
			});
		}
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[],
		view: EditorView
	): void {
		if (!this.isMdLinkAltNode(node)) return;

		const altRange = { start: node.from, end: node.to };
		if (this.isCursorInRange(cursor, altRange)) return;

		// generate cache key
		const cacheKey = `${altRange.start}-${altRange.end}`;
		const cachedDecoration = this._cachedDecorations.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const altText = view.state.doc.sliceString(
			altRange.start,
			altRange.end
		);
		// const parsedUrl = UrlParser.parse(altText);

		this.addAltDecoration(ranges, altText, view, altRange, cacheKey);
	}

	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private readonly isMdLinkAltNode = (node: NodeInfo): boolean => {
		return (
			// Conditional expression for identifying alt text
			(node.type.name.includes("image_image-alt-text_link") ||
				node.type.name.includes("image_image-alt-text_link_strong")) &&
			!node.type.name.includes("formatting_formatting")
		);
	};

	private isCursorInRange(
		cursor: number,
		range: { start: number; end: number }
	): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	private addAltDecoration(
		ranges: Range<Decoration>[],
		altText: string,
		view: EditorView,
		altRange: { start: number; end: number },
		cacheKey: string
	): void {
		const { displayText, className } = this.getDisplayProperties(altText);
		const decoration = Decoration.replace({
			widget: new CompactMdLinkWidget(
				altText,
				displayText,
				className,
				view,
				altRange,
				this.settings.compactMarkdownLinks.enableTooltip
			),
		}).range(altRange.start, altRange.end);

		// save to cache
		this._cachedDecorations.set(cacheKey, decoration);
		ranges.push(decoration);
	}

	private getDisplayProperties(altText: string): {
		displayText: string;
		className: string;
	} {
		return {
			displayText: textTruncator(altText, 50),
			className: COMPACT_MD_LINK_ALT_DECORATION.truncated.className,
			// eslint-disable-next-line no-mixed-spaces-and-tabs
		};
	}

	// private getDomainDisplayProperties(parsedAlt: ParsedUrl): {
	// 	displayText: string;
	// 	className: string;
	// } {
	// 	const displayText = parsedAlt.scheme
	// 		? `${parsedAlt.scheme}://${parsedAlt.domain}`
	// 		: parsedAlt.domain;
	// 	const className = parsedAlt.scheme
	// 		? `${COMPACT_MD_LINK_DECORATION.domain.className} ${COMPACT_MD_LINK_DECORATION.domain.schemeClassName}`
	// 		: COMPACT_MD_LINK_DECORATION.domain.className;
	// 	return { displayText, className };
	// }
}
