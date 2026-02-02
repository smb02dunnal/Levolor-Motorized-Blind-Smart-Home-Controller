# EasyEDA Project Files

Source files for schematic and PCB layout. Open with [EasyEDA](https://easyeda.com/) (free online EDA tool).

## Contents

| Folder | Description |
|--------|-------------|
| `SHEET/` | Schematic sheets |
| `PCB/` | PCB layout |
| `SYMBOL/` | Component schematic symbols |
| `FOOTPRINT/` | Component PCB footprints |
| `project.json` | Project metadata |

## How to Open

### Option 1: Import to EasyEDA Online
1. Go to [easyeda.com](https://easyeda.com/)
2. Create/login to account
3. File → Import → EasyEDA Pro Project
4. Select this folder or zip it first

### Option 2: EasyEDA Pro Desktop
1. Download [EasyEDA Pro](https://easyeda.com/page/download)
2. File → Open Project
3. Navigate to this folder

## Project Structure

- **Schematic1** — Main circuit schematic
- **PCB1** — 2-layer PCB layout

## Modifying the Design

Feel free to fork and modify! Some ideas:
- Add more GPIO breakout pins
- Adjust battery connector footprint
- Add status LEDs
- Change to different ESP32 module

## Exporting

From EasyEDA you can export:
- **Gerber files** (for PCB manufacturing)
- **BOM** (bill of materials)
- **Pick & Place** (for assembly houses)
- **PDF** (schematic documentation)
