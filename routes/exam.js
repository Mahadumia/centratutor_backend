// routes/exam.js - With Topics and Questions Support
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

/**
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const exams = await examModel.getAllExams();
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/exams/:examId
 * @desc    Get exam by ID
 * @access  Public
 */
router.get('/:examId', async (req, res) => {
  try {
    const exam = await examModel.getExamById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams
 * @desc    Create a new exam
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { name, displayName, description, icon } = req.body;
    
    if (!name || !displayName) {
      return res.status(400).json({ 
        message: 'Name and displayName are required' 
      });
    }
    
    const examData = {
      name: name.toUpperCase(),
      displayName,
      description,
      icon
    };
    
    const newExam = await examModel.createExam(examData);
    res.status(201).json(newExam);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Exam with this name already exists' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/exams/:examId/subjects
 * @desc    Get all subjects for an exam
 * @access  Public
 */
router.get('/:examId/subjects', async (req, res) => {
  try {
    const subjects = await examModel.getSubjectsByExam(req.params.examId);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/subjects/bulk
 * @desc    Create multiple subjects for an exam
 * @access  Private
 */
router.post('/:examId/subjects/bulk', async (req, res) => {
  try {
    const { subjects } = req.body;
    
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Subjects array is required' });
    }
    
    const results = await examModel.createBulkSubjects(req.params.examId, subjects);
    
    res.status(201).json({
      message: `Created ${results.created.length} subjects with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== NEW: TOPICS ENDPOINTS ==========

/**
 * @route   GET /api/exams/:examId/subjects/:subjectId/topics
 * @desc    Get all standard topics for a subject
 * @access  Public
 */
router.get('/:examId/subjects/:subjectId/topics', async (req, res) => {
  try {
    const topics = await examModel.getTopicsBySubject(
      req.params.examId,
      req.params.subjectId
    );
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/subjects/:subjectId/topics/bulk
 * @desc    Create multiple standard topics for a subject
 * @access  Private
 */
router.post('/:examId/subjects/:subjectId/topics/bulk', async (req, res) => {
  try {
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
    }
    
    const results = await examModel.createBulkTopics(
      req.params.examId,
      req.params.subjectId,
      topics
    );
    
    res.status(201).json({
      message: `Created ${results.created.length} topics with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== TRACKS ENDPOINTS ==========

/**
 * @route   GET /api/exams/:examId/subjects/:subjectId/tracks
 * @desc    Get all tracks for a subject
 * @access  Public
 */
router.get('/:examId/subjects/:subjectId/tracks', async (req, res) => {
  try {
    const tracks = await examModel.getTracksBySubject(
      req.params.examId, 
      req.params.subjectId
    );
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/subjects/:subjectId/tracks/bulk
 * @desc    Create multiple tracks for a subject
 * @access  Private
 */
router.post('/:examId/subjects/:subjectId/tracks/bulk', async (req, res) => {
  try {
    const { tracks } = req.body;
    
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ message: 'Tracks array is required' });
    }
    
    const results = await examModel.createBulkTracks(req.params.examId, req.params.subjectId, tracks);
    
    res.status(201).json({
      message: `Created ${results.created.length} tracks with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   DELETE /api/exams/:examId/subjects/:subjectId/tracks/hard-delete
 * @desc    Permanently delete all tracks for a subject
 * @access  Private
 */
router.delete('/:examId/subjects/:subjectId/tracks/hard-delete', async (req, res) => {
  try {
    const { Track } = require('../models/exam');
    
    const result = await Track.deleteMany({
      examId: req.params.examId,
      subjectId: req.params.subjectId
    });
    
    res.json({ 
      message: `Permanently deleted ${result.deletedCount} tracks for subject`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== SUBCATEGORY NAVIGATION ENDPOINTS ==========

/**
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/subjects
 * @desc    Get subjects available in a specific subcategory for an exam
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/subjects', async (req, res) => {
  try {
    const subjects = await examModel.getSubjectsInSubCategory(
      req.params.examId,
      req.params.subCategoryId
    );
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks
 * @desc    Get tracks available for subject in subcategory
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks', async (req, res) => {
  try {
    const tracks = await examModel.getTracksInSubCategory(
      req.params.examId,
      req.params.subCategoryId,
      req.params.subjectId
    );
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/content
 * @desc    Get content items for specific track and subcategory (Notes/Videos)
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/content', async (req, res) => {
  try {
    const content = await examModel.getContentByFilters({
      examId: req.params.examId,
      subCategoryId: req.params.subCategoryId,
      subjectId: req.params.subjectId,
      trackId: req.params.trackId
    });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== NEW: PAST QUESTIONS ENDPOINTS ==========

/**
 * @route   GET /api/exams/:examId/pastquestions/:subjectId/tracks/:trackId/topics
 * @desc    Get topics for past questions in a specific year/track
 * @access  Public
 */
router.get('/:examId/pastquestions/:subjectId/tracks/:trackId/topics', async (req, res) => {
  try {
    const topics = await examModel.getTopicsBySubject(
      req.params.examId,
      req.params.subjectId
    );
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/exams/:examId/pastquestions/:subjectId/tracks/:trackId/questions
 * @desc    Get questions for specific track (year) and optional topic filters
 * @access  Public
 */
router.get('/:examId/pastquestions/:subjectId/tracks/:trackId/questions', async (req, res) => {
  try {
    const { topicIds, difficulty, limit } = req.query;
    
    const filters = {
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      trackId: req.params.trackId
    };

    if (topicIds) {
      // Support multiple topic selection
      filters.topicIds = Array.isArray(topicIds) ? topicIds : [topicIds];
    }

    if (difficulty) {
      filters.difficulty = difficulty;
    }

    let questions = await examModel.getQuestionsByFilters(filters);
    
    if (limit) {
      questions = questions.slice(0, parseInt(limit));
    }
    
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/pastquestions/:subjectId/questions/multi-selection
 * @desc    Get questions with multiple year and topic selection
 * @access  Public
 */
router.post('/:examId/pastquestions/:subjectId/questions/multi-selection', async (req, res) => {
  try {
    const { trackIds, topicIds, difficulty, limit } = req.body;
    
    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return res.status(400).json({ message: 'At least one track (year) must be selected' });
    }

    const questions = await examModel.getQuestionsMultiSelection(
      req.params.examId,
      req.params.subjectId,
      trackIds,
      topicIds
    );
    
    let filteredQuestions = questions;
    
    if (difficulty) {
      filteredQuestions = questions.filter(q => q.difficulty === difficulty);
    }
    
    if (limit) {
      filteredQuestions = filteredQuestions.slice(0, parseInt(limit));
    }
    
    res.json({
      totalQuestions: filteredQuestions.length,
      selectedTracks: trackIds.length,
      selectedTopics: topicIds ? topicIds.length : 0,
      questions: filteredQuestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/pastquestions/questions/bulk
 * @desc    Upload questions in bulk from JSON
 * @access  Private
 */
router.post('/:examId/pastquestions/questions/bulk', async (req, res) => {
  try {
    const { questions, examName } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // Add examName to each question for processing
    const questionsWithExam = questions.map(q => ({
      ...q,
      examName: examName || 'JUPEB' // Default fallback
    }));
    
    const results = await examModel.createBulkQuestions(questionsWithExam);
    
    res.status(201).json({
      message: `Created ${results.created.length} questions with ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== SUBJECT AVAILABILITY ENDPOINTS ==========

/**
 * @route   POST /api/exams/:examId/subject-availability/bulk
 * @desc    Set subject availability for subcategories in bulk
 * @access  Private
 */
router.post('/:examId/subject-availability/bulk', async (req, res) => {
  try {
    const { availability } = req.body;
    
    if (!availability || !Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({ message: 'Availability array is required' });
    }
    
    const results = await examModel.setSubjectAvailabilityBulk(req.params.examId, availability);
    
    res.status(201).json({
      message: `Set ${results.created.length} availability records with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== COMPLETE STRUCTURE ENDPOINTS ==========

/**
 * @route   GET /api/exams/:examId/user-flow
 * @desc    Get complete user flow structure (subcategory -> subject -> track -> content/topics)
 * @access  Public
 */
router.get('/:examId/user-flow', async (req, res) => {
  try {
    const structure = await examModel.getCompleteUserFlow(req.params.examId);
    
    if (!structure) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(structure);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/seed/complete
 * @desc    Seed complete exam with all data including topics
 * @access  Private
 */
router.post('/seed/complete', async (req, res) => {
  try {
    const { examData, subjectsData, topicsData, tracksData, availabilityData } = req.body;
    
    if (!examData || !examData.name || !examData.displayName) {
      return res.status(400).json({ 
        message: 'Exam data with name and displayName is required' 
      });
    }
    
    if (!subjectsData || !Array.isArray(subjectsData) || subjectsData.length === 0) {
      return res.status(400).json({ 
        message: 'Subjects data array is required' 
      });
    }
    
    const results = await examModel.seedCompleteExam(
      examData,
      subjectsData || [],
      topicsData || [],
      tracksData || [],
      availabilityData || []
    );
    
    res.status(201).json({
      message: 'Complete exam seeding completed',
      results
    });
  } catch (error) {
    console.error('Error seeding complete exam:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/validate-structure
 * @desc    Validate exam structure before content upload
 * @access  Private
 */
router.post('/:examId/validate-structure', async (req, res) => {
  try {
    const { subjectId, trackId, topicId, subCategoryId } = req.body;
    
    const validationResults = {};

    // Validate exam exists
    const examExists = await examModel.validateExamExists(req.params.examId);
    validationResults.examValid = examExists;

    if (subjectId) {
      const subjectExists = await examModel.validateSubjectExists(req.params.examId, subjectId);
      validationResults.subjectValid = subjectExists;
    }

    if (topicId && subjectId) {
      const topicExists = await examModel.validateTopicExists(req.params.examId, subjectId, topicId);
      validationResults.topicValid = topicExists;
    }

    if (trackId && subjectId) {
      const trackExists = await examModel.validateTrackExists(req.params.examId, subjectId, trackId);
      validationResults.trackValid = trackExists;
    }

    if (subCategoryId && subjectId) {
      const availabilityExists = await examModel.validateSubjectAvailability(
        req.params.examId, 
        subjectId, 
        subCategoryId
      );
      validationResults.availabilityValid = availabilityExists;
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

module.exports = router;