// models/tutorial_skill_model.js
const mongoose = require('mongoose');

// Define Tutorial Categories as enum
const TUTORIAL_CATEGORIES = {
  NIGHT_CLASS: 'Jupeb Night Class',
  PAST_QUESTION_VIDEOS: 'Jupeb Past Question Videos'
};

// Define SkillUp Categories as enum
const SKILLUP_CATEGORIES = {
  AI: 'AI',
  ENGINEERING: 'Engineering', // Changed from PROGRAMMING to ENGINEERING
  CREATIVE_SKILLS: 'Creative Skills',
  SALES: 'Sales',
  DATA: 'Data' // Added new DATA category
};

// Define schemas for TutorialSkill
const tutorialSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: function() {
      return `assets/images/${this.category.toLowerCase()}.png`;
    }
  },
  category: {
    type: String,
    required: true,
    enum: Object.values(TUTORIAL_CATEGORIES)
  },
  catName: {
    type: String,
  },
  duration: {
    type: String,
    default: "weekly"
  },
  level: {
    type: String,
    default: "Beginner"
  },
  author: {
    type: String,
    default: "Admin"
  },
  time: {
    type: String,
    default: "N/A"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const skillUpSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: function() {
      return `assets/images/${this.category.toLowerCase()}.png`;
    }
  },
  category: {
    type: String,
    required: true,
    enum: Object.values(SKILLUP_CATEGORIES)
  },
  catName: {
    type: String,
  },
  duration: {
    type: String,
    default: "2 hours"
  },
  level: {
    type: String,
    default: "Intermediate"
  },
  author: {
    type: String,
    default: "Admin"
  },
  time: {
    type: String,
    default: "N/A"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hooks to automatically generate catName based on category
tutorialSchema.pre('save', function(next) {
  // Generate catName based on category
  switch (this.category) {
    case TUTORIAL_CATEGORIES.NIGHT_CLASS:
      this.catName = 'nightclass';
      break;
    case TUTORIAL_CATEGORIES.PAST_QUESTION_VIDEOS:
      this.catName = 'pastquestionvideo';
      break;
    default:
      // Fallback - convert to lowercase and remove spaces
      this.catName = this.category.toLowerCase().replace(/\s+/g, '');
  }
  next();
});

skillUpSchema.pre('save', function(next) {
  // Generate catName based on category
  switch (this.category) {
    case SKILLUP_CATEGORIES.AI:
      this.catName = 'ai';
      break;
    case SKILLUP_CATEGORIES.ENGINEERING: // Updated from PROGRAMMING to ENGINEERING
      this.catName = 'engineering'; // Updated from 'programming' to 'engineering'
      break;
    case SKILLUP_CATEGORIES.CREATIVE_SKILLS:
      this.catName = 'creativeskills';
      break;
    case SKILLUP_CATEGORIES.SALES:
      this.catName = 'sales';
      break;
    case SKILLUP_CATEGORIES.DATA: // Added new case for DATA
      this.catName = 'data';
      break;
    default:
      // Fallback - convert to lowercase and remove spaces
      this.catName = this.category.toLowerCase().replace(/\s+/g, '');
  }
  next();
});

// Also handle updates with pre-validate hooks
tutorialSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.category) {
    const category = update.$set.category;
    switch (category) {
      case TUTORIAL_CATEGORIES.NIGHT_CLASS:
        update.$set.catName = 'nightclass';
        break;
      case TUTORIAL_CATEGORIES.PAST_QUESTION_VIDEOS:
        update.$set.catName = 'pastquestionvideo';
        break;
      default:
        update.$set.catName = category.toLowerCase().replace(/\s+/g, '');
    }
  }
  next();
});

skillUpSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.category) {
    const category = update.$set.category;
    switch (category) {
      case SKILLUP_CATEGORIES.AI:
        update.$set.catName = 'ai';
        break;
      case SKILLUP_CATEGORIES.ENGINEERING: // Updated from PROGRAMMING to ENGINEERING
        update.$set.catName = 'engineering'; // Updated from 'programming' to 'engineering'
        break;
      case SKILLUP_CATEGORIES.CREATIVE_SKILLS:
        update.$set.catName = 'creativeskills';
        break;
      case SKILLUP_CATEGORIES.SALES:
        update.$set.catName = 'sales';
        break;
      case SKILLUP_CATEGORIES.DATA: // Added new case for DATA
        update.$set.catName = 'data';
        break;
      default:
        update.$set.catName = category.toLowerCase().replace(/\s+/g, '');
    }
  }
  next();
});

// The tutorial category schema is now simplified since we're using enums
const tutorialCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: Object.values(TUTORIAL_CATEGORIES)
  }
});

const skillUpCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: Object.values(SKILLUP_CATEGORIES)
  }
});

// Create models from schemas
const Tutorial = mongoose.model('Tutorial', tutorialSchema);
const SkillUp = mongoose.model('SkillUp', skillUpSchema);
const TutorialCategory = mongoose.model('TutorialCategory', tutorialCategorySchema);
const SkillUpCategory = mongoose.model('SkillUpCategory', skillUpCategorySchema);

class TutorialSkillModel {
  constructor() {
    this.TUTORIAL_CATEGORIES = TUTORIAL_CATEGORIES;
    this.SKILLUP_CATEGORIES = SKILLUP_CATEGORIES;
  }

  /**
   * Get all content items
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @returns {Promise<Array>} - Array of all content items
   */
  async getAllContent(mode) {
    try {
      // Use Mongoose models instead of direct db access
      const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
      const result = await Model.find({});
      return result;
    } catch (error) {
      console.error(`Error getting all ${mode} content:`, error);
      throw error;
    }
  }

  /**
   * Get all categories for a specific mode
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @returns {Promise<Array>} - Array of categories
   */
  async getCategories(mode) {
    try {
      if (mode === 'Tutorial') {
        return Object.values(TUTORIAL_CATEGORIES);
      } else {
        return Object.values(SKILLUP_CATEGORIES);
      }
    } catch (error) {
      console.error(`Error getting ${mode} categories:`, error);
      throw error;
    }
  }

/**
 * Get content items by category
 * @param {string} mode - 'Tutorial' or 'SkillUp'
 * @param {string} category - Category name to filter by
 * @returns {Promise<Array>} - Array of filtered content items
 */
async getContentByCategory(mode, category) {
  try {
    // Handle the 'All' category case, which should return all content
    if (category === 'All') {
      return this.getAllContent(mode);
    }

    // Make sure we're using the correct model based on mode
    const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
    
    // Find items matching the exact category
    const result = await Model.find({ category: category });
    
    // If no results found for this category, log warning
    if (result.length === 0) {
      console.warn(`No ${mode} content found for category: ${category}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error getting ${mode} content by category:`, error);
    throw error;
  }
}

  /**
   * Get a single content item by ID
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @param {string} id - Content item ID
   * @returns {Promise<Object>} - Content item object
   */
  async getContentById(mode, id) {
    try {
      const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
      const result = await Model.findOne({ id: id });
      
      if (!result) {
        throw new Error(`${mode} content with ID ${id} not found`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting ${mode} content by ID:`, error);
      throw error;
    }
  }

  /**
   * Add new content item
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @param {Object} contentData - Content item data
   * @returns {Promise<Object>} - Added content item
   */
  async addContent(mode, contentData) {
    try {
      // Validate required fields
      const requiredFields = ['id', 'title', 'description', 'category'];
      
      for (const field of requiredFields) {
        if (!contentData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Validate category is in the enumeration
      if (mode === 'Tutorial' && !Object.values(TUTORIAL_CATEGORIES).includes(contentData.category)) {
        throw new Error(`Invalid Tutorial category. Must be one of: ${Object.values(TUTORIAL_CATEGORIES).join(', ')}`);
      } else if (mode === 'SkillUp' && !Object.values(SKILLUP_CATEGORIES).includes(contentData.category)) {
        throw new Error(`Invalid SkillUp category. Must be one of: ${Object.values(SKILLUP_CATEGORIES).join(', ')}`);
      }

      const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
      
      // Check if content with this ID already exists
      const existing = await Model.findOne({ id: contentData.id });
      if (existing) {
        throw new Error(`${mode} content with ID ${contentData.id} already exists`);
      }

      // Set timestamps
      contentData.createdAt = Date.now();
      contentData.updatedAt = Date.now();

      // Create and save the new content - catName will be set by pre-save hook
      const newContent = new Model(contentData);
      await newContent.save();
      
      return newContent;
    } catch (error) {
      console.error(`Error adding ${mode} content:`, error);
      throw error;
    }
  }

  /**
   * Update existing content item
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @param {string} id - Content item ID
   * @param {Object} contentData - Updated content item data
   * @returns {Promise<Object>} - Updated content item
   */
  async updateContent(mode, id, contentData) {
    try {
      // Validate category if it's provided
      if (contentData.category) {
        if (mode === 'Tutorial' && !Object.values(TUTORIAL_CATEGORIES).includes(contentData.category)) {
          throw new Error(`Invalid Tutorial category. Must be one of: ${Object.values(TUTORIAL_CATEGORIES).join(', ')}`);
        } else if (mode === 'SkillUp' && !Object.values(SKILLUP_CATEGORIES).includes(contentData.category)) {
          throw new Error(`Invalid SkillUp category. Must be one of: ${Object.values(SKILLUP_CATEGORIES).join(', ')}`);
        }
      }

      const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
      
      // Update the updatedAt timestamp
      contentData.updatedAt = Date.now();
      
      const result = await Model.findOneAndUpdate(
        { id: id },
        { $set: contentData },
        { new: true }
      );
      
      if (!result) {
        throw new Error(`${mode} content with ID ${id} not found`);
      }

      return result;
    } catch (error) {
      console.error(`Error updating ${mode} content:`, error);
      throw error;
    }
  }

  /**
   * Delete content item
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @param {string} id - Content item ID
   * @returns {Promise<boolean>} - True if deletion successful
   */
  async deleteContent(mode, id) {
    try {
      const Model = mode === 'Tutorial' ? Tutorial : SkillUp;
      
      const result = await Model.findOneAndDelete({ id: id });
      
      if (!result) {
        throw new Error(`${mode} content with ID ${id} not found`);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting ${mode} content:`, error);
      throw error;
    }
  }

  /**
   * Initialize default categories if they don't exist
   * @returns {Promise<void>}
   */
  async initializeCategories() {
    try {
      // Initialize Tutorial categories
      for (const category of Object.values(TUTORIAL_CATEGORIES)) {
        const existing = await TutorialCategory.findOne({ name: category });
        if (!existing) {
          const newCategory = new TutorialCategory({ name: category });
          await newCategory.save();
        }
      }

      // Initialize SkillUp categories
      for (const category of Object.values(SKILLUP_CATEGORIES)) {
        const existing = await SkillUpCategory.findOne({ name: category });
        if (!existing) {
          const newCategory = new SkillUpCategory({ name: category });
          await newCategory.save();
        }
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
      throw error;
    }
  }

  /**
   * Get full data structure for a specific mode
   * @param {string} mode - 'Tutorial' or 'SkillUp'
   * @returns {Promise<Object>} - Complete data structure with categories and items
   */
  async getFullData(mode) {
    try {
      const categories = await this.getCategories(mode);
      const items = await this.getAllContent(mode);
      
      return {
        categories,
        items
      };
    } catch (error) {
      console.error(`Error getting ${mode} full data:`, error);
      throw error;
    }
  }
}

module.exports = TutorialSkillModel;