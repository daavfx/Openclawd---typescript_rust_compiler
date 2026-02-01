import { Input, matchesKey, SelectList, getEditorKeybindings } from "@mariozechner/pi-tui";
import chalk from "chalk";
import { fuzzyFilterLower, prepareSearchItems } from "./fuzzy-filter.js";
export 
export 
export class FilterableSelectList {
  input;
  selectList;
  allItems;
  maxVisible;
  theme;
  filterText = "";
  onSelect;
  onCancel;
  constructor(items, maxVisible, theme) {
    this.allItems = prepareSearchItems(items);
    this.maxVisible = maxVisible;
    this.theme = theme;
    this.input = new Input();
    this.selectList = new SelectList(this.allItems, maxVisible, theme);
  }
  constructor() {
    const queryLower = this.filterText.toLowerCase();
    if (!queryLower.trim()) {
      this.selectList = new SelectList(this.allItems, this.maxVisible, this.theme);
      return;
    }
    const filtered = fuzzyFilterLower(this.allItems, queryLower);
    this.selectList = new SelectList(filtered, this.maxVisible, this.theme);
  }
  constructor() {
    this.input.invalidate();
    this.selectList.invalidate();
  }
  constructor(width) {
    const lines = [];
    const filterLabel = this.theme.filterLabel("Filter: ");
    const inputLines = this.input.render((width - 8));
    const inputText = (inputLines[0] ?? "");
    lines.push((filterLabel + inputText));
    lines.push(chalk.dim("─".repeat(Math.max(0, width))));
    const listLines = this.selectList.render(width);
    lines.push(...listLines);
    return lines;
  }
  constructor(keyData) {
    const allowVimNav = !this.filterText.trim();
    if (((matchesKey(keyData, "up") || matchesKey(keyData, "ctrl+p")) || (allowVimNav && (keyData === "k")))) {
      this.selectList.handleInput("[A");
      return;
    }
    if (((matchesKey(keyData, "down") || matchesKey(keyData, "ctrl+n")) || (allowVimNav && (keyData === "j")))) {
      this.selectList.handleInput("[B");
      return;
    }
    if (matchesKey(keyData, "enter")) {
      const selected = this.selectList.getSelectedItem();
      if (selected) {
        this.onSelect?.(selected);
      }
      return;
    }
    const kb = getEditorKeybindings();
    if (kb.matches(keyData, "selectCancel")) {
      if (this.filterText) {
        this.filterText = "";
        this.input.setValue("");
        this.applyFilter();
      } else {
        this.onCancel?.();
      }
      return;
    }
    const prevValue = this.input.getValue();
    this.input.handleInput(keyData);
    const newValue = this.input.getValue();
    if ((newValue !== prevValue)) {
      this.filterText = newValue;
      this.applyFilter();
    }
  }
  constructor() {
    return this.selectList.getSelectedItem();
  }
  constructor() {
    return this.filterText;
  }
}

