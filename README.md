# Obsidian Compact Links Plugin

An Obsidian plugin that compacts links and image alt text in the editor to reduce visual clutter, expanding them automatically when you place your cursor on them.

![Overview demo of Obsidian Compact Links Plugin](https://i.gyazo.com/3d1edaabdd6f2f08d72b3df82c1f6bcb.gif)

## Features

### Compact Aliased Links

For wikilinks with an alias (`[[NoteTitle|Alias]]`), the plugin hides the note title and displays `[[|Alias]]`. The full note title expands when your cursor is positioned inside the title section.

![Demo of compact aliased links](https://i.gyazo.com/3b6eaaad0bf2fc7284eb2dacab3bfce7.gif)

**Example:**

- Normal view: `[[|ShortTitle]]`
- When cursor is in the title section: `[[TooLongNoteTitle|ShortTitle]]`

### Compact External Links

For Markdown external links (`[Title](url)`), the plugin shortens the URL display according to the selected mode. The full URL expands when your cursor is on the URL portion or when you click the shortened text.

**Domain mode:**

![Demo of external links in domain mode](https://i.gyazo.com/a46a9d77f273ae9e0021080c5c359e64.gif)

**Hidden mode:**

![Demo of external links in hidden mode](https://i.gyazo.com/a76ee2401bd5c54205c9565da64ca861.gif)

**Example:**

- Normal view (Domain mode): `[GitHub](github.com)`
- Normal view (Hidden mode): `[GitHub](...)`
- When cursor is on the URL: `[GitHub](https://github.com/username/repository)`

### Compact Image Alt Text

For Markdown image embeds (`![alt](link)`), alt text exceeding the configured display length is shortened. CJK characters count as 2 and other Unicode code points count as 1. Alt text within the limit is shown in full. Place the cursor in the alt text or click the shortened version to edit the full text.

> Note: This applies only to Markdown image embeds (`![alt](link)`), not wikilink embeds (`![[image.png|alt]]`).

**Example:**

- Normal view: `![A very long ...](image.png)`
- When cursor is in the alt text: `![A very long description](image.png)`

## Installation

<!-- TODO: Community Plugins からのインストール手順、または Releases からの手動配置手順を記載 -->

## Development

### Setup

Use Node.js 20 with npm 10 (matching the CI environment):

```sh
npm ci
npm test
npm run lint
npm run build