import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewUpdate,
} from "@codemirror/view";
import { COMPACT_ALIAS_LINK_DECORATION } from "../constants";
import {
	AliasDecorationRange,
	CompactLinksSettings,
	NodeInfo,
	SyntaxNode,
} from "../types";
import { DecorationCache } from "../utils/DecorationCache";

export class CompactAliasPlugin implements PluginValue {
	private _decorations: DecorationSet;
	private decorationCache: DecorationCache;
	private _cachedAliasRanges: Map<number, AliasDecorationRange> = new Map();
	private visibilityManager: VisibilityManager;

	constructor(
		private readonly settings: CompactLinksSettings,
		view: EditorView
	) {
		this.decorationCache = new DecorationCache();
		this.visibilityManager = new VisibilityManager();
		this._decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.selectionSet) {
			this.decorationCache.clear();
			this._cachedAliasRanges.clear();
			this._decorations = this.buildDecorations(update.view);
		} else if (update.viewportChanged) {
			this._decorations = this.updateDecorationsForViewport(update.view);
		}
	}

	public get decorations(): DecorationSet {
		return this._decorations;
	}

	destroy(): void {
		this.decorationCache.clear();
		this._cachedAliasRanges.clear();
	}

	private buildDecorations(view: EditorView): DecorationSet {
		if (!this.isDecorationProcessingAllowed(view)) {
			return Decoration.set([]);
		}
		return this.createDecorationsForVisibleRanges(view);
	}

	private isDecorationProcessingAllowed(view: EditorView): boolean {
		const hasSelection = this.hasActiveSelection(view);
		return !(
			(hasSelection && this.settings.disableWhenSelected) ||
			!this.settings.compactAliasedLinks.enable
		);
	}

	private hasActiveSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private createDecorationsForVisibleRanges(view: EditorView): DecorationSet {
		const decorationBuilder = new DecorationBuilder(
			this.decorationCache,
			this._cachedAliasRanges
		);

		const cursor = view.state.selection.main.head;
		const ranges: Range<Decoration>[] = [];

		for (const visibleRange of view.visibleRanges) {
			this.processVisibleRange(
				view,
				visibleRange,
				cursor,
				ranges,
				decorationBuilder
			);
		}

		return Decoration.set(ranges, false);
	}

	private processVisibleRange(
		view: EditorView,
		visibleRange: { from: number; to: number },
		cursor: number,
		ranges: Range<Decoration>[],
		decorationBuilder: DecorationBuilder
	): void {
		syntaxTree(view.state).iterate({
			from: visibleRange.from,
			to: visibleRange.to,
			enter: (node) =>
				decorationBuilder.processNode(node as NodeInfo, cursor, ranges),
		});
	}

	private updateDecorationsForViewport(view: EditorView): DecorationSet {
		if (!this.isDecorationProcessingAllowed(view)) {
			return Decoration.set([]);
		}

		const visibilityTracker = this.visibilityManager.trackVisibleRanges(
			view.visibleRanges
		);
		const ranges = this.createDecorationsForVisibleRanges(view);
		this.cleanupInvisibleCache(visibilityTracker);

		return ranges;
	}

	private cleanupInvisibleCache(visibilityTracker: Set<number>): void {
		for (const [pos] of this._cachedAliasRanges) {
			if (!visibilityTracker.has(pos)) {
				this._cachedAliasRanges.delete(pos);
				this.decorationCache.deleteByPosition(pos);
			}
		}
	}
}

class DecorationBuilder {
	constructor(
		private decorationCache: DecorationCache,
		private cachedAliasRanges: Map<number, AliasDecorationRange>
	) {}

	processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[]
	): void {
		if (!this.isLinkStartNode(node)) return;

		const aliasRange = this.getOrCreateAliasRange(node);
		if (aliasRange && !this.isCursorInRange(cursor, aliasRange)) {
			this.createDecoration(ranges, aliasRange);
		}
	}

	private isLinkStartNode(node: NodeInfo): boolean {
		return node.type.name.includes("formatting-link-start");
	}

	private getOrCreateAliasRange(node: NodeInfo): AliasDecorationRange | null {
		const cachedAliasRange = this.cachedAliasRanges.get(node.from);
		if (cachedAliasRange) {
			return cachedAliasRange;
		}

		const aliasRange = this.findAliasRange(node);
		if (aliasRange) {
			this.cachedAliasRanges.set(node.from, aliasRange);
		}
		return aliasRange;
	}

	private findAliasRange(node: NodeInfo): AliasDecorationRange | null {
		const currentNode = node.node.nextSibling;
		if (!currentNode) return null;

		const startPos = currentNode.from;
		const pipeNode = this.findPipeNode(currentNode);

		return pipeNode ? { startPos, pipePos: pipeNode.from } : null;
	}

	private findPipeNode(node: SyntaxNode | null): SyntaxNode | null {
		if (!node) return null;
		if (node.type.name.includes("formatting-link-end")) return null;
		if (node.type.name.includes("link-alias-pipe")) return node;
		return this.findPipeNode(node.nextSibling);
	}

	private isCursorInRange(
		cursor: number,
		range: AliasDecorationRange
	): boolean {
		return cursor >= range.startPos && cursor <= range.pipePos;
	}

	private createDecoration(
		ranges: Range<Decoration>[],
		range: AliasDecorationRange
	): void {
		if (range.startPos >= range.pipePos) return;

		const cacheKey = this.decorationCache.generateKey(
			range.startPos,
			range.pipePos
		);
		const cachedDecoration = this.decorationCache.get(cacheKey);

		if (cachedDecoration) {
			ranges.push(cachedDecoration);
			return;
		}

		const decoration = Decoration.mark(COMPACT_ALIAS_LINK_DECORATION).range(
			range.startPos,
			range.pipePos
		);

		this.decorationCache.set(cacheKey, decoration);
		ranges.push(decoration);
	}
}

class VisibilityManager {
	trackVisibleRanges(
		visibleRanges: readonly { from: number; to: number }[]
	): Set<number> {
		const visiblePositions = new Set<number>();
		for (const { from, to } of visibleRanges) {
			for (let pos = from; pos <= to; pos++) {
				visiblePositions.add(pos);
			}
		}
		return visiblePositions;
	}
}
