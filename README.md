# Shell for WhatsApp

A fast, good-looking Windows app for WhatsApp. It runs the official
WhatsApp Web inside a lightweight window and gives it a new design. Your
account, messages and encryption stay exactly as they are in WhatsApp itself.

> Not affiliated with WhatsApp or Meta.

## Download the EXE

1. Open the **Actions** tab of this repository, then the latest **Build Windows EXE** run.
2. Download the **whatsapp-shell-windows** file at the bottom of the run and unzip it.
3. Pick one:
   - `Shell for WhatsApp Setup x.y.z.exe`: installs the app with a Start-menu shortcut.
   - `Shell for WhatsApp x.y.z.exe`: portable version that runs without installing.
4. Scan the QR code with your phone once (WhatsApp → Linked devices). You stay logged in after that.

Windows SmartScreen may warn the first time because the EXE is not code-signed:
click **More info → Run anyway**.

To publish a proper release with the EXE attached, push a tag like `v1.0.0`.

## Features

- **5 themes**: Graphite, Midnight, OLED black, Paper, Mist, plus 8 accent colors (menu **Theme**).
- **New look**: rounded floating panels, cleaner chat list, rounder message bubbles with no tails, chat wallpaper hidden, thin scrollbars.
- **Lite mode** (`Ctrl+Shift+L`): turns off all animations, blur and shadows. Use this on slow laptops.
- **Hardware acceleration toggle**: turn it off if the window flickers or freezes (often an old graphics driver).
- **Recovers from freezes**: if WhatsApp hangs or crashes, you can reload, or it reloads itself.
- **Fix loading problems**: clears the cache when WhatsApp gets stuck loading. You stay logged in.
- Tray icon with an unread count, the taskbar flashes when a new message arrives, close-to-tray, start with Windows.
- Spell check, external links open in your normal browser, and the app remembers its size and zoom (`Ctrl +/-/0`).
- **Custom CSS**: **Theme → Edit custom CSS…** for your own tweaks.

The menu bar is hidden. Press **Alt** to show it.

## Develop

```
npm install
npm start          # run the app
npm run dist:win   # build the EXE (on Windows)
```

Code layout: `src/main.js` (window, menus, tray), `src/themes.js` (themes and styling), `src/settings.js`.
