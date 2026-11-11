# Smart Link

Create Obsidian internal links from selected text without replacing the visible text with the destination file name.

## Features

- Add **Smart Link** to the editor context menu when text is selected.
- Search Markdown files in the vault as you type.
- Discover block identifiers in the selected destination file.
- Type a block identifier manually when needed.
- Create links to a whole note or to a specific block.
- Preserve the selected text as the link alias.
- Includes a command that can be assigned a hotkey.

## Usage

1. Select text in the editor.
2. Right-click and choose **Smart Link**.
3. Search for and select a destination file.
4. Optionally choose or enter a block identifier.
5. Click **Insert link**.

For example, selecting `(i)`, choosing `Introduction`, and entering `intro-reference` inserts:

```markdown
[[Introduction#^intro-reference|(i)]]
```

Leave the block identifier empty to link to the note itself:

```markdown
[[Introduction|(i)]]
```

## License

MIT. See [LICENSE](LICENSE).
