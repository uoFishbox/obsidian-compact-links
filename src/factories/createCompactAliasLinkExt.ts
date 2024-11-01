import { EditorView, PluginSpec, ViewPlugin } from "@codemirror/view";
import { CompactAliasLinkPlugin } from "../extensions/CompactAliasLinkExt";
import { CompactLinksSettings } from "../types";

export function createAliasLinkExt(settings: CompactLinksSettings) {
	return ViewPlugin.fromClass(
		class extends CompactAliasLinkPlugin {
			constructor(view: EditorView) {
				super(settings, view);
			}
		},
		pluginSpec
	);
}

const pluginSpec: PluginSpec<CompactAliasLinkPlugin> = {
	decorations: (value: CompactAliasLinkPlugin) => value.decorations,
};
