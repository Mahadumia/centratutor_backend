// routes/tutorial_skill_routes.js
const express = require('express');
const router = express.Router();
const TutorialSkillModel = require('../../models/tutorial_and_skills/tutorial_skill');
const SkillUpBatch = require('../../models/tutorial_and_skills/skillup');

// Initialize model
const tutorialSkillModel = new TutorialSkillModel();

/**
 * @route   GET /api/tutorial-skill/:mode/data
 * @desc    Get full data for a specific mode (Tutorial or SkillUp)
 * @access  Public
 */
router.get('/:mode/data', async (req, res) => {
  try {
    const { mode } = req.params;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp data differently
      const skillUps = await SkillUpBatch.find({}).select('category subject subjectDescription batch year');

      // Extract unique categories and add "All" at the beginning
      const uniqueCategories = [...new Set(skillUps.map(item => item.category))];
      const categories = ['All', ...uniqueCategories];

      // Transform data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        // Calculate total duration
        const totalLessons = skillUp.batch.reduce((total, batch) => total + (batch.contents ? batch.contents.length : 0), 0);
        const estimatedDuration = `${totalLessons * 15} min`; // Assuming 15 min per lesson

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup', // This matches what Flutter expects for SkillUp
          level: skillUp.category.toLowerCase(), // Use category as level for navigation
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: 'assets/images/skillup_placeholder.png',
          time: null // SkillUp courses don't have specific times
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
      // Handle SkillUp categories
      const skillUps = await SkillUpBatch.find({}).distinct('category');
      const categories = ['All', ...skillUps];
      return res.json(categories);
    } else {
      // Handle Tutorial categories using the existing model
      const categories = await tutorialSkillModel.getCategories(mode);
      res.json(categories);
    }
  } catch (error) {
    console.error(`Error fetching ${req.params.mode} categories:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tutorial-skill/:mode/content
 * @desc    Get all content for a specific mode, optionally filtered by category
 * @access  Public
 */
router.get('/:mode/content', async (req, res) => {
  try {
    const { mode } = req.params;
    const { category } = req.query;
    
    // Validate mode parameter
    if (mode !== 'Tutorial' && mode !== 'SkillUp') {
      return res.status(400).json({ message: 'Mode must be either "Tutorial" or "SkillUp"' });
    }
    
    if (mode === 'SkillUp') {
      // Handle SkillUp content
      let query = {};
      if (category && category !== 'All') {
        query.category = category;
      }

      const skillUps = await SkillUpBatch.find(query).select('category subject subjectDescription batch year');

      // Transform data to match Flutter app's expected format
      const items = skillUps.map(skillUp => {
        const totalLessons = skillUp.batch.reduce((total, batch) => total + (batch.contents ? batch.contents.length : 0), 0);
        const estimatedDuration = `${totalLessons * 15} min`;

        return {
          id: skillUp._id,
          title: skillUp.subject,
          description: skillUp.subjectDescription || 'Enhance your skills with this comprehensive course',
          category: skillUp.category,
          catName: 'skillup',
          level: skillUp.category.toLowerCase(),
          year: skillUp.year || new Date().getFullYear().toString(),
          author: 'CentraTutor Team',
          duration: estimatedDuration,
          thumbnail: 'assets/images/skillup_placeholder.png',
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
      // Handle SkillUp content by ID
      const skillUp = await SkillUpBatch.findById(id);
      if (!skillUp) {
        return res.status(404).json({ message: 'SkillUp content not found' });
      }
      return res.json(skillUp);
    } else {
      // Handle Tutorial content using the existing model
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
      // Handle SkillUp content creation - this would typically use the skillup routes
      return res.status(400).json({ 
        message: 'Please use /api/tutorial-skill/skillup/create for creating SkillUp content' 
      });
    } else {
      // Handle Tutorial content using the existing model
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
      // Handle SkillUp content updates - this would typically use the skillup routes
      return res.status(400).json({ 
        message: 'Please use /api/tutorial-skill/skillup/:id for updating SkillUp content' 
      });
    } else {
      // Handle Tutorial content using the existing model
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
      // Handle SkillUp content deletion - this would typically use the skillup routes
      return res.status(400).json({ 
        message: 'Please use /api/tutorial-skill/skillup/:id for deleting SkillUp content' 
      });
    } else {
      // Handle Tutorial content using the existing model
      await tutorialSkillModel.deleteContent(mode, id);
      res.json({ message: `${mode} content with ID ${id} successfully deleted` });
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
      // For SkillUp, categories are predefined in the enum
      return res.status(400).json({ 
        message: 'SkillUp categories are predefined. Please use existing categories.' 
      });
    } else {
      // Handle Tutorial categories using the existing model
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
      // For SkillUp, categories are predefined in the enum
      return res.status(400).json({ 
        message: 'SkillUp categories are predefined and cannot be deleted.' 
      });
    } else {
      // Handle Tutorial categories using the existing model
      await tutorialSkillModel.deleteCategory(mode, name);
      res.json({ message: `${mode} category ${name} successfully deleted` });
    }
  } catch (error) {
    console.error(`Error deleting ${req.params.mode} category:`, error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;