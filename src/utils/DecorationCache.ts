import { Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";

export class DecorationCache {
	private decorations = new Map<string, Range<Decoration>>();
	private maxSize = 1000; // キャッシュサイズの制限

	public get(key: string): Range<Decoration> | undefined {
		return this.decorations.get(key);
	}

	public set(key: string, decoration: Range<Decoration>): void {
		if (this.decorations.size >= this.maxSize) {
			// LRU-like cache
			const firstKey = this.decorations.keys().next().value;
			if (firstKey !== undefined) {
				this.decorations.delete(firstKey);
			}
		}
		this.decorations.set(key, decoration);
	}

	public clear(): void {
		this.decorations.clear();
	}

	public generateKey(from: number, to: number): string {
		return `${from}-${to}`;
	}
}
