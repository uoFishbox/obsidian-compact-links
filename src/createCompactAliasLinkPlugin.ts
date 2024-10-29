import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactAliasLinkPlugin } from "./CompactAliasLinkPlugin";
import { CompactLinksSettings } from "./types";

export function createAliasLinkPlugin(settings: CompactLinksSettings) {
	const plugin = ViewPlugin.fromClass(
		class {
			private plugin: CompactAliasLinkPlugin;

			constructor(view: EditorView) {
				this.plugin = new CompactAliasLinkPlugin(settings, view);
			}

			update(update: ViewUpdate) {
				this.plugin.update(update);
			}

			get decorations() {
				return this.plugin.decorations;
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);

	return [plugin];
}
