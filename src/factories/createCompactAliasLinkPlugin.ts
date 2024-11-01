import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactAliasPlugin } from "../extensions/CompactAliasPlugin";
import { CompactLinksSettings } from "../types";

export function createCompactAliasPlugin(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactAliasPlugin {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactAliasPlugin> = {
	decorations: (value: CompactAliasPlugin) => value.decorations,
};
