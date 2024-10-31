import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactMdLinkExt } from "./CompactMdLinkExt";
import { CompactLinksSettings } from "./types";

export function createMdLinkExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class {
			public plugin: CompactMdLinkExt;

			constructor(public view: EditorView) {
				this.plugin = new CompactMdLinkExt(settings, view);
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
