// routes/content.js - Updated for Modified Architecture
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

/**
 * @route   GET /api/content
 * @desc    Get content with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { examId, subjectId, trackId, subCategoryId, fileType, limit } = req.query;
    
    const filters = {};
    if (examId) filters.examId = examId;
    if (subjectId) filters.subjectId = subjectId;
    if (trackId) filters.trackId = trackId;
    if (subCategoryId) filters.subCategoryId = subCategoryId;
    if (fileType) filters.fileType = fileType;
    
    let content = await examModel.getContentByFilters(filters);
    
    if (limit) {
      content = content.slice(0, parseInt(limit));
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/:contentId
 * @desc    Get content by ID
 * @access  Public
 */
router.get('/:contentId', async (req, res) => {
  try {
    const content = await examModel.getContentById(req.params.contentId);
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/content
 * @desc    Create a new content item
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackId, 
      subCategoryId, 
      name, 
      displayName, 
      description,
      filePath,
      fileType,
      fileSize,
      duration,
      orderIndex,
      metadata
    } = req.body;
    
    if (!examId || !subjectId || !trackId || !subCategoryId || !name || !displayName || !filePath || !fileType) {
      return res.status(400).json({ 
        message: 'examId, subjectId, trackId, subCategoryId, name, displayName, filePath, and fileType are required' 
      });
    }
    
    const contentData = {
      examId,
      subjectId,
      trackId,
      subCategoryId,
      name,
      displayName,
      description,
      filePath,
      fileType,
      fileSize,
      duration,
      orderIndex: orderIndex || 0,
      metadata: metadata || {}
    };
    
    const newContent = await examModel.createContent(contentData);
    res.status(201).json(newContent);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Content with this name already exists for this track and subcategory' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/content/bulk
 * @desc    Create multiple content items
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }
    
    const results = await examModel.createBulkContent(content);
    
    res.status(201).json({
      message: `Created ${results.created.length} content items with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/content/:contentId
 * @desc    Update a content item
 * @access  Private
 */
router.put('/:contentId', async (req, res) => {
  try {
    const updates = req.body;
    
    const updatedContent = await examModel.updateContent(req.params.contentId, updates);
    
    if (!updatedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json(updatedContent);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Content with this name already exists for this track and subcategory' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/content/:contentId
 * @desc    Delete a content item (soft delete)
 * @access  Private
 */
router.delete('/:contentId', async (req, res) => {
  try {
    const result = await examModel.deleteContent(req.params.contentId);
    
    if (!result) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/search
 * @desc    Search content
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, examId, subjectId, trackId, subCategoryId, fileType } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const filters = {};
    if (examId) filters.examId = examId;
    if (subjectId) filters.subjectId = subjectId;
    if (trackId) filters.trackId = trackId;
    if (subCategoryId) filters.subCategoryId = subCategoryId;
    if (fileType) filters.fileType = fileType;
    
    const results = await examModel.searchContent(q, filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/by-path/:examName/:subCategoryName/:subjectName/:trackName
 * @desc    Get content by path structure (user-friendly URLs)
 * @access  Public
 */
router.get('/by-path/:examName/:subCategoryName/:subjectName/:trackName', async (req, res) => {
  try {
    const { examName, subCategoryName, subjectName, trackName } = req.params;
    
    // Get entities by names
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ 
      examId: exam._id,
      name: subCategoryName.toLowerCase(), 
      isActive: true 
    });
    
    if (!exam || !subCategory) {
      return res.status(404).json({ message: 'Exam or SubCategory not found' });
    }
    
    const subject = await Subject.findOne({ 
      examId: exam._id, 
      name: subjectName, 
      isActive: true 
    });
    
    // MODIFIED: Track is now associated with subcategory, not subject
    const track = await Track.findOne({ 
      examId: exam._id, 
      subCategoryId: subCategory._id, 
      name: trackName, 
      isActive: true 
    });
    
    if (!subject || !track) {
      return res.status(404).json({ message: 'Subject or Track not found' });
    }
    
    // Check if subject is available in this subcategory
    const availability = await examModel.validateSubjectAvailability(
      exam._id, 
      subject._id, 
      subCategory._id
    );
    
    if (!availability) {
      return res.status(404).json({ 
        message: `${subjectName} is not available in ${subCategoryName}` 
      });
    }
    
    // Get content
    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });
    
    res.json({
      exam,
      subCategory,
      subject,
      track,
      content
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/stats/file-types
 * @desc    Get content statistics by file types
 * @access  Public
 */
router.get('/stats/file-types', async (req, res) => {
  try {
    const { examId, subjectId, subCategoryId } = req.query;
    
    const { Content } = require('../models/exam');
    const matchQuery = { isActive: true };
    
    if (examId) matchQuery.examId = examId;
    if (subjectId) matchQuery.subjectId = subjectId;
    if (subCategoryId) matchQuery.subCategoryId = subCategoryId;
    
    const stats = await Content.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$fileType', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/recent
 * @desc    Get recently added content
 * @access  Public
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20, examId, subjectId } = req.query;
    
    const { Content } = require('../models/exam');
    const query = { isActive: true };
    
    if (examId) query.examId = examId;
    if (subjectId) query.subjectId = subjectId;
    
    const recentContent = await Content.find(query)
      .populate(['examId', 'subjectId', 'trackId', 'subCategoryId'])
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(recentContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/content/reorder
 * @desc    Reorder content items
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
    
    const { Content } = require('../models/exam');
    const updatePromises = orderUpdates.map(({ id, orderIndex }) =>
      Content.findByIdAndUpdate(id, { orderIndex })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Content reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/content/validate-upload
 * @desc    Validate content upload structure
 * @access  Private
 */
router.post('/validate-upload', async (req, res) => {
  try {
    const { examId, subjectId, trackId, subCategoryId, fileName } = req.body;
    
    if (!examId || !subjectId || !trackId || !subCategoryId) {
      return res.status(400).json({ 
        message: 'examId, subjectId, trackId, and subCategoryId are required' 
      });
    }
    
    const validationResults = {};
    
    // Validate exam exists
    validationResults.examValid = await examModel.validateExamExists(examId);
    
    // Validate subject exists
    validationResults.subjectValid = await examModel.validateSubjectExists(examId, subjectId);
    
    // MODIFIED: Validate track exists for subcategory
    validationResults.trackValid = await examModel.validateTrackExists(examId, subCategoryId, trackId);
    
    // Validate subject availability in subcategory
    validationResults.availabilityValid = await examModel.validateSubjectAvailability(
      examId, 
      subjectId, 
      subCategoryId
    );
    
    // Check if content with same name already exists
    if (fileName) {
      const { Content } = require('../models/exam');
      const existingContent = await Content.findOne({
        examId,
        subjectId,
        trackId,
        subCategoryId,
        name: fileName,
        isActive: true
      });
      validationResults.fileNameAvailable = !existingContent;
    }
    
    const allValid = Object.values(validationResults).every(result => result === true);
    
    res.json({
      valid: allValid,
      results: validationResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/content/advanced-search
 * @desc    Advanced search for content
 * @access  Public
 */
router.post('/advanced-search', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackIds, 
      subCategoryIds, 
      searchText, 
      fileTypes, 
      sizeRange,
      dateRange,
      limit = 50,
      offset = 0
    } = req.body;
    
    const { Content } = require('../models/exam');
    
    // Build match query
    const matchQuery = { isActive: true };
    
    if (examId) matchQuery.examId = examId;
    if (subjectId) matchQuery.subjectId = subjectId;
    if (trackIds && trackIds.length > 0) matchQuery.trackId = { $in: trackIds };
    if (subCategoryIds && subCategoryIds.length > 0) matchQuery.subCategoryId = { $in: subCategoryIds };
    if (fileTypes && fileTypes.length > 0) matchQuery.fileType = { $in: fileTypes };
    
    // Size range filter (in bytes)
    if (sizeRange && sizeRange.min !== undefined && sizeRange.max !== undefined) {
      matchQuery.fileSize = { 
        $gte: sizeRange.min, 
        $lte: sizeRange.max 
      };
    }
    
    // Date range filter
    if (dateRange && dateRange.from && dateRange.to) {
      matchQuery.createdAt = { 
        $gte: new Date(dateRange.from), 
        $lte: new Date(dateRange.to) 
      };
    }
    
    // Text search
    if (searchText) {
      matchQuery.$or = [
        { name: { $regex: searchText, $options: 'i' } },
        { displayName: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } }
      ];
    }
    
    // Execute search with pagination
    const content = await Content.find(matchQuery)
      .populate(['examId', 'subjectId', 'trackId', 'subCategoryId'])
      .sort({ createdAt: -1, orderIndex: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Content.countDocuments(matchQuery);
    
    res.json({
      content,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > (parseInt(offset) + parseInt(limit))
      },
      searchCriteria: {
        examId,
        subjectId,
        trackIds,
        subCategoryIds,
        searchText,
        fileTypes,
        sizeRange,
        dateRange
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/download/:contentId
 * @desc    Get download link for content
 * @access  Public
 */
router.get('/download/:contentId', async (req, res) => {
  try {
    const content = await examModel.getContentById(req.params.contentId);
    
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Here you would typically generate a secure download URL
    // For now, we'll return the file path and metadata
    res.json({
      id: content._id,
      name: content.displayName,
      filePath: content.filePath,
      fileType: content.fileType,
      fileSize: content.fileSize,
      downloadUrl: `${req.protocol}://${req.get('host')}/files${content.filePath}`,
      exam: content.examId.displayName,
      subject: content.subjectId.displayName,
      track: content.trackId.displayName,
      category: content.subCategoryId.displayName
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/content/track-usage
 * @desc    Track content usage/download statistics
 * @access  Public
 */
router.post('/track-usage', async (req, res) => {
  try {
    const { contentId, action } = req.body; // action: 'view', 'download', 'share'
    
    if (!contentId || !action) {
      return res.status(400).json({ 
        message: 'contentId and action are required' 
      });
    }
    
    const { Content } = require('../models/exam');
    
    // Update usage statistics
    const updateField = {};
    updateField[`metadata.usage.${action}Count`] = 1;
    updateField[`metadata.usage.lastAccessed`] = new Date();
    
    await Content.findByIdAndUpdate(
      contentId,
      { 
        $inc: updateField,
        $set: { 'metadata.usage.lastAccessed': new Date() }
      }
    );
    
    res.json({ message: 'Usage tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/content/popular/:examId/:subjectId
 * @desc    Get popular content based on usage
 * @access  Public
 */
router.get('/popular/:examId/:subjectId', async (req, res) => {
  try {
    const { limit = 10, period = '30days' } = req.query;
    
    const { Content } = require('../models/exam');
    
    // Calculate date range based on period
    const now = new Date();
    let fromDate;
    switch (period) {
      case '7days':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const popularContent = await Content.find({
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      isActive: true,
      'metadata.usage.lastAccessed': { $gte: fromDate }
    })
    .populate(['examId', 'subjectId', 'trackId', 'subCategoryId'])
    .sort({ 
      'metadata.usage.downloadCount': -1, 
      'metadata.usage.viewCount': -1 
    })
    .limit(parseInt(limit));
    
    res.json(popularContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;