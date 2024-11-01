import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewUpdate,
} from "@codemirror/view";
import { CompactMdLinkWidget } from "./CompactMdLinkWidget";
import { COMPACT_MD_LINK_ALT_DECORATION } from "./constants";
import { textTruncator } from "./textTruncator";
import { CompactLinksSettings, NodeInfo } from "./types";

interface AltRange {
	start: number;
	end: number;
}

interface DisplayProperties {
	displayText: string;
	className: string;
}

export class CompactMdLinkAltExt implements PluginValue {
	private readonly VIEWPORT_CHANGE_THRESHOLD = 100;
	private readonly ALT_TEXT_MAX_LENGTH = 30;
	private _decorations: DecorationSet;
	private lastViewport: { from: number; to: number }[] = [];
	private cachedDecorations: Map<string, Range<Decoration>> = new Map();

	constructor(
		private readonly settings: CompactLinksSettings,
		private readonly view: EditorView
	) {
		this._decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (this.shouldUpdateDecorations(update)) {
			this._decorations = this.buildDecorations(update.view);
		}
	}

	destroy(): void {
		this.cachedDecorations.clear();
	}

	public get decorations(): DecorationSet {
		return this._decorations;
	}

	private shouldUpdateDecorations(update: ViewUpdate): boolean {
		return (
			update.docChanged ||
			update.selectionSet ||
			this.isViewportSignificantlyChanged(update)
		);
	}

	private isViewportSignificantlyChanged(update: ViewUpdate): boolean {
		const currentViewport = update.view.visibleRanges;
		const hasSignificantChange = this.checkViewportChange([
			...currentViewport,
		]);

		if (hasSignificantChange) {
			this.lastViewport = [...currentViewport];
		}
		return hasSignificantChange;
	}

	private checkViewportChange(
		currentViewport: readonly { from: number; to: number }[]
	): boolean {
		return (
			this.lastViewport.length !== currentViewport.length ||
			this.lastViewport.some((range, i) =>
				this.isRangeSignificantlyDifferent(range, currentViewport[i])
			)
		);
	}

	private isRangeSignificantlyDifferent(
		oldRange: { from: number; to: number },
		newRange: { from: number; to: number }
	): boolean {
		return (
			Math.abs(oldRange.from - newRange.from) >
				this.VIEWPORT_CHANGE_THRESHOLD ||
			Math.abs(oldRange.to - newRange.to) > this.VIEWPORT_CHANGE_THRESHOLD
		);
	}

	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.isDecorationEnabled(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;
		this.processVisibleRanges(view, ranges, cursor);
		return Decoration.set(ranges, true);
	}

	private isDecorationEnabled(view: EditorView): boolean {
		const { CompactMdLinkAltSettings } = this.settings.compactMarkdownLinks;
		return (
			CompactMdLinkAltSettings.enable &&
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
			enter: (node) => {
				console.log(node.from, node.to, node.type.name);
				this.processNode(node, cursor, ranges, view);
			},
		});
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[],
		view: EditorView
	): void {
		if (!this.isMdLinkAltNode(node)) return;

		const altRange: AltRange = { start: node.from, end: node.to };
		if (this.isCursorInRange(cursor, altRange)) return;

		this.processAltDecoration(view, ranges, altRange);
	}

	private processAltDecoration(
		view: EditorView,
		ranges: Range<Decoration>[],
		altRange: AltRange
	): void {
		const cacheKey = `${altRange.start}-${altRange.end}`;
		const cachedDecoration = this.cachedDecorations.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const altText = view.state.doc.sliceString(
			altRange.start,
			altRange.end
		);
		this.createAndAddDecoration(ranges, altText, view, altRange, cacheKey);
	}

	private createAndAddDecoration(
		ranges: Range<Decoration>[],
		altText: string,
		view: EditorView,
		altRange: AltRange,
		cacheKey: string
	): void {
		const displayProps = this.getDisplayProperties(altText);
		const decoration = this.createDecoration(
			altText,
			displayProps,
			view,
			altRange
		);

		this.cachedDecorations.set(cacheKey, decoration);
		ranges.push(decoration);
	}

	private createDecoration(
		altText: string,
		displayProps: DisplayProperties,
		view: EditorView,
		altRange: AltRange
	): Range<Decoration> {
		return Decoration.replace({
			widget: new CompactMdLinkWidget(
				altText,
				displayProps.displayText,
				displayProps.className,
				view,
				altRange,
				this.settings.compactMarkdownLinks.enableTooltip
			),
		}).range(altRange.start, altRange.end);
	}

	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private isMdLinkAltNode(node: NodeInfo): boolean {
		const isImage =
			(node.type.name.includes("image_image-alt-text_link") ||
				node.type.name.includes("image_image-alt-text_link_strong")) &&
			!node.type.name.includes("formatting_formatting");
		return isImage;
	}

	private isCursorInRange(cursor: number, range: AltRange): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	private getDisplayProperties(altText: string): DisplayProperties {
		return {
			displayText: textTruncator(altText, this.ALT_TEXT_MAX_LENGTH),
			className: COMPACT_MD_LINK_ALT_DECORATION.truncated.className,
		};
	}
}
