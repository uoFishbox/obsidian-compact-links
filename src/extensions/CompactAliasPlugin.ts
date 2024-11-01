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

	constructor(
		private readonly settings: CompactLinksSettings,
		view: EditorView
	) {
		this.decorationCache = new DecorationCache();
		this._decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate): void {
		if (this.shouldInvalidateCache(update)) {
			this.decorationCache.clear();
			this._cachedAliasRanges.clear();
			this._decorations = this.buildDecorations(update.view);
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
		if (!this.shouldProcessDecorations(view)) {
			return Decoration.set([]);
		}

		return this.processVisibleRanges(view);
	}

	private shouldProcessDecorations(view: EditorView): boolean {
		const hasSelection = this.hasSelection(view);
		return !(
			(hasSelection && this.settings.disableWhenSelected) ||
			!this.settings.compactAliasedLinks.enable
		);
	}

	private hasSelection(view: EditorView): boolean {
		const { from, to } = view.state.selection.main;
		return from !== to;
	}

	private processVisibleRanges(view: EditorView): DecorationSet {
		const ranges: Range<Decoration>[] = [];
		const cursor = view.state.selection.main.head;

		for (const { from, to } of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter: (node) =>
					this.processNode(node as NodeInfo, cursor, ranges),
			});
		}

		return Decoration.set(ranges, false);
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[]
	): void {
		if (!this.isLinkStartNode(node)) return;

		// check if the alias is in the visible range
		const cachedAliasRange = this._cachedAliasRanges.get(node.from);
		let aliasRange: AliasDecorationRange | null;

		if (cachedAliasRange) {
			aliasRange = cachedAliasRange;
		} else {
			aliasRange = this.findAliasRange(node);
			if (aliasRange) {
				this._cachedAliasRanges.set(node.from, aliasRange);
			}
		}

		if (aliasRange && !this.isCursorInRange(cursor, aliasRange)) {
			this.addAliasDecoration(ranges, aliasRange);
		}
	}

	private isLinkStartNode(node: NodeInfo): boolean {
		return node.type.name.includes("formatting-link-start");
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

	private addAliasDecoration(
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

	private shouldInvalidateCache(update: ViewUpdate): boolean {
		return (
			update.docChanged || update.selectionSet || update.viewportChanged
		);
	}
}
