import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewUpdate,
} from "@codemirror/view";
import { COMPACT_ALIAS_LINK_DECORATION } from "./constants";
import {
	AliasDecorationRange,
	CompactLinksSettings,
	NodeInfo,
	SyntaxNode,
} from "./types";

export class CompactAliasLinkPlugin {
	private _decorations: DecorationSet;

	constructor(
		private readonly settings: CompactLinksSettings,
		view: EditorView
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
		return update.docChanged || update.selectionSet;
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
			(hasSelection && this.settings.aliasLinks.disableWhenSelected) ||
			!this.settings.aliasLinks.enable
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

		return Decoration.set(ranges);
	}

	private processNode(
		node: NodeInfo,
		cursor: number,
		ranges: Range<Decoration>[]
	): void {
		if (!this.isLinkStartNode(node)) return;

		const aliasRange = this.findAliasRange(node);
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
		if (!node) {
			return null;
		}

		if (node.type.name.includes("formatting-link-end")) {
			return null;
		}

		if (node.type.name.includes("link-alias-pipe")) {
			return node;
		}

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
		if (range.startPos < range.pipePos) {
			ranges.push(
				Decoration.mark(COMPACT_ALIAS_LINK_DECORATION).range(
					range.startPos,
					range.pipePos
				)
			);
		}
	}
}
