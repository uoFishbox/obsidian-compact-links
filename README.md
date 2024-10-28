# Obsidian Compact Links Plugin

Displays links in a compact format to reduce visual clutter during typing.

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
