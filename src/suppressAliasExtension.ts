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

export function createSuppressAliasExtension(
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
					node: { nextSibling: any };
				},
				cursor: number,
				ranges: Range<Decoration>[]
			) {
				if (!node.type.name.includes("formatting-link-start")) return;

				const linkTextNode = node.node.nextSibling;
				const pipeNode = linkTextNode?.nextSibling;

				if (
					linkTextNode?.type.name.includes("hmd-internal-link") &&
					pipeNode?.type.name.includes("link-alias-pipe")
				) {
					const isCursorInDisplayArea =
						cursor >= node.from && cursor <= pipeNode.from;

					if (!isCursorInDisplayArea) {
						ranges.push(
							Decoration.mark({
								class: "suppress-alias",
								attributes: { style: "display: none" },
							}).range(linkTextNode.from, linkTextNode.to)
						);
					}
				}
			}
		},

		{ decorations: (v) => v.decorations }
	);

	const suppressAliasStyle = EditorView.baseTheme({
		".suppress-alias.cm-link-has-alias": { display: "none !important" },
	});

	return [suppressAliasPlugin, suppressAliasStyle];
}
