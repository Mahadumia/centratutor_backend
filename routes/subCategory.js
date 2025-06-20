// routes/subCategory.js
const express = require('express');
const router = express.Router();
const SubCategoryModel = require('../models/subCategory');

// Initialize the subcategory model
const subCategoryModel = new SubCategoryModel();

/**
 * @route   GET /api/subcategories
 * @desc    Get all subcategories
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const subCategories = await subCategoryModel.getAllSubCategories();
    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/subcategories/count
 * @desc    Get count of active subcategories
 * @access  Public
 */
router.get('/count', async (req, res) => {
  try {
    const count = await subCategoryModel.getActiveSubCategoriesCount();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/subcategories/search
 * @desc    Search subcategories
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const results = await subCategoryModel.searchSubCategories(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/subcategories/route/:routePath
 * @desc    Get subcategories by route path
 * @access  Public
 */
router.get('/route/:routePath', async (req, res) => {
  try {
    const routePath = `/${req.params.routePath}`;
    const subCategories = await subCategoryModel.getSubCategoriesByRoute(routePath);
    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/subcategories/:id
 * @desc    Get subcategory by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const subCategory = await subCategoryModel.getSubCategoryById(req.params.id);
    
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    
    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/subcategories/name/:name
 * @desc    Get subcategory by name
 * @access  Public
 */
router.get('/name/:name', async (req, res) => {
  try {
    const subCategory = await subCategoryModel.getSubCategoryByName(req.params.name);
    
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    
    res.json(subCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/subcategories
 * @desc    Create a new subcategory
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { examId, name, displayName, description, icon, routePath, orderIndex } = req.body;
    
    if (!examId || !name || !displayName || !routePath) {
      return res.status(400).json({ 
        message: 'examId, name, displayName, and routePath are required' 
      });
    }
    
    const subCategoryData = {
      examId,
      name,
      displayName,
      description,
      icon,
      routePath,
      orderIndex
    };
    
    const newSubCategory = await subCategoryModel.createSubCategory(subCategoryData);
    res.status(201).json(newSubCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'SubCategory with this name already exists for this exam' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   POST /api/subcategories/exam/:examId/bulk
 * @desc    Create multiple subcategories for a specific exam
 * @access  Private
 */
router.post('/exam/:examId/bulk', async (req, res) => {
  try {
    const { subCategories } = req.body;
    const examId = req.params.examId;
    
    if (!subCategories || !Array.isArray(subCategories) || subCategories.length === 0) {
      return res.status(400).json({ message: 'SubCategories array is required' });
    }
    
    // Add examId to each subcategory
    const subCategoriesWithExamId = subCategories.map(subCategory => ({
      ...subCategory,
      examId
    }));
    
    const results = await subCategoryModel.createBulkSubCategories(subCategoriesWithExamId);
    
    res.status(201).json({
      message: `Created ${results.created.length} subcategories with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      examId,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/subcategories/exam/:examId/seed
 * @desc    Seed default subcategories for a specific exam
 * @access  Private
 */
router.post('/exam/:examId/seed', async (req, res) => {
  try {
    const results = await subCategoryModel.seedDefaultSubCategories(req.params.examId);

    res.status(201).json({
      message: 'Seeding completed for exam',
      examId: req.params.examId,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   POST /api/subcategories/bulk
 * @desc    Create multiple subcategories
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { subCategories } = req.body;
    
    if (!subCategories || !Array.isArray(subCategories) || subCategories.length === 0) {
      return res.status(400).json({ message: 'SubCategories array is required' });
    }
    
    const results = await subCategoryModel.createBulkSubCategories(subCategories);
    
    res.status(201).json({
      message: `Created ${results.created.length} subcategories with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/subcategories/:id
 * @desc    Update a subcategory
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    const updatedSubCategory = await subCategoryModel.updateSubCategory(
      req.params.id, 
      updates
    );
    
    if (!updatedSubCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    
    res.json(updatedSubCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'SubCategory with this name already exists' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/subcategories/:id/toggle-status
 * @desc    Toggle subcategory active status
 * @access  Private
 */
router.put('/:id/toggle-status', async (req, res) => {
  try {
    const subCategory = await subCategoryModel.toggleSubCategoryStatus(req.params.id);
    
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    
    res.json({ 
      message: `SubCategory ${subCategory.isActive ? 'activated' : 'deactivated'} successfully`,
      subCategory 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/subcategories/:id
 * @desc    Delete a subcategory (soft delete)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await subCategoryModel.deleteSubCategory(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    
    res.json({ message: 'SubCategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/subcategories/reorder
 * @desc    Reorder subcategories
 * @access  Private
 */
router.put('/reorder', async (req, res) => {
  try {
    const { orderUpdates } = req.body;
    
    if (!orderUpdates || !Array.isArray(orderUpdates)) {
      return res.status(400).json({ 
        message: 'orderUpdates array is required' 
      });
    }
    
    await subCategoryModel.reorderSubCategories(orderUpdates);
    res.json({ message: 'SubCategories reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/subcategories/seed
 * @desc    Seed default subcategories
 * @access  Private
 */
router.post('/seed', async (req, res) => {
  try {
    const results = await subCategoryModel.seedDefaultSubCategories();

    res.status(201).json({
      message: 'Seeding completed',
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/subcategories/seed/custom
 * @desc    Seed subcategories with custom data
 * @access  Private
 */
router.post('/seed/custom', async (req, res) => {
  try {
    const { subCategories } = req.body;
    
    if (!subCategories || !Array.isArray(subCategories) || subCategories.length === 0) {
      return res.status(400).json({ 
        message: 'SubCategories array is required for custom seeding' 
      });
    }
    
    const results = await subCategoryModel.createBulkSubCategories(subCategories);

    res.status(201).json({
      message: 'Custom seeding completed',
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/subcategories/:id/validate
 * @desc    Validate if subcategory exists
 * @access  Public
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const exists = await subCategoryModel.validateSubCategoryExists(req.params.id);
    
    res.json({
      valid: exists,
      id: req.params.id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;