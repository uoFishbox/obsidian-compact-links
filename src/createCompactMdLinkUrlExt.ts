import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactMdLinkUrlExt } from "./CompactMdLinkUrlExt";
import { CompactLinksSettings } from "./types";

export function createMdLinkUrlExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class {
			public plugin: CompactMdLinkUrlExt;

			constructor(public view: EditorView) {
				this.plugin = new CompactMdLinkUrlExt(settings, view);
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
