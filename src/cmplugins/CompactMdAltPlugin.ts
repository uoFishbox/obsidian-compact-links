import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewUpdate,
} from "@codemirror/view";
import { CompactMdLinkWidget } from "../components/CompactMdLinkWidget";
import { COMPACT_MD_LINK_ALT_DECORATION } from "../constants";
import { CompactLinksSettings } from "../types";
import { DecorationCache } from "../utils/DecorationCache";
import { textTruncator } from "../utils/textTruncator";

export interface AltRange {
	start: number;
	end: number;
}

interface DisplayProperties {
	displayText: string;
	className: string;
}

export class CompactMdAltPlugin implements PluginValue {
	private readonly ALT_TEXT_PATTERN = /(?<=!\[)[^[\]]+(?=\])/g;
	private _decorations: DecorationSet;
	private decorationCache: DecorationCache;
	private cachedDecorations: Map<string, Range<Decoration>> = new Map();
	private _cachedAltRanges: Map<number, AltRange> = new Map();

	constructor(
		private readonly settings: CompactLinksSettings,
		private readonly view: EditorView
	) {
		this.decorationCache = new DecorationCache();
		this._decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.selectionSet) {
			this.decorationCache.clear();
			this._cachedAltRanges.clear();
			this._decorations = this.buildDecorations(update.view);
		} else if (update.viewportChanged) {
			this._decorations = this.updateDecorationsForViewport(update.view);
		}
	}

	private updateDecorationsForViewport(view: EditorView): DecorationSet {
		if (!this.isDecorationEnabled(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;
		const visibleRanges = new Set<number>();

		// process visible ranges
		view.visibleRanges.forEach(({ from, to }) => {
			this.processVisibleRange(view, ranges, cursor, from, to);
			for (let pos = from; pos <= to; pos++) {
				visibleRanges.add(pos);
			}
		});

		// delete cached alt ranges that are not visible
		for (const [pos] of this._cachedAltRanges) {
			if (!visibleRanges.has(pos)) {
				this._cachedAltRanges.delete(pos);
				this.decorationCache.deleteByPosition(pos);
			}
		}

		return Decoration.set(ranges, true);
	}

	get decorations(): DecorationSet {
		return this._decorations;
	}

	destroy(): void {
		this.decorationCache.clear();
		this._cachedAltRanges.clear();
	}

	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.isDecorationEnabled(view)) {
			return Decoration.none;
		}

		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;

		this.cachedDecorations.clear();

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
		const text = view.state.doc.sliceString(from, to);
		const matches = text.matchAll(this.ALT_TEXT_PATTERN);

		for (const match of matches) {
			if (!match.index) continue;
			const start = from + match.index;
			const end = start + match[0].length;
			const altRange: AltRange = { start, end };

			if (this.isCursorInRange(cursor, altRange)) continue;
			this.processAltDecoration(view, ranges, altRange);
		}
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

	private isCursorInRange(cursor: number, range: AltRange): boolean {
		return cursor >= range.start && cursor <= range.end;
	}

	private getDisplayProperties(altText: string): DisplayProperties {
		return {
			displayText: textTruncator(
				altText,
				this.settings.compactMarkdownLinks.CompactMdLinkAltSettings
					.displayLength
			),
			className: COMPACT_MD_LINK_ALT_DECORATION.truncated.className,
		};
	}
}
