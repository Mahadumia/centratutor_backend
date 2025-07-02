// routes/exam.js - Enhanced with Track-Specific Topic Management System
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
 * @desc    Get all subjects for an exam (global subjects)
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
 * @desc    Create multiple subjects for an exam (global subjects)
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

// ========== ENHANCED TOPIC MANAGEMENT ENDPOINTS ==========

/**
 * NEW: Get all approved topics for a subject
 * @route   GET /api/exams/:examId/subjects/:subjectId/topics
 * @desc    Get all standard approved topics for a subject
 * @access  Public
 */
router.get('/:examId/subjects/:subjectId/topics', async (req, res) => {
  try {
    const topics = await examModel.getTopicsBySubject(
      req.params.examId,
      req.params.subjectId
    );
    res.json({
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      totalTopics: topics.length,
      topics
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Get approved topics for content validation
 * @route   GET /api/exams/:examId/subjects/:subjectId/topics/approved
 * @desc    Get approved topics list for content upload validation
 * @access  Public
 */
router.get('/:examId/subjects/:subjectId/topics/approved', async (req, res) => {
  try {
    const topics = await examModel.getApprovedTopicsForSubject(
      req.params.examId,
      req.params.subjectId
    );
    
    res.json({
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      approvedTopics: topics.map(topic => ({
        id: topic._id,
        name: topic.name,
        displayName: topic.displayName,
        description: topic.description,
        orderIndex: topic.orderIndex,
        isActive: topic.isActive
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Validate a single topic for content upload
 * @route   POST /api/exams/:examId/subjects/:subjectId/topics/validate
 * @desc    Validate if a topic is approved for content upload
 * @access  Public
 */
router.post('/:examId/subjects/:subjectId/topics/validate', async (req, res) => {
  try {
    const { topicName } = req.body;
    
    if (!topicName) {
      return res.status(400).json({ message: 'topicName is required' });
    }
    
    const validation = await examModel.validateTopicForContent(
      req.params.examId,
      req.params.subjectId,
      topicName
    );
    
    res.json({
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      topicName,
      validation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Bulk validate topics for content upload
 * @route   POST /api/exams/:examId/subjects/:subjectId/topics/validate-bulk
 * @desc    Validate multiple topics for bulk content upload
 * @access  Public
 */
router.post('/:examId/subjects/:subjectId/topics/validate-bulk', async (req, res) => {
  try {
    const { topicNames } = req.body;
    
    if (!topicNames || !Array.isArray(topicNames) || topicNames.length === 0) {
      return res.status(400).json({ message: 'topicNames array is required' });
    }
    
    const validationResults = {
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      validTopics: [],
      invalidTopics: [],
      summary: {
        total: topicNames.length,
        valid: 0,
        invalid: 0
      }
    };
    
    for (const topicName of topicNames) {
      const validation = await examModel.validateTopicForContent(
        req.params.examId,
        req.params.subjectId,
        topicName
      );
      
      if (validation.isValid) {
        validationResults.validTopics.push({
          name: topicName,
          topicId: validation.topicId,
          displayName: validation.topic?.displayName
        });
      } else {
        validationResults.invalidTopics.push({
          name: topicName,
          message: validation.message
        });
      }
    }
    
    validationResults.summary.valid = validationResults.validTopics.length;
    validationResults.summary.invalid = validationResults.invalidTopics.length;
    
    res.json(validationResults);
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
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Get topic statistics across exam
 * @route   GET /api/exams/:examId/topics/statistics
 * @desc    Get comprehensive topic statistics for an exam
 * @access  Public
 */
router.get('/:examId/topics/statistics', async (req, res) => {
  try {
    const stats = await examModel.getTopicStatistics(req.params.examId);
    
    res.json({
      examId: req.params.examId,
      topicStatistics: stats,
      summary: {
        totalSubjects: stats.length,
        totalTopics: stats.reduce((sum, stat) => sum + stat.topicCount, 0),
        averageTopicsPerSubject: stats.length > 0 ? 
          (stats.reduce((sum, stat) => sum + stat.topicCount, 0) / stats.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== TRACKS ENDPOINTS - Now per exam-subcategory ==========

/**
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/tracks
 * @desc    Get all tracks for an exam-subcategory combination
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/tracks', async (req, res) => {
  try {
    const tracks = await examModel.getTracksByExamSubCategory(
      req.params.examId, 
      req.params.subCategoryId
    );
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:examId/subcategories/:subCategoryId/tracks/bulk
 * @desc    Create multiple tracks for an exam-subcategory combination
 * @access  Private
 */
router.post('/:examId/subcategories/:subCategoryId/tracks/bulk', async (req, res) => {
  try {
    const { tracks } = req.body;
    
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ message: 'Tracks array is required' });
    }
    
    const results = await examModel.createBulkTracks(
      req.params.examId, 
      req.params.subCategoryId, 
      tracks
    );
    
    res.status(201).json({
      message: `Created ${results.created.length} tracks with ${results.errors.length} errors and ${results.duplicates.length} duplicates`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/exams/:examId/subcategories/:subCategoryId/tracks/hard-delete
 * @desc    Permanently delete all tracks for an exam-subcategory combination
 * @access  Private
 */
router.delete('/:examId/subcategories/:subCategoryId/tracks/hard-delete', async (req, res) => {
  try {
    const { Track } = require('../models/exam');
    
    const result = await Track.deleteMany({
      examId: req.params.examId,
      subCategoryId: req.params.subCategoryId
    });
    
    res.json({ 
      message: `Permanently deleted ${result.deletedCount} tracks for exam-subcategory`,
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
 * UPDATED: Get content items for specific subject, track and subcategory with track-specific topic grouping
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/content
 * @desc    Get content items grouped by topics that have content in this track
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/content', async (req, res) => {
  try {
    const { groupByTopic = 'true' } = req.query;
    
    if (groupByTopic === 'true') {
      // Use the new method to get content grouped by track-specific topics
      const contentGrouped = await examModel.getContentGroupedByTrackTopics(
        req.params.examId,
        req.params.subjectId,
        req.params.trackId,
        req.params.subCategoryId
      );
      
      res.json({
        examId: req.params.examId,
        subCategoryId: req.params.subCategoryId,
        subjectId: req.params.subjectId,
        trackId: req.params.trackId,
        totalContent: contentGrouped.totalContent,
        totalTopicsWithContent: contentGrouped.totalTopics,
        topicsWithContent: contentGrouped.topicsWithContent,
        contentByTopics: contentGrouped.contentByTopics
      });
    } else {
      // Return flat content list
      const content = await examModel.getContentByFilters({
        examId: req.params.examId,
        subCategoryId: req.params.subCategoryId,
        subjectId: req.params.subjectId,
        trackId: req.params.trackId
      });
      
      res.json(content);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


/**
 * @route   GET /api/exams/:examId/pastquestions/tracks
 * @desc    Get all past question tracks (years) for an exam
 * @access  Public
 */
router.get('/:examId/pastquestions/tracks', async (req, res) => {
  try {
    // Get pastquestions subcategory
    const { SubCategory } = require('../models/exam');
    const pastQuestionsSubCategory = await SubCategory.findOne({
      examId: req.params.examId,
      name: 'pastquestions',
      isActive: true
    });

    if (!pastQuestionsSubCategory) {
      return res.status(404).json({ message: 'Past questions subcategory not found' });
    }

    const tracks = await examModel.getTracksInSubCategory(
      req.params.examId,
      pastQuestionsSubCategory._id
    );
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


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



/**
 * ENHANCED: Get complete user flow structure with track-specific topic information
 * @route   GET /api/exams/:examId/user-flow
 * @desc    Get complete user flow structure (subcategory → subjects & tracks → track-specific topics → content)
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
 * NEW: Get content/questions for a specific topic within a track
 * @route   GET /api/exams/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/topics/:topicId/items
 * @desc    Get content or questions for a specific topic within a track (step 8 final items)
 * @access  Public
 */
router.get('/:examId/subcategories/:subCategoryId/subjects/:subjectId/tracks/:trackId/topics/:topicId/items', async (req, res) => {
  try {
    const { limit, offset = 0 } = req.query;
    const { SubCategory } = require('../models/exam');
    
    // Get subcategory info to determine if it's past questions or content
    const subCategory = await SubCategory.findById(req.params.subCategoryId);
    
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }

    let items = [];
    let totalItems = 0;

    if (subCategory.name === 'pastquestions' || subCategory.contentType === 'json') {
      // Get questions for this topic and track
      const filters = {
        examId: req.params.examId,
        subjectId: req.params.subjectId,
        trackId: req.params.trackId,
        topicId: req.params.topicId
      };
      
      const allQuestions = await examModel.getQuestionsByFilters(filters);
      totalItems = allQuestions.length;
      
      // Apply pagination
      let questions = allQuestions;
      if (offset) {
        questions = questions.slice(parseInt(offset));
      }
      if (limit) {
        questions = questions.slice(0, parseInt(limit));
      }
      
      items = questions;
    } else {
      // Get content for this topic and track
      const filters = {
        examId: req.params.examId,
        subjectId: req.params.subjectId,
        trackId: req.params.trackId,
        subCategoryId: req.params.subCategoryId,
        topicId: req.params.topicId
      };
      
      const allContent = await examModel.getContentByFilters(filters);
      totalItems = allContent.length;
      
      // Apply pagination
      let content = allContent;
      if (offset) {
        content = content.slice(parseInt(offset));
      }
      if (limit) {
        content = content.slice(0, parseInt(limit));
      }
      
      items = content;
    }

    res.json({
      examId: req.params.examId,
      subCategoryId: req.params.subCategoryId,
      subjectId: req.params.subjectId,
      trackId: req.params.trackId,
      topicId: req.params.topicId,
      itemType: subCategory.name === 'pastquestions' ? 'questions' : 'content',
      totalItems,
      returnedItems: items.length,
      offset: parseInt(offset),
      limit: limit ? parseInt(limit) : null,
      items
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;