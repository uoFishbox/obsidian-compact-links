import { syntaxTree } from "@codemirror/language";
import { EditorState, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { CompactMdLinkWidget } from "../components/CompactMdLinkWidget";
import {
	COMPACT_ALIAS_LINK_DECORATION,
	COMPACT_MD_LINK_ALT_DECORATION,
	COMPACT_MD_LINK_DECORATION,
} from "../constants";
import { CompactLinksSettings, TextRange } from "../types";
import { textTruncator } from "../utils/textTruncator";
import { UrlParser } from "../utils/urlParser";

export function createCompactLinksExtension(settings: CompactLinksSettings) {
	return ViewPlugin.define((view) => new CompactLinksView(view, settings), {
		decorations: (value) => value.decorations,
	});
}

class CompactLinksView {
	decorations: DecorationSet;

	constructor(view: EditorView, private readonly settings: CompactLinksSettings) {
		this.decorations = buildLinkDecorations(view.state, view.visibleRanges, settings);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged || update.selectionSet || update.viewportChanged ||
			syntaxTree(update.startState) !== syntaxTree(update.state)) {
			this.decorations = buildLinkDecorations(
				update.state, update.view.visibleRanges, this.settings
			);
		}
	}
}

export function buildLinkDecorations(
	state: EditorState,
	visibleRanges: readonly TextRange[],
	settings: CompactLinksSettings
): DecorationSet {
	if (settings.disableWhenSelected && state.selection.ranges.some((range) => !range.empty)) {
		return Decoration.none;
	}

	const ranges: Range<Decoration>[] = [];
	const markdown = settings.compactMarkdownLinks;
	const seenNodes = new Set<number>();
	const tree = syntaxTree(state);

	if (settings.compactAliasedLinks.enable || markdown.CompactMdLinkUrlSettings.enable) {
		for (const { from, to } of visibleRanges) {
			tree.iterate({
				from,
				to,
				enter: (node) => {
					const name = node.type.name;
					const isAlias = settings.compactAliasedLinks.enable && name.includes("formatting-link-start");
					const isUrl = markdown.CompactMdLinkUrlSettings.enable &&
						(name.includes("string_url") || name.includes("string_strong_url"));
					if ((!isAlias && !isUrl) || seenNodes.has(node.from)) return;
					seenNodes.add(node.from);

					if (isAlias) {
						const range = findAliasRange(node);
						if (range && !hasCursorInRange(state, range)) {
							ranges.push(Decoration.mark(COMPACT_ALIAS_LINK_DECORATION).range(range.from, range.to));
						}
					} else if (!hasCursorInRange(state, node) && node.from < node.to) {
						const url = state.sliceDoc(node.from, node.to);
						const parsed = UrlParser.parse(url);
						if (!parsed.isUrl) return;
						const domain = parsed.scheme ? `${parsed.scheme}://${parsed.domain}` : parsed.domain;
						const hidden = markdown.CompactMdLinkUrlSettings.displayMode === "hidden";
						const className = hidden
							? COMPACT_MD_LINK_DECORATION.hidden.className
							: COMPACT_MD_LINK_DECORATION.domain.className +
								(parsed.scheme ? ` ${COMPACT_MD_LINK_DECORATION.domain.schemeClassName}` : "");
						addWidget(ranges, url, hidden ? COMPACT_MD_LINK_DECORATION.hidden.defaultText : domain,
							className, { from: node.from, to: node.to }, markdown.enableTooltip);
					}
				},
			});
		}
	}

	if (markdown.CompactMdLinkAltSettings.enable) {
		// Scan complete lines so scrolling cannot truncate a match at a viewport edge.
		for (const { from, to } of visibleLineRanges(state, visibleRanges)) {
			const pattern = /!\[([^[\]\r\n]+)\]/g;
			const text = state.sliceDoc(from, to);
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(text)) !== null) {
				const range = { from: from + match.index + 2, to: from + match.index + 2 + match[1].length };
				if (!visibleRanges.some((visible) => range.from < visible.to && range.to > visible.from) ||
					hasCursorInRange(state, range)) continue;
				const displayText = textTruncator(match[1], markdown.CompactMdLinkAltSettings.displayLength);
				if (displayText === match[1]) continue;
				addWidget(ranges, match[1], displayText, COMPACT_MD_LINK_ALT_DECORATION.truncated.className,
					range, markdown.enableTooltip);
			}
		}
	}

	return Decoration.set(ranges, true);
}

function hasCursorInRange(state: EditorState, range: TextRange): boolean {
	return state.selection.ranges.some(({ head }) => head >= range.from && head <= range.to);
}

function findAliasRange(node: SyntaxNodeRef): TextRange | null {
	const first = node.node.nextSibling;
	for (let sibling = first; sibling; sibling = sibling.nextSibling) {
		if (sibling.type.name.includes("formatting-link-end")) break;
		if (sibling.type.name.includes("link-alias-pipe")) {
			return first && first.from < sibling.from ? { from: first.from, to: sibling.from } : null;
		}
	}
	return null;
}

function visibleLineRanges(state: EditorState, visibleRanges: readonly TextRange[]): TextRange[] {
	const lines: TextRange[] = [];
	for (const range of visibleRanges) {
		const from = state.doc.lineAt(range.from).from;
		const to = state.doc.lineAt(range.to).to;
		const previous = lines[lines.length - 1];
		if (previous && from <= previous.to) previous.to = Math.max(previous.to, to);
		else lines.push({ from, to });
	}
	return lines;
}

function addWidget(
	ranges: Range<Decoration>[],
	fullText: string,
	displayText: string,
	className: string,
	range: TextRange,
	enableTooltip: boolean
): void {
	ranges.push(Decoration.replace({
		widget: new CompactMdLinkWidget(fullText, displayText, className, range, enableTooltip),
	}).range(range.from, range.to));
}
