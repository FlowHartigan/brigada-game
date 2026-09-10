import type { FighterDefinition, FighterId } from "@/game/engine/types";

export const fighters: readonly FighterDefinition[] = [
  {
    id: "hartz",
    name: "HARTZ",
    title: "HIGH VOLTAGE",
    archetype: "Fast all-rounder",
    tagline: "Change le rythme avant que l'autre ne puisse s'adapter.",
    visualNote:
      "Veste côtelée gris/noir, t-shirt noir, chaîne argentée, avec une signature électrique stylisée.",
    stats: { strength: 76, vitality: 72, speed: 84, defense: 68 },
    special: {
      name: "DROP THE HARTZ",
      damageMultiplier: 1.8,
      cooldownMs: 7600,
      description: "Retrait bref puis retour explosif qui met fortement la garde sous pression.",
    },
  },
  {
    id: "petoux",
    name: "PETOUX",
    title: "LE MUR",
    archetype: "Tank / pressure",
    tagline: "Il avance. À toi de trouver comment l'arrêter.",
    visualNote:
      "Silhouette de placeholder fondée uniquement sur les références approuvées, sans inventer de traits physiques non confirmés.",
    stats: { strength: 82, vitality: 90, speed: 56, defense: 72 },
    special: {
      name: "MUR DE SON",
      damageMultiplier: 1.65,
      cooldownMs: 8000,
      description: "Frappe lourde avec une courte fenêtre d'armure pendant la préparation.",
    },
  },
  {
    id: "nexmos",
    name: "NEXMOS",
    title: "REDLINE",
    archetype: "Power brawler",
    tagline: "Moins de coups. Beaucoup plus de dégâts.",
    visualNote:
      "Barbe, débardeur noir et signature lumineuse rouge inspirée de la référence approuvée.",
    stats: { strength: 88, vitality: 78, speed: 64, defense: 70 },
    special: {
      name: "REDLINE COMBO",
      damageMultiplier: 1.95,
      cooldownMs: 8200,
      description: "Burst en trois impacts conçu pour punir une grosse erreur adverse.",
    },
  },
  {
    id: "kavaleur",
    name: "KAVALEUR",
    title: "CAVALCADE",
    archetype: "Rush / dodge",
    tagline: "Tu ne bloques pas ce que tu n'arrives pas à suivre.",
    visualNote:
      "Placeholder stylisé sombre et dynamique tant qu'une référence visuelle approuvée plus précise n'est pas disponible.",
    stats: { strength: 74, vitality: 66, speed: 94, defense: 66 },
    special: {
      name: "CAVALCADE",
      damageMultiplier: 1.7,
      cooldownMs: 7200,
      description: "Dash extrêmement rapide, puissant mais punissable en cas d'échec.",
    },
  },
  {
    id: "korsair",
    name: "KORSAIR",
    title: "CONTRETEMPS",
    archetype: "Defense / counter",
    tagline: "Laisse l'autre faire la première erreur.",
    visualNote:
      "Placeholder sombre, posé et asymétrique tant qu'une référence visuelle approuvée plus précise n'est pas disponible.",
    stats: { strength: 68, vitality: 84, speed: 70, defense: 78 },
    special: {
      name: "CONTRETEMPS",
      damageMultiplier: 2.1,
      cooldownMs: 7800,
      description: "Fenêtre de contre à très hauts dégâts, avec une faible attaque de secours si elle n'est pas déclenchée.",
    },
  },
] as const;

export function getFighter(id: FighterId): FighterDefinition {
  const fighter = fighters.find((candidate) => candidate.id === id);

  if (!fighter) {
    throw new Error(`Unknown fighter: ${id}`);
  }

  return fighter;
}
