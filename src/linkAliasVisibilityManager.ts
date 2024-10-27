import { syntaxTree } from "@codemirror/language";
import { Range } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { CompactLinksWithAliasSettings } from "./types";

export function createAliasVisibilityPlugin(
	settings: CompactLinksWithAliasSettings
) {
	const suppressAliasPlugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.selectionSet) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const ranges: Range<Decoration>[] = [];
				const cursor = view.state.selection.main.head;
				const hasSelection =
					view.state.selection.main.from !==
					view.state.selection.main.to;

				if (
					(hasSelection && settings.diablePluginWhenSelected) ||
					!settings.enablePlugin
				) {
					return Decoration.set(ranges);
				}

				for (const { from, to } of view.visibleRanges) {
					syntaxTree(view.state).iterate({
						from,
						to,
						enter: (node) =>
							this.decorateNode(node, cursor, ranges),
					});
				}

				return Decoration.set(ranges);
			}

			private decorateNode(
				node: {
					type: { name: string };
					from: number;
					to: number;
					node: { nextSibling: any; parent: any };
				},
				cursor: number,
				ranges: Range<Decoration>[]
			) {
				// return if the node is not a link start
				if (!node.type.name.includes("formatting-link-start")) return;

				let currentNode = node.node.nextSibling;
				if (!currentNode) return;

				const startPos = currentNode.from;
				let pipeNode = null;

				// find the pipe node
				while (
					currentNode &&
					!currentNode.type.name.includes("formatting-link-end")
				) {
					if (currentNode.type.name.includes("link-alias-pipe")) {
						pipeNode = currentNode;
						break;
					}
					currentNode = currentNode.nextSibling;
				}

				// if the pipe node is found, check if the cursor is in the range
				if (pipeNode) {
					const isCursorInRange =
						cursor >= startPos && cursor <= pipeNode.from;

					// Ensure that the decoration range is not empty
					if (!isCursorInRange && startPos < pipeNode.from) {
						ranges.push(
							Decoration.mark({
								class: "suppress-alias",
								attributes: { style: "display: none" },
							}).range(startPos, pipeNode.from)
						);
					}
				}
			}
		},
		{ decorations: (v) => v.decorations }
	);

	const suppressAliasStyle = EditorView.baseTheme({
		".suppress-alias": { display: "none !important" },
	});

	return [suppressAliasPlugin, suppressAliasStyle];
}
