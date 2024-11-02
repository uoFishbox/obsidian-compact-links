import { Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";

export class DecorationCache {
	private cache: Map<string, Range<Decoration>> = new Map();
	private positionToKey: Map<number, Set<string>> = new Map();
	private maxSize = 1000; // キャッシュサイズの制限

	public get(key: string): Range<Decoration> | undefined {
		return this.cache.get(key);
	}

	public set(key: string, decoration: Range<Decoration>): void {
		if (this.cache.size >= this.maxSize) {
			// LRU-like cache
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, decoration);
		const position = decoration.from;
		if (!this.positionToKey.has(position)) {
			this.positionToKey.set(position, new Set());
		}
		this.positionToKey.get(position)?.add(key);
	}

	public clear(): void {
		this.cache.clear();
	}

	public generateKey(from: number, to: number): string {
		return `${from}-${to}`;
	}

	public deleteByPosition(position: number): void {
		const keys = this.positionToKey.get(position);
		if (keys) {
			keys.forEach((key) => this.cache.delete(key));
			this.positionToKey.delete(position);
		}
	}
}
