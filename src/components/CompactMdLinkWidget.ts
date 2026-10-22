import { EditorView, WidgetType } from "@codemirror/view";
import { setTooltip } from "obsidian";
import { TextRange } from "../types";

export class CompactMdLinkWidget extends WidgetType {
	constructor(
		private readonly fullText: string,
		private readonly displayText: string,
		private readonly className: string,
		private readonly range: TextRange,
		private readonly enableTooltip: boolean
	) {
		super();
	}

	eq(other: CompactMdLinkWidget): boolean {
		return this.fullText === other.fullText &&
			this.displayText === other.displayText &&
			this.className === other.className &&
			this.range.from === other.range.from &&
			this.range.to === other.range.to &&
			this.enableTooltip === other.enableTooltip;
	}

	toDOM(view: EditorView): HTMLElement {
		const span = view.dom.ownerDocument.createElement("span");
		span.className = this.className;
		span.textContent = this.displayText;
		span.addEventListener("click", () => {
			view.dispatch({
				selection: { anchor: this.range.from, head: this.range.to },
				scrollIntoView: false,
			});
			view.focus();
		});
		if (this.fullText && this.enableTooltip) {
			setTooltip(span, this.fullText, { delay: 400 });
		}
		return span;
	}
}
