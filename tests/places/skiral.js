/**
 * Class representing a place
 */
class Place {
  /**
   * Create a place
   * @param {Object} params - Place parameters
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    type = PlaceType.OTHER,
    coordinates = { x: 0, y: 0, z: 0 },
    size = { width: 10, height: 10, depth: 10 },
    tags = [],
    properties = {},
    blueprint = null,
    parentId = null,
    children = [],
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.coordinates = coordinates;
    this.size = size;
    this.tags = tags;
    this.properties = properties;
    this.blueprint = blueprint;
    this.parentId = parentId;
    this.children = children;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert place to JSON
   * @returns {Object} JSON representation of place
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      coordinates: this.coordinates,
      size: this.size,
      tags: this.tags,
      properties: this.properties,
      blueprint: this.blueprint,
      parentId: this.parentId,
      children: this.children,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create place from JSON
   * @param {Object} json - JSON representation of place
   * @returns {Place} Place instance
   */
  static fromJSON(json) {
    return new Place({
      id: json.id,
      name: json.name,
      description: json.description,
      type: json.type || PlaceType.OTHER,
      coordinates: json.coordinates || { x: 0, y: 0, z: 0 },
      size: json.size || { width: 10, height: 10, depth: 10 },
      tags: json.tags || [],
      properties: json.properties || {},
      blueprint: json.blueprint,
      parentId: json.parentId,
      children: json.children || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Get place description for display
   * @returns {string} Formatted description
   */
  getFormattedDescription() {
    return `${this.name} (${this.type}): ${this.description}`;
  }

  /**
   * Add a child place ID
   * @param {string} childId - Child place ID
   */
  addChild(childId) {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a child place ID
   * @param {string} childId - Child place ID
   */
  removeChild(childId) {
    const index = this.children.indexOf(childId);
    if (index !== -1) {
      this.children.splice(index, 1);
      this.updatedAt = new Date();
    }
  }
}

/**
 * Class representing a connection between places
 */
class Connection {
  /**
   * Create a connection
   * @param {Object} params - Connection parameters
   */
  constructor({
    id = uuidv4(),
    fromPlaceId,
    toPlaceId,
    type = ConnectionType.PATH,
    name = null,
    description = null,
    bidirectional = true,
    travelTime = 60, // seconds
    distance = 1, // kilometers
    conditions = [], // e.g., ['requires_key', 'daylight_only']
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.fromPlaceId = fromPlaceId;
    this.toPlaceId = toPlaceId;
    this.type = type;
    this.name = name;
    this.description = description;
    this.bidirectional = bidirectional;
    this.travelTime = travelTime;
    this.distance = distance;
    this.conditions = conditions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert connection to JSON
   * @returns {Object} JSON representation of connection
   */
  toJSON() {
    return {
      id: this.id,
      fromPlaceId: this.fromPlaceId,
      toPlaceId: this.toPlaceId,
      type: this.type,
      name: this.name,
      description: this.description,
      bidirectional: this.bidirectional,
      travelTime: this.travelTime,
      distance: this.distance,
      conditions: this.conditions,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create connection from JSON
   * @param {Object} json - JSON representation of connection
   * @returns {Connection} Connection instance
   */
  static fromJSON(json) {
    return new Connection({
      id: json.id,
      fromPlaceId: json.fromPlaceId,
      toPlaceId: json.toPlaceId,
      type: json.type || ConnectionType.PATH,
      name: json.name,
      description: json.description,
      bidirectional: json.bidirectional !== undefined ? json.bidirectional : true,
      travelTime: json.travelTime || 60,
      distance: json.distance || 1,
      conditions: json.conditions || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Get connection description for display
   * @returns {string} Formatted description
   */
  getFormattedDescription() {
    const name = this.name ? this.name : `${this.type} connection`;
    const desc = this.description ? `: ${this.description}` : '';
    const direction = this.bidirectional ? 'bidirectional' : 'one-way';
    return `${name}${desc} (${direction}, ${this.travelTime}s, ${this.distance}km)`;
  }
}

import placeManager, { PlaceType, ConnectionType } from '../../src/places/placeManager.js';
placeManager.initialize();

/**
 * @type {Place[]}
 */
const locations = [
  // The school itself
  {
    id: 'skiral_highschool',
    name: 'Skiral Highschool',
    description: 'A large private school. Contains students from all over the world.',
    type: PlaceType.OTHER,
    children: [
      'skiral_highschool_gate',
      'classrooms', 'science_lab', 'computer_lab', 'library', 'cafeteria',
      'gymnasium', 'auditorium', 'principal_office', 'teachers_lounge',
      'nurses_office', 'restrooms', 'locker_rooms', 'hallways', 'courtyard',
      'parking_lot', 'art_room', 'music_room', 'drama_theater', 'storage_room',
      'janitor_closet', 'sports_field'
    ],
    size: { width: 800000, height: 25000, depth: 200000 },
    coordinates: { x: 200, y: 0, z: 200 },
  },

  /**
   * School Fronts
   */
  {
    id: 'skiral_highschool_gate',
    name: 'Skiral Highschool Entrance',
    description: 'The gate to the Skiral Highschool.',
    type: PlaceType.OTHER,
    coordinates: { x: 200, y: 0, z: 200 },
  },
  {
    id: 'courtyard',
    name: 'Courtyard',
    type: PlaceType.FIELD,
    description: 'Open space in the middle of the school for outdoor relaxation.',
    coordinates: { x: 340, y: 0, z: 210 }
  },
  {
    id: 'parking_lot',
    name: 'Parking Lot',
    type: PlaceType.OTHER,
    description: 'Area for student and staff vehicles.',
    coordinates: { x: 350, y: 0, z: 210 }
  },


  /**
   * Classrooms
   */
  {
    id: 'classrooms',
    name: 'Classrooms',
    description: 'Rows of rooms for standard subjects and lectures.',
    type: PlaceType.ROOM,
    children: [
      'classroom_1', 'classroom_2', 'classroom_3', 'classroom_4', 'classroom_5',
      'classroom_6', 'classroom_7', 'classroom_8', 'classroom_9', 'classroom_10',
    ],
    coordinates: { x: 210, y: 0, z: 210 }
  },
  {
    id: 'classroom_1',
    name: 'Classroom 1',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 210, y: 0, z: 210 }
  },
  {
    id: 'classroom_2',
    name: 'Classroom 2',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 220, y: 0, z: 210 }
  },
  {
    id: 'classroom_3',
    name: 'Classroom 3',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 230, y: 0, z: 210 }
  },
  {
    id: 'classroom_4',
    name: 'Classroom 4',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 240, y: 0, z: 210 }
  },
  {
    id: 'classroom_5',
    name: 'Classroom 5',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 250, y: 0, z: 210 }
  },
  {
    id: 'classroom_6',
    name: 'Classroom 6',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 210, y: 0, z: 220 }
  },
  {
    id: 'classroom_7',
    name: 'Classroom 7',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 220, y: 0, z: 220 }
  },
  {
    id: 'classroom_8',
    name: 'Classroom 8',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 230, y: 0, z: 220 }
  },
  {
    id: 'classroom_9',
    name: 'Classroom 9',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 240, y: 0, z: 220 }
  },
  {
    id: 'classroom_10',
    name: 'Classroom 10',
    type: PlaceType.ROOM,
    description: 'Room for standard subjects and lectures.',
    coordinates: { x: 250, y: 0, z: 220 }
  },

  /**
   * Designated Subject Classrooms
   */
  {
    id: 'science_lab',
    name: 'Science Lab',
    description: 'Equipped with tools and stations for physics, chemistry, and biology.',
    coordinates: { x: 220, y: 0, z: 210 }
  },
  {
    id: 'computer_lab',
    name: 'Computer Lab',
    description: 'Room with rows of computers for programming and IT classes.',
    coordinates: { x: 230, y: 0, z: 210 }
  },
  {
    id: 'art_room',
    name: 'Art Room',
    description: 'Creative space for painting, drawing, and sculpting.',
    coordinates: { x: 360, y: 0, z: 210 }
  },
  {
    id: 'music_room',
    name: 'Music Room',
    description: 'Equipped with instruments and space for band practice.',
    coordinates: { x: 370, y: 0, z: 210 }
  },
  {
    id: 'drama_theater',
    name: 'Drama Theater',
    description: 'Smaller performance area for rehearsals and theater classes.',
    coordinates: { x: 380, y: 0, z: 210 }
  },

  /**
   * Offices
   */
  {
    id: 'principal_office',
    name: 'Principal’s Office',
    description: 'The main office where the principal manages school operations.',
    coordinates: { x: 280, y: 0, z: 210 }
  },
  {
    id: 'teachers_lounge',
    name: 'Teachers’ Lounge',
    description: 'Relaxation area for staff between classes.',
    coordinates: { x: 290, y: 0, z: 210 }
  },
  {
    id: 'nurses_office',
    name: 'Nurse’s Office',
    description: 'Medical care room for students who feel unwell.',
    coordinates: { x: 300, y: 0, z: 210 }
  },

  /**
   * Common Facilities
   */
  {
    id: 'restrooms',
    name: 'Restrooms',
    description: 'Bathrooms located throughout the campus.',
    coordinates: { x: 310, y: 0, z: 210 }
  },
  {
    id: 'locker_rooms',
    name: 'Locker Rooms',
    description: 'Changing rooms for PE and after-school sports.',
    coordinates: { x: 320, y: 0, z: 210 }
  },


  /**
   * Common Areas
   */
  {
    id: 'library',
    name: 'Library',
    description: 'Quiet area filled with books, resources, and study desks.',
    coordinates: { x: 240, y: 0, z: 210 }
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    description: 'Dining area where students eat lunch and socialize.',
    coordinates: { x: 250, y: 0, z: 210 }
  },
  {
    id: 'gymnasium',
    name: 'Gymnasium',
    description: 'Large indoor court for sports and PE classes.',
    coordinates: { x: 260, y: 0, z: 210 }
  },
  {
    id: 'auditorium',
    name: 'Auditorium',
    description: 'Stage and seating area for events, plays, and assemblies.',
    coordinates: { x: 270, y: 0, z: 210 }
  },

  /**
   * Common Corridors
   */
  {
    id: 'hallways',
    name: 'Hallways',
    description: 'Corridors connecting classrooms and departments.',
    coordinates: { x: 330, y: 0, z: 210 }
  },
  {
    id: 'storage_room',
    name: 'Storage Room',
    description: 'Room for storing school supplies and equipment.',
    coordinates: { x: 390, y: 0, z: 210 }
  },
  {
    id: 'janitor_closet',
    name: 'Janitor’s Closet',
    description: 'Utility room for cleaning supplies and janitorial tools.',
    coordinates: { x: 400, y: 0, z: 210 }
  },

  /**
   * Outdoors
   */
  {
    id: 'sports_field',
    name: 'Outdoor Sports Field',
    description: 'Open field for soccer, football, and track events.',
    coordinates: { x: 410, y: 0, z: 210 }
  },
];

/**
 * @type {Connection[]}
 */
const connections = [
  // Gate to Courtyard
  {
    id: 'skiral_highschool_gate_courtyard',
    fromPlaceId: 'skiral_highschool_gate',
    toPlaceId: 'courtyard',
    type: ConnectionType.DOOR,
    name: 'Main Entrance Path',
    description: 'Pathway from the front gate to the courtyard.',
    bidirectional: true,
    travelTime: 30,
    distance: 0.05
  },

  // Courtyard core connections
  {
    id: 'courtyard_to_hallways',
    fromPlaceId: 'courtyard',
    toPlaceId: 'hallways',
    type: ConnectionType.PATH,
    name: 'Courtyard to Hallways',
    travelTime: 20,
    distance: 0.03
  },
  {
    id: 'courtyard_to_cafeteria',
    fromPlaceId: 'courtyard',
    toPlaceId: 'cafeteria',
    type: ConnectionType.PATH,
    name: 'Courtyard to Cafeteria',
    travelTime: 15,
    distance: 0.025
  },
  {
    id: 'courtyard_to_auditorium',
    fromPlaceId: 'courtyard',
    toPlaceId: 'auditorium',
    type: ConnectionType.PATH,
    name: 'Courtyard to Auditorium',
    travelTime: 20,
    distance: 0.03
  },
  {
    id: 'courtyard_to_library',
    fromPlaceId: 'courtyard',
    toPlaceId: 'library',
    type: ConnectionType.PATH,
    name: 'Courtyard to Library',
    travelTime: 25,
    distance: 0.04
  },
  {
    id: 'courtyard_to_parking_lot',
    fromPlaceId: 'courtyard',
    toPlaceId: 'parking_lot',
    type: ConnectionType.PATH,
    name: 'Courtyard to Parking Lot',
    travelTime: 40,
    distance: 0.06
  },

  // Hallways to primary areas
  {
    id: 'hallways_to_classrooms',
    fromPlaceId: 'hallways',
    toPlaceId: 'classrooms',
    type: ConnectionType.PATH,
    name: 'Hallways to Classrooms',
    travelTime: 30,
    distance: 0.05
  },
  {
    id: 'hallways_to_gymnasium',
    fromPlaceId: 'hallways',
    toPlaceId: 'science_lab',
    type: ConnectionType.PATH,
    travelTime: 20,
    distance: 0.03
  },
  {
    id: 'hallways_to_computer_lab',
    fromPlaceId: 'hallways',
    toPlaceId: 'computer_lab',
    type: ConnectionType.PATH,
    travelTime: 20,
    distance: 0.03
  },
  {
    id: 'hallways_to_art_room',
    fromPlaceId: 'hallways',
    toPlaceId: 'art_room',
    type: ConnectionType.PATH,
    travelTime: 35,
    distance: 0.05
  },
  {
    id: 'hallways_to_music_room',
    fromPlaceId: 'hallways',
    toPlaceId: 'music_room',
    type: ConnectionType.PATH,
    travelTime: 40,
    distance: 0.06
  },
  {
    id: 'hallways_to_drama_theater',
    fromPlaceId: 'hallways',
    toPlaceId: 'drama_theater',
    type: ConnectionType.PATH,
    travelTime: 45,
    distance: 0.07
  },
  {
    id: 'hallways_to_principal_office',
    fromPlaceId: 'hallways',
    toPlaceId: 'principal_office',
    type: ConnectionType.PATH,
    travelTime: 25,
    distance: 0.04
  },
  {
    id: 'hallways_to_teachers_lounge',
    fromPlaceId: 'hallways',
    toPlaceId: 'teachers_lounge',
    type: ConnectionType.PATH,
    travelTime: 25,
    distance: 0.04
  },
  {
    id: 'hallways_to_nurses_office',
    fromPlaceId: 'hallways',
    toPlaceId: 'nurses_office',
    type: ConnectionType.PATH,
    travelTime: 30,
    distance: 0.05
  },
  {
    id: 'hallways_to_restrooms',
    fromPlaceId: 'hallways',
    toPlaceId: 'restrooms',
    type: ConnectionType.PATH,
    travelTime: 15,
    distance: 0.02
  },

  // Gym & Locker Rooms
  {
    id: 'hallways_to_gymnasium',
    fromPlaceId: 'hallways',
    toPlaceId: 'gymnasium',
    type: ConnectionType.PATH,
    travelTime: 30,
    distance: 0.05
  },
  {
    id: 'gymnasium_to_locker_rooms',
    fromPlaceId: 'gymnasium',
    toPlaceId: 'locker_rooms',
    type: ConnectionType.PATH,
    travelTime: 10,
    distance: 0.015
  },
  {
    id: 'locker_rooms_to_restrooms',
    fromPlaceId: 'locker_rooms',
    toPlaceId: 'restrooms',
    type: ConnectionType.PATH,
    travelTime: 10,
    distance: 0.015
  },

  // Additional corridor connections
  {
    id: 'hallways_to_storage_room',
    fromPlaceId: 'hallways',
    toPlaceId: 'storage_room',
    type: ConnectionType.PATH,
    travelTime: 35,
    distance: 0.05
  },
  {
    id: 'hallways_to_janitor_closet',
    fromPlaceId: 'hallways',
    toPlaceId: 'janitor_closet',
    type: ConnectionType.PATH,
    travelTime: 40,
    distance: 0.06
  },
  {
    id: 'hallways_to_sports_field',
    fromPlaceId: 'hallways',
    toPlaceId: 'sports_field',
    type: ConnectionType.PATH,
    travelTime: 50,
    distance: 0.08
  }
];

/**
 * Generate the world
 * @param {Connection[]} connections
 * @param {Place[]} locations 
 */
async function generate(locations, connections) {
  const placeIds = {};

  for (const loc of locations) {
    const place = await placeManager.addPlace(loc);
    placeIds[loc.name] = place.id;
  }

  for (const conn of connections) {
    await placeManager.connectPlaces({
      ...conn,
      name: `${conn.fromPlaceId} ↔ ${conn.toPlaceId}`,
    });
  }
}

generate(locations, connections);