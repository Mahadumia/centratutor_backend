// routes/questions.js - Past Questions Management Routes
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();

/**
 * @route   GET /api/questions
 * @desc    Get questions with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackId, 
      topicId, 
      year, 
      difficulty, 
      topicIds,
      limit,
      random 
    } = req.query;
    
    const filters = {};
    if (examId) filters.examId = examId;
    if (subjectId) filters.subjectId = subjectId;
    if (trackId) filters.trackId = trackId;
    if (topicId) filters.topicId = topicId;
    if (year) filters.year = year;
    if (difficulty) filters.difficulty = difficulty;
    if (topicIds) {
      // Support comma-separated topic IDs
      filters.topicIds = Array.isArray(topicIds) ? topicIds : topicIds.split(',');
    }
    
    let questions = await examModel.getQuestionsByFilters(filters);
    
    // Randomize if requested
    if (random === 'true') {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    
    // Limit results if specified
    if (limit) {
      questions = questions.slice(0, parseInt(limit));
    }
    
    res.json({
      totalQuestions: questions.length,
      questions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/questions/:questionId
 * @desc    Get question by ID
 * @access  Public
 */
router.get('/:questionId', async (req, res) => {
  try {
    const { Question } = require('../models/exam');
    const question = await Question.findById(req.params.questionId)
      .populate(['examId', 'subjectId', 'trackId', 'topicId']);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackId, 
      topicId, 
      year,
      question, 
      questionDiagram,
      correctAnswer,
      incorrectAnswers,
      explanation,
      difficulty,
      orderIndex
    } = req.body;
    
    if (!examId || !subjectId || !trackId || !topicId || !year || !question || !correctAnswer || !incorrectAnswers) {
      return res.status(400).json({ 
        message: 'examId, subjectId, trackId, topicId, year, question, correctAnswer, and incorrectAnswers are required' 
      });
    }
    
    if (!Array.isArray(incorrectAnswers) || incorrectAnswers.length === 0) {
      return res.status(400).json({ 
        message: 'incorrectAnswers must be a non-empty array' 
      });
    }
    
    const questionData = {
      examId,
      subjectId,
      trackId,
      topicId,
      year,
      question,
      questionDiagram: questionDiagram || 'assets/images/noDiagram.png',
      correctAnswer,
      incorrectAnswers,
      explanation: explanation || '',
      difficulty: difficulty || 'medium',
      orderIndex: orderIndex || 0
    };
    
    const newQuestion = await examModel.createQuestion(questionData);
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/questions/bulk
 * @desc    Create multiple questions from JSON
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { questions, examName } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    if (!examName) {
      return res.status(400).json({ message: 'examName is required' });
    }

    // Add examName to each question for processing
    const questionsWithExam = questions.map(q => ({
      ...q,
      examName: examName
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

/**
 * @route   POST /api/questions/practice-session
 * @desc    Generate a practice session with mixed questions
 * @access  Public
 */
router.post('/practice-session', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackIds, 
      topicIds, 
      questionCount = 20,
      difficulty,
      includeExplanations = true
    } = req.body;
    
    if (!examId || !subjectId) {
      return res.status(400).json({ 
        message: 'examId and subjectId are required' 
      });
    }

    // Get questions based on criteria
    const questions = await examModel.getQuestionsMultiSelection(
      examId,
      subjectId,
      trackIds,
      topicIds
    );

    let filteredQuestions = questions;
    
    // Filter by difficulty if specified
    if (difficulty) {
      filteredQuestions = questions.filter(q => q.difficulty === difficulty);
    }

    // Randomize and limit
    const randomizedQuestions = filteredQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, parseInt(questionCount));

    // Format for practice session
    const practiceQuestions = randomizedQuestions.map((q, index) => {
      // Shuffle answer options
      const allAnswers = [q.correctAnswer, ...q.incorrectAnswers];
      const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);
      
      const questionData = {
        id: q._id,
        questionNumber: index + 1,
        question: q.question,
        questionDiagram: q.questionDiagram,
        options: shuffledAnswers,
        correctAnswer: q.correctAnswer,
        topic: q.topicId?.displayName,
        year: q.year,
        difficulty: q.difficulty
      };

      // Include explanation if requested
      if (includeExplanations) {
        questionData.explanation = q.explanation;
      }

      return questionData;
    });

    res.json({
      sessionInfo: {
        examId,
        subjectId,
        selectedTracks: trackIds ? trackIds.length : 0,
        selectedTopics: topicIds ? topicIds.length : 0,
        totalAvailableQuestions: filteredQuestions.length,
        requestedQuestions: questionCount,
        actualQuestions: practiceQuestions.length,
        difficulty: difficulty || 'mixed'
      },
      questions: practiceQuestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/questions/stats/topic-distribution
 * @desc    Get question distribution by topics
 * @access  Public
 */
router.get('/stats/topic-distribution', async (req, res) => {
  try {
    const { examId, subjectId, trackId } = req.query;
    
    const { Question } = require('../models/exam');
    const matchQuery = { isActive: true };
    
    if (examId) matchQuery.examId = examId;
    if (subjectId) matchQuery.subjectId = subjectId;
    if (trackId) matchQuery.trackId = trackId;
    
    const stats = await Question.aggregate([
      { $match: matchQuery },
      { 
        $lookup: {
          from: 'topics',
          localField: 'topicId',
          foreignField: '_id',
          as: 'topic'
        }
      },
      { $unwind: '$topic' },
      {
        $group: {
          _id: {
            topicId: '$topicId',
            topicName: '$topic.displayName'
          },
          questionCount: { $sum: 1 },
          years: { $addToSet: '$year' },
          difficulties: { $push: '$difficulty' }
        }
      },
      {
        $project: {
          topicId: '$_id.topicId',
          topicName: '$_id.topicName',
          questionCount: 1,
          yearCount: { $size: '$years' },
          years: 1,
          difficultyCounts: {
            easy: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'easy'] }
                }
              }
            },
            medium: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'medium'] }
                }
              }
            },
            hard: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'hard'] }
                }
              }
            }
          }
        }
      },
      { $sort: { questionCount: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/questions/stats/year-distribution
 * @desc    Get question distribution by years/tracks
 * @access  Public
 */
router.get('/stats/year-distribution', async (req, res) => {
  try {
    const { examId, subjectId } = req.query;
    
    const { Question } = require('../models/exam');
    const matchQuery = { isActive: true };
    
    if (examId) matchQuery.examId = examId;
    if (subjectId) matchQuery.subjectId = subjectId;
    
    const stats = await Question.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$year',
          questionCount: { $sum: 1 },
          topics: { $addToSet: '$topicId' },
          difficulties: { $push: '$difficulty' }
        }
      },
      {
        $project: {
          year: '$_id',
          questionCount: 1,
          topicCount: { $size: '$topics' },
          difficultyCounts: {
            easy: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'easy'] }
                }
              }
            },
            medium: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'medium'] }
                }
              }
            },
            hard: {
              $size: {
                $filter: {
                  input: '$difficulties',
                  cond: { $eq: ['$$this', 'hard'] }
                }
              }
            }
          }
        }
      },
      { $sort: { year: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/questions/validate-upload
 * @desc    Validate question upload structure
 * @access  Private
 */
router.post('/validate-upload', async (req, res) => {
  try {
    const { examId, subjectId, trackId, topicId, questions } = req.body;
    
    if (!examId || !subjectId) {
      return res.status(400).json({ 
        message: 'examId and subjectId are required' 
      });
    }
    
    const validationResults = {};
    
    // Validate exam exists
    validationResults.examValid = await examModel.validateExamExists(examId);
    
    // Validate subject exists
    validationResults.subjectValid = await examModel.validateSubjectExists(examId, subjectId);
    
    if (trackId) {
      // Validate track exists - Fixed parameter order
      const { SubCategory } = require('../models/exam');
      const pastQuestionsSubCategory = await SubCategory.findOne({
        examId: examId,
        name: 'pastquestions'
      });
      
      if (pastQuestionsSubCategory) {
        validationResults.trackValid = await examModel.validateTrackExists(examId, pastQuestionsSubCategory._id, trackId);
      } else {
        validationResults.trackValid = false;
      }
    }
    
    if (topicId) {
      // Validate topic exists
      validationResults.topicValid = await examModel.validateTopicExists(examId, subjectId, topicId);
    }
    
    // Validate questions format if provided
    if (questions && Array.isArray(questions)) {
      const questionValidation = {
        totalQuestions: questions.length,
        validQuestions: 0,
        invalidQuestions: [],
        requiredFields: ['subject', 'year', 'topic', 'question', 'correct_answer', 'incorrect_answers']
      };
      
      questions.forEach((q, index) => {
        const missingFields = questionValidation.requiredFields.filter(field => !q[field]);
        
        if (missingFields.length === 0 && Array.isArray(q.incorrect_answers) && q.incorrect_answers.length > 0) {
          questionValidation.validQuestions++;
        } else {
          questionValidation.invalidQuestions.push({
            index,
            missingFields,
            incorrectAnswersValid: Array.isArray(q.incorrect_answers) && q.incorrect_answers.length > 0
          });
        }
      });
      
      validationResults.questionsValidation = questionValidation;
    }
    
    const structureValid = Object.keys(validationResults)
      .filter(key => key !== 'questionsValidation')
      .every(key => validationResults[key] === true);
    
    res.json({
      structureValid,
      questionsValid: validationResults.questionsValidation ? 
        validationResults.questionsValidation.invalidQuestions.length === 0 : true,
      results: validationResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/questions/:questionId
 * @desc    Update a question
 * @access  Private
 */
router.put('/:questionId', async (req, res) => {
  try {
    const updates = req.body;
    
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
 * @route   DELETE /api/questions/:questionId
 * @desc    Delete a question (soft delete)
 * @access  Private
 */
router.delete('/:questionId', async (req, res) => {
  try {
    const { Question } = require('../models/exam');
    const result = await Question.findByIdAndUpdate(
      req.params.questionId,
      { isActive: false },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/questions/export/:examId/:subjectId
 * @desc    Export questions as JSON for backup/migration
 * @access  Private
 */
router.get('/export/:examId/:subjectId', async (req, res) => {
  try {
    const { trackIds, topicIds, format = 'json' } = req.query;
    
    const filters = {
      examId: req.params.examId,
      subjectId: req.params.subjectId
    };
    
    if (trackIds) {
      filters.trackIds = Array.isArray(trackIds) ? trackIds : trackIds.split(',');
    }
    
    if (topicIds) {
      filters.topicIds = Array.isArray(topicIds) ? topicIds : topicIds.split(',');
    }
    
    const questions = await examModel.getQuestionsByFilters(filters);
    
    // Format for export
    const exportData = {
      exportInfo: {
        examId: req.params.examId,
        subjectId: req.params.subjectId,
        exportDate: new Date().toISOString(),
        totalQuestions: questions.length
      },
      questions: questions.map(q => ({
        subject: q.subjectId.name,
        year: q.year,
        topic: q.topicId.displayName,
        question: q.question,
        question_diagram: q.questionDiagram,
        correct_answer: q.correctAnswer,
        incorrect_answers: q.incorrectAnswers,
        explanation: q.explanation,
        difficulty: q.difficulty
      }))
    };
    
    // Set appropriate headers for download
    const filename = `questions_export_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/json');
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/questions/search
 * @desc    Advanced search for questions
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    const { 
      examId, 
      subjectId, 
      trackIds, 
      topicIds, 
      searchText, 
      difficulty, 
      yearRange,
      limit = 50,
      offset = 0
    } = req.body;
    
    const { Question } = require('../models/exam');
    
    // Build match query
    const matchQuery = { isActive: true };
    
    if (examId) matchQuery.examId = examId;
    if (subjectId) matchQuery.subjectId = subjectId;
    if (trackIds && trackIds.length > 0) matchQuery.trackId = { $in: trackIds };
    if (topicIds && topicIds.length > 0) matchQuery.topicId = { $in: topicIds };
    if (difficulty) matchQuery.difficulty = difficulty;
    
    // Year range filter
    if (yearRange && yearRange.from && yearRange.to) {
      matchQuery.year = { 
        $gte: yearRange.from.toString(), 
        $lte: yearRange.to.toString() 
      };
    }
    
    // Text search
    if (searchText) {
      matchQuery.$or = [
        { question: { $regex: searchText, $options: 'i' } },
        { correctAnswer: { $regex: searchText, $options: 'i' } },
        { explanation: { $regex: searchText, $options: 'i' } }
      ];
    }
    
    // Execute search with pagination
    const questions = await Question.find(matchQuery)
      .populate(['examId', 'subjectId', 'trackId', 'topicId'])
      .sort({ year: -1, orderIndex: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Question.countDocuments(matchQuery);
    
    res.json({
      questions,
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
        topicIds,
        searchText,
        difficulty,
        yearRange
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/questions/random/:examId/:subjectId
 * @desc    Get random questions for quick practice
 * @access  Public
 */
router.get('/random/:examId/:subjectId', async (req, res) => {
  try {
    const { count = 10, difficulty, topicIds } = req.query;
    
    const { Question } = require('../models/exam');
    
    const matchQuery = {
      examId: req.params.examId,
      subjectId: req.params.subjectId,
      isActive: true
    };
    
    if (difficulty) matchQuery.difficulty = difficulty;
    if (topicIds) {
      const topicIdArray = Array.isArray(topicIds) ? topicIds : topicIds.split(',');
      matchQuery.topicId = { $in: topicIdArray };
    }
    
    const randomQuestions = await Question.aggregate([
      { $match: matchQuery },
      { $sample: { size: parseInt(count) } },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $lookup: {
          from: 'tracks',
          localField: 'trackId',
          foreignField: '_id',
          as: 'track'
        }
      },
      {
        $lookup: {
          from: 'topics',
          localField: 'topicId',
          foreignField: '_id',
          as: 'topic'
        }
      }
    ]);
    
    res.json({
      totalQuestions: randomQuestions.length,
      questions: randomQuestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;