const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadSettings } = require("./runtime.cjs");

test("missing nested settings receive defaults without replacing saved choices", () => {
	const settings = loadSettings({
		disableInSourceMode: true,
		compactMarkdownLinks: { CompactMdLinkAltSettings: { displayLength: 10 } },
	});
	assert.equal(settings.disableInSourceMode, true);
	assert.equal(settings.compactMarkdownLinks.enableTooltip, true);
	assert.deepEqual(settings.compactMarkdownLinks.CompactMdLinkAltSettings, { enable: true, displayLength: 10 });
	assert.deepEqual(settings.compactMarkdownLinks.CompactMdLinkUrlSettings, { enable: true, displayMode: "domain" });
});

test("malformed stored values cannot disable features or break numeric settings", () => {
	for (const data of [null, [], "invalid", { compactMarkdownLinks: null }]) {
		assert.deepEqual(loadSettings(data), loadSettings());
	}
	for (const displayLength of [0, -1, 2.5, NaN, Infinity, "10"]) {
		const settings = loadSettings({
			disableWhenSelected: "false",
			compactMarkdownLinks: {
				CompactMdLinkAltSettings: { displayLength },
				CompactMdLinkUrlSettings: { displayMode: "custom" },
			},
		});
		assert.equal(settings.disableWhenSelected, false);
		assert.equal(settings.compactMarkdownLinks.CompactMdLinkAltSettings.displayLength, 20);
		assert.equal(settings.compactMarkdownLinks.CompactMdLinkUrlSettings.displayMode, "domain");
	}
});

test("defaults and loaded settings do not share mutable nested objects", () => {
	const first = loadSettings();
	first.compactAliasedLinks.enable = false;
	first.compactMarkdownLinks.CompactMdLinkAltSettings.displayLength = 1;
	const next = loadSettings();
	assert.equal(next.compactAliasedLinks.enable, true);
	assert.equal(next.compactMarkdownLinks.CompactMdLinkAltSettings.displayLength, 20);
});
