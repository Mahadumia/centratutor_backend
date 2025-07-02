// routes/questions.js - Enhanced Past Questions Management Routes with Mandatory Topic Validation
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

// ========== TIME-PERIOD SPECIFIC QUESTION UPLOAD ROUTES (Enhanced with Topic Validation) ==========

/**
 * ENHANCED: Upload questions to a specific year with topic validation
 * @route   POST /api/questions/years/:examName/:subjectName/:trackName/:subCategoryName/:year
 * @desc    Upload questions for a specific year with mandatory topic validation
 * @access  Private
 */
router.post('/years/:examName/:subjectName/:trackName/:subCategoryName/:year', async (req, res) => {
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

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
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

    // Enhanced: Add year-specific metadata with validated topics
    const enrichedQuestions = questions.map((question, index) => {
      const validationData = topicValidationResults.validQuestions[index];
      
      return {
        examName: exam.name,
        subject: subject.name,
        year: year,
        topic: question.topic,
        question: question.question,
        question_diagram: question.question_diagram || 'assets/images/noDiagram.png',
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        metadata: {
          ...question.metadata,
          uploadYear: year,
          timePeriod: 'year',
          yearLabel: `Year ${year}`,
          orderIndex: index,
          topicValidated: true,
          topicId: validationData.topicId
        },
        _preValidated: {
          topicId: validationData.topicId,
          topicName: validationData.topicName
        }
      };
    });

    const results = await examModel.createBulkQuestionsWithValidation(enrichedQuestions);
    
    res.status(201).json({
      message: `Successfully uploaded ${results.created.length} questions for Year ${year} with validated topics`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        year: year
      },
      validation: topicValidationResults,
      results,
      topicsSummary: {
        uniqueTopicsUsed: [...new Set(questions.map(q => q.topic))],
        allTopicsValid: true
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific week with topic validation
 * @route   POST /api/questions/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Upload questions for a specific week with mandatory topic validation
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
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

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
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

    // Add week-specific metadata with validated topics
    const enrichedQuestions = questions.map((question, index) => {
      const validationData = topicValidationResults.validQuestions[index];
      
      return {
        examName: exam.name,
        subject: subject.name,
        year: question.year,
        topic: question.topic,
        question: question.question,
        question_diagram: question.question_diagram || 'assets/images/noDiagram.png',
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        metadata: {
          ...question.metadata,
          week: week,
          timePeriod: 'week',
          weekLabel: `Week ${week}`,
          orderIndex: (week * 1000) + index,
          topicValidated: true,
          topicId: validationData.topicId
        },
        _preValidated: {
          topicId: validationData.topicId,
          topicName: validationData.topicName
        }
      };
    });

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
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific day with topic validation
 * @route   POST /api/questions/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Upload questions for a specific day with mandatory topic validation
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
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

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
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

    // Add day-specific metadata with validated topics
    const enrichedQuestions = questions.map((question, index) => {
      const validationData = topicValidationResults.validQuestions[index];
      
      return {
        examName: exam.name,
        subject: subject.name,
        year: question.year,
        topic: question.topic,
        question: question.question,
        question_diagram: question.question_diagram || 'assets/images/noDiagram.png',
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        metadata: {
          ...question.metadata,
          day: day,
          timePeriod: 'day',
          dayLabel: `Day ${day}`,
          orderIndex: (day * 100) + index,
          topicValidated: true,
          topicId: validationData.topicId
        },
        _preValidated: {
          topicId: validationData.topicId,
          topicName: validationData.topicName
        }
      };
    });

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
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * ENHANCED: Upload questions to a specific semester with topic validation
 * @route   POST /api/questions/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Upload questions for a specific semester with topic-based organization and validation
 * @access  Private
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const originalSemesterNumber = semesterNumber;
    const numericSemester = parseInt(semesterNumber) || 1;

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
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

    // Add semester-specific metadata with topic organization and validation
    const enrichedQuestions = questions.map((question, index) => {
      const validationData = topicValidationResults.validQuestions[index];
      
      return {
        examName: exam.name,
        subject: subject.name,
        year: question.year,
        topic: question.topic,
        question: question.question,
        question_diagram: question.question_diagram || 'assets/images/noDiagram.png',
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        metadata: {
          ...question.metadata,
          semester: numericSemester,
          semesterName: originalSemesterNumber,
          timePeriod: 'semester',
          semesterLabel: `${originalSemesterNumber}`,
          topicAccess: true,
          orderIndex: (numericSemester * 100000) + index,
          topicValidated: true,
          topicId: validationData.topicId
        },
        _preValidated: {
          topicId: validationData.topicId,
          topicName: validationData.topicName
        }
      };
    });

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
      topicBreakdown: Object.keys(questionsByTopic).map(topic => ({
        topic,
        questionCount: questionsByTopic[topic].length,
        topicValidated: true
      })),
      validation: topicValidationResults,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== HELPER FUNCTIONS ==========

/**
 * Validate question topics against approved topics for exam-subject
 */
async function validateQuestionsTopics(questions, examName) {
  try {
    const { Exam, Subject } = require('../models/exam');
    
    // Find exam
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    if (!exam) {
      throw new Error(`Exam "${examName}" not found`);
    }

    const validationResults = {
      validQuestions: [],
      invalidQuestions: [],
      examInfo: {
        examId: exam._id,
        examName: exam.displayName
      },
      summary: {
        total: questions.length,
        valid: 0,
        invalid: 0,
        subjectsProcessed: new Set(),
        uniqueTopics: new Set(),
        invalidTopics: new Set()
      }
    };

    // Group questions by subject for efficient validation
    const questionsBySubject = {};
    questions.forEach((question, index) => {
      const subjectKey = question.subject || 'unknown';
      if (!questionsBySubject[subjectKey]) {
        questionsBySubject[subjectKey] = [];
      }
      questionsBySubject[subjectKey].push({ ...question, originalIndex: index });
    });

    // Validate each subject's questions
    for (const [subjectName, subjectQuestions] of Object.entries(questionsBySubject)) {
      // Find subject
      const subject = await Subject.findOne({ 
        examId: exam._id, 
        name: subjectName, 
        isActive: true 
      });

      if (!subject) {
        // Mark all questions in this subject as invalid
        subjectQuestions.forEach(question => {
          validationResults.invalidQuestions.push({
            index: question.originalIndex,
            subjectName,
            topicName: question.topic,
            error: `Subject "${subjectName}" not found for exam "${examName}"`,
            question: question.question?.substring(0, 50) + '...'
          });
        });
        continue;
      }

      validationResults.summary.subjectsProcessed.add(subjectName);

      // Get approved topics for this subject
      const approvedTopics = await examModel.getApprovedTopicsForSubject(exam._id, subject._id);
      const approvedTopicNames = new Set(approvedTopics.map(topic => topic.name.trim().toLowerCase()));

      // Validate each question's topic
      for (const question of subjectQuestions) {
        const topicName = question.topic?.trim();
        
        if (!topicName) {
          validationResults.invalidQuestions.push({
            index: question.originalIndex,
            subjectName,
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
            index: question.originalIndex,
            subjectName,
            topicName: topicName,
            topicId: approvedTopic._id,
            examId: exam._id,
            subjectId: subject._id,
            question: question.question?.substring(0, 50) + '...'
          });
        } else {
          validationResults.invalidQuestions.push({
            index: question.originalIndex,
            subjectName,
            topicName: topicName,
            error: `Topic "${topicName}" is not in the approved list for subject "${subjectName}" in exam "${examName}"`,
            question: question.question?.substring(0, 50) + '...',
            availableTopics: approvedTopics.map(t => t.displayName).slice(0, 5) // Show first 5 as suggestions
          });
          validationResults.summary.invalidTopics.add(topicName);
        }
      }
    }

    // Update summary
    validationResults.summary.valid = validationResults.validQuestions.length;
    validationResults.summary.invalid = validationResults.invalidQuestions.length;
    validationResults.summary.subjectsProcessed = Array.from(validationResults.summary.subjectsProcessed);
    validationResults.summary.uniqueTopics = Array.from(validationResults.summary.uniqueTopics);
    validationResults.summary.invalidTopics = Array.from(validationResults.summary.invalidTopics);

    return validationResults;
  } catch (error) {
    console.error('Error validating questions topics:', error);
    throw error;
  }
}

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

// ========== TIME-PERIOD SPECIFIC QUESTION RETRIEVAL ROUTES ==========

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

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    // Get questions for this context
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
    
    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // NEW: Get approved topics for this exam-subject for validation reference
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
          uploadEndpoint: `/api/questions/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          uploadEndpoint: `/api/questions/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'semester') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Semester ${i}`,
          type: 'semester',
          uploadEndpoint: `/api/questions/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`,
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
          uploadEndpoint: `/api/questions/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
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
      topicValidationEndpoint: `/api/questions/validate-topics`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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



module.exports = router;