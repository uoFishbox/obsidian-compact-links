import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CompactUrlPlugin } from "./CompactUrlExtension";
import { CompactLinksSettings } from "./types";

export function createCompactUrlPlugin(settings: CompactLinksSettings) {
	const plugin = ViewPlugin.fromClass(
		class {
			private plugin: CompactUrlPlugin;

			constructor(view: EditorView) {
				this.plugin = new CompactUrlPlugin(settings, view);
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
