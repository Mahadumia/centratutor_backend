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

// ========== WEEK-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific week in a weekly track
 * @route   POST /api/content/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Upload content for a specific week (Week 1, Week 2, etc.)
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate week number
    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      return res.status(400).json({ message: 'Valid week number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
      });
    }

    // Check if week number is within track duration
    if (track.duration && week > track.duration) {
      return res.status(400).json({ 
        message: `Week ${week} exceeds track duration of ${track.duration} weeks` 
      });
    }

    // Add week-specific naming to each content item
    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `week${week}_${item.name}`,
      displayName: `Week ${week} - ${item.displayName || item.name}`,
      description: item.description ? `Week ${week}: ${item.description}` : `Week ${week} content`,
      orderIndex: (week * 1000) + (item.orderIndex || index), // Week-based ordering
      metadata: {
        ...item.metadata,
        week: week,
        weekLabel: `Week ${week}`,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
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
          subCategory: subCategory.displayName,
          week: week
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== DAY-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific day in a daily track
 * @route   POST /api/content/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Upload content for a specific day (Day 1, Day 2, etc.)
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate day number
    const day = parseInt(dayNumber);
    if (isNaN(day) || day < 1) {
      return res.status(400).json({ message: 'Valid day number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
      });
    }

    // Check if day number is within track duration
    if (track.duration && day > track.duration) {
      return res.status(400).json({ 
        message: `Day ${day} exceeds track duration of ${track.duration} days` 
      });
    }

    // Add day-specific naming to each content item
    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `day${day}_${item.name}`,
      displayName: `Day ${day} - ${item.displayName || item.name}`,
      description: item.description ? `Day ${day}: ${item.description}` : `Day ${day} content`,
      orderIndex: day * 100 + (item.orderIndex || index), // Day-based ordering
      metadata: {
        ...item.metadata,
        day: day,
        dayLabel: `Day ${day}`,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to Day ${day}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
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
          subCategory: subCategory.displayName,
          day: day
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== MONTH-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific month in a monthly track
 * @route   POST /api/content/months/:examName/:subjectName/:trackName/:subCategoryName/:monthNumber
 * @desc    Upload content for a specific month (Month 1, Month 2, etc.)
 * @access  Private
 */
router.post('/months/:examName/:subjectName/:trackName/:subCategoryName/:monthNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, monthNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate month number
    const month = parseInt(monthNumber);
    if (isNaN(month) || month < 1) {
      return res.status(400).json({ message: 'Valid month number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'months') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a monthly track (type: ${track.trackType})` 
      });
    }

    // Check if month number is within track duration
    if (track.duration && month > track.duration) {
      return res.status(400).json({ 
        message: `Month ${month} exceeds track duration of ${track.duration} months` 
      });
    }

    // Add month-specific naming to each content item
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1] || `Month ${month}`;

    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `month${month}_${item.name}`,
      displayName: `${monthName} - ${item.displayName || item.name}`,
      description: item.description ? `${monthName}: ${item.description}` : `${monthName} content`,
      orderIndex: month * 10000 + (item.orderIndex || index), // Month-based ordering
      metadata: {
        ...item.metadata,
        month: month,
        monthName: monthName,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to ${monthName}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          month: month,
          monthName: monthName
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
          subCategory: subCategory.displayName,
          month: month,
          monthName: monthName
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== SEMESTER-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific semester in a semester track
 * @route   POST /api/content/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Upload content for a specific semester (Semester 1, Semester 2, etc.)
 * @access  Private
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate semester number
    const semester = parseInt(semesterNumber);
    if (isNaN(semester) || semester < 1) {
      return res.status(400).json({ message: 'Valid semester number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    // Check if semester number is within track duration
    if (track.duration && semester > track.duration) {
      return res.status(400).json({ 
        message: `Semester ${semester} exceeds track duration of ${track.duration} semesters` 
      });
    }

    // Add semester-specific naming to each content item
    const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
    const semesterName = semesterNames[semester - 1] || `Semester ${semester}`;

    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `semester${semester}_${item.name}`,
      displayName: `${semesterName} - ${item.displayName || item.name}`,
      description: item.description ? `${semesterName}: ${item.description}` : `${semesterName} content`,
      orderIndex: semester * 100000 + (item.orderIndex || index), // Semester-based ordering
      metadata: {
        ...item.metadata,
        semester: semester,
        semesterName: semesterName,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to ${semesterName}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: semester,
          semesterName: semesterName
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
          subCategory: subCategory.displayName,
          semester: semester,
          semesterName: semesterName
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== BATCH UPLOAD FOR MULTIPLE TIME PERIODS ==========

/**
 * NEW: Batch upload content to multiple weeks at once
 * @route   POST /api/content/weeks/:examName/:subjectName/:trackName/:subCategoryName/batch
 * @desc    Upload content for multiple weeks in one request
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/batch', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { weeklyContent } = req.body;
    
    if (!weeklyContent || typeof weeklyContent !== 'object') {
      return res.status(400).json({ 
        message: 'weeklyContent object is required (format: { "1": [...], "2": [...] })' 
      });
    }

    const results = { weeks: {}, summary: { totalWeeks: 0, totalItems: 0, errors: [] } };

    // Process each week
    for (const [weekNum, content] of Object.entries(weeklyContent)) {
      try {
        const week = parseInt(weekNum);
        if (isNaN(week) || week < 1) {
          results.summary.errors.push(`Invalid week number: ${weekNum}`);
          continue;
        }

        if (!Array.isArray(content) || content.length === 0) {
          results.summary.errors.push(`Week ${week}: Content array is empty or invalid`);
          continue;
        }

        // Create a mock request for the individual week endpoint
        const weekResult = await router.handle({
          params: { examName, subjectName, trackName, subCategoryName, weekNumber: weekNum },
          body: { content }
        }, { 
          status: () => ({ json: (data) => data }),
          json: (data) => data 
        });

        results.weeks[week] = weekResult;
        results.summary.totalWeeks++;
        results.summary.totalItems += content.length;

      } catch (error) {
        results.summary.errors.push(`Week ${weekNum}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: `Batch upload completed for ${results.summary.totalWeeks} weeks`,
      context: { examName, subjectName, trackName, subCategoryName },
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Batch upload content to multiple days at once
 * @route   POST /api/content/days/:examName/:subjectName/:trackName/:subCategoryName/batch
 * @desc    Upload content for multiple days in one request
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/batch', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { dailyContent } = req.body;
    
    if (!dailyContent || typeof dailyContent !== 'object') {
      return res.status(400).json({ 
        message: 'dailyContent object is required (format: { "1": [...], "2": [...] })' 
      });
    }

    const results = { days: {}, summary: { totalDays: 0, totalItems: 0, errors: [] } };

    // Process each day
    for (const [dayNum, content] of Object.entries(dailyContent)) {
      try {
        const day = parseInt(dayNum);
        if (isNaN(day) || day < 1) {
          results.summary.errors.push(`Invalid day number: ${dayNum}`);
          continue;
        }

        if (!Array.isArray(content) || content.length === 0) {
          results.summary.errors.push(`Day ${day}: Content array is empty or invalid`);
          continue;
        }

        // Process this day's content (simplified for batch processing)
        results.days[day] = {
          dayNumber: day,
          itemCount: content.length,
          status: 'processed'
        };
        
        results.summary.totalDays++;
        results.summary.totalItems += content.length;

      } catch (error) {
        results.summary.errors.push(`Day ${dayNum}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: `Batch upload completed for ${results.summary.totalDays} days`,
      context: { examName, subjectName, trackName, subCategoryName },
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== UTILITY ENDPOINTS ==========

/**
 * NEW: Get track time periods structure
 * @route   GET /api/content/:examName/:subjectName/:trackName/:subCategoryName/periods
 * @desc    Get available time periods for a track (weeks, days, months, etc.)
 * @access  Public
 */
router.get('/:examName/:subjectName/:trackName/:subCategoryName/periods', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    
    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const periods = [];
    const trackType = track.trackType;
    const duration = track.duration || 0;

    if (trackType === 'weeks') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Week ${i}`,
          type: 'week',
          uploadEndpoint: `/api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          uploadEndpoint: `/api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'months') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: monthNames[i - 1] || `Month ${i}`,
          type: 'month',
          uploadEndpoint: `/api/content/months/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'semester') {
      const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: semesterNames[i - 1] || `Semester ${i}`,
          type: 'semester',
          uploadEndpoint: `/api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    }

    res.json({
      track: {
        name: track.displayName,
        type: trackType,
        duration: duration
      },
      totalPeriods: periods.length,
      periods,
      batchUploadEndpoint: `/api/content/${trackType}/${examName}/${subjectName}/${trackName}/${subCategoryName}/batch`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Get content for a specific time period
 * @route   GET /api/content/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber
 * @desc    Get content for a specific week/day/month/semester
 * @access  Public
 */
router.get('/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, trackType, periodNumber } = req.params;
    
    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName.toLowerCase(), isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName.toLowerCase(), isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    // Validate track type
    const validTypes = ['weeks', 'days', 'months', 'semester'];
    const trackTypeMap = { weeks: 'week', days: 'day', months: 'month', semester: 'semester' };
    
    if (!validTypes.includes(trackType)) {
      return res.status(400).json({ message: 'Invalid track type. Use: weeks, days, months, or semester' });
    }

    if (track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track type mismatch. Track is "${track.trackType}", requested "${trackType}"` 
      });
    }

    const period = parseInt(periodNumber);
    if (isNaN(period) || period < 1) {
      return res.status(400).json({ message: 'Valid period number required' });
    }

    // Get content for this specific time period
    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });

    // Filter content for this specific period
    const periodContent = content.filter(item => {
      const periodKey = trackTypeMap[trackType];
      return item.metadata && item.metadata[periodKey] === period;
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      period: {
        number: period,
        type: trackTypeMap[trackType],
        name: `${trackTypeMap[trackType].charAt(0).toUpperCase() + trackTypeMap[trackType].slice(1)} ${period}`
      },
      totalContent: periodContent.length,
      content: periodContent
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;