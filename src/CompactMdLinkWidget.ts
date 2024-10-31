import { EditorView, WidgetType } from "@codemirror/view";
import { setTooltip, TooltipOptions } from "obsidian";

export class CompactMdLinkWidget extends WidgetType {
	constructor(
		private readonly url: string,
		private readonly displayText: string,
		private readonly className: string,
		private readonly view: EditorView,
		private readonly urlRange: { start: number; end: number },
		private readonly enableTooltip: boolean
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = this.className;
		span.textContent = this.displayText;
		span.addEventListener("click", this.handleClick.bind(this));

		if (this.url !== "" && this.enableTooltip) {
			const tooltipText = this.url;
			const options: TooltipOptions = {
				placement: "top",
				delay: 400,
			};
			setTooltip(span, tooltipText, options);
		}

		return span;
	}

	private handleClick(): void {
		this.moveCursorToUrl();
	}

	private moveCursorToUrl(): void {
		this.view.dispatch({
			selection: {
				anchor: this.urlRange.start,
				head: this.urlRange.end,
			},
			scrollIntoView: false,
		});
	}
}
