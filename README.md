# New Tab Widgets - Time & Dashboard

Replace your Chrome new tab with a beautiful dashboard featuring live clocks, world time zones, and customizable widgets.

## Features

- **Primary Clock** — Large, centered clock with real-time updates
- **Regional Clocks** — Add multiple world clocks for any timezone (40+ supported)
- **Customizable Settings** — Toggle 12/24-hour format, show/hide seconds and date
- **Export & Import** — Backup your configuration as JSON and restore it on another profile
- **Dark Theme** — Modern glassmorphism design with smooth animations
- **Responsive** — Looks great on any screen size

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/mowaisnizami/new-tab-widgets.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `tab-dashboard` folder

5. Open a new tab — your new dashboard is ready

### Configuration

Click the gear icon (top-right) to open settings:

| Setting | Description |
|---------|-------------|
| Time Format | Switch between 24-hour and 12-hour (AM/PM) |
| Show Seconds | Toggle seconds display on all clocks |
| Show Date | Toggle date display below each clock |
| Export Config | Download your settings as a JSON file |
| Import Config | Restore settings from a previously exported file |
| Reset | Clear all settings and regional clocks |

## Project Structure

```
tab-dashboard/
├── manifest.json      # Chrome extension manifest (V3)
├── newtab.html        # Main new tab page
├── newtab.js          # Clock logic, config management, import/export
├── styles.css         # Dark theme styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Bootstrap 5.3
- Bootstrap Icons
- Chrome Storage API

## License

MIT
