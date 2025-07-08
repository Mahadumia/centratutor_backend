// routes/content.js - Enhanced Content Upload Routes with Robust Duplicate Prevention (Updated)
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

// ========== UTILITY FUNCTIONS ==========

/**
 * Enhanced function to check for existing period content with proper MongoDB queries
 */
async function checkExistingPeriodContent(examId, subjectId, trackId, subCategoryId, trackType, periodIdentifier) {
  try {
    const { Content } = require('../models/exam');
    
    let query = {
      examId: examId,
      subjectId: subjectId,
      trackId: trackId,
      subCategoryId: subCategoryId,
      isActive: true
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

    const existingContent = await Content.find(query);
    
    return {
      exists: existingContent.length > 0,
      count: existingContent.length,
      content: existingContent
    };
  } catch (error) {
    console.error('Error checking existing content:', error);
    return { exists: false, count: 0, content: [] };
  }
}

/**
 * Enhanced function to resolve exam context with better error handling
 */
async function resolveExamContext(examName, subjectName, trackName, subCategoryName, expectedTrackType = null) {
  try {
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    console.log(`🔍 Resolving context: ${examName}/${subjectName}/${trackName}/${subCategoryName}`);
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    
    if (!exam || !subject || !subCategory) {
      console.log(`❌ Basic context resolution failed:`, {
        exam: exam?.name || 'Not found',
        subject: subject?.name || 'Not found',
        subCategory: subCategory?.name || 'Not found'
      });
      return { 
        success: false, 
        exam, 
        subject, 
        subCategory, 
        track: null,
        error: 'Basic context entities not found'
      };
    }
    
    // Enhanced track resolution with multiple fallback strategies
    let track = null;
    
    // Strategy 1: Exact name match
    track = await Track.findOne({ 
      examId: exam._id, 
      subCategoryId: subCategory._id, 
      name: trackName, 
      isActive: true 
    });
    
    if (track) {
      console.log(`✅ Found track by exact name: "${track.name}"`);
    } else {
      console.log(`⚠️ Track "${trackName}" not found by name, trying fallback strategies...`);
      
      // Strategy 2: If expectedTrackType provided, find by type
      if (expectedTrackType) {
        track = await Track.findOne({ 
          examId: exam._id, 
          subCategoryId: subCategory._id, 
          trackType: expectedTrackType, 
          isActive: true 
        });
        
        if (track) {
          console.log(`✅ Found track by type fallback: "${track.name}" (type: ${track.trackType})`);
        }
      }
    }
    
    if (!track) {
      // List available tracks for debugging
      const availableTracks = await Track.find({ 
        examId: exam._id, 
        subCategoryId: subCategory._id, 
        isActive: true 
      }).select('name trackType');
      
      console.log(`❌ No track found. Available tracks:`, availableTracks.map(t => `${t.name} (${t.trackType})`));
      
      return { 
        success: false, 
        exam, 
        subject, 
        subCategory, 
        track: null,
        availableTracks: availableTracks.map(t => ({ name: t.name, type: t.trackType })),
        error: 'Track not found'
      };
    }
    
    console.log(`✅ Context resolution successful using track: "${track.name}"`);
    return { success: true, exam, subject, subCategory, track };
    
  } catch (error) {
    console.error('❌ Error in context resolution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced function to validate track type and period
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
 * Enhanced function to create enriched content with period metadata
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
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id,
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `${namePrefix}${item.name}`,
      displayName: `${displayPrefix}${item.displayName || item.name}`,
      description: item.description ? `${displayPrefix.slice(0, -3)}: ${item.description}` : `${displayPrefix.slice(0, -3)} content`,
      orderIndex: (periodNumber * orderMultiplier) + (item.orderIndex || index),
      metadata,
      filePath: item.filePath || '',
      fileType: item.fileType || 'unknown',
      fileSize: item.fileSize || 0,
      isActive: true,
      ...item
    };
  });
}

/**
 * Enhanced function to delete existing content for a period
 */
async function deleteExistingPeriodContent(examId, subjectId, trackId, subCategoryId, trackType, periodIdentifier) {
  try {
    const { Content } = require('../models/exam');
    
    let query = {
      examId: examId,
      subjectId: subjectId,
      trackId: trackId,
      subCategoryId: subCategoryId,
      isActive: true
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
        query = {
          ...query,
          $or: [
            { 'metadata.semesterName': periodIdentifier },
            { 'metadata.semester': parseInt(periodIdentifier) || 1 }
          ]
        };
        break;
      case 'years':
        query['metadata.year'] = parseInt(periodIdentifier);
        break;
    }

    // Soft delete by setting isActive to false
    const result = await Content.updateMany(query, { isActive: false });
    
    console.log(`🗑️ Deleted ${result.modifiedCount} existing content items for ${trackType.slice(0, -1)} ${periodIdentifier}`);
    
    return {
      success: true,
      deletedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Error deleting existing content:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

// ========== ENHANCED UPLOAD ROUTES WITH ROBUST DUPLICATE PREVENTION ==========

/**
 * Enhanced Week Content Upload with Robust Duplicate Prevention
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { content, force = false } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    const week = parseInt(weekNumber);
    
    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, 'weeks');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed - check exam, subject, track, or subcategory names',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || [],
          error: contextResult.error
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    const validation = validateTrackAndPeriod(track, 'weeks', week, weekNumber);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Enhanced duplicate check using proper MongoDB queries
    const existingCheck = await checkExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, 'weeks', week
    );
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({ 
        message: `Content for Week ${week} already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        existingContent: {
          count: existingCheck.count,
          items: existingCheck.content.map(item => ({
            name: item.name,
            displayName: item.displayName,
            createdAt: item.createdAt
          }))
        },
        duplicationHandling: {
          existingContentFound: true,
          previousCount: existingCheck.count,
          forceOverwriteRequired: true
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}`
        },
        canUpload: false
      });
    }

    // If force=true, delete existing content first
    if (existingCheck.exists && force) {
      console.log(`🔄 Force upload requested: Deleting ${existingCheck.count} existing content items for Week ${week}...`);
      
      const deleteResult = await deleteExistingPeriodContent(
        exam._id, subject._id, track._id, subCategory._id, 'weeks', week
      );
      
      if (!deleteResult.success) {
        return res.status(500).json({
          message: 'Failed to delete existing content',
          error: deleteResult.error
        });
      }
    }

    // Create enriched content
    const enrichedContent = createEnrichedContent(content, { exam, subject, track, subCategory }, 'weeks', week, weekNumber);

    console.log(`🚀 Uploading ${enrichedContent.length} content items to Week ${week}...`);
    
    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    console.log(`✅ Upload completed: ${results.results.created.length} created, ${results.results.errors.length} errors`);
    
    const statusCode = force && existingCheck.exists ? 200 : 201;
    const action = force && existingCheck.exists ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        duplicationHandling: {
          existingContentFound: existingCheck.exists,
          previousCount: existingCheck.count,
          forceOverwrite: force && existingCheck.exists,
          action: action
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
    console.error('❌ Error in weeks upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Enhanced Day Content Upload with Robust Duplicate Prevention
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { content, force = false } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    const day = parseInt(dayNumber);
    
    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, 'days');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed - check exam, subject, track, or subcategory names',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || [],
          error: contextResult.error
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    const validation = validateTrackAndPeriod(track, 'days', day, dayNumber);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Enhanced duplicate check
    const existingCheck = await checkExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, 'days', day
    );
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({ 
        message: `Content for Day ${day} already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        existingContent: {
          count: existingCheck.count,
          items: existingCheck.content.map(item => ({
            name: item.name,
            displayName: item.displayName,
            createdAt: item.createdAt
          }))
        },
        duplicationHandling: {
          existingContentFound: true,
          previousCount: existingCheck.count,
          forceOverwriteRequired: true
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}`
        },
        canUpload: false
      });
    }

    // If force=true, delete existing content first
    if (existingCheck.exists && force) {
      console.log(`🔄 Force upload requested: Deleting ${existingCheck.count} existing content items for Day ${day}...`);
      
      const deleteResult = await deleteExistingPeriodContent(
        exam._id, subject._id, track._id, subCategory._id, 'days', day
      );
      
      if (!deleteResult.success) {
        return res.status(500).json({
          message: 'Failed to delete existing content',
          error: deleteResult.error
        });
      }
    }

    // Create enriched content
    const enrichedContent = createEnrichedContent(content, { exam, subject, track, subCategory }, 'days', day, dayNumber);

    console.log(`🚀 Uploading ${enrichedContent.length} content items to Day ${day}...`);
    
    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    console.log(`✅ Upload completed: ${results.results.created.length} created, ${results.results.errors.length} errors`);
    
    const statusCode = force && existingCheck.exists ? 200 : 201;
    const action = force && existingCheck.exists ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to Day ${day}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        duplicationHandling: {
          existingContentFound: existingCheck.exists,
          previousCount: existingCheck.count,
          forceOverwrite: force && existingCheck.exists,
          action: action
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
    console.error('❌ Error in days upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * Enhanced Semester Content Upload with Robust Duplicate Prevention
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
    
    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, 'semester');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed - check exam, subject, track, or subcategory names',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || [],
          error: contextResult.error
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    if (track.duration && numericSemester > track.duration) {
      return res.status(400).json({ 
        message: `Semester ${originalSemesterNumber} exceeds track duration of ${track.duration} semesters` 
      });
    }

    // Enhanced duplicate check
    const existingCheck = await checkExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, 'semester', originalSemesterNumber
    );
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({ 
        message: `Content for Semester "${originalSemesterNumber}" already exists. Use force=true to override or use PUT to update.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        existingContent: {
          count: existingCheck.count,
          items: existingCheck.content.map(item => ({
            name: item.name,
            displayName: item.displayName,
            createdAt: item.createdAt
          }))
        },
        duplicationHandling: {
          existingContentFound: true,
          previousCount: existingCheck.count,
          forceOverwriteRequired: true
        },
        solutions: {
          forceOverride: `POST with { "force": true, "content": [...] }`,
          updateExisting: `PUT /api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}`
        },
        canUpload: false
      });
    }

    // If force=true, delete existing content first
    if (existingCheck.exists && force) {
      console.log(`🔄 Force upload requested: Deleting ${existingCheck.count} existing content items for ${originalSemesterNumber}...`);
      
      const deleteResult = await deleteExistingPeriodContent(
        exam._id, subject._id, track._id, subCategory._id, 'semester', originalSemesterNumber
      );
      
      if (!deleteResult.success) {
        return res.status(500).json({
          message: 'Failed to delete existing content',
          error: deleteResult.error
        });
      }
    }

    // Create enriched content
    const enrichedContent = createEnrichedContent(content, { exam, subject, track, subCategory }, 'semester', numericSemester, originalSemesterNumber);

    console.log(`🚀 Uploading ${enrichedContent.length} content items to ${originalSemesterNumber}...`);
    
    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    console.log(`✅ Upload completed: ${results.results.created.length} created, ${results.results.errors.length} errors`);
    
    const statusCode = force && existingCheck.exists ? 200 : 201;
    const action = force && existingCheck.exists ? 'replaced' : 'uploaded';
    
    if (results.success) {
      res.status(statusCode).json({
        message: `Successfully ${action} ${results.results.created.length} content items to ${originalSemesterNumber}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        duplicationHandling: {
          existingContentFound: existingCheck.exists,
          previousCount: existingCheck.count,
          forceOverwrite: force && existingCheck.exists,
          action: action
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
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    console.error('❌ Error in semesters upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// ========== ENHANCED UPDATE ROUTES FOR ENTIRE PERIODS ==========

/**
 * Generic function to update entire period content with enhanced duplicate handling
 */
async function updateEntirePeriod(req, res, trackType) {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const periodIdentifier = req.params.weekNumber || req.params.dayNumber || req.params.monthNumber || req.params.semesterNumber || req.params.year;
    const { items, replaceAll = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, trackType);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed - check exam, subject, track, or subcategory names',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track "${track.name}" is not a ${trackType.slice(0, -1)} track (type: ${track.trackType})` 
      });
    }

    // Check for existing content using enhanced function
    const existingCheck = await checkExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, trackType, periodIdentifier
    );

    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No content found for ${trackType.slice(0, -1)} ${periodIdentifier}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          period: periodIdentifier,
          trackType: trackType
        }
      });
    }

    const results = { updated: [], errors: [], deleted: [] };

    // If replaceAll=true, delete all existing content and create new ones
    if (replaceAll) {
      try {
        console.log(`🔄 Replace all requested: Deleting ${existingCheck.count} existing content items for ${trackType.slice(0, -1)} ${periodIdentifier}...`);
        
        // Delete all existing content for this period
        const deleteResult = await deleteExistingPeriodContent(
          exam._id, subject._id, track._id, subCategory._id, trackType, periodIdentifier
        );
        
        if (deleteResult.success) {
          results.deleted = Array.from({ length: deleteResult.deletedCount }, (_, i) => `Deleted item ${i + 1}`);
        }

        // Create new content using the enriched content function
        const periodNumber = parseInt(periodIdentifier);
        const enrichedContent = createEnrichedContent(
          items.map(item => ({ ...item, orderIndex: item.orderIndex || 0 })), 
          { exam, subject, track, subCategory }, 
          trackType, 
          periodNumber, 
          periodIdentifier
        );

        console.log(`🚀 Creating ${enrichedContent.length} new content items...`);
        
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
      // Update existing items individually using proper MongoDB queries
      const { Content } = require('../models/exam');
      
      for (const [index, item] of items.entries()) {
        try {
          let contentToUpdate;
          
          if (item.name) {
            // Find by name (with period prefix)
            let fullName = item.name;
            const prefixes = {
              'weeks': `week${parseInt(periodIdentifier)}_`,
              'days': `day${parseInt(periodIdentifier)}_`,
              'months': `month${parseInt(periodIdentifier)}_`,
              'semester': `semester${parseInt(periodIdentifier) || 1}_`,
              'years': `year${parseInt(periodIdentifier)}_`
            };
            
            if (!fullName.startsWith(prefixes[trackType])) {
              fullName = `${prefixes[trackType]}${item.name}`;
            }
            
            contentToUpdate = await Content.findOne({
              examId: exam._id,
              subjectId: subject._id,
              trackId: track._id,
              subCategoryId: subCategory._id,
              name: fullName,
              isActive: true
            });
          } else if (item.id) {
            // Find by ID
            contentToUpdate = await Content.findOne({
              _id: item.id,
              examId: exam._id,
              subjectId: subject._id,
              trackId: track._id,
              subCategoryId: subCategory._id,
              isActive: true
            });
          }

          if (!contentToUpdate) {
            results.errors.push({
              index,
              item: item.name || item.id,
              error: `Content item not found in this ${trackType.slice(0, -1)}`
            });
            continue;
          }

          // Calculate new order index based on track type
          let newOrderIndex = contentToUpdate.orderIndex;
          if (item.orderIndex !== undefined) {
            const periodNumber = parseInt(periodIdentifier);
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
          const updatedContent = await Content.findByIdAndUpdate(
            contentToUpdate._id,
            {
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
            },
            { new: true }
          );

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
            item: item.name || item.id,
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
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        period: periodIdentifier,
        trackType: trackType
      },
      action: action,
      results
    });
  } catch (error) {
    console.error('❌ Error in update entire period:', error);
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

/**
 * Update entire year content
 */
router.put('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
  return updateEntirePeriod(req, res, 'years');
});

// ========== ENHANCED DELETE ROUTES FOR ENTIRE PERIODS ==========

/**
 * Generic function to delete entire period content with enhanced safety
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

    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, trackType);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed - check exam, subject, track, or subcategory names',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track "${track.name}" is not a ${trackType.slice(0, -1)} track (type: ${track.trackType})` 
      });
    }

    // Check for existing content using enhanced function
    const existingCheck = await checkExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, trackType, periodIdentifier
    );
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No content found for ${trackType.slice(0, -1)} ${periodIdentifier}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          period: periodIdentifier,
          trackType: trackType
        }
      });
    }

    console.log(`🗑️ Deleting ${existingCheck.count} content items for ${trackType.slice(0, -1)} ${periodIdentifier}...`);

    // Delete content using enhanced function
    const deleteResult = await deleteExistingPeriodContent(
      exam._id, subject._id, track._id, subCategory._id, trackType, periodIdentifier
    );

    if (!deleteResult.success) {
      return res.status(500).json({
        message: 'Failed to delete content',
        error: deleteResult.error
      });
    }

    res.json({
      message: `Successfully deleted ${deleteResult.deletedCount} content items from ${trackType.slice(0, -1)} ${periodIdentifier}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        period: periodIdentifier,
        trackType: trackType
      },
      deletedCount: deleteResult.deletedCount,
      action: 'deleted'
    });
  } catch (error) {
    console.error('❌ Error in delete entire period:', error);
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

// ========== KEEP ALL EXISTING ROUTES ==========

// Keep your existing GET route for groups
router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'topic' } = req.query;

    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    // Get content for this context using proper MongoDB queries
    const { Content } = require('../models/exam');
    const content = await Content.find({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id,
      isActive: true
    }).populate(['topicId']);

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
    console.error('❌ Error in groups route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Keep other existing utility routes with enhanced context resolution
router.get('/:examName/:subjectName/:trackName/:subCategoryName/periods', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    
    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    const periods = [];
    const trackType = track.trackType;
    const duration = track.duration || 0;

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
        name: track.displayName,
        type: trackType,
        duration: duration
      },
      totalPeriods: periods.length,
      periods,
      batchUploadEndpoint: `/api/content/batch/${examName}/${subjectName}/${trackName}/${subCategoryName}`
    });
  } catch (error) {
    console.error('❌ Error in periods route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, trackType, periodNumber } = req.params;
    
    // Enhanced context resolution
    const contextResult = await resolveExamContext(examName, subjectName, trackName, subCategoryName, trackType);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    const validTypes = ['weeks', 'days', 'months', 'semester', 'years'];
    const trackTypeMap = { weeks: 'week', days: 'day', months: 'month', semester: 'semester', years: 'year' };
    
    if (!validTypes.includes(trackType)) {
      return res.status(400).json({ message: 'Invalid track type. Use: weeks, days, months, semester, or years' });
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

    // Get content for this context using proper MongoDB queries
    const { Content } = require('../models/exam');
    const content = await Content.find({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id,
      isActive: true
    }).populate(['topicId']);

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
    console.error('❌ Error in period content route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;