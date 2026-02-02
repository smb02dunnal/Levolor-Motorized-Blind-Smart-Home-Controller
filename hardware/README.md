# Hardware Documentation

Custom PCB design for the Arduino IoT Blinds Controller — a low-power, battery-operated ESP32 board that controls motorized window blinds via Arduino IoT Cloud.

## Design Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   USB-C ──▶ BQ25886 ──▶ Battery ──▶ TPS62152 ──▶ 3.3V     │
│              (charger)              (buck)                  │
│                                                             │
│   XIAO ESP32-C3 ◀──▶ BSS138 Level Shifters ──▶ Motor       │
│        │                                        Driver      │
│        │                                                    │
│        └──▶ WiFi ──▶ Arduino IoT Cloud                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Ultra-low power:** Designed for battery operation with efficient power management
- **USB-C charging:** BQ25886 handles Li-Ion/Li-Po battery charging
- **WiFi connectivity:** ESP32-C3 connects to Arduino IoT Cloud
- **Level shifting:** BSS138 MOSFETs for interfacing with 5V motor drivers
- **Compact:** Uses Seeed XIAO module to minimize PCB size
- **Tactile buttons:** 4 switches for manual up/down control

## Directory Structure

```
hardware/
├── README.md           # This file
├── gerber/             # PCB manufacturing files
│   ├── Gerber_*.G*     # Copper, silkscreen, solder mask layers
│   ├── Drill_*.DRL     # Drill files (PTH, NPTH, vias)
│   └── How-to-order-PCB.txt
└── docs/
    └── BOM.md          # Bill of Materials with LCSC part numbers
```

## Manufacturing

### PCB Specs
- **Layers:** 2
- **Thickness:** 1.6mm (standard)
- **Surface finish:** HASL or ENIG
- **Minimum trace:** Check Gerber for specifics

### Ordering PCBs
1. Zip the contents of `/gerber/`
2. Upload to [JLCPCB](https://jlcpcb.com), [PCBWay](https://pcbway.com), or similar
3. Select specs (2-layer, 1.6mm, green solder mask typical)
4. Order! (Usually $2-5 for 5 boards)

### Ordering Components
All parts available from [LCSC](https://lcsc.com). See [BOM.md](docs/BOM.md) for part numbers.

## Assembly Notes

1. **Start with SMD components** — Solder smallest parts first (0402 LEDs, 0603 passives)
2. **ICs next** — BQ25886, TPS62152 (both QFN, need hot air or reflow)
3. **Through-hole last** — Switches, USB connector
4. **XIAO module** — Solder headers or direct-solder the module

### Tools Needed
- Soldering iron with fine tip
- Hot air station (for QFN packages) OR solder paste + reflow
- Flux
- Fine tweezers
- Magnification (loupe or microscope)

## Firmware

See the main project [README](../README.md) for the bridge software. The ESP32 firmware that runs on this board connects to Arduino IoT Cloud — Arduino sketch coming soon in Phase 3.

## License

Hardware designs released under [CERN-OHL-P v2](https://ohwr.org/cern_ohl_p_v2.txt) (Permissive).
