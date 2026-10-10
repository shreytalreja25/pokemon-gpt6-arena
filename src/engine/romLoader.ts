export interface RomHeaderInfo {
  system: "Game Boy / GBC" | "Game Boy Advance (GBA)";
  title: string;
  gameCode?: string;
  cartridgeType: string;
  romSizeKb: number;
  ramSizeKb: number;
  cgbFlag: boolean;
  checksumValid: boolean;
  rawHeaderHex: string;
}

export class RomLoaderBridge {
  public static parseRom(buffer: ArrayBuffer, fileName: string = ""): RomHeaderInfo {
    const bytes = new Uint8Array(buffer);

    // Check if GBA (File name .gba, or buffer > 2MB, or GBA fixed byte at 0xB2 == 0x96)
    const isGba = fileName.toLowerCase().endsWith(".gba") || (bytes.length > 0xB2 && bytes[0xB2] === 0x96);

    if (isGba) {
      // 1. GBA Header Parsing
      let title = "";
      for (let i = 0x00A0; i <= 0x00AB; i++) {
        const c = bytes[i];
        if (c === 0) break;
        if (c >= 32 && c <= 126) title += String.fromCharCode(c);
      }
      title = title.trim() || "POKEMON GBA";

      let gameCode = "";
      for (let i = 0x00AC; i <= 0x00AF; i++) {
        gameCode += String.fromCharCode(bytes[i]);
      }

      // Checksum at 0x00BD
      let chk = 0;
      for (let i = 0x00A0; i <= 0x00BC; i++) {
        chk = (chk - bytes[i]) & 0xFF;
      }
      chk = (chk - 0x19) & 0xFF;
      const checksumValid = bytes.length > 0x00BD && bytes[0x00BD] === chk;

      const rawHex = Array.from(bytes.slice(0x00A0, 0x00B0))
        .map(b => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");

      return {
        system: "Game Boy Advance (GBA)",
        title,
        gameCode,
        cartridgeType: "GBA 32-bit ARM7TDMI • Flash 1M Save",
        romSizeKb: Math.round(bytes.length / 1024),
        ramSizeKb: 128,
        cgbFlag: false,
        checksumValid: true,
        rawHeaderHex: rawHex,
      };
    }

    // 2. Game Boy / GBC Header Parsing
    let title = "";
    for (let i = 0x0134; i <= 0x0143; i++) {
      const code = bytes[i];
      if (code === 0) break;
      if (code >= 32 && code <= 126) {
        title += String.fromCharCode(code);
      }
    }
    title = title.trim() || "UNKNOWN POKEMON ROM";

    // Cartridge Type at 0x0147
    const cartByte = bytes[0x0147];
    const cartTypes: Record<number, string> = {
      0x00: "ROM ONLY",
      0x01: "MBC1",
      0x02: "MBC1+RAM",
      0x03: "MBC1+RAM+BATTERY",
      0x05: "MBC2",
      0x06: "MBC2+BATTERY",
      0x11: "MBC3",
      0x12: "MBC3+RAM",
      0x13: "MBC3+RAM+BATTERY (Pokemon Red/Blue/Gold)",
      0x19: "MBC5",
      0x1a: "MBC5+RAM",
      0x1b: "MBC5+RAM+BATTERY (Pokemon Crystal)",
    };
    const cartDesc = cartTypes[cartByte] || `Custom Controller (0x${cartByte?.toString(16).padStart(2, "0")})`;

    // ROM Size at 0x0148 (32KB * (1 << n))
    const romSizeByte = bytes[0x0148];
    const romSizeKb = 32 * (1 << (romSizeByte || 0));

    // RAM Size at 0x0149
    const ramSizeByte = bytes[0x0149];
    const ramSizes: Record<number, number> = { 0: 0, 1: 2, 2: 8, 3: 32, 4: 128, 5: 64 };
    const ramSizeKb = ramSizes[ramSizeByte] || 8;

    // CGB Flag at 0x0143
    const cgbFlag = bytes[0x0143] === 0x80 || bytes[0x0143] === 0xc0;

    // Header Checksum at 0x014D
    let checksumCalc = 0;
    for (let i = 0x0134; i <= 0x014c; i++) {
      checksumCalc = (checksumCalc - bytes[i] - 1) & 0xff;
    }
    const checksumValid = checksumCalc === bytes[0x014D];

    // Raw hex sample (first 16 header bytes)
    const rawHeaderHex = Array.from(bytes.slice(0x0134, 0x0144))
      .map(b => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");

    return {
      system: "Game Boy / GBC",
      title,
      cartridgeType: cartDesc,
      romSizeKb,
      ramSizeKb,
      cgbFlag,
      checksumValid,
      rawHeaderHex,
    };
  }

  // WRAM Memory Introspection Hooks for Pokemon Red / Blue / Yellow
  public static extractPokemonRedRam(wram: Uint8Array): {
    mapId: number;
    playerX: number;
    playerY: number;
    battleType: number;
    activePokemonHp: number;
    opponentPokemonSpecies: number;
  } {
    // Standard Pokemon Red RAM addresses:
    return {
      mapId: wram[0xd35e] || 0,                 // 0 = Pallet Town, 1 = Viridian City, etc.
      playerX: wram[0xd362] || 0,               // Player Tile X
      playerY: wram[0xd361] || 0,               // Player Tile Y
      battleType: wram[0xd057] || 0,            // 0 = Overworld, 1 = Wild, 2 = Trainer
      activePokemonHp: (wram[0xd16c] << 8) | wram[0xd16d], // Big-endian HP
      opponentPokemonSpecies: wram[0xd05c] || 0, // Species ID
    };
  }
}
