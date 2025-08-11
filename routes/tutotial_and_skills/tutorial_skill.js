// routes/tutorial_skill_routes.js
const express = require('express');
const router = express.Router();
const TutorialSkillModel = require('../../models/tutorial_and_skills/tutorial_skill');

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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp listing
    const data = await tutorialSkillModel.getFullData(mode);
    res.json(data);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp categories
    const categories = await tutorialSkillModel.getCategories(mode);
    res.json(categories);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp content listing
    let content;
    if (category && category !== 'All') {
      content = await tutorialSkillModel.getContentByCategory(mode, category);
    } else {
      content = await tutorialSkillModel.getAllContent(mode);
    }
    
    res.json(content);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp content by ID
    const content = await tutorialSkillModel.getContentById(mode, id);
    res.json(content);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp content creation
    const newContent = await tutorialSkillModel.addContent(mode, contentData);
    res.status(201).json(newContent);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp content updates
    const updatedContent = await tutorialSkillModel.updateContent(mode, id, contentData);
    res.json(updatedContent);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp content deletion
    await tutorialSkillModel.deleteContent(mode, id);
    res.json({ message: `${mode} content with ID ${id} successfully deleted` });
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp category creation
    const newCategory = await tutorialSkillModel.addCategory(mode, categoryName);
    res.status(201).json(newCategory);
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
    
    // Use the existing TutorialSkillModel for both Tutorial and SkillUp category deletion
    await tutorialSkillModel.deleteCategory(mode, name);
    res.json({ message: `${mode} category ${name} successfully deleted` });
  } catch (error) {
    console.error(`Error deleting ${req.params.mode} category:`, error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;