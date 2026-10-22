export function textTruncator(text: string, maxLength: number): string {
	let currentLength = 0;
	let end = 0;

	// CJK Unicode Ranges
	const isCJK = (char: string) => {
		const code = char.codePointAt(0) ?? 0;
		return (
			(code >= 0x4e00 && code <= 0x9fff) || // CJK統合漢字
			(code >= 0x3040 && code <= 0x309f) || // ひらがな
			(code >= 0x30a0 && code <= 0x30ff) || // カタカナ
			(code >= 0xff00 && code <= 0xff9f)
		); // 全角英数字
	};

	for (const char of text) {
		currentLength += isCJK(char) ? 2 : 1;
		if (currentLength > maxLength) {
			return text.slice(0, end) + "...";
		}
		end += char.length;
	}

	return text;
}
