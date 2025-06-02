import scenarioManager from '../../src/scenario/scenarioManager.js';

scenarioManager.updateScenario({
    name: 'We got sent into the world of Reincarnated as a slime!',
    description: 'A story of Satoru Mikami reincarnating into a fantasy world as a slime and building a peaceful monster nation. But in our perspective, of us, Cassitly, meeting him.',
    worldState: {
      currentEvents: ['Rimuru gains new allies']
    }
});

scenarioManager.addPlot({
  title: 'The Beginning',
  description: 'The story of Satoru Mikami reincarnating into a fantasy world as a slime and building a peaceful monster nation. But in our perspective, of us, Cassitly, meeting him.'
  + 'Cassitly has the power of the IRF (Imaginative Resonance Framework) nicknamed the magic system, a system with incomprehensible power.'
  + 'This system, gives Cassitly, the only one to be able to imagine anything into reality, conjure things from nothing.'
  + 'Create skills from nothing, and make the world of Reincarnated as a slime, their own.',
  characters: ['Cassitly', 'Girl with god-like powers'],
  location: 'Tokyo',
  tags: ['Origin', 'Reincarnation'],
});

scenarioManager.addPlot({
  title: 'Death and Reincarnation',
  description: 'Satoru Mikami dies protecting a coworker and is reincarnated in a fantasy world as a slime with unique skills.',
  characters: ['Satoru Mikami', 'Voice of the World'],
  location: 'Tokyo → Fantasy World',
  tags: ['Reincarnation', 'Origin'],
});

scenarioManager.addPlot({
  title: 'Meeting Veldora',
  description: 'The newly reincarnated slime meets the Storm Dragon Veldora and befriends him, gaining the name Rimuru Tempest.',
  characters: ['Rimuru Tempest', 'Veldora'],
  location: 'Cave of Sealing',
  tags: ['Friendship', 'Power Acquisition'],
});

scenarioManager.addPlot({
  title: 'Goblin Village Alliance',
  description: 'Rimuru helps a goblin village fend off dire wolves and later unites them into a single community under his leadership.',
  characters: ['Rimuru Tempest', 'Gobta', 'Ranga'],
  location: 'Goblin Village',
  tags: ['Leadership', 'Community'],
});

scenarioManager.addPlot({
  title: 'Encounter with the Dwarves',
  description: 'Rimuru travels to the Dwarven Kingdom to seek help in building the village and gains powerful allies.',
  characters: ['Rimuru Tempest', 'Kaijin', 'Vesta'],
  location: 'Dwarven Kingdom',
  tags: ['Diplomacy', 'Alliance'],
});

scenarioManager.addPlot({
  title: 'Shizu\'s Farewell',
  description: 'Rimuru meets the possessed hero Shizu, who eventually dies and passes on her will and face to Rimuru.',
  characters: ['Rimuru Tempest', 'Shizu'],
  location: 'City of Brumund',
  tags: ['Tragedy', 'Legacy'],
});

scenarioManager.addPlot({
  title: 'Founding of Tempest',
  description: 'Rimuru officially establishes the Jura Tempest Federation, attracting diverse races and growing in power.',
  characters: ['Rimuru Tempest', 'Gobta', 'Benimaru', 'Shion'],
  location: 'Jura Forest',
  tags: ['Nation Building', 'Unity'],
});

scenarioManager.addPlot({
  title: 'Orc Disaster',
  description: 'Rimuru and his allies defeat the Orc Lord, saving the region from destruction and forming more alliances.',
  characters: ['Rimuru Tempest', 'Geld', 'Benimaru'],
  location: 'Jura Forest',
  tags: ['Battle', 'Unity'],
});

const arraryOfPlots = [
  {
    title: 'Training the Children',
    description: 'Rimuru travels to the Ingracia Kingdom to fulfill Shizu’s wish and teaches her former students, saving them with summoned spirits.',
    characters: ['Rimuru Tempest', 'Shizu', 'Chloe', 'Alice', 'Gale'],
    location: 'Ingracia Kingdom',
    tags: ['Promise', 'Mentorship']
  },
  {
    title: 'Return to Tempest',
    description: 'Rimuru returns to Tempest after training the children, only to discover increasing tensions with human nations.',
    characters: ['Rimuru Tempest', 'Benimaru', 'Shion'],
    location: 'Jura Tempest Federation',
    tags: ['Tension', 'Foreshadowing']
  },
  {
    title: 'Invasion of Tempest',
    description: 'The Kingdom of Falmuth invades Tempest while Rimuru is away, leading to the massacre of many civilians including Shion.',
    characters: ['Rimuru Tempest', 'Shion', 'King Edmaris'],
    location: 'Jura Tempest Federation',
    tags: ['War', 'Massacre', 'Trigger Event']
  },
  {
    title: 'Becoming a Demon Lord',
    description: 'To save his people, Rimuru performs a mass soul harvest, ascends to Demon Lord status, and resurrects the dead, including Shion.',
    characters: ['Rimuru Tempest', 'Shion', 'Great Sage / Raphael'],
    location: 'Tempest & Battlefield',
    tags: ['Transformation', 'Rebirth', 'Power-up']
  },
  {
    title: 'Creation of Raphael',
    description: 'Great Sage evolves into Raphael, an intelligent unique skill that drastically enhances Rimuru’s analytical and magical capacity.',
    characters: ['Rimuru Tempest', 'Raphael'],
    location: 'Internal / Skill Space',
    tags: ['Skill Evolution', 'Intelligence']
  },
  {
    title: 'Defeat of Clayman',
    description: 'Rimuru participates in Walpurgis, exposing and defeating Demon Lord Clayman, solidifying his position among the Demon Lords.',
    characters: ['Rimuru Tempest', 'Clayman', 'Milim', 'Guy Crimson'],
    location: 'Walpurgis Council',
    tags: ['Political Power', 'Revenge', 'Recognition']
  },
  {
    title: 'New Demon Lord Alliance',
    description: 'Rimuru, Milim, Ramiris, and others form a new alliance among friendly Demon Lords to reshape the continent’s power balance.',
    characters: ['Rimuru Tempest', 'Milim', 'Ramiris'],
    location: 'Demon Lord Territories',
    tags: ['Alliance', 'Politics', 'Strategy']
  },
  {
    title: 'Veldora’s Rebirth',
    description: 'Veldora is released from his centuries-long prison and given a new physical form thanks to Rimuru’s magic.',
    characters: ['Veldora', 'Rimuru Tempest'],
    location: 'Tempest',
    tags: ['Dragon', 'Resurrection', 'Friendship']
  },
  {
    title: 'Establishing Diplomatic Ties',
    description: 'Tempest signs treaties with neighboring countries like Dwargon and Blumund, legitimizing its status on the world stage.',
    characters: ['Rimuru Tempest', 'King Gazel', 'Yūki Kagurazaka'],
    location: 'Dwargon, Blumund, Tempest',
    tags: ['Diplomacy', 'Nation Building']
  },
  {
    title: 'Tensions with the Holy Church',
    description: 'The Western Holy Church begins to see Rimuru and Tempest as a threat, setting the stage for future conflict.',
    characters: ['Hinata Sakaguchi', 'Rimuru Tempest'],
    location: 'Western Nations',
    tags: ['Religious Conflict', 'Foreshadowing']
  },
  {
    title: 'Hinata vs Rimuru',
    description: 'Hinata ambushes Rimuru in a duel, believing him to be evil. Their misunderstanding leads to a tense and brutal fight.',
    characters: ['Rimuru Tempest', 'Hinata Sakaguchi'],
    location: 'Remote Forest Area',
    tags: ['Battle', 'Misunderstanding']
  },
  {
    title: 'Rimuru the King',
    description: 'Rimuru officially declares himself as king of Tempest and focuses on developing the infrastructure, defense, and economy.',
    characters: ['Rimuru Tempest', 'Benimaru', 'Diablo'],
    location: 'Jura Tempest Federation',
    tags: ['Kingdom Building', 'Stability']
  }
]

arraryOfPlots.forEach(plot => {
  scenarioManager.addPlot(plot);
})

scenarioManager.saveScenario();
