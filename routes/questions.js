// routes/questions.js - Enhanced Past Questions Management Routes with Topic Assignment System
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

// ========== YEARS ROUTE (UNCHANGED - Still uploads actual questions) ==========

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

// ========== NEW TOPIC ASSIGNMENT ROUTES FOR WEEKS/DAYS/SEMESTERS ==========

/**
 * Assign topics to a specific week
 * @route   POST /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics
 * @desc    Assign ordered topics to a specific week
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { topics, force = false } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check for existing topic assignments
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'week', week
    );
    
    if (existingAssignments.exists && !force) {
      return res.status(409).json({
        message: `Topic assignments already exist for Week ${week}`,
        existing: {
          count: existingAssignments.count,
          week: week
        },
        options: {
          forceAssignment: `Add "force": true to request body to overwrite existing assignments`,
          viewEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics`
        },
        canAssign: false
      });
    }

    console.log(`🔍 Creating topic assignments for Week ${week} with ${topics.length} topics...`);
    
    // Create topic assignments with validation
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'week',
      week,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment failed for Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week
        },
        results,
        canAssign: false
      });
    }

    console.log(`✅ Topic assignment completed: ${results.created.length} topics assigned to Week ${week}`);
    
    res.status(201).json({
      message: `Successfully assigned ${results.created.length} topics to Week ${week}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      assignmentHandling: {
        existingAssignmentsFound: existingAssignments.exists,
        previousCount: existingAssignments.count,
        forceOverwrite: force && existingAssignments.exists
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName),
      questionsAccessEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics/{topicName}/questions`
    });
  } catch (error) {
    console.error('❌ Error in weeks topic assignment route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get topics assigned to a specific week
 * @route   GET /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics
 * @desc    Get ordered topics assigned to a specific week
 * @access  Public
 */
router.get('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    
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

    // Get topic assignments for this week
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'week', week
    );
    
    if (topicAssignments.length === 0) {
      return res.status(404).json({
        message: `No topic assignments found for Week ${week}`,
        suggestion: `Use POST /api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics to assign topics`
      });
    }

    // Build topic list with question access endpoints
    const topicsWithAccess = topicAssignments.map(assignment => ({
      topicId: assignment.topicId._id,
      topicName: assignment.topicId.name,
      displayName: assignment.topicId.displayName,
      description: assignment.topicId.description,
      orderIndex: assignment.orderIndex,
      questionsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics/${assignment.topicId.name}/questions`
    }));

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      totalTopics: topicsWithAccess.length,
      topics: topicsWithAccess,
      navigation: {
        manageEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics`,
        allWeeksEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/periods`
      }
    });
  } catch (error) {
    console.error('❌ Error in get week topics route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get questions for a specific topic within a week
 * @route   GET /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics/:topicName/questions
 * @desc    Get all questions for a specific topic across all years (for this week's study)
 * @access  Public
 */
router.get('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics/:topicName/questions', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber, topicName } = req.params;
    
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

    // Validate topic exists and is assigned to this week
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'week', week
    );
    
    const assignedTopic = topicAssignments.find(assignment => 
      assignment.topicId.name.toLowerCase() === topicName.toLowerCase()
    );
    
    if (!assignedTopic) {
      return res.status(404).json({
        message: `Topic "${topicName}" is not assigned to Week ${week}`,
        availableTopics: topicAssignments.map(a => a.topicId.name),
        suggestion: `Check assigned topics at /api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics`
      });
    }

    // Get questions for this topic across ALL years
    const questionsResult = await examModel.getQuestionsForTopicAcrossYears(
      exam._id, subject._id, assignedTopic.topicId._id
    );
    
    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week,
        topic: assignedTopic.topicId.displayName
      },
      topicInfo: {
        topicId: assignedTopic.topicId._id,
        topicName: assignedTopic.topicId.name,
        displayName: assignedTopic.topicId.displayName,
        description: assignedTopic.topicId.description,
        orderIndex: assignedTopic.orderIndex
      },
      questionsData: questionsResult,
      studyInfo: {
        source: 'Questions aggregated from all available years for comprehensive topic coverage',
        ordering: 'Newest year first, randomized within each year',
        coverage: 'Complete topic mastery across historical exam questions'
      }
    });
  } catch (error) {
    console.error('❌ Error in get week topic questions route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Assign topics to a specific day
 * @route   POST /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics
 * @desc    Assign ordered topics to a specific day
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { topics, force = false } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check for existing topic assignments
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'day', day
    );
    
    if (existingAssignments.exists && !force) {
      return res.status(409).json({
        message: `Topic assignments already exist for Day ${day}`,
        existing: {
          count: existingAssignments.count,
          day: day
        },
        options: {
          forceAssignment: `Add "force": true to request body to overwrite existing assignments`,
          viewEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics`
        },
        canAssign: false
      });
    }

    console.log(`🔍 Creating topic assignments for Day ${day} with ${topics.length} topics...`);
    
    // Create topic assignments with validation
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'day',
      day,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment failed for Day ${day}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day
        },
        results,
        canAssign: false
      });
    }

    console.log(`✅ Topic assignment completed: ${results.created.length} topics assigned to Day ${day}`);
    
    res.status(201).json({
      message: `Successfully assigned ${results.created.length} topics to Day ${day}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      assignmentHandling: {
        existingAssignmentsFound: existingAssignments.exists,
        previousCount: existingAssignments.count,
        forceOverwrite: force && existingAssignments.exists
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName),
      questionsAccessEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics/{topicName}/questions`
    });
  } catch (error) {
    console.error('❌ Error in days topic assignment route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get topics assigned to a specific day
 * @route   GET /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics
 * @desc    Get ordered topics assigned to a specific day
 * @access  Public
 */
router.get('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    
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

    // Get topic assignments for this day
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'day', day
    );
    
    if (topicAssignments.length === 0) {
      return res.status(404).json({
        message: `No topic assignments found for Day ${day}`,
        suggestion: `Use POST /api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics to assign topics`
      });
    }

    // Build topic list with question access endpoints
    const topicsWithAccess = topicAssignments.map(assignment => ({
      topicId: assignment.topicId._id,
      topicName: assignment.topicId.name,
      displayName: assignment.topicId.displayName,
      description: assignment.topicId.description,
      orderIndex: assignment.orderIndex,
      questionsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics/${assignment.topicId.name}/questions`
    }));

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      totalTopics: topicsWithAccess.length,
      topics: topicsWithAccess,
      navigation: {
        manageEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics`,
        allDaysEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/periods`
      }
    });
  } catch (error) {
    console.error('❌ Error in get day topics route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get questions for a specific topic within a day
 * @route   GET /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics/:topicName/questions
 * @desc    Get all questions for a specific topic across all years (for this day's study)
 * @access  Public
 */
router.get('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics/:topicName/questions', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber, topicName } = req.params;
    
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

    // Validate topic exists and is assigned to this day
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'day', day
    );
    
    const assignedTopic = topicAssignments.find(assignment => 
      assignment.topicId.name.toLowerCase() === topicName.toLowerCase()
    );
    
    if (!assignedTopic) {
      return res.status(404).json({
        message: `Topic "${topicName}" is not assigned to Day ${day}`,
        availableTopics: topicAssignments.map(a => a.topicId.name),
        suggestion: `Check assigned topics at /api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics`
      });
    }

    // Get questions for this topic across ALL years
    const questionsResult = await examModel.getQuestionsForTopicAcrossYears(
      exam._id, subject._id, assignedTopic.topicId._id
    );
    
    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day,
        topic: assignedTopic.topicId.displayName
      },
      topicInfo: {
        topicId: assignedTopic.topicId._id,
        topicName: assignedTopic.topicId.name,
        displayName: assignedTopic.topicId.displayName,
        description: assignedTopic.topicId.description,
        orderIndex: assignedTopic.orderIndex
      },
      questionsData: questionsResult,
      studyInfo: {
        source: 'Questions aggregated from all available years for comprehensive topic coverage',
        ordering: 'Newest year first, randomized within each year',
        coverage: 'Complete topic mastery across historical exam questions'
      }
    });
  } catch (error) {
    console.error('❌ Error in get day topic questions route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Assign topics to a specific semester
 * @route   POST /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics
 * @desc    Assign ordered topics to a specific semester
 * @access  Private
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { topics, force = false } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check for existing topic assignments
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'semester', numericSemester
    );
    
    if (existingAssignments.exists && !force) {
      return res.status(409).json({
        message: `Topic assignments already exist for ${originalSemesterNumber}`,
        existing: {
          count: existingAssignments.count,
          semester: originalSemesterNumber
        },
        options: {
          forceAssignment: `Add "force": true to request body to overwrite existing assignments`,
          viewEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics`
        },
        canAssign: false
      });
    }

    console.log(`🔍 Creating topic assignments for ${originalSemesterNumber} with ${topics.length} topics...`);
    
    // Create topic assignments with validation
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'semester',
      numericSemester,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment failed for ${originalSemesterNumber}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        results,
        canAssign: false
      });
    }

    console.log(`✅ Topic assignment completed: ${results.created.length} topics assigned to ${originalSemesterNumber}`);
    
    res.status(201).json({
      message: `Successfully assigned ${results.created.length} topics to ${originalSemesterNumber}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      assignmentHandling: {
        existingAssignmentsFound: existingAssignments.exists,
        previousCount: existingAssignments.count,
        forceOverwrite: force && existingAssignments.exists
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName),
      questionsAccessEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics/{topicName}/questions`
    });
  } catch (error) {
    console.error('❌ Error in semesters topic assignment route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get topics assigned to a specific semester
 * @route   GET /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics
 * @desc    Get ordered topics assigned to a specific semester
 * @access  Public
 */
router.get('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    
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

    // Get topic assignments for this semester
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'semester', numericSemester
    );
    
    if (topicAssignments.length === 0) {
      return res.status(404).json({
        message: `No topic assignments found for ${originalSemesterNumber}`,
        suggestion: `Use POST /api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics to assign topics`
      });
    }

    // Build topic list with question access endpoints
    const topicsWithAccess = topicAssignments.map(assignment => ({
      topicId: assignment.topicId._id,
      topicName: assignment.topicId.name,
      displayName: assignment.topicId.displayName,
      description: assignment.topicId.description,
      orderIndex: assignment.orderIndex,
      questionsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics/${assignment.topicId.name}/questions`
    }));

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      totalTopics: topicsWithAccess.length,
      topics: topicsWithAccess,
      navigation: {
        manageEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics`,
        allSemestersEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/periods`
      }
    });
  } catch (error) {
    console.error('❌ Error in get semester topics route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get questions for a specific topic within a semester
 * @route   GET /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics/:topicName/questions
 * @desc    Get all questions for a specific topic across all years (for this semester's study)
 * @access  Public
 */
router.get('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics/:topicName/questions', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber, topicName } = req.params;
    
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

    // Validate topic exists and is assigned to this semester
    const topicAssignments = await examModel.getTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'semester', numericSemester
    );
    
    const assignedTopic = topicAssignments.find(assignment => 
      assignment.topicId.name.toLowerCase() === topicName.toLowerCase()
    );
    
    if (!assignedTopic) {
      return res.status(404).json({
        message: `Topic "${topicName}" is not assigned to ${originalSemesterNumber}`,
        availableTopics: topicAssignments.map(a => a.topicId.name),
        suggestion: `Check assigned topics at /api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics`
      });
    }

    // Get questions for this topic across ALL years
    const questionsResult = await examModel.getQuestionsForTopicAcrossYears(
      exam._id, subject._id, assignedTopic.topicId._id
    );
    
    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber,
        topic: assignedTopic.topicId.displayName
      },
      topicInfo: {
        topicId: assignedTopic.topicId._id,
        topicName: assignedTopic.topicId.name,
        displayName: assignedTopic.topicId.displayName,
        description: assignedTopic.topicId.description,
        orderIndex: assignedTopic.orderIndex
      },
      questionsData: questionsResult,
      studyInfo: {
        source: 'Questions aggregated from all available years for comprehensive topic coverage',
        ordering: 'Newest year first, randomized within each year',
        coverage: 'Complete topic mastery across historical exam questions'
      }
    });
  } catch (error) {
    console.error('❌ Error in get semester topic questions route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== UPDATE ROUTES FOR TOPIC ASSIGNMENTS ==========

/**
 * Update topic assignments for a specific week
 * @route   PUT /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics
 * @desc    Update/replace topic assignments for a specific week
 * @access  Private
 */
router.put('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check if assignments exist for this week
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'week', week
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for Week ${week} to update`,
        suggestion: `Use POST /api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics to create new assignments`
      });
    }

    console.log(`🔄 Updating topic assignments: Replacing ${existingAssignments.count} existing assignments for Week ${week}...`);
    
    // Create new assignments (this will replace existing ones)
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'week',
      week,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment update failed for Week ${week}`,
        results,
        canUpdate: false
      });
    }

    res.json({
      message: `Successfully updated ${results.created.length} topic assignments for Week ${week}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      updateInfo: {
        previousCount: existingAssignments.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName)
    });
  } catch (error) {
    console.error('❌ Error in weeks topic assignment update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Update topic assignments for a specific day
 * @route   PUT /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics
 * @desc    Update/replace topic assignments for a specific day
 * @access  Private
 */
router.put('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check if assignments exist for this day
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'day', day
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for Day ${day} to update`,
        suggestion: `Use POST /api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics to create new assignments`
      });
    }

    console.log(`🔄 Updating topic assignments: Replacing ${existingAssignments.count} existing assignments for Day ${day}...`);
    
    // Create new assignments (this will replace existing ones)
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'day',
      day,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment update failed for Day ${day}`,
        results,
        canUpdate: false
      });
    }

    res.json({
      message: `Successfully updated ${results.created.length} topic assignments for Day ${day}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      updateInfo: {
        previousCount: existingAssignments.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName)
    });
  } catch (error) {
    console.error('❌ Error in days topic assignment update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Update topic assignments for a specific semester
 * @route   PUT /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics
 * @desc    Update/replace topic assignments for a specific semester
 * @access  Private
 */
router.put('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
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

    // Check if assignments exist for this semester
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'semester', numericSemester
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for ${originalSemesterNumber} to update`,
        suggestion: `Use POST /api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${originalSemesterNumber}/topics to create new assignments`
      });
    }

    console.log(`🔄 Updating topic assignments: Replacing ${existingAssignments.count} existing assignments for ${originalSemesterNumber}...`);
    
    // Create new assignments (this will replace existing ones)
    const results = await examModel.createTopicAssignments(
      { exam, subject, track, subCategory },
      'semester',
      numericSemester,
      topics
    );
    
    if (results.errors.length > 0) {
      return res.status(400).json({
        message: `Topic assignment update failed for ${originalSemesterNumber}`,
        results,
        canUpdate: false
      });
    }

    res.json({
      message: `Successfully updated ${results.created.length} topic assignments for ${originalSemesterNumber}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      updateInfo: {
        previousCount: existingAssignments.count,
        newCount: results.created.length,
        operation: 'replace'
      },
      results,
      topicsAssigned: results.created.map(item => item.topicName)
    });
  } catch (error) {
    console.error('❌ Error in semesters topic assignment update route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== DELETE ROUTES FOR TOPIC ASSIGNMENTS ==========

/**
 * Delete topic assignments for a specific week
 * @route   DELETE /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics
 * @desc    Delete all topic assignments for a specific week
 * @access  Private
 */
router.delete('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    
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

    // Check if assignments exist
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'week', week
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for Week ${week} to delete`
      });
    }

    // Delete assignments by setting isActive to false
    const { TopicAssignment } = require('../models/exam');
    const result = await TopicAssignment.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        subCategoryId: subCategory._id,
        timePeriod: 'week',
        periodValue: week
      },
      { isActive: false }
    );
    
    res.json({
      message: `Successfully deleted ${result.modifiedCount} topic assignments for Week ${week}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week
      },
      deleted: {
        timePeriod: 'week',
        periodValue: week,
        count: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Error in delete week topic assignments route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Delete topic assignments for a specific day
 * @route   DELETE /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics
 * @desc    Delete all topic assignments for a specific day
 * @access  Private
 */
router.delete('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    
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

    // Check if assignments exist
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'day', day
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for Day ${day} to delete`
      });
    }

    // Delete assignments by setting isActive to false
    const { TopicAssignment } = require('../models/exam');
    const result = await TopicAssignment.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        subCategoryId: subCategory._id,
        timePeriod: 'day',
        periodValue: day
      },
      { isActive: false }
    );
    
    res.json({
      message: `Successfully deleted ${result.modifiedCount} topic assignments for Day ${day}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day
      },
      deleted: {
        timePeriod: 'day',
        periodValue: day,
        count: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Error in delete day topic assignments route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Delete topic assignments for a specific semester
 * @route   DELETE /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics
 * @desc    Delete all topic assignments for a specific semester
 * @access  Private
 */
router.delete('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber/topics', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    
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

    // Check if assignments exist
    const existingAssignments = await examModel.checkExistingTopicAssignments(
      exam._id, subject._id, track._id, subCategory._id, 'semester', numericSemester
    );
    
    if (!existingAssignments.exists) {
      return res.status(404).json({
        message: `No topic assignments found for ${originalSemesterNumber} to delete`
      });
    }

    // Delete assignments by setting isActive to false
    const { TopicAssignment } = require('../models/exam');
    const result = await TopicAssignment.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        subCategoryId: subCategory._id,
        timePeriod: 'semester',
        periodValue: numericSemester
      },
      { isActive: false }
    );
    
    res.json({
      message: `Successfully deleted ${result.modifiedCount} topic assignments for ${originalSemesterNumber}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      deleted: {
        timePeriod: 'semester',
        periodValue: numericSemester,
        count: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Error in delete semester topic assignments route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== UPDATED QUESTION RETRIEVAL ROUTES ==========

/**
 * Updated: Get questions grouped by time periods with topic assignment support
 * @route   GET /api/questions/groups/:examName/:subjectName/:trackName/:subCategoryName
 * @desc    Get questions grouped by time periods (enhanced for topic assignment system)
 * @access  Public
 */
router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'auto' } = req.query;

    // Resolve context using the enhanced resolver
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName);
    
    if (!contextResult.success) {
      return res.status(404).json({ message: 'Context not found' });
    }

    const { exam, subject, track, subCategory } = contextResult;

    // Auto-determine groupBy based on track type
    let actualGroupBy = groupBy;
    if (groupBy === 'auto') {
      if (track.trackType === 'years') {
        actualGroupBy = 'year';
      } else if (track.trackType === 'weeks') {
        actualGroupBy = 'week';
      } else if (track.trackType === 'days') {
        actualGroupBy = 'day';
      } else if (track.trackType === 'semester') {
        actualGroupBy = 'semester';
      } else {
        actualGroupBy = 'topic'; // fallback
      }
    }

    let groupedData = {};

    if (actualGroupBy === 'year' || track.trackType === 'years') {
      // For years track: Get actual questions grouped by year
      const questions = await examModel.getQuestionsByFilters({
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id
      });

      questions.forEach(question => {
        const yearKey = question.year || 'unknown';
        
        if (!groupedData[yearKey]) {
          groupedData[yearKey] = {
            groupKey: yearKey,
            groupName: `Year ${yearKey}`,
            groupType: 'year',
            items: [],
            accessMethod: 'direct_questions'
          };
        }
        groupedData[yearKey].items.push(question);
      });

    } else if (actualGroupBy === 'week' && track.trackType === 'weeks') {
      // For weeks track: Get topic assignments for each week
      for (let week = 1; week <= (track.duration || 52); week++) {
        const topicAssignments = await examModel.getTopicAssignments(
          exam._id, subject._id, track._id, subCategory._id, 'week', week
        );
        
        if (topicAssignments.length > 0) {
          const weekKey = `week_${week}`;
          groupedData[weekKey] = {
            groupKey: weekKey,
            groupName: `Week ${week}`,
            groupType: 'week',
            accessMethod: 'topic_assignment',
            topicCount: topicAssignments.length,
            topics: topicAssignments.map(assignment => ({
              topicId: assignment.topicId._id,
              topicName: assignment.topicId.name,
              displayName: assignment.topicId.displayName,
              orderIndex: assignment.orderIndex,
              questionsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics/${assignment.topicId.name}/questions`
            })),
            manageEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${week}/topics`
          };
        }
      }

    } else if (actualGroupBy === 'day' && track.trackType === 'days') {
      // For days track: Get topic assignments for each day
      for (let day = 1; day <= (track.duration || 365); day++) {
        const topicAssignments = await examModel.getTopicAssignments(
          exam._id, subject._id, track._id, subCategory._id, 'day', day
        );
        
        if (topicAssignments.length > 0) {
          const dayKey = `day_${day}`;
          groupedData[dayKey] = {
            groupKey: dayKey,
            groupName: `Day ${day}`,
            groupType: 'day',
            accessMethod: 'topic_assignment',
            topicCount: topicAssignments.length,
            topics: topicAssignments.map(assignment => ({
              topicId: assignment.topicId._id,
              topicName: assignment.topicId.name,
              displayName: assignment.topicId.displayName,
              orderIndex: assignment.orderIndex,
              questionsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics/${assignment.topicId.name}/questions`
            })),
            manageEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${day}/topics`
          };
        }
      }

    } else if (actualGroupBy === 'semester' && track.trackType === 'semester') {
      // For semester track: Get topic assignments for each semester
      for (let semester = 1; semester <= (track.duration || 2); semester++) {
        const topicAssignments = await examModel.getTopicAssignments(
          exam._id, subject._id, track._id, subCategory._id, 'semester', semester
        );
        
        if (topicAssignments.length > 0) {
          const semesterKey = `semester_${semester}`;
          groupedData[semesterKey] = {
            groupKey: semesterKey,
            groupName: `Semester ${semester}`,
            groupType: 'semester',
            accessMethod: 'topic_assignment',
            topicCount: topicAssignments.length,
            topics: topicAssignments.map(assignment => ({
              topicId: assignment.topicId._id,
              topicName: assignment.topicId.name,
              displayName: assignment.topicId.displayName,
              orderIndex: assignment.orderIndex,
              questionsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${semester}/topics/${assignment.topicId.name}/questions`
            })),
            manageEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${semester}/topics`
          };
        }
      }

    } else {
      // Fallback: Group by topics (for any track type)
      const questions = await examModel.getQuestionsByFilters({
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id
      });

      questions.forEach(question => {
        const topicKey = question.topicId?.name || 'general';
        const topicName = question.topicId?.displayName || 'General';
        
        if (!groupedData[topicKey]) {
          groupedData[topicKey] = {
            groupKey: topicKey,
            groupName: topicName,
            groupType: 'topic',
            items: []
          };
        }
        groupedData[topicKey].items.push(question);
      });
    }

    // Convert to array and sort
    const groups = Object.values(groupedData).sort((a, b) => {
      if (actualGroupBy === 'year') {
        return parseInt(b.groupKey) - parseInt(a.groupKey); // Newest first
      } else if (actualGroupBy === 'week') {
        const aWeek = parseInt(a.groupKey.split('_')[1]) || 0;
        const bWeek = parseInt(b.groupKey.split('_')[1]) || 0;
        return aWeek - bWeek;
      } else if (actualGroupBy === 'day') {
        const aDay = parseInt(a.groupKey.split('_')[1]) || 0;
        const bDay = parseInt(b.groupKey.split('_')[1]) || 0;
        return aDay - bDay;
      } else if (actualGroupBy === 'semester') {
        const aSemester = parseInt(a.groupKey.split('_')[1]) || 0;
        const bSemester = parseInt(b.groupKey.split('_')[1]) || 0;
        return aSemester - bSemester;
      }
      return a.groupName.localeCompare(b.groupName);
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        trackType: track.trackType,
        subCategory: subCategory.displayName
      },
      groupBy: actualGroupBy,
      totalGroups: groups.length,
      groups,
      systemInfo: {
        trackType: track.trackType,
        accessMethod: track.trackType === 'years' ? 'direct_questions' : 'topic_assignment',
        description: track.trackType === 'years' 
          ? 'Questions are uploaded directly by year'
          : 'Topics are assigned to time periods, questions are aggregated from all years'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Updated: Get available time periods with topic assignment support
 * @route   GET /api/questions/:examName/:subjectName/:trackName/:subCategoryName/periods
 * @desc    Get available time periods for question uploads or topic assignments
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
          accessMethod: 'topic_assignment',
          assignTopicsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          getTopicsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          updateTopicsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          deleteTopicsEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          accessMethod: 'topic_assignment',
          assignTopicsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          getTopicsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          updateTopicsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          deleteTopicsEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`
        });
      }
    } else if (trackType === 'semester') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Semester ${i}`,
          type: 'semester',
          accessMethod: 'topic_assignment',
          assignTopicsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          getTopicsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          updateTopicsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`,
          deleteTopicsEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}/topics`
        });
      }
    } else {
      // Default: year-based (direct question upload)
      const currentYear = new Date().getFullYear();
      for (let i = currentYear; i >= currentYear - 20; i--) {
        periods.push({
          number: i,
          name: `Year ${i}`,
          type: 'year',
          accessMethod: 'direct_upload',
          uploadEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
          updateEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    }

    res.json({
      track: {
        name: track.displayName,
        type: trackType,
        duration: duration,
        accessMethod: trackType === 'years' ? 'direct_upload' : 'topic_assignment'
      },
      approvedTopics: approvedTopics.map(topic => ({
        id: topic._id,
        name: topic.name,
        displayName: topic.displayName
      })),
      totalPeriods: periods.length,
      periods,
      groupingEndpoint: `/api/questions/groups/${examName}/${subjectName}/${trackName}/${subCategoryName}`,
      topicValidationEndpoint: `/api/questions/validate-topics/${examName}/${subjectName}`,
      systemInfo: {
        description: trackType === 'years' 
          ? 'Upload questions directly by year. Each year stores actual questions.'
          : 'Assign topics to time periods. Questions are aggregated from all years for assigned topics.',
        workflow: trackType === 'years'
          ? '1. Upload questions → 2. Questions stored by year → 3. Access questions by year'
          : '1. Assign topics to periods → 2. Questions pulled from all years → 3. Access questions by topic within periods'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== INDIVIDUAL QUESTION MANAGEMENT ROUTES ==========

/**
 * Update a question with topic validation
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
 * Delete questions for a specific year (only for years track)
 * @route   DELETE /api/questions/years/:examName/:subjectName/:trackName/:subCategoryName/:year
 * @desc    Delete all questions for a specific year
 * @access  Private
 */
router.delete('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, year } = req.params;
    
    // Validate year
    const questionYear = parseInt(year);
    if (isNaN(questionYear) || questionYear < 1900 || questionYear > 2100) {
      return res.status(400).json({ message: 'Valid year (1900-2100) is required' });
    }

    // Resolve context
    const contextResult = await resolveUploadContext(examName, subjectName, trackName, subCategoryName, 'years');
    
    if (!contextResult.success) {
      return res.status(404).json({ 
        message: 'Context not found',
        debug: contextResult
      });
    }

    const { exam, subject, track, subCategory } = contextResult;

    if (track.trackType !== 'years') {
      return res.status(400).json({ 
        message: `This endpoint is only for years tracks. Track "${trackName}" is type: ${track.trackType}` 
      });
    }

    // Check if questions exist
    const existingCheck = await checkExistingQuestions(exam._id, subject._id, track._id, 'year', questionYear);
    
    if (!existingCheck.exists) {
      return res.status(404).json({
        message: `No questions found for Year ${year} to delete`
      });
    }

    // Delete questions by setting isActive to false
    const { Question } = require('../models/exam');
    const result = await Question.updateMany(
      {
        examId: exam._id,
        subjectId: subject._id,
        trackId: track._id,
        year: questionYear.toString()
      },
      { isActive: false }
    );
    
    res.json({
      message: `Successfully deleted ${result.modifiedCount} questions for Year ${year}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      deleted: {
        timePeriod: 'year',
        periodValue: questionYear,
        count: result.modifiedCount
      }
    });
  } catch (error) {
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



module.exports = router;