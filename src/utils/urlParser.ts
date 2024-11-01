import { ParsedUrl } from "../types";

export class UrlParser {
	static parse(url: string): ParsedUrl {
		const parsedScheme = this.parseScheme(url);
		return this.validateAndCreateUrl(url, parsedScheme);
	}

	private static parseScheme(url: string): {
		scheme: string;
		remainingUrl: string;
	} {
		const schemeMatch = url.match(/^([a-zA-Z]+):\/\//);
		if (!schemeMatch) {
			return { scheme: "", remainingUrl: url };
		}

		// if the scheme is http or https, we don't need to show it
		const scheme = schemeMatch[1].toLowerCase();
		if (scheme === "http" || scheme === "https") {
			return {
				scheme: "",
				remainingUrl: url.slice(schemeMatch[0].length),
			};
		}

		return {
			scheme: scheme,
			remainingUrl: url.slice(schemeMatch[0].length),
		};
	}

	private static validateAndCreateUrl(
		originalUrl: string,
		{ scheme, remainingUrl }: { scheme: string; remainingUrl: string }
	): ParsedUrl {
		try {
			const urlObj = new URL(originalUrl);
			return {
				isUrl: true,
				scheme,
				domain: urlObj.hostname,
			};
		} catch {
			if (scheme) {
				return this.tryParseWithHttp(remainingUrl, scheme);
			}
			return this.createInvalidUrlResult();
		}
	}

	private static tryParseWithHttp(
		remainingUrl: string,
		scheme: string
	): ParsedUrl {
		try {
			const urlObj = new URL(`http://${remainingUrl}`);
			return {
				isUrl: true,
				scheme,
				domain: urlObj.hostname,
			};
		} catch {
			return this.createInvalidUrlResult();
		}
	}

	private static createInvalidUrlResult(): ParsedUrl {
		return {
			isUrl: false,
			scheme: "",
			domain: "",
		};
	}
}
