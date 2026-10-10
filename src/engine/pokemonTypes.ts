export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon";

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  category: "Physical" | "Special" | "Status";
  description: string;
}

export interface Pokemon {
  id: number;
  name: string;
  types: PokemonType[];
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  moves: Move[];
  frontSprite?: string;
  backSprite?: string;
}

export type BattleAction =
  | "MOVE_1"
  | "MOVE_2"
  | "MOVE_3"
  | "MOVE_4"
  | "SWITCH_POKEMON"
  | "USE_POTION"
  | "THROW_POKEBALL"
  | "RUN_AWAY";

export interface BattleActionOption {
  value: BattleAction;
  name: string;
  type?: PokemonType;
  power?: number;
  effectiveness?: number;
  description: string;
}

export interface BattleState {
  turn: number;
  playerActive: Pokemon;
  opponentActive: Pokemon;
  playerParty: Pokemon[];
  opponentParty: Pokemon[];
  battleMode: "Wild" | "Trainer" | "GymLeader";
  phase: "SelectAction" | "ExecutingPlayer" | "ExecutingOpponent" | "Victory" | "Defeat";
  dialogueText: string;
  lastDamageDealt: number;
  lastEffectiveness: number;
  isEvaluating: boolean;
}

export interface DecisionResponse {
  chosenAction: BattleAction;
  confidence: number;
  latencyMs: number;
  model: string;
  reasoning: string;
  probabilities?: Record<string, number>;
  costUsd?: number;
  rawRequest?: any;
  rawResponse?: any;
}

export const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Normal: { Rock: 0.5, Ghost: 0 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2.0, Ice: 2.0, Bug: 2.0, Rock: 0.5, Dragon: 0.5 },
  Water: { Fire: 2.0, Water: 0.5, Grass: 0.5, Ground: 2.0, Rock: 2.0, Dragon: 0.5 },
  Electric: { Water: 2.0, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2.0, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2.0, Grass: 0.5, Poison: 0.5, Ground: 2.0, Flying: 0.5, Bug: 0.5, Rock: 2.0, Dragon: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2.0, Ice: 0.5, Ground: 2.0, Flying: 2.0, Dragon: 2.0 },
  Fighting: { Normal: 2.0, Ice: 2.0, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2.0, Ghost: 0 },
  Poison: { Grass: 2.0, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5 },
  Ground: { Fire: 2.0, Electric: 2.0, Grass: 0.5, Poison: 2.0, Flying: 0, Bug: 0.5, Rock: 2.0 },
  Flying: { Electric: 0.5, Grass: 2.0, Fighting: 2.0, Bug: 2.0, Rock: 0.5 },
  Psychic: { Fighting: 2.0, Poison: 2.0, Psychic: 0.5 },
  Bug: { Fire: 0.5, Grass: 2.0, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2.0, Ghost: 0.5 },
  Rock: { Fire: 2.0, Ice: 2.0, Fighting: 0.5, Ground: 0.5, Flying: 2.0, Bug: 2.0 },
  Ghost: { Normal: 0, Psychic: 2.0, Ghost: 2.0 },
  Dragon: { Dragon: 2.0 },
};

export function getEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  let mult = 1.0;
  for (const dt of defenderTypes) {
    const chart = TYPE_CHART[attackType];
    if (chart && chart[dt] !== undefined) {
      mult *= chart[dt]!;
    }
  }
  return mult;
}
