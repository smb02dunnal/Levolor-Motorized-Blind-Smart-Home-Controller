# Bill of Materials (BOM)

Complete parts list for the Arduino IoT Blinds Controller PCB.

## Summary
- **MCU:** Seeed XIAO ESP32-C3
- **Power:** USB-C input with BQ25886 battery charger + TPS62152 buck converter
- **Logic Level:** BSS138 MOSFETs for 3.3V ↔ 5V shifting

## Component List

| # | Qty | Designator | Value | Package | Manufacturer | Part Number | LCSC |
|---|-----|------------|-------|---------|--------------|-------------|------|
| 1 | 1 | C1 | 47µF | C0805 | TDK | C2012X5R1A476MTJ00E | C76636 |
| 2 | 1 | C2 | 3.3nF | C0603 | Samsung | CL10B332KB8NNNC | C1613 |
| 3 | 1 | C3 | 22µF | C0603 | — | — | — |
| 4 | 2 | C4, C7 | 4.7µF | C0603 | — | — | — |
| 5 | 2 | C5, C10 | 10µF | C0603 | Samsung | CL10A106KP8NNNC | C19702 |
| 6 | 1 | C6 | 47nF | C0603 | Samsung | CL10B473KB8NNNC | C1622 |
| 7 | 1 | C8 | 10µF | C0603 | Samsung | CL10A106KP8NNND | C307458 |
| 8 | 1 | L1 | 2.2µH | 3.0×3.0mm | Murata | LQH3NPN2R2MMEL | C668451 |
| 9 | 1 | L2 | 1.5µH | 2.5×2.0mm | KOHERelec | SPM2512-1R5M | C2761859 |
| 10 | 3 | Q1, Q4, Q5 | BSS138 | SOT-23 | LJ | — | C18195371 |
| 11 | 1 | R1 | 100kΩ | R0603 | — | — | — |
| 12 | 1 | R2 | 330Ω | R0603 | UNI-ROYAL | 0603WAF1001T5E | — |
| 13 | 1 | R3 | 3.9kΩ | R0603 | UNI-ROYAL | 0603WAF3901T5E | C23018 |
| 14 | 1 | R4 | 220kΩ | R0603 | UNI-ROYAL | 0603WAF1503T5E | — |
| 15 | 2 | R5, R6 | 2.2kΩ | R0603 | — | — | — |
| 16 | 2 | R8, R9 | 22kΩ | R0603 | — | — | — |
| 17 | 3 | R10, R11, R12 | 1kΩ | R0603 | — | — | — |
| 18 | 4 | SW1, SW4, SW5, SW6 | Tactile Switch | 6.0×3.3mm | XKB | TS-1101-C-W | C318938 |
| 19 | 1 | U3 | TPS62152RGTR | QFN-16 | Texas Instruments | TPS62152RGTR | C2070611 |
| 20 | 1 | U4 | XIAO ESP32-C3 | Module | Seeed | XIAO ESP32C3 | C19189385 |
| 21 | 1 | U5 | BQ25886RGER | QFN-24 | Texas Instruments | BQ25886RGER | C2765094 |
| 22 | 1 | U6 | Green LED | 0402 | YONGYUTAI | YLED0402G | C20608784 |
| 23 | 1 | U7 | Red LED | 0402 | YONGYUTAI | YLED0402R | C21260817 |
| 24 | 1 | USB1 | Micro-USB | SMD | G-Switch | GT-USB-6008A | C2762988 |

## Key ICs

### BQ25886 — Battery Charger
- 1S Li-Ion/Li-Po battery charger
- I²C programmable
- USB-C compatible input
- Handles charge management, thermal regulation

### TPS62152 — Buck Converter  
- 3.3V output for ESP32
- High efficiency (>90%)
- 1A output capability
- Low quiescent current for battery life

### XIAO ESP32-C3 — Microcontroller
- RISC-V core
- WiFi + BLE
- Ultra low power modes
- Arduino IDE compatible

## Ordering

All components available from [LCSC](https://www.lcsc.com/). Use the LCSC part numbers above for easy ordering.

The PCB can be ordered from JLCPCB, PCBWay, or similar services using the Gerber files in `/hardware/gerber/`.
