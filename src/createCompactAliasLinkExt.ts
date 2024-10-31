import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactAliasLinkPlugin } from "./CompactAliasLinkExt";
import { CompactLinksSettings } from "./types";

export function createAliasLinkExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class {
			public plugin: CompactAliasLinkPlugin;

			constructor(public view: EditorView) {
				this.plugin = new CompactAliasLinkPlugin(settings, view);
			}

			update(update: ViewUpdate) {
				this.plugin.update(update);
			}

			destroy() {}
		},
		{
			decorations: (v) => v.plugin.decorations,
			eventHandlers: {},
		}
	);
}
