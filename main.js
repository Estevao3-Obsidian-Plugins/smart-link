const { Plugin, Modal, Setting, Notice } = require('obsidian');

class SmartLinkModal extends Modal {
  constructor(app, editor, selectedText) {
    super(app);
    this.editor = editor;
    this.selectedText = selectedText;
    this.files = app.vault.getMarkdownFiles();
    this.selectedFile = null;
    this.blockIds = [];
    this.fileSuggestions = [];
    this.anchorSuggestions = [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('smart-link-modal');
    contentEl.createEl('h2', { text: 'Create link' });

    new Setting(contentEl)
      .setName('Selected text')
      .setDesc('This text will remain visible in your note.')
      .addText((text) => {
        text.setValue(this.selectedText);
        text.setDisabled(true);
        text.inputEl.addClass('smart-link-selected-text');
      });

    const fileSetting = new Setting(contentEl)
      .setName('Destination file')
      .setDesc('Start typing to search your Markdown files.');
    fileSetting.controlEl.addClass('smart-link-field-wrap');
    this.fileInput = fileSetting.controlEl.createEl('input', {
      type: 'text',
      placeholder: 'Search files…',
      cls: 'smart-link-input'
    });
    this.fileList = fileSetting.controlEl.createDiv({ cls: 'smart-link-suggestions' });
    this.fileInput.addEventListener('input', () => this.renderFileSuggestions());
    this.fileInput.addEventListener('focus', () => this.renderFileSuggestions());
    this.fileInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && this.fileSuggestions.length) {
        event.preventDefault();
        this.chooseFile(this.fileSuggestions[0]);
      }
    });

    const anchorSetting = new Setting(contentEl)
      .setName('Block identifier (optional)')
      .setDesc('Choose an existing block ID or type one manually. Do not include the ^ character.');
    anchorSetting.controlEl.addClass('smart-link-field-wrap');
    this.anchorInput = anchorSetting.controlEl.createEl('input', {
      type: 'text',
      placeholder: 'Search or enter a block ID…',
      cls: 'smart-link-input'
    });
    this.anchorList = anchorSetting.controlEl.createDiv({ cls: 'smart-link-suggestions' });
    this.anchorInput.disabled = true;
    this.anchorInput.addEventListener('input', () => this.renderAnchorSuggestions());
    this.anchorInput.addEventListener('focus', () => this.renderAnchorSuggestions());
    this.anchorInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && this.anchorSuggestions.length) {
        event.preventDefault();
        this.anchorInput.value = this.anchorSuggestions[0];
        this.anchorList.empty();
      }
    });

    const buttons = contentEl.createDiv({ cls: 'smart-link-buttons' });
    const cancel = buttons.createEl('button', { text: 'Cancel' });
    cancel.addEventListener('click', () => this.close());
    const insert = buttons.createEl('button', { text: 'Insert link', cls: 'mod-cta' });
    insert.addEventListener('click', () => this.insertLink());

    this.fileInput.focus();
  }

  renderFileSuggestions() {
    const query = this.fileInput.value.trim().toLowerCase();
    this.fileSuggestions = this.files
      .filter((file) => !query || file.path.toLowerCase().includes(query) || file.basename.toLowerCase().includes(query))
      .sort((a, b) => {
        const aExact = a.basename.toLowerCase().startsWith(query) ? 0 : 1;
        const bExact = b.basename.toLowerCase().startsWith(query) ? 0 : 1;
        return aExact - bExact || a.path.localeCompare(b.path);
      })
      .slice(0, 10);

    this.fileList.empty();
    if (!this.fileSuggestions.length) {
      this.fileList.createDiv({ cls: 'smart-link-empty', text: 'No matching files found.' });
      return;
    }
    this.fileSuggestions.forEach((file) => {
      const item = this.fileList.createDiv({ cls: 'smart-link-suggestion' });
      item.createDiv({ text: file.basename, cls: 'smart-link-suggestion-title' });
      if (file.path !== `${file.basename}.md`) {
        item.createDiv({ text: file.path, cls: 'smart-link-suggestion-path' });
      }
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.chooseFile(file);
      });
    });
  }

  async chooseFile(file) {
    this.selectedFile = file;
    this.fileInput.value = file.path;
    this.fileList.empty();
    this.anchorInput.disabled = false;
    this.anchorInput.placeholder = 'Search or enter a block ID…';
    try {
      const content = await this.app.vault.cachedRead(file);
      this.blockIds = [...content.matchAll(/(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/gm)].map((match) => match[1]);
      this.blockIds = [...new Set(this.blockIds)];
    } catch (error) {
      console.error('Smart Link: could not read destination file', error);
      this.blockIds = [];
    }
    this.renderAnchorSuggestions();
    this.anchorInput.focus();
  }

  renderAnchorSuggestions() {
    if (!this.selectedFile || this.anchorInput.disabled) return;
    const query = this.anchorInput.value.trim().replace(/^\^/, '').toLowerCase();
    this.anchorSuggestions = this.blockIds
      .filter((id) => !query || id.toLowerCase().includes(query))
      .slice(0, 10);
    this.anchorList.empty();
    if (!this.anchorSuggestions.length) {
      if (this.blockIds.length) {
        this.anchorList.createDiv({ cls: 'smart-link-empty', text: 'No matching block IDs. You can still use the value you typed.' });
      } else {
        this.anchorList.createDiv({ cls: 'smart-link-empty', text: 'No block IDs found. You can type one manually or leave this field empty.' });
      }
      return;
    }
    this.anchorSuggestions.forEach((id) => {
      const item = this.anchorList.createDiv({ cls: 'smart-link-suggestion', text: `^${id}` });
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.anchorInput.value = id;
        this.anchorList.empty();
      });
    });
  }

  insertLink() {
    if (!this.selectedFile) {
      new Notice('Choose a destination file first.');
      this.fileInput.focus();
      return;
    }
    const path = this.selectedFile.path.replace(/\.md$/i, '');
    const anchor = this.anchorInput.value.trim().replace(/^\^/, '');
    const alias = this.selectedText.replace(/\|/g, '\\|');
    const destination = anchor ? `${path}#^${anchor}` : path;
    this.editor.replaceSelection(`[[${destination}|${alias}]]`);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}

module.exports = class SmartLinkPlugin extends Plugin {
  onload() {
    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
      const selectedText = editor.getSelection();
      if (!selectedText || !selectedText.trim()) return;
      menu.addItem((item) => {
        item
          .setTitle('Smart Link')
          .setIcon('link')
          .onClick(() => new SmartLinkModal(this.app, editor, selectedText).open());
      });
    }));

    this.addCommand({
      id: 'create-link-from-selection',
      name: 'Create link from selected text',
      editorCallback: (editor) => {
        const selectedText = editor.getSelection();
        if (!selectedText || !selectedText.trim()) {
          new Notice('Select some text first.');
          return;
        }
        new SmartLinkModal(this.app, editor, selectedText).open();
      }
    });
  }
};
