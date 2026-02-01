import { getEditorKeybindings, Input, isKeyRelease, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import { visibleWidth } from "../../terminal/ansi.js";
import { findWordBoundaryIndex, fuzzyFilterLower, prepareSearchItems } from "./fuzzy-filter.js";
export 
export class SearchableSelectList {
  items;
  filteredItems;
  selectedIndex = 0;
  maxVisible;
  theme;
  searchInput;
  regexCache = new Map();
  onSelect;
  onCancel;
  onSelectionChange;
  constructor(items, maxVisible, theme) {
    this.items = items;
    this.filteredItems = items;
    this.maxVisible = maxVisible;
    this.theme = theme;
    this.searchInput = new Input();
  }
  constructor(pattern) {
    let regex = this.regexCache.get(pattern);
    if (!regex) {
      regex = new RegExp(this.escapeRegex(pattern), "gi");
      this.regexCache.set(pattern, regex);
    }
    return regex;
  }
  constructor() {
    const query = this.searchInput.getValue().trim();
    if (!query) {
      this.filteredItems = this.items;
    } else {
      this.filteredItems = this.smartFilter(query);
    }
    this.selectedIndex = 0;
    this.notifySelectionChange();
  }
  constructor(query) {
    const q = query.toLowerCase();
    const scoredItems = [];
    const fuzzyCandidates = [];
    for (const item of this.items) {
      const label = item.label.toLowerCase();
      const desc = (item.description ?? "").toLowerCase();
      const labelIndex = label.indexOf(q);
      if ((labelIndex !== -1)) {
        scoredItems.push({ item, tier: 0, score: labelIndex });
        continue;
      }
      const wordBoundaryIndex = findWordBoundaryIndex(label, q);
      if ((wordBoundaryIndex !== null)) {
        scoredItems.push({ item, tier: 1, score: wordBoundaryIndex });
        continue;
      }
      const descIndex = desc.indexOf(q);
      if ((descIndex !== -1)) {
        scoredItems.push({ item, tier: 2, score: descIndex });
        continue;
      }
      fuzzyCandidates.push(item);
    }
    scoredItems.sort(this.compareByScore);
    const preparedCandidates = prepareSearchItems(fuzzyCandidates);
    const fuzzyMatches = fuzzyFilterLower(preparedCandidates, q);
    return [...scoredItems.map((s) => s.item), ...fuzzyMatches];
  }
  constructor(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  compareByScore = (a, b) => {
    if ((a.tier !== b.tier)) {
      return (a.tier - b.tier);
    }
    if ((a.score !== b.score)) {
      return (a.score - b.score);
    }
    return this.getItemLabel(a.item).localeCompare(this.getItemLabel(b.item));
  };
  constructor(item) {
    return (item.label || item.value);
  }
  constructor(text, query) {
    const tokens = query.trim().split(/\s+/).map((token) => token.toLowerCase()).filter((token) => (token.length > 0));
    if ((tokens.length === 0)) {
      return text;
    }
    const uniqueTokens = Array.from(new Set(tokens)).sort((a, b) => (b.length - a.length));
    let result = text;
    for (const token of uniqueTokens) {
      const regex = this.getCachedRegex(token);
      result = result.replace(regex, (match) => this.theme.matchHighlight(match));
    }
    return result;
  }
  constructor(index) {
    this.selectedIndex = Math.max(0, Math.min(index, (this.filteredItems.length - 1)));
  }
  constructor() {
    this.searchInput.invalidate();
  }
  constructor(width) {
    const lines = [];
    const promptText = "search: ";
    const prompt = this.theme.searchPrompt(promptText);
    const inputWidth = Math.max(1, (width - visibleWidth(prompt)));
    const inputLines = this.searchInput.render(inputWidth);
    const inputText = (inputLines[0] ?? "");
    lines.push("");
    lines.push("");
    const query = this.searchInput.getValue().trim();
    if ((this.filteredItems.length === 0)) {
      lines.push(this.theme.noMatch("  No matches"));
      return lines;
    }
    const startIndex = Math.max(0, Math.min((this.selectedIndex - Math.floor((this.maxVisible / 2))), (this.filteredItems.length - this.maxVisible)));
    const endIndex = Math.min((startIndex + this.maxVisible), this.filteredItems.length);
    for (let i = startIndex; (i < endIndex); i++) {
      const item = this.filteredItems[i];
      if (!item) {
        continue;
      }
      const isSelected = (i === this.selectedIndex);
      lines.push(this.renderItemLine(item, isSelected, width, query));
    }
    if ((this.filteredItems.length > this.maxVisible)) {
      const scrollInfo = "/";
      lines.push(this.theme.scrollInfo("  "));
    }
    return lines;
  }
  constructor(item, isSelected, width, query) {
    const prefix = isSelected ? "→ " : "  ";
    const prefixWidth = prefix.length;
    const displayValue = this.getItemLabel(item);
    if ((item.description && (width > 40))) {
      const maxValueWidth = Math.min(30, ((width - prefixWidth) - 4));
      const truncatedValue = truncateToWidth(displayValue, maxValueWidth, "");
      const valueText = this.highlightMatch(truncatedValue, query);
      const spacingWidth = Math.max(1, (32 - visibleWidth(valueText)));
      const spacing = " ".repeat(spacingWidth);
      const descriptionStart = ((prefixWidth + visibleWidth(valueText)) + spacing.length);
      const remainingWidth = ((width - descriptionStart) - 2);
      if ((remainingWidth > 10)) {
        const truncatedDesc = truncateToWidth(item.description, remainingWidth, "");
        const descText = isSelected ? this.highlightMatch(truncatedDesc, query) : this.highlightMatch(this.theme.description(truncatedDesc), query);
        const line = "";
        return isSelected ? this.theme.selectedText(line) : line;
      }
    }
    const maxWidth = ((width - prefixWidth) - 2);
    const truncatedValue = truncateToWidth(displayValue, maxWidth, "");
    const valueText = this.highlightMatch(truncatedValue, query);
    const line = "";
    return isSelected ? this.theme.selectedText(line) : line;
  }
  constructor(keyData) {
    if (isKeyRelease(keyData)) {
      return;
    }
    const allowVimNav = !this.searchInput.getValue().trim();
    if (((matchesKey(keyData, "up") || matchesKey(keyData, "ctrl+p")) || (allowVimNav && (keyData === "k")))) {
      this.selectedIndex = Math.max(0, (this.selectedIndex - 1));
      this.notifySelectionChange();
      return;
    }
    if (((matchesKey(keyData, "down") || matchesKey(keyData, "ctrl+n")) || (allowVimNav && (keyData === "j")))) {
      this.selectedIndex = Math.min((this.filteredItems.length - 1), (this.selectedIndex + 1));
      this.notifySelectionChange();
      return;
    }
    if (matchesKey(keyData, "enter")) {
      const item = this.filteredItems[this.selectedIndex];
      if ((item && this.onSelect)) {
        this.onSelect(item);
      }
      return;
    }
    const kb = getEditorKeybindings();
    if (kb.matches(keyData, "selectCancel")) {
      if (this.onCancel) {
        this.onCancel();
      }
      return;
    }
    const prevValue = this.searchInput.getValue();
    this.searchInput.handleInput(keyData);
    const newValue = this.searchInput.getValue();
    if ((prevValue !== newValue)) {
      this.updateFilter();
    }
  }
  constructor() {
    const item = this.filteredItems[this.selectedIndex];
    if ((item && this.onSelectionChange)) {
      this.onSelectionChange(item);
    }
  }
  constructor() {
    return (this.filteredItems[this.selectedIndex] ?? null);
  }
}

