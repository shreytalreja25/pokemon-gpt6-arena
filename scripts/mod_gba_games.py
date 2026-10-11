#!/usr/bin/env python3
"""
Comprehensive GBA Binary ROM Modder & Reverse Engineering Tool
Directly patches the real GBA cartridge files (.gba) in Downloads:
1. Pokemon LeafGreen (USA v1.1) -> Crossover Mod (Mario, Spider-Man, Bowser, Route 1 Wilds, Dialogue, Stats, Moves)
2. Classic NES Series - Super Mario Bros -> Spidey HUD & Infinite Lives Mod
"""

import os
import shutil

LEAFGREEN_INPUT = r"C:\Users\shrey\Downloads\Pokemon - Leaf Green Version (U) (V1.1)\Pokemon - Leaf Green Version (U) (V1.1).gba"
LEAFGREEN_OUTPUT = r"C:\Users\shrey\Downloads\Pokemon - Leaf Green Version (U) (V1.1)\LeafGreen_Modded.gba"
LEAFGREEN_WEB = r"c:\Users\shrey\2026\opensource\pokemon-gpt6-arena\public\roms\LeafGreen_Modded.gba"

MARIO_INPUT = r"C:\Users\shrey\Downloads\Classic\Classic NES Series - Super Mario Bros. (USA, Europe).gba"
MARIO_OUTPUT = r"C:\Users\shrey\Downloads\Classic\Super_Mario_Modded.gba"

def encode_gen3_text(text: str, max_len: int = None) -> bytes:
    table = {
        ' ': 0x00, '!': 0xAB, '?': 0xAC, ',': 0xB8, '.': 0xAD, '\'': 0xB4, '-': 0xE3, '\n': 0xFE
    }
    for i in range(26):
        table[chr(ord('A') + i)] = 0xBB + i
        table[chr(ord('a') + i)] = 0xD5 + i
    for i in range(10):
        table[chr(ord('0') + i)] = 0xA1 + i

    res = []
    for ch in text:
        res.append(table.get(ch, 0x00))
    if max_len is not None:
        while len(res) < max_len:
            res.append(0xFF)
        return bytes(res[:max_len])
    else:
        res.append(0xFF)
        return bytes(res)

def fix_gba_header_checksum(rom: bytearray):
    chk = 0
    for i in range(0x00A0, 0x00BD):
        chk = (chk - rom[i]) & 0xFF
    chk = (chk - 0x19) & 0xFF
    rom[0x00BD] = chk
    return chk

def mod_pokemon_leafgreen():
    if not os.path.exists(LEAFGREEN_INPUT):
        print(f"LeafGreen ROM not found at {LEAFGREEN_INPUT}")
        return

    print("=== Modding Pokemon LeafGreen GBA Binary ===")
    with open(LEAFGREEN_INPUT, "rb") as f:
        rom = bytearray(f.read())

    # 1. Header Title
    rom[0x00A0:0x00AC] = b"PKMN MARIO\x00\x00"
    print("1. Cartridge Header Title -> 'PKMN MARIO'")

    # 2. Pokémon Names Table (0x245F37, 11 bytes per Pokémon)
    # 0 = Bulbasaur -> MARIO
    # 3 = Charmander -> SPIDER-MAN
    # 6 = Squirtle   -> BOWSER
    # 24 = Pikachu   -> PIKACHU-EX
    # 149 = Mewtwo   -> MEWTWO-EX
    renames = [
        (0, "MARIO"),
        (3, "SPIDER-MAN"),
        (6, "BOWSER"),
        (24, "PIKACHU-EX"),
        (149, "MEWTWO-EX"),
    ]
    for idx, name in renames:
        offset = 0x245F37 + (idx * 11)
        rom[offset:offset+11] = encode_gen3_text(name, 11)
        print(f"2. Renamed #{idx+1} at 0x{offset:X} -> {name}")

    # 3. Base Stats Table (0x2547EC, 28 bytes per entry)
    # Types: Normal=0, Fighting=1, Flying=2, Poison=3, Ground=4, Rock=5, Bug=6, Ghost=7,
    #        Fire=10, Water=11, Grass=12, Electric=13, Psychic=14, Ice=15, Dragon=16
    stats = [
        # Mario (Bulbasaur): Fire/Fighting, BST 580
        (0, {"hp": 95, "atk": 120, "def": 90, "spd": 115, "spatk": 90, "spdef": 70, "t1": 10, "t2": 1, "catch": 255}),
        # Spider-Man (Charmander): Bug/Fighting, BST 580
        (3, {"hp": 90, "atk": 115, "def": 85, "spd": 130, "spatk": 85, "spdef": 75, "t1": 6, "t2": 1, "catch": 255}),
        # Bowser (Squirtle): Dragon/Fire, BST 600
        (6, {"hp": 115, "atk": 135, "def": 125, "spd": 65, "spatk": 90, "spdef": 70, "t1": 16, "t2": 10, "catch": 255}),
        # Pikachu-EX: Electric/Fighting, BST 540
        (24, {"hp": 75, "atk": 95, "def": 65, "spd": 125, "spatk": 105, "spdef": 75, "t1": 13, "t2": 1, "catch": 255}),
    ]
    for idx, s in stats:
        off = 0x2547EC + (idx * 28)
        rom[off+0] = s["hp"]
        rom[off+1] = s["atk"]
        rom[off+2] = s["def"]
        rom[off+3] = s["spd"]
        rom[off+4] = s["spatk"]
        rom[off+5] = s["spdef"]
        rom[off+6] = s["t1"]
        rom[off+7] = s["t2"]
        rom[off+8] = s["catch"]
        print(f"3. Base Stats patched for #{idx+1} -> HP {s['hp']}, Atk {s['atk']}, Speed {s['spd']}")

    # 4. Buff Starter Moves (0x250C50, 12 bytes per move)
    buffs = [
        (1, "Pound", 75, 100),
        (10, "Scratch", 75, 100),
        (33, "Tackle", 75, 100),
        (52, "Ember", 90, 100),
        (55, "Water Gun", 90, 100),
        (22, "Vine Whip", 85, 100),
        (85, "Thunderbolt", 110, 100),
        (5, "Mega Punch", 120, 100),
    ]
    for m_id, m_name, pwr, acc in buffs:
        off = 0x250C50 + (m_id * 12)
        rom[off + 1] = pwr
        rom[off + 3] = acc
        print(f"4. Buffed move #{m_id} ({m_name}) -> Power {pwr}, Acc {acc}%")

    # 5. Route 1 Wild Encounters (0x3C8D1C, 12 slots of [min_lvl, max_lvl, species_id_lo, species_id_hi])
    # Make Route 1 wild grass spawn Mario, Spider-Man, Bowser, Pikachu, and Mewtwo!
    wild_replacements = [
        (0, 3, 5, 1),    # Slot 0: Lvl 3-5 Mario (Bulbasaur slot)
        (1, 3, 5, 4),    # Slot 1: Lvl 3-5 Spider-Man (Charmander slot)
        (2, 3, 5, 7),    # Slot 2: Lvl 3-5 Bowser (Squirtle slot)
        (3, 4, 6, 25),   # Slot 3: Lvl 4-6 Pikachu-EX
        (4, 5, 7, 150),  # Slot 4: Lvl 5-7 Mewtwo-EX
        (5, 3, 5, 1),    # Slot 5: Mario
        (6, 3, 5, 4),    # Slot 6: Spider-Man
        (7, 3, 5, 7),    # Slot 7: Bowser
    ]
    for slot_idx, min_l, max_l, sp_id in wild_replacements:
        off = 0x3C8D1C + (slot_idx * 4)
        rom[off + 0] = min_l
        rom[off + 1] = max_l
        rom[off + 2] = sp_id & 0xFF
        rom[off + 3] = (sp_id >> 8) & 0xFF
        print(f"5. Route 1 Wild Slot {slot_idx} -> Species #{sp_id} (Lvl {min_l}-{max_l})")

    # 6. Oak Intro Dialogue Patch (0x1C5CC4)
    # Original: "Hello, there!\nGlad to meet you!\nWelcome to the world of POK[1B]MON!\nMy name is OAK.\nPeople affectionately refer to me\nas the POK[1B]MON PROFESSOR.\xFF"
    # Length of original block: 165 bytes
    custom_oak_intro = (
        "Hello, player!\n"
        "Welcome to the GBA Crossover Mod!\n"
        "I am PROFESSOR OAK.\n"
        "Choose MARIO, SPIDEY, or BOWSER\n"
        "to conquer the Kanto region!"
    )
    encoded_dialogue = encode_gen3_text(custom_oak_intro)
    if len(encoded_dialogue) <= 165:
        rom[0x1C5CC4 : 0x1C5CC4 + len(encoded_dialogue)] = encoded_dialogue
        # pad remaining with 0xFF terminator
        for p in range(0x1C5CC4 + len(encoded_dialogue), 0x1C5CC4 + 165):
            rom[p] = 0xFF
        print(f"6. Oak Intro Dialogue patched at 0x1C5CC4 ({len(encoded_dialogue)} bytes)")

    # 7. Starter Choice Dialogue in Oak's Lab
    # Charmander dialogue at 0x18E1EC: "Ah! CHARMANDER is your choice." -> "Ah! SPIDER-MAN is your choice."
    spidey_dlg = encode_gen3_text("Ah! SPIDER-MAN is your choice.\nGreat power and responsibility!\nClaim the HERO SPIDER-MAN?")
    rom[0x18E1EC : 0x18E1EC + len(spidey_dlg)] = spidey_dlg
    rom[0x18E1EC + len(spidey_dlg)] = 0xFF

    # Squirtle dialogue at 0x18E25F: "Hm! SQUIRTLE is your choice." -> "Hm! BOWSER is your choice."
    bowser_dlg = encode_gen3_text("Hm! BOWSER is your choice.\nKing of the Koopas is yours!\nClaim the BEAST BOWSER?")
    rom[0x18E25F : 0x18E25F + len(bowser_dlg)] = bowser_dlg
    rom[0x18E25F + len(bowser_dlg)] = 0xFF

    # Bulbasaur dialogue at 0x18E2CD: "I see! BULBASAUR is your choice." -> "I see! MARIO is your choice."
    mario_dlg = encode_gen3_text("I see! MARIO is your choice.\nSuper Mario stomps all foes!\nClaim the HERO MARIO?")
    rom[0x18E2CD : 0x18E2CD + len(mario_dlg)] = mario_dlg
    rom[0x18E2CD + len(mario_dlg)] = 0xFF
    print("7. Oak's Lab Starter Choice dialogues patched (Mario, Spidey, Bowser)")

    # 8. Recalculate Complement Checksum
    chk = fix_gba_header_checksum(rom)
    print(f"8. GBA Complement Checksum updated: 0x{chk:02X}")

    # Write output files
    with open(LEAFGREEN_OUTPUT, "wb") as f:
        f.write(rom)
    print(f"\n[OK] LeafGreen mod written to: {LEAFGREEN_OUTPUT}")

    os.makedirs(os.path.dirname(LEAFGREEN_WEB), exist_ok=True)
    shutil.copyfile(LEAFGREEN_OUTPUT, LEAFGREEN_WEB)
    print(f"[OK] LeafGreen copied to web directory: {LEAFGREEN_WEB}")

def mod_mario_gba():
    if not os.path.exists(MARIO_INPUT):
        print(f"Mario GBA ROM not found at {MARIO_INPUT}")
        return

    print("\n=== Modding Classic NES Super Mario Bros GBA Binary ===")
    with open(MARIO_INPUT, "rb") as f:
        rom = bytearray(f.read())

    # 1. Cartridge Header Title
    rom[0x00A0:0x00AC] = b"SPIDER MARIO"
    print("1. Cartridge Header Title -> 'SPIDER MARIO'")

    # 2. Modify NES HUD text from 'MARIO' to 'SPIDEY'
    # Tile mapping: S=0x1C, P=0x19, I=0x12, D=0x0D, E=0x0E, Y=0x22 (or 'SUPER': S=0x1C, U=0x1E, P=0x19, E=0x0E, R=0x1B)
    # Original 'MARIO' tiles: [0x16, 0x0A, 0x1B, 0x12, 0x18] (length 5)
    # Let's replace with 'SPIDER' (6 chars) or 'SPIDY' (5 chars) or 'SUPER' (5 chars)
    # 'SUPER': [0x1C, 0x1E, 0x19, 0x0E, 0x1B]
    super_tiles = bytes([0x1C, 0x1E, 0x19, 0x0E, 0x1B])
    offsets = [0x183BA, 0x1183BA, 0x2183BA, 0x3183BA]
    for off in offsets:
        rom[off : off + 5] = super_tiles
        print(f"2. Patched HUD header at 0x{off:X} -> 'SUPER'")

    # 3. Infinite Lives Patch:
    # At 0x98DA1 (and mirrors), instruction 'DEC $075A' is 'CE 5A 07'.
    # Replace with 'NOP NOP NOP' ('EA EA EA')
    dec_offsets = [0x98DA1, 0x198DA1, 0x298DA1, 0x398DA1]
    for off in dec_offsets:
        if rom[off:off+3] == b"\xCE\x5A\x07":
            rom[off:off+3] = b"\xEA\xEA\xEA"
            print(f"3. Infinite Lives NOP patch applied at 0x{off:X}")

    # 4. Recalculate GBA Complement Checksum
    chk = fix_gba_header_checksum(rom)
    print(f"4. GBA Complement Checksum updated: 0x{chk:02X}")

    # Write output file
    with open(MARIO_OUTPUT, "wb") as f:
        f.write(rom)
    print(f"\n[OK] Super Mario mod written to: {MARIO_OUTPUT}")

if __name__ == "__main__":
    mod_pokemon_leafgreen()
    mod_mario_gba()
