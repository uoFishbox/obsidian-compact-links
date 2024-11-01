import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactMdAltPlugin } from "../cmplugins/CompactMdAltPlugin";
import { CompactLinksSettings } from "../types";

export function createCompactMdAltPlugin(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactMdAltPlugin {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactMdAltPlugin> = {
	decorations: (value: CompactMdAltPlugin) => value.decorations,
};
