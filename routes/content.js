// routes/content.js - Improved Context-Specific Content Upload Routes
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

// ========== CONTEXT-SPECIFIC CONTENT UPLOAD ROUTES ==========

/**
 * IMPROVED: Upload content for specific exam-subject-track-subcategory context
 * @route   POST /api/content/upload/:examId/:subjectId/:trackId/:subCategoryId
 * @desc    Upload content to a specific context (no repetition needed)
 * @access  Private
 */
router.post('/upload/:examId/:subjectId/:trackId/:subCategoryId', async (req, res) => {
  try {
    const { examId, subjectId, trackId, subCategoryId } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate the context first
    const contextValidation = await examModel.validateCompleteContentStructure(
      examId, subjectId, trackId, subCategoryId, null
    );

    if (!contextValidation.allValid) {
      return res.status(400).json({
        message: 'Invalid context for content upload',
        validation: contextValidation
      });
    }

    // Get context information for response
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    const [exam, subject, track, subCategory] = await Promise.all([
      Exam.findById(examId),
      Subject.findById(subjectId), 
      Track.findById(trackId),
      SubCategory.findById(subCategoryId)
    ]);

    // Add context to each content item automatically
    const enrichedContent = content.map(item => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      ...item
    }));

    // Use enhanced bulk creation with topic validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName
        },
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * IMPROVED: Upload content using friendly names (auto-resolve IDs)
 * @route   POST /api/content/upload/:examName/:subjectName/:trackName/:subCategoryName
 * @desc    Upload content using readable names instead of IDs
 * @access  Private
 */
router.post('/upload/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Resolve names to IDs
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    if (!exam) {
      return res.status(404).json({ message: `Exam "${examName}" not found` });
    }

    const subject = await Subject.findOne({ 
      examId: exam._id, 
      name: subjectName.toLowerCase(), 
      isActive: true 
    });
    if (!subject) {
      return res.status(404).json({ message: `Subject "${subjectName}" not found` });
    }

    const subCategory = await SubCategory.findOne({ 
      examId: exam._id,
      name: subCategoryName.toLowerCase(), 
      isActive: true 
    });
    if (!subCategory) {
      return res.status(404).json({ message: `SubCategory "${subCategoryName}" not found` });
    }

    const track = await Track.findOne({ 
      examId: exam._id, 
      subCategoryId: subCategory._id,
      name: trackName.toLowerCase(), 
      isActive: true 
    });
    if (!track) {
      return res.status(404).json({ message: `Track "${trackName}" not found` });
    }

    // Add context to each content item automatically
    const enrichedContent = content.map(item => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      ...item
    }));

    // Use enhanced bulk creation with topic validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to ${exam.displayName} > ${subCategory.displayName} > ${subject.displayName} > ${track.displayName}`,
        context: {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          subCategoryId: subCategory._id,
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName
        },
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Pre-validate content for specific context
 * @route   POST /api/content/validate/:examName/:subjectName/:trackName/:subCategoryName
 * @desc    Validate content before upload for specific context
 * @access  Private
 */
router.post('/validate/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Add context to each content item for validation
    const enrichedContent = content.map(item => ({
      examName,
      subjectName,
      trackName,
      subCategoryName,
      ...item
    }));
    
    const validation = await examModel.validateTopicsForBulkContent(enrichedContent);
    
    res.json({
      context: { examName, subjectName, trackName, subCategoryName },
      canProceed: validation.summary.invalid === 0,
      validation,
      recommendations: {
        message: validation.summary.invalid > 0 ? 
          'Some content items have invalid topics. Please create missing topics or use approved topics.' : 
          'All content items are valid and ready for upload.',
        action: validation.summary.invalid > 0 ? 'fix_topics' : 'proceed_upload',
        missingTopics: validation.summary.missingTopics,
        validTopics: validation.summary.uniqueTopics
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== CONTENT GROUP MANAGEMENT ==========

/**
 * NEW: Get content grouped for editing
 * @route   GET /api/content/groups/:examName/:subjectName/:trackName/:subCategoryName
 * @desc    Get content organized in editable groups
 * @access  Public
 */
router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'topic' } = req.query; // Can group by 'topic', 'day', 'year', etc.

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    // Get content for this context
    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });

    let groupedContent = {};

    if (groupBy === 'topic') {
      // Group by topics
      content.forEach(item => {
        const topicKey = item.topicId?.name || 'uncategorized';
        const topicDisplay = item.topicId?.displayName || 'Uncategorized';
        
        if (!groupedContent[topicKey]) {
          groupedContent[topicKey] = {
            groupKey: topicKey,
            groupName: topicDisplay,
            groupType: 'topic',
            items: []
          };
        }
        groupedContent[topicKey].items.push(item);
      });
    } else if (groupBy === 'day' && track.trackType === 'days') {
      // Group by days for day-based tracks
      content.forEach(item => {
        const dayMatch = item.name.match(/day(\d+)/i);
        const dayNum = dayMatch ? parseInt(dayMatch[1]) : 0;
        const dayKey = `day_${dayNum}`;
        
        if (!groupedContent[dayKey]) {
          groupedContent[dayKey] = {
            groupKey: dayKey,
            groupName: `Day ${dayNum}`,
            groupType: 'day',
            items: []
          };
        }
        groupedContent[dayKey].items.push(item);
      });
    } else if (groupBy === 'year' && track.trackType === 'years') {
      // Group by years for year-based tracks
      content.forEach(item => {
        const yearMatch = item.name.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : 'unknown';
        
        if (!groupedContent[year]) {
          groupedContent[year] = {
            groupKey: year,
            groupName: year,
            groupType: 'year',
            items: []
          };
        }
        groupedContent[year].items.push(item);
      });
    }

    // Convert to array and sort
    const groups = Object.values(groupedContent).sort((a, b) => {
      if (groupBy === 'topic') {
        return a.items[0]?.topicId?.orderIndex - b.items[0]?.topicId?.orderIndex;
      } else if (groupBy === 'day') {
        const aDay = parseInt(a.groupKey.split('_')[1]);
        const bDay = parseInt(b.groupKey.split('_')[1]);
        return aDay - bDay;
      } else if (groupBy === 'year') {
        return parseInt(b.groupKey) - parseInt(a.groupKey); // Newest first
      }
      return 0;
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      groupBy,
      totalItems: content.length,
      totalGroups: groups.length,
      groups
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Update content group
 * @route   PUT /api/content/groups/:examName/:subjectName/:trackName/:subCategoryName/:groupKey
 * @desc    Update multiple content items in a group
 * @access  Private
 */
router.put('/groups/:examName/:subjectName/:trackName/:subCategoryName/:groupKey', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, groupKey } = req.params;
    const { items, groupType } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const results = { updated: [], errors: [] };

    // Update each item in the group
    for (const [index, item] of items.entries()) {
      try {
        if (!item.id) {
          results.errors.push({
            index,
            error: 'Item ID is required'
          });
          continue;
        }

        const updatedContent = await examModel.updateContent(item.id, {
          displayName: item.displayName,
          description: item.description,
          orderIndex: item.orderIndex,
          isActive: item.isActive !== undefined ? item.isActive : true
        });

        if (updatedContent) {
          results.updated.push({
            id: updatedContent._id,
            name: updatedContent.name,
            displayName: updatedContent.displayName
          });
        }
      } catch (error) {
        results.errors.push({
          index,
          id: item.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Updated ${results.updated.length} items in group "${groupKey}"`,
      context: { examName, subjectName, trackName, subCategoryName },
      groupKey,
      groupType,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Delete content group
 * @route   DELETE /api/content/groups/:examName/:subjectName/:trackName/:subCategoryName/:groupKey
 * @desc    Delete all content items in a group (soft delete)
 * @access  Private
 */
router.delete('/groups/:examName/:subjectName/:trackName/:subCategoryName/:groupKey', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, groupKey } = req.params;
    const { groupType } = req.query;

    // Get content in this context first
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });

    // Filter content by group
    let contentToDelete = [];

    if (groupType === 'topic') {
      contentToDelete = content.filter(item => 
        (item.topicId?.name || 'uncategorized') === groupKey
      );
    } else if (groupType === 'day') {
      const dayNum = groupKey.split('_')[1];
      contentToDelete = content.filter(item => 
        item.name.match(new RegExp(`day${dayNum}`, 'i'))
      );
    } else if (groupType === 'year') {
      contentToDelete = content.filter(item => 
        item.name.includes(groupKey)
      );
    }

    const results = { deleted: [], errors: [] };

    // Delete each item
    for (const item of contentToDelete) {
      try {
        await examModel.deleteContent(item._id);
        results.deleted.push({
          id: item._id,
          name: item.name,
          displayName: item.displayName
        });
      } catch (error) {
        results.errors.push({
          id: item._id,
          name: item.name,
          error: error.message
        });
      }
    }

    res.json({
      message: `Deleted ${results.deleted.length} items from group "${groupKey}"`,
      context: { examName, subjectName, trackName, subCategoryName },
      groupKey,
      groupType,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// ========== QUICK UPLOAD SHORTCUTS ==========

/**
 * NEW: Quick upload for Past Questions (year-based)
 * @route   POST /api/content/quick/pastquestions/:examName/:subjectName/:year
 * @desc    Quick upload for past questions by year
 * @access  Private
 */
router.post('/quick/pastquestions/:examName/:subjectName/:year', async (req, res) => {
  try {
    const { examName, subjectName, year } = req.params;
    const { content } = req.body;

    // Auto-determine track and subcategory
    const trackName = 'years_past_question';
    const subCategoryName = 'pastquestions';

    // Redirect to main upload endpoint
    return await router.handle({
      ...req,
      params: { examName, subjectName, trackName, subCategoryName },
      body: { 
        content: content.map(item => ({ 
          ...item, 
          name: `${year}_${item.name}`,
          displayName: `${year} - ${item.displayName || item.name}`
        })) 
      }
    }, res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Quick upload for Notes (day-based)
 * @route   POST /api/content/quick/notes/:examName/:subjectName/:trackName/:dayNum
 * @desc    Quick upload for notes by day
 * @access  Private
 */
router.post('/quick/notes/:examName/:subjectName/:trackName/:dayNum', async (req, res) => {
  try {
    const { examName, subjectName, trackName, dayNum } = req.params;
    const { content } = req.body;

    const subCategoryName = 'notes';

    // Add day prefix to content
    const enrichedContent = content.map(item => ({
      ...item,
      name: `day${dayNum}_${item.name}`,
      displayName: `Day ${dayNum} - ${item.displayName || item.name}`,
      orderIndex: parseInt(dayNum)
    }));

    // Use main upload endpoint
    req.params = { examName, subjectName, trackName, subCategoryName };
    req.body = { content: enrichedContent };
    
    return await router.post('/upload/:examName/:subjectName/:trackName/:subCategoryName')(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== LEGACY SUPPORT ==========

/**
 * LEGACY: Keep original bulk upload for backward compatibility
 * @route   POST /api/content/bulk
 * @desc    Legacy bulk upload (kept for backward compatibility)
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    console.warn('Using legacy bulk upload endpoint. Consider using context-specific endpoints.');
    
    const results = await examModel.createBulkContentWithValidation(content);
    
    if (results.success) {
      res.status(201).json({
        message: results.message,
        note: 'Legacy endpoint used. Consider migrating to context-specific endpoints.',
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;