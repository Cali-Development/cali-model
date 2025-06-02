import itemManager, { ItemType, ItemCondition } from "../../src/items/itemManager.js";

await itemManager.createItem({
  name: "Predator Skill Core",
  description: "A mysterious core that allows the user to consume, analyze, and mimic other beings' abilities.",
  type: ItemType.TECHNOLOGY,
  effects: [{ type: "absorption", description: "Absorbs skills from defeated entities." }],
  properties: { origin: "Rimuru Tempest", rank: "Unique", usage: "Passive" },
  tags: ["core", "unique skill"],
  uses: -1,
  equippable: false
});

await itemManager.createItem({
  name: "Mask of Shizu",
  description: "A legendary mask that suppresses Ifrit’s flames and conceals the wearer’s magical aura.",
  type: ItemType.ARMOR,
  condition: ItemCondition.GOOD,
  equippable: true,
  effects: [{ type: "aura_suppression", description: "Conceals magical presence." }],
  properties: { suppresses: "Ifrit", defense: 5 },
  tags: ["legendary", "fire-resistant"]
});

await itemManager.createItem({
  name: "Magicule Reactor Core",
  description: "A compact magical reactor capable of powering entire cities in Tempest.",
  type: ItemType.TECHNOLOGY,
  properties: { capacity: "High", stability: "Stable" },
  tags: ["infrastructure", "energy"],
  equippable: false
});

await itemManager.createItem({
  name: "Raphael's Guidance Tablet",
  description: "A mystical tablet allowing communication with the ultimate skill, Raphael.",
  type: ItemType.BOOK,
  effects: [{ type: "guidance", description: "Channels wisdom from Raphael." }],
  properties: { skill: "Raphael", rank: "Ultimate" },
  tags: ["wisdom", "ultimate skill"]
});

await itemManager.createItem({
  name: "Crimson Katana",
  description: "A katana forged with magical crimson steel, used by Benimaru. Enhances flame-based attacks.",
  type: ItemType.WEAPON,
  equippable: true,
  effects: [{ type: "fire_boost", description: "Enhances flame-based abilities." }],
  properties: { attack: 60, affinity: "fire", wielder: "Benimaru" },
  tags: ["katana", "fire", "unique"]
});

await itemManager.createItem({
  name: "Shion’s Greatsword",
  description: "A heavy greatsword imbued with magical energy. It resonates with Shion's brute strength.",
  type: ItemType.WEAPON,
  equippable: true,
  effects: [{ type: "strength_boost", description: "Increases physical attack power." }],
  properties: { attack: 90, weight: "Heavy", affinity: "magic" },
  tags: ["greatsword", "unique"]
});

await itemManager.createItem({
  name: "Full Recovery Potion",
  description: "Restores full HP and cures all status ailments instantly. Produced in Tempest.",
  type: ItemType.POTION,
  uses: 1,
  usesLeft: 1,
  effects: [
    { type: "heal", description: "Restores full health." },
    { type: "cleanse", description: "Cures all status ailments." }
  ],
  tags: ["potion", "rare"]
});

await itemManager.createItem({
  name: "High-Grade Potion",
  description: "A high-quality potion that heals major wounds and revitalizes the user.",
  type: ItemType.POTION,
  uses: 1,
  usesLeft: 1,
  effects: [{ type: "heal", description: "Restores a large portion of health." }],
  properties: { potency: "High" },
  tags: ["potion"]
});

await itemManager.createItem({
  name: "Magic Sense Crystal",
  description: "Enhances perception and awareness using magicule resonance. Often used by Tempest scouts.",
  type: ItemType.TOOL,
  equippable: true,
  effects: [{ type: "perception", description: "Greatly increases detection range and clarity." }],
  properties: { range: "Long", clarityBoost: true },
  tags: ["scouting", "magic"]
});

await itemManager.createItem({
  name: "Cloak of Concealment",
  description: "A cloak that suppresses the wearer’s magical signature completely.",
  type: ItemType.CLOTHING,
  equippable: true,
  effects: [{ type: "stealth", description: "Prevents magical detection." }],
  properties: { durability: 40 },
  tags: ["stealth", "tempest", "rare"]
});

await itemManager.createItem({
  name: "Sealed Veldora’s Prison",
  description: "An enchanted crystal containing the Storm Dragon Veldora, sealed for centuries.",
  type: ItemType.CONTAINER,
  effects: [{ type: "containment", description: "Binds and seals high-level beings." }],
  properties: { containmentLevel: "Dragon-Class", duration: "Centuries+" },
  tags: ["seal", "legendary", "containment"]
});

await itemManager.createItem({
  name: "Demon Lord’s Ring",
  description: "A ring bestowed upon Rimuru upon becoming a Demon Lord. It radiates overwhelming authority.",
  type: ItemType.CLOTHING,
  equippable: true,
  effects: [
    { type: "presence", description: "Projects Demon Lord presence." },
    { type: "barrier_boost", description: "Strengthens magic barriers." }
  ],
  properties: { rank: "Demon Lord", visibility: "Glowing Sigil" },
  tags: ["ring", "demon lord", "symbol"]
});

await itemManager.createItem({
  name: "Portable Barrier Generator",
  description: "A device created by Kurobe and Vesta to deploy high-tier defensive barriers on demand.",
  type: ItemType.TECHNOLOGY,
  equippable: false,
  effects: [{ type: "barrier", description: "Deploys a magicule barrier around a target area." }],
  properties: { radius: "30 meters", duration: "1 hour", cooldown: "10 minutes" },
  tags: ["tempest", "technology", "defense"]
});

await itemManager.createItem({
  name: "Tempest Communication Orb",
  description: "A crystal orb allowing real-time magical communication between key members of Tempest.",
  type: ItemType.TOOL,
  equippable: false,
  effects: [{ type: "telepathy", description: "Allows two-way magical communication." }],
  properties: { range: "Global (linked)", signal: "Mana-based" },
  tags: ["communication", "magic tech"]
});

await itemManager.createItem({
  name: "Ifrit’s Flame Core",
  description: "A flaming red core left behind after Ifrit’s extraction. Contains chaotic fire energy.",
  type: ItemType.MATERIAL,
  effects: [{ type: "fire_explosion", description: "Releases a volatile burst of flames when shattered." }],
  properties: { dangerLevel: "High", volatility: "Extreme" },
  tags: ["core", "fire", "volatile"]
});

await itemManager.createItem({
  name: "Magicule Analyzer Lens",
  description: "Used by Tempest researchers to analyze magicule patterns and creature signatures.",
  type: ItemType.TOOL,
  equippable: true,
  effects: [{ type: "analysis", description: "Scans and identifies magicules in real time." }],
  properties: { accuracy: "High", UI: "Magic display" },
  tags: ["analysis", "tool", "research"]
});

await itemManager.createItem({
  name: "Gobta’s Steel Dagger",
  description: "A reliable steel dagger used by Gobta. Compact, fast, and easy to conceal.",
  type: ItemType.WEAPON,
  equippable: true,
  effects: [{ type: "quickstrike", description: "Improves speed for light weapon attacks." }],
  properties: { attack: 15, durability: 35 },
  tags: ["dagger", "standard issue", "goblin riders"]
});

await itemManager.createItem({
  name: "Kijin Battle Uniform",
  description: "Enchanted battle clothing worn by Kijin warriors. Offers mobility and light protection.",
  type: ItemType.CLOTHING,
  equippable: true,
  effects: [{ type: "agility_boost", description: "Enhances movement speed and flexibility." }],
  properties: { defense: 20, mobility: "High" },
  tags: ["uniform", "magic-woven", "kijin"]
});

await itemManager.createItem({
  name: "Spatial Storage Ring",
  description: "A silver ring embedded with a spatial rune. Allows access to a pocket dimension for storage.",
  type: ItemType.CONTAINER,
  equippable: true,
  properties: { capacity: "Large", binding: "User-linked", magicSeal: true },
  tags: ["storage", "ring", "magic"]
});

await itemManager.createItem({
  name: "Magic Pouch of Tempest",
  description: "A woven pouch infused with magic to carry items far beyond its size.",
  type: ItemType.CONTAINER,
  properties: { capacity: "Medium", weightless: true },
  tags: ["bag", "portable", "tempest"]
});

await itemManager.createItem({
  name: "Kurobe’s Blacksmith Hammer",
  description: "A heavy, enchanted hammer used by Kurobe to forge legendary weapons in Tempest.",
  type: ItemType.TOOL,
  equippable: true,
  effects: [{ type: "forge_boost", description: "Increases success rate of magical forging." }],
  properties: { weight: "Massive", material: "Blacksteel" },
  tags: ["crafting", "legendary", "forge"]
});

await itemManager.createItem({
  name: "Tempest Forge Anvil",
  description: "An enchanted anvil used in Kurobe’s forge. Infused with runes for high-tier crafting.",
  type: ItemType.TOOL,
  properties: { heatResistance: "Extreme", runes: ["stability", "flow"] },
  tags: ["forge", "rune-forged", "workshop"]
});

await itemManager.createItem({
  name: "Wisdom King’s Memory Core",
  description: "A crystal backup core containing a fragment of Raphael’s thought processes. Used for AI-like counsel.",
  type: ItemType.TECHNOLOGY,
  effects: [{ type: "advice", description: "Gives optimal decisions based on stored knowledge." }],
  properties: { accessSpeed: "Instant", security: "Rimuru-locked" },
  tags: ["wisdom", "artifact", "backup"]
});

await itemManager.createItem({
  name: "Tempest ID Badge",
  description: "A magic-imbued badge that identifies citizens and grants access to certain areas in Tempest.",
  type: ItemType.TOOL,
  equippable: true,
  effects: [{ type: "access", description: "Unlocks restricted zones in Tempest." }],
  properties: { authorizationLevel: "Civic", boundToUser: true },
  tags: ["civil", "infrastructure", "tech"]
});

await itemManager.createItem({
  name: "Marionette Threads",
  description: "Enchanted strings used by Clayman to control others like puppets. Laced with curse magic.",
  type: ItemType.TOOL,
  effects: [{ type: "mind_control", description: "Temporarily controls lesser beings." }],
  properties: { durability: 10, magicType: "Curse" },
  tags: ["clayman", "dark arts", "tool"]
});

await itemManager.createItem({
  name: "Beast King Gauntlets",
  description: "Combat gauntlets worn by Carrion, enchanted with beastly energy to enhance raw physical power.",
  type: ItemType.ARMOR,
  equippable: true,
  effects: [{ type: "rage_boost", description: "Increases strength during berserk states." }],
  properties: { defense: 35, strengthBoost: "Massive" },
  tags: ["beastman", "gauntlets", "war"]
});

await itemManager.createItem({
  name: "Walpurgis Invitation Orb",
  description: "A shimmering orb sent to recognized Demon Lords to summon them to the Walpurgis Council.",
  type: ItemType.TOOL,
  effects: [{ type: "summon", description: "Teleports the holder to the Walpurgis venue." }],
  properties: { singleUse: true, creator: "Guy Crimson" },
  uses: 1,
  usesLeft: 1,
  tags: ["walpurgis", "invitation", "magic"]
});

await itemManager.createItem({
  name: "Demon Crest of Milim",
  description: "A symbol engraved with Milim’s magic signature, representing her territory and authority.",
  type: ItemType.KEY,
  effects: [{ type: "recognition", description: "Grants safe passage through Milim’s lands." }],
  properties: { bearerOnly: true },
  tags: ["demon lord", "symbol", "territory"]
});

await itemManager.createItem({
  name: "Tempest Honey Toast",
  description: "A delicious dessert made from local honey and enchanted bread. Restores energy and morale.",
  type: ItemType.FOOD,
  uses: 1,
  usesLeft: 1,
  effects: [
    { type: "stamina_restore", description: "Restores moderate stamina." },
    { type: "morale_boost", description: "Lifts the user’s spirits significantly." }
  ],
  properties: { flavor: "Sweet", magicInfused: true },
  tags: ["dessert", "restorative", "tempest"]
});

await itemManager.createItem({
  name: "Healing Stew of Jura",
  description: "A stew made with Jura herbs and magicules. Used by Tempest soldiers during recovery.",
  type: ItemType.FOOD,
  uses: 1,
  usesLeft: 1,
  effects: [{ type: "regeneration", description: "Heals minor wounds over time." }],
  properties: { warmth: "Comforting", nutrition: "High" },
  tags: ["meal", "healing", "jura"]
});

await itemManager.createItem({
  name: "Tempest Research Log: Volume I",
  description: "An official logbook from the Tempest research team documenting monster behavior and evolution.",
  type: ItemType.BOOK,
  properties: { topic: "Evolution", compiledBy: "Vesta" },
  tags: ["research", "tempest", "book"]
});

await itemManager.createItem({
  name: "Scroll of Barrier Arts",
  description: "A magical scroll that teaches intermediate barrier spells used by Tempest’s mages.",
  type: ItemType.BOOK,
  effects: [{ type: "learning", description: "Grants knowledge of barrier formation." }],
  properties: { level: "Intermediate", reuse: true },
  tags: ["scroll", "barrier", "tempest"]
});

await itemManager.createItem({
  name: "Beastclaw Talisman",
  description: "A battle charm worn by warriors of Eurazania. Pulses with beastkin magic.",
  type: ItemType.TOOL,
  equippable: true,
  effects: [{ type: "feral_instinct", description: "Boosts combat reflexes under stress." }],
  properties: { rank: "Elite", energy: "Wild Magic" },
  tags: ["eurazania", "combat", "talisman"]
});

await itemManager.createItem({
  name: "Royal Blacksteel Ingot",
  description: "An ultra-dense ingot forged deep under Dwargon’s royal foundry. Used for crafting legendary arms.",
  type: ItemType.MATERIAL,
  properties: { density: "Extreme", grade: "Royal Craft" },
  tags: ["dwargon", "forge", "rare"]
});

await itemManager.createItem({
  name: "Elven Arcglow Gem",
  description: "A radiant gem infused with pure forest mana, used in rituals and enchantments by Sarion elves.",
  type: ItemType.MATERIAL,
  effects: [{ type: "mana_regen", description: "Passively accelerates magic recovery." }],
  properties: { purity: "Crystalized Mana", source: "Sarion" },
  tags: ["elven", "ritual", "rare"]
});

await itemManager.createItem({
  name: "Demonic Venomblood Flask",
  description: "A black vial containing toxic blood from a high-rank demon. Used in forbidden alchemy.",
  type: ItemType.POTION,
  effects: [{ type: "curse", description: "Causes internal magic disruption if ingested or spilled." }],
  properties: { toxicity: "Lethal", corruption: "High" },
  tags: ["alchemy", "cursed", "forbidden"]
});

await itemManager.createItem({
  name: "Elixir of Perfect Harmony",
  description: "A rare potion that balances the body’s internal energies and removes all magical interference.",
  type: ItemType.POTION,
  uses: 1,
  usesLeft: 1,
  effects: [
    { type: "cleanse", description: "Removes curses and magic blockages." },
    { type: "stabilize", description: "Regulates chaotic mana flow." }
  ],
  tags: ["elixir", "high-grade", "rare"]
});

await itemManager.createItem({
  name: "Teleportation Pad",
  description: "A fixed platform created by Vesta for instant transit between key points in Tempest.",
  type: ItemType.TECHNOLOGY,
  effects: [{ type: "teleport", description: "Moves a person instantly to a linked pad." }],
  properties: { cooldown: "5 minutes", limit: "1 person per activation" },
  tags: ["infrastructure", "magic tech"]
});

await itemManager.createItem({
  name: "Throne of Rimuru",
  description: "A majestic throne infused with Tempest’s royal magicule signature. Symbol of unity.",
  type: ItemType.MISCELLANEOUS,
  properties: { comfort: "Royal", enchantments: ["presence", "command aura"] },
  tags: ["furniture", "symbolic", "throne"]
});

await itemManager.createItem({
  name: "Veldora’s Manga: Volume I",
  description: "The first manga gifted by Rimuru to Veldora. He treasures it like divine scripture.",
  type: ItemType.BOOK,
  properties: { genre: "Shonen", pages: 200 },
  tags: ["manga", "veldora", "treasure"]
});

await itemManager.createItem({
  name: "Mountain of Snacks",
  description: "A hidden stash of Rimuru’s snacks hoarded by Veldora. Chips, candies, and possibly ramen.",
  type: ItemType.CONTAINER,
  containedItems: [],
  properties: { freshness: "Questionable", temptationLevel: "Very High" },
  tags: ["snack", "veldora", "stash"]
});

await itemManager.createItem({
  name: "Builder’s Toolkit",
  description: "A compact enchanted toolkit used by Tempest construction teams. Auto-adjusts to material types.",
  type: ItemType.TOOL,
  properties: { toolsIncluded: ["hammer", "saw", "rune pen"], selfRepairing: true },
  tags: ["construction", "rune", "utility"]
});

await itemManager.createItem({
  name: "Rune-Lit Lantern",
  description: "A floating lantern powered by low-tier runes. Can be set to hover or follow its owner.",
  type: ItemType.TOOL,
  equippable: false,
  effects: [{ type: "illumination", description: "Provides soft or focused lighting in dark areas." }],
  properties: { duration: "12 hours per charge", hoverHeight: "2 meters" },
  tags: ["light", "rune", "camping"]
});

await itemManager.createItem({
  name: "Magic-Warm Cooking Pot",
  description: "A pot used in Tempest kitchens that stays at a perfect simmer using ambient mana.",
  type: ItemType.TOOL,
  properties: { tempControl: "Auto-regulated", cleanup: "Self-cleaning" },
  tags: ["cooking", "kitchen", "magic tech"]
});

await itemManager.createItem({
  name: "Jura Herb Spice Rack",
  description: "A wooden rack enchanted to keep herbs fresh and aromatic indefinitely.",
  type: ItemType.CONTAINER,
  properties: { freshnessPreservation: true, capacity: "15 jars" },
  tags: ["kitchen", "preservation", "cooking"]
});

await itemManager.createItem({
  name: "Magicule-Heated Blanket",
  description: "A blanket woven from mana-infused fibers. Regulates temperature and improves sleep quality.",
  type: ItemType.CLOTHING,
  equippable: true,
  properties: { comfort: "Maximum", tempRange: "-10°C to 30°C" },
  tags: ["comfort", "rest", "bedroom"]
});

await itemManager.createItem({
  name: "Tempest Storage Crate",
  description: "Standardized storage crate used for organizing goods. Charm-locked for protection.",
  type: ItemType.CONTAINER,
  properties: { volume: "1 cubic meter", lockType: "charm glyph" },
  tags: ["logistics", "storage", "container"]
});

await itemManager.createItem({
  name: "Auto-Scrub Cleaning Orb",
  description: "A small orb that rolls around autonomously, scrubbing and purifying everything in its path.",
  type: ItemType.TOOL,
  effects: [{ type: "cleanse", description: "Removes dirt, grime, and minor toxins from surfaces." }],
  properties: { radius: "5 meters", intelligence: "Basic AI" },
  tags: ["cleaning", "utility", "autonomous"]
});

await itemManager.createItem({
  name: "Handwash Rune Station",
  description: "Used in public areas of Tempest, this station provides scented rune-purified water and sanitizer.",
  type: ItemType.TECHNOLOGY,
  properties: { scentOptions: ["mint", "lavender", "lemon"], magicDrain: "Low" },
  tags: ["hygiene", "public utility", "runes"]
});
