// Updated tutorial_skill_routes.js - Complete Integration with SkillUpBatch
const express = require('express');
const router = express.Router();
const TutorialSkillModel = require('../../models/tutorial_and_skills/tutorial_skill');
const SkillUpBatch = require('../../models/tutorial_and_skills/skillup');

// Initialize model
const tutorialSkillModel = new TutorialSkillModel();

/**
 * @route   GET /api/tutorial-skill/:mode/data
 * @route   GET /api/tutorial-skill/home/:mode/data  
 * @desc    Get full data for a specific mode (Tutorial or SkillUp)
 * @access  Public
 */
router.get('/:mode/data', async (req, res) => {
  try {
    const { mode } = req.params;
    
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp data from SkillUpBatch collection ONLY
      const skillUps = await SkillUpBatch.find({}).select('category subject subjectDescription batch year');

      // Extract unique categories and add "All" at the beginning
      const uniqueCategories = [...new Set(skillUps.map(item => item.category))];
      const categories = ['All', ...uniqueCategories];

      // Transform SkillUpBatch data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        // Calculate total duration dynamically
        const totalLessons = skillUp.batch.reduce((total, batch) => {
          return total + (batch.contents ? batch.contents.length : 0);
        }, 0);
        const estimatedDuration = `${totalLessons} lessons`;

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup', // Always 'skillup' for SkillUp courses
          level: skillUp.category.toLowerCase(), // DYNAMIC: category becomes level (ai, engineering, data, etc.)
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: `assets/images/${skillUp.category.toLowerCase()}_placeholder.png`,
          time: null
        };
      });

      return res.json({
        categories,
        items
      });
    } else {
      // Handle Tutorial data using the existing model
      const data = await tutorialSkillModel.getFullData(mode);
      res.json(data);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} data:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/:mode/content
 * @route   GET /api/tutorial-skill/home/:mode/content
 * @desc    Get all content for a specific mode, optionally filtered by category
 * @access  Public
 */
router.get('/:mode/content', async (req, res) => {
  try {
    const { mode } = req.params;
    const { category } = req.query;
    
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp content from SkillUpBatch collection ONLY
      let query = {};
      if (category && category !== 'All') {
        query.category = category;
      }

      const skillUps = await SkillUpBatch.find(query).select('category subject subjectDescription batch year');

      // Transform data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        const totalLessons = skillUp.batch.reduce((total, batch) => {
          return total + (batch.contents ? batch.contents.length : 0);
        }, 0);
        const estimatedDuration = `${totalLessons} lessons`;

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup',
          level: skillUp.category.toLowerCase(), // DYNAMIC: Works for any category
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: `assets/images/${skillUp.category.toLowerCase()}_placeholder.png`,
          time: null
        };
      });

      return res.json(items);
    } else {
      // Handle Tutorial content using the existing model
      let content;
      if (category && category !== 'All') {
        content = await tutorialSkillModel.getContentByCategory(mode, category);
      } else {
        content = await tutorialSkillModel.getAllContent(mode);
      }
      
      res.json(content);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} content:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/:mode/categories
 * @desc    Get all categories for a specific mode
 * @access  Public
 */
router.get('/:mode/categories', async (req, res) => {
  try {
    const { mode } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Get categories from SkillUpBatch collection ONLY
      const skillUps = await SkillUpBatch.find({}).distinct('category');
      const categories = ['All', ...skillUps];
      return res.json(categories);
    } else {
      // Use the existing TutorialSkillModel for Tutorial categories
      const categories = await tutorialSkillModel.getCategories(mode);
      res.json(categories);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} categories:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/:mode/content/:id
 * @desc    Get a specific content item by ID
 * @access  Public
 */
router.get('/:mode/content/:id', async (req, res) => {
  try {
    const { mode, id } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Get specific SkillUp content by ID from SkillUpBatch collection ONLY
      const skillUp = await SkillUpBatch.findById(id);
      
      if (!skillUp) {
        return res.status(404).json({ message: 'SkillUp content not found' });
      }
      
      // Transform to expected format
      const totalLessons = skillUp.batch.reduce((total, batch) => {
        return total + (batch.contents ? batch.contents.length : 0);
      }, 0);
      
      const transformedContent = {
        id: skillUp._id,
        title: skillUp.subject,
        description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
        category: skillUp.category,
        catName: 'skillup',
        level: skillUp.category.toLowerCase(),
        year: skillUp.year || new Date().getFullYear().toString(),
        author: 'CentraTutor Team',
        duration: `${totalLessons} lessons`,
        thumbnail: `assets/images/${skillUp.category.toLowerCase()}_placeholder.png`,
        time: null
      };
      
      return res.json(transformedContent);
    } else {
      // Use the existing TutorialSkillModel for Tutorial content by ID
      const content = await tutorialSkillModel.getContentById(mode, id);
      res.json(content);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} content by ID:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/tutorial-skill/:mode/content
 * @desc    Add new content item
 * @access  Private (would typically require authentication)
 */
router.post('/:mode/content', async (req, res) => {
  try {
    const { mode } = req.params;
    const contentData = req.body;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Create new SkillUpBatch entry - redirect to skillup creation
      const requiredFields = ['category', 'year', 'subject', 'batch'];
      
      for (const field of requiredFields) {
        if (!contentData[field]) {
          throw new Error(`${field} is required`);
        }
      }
      
      // Validate batch array
      if (!Array.isArray(contentData.batch) || contentData.batch.length === 0) {
        throw new Error('Batch array is required and must contain at least one batch');
      }
      
      // Validate each batch
      for (let i = 0; i < contentData.batch.length; i++) {
        const batch = contentData.batch[i];
        if (!batch.topics || !Array.isArray(batch.topics) || batch.topics.length === 0) {
          throw new Error(`Batch ${batch.batchNumber || i+1} must have a topics array with at least one topic`);
        }
      }
      
      // Check if SkillUp with same category, year, and subject already exists
      const existingSkillUp = await SkillUpBatch.findOne({
        category: contentData.category,
        year: contentData.year,
        subject: contentData.subject
      });
      
      if (existingSkillUp) {
        throw new Error('SkillUp with this category, year, and subject already exists');
      }
      
      const newSkillUp = new SkillUpBatch(contentData);
      await newSkillUp.save();
      
      return res.status(201).json(newSkillUp);
    } else {
      // Use the existing TutorialSkillModel for Tutorial content creation
      const newContent = await tutorialSkillModel.addContent(mode, contentData);
      res.status(201).json(newContent);
    }
  } catch (error) {
    console.error(`Error adding ${req.params.mode} content:`, error);
    
    if (error.message.includes('is required') || error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/tutorial-skill/:mode/content/:id
 * @desc    Update content item
 * @access  Private
 */
router.put('/:mode/content/:id', async (req, res) => {
  try {
    const { mode, id } = req.params;
    const contentData = req.body;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Update SkillUpBatch entry
      contentData.updatedAt = Date.now();
      
      const updatedSkillUp = await SkillUpBatch.findByIdAndUpdate(
        id,
        { $set: contentData },
        { new: true }
      );
      
      if (!updatedSkillUp) {
        return res.status(404).json({ message: 'SkillUp content not found' });
      }
      
      return res.json(updatedSkillUp);
    } else {
      // Use the existing TutorialSkillModel for Tutorial content updates
      const updatedContent = await tutorialSkillModel.updateContent(mode, id, contentData);
      res.json(updatedContent);
    }
  } catch (error) {
    console.error(`Error updating ${req.params.mode} content:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/tutorial-skill/:mode/content/:id
 * @desc    Delete content item
 * @access  Private
 */
router.delete('/:mode/content/:id', async (req, res) => {
  try {
    const { mode, id } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Delete SkillUpBatch entry
      const deletedSkillUp = await SkillUpBatch.findByIdAndDelete(id);
      
      if (!deletedSkillUp) {
        return res.status(404).json({ message: 'SkillUp content not found' });
      }
      
      return res.json({ message: `SkillUp content with ID ${id} successfully deleted` });
    } else {
      // Use the existing TutorialSkillModel for Tutorial content deletion
      await tutorialSkillModel.deleteContent(mode, id);
      res.json({ message: `Tutorial content with ID ${id} successfully deleted` });
    }
  } catch (error) {
    console.error(`Error deleting ${req.params.mode} content:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/tutorial-skill/:mode/categories
 * @desc    Add new category
 * @access  Private
 */
router.post('/:mode/categories', async (req, res) => {
  try {
    const { mode } = req.params;
    const { categoryName } = req.body;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (!categoryName) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    if (mode === 'SkillUp') {
      // For SkillUp, categories are created automatically when SkillUpBatch entries are added
      return res.status(200).json({ 
        message: 'SkillUp categories are created automatically when adding content via /skillup/create',
        categoryName 
      });
    } else {
      // Use the existing TutorialSkillModel for Tutorial category creation
      const newCategory = await tutorialSkillModel.addCategory(mode, categoryName);
      res.status(201).json(newCategory);
    }
  } catch (error) {
    console.error(`Error adding ${req.params.mode} category:`, error);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/tutorial-skill/:mode/categories/:name
 * @desc    Delete category
 * @access  Private
 */
router.delete('/:mode/categories/:name', async (req, res) => {
  try {
    const { mode, name } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // For SkillUp, check if any content exists with this category
      const existingContent = await SkillUpBatch.findOne({ category: name });
      
      if (existingContent) {
        return res.status(400).json({ 
          message: 'Cannot delete category that has associated content. Delete the content first via /skillup/ routes.' 
        });
      }
      
      return res.json({ message: `SkillUp category ${name} successfully deleted` });
    } else {
      // Use the existing TutorialSkillModel for Tutorial category deletion
      await tutorialSkillModel.deleteCategory(mode, name);
      res.json({ message: `Tutorial category ${name} successfully deleted` });
    }
  } catch (error) {
    console.error(`Error deleting ${req.params.mode} category:`, error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FLUTTER APP COMPATIBILITY ROUTES
// These handle the /home/ URLs that your Flutter app currently uses

/**
 * @route   GET /api/tutorial-skill/home/:mode/data
 * @desc    Flutter compatibility - Get full data for a specific mode
 * @access  Public
 */
router.get('/home/:mode/data', async (req, res) => {
  try {
    const { mode } = req.params;
    
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp data from SkillUpBatch collection ONLY
      const skillUps = await SkillUpBatch.find({}).select('category subject subjectDescription batch year');

      // Extract unique categories and add "All" at the beginning
      const uniqueCategories = [...new Set(skillUps.map(item => item.category))];
      const categories = ['All', ...uniqueCategories];

      // Transform SkillUpBatch data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        // Calculate total duration dynamically
        const totalLessons = skillUp.batch.reduce((total, batch) => {
          return total + (batch.contents ? batch.contents.length : 0);
        }, 0);
        const estimatedDuration = `${totalLessons} lessons`;

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup', // Always 'skillup' for SkillUp courses
          level: skillUp.category.toLowerCase(), // DYNAMIC: category becomes level (ai, engineering, data, etc.)
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: `assets/images/${skillUp.category.toLowerCase()}_placeholder.png`,
          time: null
        };
      });

      return res.json({
        categories,
        items
      });
    } else {
      // Handle Tutorial data using the existing model
      const data = await tutorialSkillModel.getFullData(mode);
      res.json(data);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} data:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/home/:mode/content
 * @desc    Flutter compatibility - Get all content for a specific mode
 * @access  Public
 */
router.get('/home/:mode/content', async (req, res) => {
  try {
    const { mode } = req.params;
    const { category } = req.query;
    
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp content from SkillUpBatch collection ONLY
      let query = {};
      if (category && category !== 'All') {
        query.category = category;
      }

      const skillUps = await SkillUpBatch.find(query).select('category subject subjectDescription batch year');

      // Transform data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        const totalLessons = skillUp.batch.reduce((total, batch) => {
          return total + (batch.contents ? batch.contents.length : 0);
        }, 0);
        const estimatedDuration = `${totalLessons} lessons`;

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup',
          level: skillUp.category.toLowerCase(), // DYNAMIC: Works for any category
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: `assets/images/${skillUp.category.toLowerCase()}_placeholder.png`,
          time: null
        };
      });

      return res.json(items);
    } else {
      // Handle Tutorial content using the existing model
      let content;
      if (category && category !== 'All') {
        content = await tutorialSkillModel.getContentByCategory(mode, category);
      } else {
        content = await tutorialSkillModel.getAllContent(mode);
      }
      
      res.json(content);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} content:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/home/:mode/categories
 * @desc    Flutter compatibility - Get all categories for a specific mode
 * @access  Public
 */
router.get('/home/:mode/categories', async (req, res) => {
  try {
    const { mode } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Get categories from SkillUpBatch collection ONLY
      const skillUps = await SkillUpBatch.find({}).distinct('category');
      const categories = ['All', ...skillUps];
      return res.json(categories);
    } else {
      // Use the existing TutorialSkillModel for Tutorial categories
      const categories = await tutorialSkillModel.getCategories(mode);
      res.json(categories);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} categories:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;