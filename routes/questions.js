// routes/questions.js - Enhanced Past Questions Management Routes with Duplicate Prevention and Update Routes
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

/**
 * FIXED: Validate questions topics before upload with proper context
 * @route   POST /api/questions/validate-topics/:examName/:subjectName
 * @desc    Validate question topics against approved topics for specific exam-subject
 * @access  Private
 */
router.post('/validate-topics/:examName/:subjectName', async (req, res) => {
  try {
    const { examName, subjectName } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // Resolve exam and subject
    const { Exam, Subject } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    if (!exam) {
      return res.status(404).json({ message: `Exam "${examName}" not found` });
    }

    const subject = await Subject.findOne({ 
      examId: exam._id, 
      name: subjectName, 
      isActive: true 
    });
    if (!subject) {
      return res.status(404).json({ message: `Subject "${subjectName}" not found for exam "${examName}"` });
    }

    // Validate topics against this specific exam-subject combination
    const validationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );

    // Get approved topics list for helpful response
    const approvedTopics = await examModel.getApprovedTopicsForSubject(exam._id, subject._id);
    
    res.json({
      message: `Validated ${questions.length} questions for ${examName} ${subjectName}`,
      context: {
        examName: exam.displayName,
        subjectName: subject.displayName,
        examId: exam._id,
        subjectId: subject._id
      },
      canUpload: validationResults.invalidQuestions.length === 0,
      validation: validationResults,
      approvedTopics: approvedTopics.map(topic => ({
        name: topic.name,
        displayName: topic.displayName,
        description: topic.description
      })),
      recommendations: {
        action: validationResults.invalidQuestions.length === 0 ? 'proceed_upload' : 'fix_topics',
        message: validationResults.invalidQuestions.length === 0 
          ? 'All topics are valid. You can proceed with upload.' 
          : `${validationResults.invalidQuestions.length} questions have invalid topics. Please fix them before upload.`,
        invalidTopicsFound: [...new Set(validationResults.invalidQuestions.map(q => q.topicName))],
        validTopicsUsed: [...new Set(validationResults.validQuestions.map(q => q.topicName))],
        totalApprovedTopics: approvedTopics.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== ENHANCED CONTEXT RESOLUTION HELPER ==========

/**
 * Enhanced context resolution with better error handling and track fallback
 */
async function resolveUploadContext(examName, subjectName, trackName, subCategoryName, trackType = null) {
  try {
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    console.log(`🔍 Resolving context: ${examName}/${subjectName}/${trackName}/${subCategoryName}`);
    
    // Resolve basic entities
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    
    if (!exam || !subject || !subCategory) {
      console.log(`❌ Basic context resolution failed:`, {
        exam: exam?.name || 'Not found',
        subject: subject?.name || 'Not found',
        subCategory: subCategory?.name || 'Not found'
      });
      return { success: false, exam, subject, subCategory, track: null };
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
      
      // Strategy 2: If trackType provided, find by type
      if (trackType) {
        track = await Track.findOne({ 
          examId: exam._id, 
          subCategoryId: subCategory._id, 
          trackType: trackType, 
          isActive: true 
        });
        
        if (track) {
          console.log(`✅ Found track by type fallback: "${track.name}" (type: ${track.trackType})`);
        }
      }
      
      // Strategy 3: For past questions, try to find any years-type track
      if (!track && subCategoryName.toLowerCase() === 'pastquestions') {
        track = await Track.findOne({ 
          examId: exam._id, 
          subCategoryId: subCategory._id, 
          trackType: 'years', 
          isActive: true 
        });
        
        if (track) {
          console.log(`✅ Found track by past questions fallback: "${track.name}" (type: ${track.trackType})`);
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
        availableTracks: availableTracks.map(t => ({ name: t.name, type: t.trackType }))
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
 * NEW: Check if questions already exist for a specific time period
 */
async function checkExistingQuestions(examId, subjectId, trackId, timePeriod, periodValue) {
  try {
    const { Question } = require('../models/exam');
    
    let query = {
      examId,
      subjectId, 
      trackId,
      isActive: true
    };

    // Add time period specific filters
    if (timePeriod === 'year') {
      query.year = periodValue.toString();
    } else {
      query[`metadata.${timePeriod}`] = periodValue;
    }

    const existingQuestions = await Question.find(query);
    
    return {
      exists: existingQuestions.length > 0,
      count: existingQuestions.length,
      questions: existingQuestions
    };
  } catch (error) {
    console.error('Error checking existing questions:', error);
    return { exists: false, count: 0, questions: [] };
  }
}

/**
 * Enhanced question enrichment with full context
 */
function enrichQuestionsWithContext(questions, contextData, timePeriodData, topicValidationResults) {
  const { exam, subject, track, subCategory } = contextData;
  const { timePeriod, periodValue, periodLabel } = timePeriodData;
  
  return questions.map((question, index) => {
    const validationData = topicValidationResults.validQuestions[index];
    
    return {
      // Original structure
      examName: exam.name,
      subject: subject.name,
      year: question.year || periodValue,
      topic: question.topic,
      question: question.question,
      question_diagram: question.question_diagram || 'assets/images/noDiagram.png',
      correct_answer: question.correct_answer,
      incorrect_answers: question.incorrect_answers,
      explanation: question.explanation || '',
      
      // Enhanced metadata
      metadata: {
        ...question.metadata,
        [timePeriod]: periodValue,
        timePeriod: timePeriod,
        [`${timePeriod}Label`]: periodLabel,
        orderIndex: index,
        topicValidated: true,
        topicId: validationData.topicId,
        trackUsed: track.name,
        trackType: track.trackType,
        uploadContext: {
          trackName: track.name,
          trackType: track.trackType,
          [timePeriod]: periodValue
        }
      },
      
      // Pre-validation data for the model
      _preValidated: {
        topicId: validationData.topicId,
        topicName: validationData.topicName,
        contextResolved: {
          exam: { id: exam._id, name: exam.name },
          subject: { id: subject._id, name: subject.name },
          track: { id: track._id, name: track.name, type: track.trackType },
          subCategory: { id: subCategory._id, name: subCategory.name }
        }
      }
    };
  });
}

// ========== TIME-PERIOD SPECIFIC QUESTION UPLOAD ROUTES (Enhanced with Duplicate Prevention) ==========

/**
 * ENHANCED: Upload questions to a specific year with duplicate prevention
 * @route   POST /api/questions/years/:examName/:subjectName/:trackName/:subCategoryName/:year
 * @desc    Upload questions for a specific year with mandatory topic validation and duplicate prevention
 * @access  Private
 */
router.post('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, year } = req.params;
    const { questions, force = false } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // Validate year
    const questionYear = parseInt(year);
    if (isNaN(questionYear) || questionYear < 1900 || questionYear > 2100) {
      return res.status(400).json({ message: 'Valid year (1900-2100) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'years');
    
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

    // NEW: Check for existing questions for this year
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'year', questionYear);
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({
        message: `Questions already exist for Year ${year}`,
        existing: {
          count: existingCheck.count,
          year: year
        },
        options: {
          forceUpload: `Add "force": true to request body to overwrite existing questions`,
          updateEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year}`,
          viewEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}?groupBy=year`
        },
        canUpload: false
      });
    }

    // ENHANCED: Validate all topics before processing
    console.log(`🔍 Validating topics for ${questions.length} questions for year ${year}...`);
    
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for year ${year}: ${topicValidationResults.invalidQuestions.length} questions have invalid topics`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          year: year
        },
        validation: topicValidationResults,
        canUpload: false
      });
    }

    // If force=true and questions exist, delete existing ones first
    if (force && existingCheck.exists) {
      console.log(`🗑️ Force upload requested: Deleting ${existingCheck.count} existing questions for year ${year}...`);
      const { Question } = require('../models/exam');
      await Question.updateMany(
        {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          year: questionYear.toString()
        },
        { isActive: false }
      );
    }

    // Enhanced question enrichment
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'uploadYear', periodValue: year, periodLabel: `Year ${year}` },
      topicValidationResults
    );

    console.log(`🚀 Uploading ${enrichedQuestions.length} validated questions to database using track "${track.name}"...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    console.log(`✅ Upload completed: ${results.created.length} created, ${results.errors.length} errors`);
    
    res.status(201).json({
      message: `Successfully uploaded ${results.created.length} questions for Year ${year} with validated topics`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        trackName: track.name,
        trackType: track.trackType,
        subCategory: subCategory.displayName,
        year: year
      },
      duplicationHandling: {
        existingQuestionsFound: existingCheck.exists,
        previousCount: existingCheck.count,
        forceOverwrite: force && existingCheck.exists
      },
      validation: topicValidationResults,
      results,
      topicsSummary: {
        uniqueTopicsUsed: [...new Set(questions.map(q => q.topic))],
        allTopicsValid: true
      }
    });
  } catch (error) {
    console.error('❌ Error in years upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific week with duplicate prevention
 * @route   POST /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Upload questions for a specific week with mandatory topic validation and duplicate prevention
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { questions, force = false } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      return res.status(400).json({ message: 'Valid week number (1 or greater) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'weeks');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || []
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
      });
    }

    // NEW: Check for existing questions for this week
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'week', week);
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({
        message: `Questions already exist for Week ${week}`,
        existing: {
          count: existingCheck.count,
          week: week
        },
        options: {
          forceUpload: `Add "force": true to request body to overwrite existing questions`,
          updateEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}`,
          viewEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}?groupBy=week`
        },
        canUpload: false
      });
    }

    // ENHANCED: Validate all topics
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week
        },
        validation: topicValidationResults,
        canUpload: false
      });
    }

    // If force=true and questions exist, delete existing ones first
    if (force && existingCheck.exists) {
      console.log(`🗑️ Force upload requested: Deleting ${existingCheck.count} existing questions for week ${week}...`);
      const { Question } = require('../models/exam');
      await Question.updateMany(
        {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          'metadata.week': week
        },
        { isActive: false }
      );
    }

    // Enhanced question enrichment
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'week', periodValue: week, periodLabel: `Week ${week}` },
      topicValidationResults
    );

    console.log(`🚀 Uploading ${enrichedQuestions.length} validated questions for Week ${week}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.status(201).json({
      message: `Successfully uploaded ${results.created.length} questions for Week ${week} with validated topics`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      duplicationHandling: {
        existingQuestionsFound: existingCheck.exists,
        previousCount: existingCheck.count,
        forceOverwrite: force && existingCheck.exists
      },
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in weeks upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific day with duplicate prevention
 * @route   POST /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Upload questions for a specific day with mandatory topic validation and duplicate prevention
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { questions, force = false } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const day = parseInt(dayNumber);
    if (isNaN(day) || day < 1) {
      return res.status(400).json({ message: 'Valid day number (1 or greater) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'days');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || []
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
      });
    }

    // NEW: Check for existing questions for this day
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'day', day);
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({
        message: `Questions already exist for Day ${day}`,
        existing: {
          count: existingCheck.count,
          day: day
        },
        options: {
          forceUpload: `Add "force": true to request body to overwrite existing questions`,
          updateEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}`,
          viewEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}?groupBy=day`
        },
        canUpload: false
      });
    }

    // ENHANCED: Topic validation
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for Day ${day}`,
        validation: topicValidationResults,
        canUpload: false
      });
    }

    // If force=true and questions exist, delete existing ones first
    if (force && existingCheck.exists) {
      console.log(`🗑️ Force upload requested: Deleting ${existingCheck.count} existing questions for day ${day}...`);
      const { Question } = require('../models/exam');
      await Question.updateMany(
        {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          'metadata.day': day
        },
        { isActive: false }
      );
    }

    // Enhanced question enrichment
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'day', periodValue: day, periodLabel: `Day ${day}` },
      topicValidationResults
    );

    console.log(`🚀 Uploading ${enrichedQuestions.length} validated questions for Day ${day}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.status(201).json({
      message: `Successfully uploaded ${results.created.length} questions for Day ${day} with validated topics`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      duplicationHandling: {
        existingQuestionsFound: existingCheck.exists,
        previousCount: existingCheck.count,
        forceOverwrite: force && existingCheck.exists
      },
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in days upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific semester with duplicate prevention
 * @route   POST /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Upload questions for a specific semester with topic-based organization, validation and duplicate prevention
 * @access  Private
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { questions, force = false } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const originalSemesterNumber = semesterNumber;
    const numericSemester = parseInt(semesterNumber) || 1;

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'semester');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || []
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    // NEW: Check for existing questions for this semester
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'semester', numericSemester);
    
    if (existingCheck.exists && !force) {
      return res.status(409).json({
        message: `Questions already exist for ${originalSemesterNumber}`,
        existing: {
          count: existingCheck.count,
          semester: originalSemesterNumber
        },
        options: {
          forceUpload: `Add "force": true to request body to overwrite existing questions`,
          updateEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}`,
          viewEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}?groupBy=semester`
        },
        canUpload: false
      });
    }

    // ENHANCED: Topic validation for semester-based questions
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for ${originalSemesterNumber}`,
        validation: topicValidationResults,
        canUpload: false
      });
    }

    // If force=true and questions exist, delete existing ones first
    if (force && existingCheck.exists) {
      console.log(`🗑️ Force upload requested: Deleting ${existingCheck.count} existing questions for ${originalSemesterNumber}...`);
      const { Question } = require('../models/exam');
      await Question.updateMany(
        {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          'metadata.semester': numericSemester
        },
        { isActive: false }
      );
    }

    // Group questions by topic for semester-based access
    const questionsByTopic = {};
    questions.forEach((question, index) => {
      const topicKey = question.topic || 'general';
      if (!questionsByTopic[topicKey]) {
        questionsByTopic[topicKey] = [];
      }
      questionsByTopic[topicKey].push({
        ...question,
        topicOrderIndex: questionsByTopic[topicKey].length,
        validationData: topicValidationResults.validQuestions[index]
      });
    });

    // Enhanced question enrichment
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'semester', periodValue: numericSemester, periodLabel: originalSemesterNumber },
      topicValidationResults
    );

    // Add additional semester-specific metadata
    enrichedQuestions.forEach((question, index) => {
      question.metadata.semesterName = originalSemesterNumber;
      question.metadata.topicAccess = true;
      question.metadata.orderIndex = (numericSemester * 100000) + index;
    });

    console.log(`🚀 Uploading ${enrichedQuestions.length} validated questions for ${originalSemesterNumber}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.status(201).json({
      message: `Successfully uploaded ${results.created.length} questions for ${originalSemesterNumber} with validated topics`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      duplicationHandling: {
        existingQuestionsFound: existingCheck.exists,
        previousCount: existingCheck.count,
        forceOverwrite: force && existingCheck.exists
      },
      topicBreakdown: Object.keys(questionsByTopic).map(topic => ({
        topic,
        questionCount: questionsByTopic[topic].length,
        topicValidated: true
      })),
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in semesters upload route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== UPDATE ROUTES FOR TIME-PERIOD SPECIFIC QUESTIONS ==========

/**
 * NEW: Update questions for a specific year
 * @route   PUT /api/questions/years/:examName/:subjectName/:trackName/:subCategoryName/:year
 * @desc    Update/replace questions for a specific year
 * @access  Private
 */
router.put('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, year } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // Validate year
    const questionYear = parseInt(year);
    if (isNaN(questionYear) || questionYear < 1900 || questionYear > 2100) {
      return res.status(400).json({ message: 'Valid year (1900-2100) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'years');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    // Check if questions exist for this year
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'year', questionYear);
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for Year ${year} to update`,
        suggestion: `Use POST /api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year} to create new questions`
      });
    }

    // Validate topics
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for year ${year}`,
        validation: topicValidationResults,
        canUpdate: false
      });
    }

    // Delete existing questions for this year
    console.log(`🔄 Updating questions: Deleting ${existingCheck.count} existing questions for year ${year}...`);
    const { Question } = require('../models/exam');
    await Question.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        year: questionYear.toString()
      },
      { isActive: false }
    );

    // Create new questions
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'uploadYear', periodValue: year, periodLabel: `Year ${year}` },
      topicValidationResults
    );

    console.log(`🚀 Creating ${enrichedQuestions.length} updated questions for Year ${year}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.json({
      message: `Successfully updated ${results.created.length} questions for Year ${year}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        year: year
      },
      updateInfo: {
        previousCount: existingCheck.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in years update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Update questions for a specific week
 * @route   PUT /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Update/replace questions for a specific week
 * @access  Private
 */
router.put('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      return res.status(400).json({ message: 'Valid week number (1 or greater) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'weeks');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
      });
    }

    // Check if questions exist for this week
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'week', week);
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for Week ${week} to update`,
        suggestion: `Use POST /api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week} to create new questions`
      });
    }

    // Validate topics
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for Week ${week}`,
        validation: topicValidationResults,
        canUpdate: false
      });
    }

    // Delete existing questions for this week
    console.log(`🔄 Updating questions: Deleting ${existingCheck.count} existing questions for week ${week}...`);
    const { Question } = require('../models/exam');
    await Question.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        'metadata.week': week
      },
      { isActive: false }
    );

    // Create new questions
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'week', periodValue: week, periodLabel: `Week ${week}` },
      topicValidationResults
    );

    console.log(`🚀 Creating ${enrichedQuestions.length} updated questions for Week ${week}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.json({
      message: `Successfully updated ${results.created.length} questions for Week ${week}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      updateInfo: {
        previousCount: existingCheck.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in weeks update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Update questions for a specific day
 * @route   PUT /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Update/replace questions for a specific day
 * @access  Private
 */
router.put('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const day = parseInt(dayNumber);
    if (isNaN(day) || day < 1) {
      return res.status(400).json({ message: 'Valid day number (1 or greater) is required' });
    }

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'days');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
      });
    }

    // Check if questions exist for this day
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'day', day);
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for Day ${day} to update`,
        suggestion: `Use POST /api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day} to create new questions`
      });
    }

    // Validate topics
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for Day ${day}`,
        validation: topicValidationResults,
        canUpdate: false
      });
    }

    // Delete existing questions for this day
    console.log(`🔄 Updating questions: Deleting ${existingCheck.count} existing questions for day ${day}...`);
    const { Question } = require('../models/exam');
    await Question.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        'metadata.day': day
      },
      { isActive: false }
    );

    // Create new questions
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'day', periodValue: day, periodLabel: `Day ${day}` },
      topicValidationResults
    );

    console.log(`🚀 Creating ${enrichedQuestions.length} updated questions for Day ${day}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.json({
      message: `Successfully updated ${results.created.length} questions for Day ${day}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      updateInfo: {
        previousCount: existingCheck.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in days update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Update questions for a specific semester
 * @route   PUT /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Update/replace questions for a specific semester
 * @access  Private
 */
router.put('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const originalSemesterNumber = semesterNumber;
    const numericSemester = parseInt(semesterNumber) || 1;

    // Enhanced context resolution
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'semester');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context resolution failed',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    // Check if questions exist for this semester
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'semester', numericSemester);
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for ${originalSemesterNumber} to update`,
        suggestion: `Use POST /api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber} to create new questions`
      });
    }

    // Validate topics
    const topicValidationResults = await validateQuestionsTopicsForContext(
      questions, exam._id, subject._id
    );
    
    if (topicValidationResults.invalidQuestions.length > 0) {
      return res.status(400).json({
        message: `Topic validation failed for ${originalSemesterNumber}`,
        validation: topicValidationResults,
        canUpdate: false
      });
    }

    // Delete existing questions for this semester
    console.log(`🔄 Updating questions: Deleting ${existingCheck.count} existing questions for ${originalSemesterNumber}...`);
    const { Question } = require('../models/exam');
    await Question.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        'metadata.semester': numericSemester
      },
      { isActive: false }
    );

    // Group questions by topic for semester-based access
    const questionsByTopic = {};
    questions.forEach((question, index) => {
      const topicKey = question.topic || 'general';
      if (!questionsByTopic[topicKey]) {
        questionsByTopic[topicKey] = [];
      }
      questionsByTopic[topicKey].push({
        ...question,
        topicOrderIndex: questionsByTopic[topicKey].length,
        validationData: topicValidationResults.validQuestions[index]
      });
    });

    // Create new questions
    const enrichedQuestions = enrichQuestionsWithContext(
      questions,
      { exam, subject, track, subCategory },
      { timePeriod: 'semester', periodValue: numericSemester, periodLabel: originalSemesterNumber },
      topicValidationResults
    );

    // Add additional semester-specific metadata
    enrichedQuestions.forEach((question, index) => {
      question.metadata.semesterName = originalSemesterNumber;
      question.metadata.topicAccess = true;
      question.metadata.orderIndex = (numericSemester * 100000) + index;
    });

    console.log(`🚀 Creating ${enrichedQuestions.length} updated questions for ${originalSemesterNumber}...`);
    
    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.json({
      message: `Successfully updated ${results.created.length} questions for ${originalSemesterNumber}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      updateInfo: {
        previousCount: existingCheck.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      topicBreakdown: Object.keys(questionsByTopic).map(topic => ({
        topic,
        questionCount: questionsByTopic[topic].length,
        topicValidated: true
      })),
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    console.error('❌ Error in semesters update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== HELPER FUNCTIONS ==========

/**
 * Validate question topics for specific exam-subject context
 */
async function validateQuestionsTopicsForContext(questions, examId, subjectId) {
  try {
    const validationResults = {
      validQuestions: [],
      invalidQuestions: [],
      summary: {
        total: questions.length,
        valid: 0,
        invalid: 0,
        uniqueTopics: new Set(),
        invalidTopics: new Set()
      }
    };

    // Get approved topics for this exam-subject
    const approvedTopics = await examModel.getApprovedTopicsForSubject(examId, subjectId);
    const approvedTopicNames = new Set(approvedTopics.map(topic => topic.name.trim().toLowerCase()));

    // Validate each question's topic
    for (const [index, question] of questions.entries()) {
      const topicName = question.topic?.trim();
      
      if (!topicName) {
        validationResults.invalidQuestions.push({
          index,
          topicName: null,
          error: 'Topic is required for all questions',
          question: question.question?.substring(0, 50) + '...'
        });
        continue;
      }

      const normalizedTopicName = topicName.toLowerCase();
      validationResults.summary.uniqueTopics.add(topicName);

      if (approvedTopicNames.has(normalizedTopicName)) {
        // Find the actual topic object
        const approvedTopic = approvedTopics.find(topic => 
          topic.name.trim().toLowerCase() === normalizedTopicName
        );

        validationResults.validQuestions.push({
          index,
          topicName: topicName,
          topicId: approvedTopic._id,
          question: question.question?.substring(0, 50) + '...'
        });
      } else {
        validationResults.invalidQuestions.push({
          index,
          topicName: topicName,
          error: `Topic "${topicName}" is not in the approved list for this exam-subject`,
          question: question.question?.substring(0, 50) + '...',
          availableTopics: approvedTopics.map(t => t.displayName).slice(0, 5)
        });
        validationResults.summary.invalidTopics.add(topicName);
      }
    }

    // Update summary
    validationResults.summary.valid = validationResults.validQuestions.length;
    validationResults.summary.invalid = validationResults.invalidQuestions.length;
    validationResults.summary.uniqueTopics = Array.from(validationResults.summary.uniqueTopics);
    validationResults.summary.invalidTopics = Array.from(validationResults.summary.invalidTopics);

    return validationResults;
  } catch (error) {
    console.error('Error validating questions topics for context:', error);
    throw error;
  }
}

// ========== TIME-PERIOD SPECIFIC QUESTION RETRIEVAL ROUTES (Updated) ==========

/**
 * NEW: Get questions grouped by time periods
 * @route   GET /api/questions/groups/:examName/:subjectName/:trackName/:subCategoryName
 * @desc    Get questions grouped by time periods (similar to content groups)
 * @access  Public
 */
router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'year' } = req.query;

    // Resolve context using the enhanced resolver
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ message: 'Context not found' });
    }

    const { exam, subject, track, subCategory } = contextResult;

    // Get ALL questions for this context (removed difficulty and limit constraints)
    const questions = await examModel.getQuestionsByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id
    });

    let groupedQuestions = {};

    if (groupBy === 'year') {
      // Group by years (DEFAULT for past questions)
      questions.forEach(question => {
        const yearKey = question.year || 'unknown';
        
        if (!groupedQuestions[yearKey]) {
          groupedQuestions[yearKey] = {
            groupKey: yearKey,
            groupName: `Year ${yearKey}`,
            groupType: 'year',
            items: []
          };
        }
        groupedQuestions[yearKey].items.push(question);
      });

    } else if (groupBy === 'topic') {
      // Group by topics
      questions.forEach(question => {
        const topicKey = question.topicId?.name || 'general';
        const topicName = question.topicId?.displayName || 'General';
        
        if (!groupedQuestions[topicKey]) {
          groupedQuestions[topicKey] = {
            groupKey: topicKey,
            groupName: topicName,
            groupType: 'topic',
            items: []
          };
        }
        groupedQuestions[topicKey].items.push(question);
      });

    } else if (groupBy === 'week' && track.trackType === 'weeks') {
      // Group by weeks
      questions.forEach(question => {
        const week = question.metadata?.week || 1;
        const weekKey = `week_${week}`;
        
        if (!groupedQuestions[weekKey]) {
          groupedQuestions[weekKey] = {
            groupKey: weekKey,
            groupName: `Week ${week}`,
            groupType: 'week',
            items: []
          };
        }
        groupedQuestions[weekKey].items.push(question);
      });

    } else if (groupBy === 'day' && track.trackType === 'days') {
      // Group by days
      questions.forEach(question => {
        const day = question.metadata?.day || 1;
        const dayKey = `day_${day}`;
        
        if (!groupedQuestions[dayKey]) {
          groupedQuestions[dayKey] = {
            groupKey: dayKey,
            groupName: `Day ${day}`,
            groupType: 'day',
            items: []
          };
        }
        groupedQuestions[dayKey].items.push(question);
      });

    } else if (groupBy === 'semester' && track.trackType === 'semester') {
      // Group by semester with topic breakdown
      questions.forEach(question => {
        const semesterName = question.metadata?.semesterName || `Semester ${question.metadata?.semester || 1}`;
        const semesterKey = semesterName.toLowerCase().replace(/\s+/g, '_');
        
        if (!groupedQuestions[semesterKey]) {
          groupedQuestions[semesterKey] = {
            groupKey: semesterKey,
            groupName: semesterName,
            groupType: 'semester',
            items: [],
            topicBreakdown: {}
          };
        }
        
        // Also organize by topics within semester
        const topicName = question.topicId?.displayName || 'general';
        if (!groupedQuestions[semesterKey].topicBreakdown[topicName]) {
          groupedQuestions[semesterKey].topicBreakdown[topicName] = [];
        }
        groupedQuestions[semesterKey].topicBreakdown[topicName].push(question);
        groupedQuestions[semesterKey].items.push(question);
      });
    }

    // Convert to array and sort
    const groups = Object.values(groupedQuestions).sort((a, b) => {
      if (groupBy === 'year') {
        return parseInt(b.groupKey) - parseInt(a.groupKey); // Newest first
      } else if (groupBy === 'week') {
        const aWeek = parseInt(a.groupKey.split('_')[1]) || 0;
        const bWeek = parseInt(b.groupKey.split('_')[1]) || 0;
        return aWeek - bWeek;
      } else if (groupBy === 'day') {
        const aDay = parseInt(a.groupKey.split('_')[1]) || 0;
        const bDay = parseInt(b.groupKey.split('_')[1]) || 0;
        return aDay - bDay;
      } else if (groupBy === 'semester') {
        return a.groupName.localeCompare(b.groupName);
      }
      return a.groupName.localeCompare(b.groupName);
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      groupBy,
      totalQuestions: questions.length,
      totalGroups: groups.length,
      groups
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Get available time periods for question uploads
 * @route   GET /api/questions/:examName/:subjectName/:trackName/:subCategoryName/periods
 * @desc    Get available time periods for question uploads
 * @access  Public
 */
router.get('/:examName/:subjectName/:trackName/:subCategoryName/periods', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    
    // Resolve context using the enhanced resolver
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: {
          exam: contextResult.exam?.name || 'Not found',
          subject: contextResult.subject?.name || 'Not found', 
          subCategory: contextResult.subCategory?.name || 'Not found',
          track: 'Not found',
          requestedTrackName: trackName,
          availableTracks: contextResult.availableTracks || []
        }
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    // Get approved topics for this exam-subject for validation reference
    const approvedTopics = await examModel.getApprovedTopicsForSubject(exam._id, subject._id);

    const periods = [];
    const trackType = track.trackType;
    const duration = track.duration || 0;

    if (trackType === 'weeks') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Week ${i}`,
          type: 'week',
          uploadEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          uploadEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'semester') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Semester ${i}`,
          type: 'semester',
          uploadEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          accessMethod: 'topic-based'
        });
      }
    } else {
      // Default: year-based (most common for past questions)
      const currentYear = new Date().getFullYear();
      for (let i = currentYear; i >= currentYear - 20; i--) {
        periods.push({
          number: i,
          name: `Year ${i}`,
          type: 'year',
          uploadEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    }

    res.json({
      track: {
        name: track.displayName,
        type: trackType,
        duration: duration
      },
      approvedTopics: approvedTopics.map(topic => ({
        id: topic._id,
        name: topic.name,
        displayName: topic.displayName
      })),
      totalPeriods: periods.length,
      periods,
      groupingEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}`,
      topicValidationEndpoint: `/api/questions/validate-topics/${examName}/${subjectName}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * UPDATE: Question update with topic validation
 * @route   PUT /api/questions/:questionId
 * @desc    Update a question with topic validation
 * @access  Private
 */
router.put('/:questionId', async (req, res) => {
  try {
    const updates = req.body;
    
    // If topic is being updated, validate it
    if (updates.topicName && updates.examId && updates.subjectId) {
      const topicValidation = await examModel.validateTopicForContent(
        updates.examId, 
        updates.subjectId, 
        updates.topicName
      );
      
      if (!topicValidation.isValid) {
        return res.status(400).json({
          message: 'Topic validation failed',
          error: topicValidation.message
        });
      }
      
      // Replace topicName with topicId
      updates.topicId = topicValidation.topicId;
      delete updates.topicName;
    }
    
    const { Question } = require('../models/exam');
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.questionId,
      updates,
      { new: true }
    ).populate(['examId', 'subjectId', 'trackId', 'topicId']);
    
    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(updatedQuestion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



/**
 * NEW: Delete questions for a specific time period
 * @route   DELETE /api/questions/:timePeriod/:examName/:subjectName/:trackName/:subCategoryName/:periodValue
 * @desc    Delete all questions for a specific time period
 * @access  Private
 */
router.delete('/:timePeriod/:examName/:subjectName/:trackName/:subCategoryName/:periodValue', async (req, res) => {
  try {
    const { timePeriod, examName, subjectName, trackName, subCategoryName, periodValue } = req.params;
    
    // Validate time period
    const validTimePeriods = ['year', 'week', 'day', 'semester'];
    if (!validTimePeriods.includes(timePeriod)) {
      return res.status(400).json({ 
        message: `Invalid time period. Must be one of: ${validTimePeriods.join(', ')}` 
      });
    }

    // Resolve context
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    const numericPeriodValue = parseInt(periodValue);
    if (isNaN(numericPeriodValue) || numericPeriodValue < 1) {
      return res.status(400).json({ 
        message: 'Period value must be a positive number' 
      });
    }

    // Check if questions exist
    const existingCheck = await checkExistingQuestions(
      exam._id, 
      subject._id, 
      track._id, 
      timePeriod, 
      timePeriod === 'year' ? periodValue : numericPeriodValue
    );
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for ${timePeriod} ${periodValue} to delete`
      });
    }

    // Delete questions by setting isActive to false
    const { Question } = require('../models/exam');
    let query = {
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id
    };

    if (timePeriod === 'year') {
      query.year = periodValue.toString();
    } else {
      query[`metadata.${timePeriod}`] = numericPeriodValue;
    }

    const result = await Question.updateMany(query, { isActive: false });
    
    res.json({
      message: `Successfully deleted ${result.modifiedCount} questions for ${timePeriod} ${periodValue}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      deleted: {
        timePeriod,
        periodValue: numericPeriodValue,
        count: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;