'use strict';

// Each theme is a small palette. buildCss() maps it onto WhatsApp Web's own
// CSS custom properties (both the older names and the newer WDS tokens), so
// restyling survives most WhatsApp updates without relying on obfuscated
// class names.
const THEMES = {
  graphite: {
    label: 'Graphite (dark)',
    dark: true,
    bg: '#16181d', panel: '#1d2026', panel2: '#252932', hover: '#2b303a',
    active: '#323845', border: '#2c313b', text: '#e6e8ee', muted: '#8b93a3',
    accent: '#7c9cff', inBubble: '#252a33', outBubble: '#34406a', outText: '#eef1ff',
  },
  midnight: {
    label: 'Midnight (dark blue)',
    dark: true,
    bg: '#0b1020', panel: '#10172b', panel2: '#162038', hover: '#1b2744',
    active: '#22305388', border: '#1c2742', text: '#dfe6f7', muted: '#7f8db0',
    accent: '#4fd1c5', inBubble: '#172240', outBubble: '#134e4a', outText: '#e6fffb',
  },
  oled: {
    label: 'OLED black (battery saver)',
    dark: true,
    bg: '#000000', panel: '#000000', panel2: '#0d0d0d', hover: '#141414',
    active: '#1c1c1c', border: '#1a1a1a', text: '#e8e8e8', muted: '#7a7a7a',
    accent: '#ff8a5c', inBubble: '#121212', outBubble: '#3a1f14', outText: '#fff1ea',
  },
  paper: {
    label: 'Paper (light warm)',
    dark: false,
    bg: '#f3efe8', panel: '#fbf9f5', panel2: '#f1ece4', hover: '#ece6dc',
    active: '#e5ddd0', border: '#e4ddd2', text: '#2b2722', muted: '#857b6e',
    accent: '#c2410c', inBubble: '#ffffff', outBubble: '#fde7d6', outText: '#2b2722',
  },
  mist: {
    label: 'Mist (light cool)',
    dark: false,
    bg: '#eef1f6', panel: '#ffffff', panel2: '#f3f5f9', hover: '#eef1f7',
    active: '#e3e8f2', border: '#e3e7ee', text: '#1d2330', muted: '#6b7487',
    accent: '#4f46e5', inBubble: '#ffffff', outBubble: '#e3e6ff', outText: '#1d2330',
  },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '').slice(0, 6);
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function variableBlock(t, accent) {
  const a = accent || t.accent;
  const vars = {
    // --- legacy WhatsApp Web variables ---
    '--app-background': t.bg,
    '--app-background-stripe': t.bg,
    '--background-default': t.panel,
    '--background-default-hover': t.hover,
    '--background-default-active': t.active,
    '--background-lighter': t.panel2,
    '--panel-background': t.panel,
    '--panel-background-colored': t.panel,
    '--panel-background-deeper': t.panel2,
    '--panel-background-lighter': t.panel2,
    '--panel-header-background': t.panel,
    '--panel-header-icon': t.muted,
    '--panel-input-background': t.panel2,
    '--drawer-background': t.panel,
    '--drawer-background-deep': t.panel2,
    '--drawer-section-background': t.panel,
    '--conversation-panel-background': t.bg,
    '--conversation-header-border': t.border,
    '--intro-background': t.bg,
    '--intro-border': t.accent,
    '--border-list': t.border,
    '--border-stronger': t.border,
    '--border-panel': t.border,
    '--border-header': t.border,
    '--search-container-background': t.panel,
    '--search-input-background': t.panel2,
    '--search-input-container-background': t.panel,
    '--search-input-container-background-active': t.panel,
    '--rich-text-panel-background': t.panel,
    '--compose-input-background': t.panel2,
    '--compose-input-border': t.border,
    '--compose-panel-background': t.panel,
    '--incoming-background': t.inBubble,
    '--incoming-background-deeper': t.panel2,
    '--outgoing-background': t.outBubble,
    '--outgoing-background-deeper': t.outBubble,
    '--system-message-background': t.panel2,
    '--notification-e2e-background': t.panel2,
    '--dropdown-background': t.panel2,
    '--dropdown-background-hover': t.hover,
    '--primary': t.text,
    '--primary-strong': t.text,
    '--primary-strongest': t.text,
    '--primary-title': t.text,
    '--message-primary': t.text,
    '--secondary': t.muted,
    '--secondary-lighter': t.muted,
    '--secondary-stronger': t.muted,
    '--chat-meta': t.muted,
    '--bubble-meta': t.muted,
    '--icon': t.muted,
    '--icon-lighter': t.muted,
    '--chatlist-icon': t.muted,
    '--teal': a,
    '--teal-lighter': a,
    '--primary-green': a,
    '--unread-marker-background': a,
    '--unread-marker-text': t.dark ? '#0b0b0b' : '#ffffff',
    '--typing': a,
    '--link': a,
    '--checkbox-background': a,
    '--switch-button-color': a,
    '--button-primary-background': a,
    '--shadow-rgb': t.dark ? '0, 0, 0' : '30, 40, 60',
    // --- newer WDS design tokens ---
    '--WDS-surface-default': t.panel,
    '--WDS-surface-emphasized': t.panel2,
    '--WDS-surface-highlight': t.hover,
    '--WDS-background-wash-plain': t.bg,
    '--WDS-background-wash-inset': t.bg,
    '--WDS-content-default': t.text,
    '--WDS-content-deemphasized': t.muted,
    '--WDS-content-action-emphasized': a,
    '--WDS-content-action-default': a,
    '--WDS-accent': a,
    '--WDS-accent-deemphasized': a,
    '--WDS-brand': a,
    '--WDS-border-default': t.border,
    '--WDS-border-subtle': t.border,
    '--WDS-chat-bubble-incoming': t.inBubble,
    '--WDS-chat-bubble-outgoing': t.outBubble,
    // --- our own tokens ---
    '--ws-bg': t.bg,
    '--ws-panel': t.panel,
    '--ws-panel2': t.panel2,
    '--ws-hover': t.hover,
    '--ws-active': t.active,
    '--ws-border': t.border,
    '--ws-text': t.text,
    '--ws-muted': t.muted,
    '--ws-accent': a,
    '--ws-accent-rgb': hexToRgb(a),
    '--ws-in': t.inBubble,
    '--ws-out': t.outBubble,
    '--ws-out-text': t.outText,
  };
  return Object.entries(vars).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n');
}

// Layout/visual restyle. Only uses selectors that have been stable in
// WhatsApp Web for a long time (#app, #side, #main, roles, data-icon,
// message-in/out).
const LAYOUT_CSS = `
html, body { background: var(--ws-bg) !important; }
body, #app { color: var(--ws-text) !important;
  font-family: "Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif !important; }

/* Floating, rounded panes with a gap instead of hard dividers */
#app > div > div[tabindex="-1"], #app > div > div > div[tabindex="-1"] { background: var(--ws-bg) !important; }
#side, #main, #app [data-testid="drawer-left"], #app [data-testid="drawer-right"] {
  border-radius: 14px !important; overflow: hidden !important; }
#side { background: var(--ws-panel) !important; border: 1px solid var(--ws-border) !important; }
#main { border: 1px solid var(--ws-border) !important; }
#side header, #main header { background: var(--ws-panel) !important; border-bottom: 1px solid var(--ws-border) !important; box-shadow: none !important; }
#main footer { background: var(--ws-panel) !important; border-top: 1px solid var(--ws-border) !important; }

/* Chat list: pill-shaped rows with soft hover */
#pane-side { background: var(--ws-panel) !important; }
#pane-side [role="listitem"] > div, #pane-side [role="row"] > div { border-radius: 10px !important; margin: 0 6px !important; }
#pane-side [role="listitem"] > div:hover, #pane-side [role="row"] > div:hover { background: var(--ws-hover) !important; }
#pane-side [aria-selected="true"] > div, #pane-side [aria-selected="true"] { background: var(--ws-active) !important; }
#pane-side [role="gridcell"], #pane-side [role="listitem"] [role="gridcell"] { border-top-color: transparent !important; }

/* Search & composer: rounded inputs */
#side [contenteditable="true"], #side input[type="text"] { border-radius: 10px !important; }
#main footer [contenteditable="true"] { caret-color: var(--ws-accent) !important; }
#main footer div:has(> [contenteditable="true"]) { border-radius: 12px !important; }

/* Message bubbles: rounder, no tails, subtle shadow */
.message-in > div > div, .message-out > div > div { border-radius: 16px !important; box-shadow: 0 1px 1.5px rgba(0,0,0,.12) !important; }
.message-in [data-icon="tail-in"], .message-out [data-icon="tail-out"],
span[data-icon="tail-in"], span[data-icon="tail-out"] { display: none !important; }
.message-out, .message-out span.selectable-text { color: var(--ws-out-text) !important; }
.message-in > div > div { background: var(--ws-in) !important; }
.message-out > div > div { background: var(--ws-out) !important; }

/* Unread badges and accent bits */
#pane-side span[aria-label*="unread" i], #pane-side span[aria-label*="ongelezen" i] {
  background: var(--ws-accent) !important; color: var(--ws-bg) !important; }
[data-icon="msg-dblcheck"][aria-label*="Read" i], [data-icon="msg-dblcheck-ack"] { color: var(--ws-accent) !important; }
a, a:visited { color: var(--ws-accent) !important; }
::selection { background: rgba(var(--ws-accent-rgb), .35) !important; }

/* Thin, unobtrusive scrollbars */
::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
::-webkit-scrollbar-thumb { background: rgba(127,127,127,.28) !important; border-radius: 8px !important; border: 2px solid transparent !important; background-clip: padding-box !important; }
::-webkit-scrollbar-thumb:hover { background: rgba(127,127,127,.45) !important; background-clip: padding-box !important; }
::-webkit-scrollbar-track { background: transparent !important; }

/* Menus / popups */
[role="application"] ul[role="menu"], div[role="menu"], [role="dialog"] > div {
  border-radius: 12px !important; }
`;

// Outer padding so the panes float. Kept separate so compact mode can drop it.
const SPACING_CSS = `
#app > div > div[tabindex="-1"] { padding: 10px !important; gap: 10px !important; box-sizing: border-box !important; }
`;

const COMPACT_CSS = `
#pane-side [role="listitem"], #pane-side [role="row"] { height: 60px !important; }
#pane-side [role="listitem"] img, #pane-side [role="row"] img { transform: scale(.88); }
.message-in, .message-out { margin-bottom: 1px !important; }
`;

const HIDE_BACKGROUND_CSS = `
[data-asset-chat-background-dark], [data-asset-chat-background-light] { opacity: 0 !important; background-image: none !important; }
`;

// "Lite mode": kills animations, blur and shadows. These are the main source
// of jank on integrated GPUs / older laptops.
const LITE_CSS = `
*, *::before, *::after {
  animation-duration: 0.001ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important; transition-delay: 0ms !important;
  scroll-behavior: auto !important; }
* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
.message-in > div > div, .message-out > div > div { box-shadow: none !important; }
`;

function buildCss(opts) {
  const t = THEMES[opts.theme] || THEMES.graphite;
  let css = `:root, html, body, body.dark, .dark, #app, #app .dark {\n${variableBlock(t, opts.accent)}\n  color-scheme: ${t.dark ? 'dark' : 'light'} !important;\n}\n`;
  css += LAYOUT_CSS;
  if (!opts.compact) css += SPACING_CSS;
  else css += COMPACT_CSS;
  if (opts.hideBackground) css += HIDE_BACKGROUND_CSS;
  if (opts.lite) css += LITE_CSS;
  return css;
}

module.exports = { THEMES, buildCss };
