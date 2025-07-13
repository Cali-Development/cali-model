import Database from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import config from '../config.js';
import util from 'util';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Class representing a memory
 */
class Memory {
  /**
   * Create a memory
   * @param {Object} params - Memory parameters
   * @param {string} params.id - Unique identifier
   * @param {string} params.content - Memory content
   * @param {string} params.conversationId - ID of the conversation this memory belongs to
   * @param {Date} params.createdAt - Real-world creation timestamp
   * @param {string[]} params.tags - Array of tags
   * @param {string[]} params.keywords - Array of keywords
   * @param {string[]} params.relatedTo - Array of related memory IDs
   * @param {Object} params.metadata - Additional metadata
   */
  constructor({
    id = uuidv4(),
    content,
    conversationId,
    createdAt = new Date(),
    tags = [],
    keywords = [],
    relatedTo = [],
    metadata = {}
  }) {
    this.id = id;
    this.content = content;
    this.conversationId = conversationId;
    this.createdAt = createdAt;
    this.tags = tags;
    this.keywords = keywords;
    this.relatedTo = relatedTo;
    this.metadata = metadata;
  }

  /**
   * Convert memory to JSON
   * @returns {Object} JSON representation of memory
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      conversationId: this.conversationId,
      createdAt: this.createdAt.toISOString(),
      tags: this.tags,
      keywords: this.keywords,
      relatedTo: this.relatedTo,
      metadata: this.metadata
    };
  }

  /**
   * Create memory from JSON
   * @param {Object} json - JSON representation of memory
   * @returns {Memory} Memory instance
   */
  static fromJSON(json) {
    return new Memory({
      id: json.id,
      content: json.content,
      conversationId: json.conversationId,
      createdAt: new Date(json.createdAt),
      tags: json.tags,
      keywords: json.keywords,
      relatedTo: json.relatedTo,
      metadata: json.metadata
    });
  }
}

/**
 * Class for managing memories
 */
class MemoryManager {
  /**
   * Create a memory manager
   */
  constructor() {
    this.dbPath = config.database.path;
    this.maxMemoriesPerConversation = config.memory.maxMemoriesPerConversation;
    this.maxGlobalMemories = config.memory.maxGlobalMemories;
    this.relevanceThreshold = config.memory.relevanceThreshold;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the memory manager
   */
  async initialize() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = dirname(this.dbPath);
      await mkdir(dataDir, { recursive: true });
      
      // Open database connection
      this.db = new Database.Database(this.dbPath);
      
      // Create tables if they don't exist
      this._createTables();
      
      // Set pragmas for performance
      this.db.exec('PRAGMA journal_mode = WAL');      // Enables WAL mode
      this.db.exec('PRAGMA synchronous = NORMAL');    // Sets sync behavior to NORMAL
      
      this.initialized = true;
      console.log(`Memory Manager initialized with database at ${this.dbPath}`);
      
      // Schedule memory pruning if enabled
      if (config.memory.pruneInterval > 0) {
        setInterval(() => this.pruneOldMemories(), config.memory.pruneInterval);
      }
    } catch (error) {
      console.error('Failed to initialize Memory Manager:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   * @private
   */
  _createTables() {
    // Create memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata TEXT
      )
    `);

    // Create tags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_tags (
        memory_id TEXT,
        tag TEXT,
        PRIMARY KEY (memory_id, tag),
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      )
    `);

    // Create keywords table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_keywords (
        memory_id TEXT,
        keyword TEXT,
        PRIMARY KEY (memory_id, keyword),
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      )
    `);

    // Create relationships table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_relationships (
        memory_id TEXT,
        related_memory_id TEXT,
        PRIMARY KEY (memory_id, related_memory_id),
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (related_memory_id) REFERENCES memories(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_conversation_id ON memories(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_memory_keywords_keyword ON memory_keywords(keyword);
    `);
  }

  /**
   * Add a new memory
   * @param {Object} memoryData - Memory data
   * @param {string} memoryData.content - Memory content
   * @param {string} memoryData.conversationId - ID of the conversation this memory belongs to
   * @param {string[]} [memoryData.tags] - Array of tags
   * @param {string[]} [memoryData.keywords] - Array of keywords
   * @param {string[]} [memoryData.relatedTo] - Array of related memory IDs
   * @param {Object} [memoryData.metadata] - Additional metadata
   * @returns {Memory} The newly created memory
   */
  async addMemory({
    content,
    conversationId,
    tags = [],
    keywords = [],
    relatedTo = [],
    metadata = {}
  }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!content || !conversationId) {
        throw new Error('Memory content and conversationId are required');
      }

      // Create memory instance
      const memory = new Memory({
        content,
        conversationId,
        tags,
        keywords,
        relatedTo,
        metadata
      });

      // Begin transaction
      const insertMemory = this.db.prepare(`
        INSERT INTO memories (id, content, conversation_id, created_at, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertTag = this.db.prepare(`
        INSERT INTO memory_tags (memory_id, tag)
        VALUES (?, ?)
      `);

      const insertKeyword = this.db.prepare(`
        INSERT INTO memory_keywords (memory_id, keyword)
        VALUES (?, ?)
      `);

      const insertRelationship = this.db.prepare(`
        INSERT INTO memory_relationships (memory_id, related_memory_id)
        VALUES (?, ?)
      `);

      // Execute transaction
      this.db.exec("BEGIN TRANSACTION", () => {
        insertMemory.run(
          memory.id,
          memory.content,
          memory.conversationId,
          memory.createdAt.toISOString(),
          JSON.stringify(memory.metadata)
        );

        for (const tag of memory.tags) {
          insertTag.run(memory.id, tag);
        }

        for (const keyword of memory.keywords) {
          insertKeyword.run(memory.id, keyword);
        }

        for (const relatedId of memory.relatedTo) {
          insertRelationship.run(memory.id, relatedId);
        }
      });

      this.db.exec("COMMIT");
      console.log(`Memory created with ID: ${memory.id}`);
      return memory;
    } catch (error) {
      console.error('Failed to add memory:', error);
      throw error;
    }
  }

  /**
   * Get a memory by ID
   * @param {string} id - Memory ID
   * @returns {Memory|null} Memory instance or null if not found
   */
  async getMemory(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Promisify the db methods for convenience
      const dbGet = util.promisify(this.db.get.bind(this.db));
      const dbAll = util.promisify(this.db.all.bind(this.db));

      // Get memory row
      const memoryRow = await dbGet(`
        SELECT id, content, conversation_id, created_at, metadata
        FROM memories
        WHERE id = ?
      `, [id]);

      if (!memoryRow) {
        return null;
      }

      // Get tags
      const tagRows = await dbAll(`SELECT tag FROM memory_tags WHERE memory_id = ?`, [id]);
      const tags = tagRows.map(row => row.tag);

      // Get keywords
      const keywordRows = await dbAll(`SELECT keyword FROM memory_keywords WHERE memory_id = ?`, [id]);
      const keywords = keywordRows.map(row => row.keyword);

      // Get related memory IDs
      const relatedRows = await dbAll(`SELECT related_memory_id FROM memory_relationships WHERE memory_id = ?`, [id]);
      const relatedTo = relatedRows.map(row => row.related_memory_id);

      // Create memory instance
      const memory = new Memory({
        id: memoryRow.id,
        content: memoryRow.content,
        conversationId: memoryRow.conversation_id,
        createdAt: new Date(memoryRow.created_at),
        tags,
        keywords,
        relatedTo,
        metadata: JSON.parse(memoryRow.metadata)
      });

      return memory;

    } catch (error) {
      console.error(`Failed to get memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get relevant memories based on a query
   * @param {Object} params - Query parameters
   * @param {string} params.query - Search query
   * @param {string} [params.agentId] - Filter by agent ID
   * @param {number} [params.maxCount=10] - Maximum number of memories to return
   * @param {string[]} [params.tags] - Filter by tags
   * @param {Date} [params.fromDate] - Filter by in-universe date (from)
   * @param {Date} [params.toDate] - Filter by in-universe date (to)
   * @returns {Memory[]} Array of relevant memories
   */
async getRelevantMemories({
    query,
    conversationId,
    maxCount = 10,
    tags = []
  }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      let whereConditions = [];
      let params = [];

      // Add conversation filter if provided
      if (conversationId) {
        whereConditions.push('m.conversation_id = ?');
        params.push(conversationId);
      }

      // Construct WHERE clause
      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query base: get all memories that match the filters
      let sql = `
        SELECT DISTINCT m.id, m.content, m.conversation_id, m.created_at, m.metadata
        FROM memories m
      `;

      // Add tag filtering if needed
      if (tags.length > 0) {
        sql += `
          INNER JOIN (
            SELECT memory_id
            FROM memory_tags
            WHERE tag IN (${tags.map(() => '?').join(',')})
            GROUP BY memory_id
            HAVING COUNT(DISTINCT tag) = ?
          ) t ON m.id = t.memory_id
        `;
        params.push(...tags, tags.length);
      }

      // Add the WHERE clause
      sql += whereClause;

      // Add ordering and limit
      sql += `
        ORDER BY m.created_at DESC
        LIMIT ?
      `;
      params.push(maxCount);

      // Execute query
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, async (err, memoryRows) => {
          if (err) return reject(err);
          try {
            // Fetch full memory details for each result
            const memories = [];
            for (const row of memoryRows) {
              const memory = await this.getMemory(row.id);
              memories.push(memory);
            }

            // If query is provided, we'll need to sort by relevance
            // This is a simplistic approach - for a real system, you might use 
            // embedding similarity or an AI model to determine relevance
            if (query) {
              // Simple relevance scoring based on content matching
              const queryTerms = query.toLowerCase().split(/\s+/);
              memories.sort((a, b) => {
                const scoreA = this._calculateRelevanceScore(a, queryTerms);
                const scoreB = this._calculateRelevanceScore(b, queryTerms);
                return scoreB - scoreA; // Sort descending by score
              });
            }
            resolve(memories);
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (error) {
      console.error('Failed to get relevant memories:', error);
      throw error;
    }
  }

  /**
   * Calculate a simple relevance score for a memory
   * @param {Memory} memory - Memory to score
   * @param {string[]} queryTerms - Search query terms
   * @returns {number} Relevance score
   * @private
   */
  _calculateRelevanceScore(memory, queryTerms) {
    let score = 0;
    
    // Check content for query terms
    const content = memory.content.toLowerCase();
    for (const term of queryTerms) {
      if (content.includes(term)) {
        score += 1;
      }
    }
    
    // Check keywords for exact matches
    for (const keyword of memory.keywords) {
      if (queryTerms.includes(keyword.toLowerCase())) {
        score += 2; // Keywords are more important than content matches
      }
    }
    
    // Check tags for exact matches
    for (const tag of memory.tags) {
      if (queryTerms.includes(tag.toLowerCase())) {
        score += 3; // Tags are more important than keywords
      }
    }
    
    // Recency bonus (memories from the last day get a small boost)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (memory.createdAt > oneDayAgo) {
      score += 0.5;
    }
    
    return score;
  }

  /**
   * Search memories by keyword
   * @param {string} keyword - Keyword to search for
   * @param {string} [agentId] - Filter by agent ID
   * @param {number} [maxCount=50] - Maximum number of memories to return
   * @returns {Memory[]} Array of matching memories
   */
async searchMemoriesByKeyword(keyword, conversationId, maxCount = 50) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      let whereConditions = ['k.keyword = ?'];
      const params = [keyword];

      // Add conversation filter if provided
      if (conversationId) {
        whereConditions.push('m.conversation_id = ?');
        params.push(conversationId);
      }

      // Construct WHERE clause
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Query to get memories with the specific keyword
      const sql = `
        SELECT DISTINCT m.id, m.content, m.conversation_id, m.created_at, m.metadata
        FROM memories m
        INNER JOIN memory_keywords k ON m.id = k.memory_id
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT ?
      `;
      params.push(maxCount);

      // Execute query
      const memoryRows = this.db.prepare(sql).all(...params);

      // Fetch full memory details for each result
      const memories = [];
      for (const row of memoryRows) {
        const memory = await this.getMemory(row.id);
        memories.push(memory);
      }

      return memories;
    } catch (error) {
      console.error(`Failed to search memories by keyword ${keyword}:`, error);
      throw error;
    }
  }

  /**
   * List all memories for an agent
   * @param {string} [agentId] - Filter by agent ID (optional)
   * @param {number} [limit=100] - Maximum number of memories to return
   * @param {number} [offset=0] - Offset for pagination
   * @returns {Memory[]} Array of memories
   */
async listAllMemories(conversationId, limit = 100, offset = 0) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      let whereClause = '';
      const params = [];

      // Add conversation filter if provided
      if (conversationId) {
        whereClause = 'WHERE conversation_id = ?';
        params.push(conversationId);
      }

      // Query to get all memories with pagination
      const sql = `
        SELECT id, content, conversation_id, created_at, metadata
        FROM memories
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      // Execute query
      const memoryRows = this.db.prepare(sql).all(...params);

      // Fetch full memory details for each result
      const memories = [];
      for (const row of memoryRows) {
        const memory = await this.getMemory(row.id);
        memories.push(memory);
      }

      return memories;
    } catch (error) {
      console.error('Failed to list all memories:', error);
      throw error;
    }
  }

  /**
   * Prune old memories based on retention settings
   * @param {string} [agentId] - Only prune memories for this agent (optional)
   * @returns {number} Number of memories pruned
   */
async pruneOldMemories(conversationId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const retention = config.memory.defaultMemoryRetention;
      const cutoffDate = new Date(Date.now() - retention);
      
      let whereConditions = ['created_at = ?'];
      const params = [cutoffDate.toISOString()];

      // Add conversation filter if provided
      if (conversationId) {
        whereConditions.push('conversation_id = ?');
        params.push(conversationId);
      }

      // Construct WHERE clause
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get count of memories to be deleted
      const countSql = `
        SELECT COUNT(*) as count
        FROM memories
        ${whereClause}
      `;
      const { count } = this.db.prepare(countSql).get(...params);

      if (count === 0) {
        console.log('No memories to prune');
        return 0;
      }

      // Delete old memories
      const deleteSql = `
        DELETE FROM memories
        ${whereClause}
      `;
      this.db.prepare(deleteSql).run(...params);

      console.log(`Pruned ${count} old memories`);
      return count;
    } catch (error) {
      console.error('Failed to prune old memories:', error);
      throw error;
    }
  }

  /**
   * Delete a memory by ID
   * @param {string} id - Memory ID
   * @returns {boolean} True if the memory was deleted, false if it wasn't found
   */
  async deleteMemory(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Delete memory
      const result = this.db.prepare(`
        DELETE FROM memories
        WHERE id = ?
      `).run(id);

      // The related tables (tags, keywords, relationships) will be deleted automatically
      // due to the ON DELETE CASCADE constraints

      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to delete memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a memory
   * @param {string} id - Memory ID
   * @param {Object} updates - Fields to update
   * @returns {Memory|null} Updated memory or null if not found
   */
  async updateMemory(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Get the existing memory
      const memory = await this.getMemory(id);
      if (!memory) {
        return null;
      }

// Update memory fields
      if (updates.content) memory.content = updates.content;
      if (updates.conversationId) memory.conversationId = updates.conversationId;
      if (updates.tags) memory.tags = updates.tags;
      if (updates.keywords) memory.keywords = updates.keywords;
      if (updates.relatedTo) memory.relatedTo = updates.relatedTo;
      if (updates.metadata) memory.metadata = { ...memory.metadata, ...updates.metadata };

      // Begin transaction
      const updateMemory = this.db.prepare(`
        UPDATE memories
        SET content = ?, conversation_id = ?, metadata = ?
        WHERE id = ?
      `);

      const deleteTagsForMemory = this.db.prepare(`
        DELETE FROM memory_tags
        WHERE memory_id = ?
      `);

      const deleteKeywordsForMemory = this.db.prepare(`
        DELETE FROM memory_keywords
        WHERE memory_id = ?
      `);

      const deleteRelationshipsForMemory = this.db.prepare(`
        DELETE FROM memory_relationships
        WHERE memory_id = ?
      `);

      const insertTag = this.db.prepare(`
        INSERT INTO memory_tags (memory_id, tag)
        VALUES (?, ?)
      `);

      const insertKeyword = this.db.prepare(`
        INSERT INTO memory_keywords (memory_id, keyword)
        VALUES (?, ?)
      `);

      const insertRelationship = this.db.prepare(`
        INSERT INTO memory_relationships (memory_id, related_memory_id)
        VALUES (?, ?)
      `);

      // Execute transaction
      this.db.exec("BEGIN TRANSACTION", () => {
        updateMemory.run(
          memory.content,
          memory.conversationId,
          JSON.stringify(memory.metadata),
          memory.id
        );

        // Update tags
        if (updates.tags) {
          deleteTagsForMemory.run(memory.id);
          for (const tag of memory.tags) {
            insertTag.run(memory.id, tag);
          }
        }

        // Update keywords
        if (updates.keywords) {
          deleteKeywordsForMemory.run(memory.id);
          for (const keyword of memory.keywords) {
            insertKeyword.run(memory.id, keyword);
          }
        }

        // Update relationships
        if (updates.relatedTo) {
          deleteRelationshipsForMemory.run(memory.id);
          for (const relatedId of memory.relatedTo) {
            insertRelationship.run(memory.id, relatedId);
          }
        }
      });

      this.db.exec("COMMIT");
      console.log(`Memory updated with ID: ${memory.id}`);
      return memory;
    } catch (error) {
      console.error(`Failed to update memory with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      console.log('Memory Manager database connection closed');
    }
  }
}

// Create and export a singleton instance
const memoryManager = new MemoryManager();
export default memoryManager;

// Also export the Memory class for direct use
export { Memory };

