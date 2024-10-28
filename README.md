# Obsidian Compact Links Plugin

Displays links in a compact format to reduce visual clutter during typing.

## Features

### 1. Internal Link Alias Display

When you have a wikilink with an alias in the format `[[NoteTitle|Alias]]`, the plugin compacts it to show only the alias portion `[[|Alias]]`. The full note title becomes visible only when your cursor is positioned within the title section of the link.

**Example:**

-   Normal view: `[[|ShortTitle]]`
-   When cursor is on title: `[[TooLongNoteTitle|ShortTitle]]`

### 2. External URL Shortening

For markdown-style external links in the format `[Title](url)`, the plugin automatically shortens the URL display. The complete URL is revealed only when your cursor hovers over the URL portion.

**Example:**

-   Normal view: `[GitHub](github.com)` or `[GitHub](...)`
-   When cursor is on URL: `[GitHub](https://github.com/username/repository)`
