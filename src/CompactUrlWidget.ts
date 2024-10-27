import { EditorView, WidgetType } from "@codemirror/view";

export class CompactUrlWidget extends WidgetType {
	constructor(
		private readonly url: string,
		private readonly displayText: string,
		private readonly className: string,
		private readonly view: EditorView,
		private readonly urlRange: { start: number; end: number }
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = this.className;
		span.textContent = this.displayText;
		span.addEventListener("click", this.handleClick.bind(this));
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
