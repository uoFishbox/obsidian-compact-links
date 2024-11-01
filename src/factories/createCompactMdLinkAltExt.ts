import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactMdLinkAltExt } from "../extensions/CompactMdLinkAltExt";
import { CompactLinksSettings } from "../types";

export function createMdLinkAltExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactMdLinkAltExt {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactMdLinkAltExt> = {
	decorations: (value: CompactMdLinkAltExt) => value.decorations,
};
