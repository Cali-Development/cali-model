import placeManager, { PlaceType, ConnectionType } from '../../src/places/placeManager.js';

async function generateconnections() {
    await placeManager.initialize();

  const locations = [
    {
      name: 'Tempest City',
      description: 'The capital of the Jura Tempest Federation, built by Rimuru and his allies.',
      type: PlaceType.CITY,
      coordinates: { x: 0, y: 0, z: 0 },
    },
    {
      name: 'Dwargon',
      description: 'The Dwarven Kingdom known for its technology and craftsmanship.',
      type: PlaceType.CITY,
      coordinates: { x: 100, y: 0, z: 20 },
    },
    {
      name: 'Blumund',
      description: 'A small kingdom neighboring the Jura Forest.',
      type: PlaceType.TOWN,
      coordinates: { x: -80, y: 0, z: 30 },
    },
    {
      name: 'Jura Forest',
      description: 'The vast magical forest surrounding Tempest.',
      type: PlaceType.FOREST,
      coordinates: { x: 0, y: 0, z: -50 },
    },
    {
      name: 'Cave of the Sealed One',
      description: 'Where Rimuru first awakens and meets Veldora.',
      type: PlaceType.CAVE,
      coordinates: { x: -20, y: -10, z: -60 },
    },
    {
      name: 'Farmus Kingdom',
      description: 'A human kingdom that once tried to invade Tempest.',
      type: PlaceType.CITY,
      coordinates: { x: 200, y: 0, z: 0 },
    },
    {
        "name": "Walpurgis Hall",
        "description": "The secret meeting location of the Demon Lords.",
        "type": "building",
        "coordinates": { "x": 500, "y": 100, "z": -100 }
      },
      {
        "name": "Beast Kingdom Eurazania",
        "description": "The homeland of Demon Lord Carrion and his beastmen.",
        "type": "city",
        "coordinates": { "x": -250, "y": 0, "z": -150 }
      },
      {
        "name": "Sarion",
        "description": "The elven Sorcerous Dynasty ruled by Empress Elmesia.",
        "type": "city",
        "coordinates": { "x": 300, "y": 0, "z": -250 }
      },
      {
        "name": "Holy Empire of Lubelius",
        "description": "A religious nation led in secret by Luminous Valentine.",
        "type": "city",
        "coordinates": { "x": 600, "y": 0, "z": 0 }
      },
      {
        "name": "Demon Lord Clayman’s Castle",
        "description": "The gothic-style lair of the manipulative Demon Lord Clayman.",
        "type": "building",
        "coordinates": { "x": 450, "y": 10, "z": -80 }
      },
      {
        "name": "Freedom Association HQ",
        "description": "The neutral organization led by Yuuki Kagurazaka.",
        "type": "building",
        "coordinates": { "x": 350, "y": 0, "z": 150 }
      },
      {
        "name": "Ingracia Kingdom",
        "description": "Human nation that hosts the Freedom Academy.",
        "type": "city",
        "coordinates": { "x": 375, "y": 0, "z": 170 }
      },
      {
        "name": "Freedom Academy",
        "description": "An academy for Otherworlder children taught by Rimuru.",
        "type": "building",
        "coordinates": { "x": 380, "y": 0, "z": 175 }
      },
      {
        "name": "Demon Lord Guy Crimson’s Castle",
        "description": "The icy and intimidating domain of Guy Crimson.",
        "type": "building",
        "coordinates": { "x": 800, "y": 50, "z": -300 }
      },
      {
        "name": "Flame Cavern",
        "description": "A molten cavern home to Ifrit and fire spirits.",
        "type": "cave",
        "coordinates": { "x": -120, "y": -40, "z": -20 }
      },
      {
        "name": "Lake Shion",
        "description": "A serene lake named in honor of Shion’s resurrection.",
        "type": "lake",
        "coordinates": { "x": 10, "y": 0, "z": -90 }
      },
      {
        "name": "Tempest Border Checkpoint",
        "description": "Entry point where travelers are screened when entering Tempest.",
        "type": "building",
        "coordinates": { "x": 20, "y": 0, "z": 10 }
      }
  ];

  const placeIds = {};

  for (const loc of locations) {
    const place = await placeManager.addPlace(loc);
    placeIds[loc.name] = place.id;
  }

  // Generate connections between all unique pairs of locations
  const locationNames = Object.keys(placeIds);
  for (let i = 0; i < locationNames.length; i++) {
    for (let j = i + 1; j < locationNames.length; j++) {
      const from = locationNames[i];
      const to = locationNames[j];

      // Choose connection type based on heuristics (optional)
      let type = ConnectionType.ROAD;
      const fromLoc = locations.find(l => l.name === from);
      const toLoc = locations.find(l => l.name === to);

      // Example: If either is a forest/cave/lake, make it a PATH
      const pathTypes = ['forest', 'cave', 'lake', 'building', 'city'];
      if (
        pathTypes.includes(fromLoc.type.toLowerCase()) ||
        pathTypes.includes(toLoc.type.toLowerCase())
      ) {
        type = ConnectionType.PATH;
      }

      await placeManager.connectPlaces({
        fromPlaceId: placeIds[from],
        toPlaceId: placeIds[to],
        type,
        name: `${from} ↔ ${to}`,
      });
    }
  }
}

generateconnections();