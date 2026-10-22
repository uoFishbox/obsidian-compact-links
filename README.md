# Obsidian Compact Links Plugin

An Obsidian plugin that displays links in a compact format and reduces visual clutter while typing.

![Title - debug - Obsidian v1.7.4](https://i.gyazo.com/3d1edaabdd6f2f08d72b3df82c1f6bcb.gif)

## Features

### Compact Aliased Links

When you have a wikilink with an alias in the format `[[NoteTitle|Alias]]`, the plugin compacts it to show only the alias portion `[[|Alias]]`. The full note title becomes visible only when your cursor is positioned within the title section of the link.

![Title - debug - Obsidian v1.7.4](https://i.gyazo.com/3b6eaaad0bf2fc7284eb2dacab3bfce7.gif)

**Example:**

-   Normal view: `[[|ShortTitle]]`
-   When cursor is at note title: `[[TooLongNoteTitle|ShortTitle]]`

### Compact External Links

For markdown-style external links in the format `[Title](url)`, the plugin automatically shortens the URL display. The full URL is displayed when the cursor is at the URL portion or by clicking on the shortened portion.

Domain mode:

![Title - debug - Obsidian v1.7.4](https://i.gyazo.com/a46a9d77f273ae9e0021080c5c359e64.gif)

Hidden mode:

![Title - debug - Obsidian v1.7.4](https://i.gyazo.com/a76ee2401bd5c54205c9565da64ca861.gif)

**Example:**

-   Normal view (domain mode): `[GitHub](github.com)`
-   Normal view (hidden mode): `[GitHub](...)`
-   When cursor is at URL: `[GitHub](https://github.com/username/repository)`

### Compact Image Alt Text

Long image descriptions such as `![A very long description](image.png)` are
shortened to the configured display length. CJK characters count as two; other
Unicode code points count as one. Place a cursor in the description or click its
shortened text to edit the full description. Short descriptions remain editable
without a replacement widget.

## Development

Use Node.js 20 or later:

```sh
npm ci
npm test
npm run lint
npm run build
```

`npm run dev` watches the source and rebuilds the plugin for local development.

The source has three responsibilities:

- `src/main.ts` registers the editor extension and applies settings to open views.
- `src/settings.ts` validates persisted settings and supplies independent defaults;
  `src/settingsTab.ts` renders the settings UI.
- `src/cmplugins/CompactLinksPlugin.ts` builds all link decorations in one view
  plugin. It extracts visible candidates after document, viewport, or syntax
  tree changes. Selection changes only filter those candidates, avoiding URL
  parsing and full-line image alt scans. Extraction is deferred while compaction
  is disabled by a selection. Widgets compare their content and positions so
  CodeMirror can reuse their DOM.

Tests use real CodeMirror states and Lezer trees with Obsidian token names. The
Obsidian host and DOM are stubbed, so also verify in Obsidian: alias and URL
expansion at cursor boundaries, image alt text after editing and scrolling,
tooltip/click behavior, and source/live preview switching in multiple panes.
