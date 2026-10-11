import { Pokemon, Move, BattleState, BattleActionOption, getEffectiveness } from "./pokemonTypes";
import { pokemonAudio } from "./audio";

export const SAMPLE_POKEMON: Record<string, Pokemon> = {
  Pikachu: {
    id: 25,
    name: "Pikachu",
    types: ["Electric"],
    level: 25,
    currentHp: 75,
    maxHp: 75,
    attack: 55,
    defense: 40,
    spAttack: 50,
    spDefense: 50,
    speed: 90,
    moves: [
      { id: "thunderbolt", name: "Thunderbolt", type: "Electric", power: 90, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "A strong electric blast. 2x vs Water & Flying." },
      { id: "quick_attack", name: "Quick Attack", type: "Normal", power: 40, accuracy: 100, pp: 30, maxPp: 30, category: "Physical", description: "Priority normal attack that always strikes first." },
      { id: "iron_tail", name: "Iron Tail", type: "Rock", power: 100, accuracy: 75, pp: 15, maxPp: 15, category: "Physical", description: "Hard tail slam. High power physical strike." },
      { id: "thunder_wave", name: "Thunder Wave", type: "Electric", power: 0, accuracy: 90, pp: 20, maxPp: 20, category: "Status", description: "Paralyzes opponent, slashing speed by 50%." },
    ],
  },
  Charizard: {
    id: 6,
    name: "Charizard",
    types: ["Fire", "Flying"],
    level: 36,
    currentHp: 130,
    maxHp: 130,
    attack: 84,
    defense: 78,
    spAttack: 109,
    spDefense: 85,
    speed: 100,
    moves: [
      { id: "flamethrower", name: "Flamethrower", type: "Fire", power: 90, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "Intense fire blast. 2x vs Grass, Ice, Bug." },
      { id: "air_slash", name: "Air Slash", type: "Flying", power: 75, accuracy: 95, pp: 15, maxPp: 15, category: "Special", description: "Blade of air. 2x vs Fighting, Bug, Grass." },
      { id: "dragon_claw", name: "Dragon Claw", type: "Dragon", power: 80, accuracy: 100, pp: 15, maxPp: 15, category: "Physical", description: "Sharp claws slash opponent. 2x vs Dragon." },
      { id: "slash", name: "Slash", type: "Normal", power: 70, accuracy: 100, pp: 20, maxPp: 20, category: "Physical", description: "Critical hit boosted normal attack." },
    ],
  },
  Blastoise: {
    id: 9,
    name: "Blastoise",
    types: ["Water"],
    level: 36,
    currentHp: 135,
    maxHp: 135,
    attack: 83,
    defense: 100,
    spAttack: 85,
    spDefense: 105,
    speed: 78,
    moves: [
      { id: "hydro_pump", name: "Hydro Pump", type: "Water", power: 110, accuracy: 80, pp: 5, maxPp: 5, category: "Special", description: "Huge water blast. 2x vs Fire, Ground, Rock." },
      { id: "ice_beam", name: "Ice Beam", type: "Ice", power: 90, accuracy: 100, pp: 10, maxPp: 10, category: "Special", description: "Freezing ice beam. 2x vs Grass, Ground, Flying, Dragon." },
      { id: "bite", name: "Bite", type: "Normal", power: 60, accuracy: 100, pp: 25, maxPp: 25, category: "Physical", description: "Vicious bite with flinch chance." },
      { id: "skull_bash", name: "Skull Bash", type: "Normal", power: 130, accuracy: 100, pp: 10, maxPp: 10, category: "Physical", description: "Raises defense then rams with skull." },
    ],
  },
  Pidgeot: {
    id: 18,
    name: "Pidgeot",
    types: ["Normal", "Flying"],
    level: 26,
    currentHp: 85,
    maxHp: 85,
    attack: 80,
    defense: 75,
    spAttack: 70,
    spDefense: 70,
    speed: 101,
    moves: [
      { id: "wing_attack", name: "Wing Attack", type: "Flying", power: 60, accuracy: 100, pp: 35, maxPp: 35, category: "Physical", description: "Large wings strike the target." },
      { id: "quick_attack", name: "Quick Attack", type: "Normal", power: 40, accuracy: 100, pp: 30, maxPp: 30, category: "Physical", description: "Fast priority strike." },
      { id: "gust", name: "Gust", type: "Flying", power: 40, accuracy: 100, pp: 35, maxPp: 35, category: "Special", description: "Wind whirlwind." },
      { id: "feather_dance", name: "Feather Dance", type: "Normal", power: 0, accuracy: 100, pp: 15, maxPp: 15, category: "Status", description: "Drastically lowers target's attack." },
    ],
  },
  Onix: {
    id: 95,
    name: "Onix",
    types: ["Rock", "Ground"],
    level: 28,
    currentHp: 90,
    maxHp: 90,
    attack: 45,
    defense: 160,
    spAttack: 30,
    spDefense: 45,
    speed: 70,
    moves: [
      { id: "rock_throw", name: "Rock Throw", type: "Rock", power: 50, accuracy: 90, pp: 15, maxPp: 15, category: "Physical", description: "Hurls small boulder at opponent." },
      { id: "earthquake", name: "Earthquake", type: "Ground", power: 100, accuracy: 100, pp: 10, maxPp: 10, category: "Physical", description: "Violent tremor. Immune to Electric." },
      { id: "slam", name: "Slam", type: "Normal", power: 80, accuracy: 75, pp: 20, maxPp: 20, category: "Physical", description: "Slams target with long rocky tail." },
      { id: "iron_defense", name: "Iron Defense", type: "Rock", power: 0, accuracy: 100, pp: 15, maxPp: 15, category: "Status", description: "Harden rocky body, sharply boosts defense." },
    ],
  },
  Mario: {
    id: 1001,
    name: "Mario",
    types: ["Fire", "Fighting"],
    level: 50,
    currentHp: 155,
    maxHp: 155,
    attack: 110,
    defense: 85,
    spAttack: 95,
    spDefense: 85,
    speed: 105,
    moves: [
      { id: "fireball", name: "Fireball", type: "Fire", power: 90, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "Bouncing fireball projectile. 2x vs Grass, Ice, Bug." },
      { id: "ground_pound", name: "Ground Pound", type: "Fighting", power: 100, accuracy: 95, pp: 10, maxPp: 10, category: "Physical", description: "Heavy vertical aerial slam. 2x vs Normal, Ice, Rock." },
      { id: "super_star", name: "Starman Blitz", type: "Electric", power: 120, accuracy: 90, pp: 5, maxPp: 5, category: "Special", description: "Invincible high-voltage dash attack. 2x vs Water, Flying." },
      { id: "super_mushroom", name: "Super Mushroom", type: "Grass", power: 0, accuracy: 100, pp: 5, maxPp: 5, category: "Status", description: "Restores 60 HP and boosts Attack power." },
    ],
  },
  SpiderMan: {
    id: 1002,
    name: "Spider-Man",
    types: ["Bug", "Fighting"],
    level: 50,
    currentHp: 145,
    maxHp: 145,
    attack: 105,
    defense: 80,
    spAttack: 85,
    spDefense: 80,
    speed: 125,
    moves: [
      { id: "web_sling", name: "Web Sling", type: "Bug", power: 80, accuracy: 100, pp: 15, maxPp: 15, category: "Physical", description: "Fires web strands to pull and strike. 2x vs Grass, Psychic, Dark." },
      { id: "spidey_strike", name: "Acrobatic Kick", type: "Fighting", power: 95, accuracy: 100, pp: 15, maxPp: 15, category: "Physical", description: "Wall-bounce dynamic strike. 2x vs Normal, Rock, Ice." },
      { id: "spider_sense", name: "Spider-Sense", type: "Psychic", power: 0, accuracy: 100, pp: 10, maxPp: 10, category: "Status", description: "Pre-cognitive danger reflex. Sharply raises defense." },
      { id: "venom_blast", name: "Venom Shock", type: "Electric", power: 90, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "Bio-electric bio-shock surge. 2x vs Water, Flying." },
    ],
  },
  Gengar: {
    id: 94,
    name: "Gengar",
    types: ["Ghost", "Poison"],
    level: 45,
    currentHp: 125,
    maxHp: 125,
    attack: 65,
    defense: 60,
    spAttack: 130,
    spDefense: 75,
    speed: 110,
    moves: [
      { id: "shadow_ball", name: "Shadow Ball", type: "Ghost", power: 80, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "Shadowy dark blob. 2x vs Psychic, Ghost." },
      { id: "sludge_bomb", name: "Sludge Bomb", type: "Poison", power: 90, accuracy: 100, pp: 10, maxPp: 10, category: "Special", description: "Toxic sludge burst. 2x vs Grass." },
      { id: "thunderbolt", name: "Thunderbolt", type: "Electric", power: 90, accuracy: 100, pp: 15, maxPp: 15, category: "Special", description: "Shocking electricity. 2x vs Water, Flying." },
      { id: "confuse_ray", name: "Confuse Ray", type: "Ghost", power: 0, accuracy: 100, pp: 10, maxPp: 10, category: "Status", description: "Sinister ray that confuses opponent." },
    ],
  },
};

export class PokemonBattleEngine {
  public state: BattleState;

  constructor() {
    this.state = this.createInitialBattle("Pikachu", "Pidgeot");
  }

  public createInitialBattle(playerName: string, opponentName: string): BattleState {
    const playerCopy = JSON.parse(JSON.stringify(SAMPLE_POKEMON[playerName] || SAMPLE_POKEMON.Pikachu));
    const opponentCopy = JSON.parse(JSON.stringify(SAMPLE_POKEMON[opponentName] || SAMPLE_POKEMON.Pidgeot));

    return {
      turn: 1,
      playerActive: playerCopy,
      opponentActive: opponentCopy,
      playerParty: [playerCopy],
      opponentParty: [opponentCopy],
      battleMode: "Trainer",
      phase: "SelectAction",
      dialogueText: `What will ${playerCopy.name} do?`,
      lastDamageDealt: 0,
      lastEffectiveness: 1.0,
      isEvaluating: false,
    };
  }

  public getAvailableActionCriteria(): BattleActionOption[] {
    const p = this.state.playerActive;
    const opp = this.state.opponentActive;

    const options: BattleActionOption[] = [];

    // Moves 1 through 4
    p.moves.forEach((move, idx) => {
      const eff = getEffectiveness(move.type, opp.types);
      const actionKey = `MOVE_${idx + 1}` as any;
      let desc = `${move.name} [${move.type}] Pwr: ${move.power}`;

      if (eff >= 2.0) {
        desc += ` • ⭐ SUPER EFFECTIVE (${eff}x damage vs ${opp.types.join("/")})`;
      } else if (eff === 0) {
        desc += ` • ❌ NO EFFECT (0x damage vs ${opp.types.join("/")})`;
      } else if (eff <= 0.5) {
        desc += ` • 🛡️ NOT VERY EFFECTIVE (${eff}x damage)`;
      } else {
        desc += ` • Standard effective (1x)`;
      }

      options.push({
        value: actionKey,
        name: move.name,
        type: move.type,
        power: move.power,
        effectiveness: eff,
        description: desc,
      });
    });

    // Potion Option if HP < 50%
    const hpRatio = p.currentHp / p.maxHp;
    options.push({
      value: "USE_POTION",
      name: "Use Super Potion",
      description: hpRatio < 0.35
        ? "CRITICAL: Restores 50 HP when in red critical health danger."
        : "TACTICAL: Restores 50 HP to active Pokémon.",
    });

    // Run Away Option
    options.push({
      value: "RUN_AWAY",
      name: "Flee Battle",
      description: "Retreat safely from battle engagement.",
    });

    return options;
  }

  public executeTurn(playerAction: string): { playerDamage: number; opponentDamage: number } {
    const p = this.state.playerActive;
    const opp = this.state.opponentActive;
    let playerDmg = 0;
    let oppDmg = 0;

    // 1. Player Action Resolution
    if (playerAction.startsWith("MOVE_")) {
      const moveIdx = parseInt(playerAction.split("_")[1], 10) - 1;
      const move = p.moves[moveIdx] || p.moves[0];

      if (move.power > 0) {
        const eff = getEffectiveness(move.type, opp.types);
        const stab = p.types.includes(move.type) ? 1.5 : 1.0;
        // Gen 1 damage formula approximation
        const base = Math.floor((2 * p.level / 5 + 2) * move.power * (p.attack / opp.defense) / 50 + 2);
        playerDmg = Math.max(1, Math.floor(base * stab * eff));

        opp.currentHp = Math.max(0, opp.currentHp - playerDmg);
        this.state.lastDamageDealt = playerDmg;
        this.state.lastEffectiveness = eff;

        if (eff >= 2.0) {
          pokemonAudio.playSuperEffective();
          this.state.dialogueText = `${p.name} used ${move.name}! It's super effective! (${playerDmg} DMG)`;
        } else {
          pokemonAudio.playTackle();
          this.state.dialogueText = `${p.name} used ${move.name}! Dealt ${playerDmg} DMG!`;
        }
      } else {
        this.state.dialogueText = `${p.name} used ${move.name}! Opponent stat lowered!`;
      }
    } else if (playerAction === "USE_POTION") {
      const heal = Math.min(50, p.maxHp - p.currentHp);
      p.currentHp += heal;
      this.state.dialogueText = `Used Potion! ${p.name} restored ${heal} HP!`;
      pokemonAudio.playSuperEffective();
    } else if (playerAction === "RUN_AWAY") {
      this.state.dialogueText = `Got away safely!`;
      return { playerDamage: 0, opponentDamage: 0 };
    }

    // Check Opponent Faint
    if (opp.currentHp <= 0) {
      this.state.phase = "Victory";
      this.state.dialogueText = `Foe ${opp.name} fainted! Autonomous AI won the battle! 🏆`;
      pokemonAudio.playVictory();
      return { playerDamage: playerDmg, opponentDamage: 0 };
    }

    // 2. Opponent Counter-Attack
    const oppMove = opp.moves[Math.floor(Math.random() * opp.moves.length)] || opp.moves[0];
    if (oppMove.power > 0) {
      const oppEff = getEffectiveness(oppMove.type, p.types);
      const baseOpp = Math.floor((2 * opp.level / 5 + 2) * oppMove.power * (opp.attack / p.defense) / 50 + 2);
      oppDmg = Math.max(1, Math.floor(baseOpp * oppEff));
      p.currentHp = Math.max(0, p.currentHp - oppDmg);

      if (p.currentHp <= 0) {
        this.state.phase = "Defeat";
        this.state.dialogueText = `${p.name} fainted! You blacked out... 💀`;
        pokemonAudio.playFaint();
      }
    }

    this.state.turn++;
    return { playerDamage: playerDmg, opponentDamage: oppDmg };
  }
}
