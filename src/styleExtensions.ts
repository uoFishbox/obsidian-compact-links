import { EditorView } from "@codemirror/view";

export const compactUrlStyle = EditorView.baseTheme({
	".compact-url-hide": {
		color: "var(--text-faint)",
		fontSize: "1em",
		cursor: "pointer",
	},
	".compact-url-domain": {
		color: "var(--text-faint)",
		fontSize: "1em",
		cursor: "pointer",
	},
	".compact-url-scheme": {
		color: "var(--text-faint)",
		fontSize: "1em",
		cursor: "pointer",
	},
});

export const compactAliasLinkStyle = EditorView.baseTheme({
	".suppress-alias": {
		display: "none !important",
	},
});
