import itemManager, { ItemType, ItemCondition } from "../../src/items/itemManager.js";

await itemManager.createBlueprint({
  name: "Predator Skill Core",
  description: "A mysterious core that allows the user to consume, analyze, and mimic other beings' abilities.",
  itemType: ItemType.TECHNOLOGY,
  materials: [
    { name: "Magicule Essence", quantity: 3 },
    { name: "Crystalized Will", quantity: 1 }
  ],
  craftingSteps: [
    "Stabilize the magicule core in a containment field.",
    "Infuse the core with essence extracted from a unique skill bearer.",
    "Seal the mimicry interface with soul-thread binding."
  ],
  properties: {
    origin: "Rimuru Tempest",
    rank: "Unique",
    usage: "Passive"
  },
  effects: [
    { type: "absorption", description: "Absorbs skills from defeated entities." }
  ],
  requiredSkills: {
    "Soul Engineering": 5,
    "Magicule Manipulation": 7
  },
  metadata: {
    lore: "Crafted using remnants of Gluttony and analysis fragments.",
    source: "Tempest Research Division"
  },
  tags: ["core", "unique skill"]
});

await itemManager.createBlueprint({
  name: "Mask of Shizu",
  description: "A legendary mask that suppresses Ifrit’s flames and conceals the wearer’s magical aura.",
  itemType: ItemType.ARMOR,
  materials: [
    { name: "Spirit-Fused Glass", quantity: 1 },
    { name: "Fire-Resistant Fiber", quantity: 2 }
  ],
  craftingSteps: [
    "Shape the mask frame from fire-resistant fiber.",
    "Inlay the glass imbued with anti-spirit runes.",
    "Enchant the mask to suppress aura emissions."
  ],
  properties: {
    suppresses: "Ifrit",
    defense: 5
  },
  effects: [
    { type: "aura_suppression", description: "Conceals magical presence." }
  ],
  requiredSkills: {
    "Spirit Enchanting": 6
  },
  metadata: {
    origin: "Shizu",
    legacy: "Worn by the hero possessed by Ifrit"
  },
  tags: ["legendary", "fire-resistant"]
});

await itemManager.createBlueprint({
  name: "Magicule Reactor Core",
  description: "A compact magical reactor capable of powering entire cities in Tempest.",
  itemType: ItemType.TECHNOLOGY,
  materials: [
    { name: "Stabilized Magicule", quantity: 5 },
    { name: "Runed Alloy Casing", quantity: 2 }
  ],
  craftingSteps: [
    "Condense and stabilize magicule energy.",
    "Encapsulate in a reinforced containment shell.",
    "Run tests for overload thresholds."
  ],
  properties: {
    capacity: "High",
    stability: "Stable"
  },
  effects: [],
  requiredSkills: {
    "Magitech Engineering": 8
  },
  metadata: {
    creator: "Tempest Tech Bureau",
    useCase: "Infrastructure Core Unit"
  },
  tags: ["infrastructure", "energy"]
});

await itemManager.createBlueprint({
  name: "Raphael's Guidance Tablet",
  description: "A mystical tablet allowing communication with the ultimate skill, Raphael.",
  itemType: ItemType.BOOK,
  materials: [
    { name: "Wisdom Crystal", quantity: 1 },
    { name: "Enchanted Stone Tablet", quantity: 1 }
  ],
  craftingSteps: [
    "Imprint runes of cognition on the tablet.",
    "Bind crystal fragment containing Raphael's link.",
    "Seal with stabilization glyphs."
  ],
  properties: {
    skill: "Raphael",
    rank: "Ultimate"
  },
  effects: [
    { type: "guidance", description: "Channels wisdom from Raphael." }
  ],
  requiredSkills: {
    "Soul Link Rituals": 7,
    "Runecrafting": 5
  },
  metadata: {
    tier: "Ultimate Artifact",
    compatibility: "Rimuru Only"
  },
  tags: ["wisdom", "ultimate skill"]
});

await itemManager.createBlueprint({
  name: "Crimson Katana",
  description: "A katana forged with magical crimson steel, used by Benimaru. Enhances flame-based attacks.",
  itemType: ItemType.WEAPON,
  materials: [
    { name: "Crimson Steel", quantity: 3 },
    { name: "Fire Elemental Core", quantity: 1 }
  ],
  craftingSteps: [
    "Heat forge crimson steel to liquefaction point.",
    "Infuse with a fire elemental core during quenching.",
    "Finish with a ritual to bind flame affinity."
  ],
  properties: {
    attack: 60,
    affinity: "fire",
    wielder: "Benimaru"
  },
  effects: [
    { type: "fire_boost", description: "Enhances flame-based abilities." }
  ],
  requiredSkills: {
    "Weapon Forging": 6,
    "Elemental Infusion": 5
  },
  metadata: {
    user: "Benimaru",
    artifactClass: "Named Weapon"
  },
  tags: ["katana", "fire", "unique"]
});

await itemManager.createBlueprint({
  name: "Shion’s Greatsword",
  description: "A heavy greatsword imbued with magical energy. It resonates with Shion's brute strength.",
  itemType: ItemType.WEAPON,
  materials: [
    { name: "Heavy Magic Ore", quantity: 4 },
    { name: "Warrior's Blood Gem", quantity: 1 }
  ],
  craftingSteps: [
    "Forge the ore into a dense greatsword body.",
    "Embed a power-enhancing gem into the hilt.",
    "Perform a binding ritual to enhance strength synergy."
  ],
  properties: {
    attack: 90,
    weight: "Heavy",
    affinity: "magic"
  },
  effects: [
    { type: "strength_boost", description: "Increases physical attack power." }
  ],
  requiredSkills: {
    "Heavy Weapon Smithing": 7
  },
  metadata: {
    signatureWeapon: "Shion",
    combatClass: "Brute"
  },
  tags: ["greatsword", "unique"]
});

await itemManager.createBlueprint({
  name: "Full Recovery Potion",
  description: "Restores full HP and cures all status ailments instantly. Produced in Tempest.",
  itemType: ItemType.POTION,
  materials: [
    { name: "Pure Life Essence", quantity: 1 },
    { name: "Mana-Stabilized Water", quantity: 1 }
  ],
  craftingSteps: [
    "Mix base solution in purified container.",
    "Infuse with concentrated life essence under moonlight.",
    "Seal in sterile potion vial."
  ],
  uses: 1,
  effects: [
    { type: "heal", description: "Restores full health." },
    { type: "cleanse", description: "Cures all status ailments." }
  ],
  requiredSkills: {
    "Advanced Alchemy": 6
  },
  metadata: {
    batch: "Tempest Healing Division α3",
    expiration: "Long-term stable"
  },
  tags: ["potion", "rare"]
});

await itemManager.createBlueprint({
  name: "High-Grade Potion",
  description: "A high-quality potion that heals major wounds and revitalizes the user.",
  itemType: ItemType.POTION,
  materials: [
    { name: "Refined Healing Herb", quantity: 2 },
    { name: "Magic Water", quantity: 1 }
  ],
  craftingSteps: [
    "Crush herbs into concentrated extract.",
    "Boil and blend with magic water under controlled heat.",
    "Bottle and enchant with vitality glyphs."
  ],
  uses: 1,
  properties: { potency: "High" },
  effects: [
    { type: "heal", description: "Restores a large portion of health." }
  ],
  requiredSkills: {
    "Herbal Alchemy": 4
  },
  metadata: {
    formulaOrigin: "Tempest Apothecaries",
    healingTier: "B"
  },
  tags: ["potion"]
});

await itemManager.createBlueprint({
  name: "Magic Sense Crystal",
  description: "Enhances perception and awareness using magicule resonance. Often used by Tempest scouts.",
  itemType: ItemType.TOOL,
  materials: [
    { name: "Perception Crystal", quantity: 1 },
    { name: "Magicule Amplifier Shard", quantity: 1 }
  ],
  craftingSteps: [
    "Align crystal resonance to scout frequency.",
    "Fuse amplifier shard with field attunement.",
    "Test for perception clarity range."
  ],
  equippable: true,
  properties: {
    range: "Long",
    clarityBoost: true
  },
  effects: [
    { type: "perception", description: "Greatly increases detection range and clarity." }
  ],
  requiredSkills: {
    "Magicule Tuning": 5
  },
  metadata: {
    fieldUse: "Recon, Scouting",
    origin: "Tempest Scout Division"
  },
  tags: ["scouting", "magic"]
});

await itemManager.createBlueprint({
  name: "Cloak of Concealment",
  description: "A cloak that suppresses the wearer’s magical signature completely.",
  itemType: ItemType.CLOTHING,
  materials: [
    { name: "Phantom Weave Fabric", quantity: 2 },
    { name: "Silencing Thread", quantity: 1 }
  ],
  craftingSteps: [
    "Weave fabric with silencing thread into cloak form.",
    "Enchant with layered stealth runes.",
    "Test in null-field for trace leakage."
  ],
  equippable: true,
  properties: { durability: 40 },
  effects: [
    { type: "stealth", description: "Prevents magical detection." }
  ],
  requiredSkills: {
    "Runic Tailoring": 6,
    "Aura Suppression": 5
  },
  metadata: {
    stealthTier: "Advanced",
    origin: "Tempest Espionage Outfitters"
  },
  tags: ["stealth", "tempest", "rare"]
});

await itemManager.createBlueprint({
  name: "Sealed Veldora’s Prison",
  description: "An enchanted crystal containing the Storm Dragon Veldora, sealed for centuries.",
  itemType: ItemType.CONTAINER,
  materials: [
    { name: "Dragonseal Crystal", quantity: 1 },
    { name: "Veldora", quantity: 1 },
    { name: "Soul Chain Runes", quantity: 4 },
    { name: "Spirit Chain Runes", quantity: 4 }
  ],
  craftingSteps: [
    "Inscribe containment runes on crystal core.",
    "Channel immense sealing magic into structure.",
    "Stabilize using anti-draconic field anchors.",
    "Seal Veldora in crystal core."
  ],
  properties: {
    containmentLevel: "Dragon-Class",
    duration: "Centuries+"
  },
  effects: [
    { type: "containment", description: "Binds and seals high-level beings." }
  ],
  requiredSkills: {
    "Sealcraft": 10,
    "Dragon Lore": 8
  },
  metadata: {
    sealedEntity: "Veldora Tempest",
    sealStatus: "Dormant"
  },
  tags: ["seal", "legendary", "containment"]
});

await itemManager.createBlueprint({
  name: "Demon Lord’s Ring",
  description: "A ring bestowed upon Rimuru upon becoming a Demon Lord. It radiates overwhelming authority.",
  itemType: ItemType.CLOTHING,
  materials: [
    { name: "Royal Enchantite", quantity: 1 },
    { name: "Blood of King", quantity: 1 }
  ],
  craftingSteps: [
    "Mold ring with royal enchantite under ceremonial flame.",
    "Inscribe sigils of authority and command.",
    "Bless with a drop of Demon Lord's blood."
  ],
  equippable: true,
  properties: {
    rank: "Demon Lord",
    visibility: "Glowing Sigil"
  },
  effects: [
    { type: "presence", description: "Projects Demon Lord presence." },
    { type: "barrier_boost", description: "Strengthens magic barriers." }
  ],
  requiredSkills: {
    "Demonic Enchanting": 7
  },
  metadata: {
    owner: "Rimuru",
    craftedBy: "Rimuru's Evolutionary Surge"
  },
  tags: ["ring", "demon lord", "symbol"]
});

// await itemManager.createBlueprint({
//   name: "Portable Barrier Generator",
//   description: "A device created by Kurobe and Vesta to deploy high-tier defensive barriers on demand.",
//   type: ItemType.TECHNOLOGY,
//   equippable: false,
//   effects: [{ type: "barrier", description: "Deploys a magicule barrier around a target area." }],
//   properties: { radius: "30 meters", duration: "1 hour", cooldown: "10 minutes" },
//   tags: ["tempest", "technology", "defense"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest Communication Orb",
//   description: "A crystal orb allowing real-time magical communication between key members of Tempest.",
//   type: ItemType.TOOL,
//   equippable: false,
//   effects: [{ type: "telepathy", description: "Allows two-way magical communication." }],
//   properties: { range: "Global (linked)", signal: "Mana-based" },
//   tags: ["communication", "magic tech"]
// });

// await itemManager.createBlueprint({
//   name: "Ifrit’s Flame Core",
//   description: "A flaming red core left behind after Ifrit’s extraction. Contains chaotic fire energy.",
//   type: ItemType.MATERIAL,
//   effects: [{ type: "fire_explosion", description: "Releases a volatile burst of flames when shattered." }],
//   properties: { dangerLevel: "High", volatility: "Extreme" },
//   tags: ["core", "fire", "volatile"]
// });

// await itemManager.createBlueprint({
//   name: "Magicule Analyzer Lens",
//   description: "Used by Tempest researchers to analyze magicule patterns and creature signatures.",
//   type: ItemType.TOOL,
//   equippable: true,
//   effects: [{ type: "analysis", description: "Scans and identifies magicules in real time." }],
//   properties: { accuracy: "High", UI: "Magic display" },
//   tags: ["analysis", "tool", "research"]
// });

// await itemManager.createBlueprint({
//   name: "Gobta’s Steel Dagger",
//   description: "A reliable steel dagger used by Gobta. Compact, fast, and easy to conceal.",
//   type: ItemType.WEAPON,
//   equippable: true,
//   effects: [{ type: "quickstrike", description: "Improves speed for light weapon attacks." }],
//   properties: { attack: 15, durability: 35 },
//   tags: ["dagger", "standard issue", "goblin riders"]
// });

// await itemManager.createBlueprint({
//   name: "Kijin Battle Uniform",
//   description: "Enchanted battle clothing worn by Kijin warriors. Offers mobility and light protection.",
//   type: ItemType.CLOTHING,
//   equippable: true,
//   effects: [{ type: "agility_boost", description: "Enhances movement speed and flexibility." }],
//   properties: { defense: 20, mobility: "High" },
//   tags: ["uniform", "magic-woven", "kijin"]
// });

// await itemManager.createBlueprint({
//   name: "Spatial Storage Ring",
//   description: "A silver ring embedded with a spatial rune. Allows access to a pocket dimension for storage.",
//   type: ItemType.CONTAINER,
//   equippable: true,
//   properties: { capacity: "Large", binding: "User-linked", magicSeal: true },
//   tags: ["storage", "ring", "magic"]
// });

// await itemManager.createBlueprint({
//   name: "Magic Pouch of Tempest",
//   description: "A woven pouch infused with magic to carry items far beyond its size.",
//   type: ItemType.CONTAINER,
//   properties: { capacity: "Medium", weightless: true },
//   tags: ["bag", "portable", "tempest"]
// });

// await itemManager.createBlueprint({
//   name: "Kurobe’s Blacksmith Hammer",
//   description: "A heavy, enchanted hammer used by Kurobe to forge legendary weapons in Tempest.",
//   type: ItemType.TOOL,
//   equippable: true,
//   effects: [{ type: "forge_boost", description: "Increases success rate of magical forging." }],
//   properties: { weight: "Massive", material: "Blacksteel" },
//   tags: ["crafting", "legendary", "forge"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest Forge Anvil",
//   description: "An enchanted anvil used in Kurobe’s forge. Infused with runes for high-tier crafting.",
//   type: ItemType.TOOL,
//   properties: { heatResistance: "Extreme", runes: ["stability", "flow"] },
//   tags: ["forge", "rune-forged", "workshop"]
// });

// await itemManager.createBlueprint({
//   name: "Wisdom King’s Memory Core",
//   description: "A crystal backup core containing a fragment of Raphael’s thought processes. Used for AI-like counsel.",
//   type: ItemType.TECHNOLOGY,
//   effects: [{ type: "advice", description: "Gives optimal decisions based on stored knowledge." }],
//   properties: { accessSpeed: "Instant", security: "Rimuru-locked" },
//   tags: ["wisdom", "artifact", "backup"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest ID Badge",
//   description: "A magic-imbued badge that identifies citizens and grants access to certain areas in Tempest.",
//   type: ItemType.TOOL,
//   equippable: true,
//   effects: [{ type: "access", description: "Unlocks restricted zones in Tempest." }],
//   properties: { authorizationLevel: "Civic", boundToUser: true },
//   tags: ["civil", "infrastructure", "tech"]
// });

// await itemManager.createBlueprint({
//   name: "Marionette Threads",
//   description: "Enchanted strings used by Clayman to control others like puppets. Laced with curse magic.",
//   type: ItemType.TOOL,
//   effects: [{ type: "mind_control", description: "Temporarily controls lesser beings." }],
//   properties: { durability: 10, magicType: "Curse" },
//   tags: ["clayman", "dark arts", "tool"]
// });

// await itemManager.createBlueprint({
//   name: "Beast King Gauntlets",
//   description: "Combat gauntlets worn by Carrion, enchanted with beastly energy to enhance raw physical power.",
//   type: ItemType.ARMOR,
//   equippable: true,
//   effects: [{ type: "rage_boost", description: "Increases strength during berserk states." }],
//   properties: { defense: 35, strengthBoost: "Massive" },
//   tags: ["beastman", "gauntlets", "war"]
// });

// await itemManager.createBlueprint({
//   name: "Walpurgis Invitation Orb",
//   description: "A shimmering orb sent to recognized Demon Lords to summon them to the Walpurgis Council.",
//   type: ItemType.TOOL,
//   effects: [{ type: "summon", description: "Teleports the holder to the Walpurgis venue." }],
//   properties: { singleUse: true, creator: "Guy Crimson" },
//   uses: 1,
//   usesLeft: 1,
//   tags: ["walpurgis", "invitation", "magic"]
// });

// await itemManager.createBlueprint({
//   name: "Demon Crest of Milim",
//   description: "A symbol engraved with Milim’s magic signature, representing her territory and authority.",
//   type: ItemType.KEY,
//   effects: [{ type: "recognition", description: "Grants safe passage through Milim’s lands." }],
//   properties: { bearerOnly: true },
//   tags: ["demon lord", "symbol", "territory"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest Honey Toast",
//   description: "A delicious dessert made from local honey and enchanted bread. Restores energy and morale.",
//   type: ItemType.FOOD,
//   uses: 1,
//   usesLeft: 1,
//   effects: [
//     { type: "stamina_restore", description: "Restores moderate stamina." },
//     { type: "morale_boost", description: "Lifts the user’s spirits significantly." }
//   ],
//   properties: { flavor: "Sweet", magicInfused: true },
//   tags: ["dessert", "restorative", "tempest"]
// });

// await itemManager.createBlueprint({
//   name: "Healing Stew of Jura",
//   description: "A stew made with Jura herbs and magicules. Used by Tempest soldiers during recovery.",
//   type: ItemType.FOOD,
//   uses: 1,
//   usesLeft: 1,
//   effects: [{ type: "regeneration", description: "Heals minor wounds over time." }],
//   properties: { warmth: "Comforting", nutrition: "High" },
//   tags: ["meal", "healing", "jura"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest Research Log: Volume I",
//   description: "An official logbook from the Tempest research team documenting monster behavior and evolution.",
//   type: ItemType.BOOK,
//   properties: { topic: "Evolution", compiledBy: "Vesta" },
//   tags: ["research", "tempest", "book"]
// });

// await itemManager.createBlueprint({
//   name: "Scroll of Barrier Arts",
//   description: "A magical scroll that teaches intermediate barrier spells used by Tempest’s mages.",
//   type: ItemType.BOOK,
//   effects: [{ type: "learning", description: "Grants knowledge of barrier formation." }],
//   properties: { level: "Intermediate", reuse: true },
//   tags: ["scroll", "barrier", "tempest"]
// });

// await itemManager.createBlueprint({
//   name: "Beastclaw Talisman",
//   description: "A battle charm worn by warriors of Eurazania. Pulses with beastkin magic.",
//   type: ItemType.TOOL,
//   equippable: true,
//   effects: [{ type: "feral_instinct", description: "Boosts combat reflexes under stress." }],
//   properties: { rank: "Elite", energy: "Wild Magic" },
//   tags: ["eurazania", "combat", "talisman"]
// });

// await itemManager.createBlueprint({
//   name: "Royal Blacksteel Ingot",
//   description: "An ultra-dense ingot forged deep under Dwargon’s royal foundry. Used for crafting legendary arms.",
//   type: ItemType.MATERIAL,
//   properties: { density: "Extreme", grade: "Royal Craft" },
//   tags: ["dwargon", "forge", "rare"]
// });

// await itemManager.createBlueprint({
//   name: "Elven Arcglow Gem",
//   description: "A radiant gem infused with pure forest mana, used in rituals and enchantments by Sarion elves.",
//   type: ItemType.MATERIAL,
//   effects: [{ type: "mana_regen", description: "Passively accelerates magic recovery." }],
//   properties: { purity: "Crystalized Mana", source: "Sarion" },
//   tags: ["elven", "ritual", "rare"]
// });

// await itemManager.createBlueprint({
//   name: "Demonic Venomblood Flask",
//   description: "A black vial containing toxic blood from a high-rank demon. Used in forbidden alchemy.",
//   type: ItemType.POTION,
//   effects: [{ type: "curse", description: "Causes internal magic disruption if ingested or spilled." }],
//   properties: { toxicity: "Lethal", corruption: "High" },
//   tags: ["alchemy", "cursed", "forbidden"]
// });

// await itemManager.createBlueprint({
//   name: "Elixir of Perfect Harmony",
//   description: "A rare potion that balances the body’s internal energies and removes all magical interference.",
//   type: ItemType.POTION,
//   uses: 1,
//   usesLeft: 1,
//   effects: [
//     { type: "cleanse", description: "Removes curses and magic blockages." },
//     { type: "stabilize", description: "Regulates chaotic mana flow." }
//   ],
//   tags: ["elixir", "high-grade", "rare"]
// });

// await itemManager.createBlueprint({
//   name: "Teleportation Pad",
//   description: "A fixed platform created by Vesta for instant transit between key points in Tempest.",
//   type: ItemType.TECHNOLOGY,
//   effects: [{ type: "teleport", description: "Moves a person instantly to a linked pad." }],
//   properties: { cooldown: "5 minutes", limit: "1 person per activation" },
//   tags: ["infrastructure", "magic tech"]
// });

// await itemManager.createBlueprint({
//   name: "Throne of Rimuru",
//   description: "A majestic throne infused with Tempest’s royal magicule signature. Symbol of unity.",
//   type: ItemType.MISCELLANEOUS,
//   properties: { comfort: "Royal", enchantments: ["presence", "command aura"] },
//   tags: ["furniture", "symbolic", "throne"]
// });

// await itemManager.createBlueprint({
//   name: "Veldora’s Manga: Volume I",
//   description: "The first manga gifted by Rimuru to Veldora. He treasures it like divine scripture.",
//   type: ItemType.BOOK,
//   properties: { genre: "Shonen", pages: 200 },
//   tags: ["manga", "veldora", "treasure"]
// });

// await itemManager.createBlueprint({
//   name: "Mountain of Snacks",
//   description: "A hidden stash of Rimuru’s snacks hoarded by Veldora. Chips, candies, and possibly ramen.",
//   type: ItemType.CONTAINER,
//   containedItems: [],
//   properties: { freshness: "Questionable", temptationLevel: "Very High" },
//   tags: ["snack", "veldora", "stash"]
// });

// await itemManager.createBlueprint({
//   name: "Builder’s Toolkit",
//   description: "A compact enchanted toolkit used by Tempest construction teams. Auto-adjusts to material types.",
//   type: ItemType.TOOL,
//   properties: { toolsIncluded: ["hammer", "saw", "rune pen"], selfRepairing: true },
//   tags: ["construction", "rune", "utility"]
// });

// await itemManager.createBlueprint({
//   name: "Rune-Lit Lantern",
//   description: "A floating lantern powered by low-tier runes. Can be set to hover or follow its owner.",
//   type: ItemType.TOOL,
//   equippable: false,
//   effects: [{ type: "illumination", description: "Provides soft or focused lighting in dark areas." }],
//   properties: { duration: "12 hours per charge", hoverHeight: "2 meters" },
//   tags: ["light", "rune", "camping"]
// });

// await itemManager.createBlueprint({
//   name: "Magic-Warm Cooking Pot",
//   description: "A pot used in Tempest kitchens that stays at a perfect simmer using ambient mana.",
//   type: ItemType.TOOL,
//   properties: { tempControl: "Auto-regulated", cleanup: "Self-cleaning" },
//   tags: ["cooking", "kitchen", "magic tech"]
// });

// await itemManager.createBlueprint({
//   name: "Jura Herb Spice Rack",
//   description: "A wooden rack enchanted to keep herbs fresh and aromatic indefinitely.",
//   type: ItemType.CONTAINER,
//   properties: { freshnessPreservation: true, capacity: "15 jars" },
//   tags: ["kitchen", "preservation", "cooking"]
// });

// await itemManager.createBlueprint({
//   name: "Magicule-Heated Blanket",
//   description: "A blanket woven from mana-infused fibers. Regulates temperature and improves sleep quality.",
//   type: ItemType.CLOTHING,
//   equippable: true,
//   properties: { comfort: "Maximum", tempRange: "-10°C to 30°C" },
//   tags: ["comfort", "rest", "bedroom"]
// });

// await itemManager.createBlueprint({
//   name: "Tempest Storage Crate",
//   description: "Standardized storage crate used for organizing goods. Charm-locked for protection.",
//   type: ItemType.CONTAINER,
//   properties: { volume: "1 cubic meter", lockType: "charm glyph" },
//   tags: ["logistics", "storage", "container"]
// });

// await itemManager.createBlueprint({
//   name: "Auto-Scrub Cleaning Orb",
//   description: "A small orb that rolls around autonomously, scrubbing and purifying everything in its path.",
//   type: ItemType.TOOL,
//   effects: [{ type: "cleanse", description: "Removes dirt, grime, and minor toxins from surfaces." }],
//   properties: { radius: "5 meters", intelligence: "Basic AI" },
//   tags: ["cleaning", "utility", "autonomous"]
// });

// await itemManager.createBlueprint({
//   name: "Handwash Rune Station",
//   description: "Used in public areas of Tempest, this station provides scented rune-purified water and sanitizer.",
//   type: ItemType.TECHNOLOGY,
//   properties: { scentOptions: ["mint", "lavender", "lemon"], magicDrain: "Low" },
//   tags: ["hygiene", "public utility", "runes"]
// });