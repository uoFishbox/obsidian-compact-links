import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactMdUrlPlugin } from "../cmplugins/CompactMdUrlPlugin";
import { CompactLinksSettings } from "../types";

export function createCompactMdUrlPlugin(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactMdUrlPlugin {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactMdUrlPlugin> = {
	decorations: (value: CompactMdUrlPlugin) => value.decorations,
};
