import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
export class ResizableDivider extends LitElement {
  splitRatio = 0.6;
  minRatio = 0.4;
  maxRatio = 0.7;
  isDragging = false;
  startX = 0;
  startRatio = 0;
  static styles = css("
    :host {
      width: 4px;
      cursor: col-resize;
      background: var(--border, #333);
      transition: background 150ms ease-out;
      flex-shrink: 0;
      position: relative;
    }

    :host::before {
      content: \"\";
      position: absolute;
      top: 0;
      left: -4px;
      right: -4px;
      bottom: 0;
    }

    :host(:hover) {
      background: var(--accent, #007bff);
    }

    :host(.dragging) {
      background: var(--accent, #007bff);
    }
  ");
  constructor() {
    return html("");
  }
  constructor() {
    super.connectedCallback();
    this.addEventListener("mousedown", this.handleMouseDown);
  }
  constructor() {
    super.disconnectedCallback();
    this.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  }
  handleMouseDown = (e) => {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startRatio = this.splitRatio;
    this.classList.add("dragging");
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
    e.preventDefault();
  };
  handleMouseMove = (e) => {
    if (!this.isDragging) {
      return;
    }
    const container = this.parentElement;
    if (!container) {
      return;
    }
    const containerWidth = container.getBoundingClientRect().width;
    const deltaX = (e.clientX - this.startX);
    const deltaRatio = (deltaX / containerWidth);
    let newRatio = (this.startRatio + deltaRatio);
    newRatio = Math.max(this.minRatio, Math.min(this.maxRatio, newRatio));
    this.dispatchEvent(new CustomEvent("resize", { detail: { splitRatio: newRatio }, bubbles: true, composed: true }));
  };
  handleMouseUp = () => {
    this.isDragging = false;
    this.classList.remove("dragging");
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  };
}

