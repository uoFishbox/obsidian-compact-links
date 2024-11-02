export function textTruncator(text: string, maxLength: number): string {
	let currentLength = 0;
	let i = 0;

	// CJK Unicode Ranges
	const isCJK = (char: string) => {
		const code = char.charCodeAt(0);
		return (
			(code >= 0x4e00 && code <= 0x9fff) || // CJK統合漢字
			(code >= 0x3040 && code <= 0x309f) || // ひらがな
			(code >= 0x30a0 && code <= 0x30ff) || // カタカナ
			(code >= 0xff00 && code <= 0xff9f)
		); // 全角英数字
	};

	while (i < text.length) {
		currentLength += isCJK(text[i]) ? 2 : 1;
		if (currentLength > maxLength) {
			return text.slice(0, i) + "...";
		}
		i++;
	}

	return text;
}
