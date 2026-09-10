export type FighterId =
  | "hartz"
  | "petoux"
  | "nexmos"
  | "kavaleur"
  | "korsair";

export type FighterStats = {
  strength: number;
  vitality: number;
  speed: number;
  defense: number;
};

export type FighterSpecial = {
  name: string;
  damageMultiplier: number;
  cooldownMs: number;
  description: string;
};

export type FighterDefinition = {
  id: FighterId;
  name: string;
  title: string;
  archetype: string;
  tagline: string;
  visualNote: string;
  stats: FighterStats;
  special: FighterSpecial;
};

export type CombatAction = "attack" | "defend" | "dodge" | "special";
