import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactMdLinkAltExt } from "./CompactMdLinkAltExt";
import { CompactLinksSettings } from "./types";

export function createMdLinkAltExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class {
			public plugin: CompactMdLinkAltExt;

			constructor(public view: EditorView) {
				this.plugin = new CompactMdLinkAltExt(settings, view);
			}

			update(update: ViewUpdate) {
				this.plugin.update(update);
			}

			destroy() {}
		},
		{
			decorations: (v) => v.plugin.getDecorations(),
			eventHandlers: {},
		}
	);
}
