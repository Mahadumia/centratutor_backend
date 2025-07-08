// routes/content.js - Enhanced Content Upload Routes with Complete Duplicate Prevention
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

// ========== UTILITY FUNCTIONS ==========

/**
 * Generic function to check for existing period content
 */
async function checkExistingPeriodContent(context, trackType, periodIdentifier) {
  const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
  
  let query = {
    examName: context.exam.name,
    subjectName: context.subject.name,
    trackName: context.track.name,
    subCategoryName: context.subCategory.name
  };

  // Add period-specific metadata query
  switch (trackType) {
    case 'weeks':
      query['metadata.week'] = parseInt(periodIdentifier);
      break;
    case 'days':
      query['metadata.day'] = parseInt(periodIdentifier);
      break;
    case 'months':
      query['metadata.month'] = parseInt(periodIdentifier);
      break;
    case 'semester':
      // Check both semesterName and numeric semester for flexibility
      query = {
        ...query,
        $or: [
          { 'metadata.semesterName': periodIdentifier },
          { 'metadata.semester': parseInt(periodIdentifier) || 1 }
        ]
      };
      break;
    case 'years':
      query['metadata.year'] = parseInt(periodIdentifier) || periodIdentifier;
      break;
  }

  return await Content.findOne(query);
}

/**
 * Generic function to resolve exam context
 */
async function resolveExamContext(examName, subjectName, trackName, subCategoryName) {
  const { Exam, Subject, Track, SubCategory } = require('../models/exam');
  
  const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
  const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
  const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
  const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

  return { exam, subject, subCategory, track };
}

/**
 * Generic function to validate track type and period
 */
function validateTrackAndPeriod(track, expectedTrackType, periodNumber, periodIdentifier) {
  if (!track) {
    return { valid: false, message: 'Track not found' };
  }

  if (track.trackType !== expectedTrackType) {
    return { 
      valid: false, 
      message: `Track "${track.name}" is not a ${expectedTrackType.slice(0, -1)} track (type: ${track.trackType})` 
    };
  }

  // Validate period number for numeric types
  if (['weeks', 'days', 'months'].includes(expectedTrackType)) {
    if (isNaN(periodNumber) || periodNumber < 1) {
      return { 
        valid: false, 
        message: `Valid ${expectedTrackType.slice(0, -1)} number (1 or greater) is required` 
      };
    }

    if (track.duration && periodNumber > track.duration) {
      return { 
        valid: false, 
        message: `${expectedTrackType.slice(0, -1).charAt(0).toUpperCase() + expectedTrackType.slice(0, -1).slice(1)} ${periodNumber} exceeds track duration of ${track.duration} ${expectedTrackType}` 
      };
    }
  }

  return { valid: true };
}

/**
 * Generic function to create enriched content with period metadata
 */
function createEnrichedContent(content, context, trackType, periodNumber, periodIdentifier) {
  const { exam, subject, track, subCategory } = context;
  
  return content.map((item, index) => {
    let metadata = { ...item.metadata, timeBasedContent: true };
    let namePrefix = '';
    let displayPrefix = '';
    let orderMultiplier = 1;

    switch (trackType) {
      case 'weeks':
        metadata.week = periodNumber;
        metadata.weekLabel = `Week ${periodNumber}`;
        namePrefix = `week${periodNumber}_`;
        displayPrefix = `Week ${periodNumber} - `;
        orderMultiplier = 1000;
        break;
      case 'days':
        metadata.day = periodNumber;
        metadata.dayLabel = `Day ${periodNumber}`;
        namePrefix = `day${periodNumber}_`;
        displayPrefix = `Day ${periodNumber} - `;
        orderMultiplier = 100;
        break;
      case 'months':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[periodNumber - 1] || `Month ${periodNumber}`;
        metadata.month = periodNumber;
        metadata.monthLabel = monthName;
        namePrefix = `month${periodNumber}_`;
        displayPrefix = `${monthName} - `;
        orderMultiplier = 10000;
        break;
      case 'semester':
        const numericSemester = parseInt(periodIdentifier) || 1;
        metadata.semester = numericSemester;
        metadata.semesterName = periodIdentifier;
        metadata.originalSemesterNumber = periodIdentifier;
        namePrefix = `semester${numericSemester}_`;
        displayPrefix = `${periodIdentifier} - `;
        orderMultiplier = 100000;
        break;
      case 'years':
        const year = parseInt(periodIdentifier) || periodIdentifier;
        metadata.year = year;
        metadata.yearLabel = year.toString();
        namePrefix = `year${year}_`;
        displayPrefix = `${year} - `;
        orderMultiplier = 1000000;
        break;
    }

    return {
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `${namePrefix}${item.name}`,
      displayName: `${displayPrefix}${item.displayName || item.name}`,
      description: item.description ? `${displayPrefix.slice(0, -3)}: ${item.description}` : `${displayPrefix.slice(0, -3)} content`,
      orderIndex: (periodNumber * orderMultiplier) + (item.orderIndex || index),
      metadata,
      ...item
    };
  });
}

// ========== ENHANCED UPLOAD ROUTES WITH COMPLETE DUPLICATE PREVENTION ==========

/**
 * Enhanced Week Content Upload with Duplicate Prevention
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { content, force = false } = req.body; // Added force flag for overrides
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    const week = parseInt(weekNumber);
    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    const validation = validateTrackAndPeriod(context.track, 'weeks', week, weekNumber);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Check for existing content
    const existingContent = await checkExistingPeriodContent(context, 'weeks', week);
    
    if (existingContent && !force) {
      return res.status(409).json({ 
        message: `Content for Week ${week} already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        existingContent: {
          name: existingContent.name,
          displayName: existingContent.displayName,
          createdAt: existingContent.createdAt
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}`
        }
      });
    }

    // If force=true, delete existing content first
    if (existingContent && force) {
      const { Content } = require('../models/exam');
      await Content.deleteMany({
        examName: context.exam.name,
        subjectName: context.subject.name,
        trackName: context.track.name,
        subCategoryName: context.subCategory.name,
        'metadata.week': week
      });
    }

    // Create enriched content
    const enrichedContent = createEnrichedContent(content, context, 'weeks', week, weekNumber);

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    const statusCode = force && existingContent ? 200 : 201;
    const action = force && existingContent ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to Week ${week}`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        action: action,
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
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

/**
 * Enhanced Day Content Upload with Duplicate Prevention
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { content, force = false } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    const day = parseInt(dayNumber);
    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    const validation = validateTrackAndPeriod(context.track, 'days', day, dayNumber);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const existingContent = await checkExistingPeriodContent(context, 'days', day);
    
    if (existingContent && !force) {
      return res.status(409).json({ 
        message: `Content for Day ${day} already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        existingContent: {
          name: existingContent.name,
          displayName: existingContent.displayName,
          createdAt: existingContent.createdAt
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}`
        }
      });
    }

    if (existingContent && force) {
      const { Content } = require('../models/exam');
      await Content.deleteMany({
        examName: context.exam.name,
        subjectName: context.subject.name,
        trackName: context.track.name,
        subCategoryName: context.subCategory.name,
        'metadata.day': day
      });
    }

    const enrichedContent = createEnrichedContent(content, context, 'days', day, dayNumber);
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    const statusCode = force && existingContent ? 200 : 201;
    const action = force && existingContent ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to Day ${day}`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        action: action,
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
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


/**
 * Enhanced Semester Content Upload with Duplicate Prevention
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { content, force = false } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    const originalSemesterNumber = semesterNumber;
    const numericSemester = parseInt(semesterNumber) || 1;
    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    if (context.track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${context.track.name}" is not a semester track (type: ${context.track.trackType})` 
      });
    }

    if (context.track.duration && numericSemester > context.track.duration) {
      return res.status(400).json({ 
        message: `Semester ${originalSemesterNumber} exceeds track duration of ${context.track.duration} semesters` 
      });
    }

    const existingContent = await checkExistingPeriodContent(context, 'semester', originalSemesterNumber);
    
    if (existingContent && !force) {
      return res.status(409).json({ 
        message: `Content for Semester "${originalSemesterNumber}" already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        existingContent: {
          name: existingContent.name,
          displayName: existingContent.displayName,
          createdAt: existingContent.createdAt
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}`
        }
      });
    }

    if (existingContent && force) {
      const { Content } = require('../models/exam');
      await Content.deleteMany({
        examName: context.exam.name,
        subjectName: context.subject.name,
        trackName: context.track.name,
        subCategoryName: context.subCategory.name,
        'metadata.semesterName': originalSemesterNumber
      });
    }

    const enrichedContent = createEnrichedContent(content, context, 'semester', numericSemester, originalSemesterNumber);
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    const statusCode = force && existingContent ? 200 : 201;
    const action = force && existingContent ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to ${originalSemesterNumber}`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        action: action,
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// ========== ENHANCED UPDATE ROUTES FOR ENTIRE PERIODS ==========

/**
 * Generic function to update entire period content
 */
async function updateEntirePeriod(req, res, trackType) {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const periodIdentifier = req.params.weekNumber || req.params.dayNumber || req.params.monthNumber || req.params.semesterNumber || req.params.year;
    const { items, replaceAll = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    if (context.track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track "${context.track.name}" is not a ${trackType.slice(0, -1)} track (type: ${context.track.trackType})` 
      });
    }

    // Get existing content for this period
    const { Content } = require('../models/exam');
    let query = {
      examName: context.exam.name,
      subjectName: context.subject.name,
      trackName: context.track.name,
      subCategoryName: context.subCategory.name
    };

    // Add period-specific query
    const periodNumber = parseInt(periodIdentifier);
    switch (trackType) {
      case 'weeks':
        query['metadata.week'] = periodNumber;
        break;
      case 'days':
        query['metadata.day'] = periodNumber;
        break;
      case 'months':
        query['metadata.month'] = periodNumber;
        break;
      case 'semester':
        query['metadata.semesterName'] = periodIdentifier;
        break;
      case 'years':
        query['metadata.year'] = periodNumber;
        break;
    }

    const existingContent = await Content.find(query);

    if (existingContent.length === 0) {
      return res.status(404).json({
        message: `No content found for ${trackType.slice(0, -1)} ${periodIdentifier}`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          period: periodIdentifier,
          trackType: trackType
        }
      });
    }

    const results = { updated: [], errors: [], deleted: [] };

    // If replaceAll=true, delete all existing content and create new ones
    if (replaceAll) {
      try {
        // Delete all existing content for this period
        const deleteResult = await Content.deleteMany(query);
        results.deleted = Array.from({ length: deleteResult.deletedCount }, (_, i) => `Deleted item ${i + 1}`);

        // Create new content using the enriched content function
        const enrichedContent = createEnrichedContent(
          items.map(item => ({ ...item, orderIndex: item.orderIndex || 0 })), 
          context, 
          trackType, 
          periodNumber, 
          periodIdentifier
        );

        const createResults = await examModel.createBulkContentWithValidation(enrichedContent);
        
        if (createResults.success) {
          results.updated = createResults.results.created.map(item => ({
            id: item._id,
            name: item.name,
            displayName: item.displayName,
            orderIndex: item.orderIndex,
            action: 'created'
          }));
        } else {
          results.errors.push(...(createResults.errors || []));
        }
      } catch (error) {
        results.errors.push({
          action: 'replaceAll',
          error: error.message
        });
      }
    } else {
      // Update existing items individually
      for (const [index, item] of items.entries()) {
        try {
          let contentToUpdate;
          
          if (item.name) {
            // Find by name (with period prefix)
            let fullName = item.name;
            const prefixes = {
              'weeks': `week${periodNumber}_`,
              'days': `day${periodNumber}_`,
              'months': `month${periodNumber}_`,
              'semester': `semester${periodNumber}_`,
              'years': `year${periodNumber}_`
            };
            
            if (!fullName.startsWith(prefixes[trackType])) {
              fullName = `${prefixes[trackType]}${item.name}`;
            }
            contentToUpdate = existingContent.find(content => content.name === fullName);
          } else if (item.index !== undefined) {
            // Find by index position
            contentToUpdate = existingContent[item.index];
          } else if (item.id) {
            // Find by ID
            contentToUpdate = existingContent.find(content => content._id.toString() === item.id);
          }

          if (!contentToUpdate) {
            results.errors.push({
              index,
              item: item.name || item.index || item.id,
              error: `Content item not found in this ${trackType.slice(0, -1)}`
            });
            continue;
          }

          // Calculate new order index based on track type
          let newOrderIndex = contentToUpdate.orderIndex;
          if (item.orderIndex !== undefined) {
            const orderMultipliers = {
              'weeks': 1000,
              'days': 100,
              'months': 10000,
              'semester': 100000,
              'years': 1000000
            };
            newOrderIndex = (periodNumber * orderMultipliers[trackType]) + item.orderIndex;
          }

          // Update the content
          const updatedContent = await examModel.updateContent(contentToUpdate._id, {
            displayName: item.displayName || contentToUpdate.displayName,
            description: item.description || contentToUpdate.description,
            orderIndex: newOrderIndex,
            isActive: item.isActive !== undefined ? item.isActive : contentToUpdate.isActive,
            filePath: item.filePath || contentToUpdate.filePath,
            fileType: item.fileType || contentToUpdate.fileType,
            fileSize: item.fileSize || contentToUpdate.fileSize,
            metadata: {
              ...contentToUpdate.metadata,
              ...item.metadata
            }
          });

          if (updatedContent) {
            results.updated.push({
              id: updatedContent._id,
              name: updatedContent.name,
              displayName: updatedContent.displayName,
              orderIndex: updatedContent.orderIndex,
              action: 'updated'
            });
          }
        } catch (error) {
          results.errors.push({
            index,
            item: item.name || item.index || item.id,
            error: error.message
          });
        }
      }
    }

    const action = replaceAll ? 'replaced' : 'updated';
    const totalProcessed = results.updated.length + results.deleted.length;
    
    res.json({
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} ${totalProcessed} items in ${trackType.slice(0, -1)} ${periodIdentifier}`,
      context: {
        exam: context.exam.displayName,
        subject: context.subject.displayName,
        track: context.track.displayName,
        subCategory: context.subCategory.displayName,
        period: periodIdentifier,
        trackType: trackType
      },
      action: action,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

/**
 * Update entire week content
 */
router.put('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  return updateEntirePeriod(req, res, 'weeks');
});

/**
 * Update entire day content
 */
router.put('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  return updateEntirePeriod(req, res, 'days');
});

/**
 * Update entire month content
 */
router.put('/months/:examName/:subjectName/:trackName/:subCategoryName/:monthNumber', async (req, res) => {
  return updateEntirePeriod(req, res, 'months');
});

/**
 * Update entire semester content
 */
router.put('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  return updateEntirePeriod(req, res, 'semester');
});



// ========== DELETE ROUTES FOR ENTIRE PERIODS ==========

/**
 * Generic function to delete entire period content
 */
async function deleteEntirePeriod(req, res, trackType) {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const periodIdentifier = req.params.weekNumber || req.params.dayNumber || req.params.monthNumber || req.params.semesterNumber || req.params.year;
    const { confirm = false } = req.query; // Safety confirmation

    if (!confirm) {
      return res.status(400).json({
        message: `Deletion requires confirmation. Add ?confirm=true to delete all content for ${trackType.slice(0, -1)} ${periodIdentifier}`,
        warning: 'This action cannot be undone',
        confirmUrl: `${req.originalUrl}?confirm=true`
      });
    }

    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    if (context.track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track "${context.track.name}" is not a ${trackType.slice(0, -1)} track (type: ${context.track.trackType})` 
      });
    }

    // Build query for this period
    const { Content } = require('../models/exam');
    let query = {
      examName: context.exam.name,
      subjectName: context.subject.name,
      trackName: context.track.name,
      subCategoryName: context.subCategory.name
    };

    const periodNumber = parseInt(periodIdentifier);
    switch (trackType) {
      case 'weeks':
        query['metadata.week'] = periodNumber;
        break;
      case 'days':
        query['metadata.day'] = periodNumber;
        break;
      case 'months':
        query['metadata.month'] = periodNumber;
        break;
      case 'semester':
        query['metadata.semesterName'] = periodIdentifier;
        break;
      case 'years':
        query['metadata.year'] = periodNumber;
        break;
    }

    // Get existing content count first
    const existingCount = await Content.countDocuments(query);
    
    if (existingCount === 0) {
      return res.status(404).json({
        message: `No content found for ${trackType.slice(0, -1)} ${periodIdentifier}`,
        context: {
          exam: context.exam.displayName,
          subject: context.subject.displayName,
          track: context.track.displayName,
          subCategory: context.subCategory.displayName,
          period: periodIdentifier,
          trackType: trackType
        }
      });
    }

    // Delete all content for this period
    const deleteResult = await Content.deleteMany(query);

    res.json({
      message: `Successfully deleted ${deleteResult.deletedCount} content items from ${trackType.slice(0, -1)} ${periodIdentifier}`,
      context: {
        exam: context.exam.displayName,
        subject: context.subject.displayName,
        track: context.track.displayName,
        subCategory: context.subCategory.displayName,
        period: periodIdentifier,
        trackType: trackType
      },
      deletedCount: deleteResult.deletedCount,
      action: 'deleted'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

/**
 * Delete entire week content
 */
router.delete('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  return deleteEntirePeriod(req, res, 'weeks');
});

/**
 * Delete entire day content
 */
router.delete('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  return deleteEntirePeriod(req, res, 'days');
});

/**
 * Delete entire month content
 */
router.delete('/months/:examName/:subjectName/:trackName/:subCategoryName/:monthNumber', async (req, res) => {
  return deleteEntirePeriod(req, res, 'months');
});

/**
 * Delete entire semester content
 */
router.delete('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  return deleteEntirePeriod(req, res, 'semester');
});

/**
 * Delete entire year content
 */
router.delete('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
  return deleteEntirePeriod(req, res, 'years');
});

// ========== KEEP EXISTING ROUTES ==========

// Keep your existing GET route for groups
router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'topic' } = req.query;

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

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
      content.forEach(item => {
        const day = item.metadata?.day || 
                    (item.name.match(/day(\d+)/i) ? parseInt(item.name.match(/day(\d+)/i)[1]) : 0);
        const dayKey = `day_${day}`;
        
        if (!groupedContent[dayKey]) {
          groupedContent[dayKey] = {
            groupKey: dayKey,
            groupName: `Day ${day}`,
            groupType: 'day',
            items: []
          };
        }
        groupedContent[dayKey].items.push(item);
      });

    } else if (groupBy === 'week' && track.trackType === 'weeks') {
      content.forEach(item => {
        const week = item.metadata?.week || 
                     (item.name.match(/week(\d+)/i) ? parseInt(item.name.match(/week(\d+)/i)[1]) : 0);
        const weekKey = `week_${week}`;
        
        if (!groupedContent[weekKey]) {
          groupedContent[weekKey] = {
            groupKey: weekKey,
            groupName: `Week ${week}`,
            groupType: 'week',
            items: []
          };
        }
        groupedContent[weekKey].items.push(item);
      });

    } else if (groupBy === 'month' && track.trackType === 'months') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      content.forEach(item => {
        const month = item.metadata?.month || 
                      (item.name.match(/month(\d+)/i) ? parseInt(item.name.match(/month(\d+)/i)[1]) : 0);
        const monthKey = `month_${month}`;
        const monthName = monthNames[month - 1] || `Month ${month}`;
        
        if (!groupedContent[monthKey]) {
          groupedContent[monthKey] = {
            groupKey: monthKey,
            groupName: monthName,
            groupType: 'month',
            items: []
          };
        }
        groupedContent[monthKey].items.push(item);
      });

    } else if (groupBy === 'semester' && track.trackType === 'semester') {
      content.forEach((item, index) => {
        const semesterName = item.metadata?.semesterName || 
                            item.metadata?.originalSemesterNumber || 
                            `Semester ${item.metadata?.semester || 1}`;
        
        const semesterKey = semesterName.toLowerCase().replace(/\s+/g, '_');
        
        if (!groupedContent[semesterKey]) {
          groupedContent[semesterKey] = {
            groupKey: semesterKey,
            groupName: semesterName,
            groupType: 'semester',
            items: [],
            sortOrder: item.metadata?.semester || 1
          };
        }
        
        groupedContent[semesterKey].items.push(item);
      });

    } else if (groupBy === 'year' && track.trackType === 'years') {
      content.forEach(item => {
        const year = item.metadata?.year || 
                     item.name.match(/(\d{4})/)?.[1] || 'unknown';
        
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

    } else {
      // Default fallback - group by topic
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
    }

    // Convert to array and sort
    const groups = Object.values(groupedContent).sort((a, b) => {
      if (groupBy === 'topic') {
        return (a.items[0]?.topicId?.orderIndex || 0) - (b.items[0]?.topicId?.orderIndex || 0);
      } else if (groupBy === 'day') {
        const aDay = parseInt(a.groupKey.split('_')[1]) || 0;
        const bDay = parseInt(b.groupKey.split('_')[1]) || 0;
        return aDay - bDay;
      } else if (groupBy === 'week') {
        const aWeek = parseInt(a.groupKey.split('_')[1]) || 0;
        const bWeek = parseInt(b.groupKey.split('_')[1]) || 0;
        return aWeek - bWeek;
      } else if (groupBy === 'month') {
        const aMonth = parseInt(a.groupKey.split('_')[1]) || 0;
        const bMonth = parseInt(b.groupKey.split('_')[1]) || 0;
        return aMonth - bMonth;
      } else if (groupBy === 'semester') {
        const aSemester = a.sortOrder || 0;
        const bSemester = b.sortOrder || 0;
        if (aSemester !== bSemester) {
          return aSemester - bSemester;
        }
        return a.groupName.localeCompare(b.groupName);
      } else if (groupBy === 'year') {
        return parseInt(b.groupKey) - parseInt(a.groupKey);
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

// Keep other existing utility routes
router.get('/:examName/:subjectName/:trackName/:subCategoryName/periods', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    
    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const periods = [];
    const trackType = context.track.trackType;
    const duration = context.track.duration || 0;

    if (trackType === 'weeks') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Week ${i}`,
          type: 'week',
          uploadEndpoint: `/api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `PUT /api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          deleteEndpoint: `DELETE /api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}?confirm=true`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          uploadEndpoint: `/api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `PUT /api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          deleteEndpoint: `DELETE /api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}?confirm=true`
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
          uploadEndpoint: `/api/content/months/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `PUT /api/content/months/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          deleteEndpoint: `DELETE /api/content/months/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}?confirm=true`
        });
      }
    } else if (trackType === 'semester') {
      const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: semesterNames[i - 1] || `Semester ${i}`,
          type: 'semester',
          uploadEndpoint: `/api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `PUT /api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          deleteEndpoint: `DELETE /api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}?confirm=true`
        });
      }
    } else if (trackType === 'years') {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < duration; i++) {
        const year = currentYear + i;
        periods.push({
          number: year,
          name: year.toString(),
          type: 'year',
          uploadEndpoint: `/api/content/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year}`,
          updateEndpoint: `PUT /api/content/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year}`,
          deleteEndpoint: `DELETE /api/content/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year}?confirm=true`
        });
      }
    }

    res.json({
      track: {
        name: context.track.displayName,
        type: trackType,
        duration: duration
      },
      totalPeriods: periods.length,
      periods,
      batchUploadEndpoint: `/api/content/batch/${examName}/${subjectName}/${trackName}/${subCategoryName}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, trackType, periodNumber } = req.params;
    
    const context = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!context.exam || !context.subject || !context.subCategory || !context.track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    const validTypes = ['weeks', 'days', 'months', 'semester', 'years'];
    const trackTypeMap = { weeks: 'week', days: 'day', months: 'month', semester: 'semester', years: 'year' };
    
    if (!validTypes.includes(trackType)) {
      return res.status(400).json({ message: 'Invalid track type. Use: weeks, days, months, semester, or years' });
    }

    if (context.track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track type mismatch. Track is "${context.track.trackType}", requested "${trackType}"` 
      });
    }

    const period = parseInt(periodNumber);
    if (isNaN(period) || period < 1) {
      return res.status(400).json({ message: 'Valid period number required' });
    }

    // Get content for this context
    const content = await examModel.getContentByFilters({
      examId: context.exam._id,
      subjectId: context.subject._id,
      trackId: context.track._id,
      subCategoryId: context.subCategory._id
    });

    // Filter content for this specific period
    const periodContent = content.filter(item => {
      const periodKey = trackTypeMap[trackType];
      if (trackType === 'semester') {
        return item.metadata && (item.metadata[periodKey] === period || item.metadata.semesterName === periodNumber);
      }
      return item.metadata && item.metadata[periodKey] === period;
    });

    res.json({
      context: {
        exam: context.exam.displayName,
        subject: context.subject.displayName,
        track: context.track.displayName,
        subCategory: context.subCategory.displayName
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