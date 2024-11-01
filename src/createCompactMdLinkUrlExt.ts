import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactMdLinkUrlExt } from "./CompactMdLinkUrlExt";
import { CompactLinksSettings } from "./types";

export function createMdLinkUrlExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactMdLinkUrlExt {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactMdLinkUrlExt> = {
	decorations: (value: CompactMdLinkUrlExt) => value.decorations,
};
