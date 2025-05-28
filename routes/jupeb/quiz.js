// routes/jupeb/quiz.js
const express = require('express');
const router = express.Router();
const JupebSubjectModel = require('../../models/jupeb/subject');
const JupebQuizModel = require('../../models/jupeb/quiz');
const mongoose = require('mongoose');

// Initialize models
const subjectModel = new JupebSubjectModel();
const quizModel = new JupebQuizModel();


/**
 * @route   POST /api/jupeb/quiz/questions
 * @desc    Get quiz questions based on parameters
 * @access  Public
 */
router.post('/questions', async (req, res) => {
  try {
    const { category, subjects, timer, maxQuestions } = req.body;
    
    if (!category || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request data. Category and subjects are required.' 
      });
    }
    
    // Validate each subject has required data
    for (const subject of subjects) {
      if (!subject.id || !subject.name) {
        return res.status(400).json({
          message: 'Each subject must have id and name properties',
        });
      }
      
      if (category === 'Past Question') {
        if (!subject.years || !Array.isArray(subject.years) || subject.years.length === 0) {
          return res.status(400).json({
            message: 'For Past Question category, each subject must have years array',
          });
        }
        
        if (!subject.topics || typeof subject.topics !== 'object') {
          return res.status(400).json({
            message: 'For Past Question category, each subject must have topics object',
          });
        }
        
        // Validate that each year has topics
        for (const year of subject.years) {
          if (!subject.topics[year] || !Array.isArray(subject.topics[year]) || subject.topics[year].length === 0) {
            return res.status(400).json({
              message: `Subject ${subject.name} must have topics for year ${year}`,
            });
          }
        }
        
      } else if (category === 'Note') {
        if (!subject.topics || !Array.isArray(subject.topics) || subject.topics.length === 0) {
          return res.status(400).json({
            message: 'For Note category, each subject must have topics array',
          });
        }
      }
    }
    
    // Array to store quiz questions
    let allQuestions = [];
    
    // Get questions based on category
    if (category === 'Past Question') {
      // For each subject, year, and topic, fetch questions
      for (const subject of subjects) {
        for (const year of subject.years) {
          for (const topic of subject.topics[year]) {
            try {
              const questions = await quizModel.getQuestionsBySubjectYearTopic(subject.name, year, topic);
              
              if (questions && questions.length > 0) {
                allQuestions = [...allQuestions, ...questions];
              }
            } catch (error) {
              console.error(`Error fetching questions for ${subject.name} ${year} ${topic}:`, error);
              // Continue with other topics even if one fails
            }
          }
        }
      }
    } else if (category === 'Note') {
      // For each subject and topic, fetch notes and associated questions
      for (const subject of subjects) {
        for (const topic of subject.topics) {
          try {
            const questions = await quizModel.getNoteQuestionsBySubjectTopic(subject.name, topic);
            
            if (questions && questions.length > 0) {
              allQuestions = [...allQuestions, ...questions];
            }
          } catch (error) {
            console.error(`Error fetching note questions for ${subject.name} ${topic}:`, error);
            // Continue with other topics even if one fails
          }
        }
      }
    }
    
    // If no questions found
    if (allQuestions.length === 0) {
      return res.status(404).json({
        message: 'No questions found for the selected criteria'
      });
    }
    
    // Shuffle questions for randomization
    allQuestions = shuffleArray(allQuestions);
    
    // Limit number of questions if requested by the client
    if (maxQuestions && Number.isInteger(Number(maxQuestions)) && Number(maxQuestions) > 0) {
      allQuestions = allQuestions.slice(0, Number(maxQuestions));
    }
    
    // Return the quiz data
    res.json({
      category,
      timer,
      subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      totalQuestions: allQuestions.length,
      questions: allQuestions
    });
    
  } catch (error) {
    console.error('Error in quiz questions API:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/quiz/results
 * @desc    Save quiz results
 * @access  Public
 */
router.post('/results', async (req, res) => {
  try {
    const { 
      userId, 
      category, 
      subjects, 
      totalQuestions, 
      correctAnswers,
      timeTaken,
      completedAt,
      topic
    } = req.body;
    
    if (!userId || !category || !subjects || !totalQuestions || correctAnswers === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields for quiz results' 
      });
    }
    
    // Calculate score percentage
    const scorePercentage = (correctAnswers / totalQuestions) * 100;
    
    // Save quiz result
    const result = await quizModel.saveQuizResult({
      userId,
      category,
      subjects,
      totalQuestions,
      correctAnswers,
      scorePercentage,
      timeTaken,
      completedAt: completedAt || new Date(),
      topic: topic || undefined
    });
    
    res.status(201).json({
      message: 'Quiz result saved successfully',
      result
    });
    
  } catch (error) {
    console.error('Error saving quiz results:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/quiz/questions/upload
 * @desc    Upload multiple quiz questions
 * @access  Private (Add authentication middleware as needed)
 */
router.post('/questions/upload', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request. Questions array is required.' 
      });
    }
    
    const processedQuestions = [];
    const duplicates = [];
    const errors = [];
    
    // Get JupebQuestion model
    const JupebQuestion = mongoose.model('JupebQuestion');
    
    // Process each question
    for (const [index, q] of questions.entries()) {
      try {
        // Validate required fields
        if (!q.subject || !q.year || !q.topic || !q.question || 
            !q.correct_answer || !q.incorrect_answers || !Array.isArray(q.incorrect_answers)) {
          errors.push({
            index,
            message: 'Missing or invalid required fields',
            question: q.question?.substring(0, 30) + '...' || 'Unknown'
          });
          continue;
        }
        
        // Check for duplicates
        const existingQuestion = await JupebQuestion.findOne({
          subject: q.subject,
          year: q.year,
          topic: q.topic,
          question: q.question
        });
        
        if (existingQuestion) {
          duplicates.push({
            index,
            id: existingQuestion._id.toString(),
            subject: q.subject,
            year: q.year,
            topic: q.topic,
            question: q.question.substring(0, 30) + '...'
          });
          continue;
        }
        
        // Create question object in the format expected by the new schema
        const questionData = {
          subject: q.subject,
          year: q.year,
          topic: q.topic,
          question: q.question,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          program: q.program || 'JUPEB',
          question_diagram: q.question_diagram || "assets/images/noDiagram.png",
          explanation_diagram_1: q.explanation_diagram_1 || "assets/images/noDiagram.png",
          explanation_diagram_2: q.explanation_diagram_2 || "assets/images/noDiagram.png",
          explanation_diagram_3: q.explanation_diagram_3 || "assets/images/noDiagram.png"
        };
        
        // Create new question document
        const newQuestion = new JupebQuestion(questionData);
        await newQuestion.save();
        
        processedQuestions.push({
          id: newQuestion._id.toString(),
          subject: q.subject,
          year: q.year,
          topic: q.topic,
          question: q.question.substring(0, 30) + '...'
        });
        
      } catch (error) {
        errors.push({
          index,
          message: error.message,
          question: q.question?.substring(0, 30) + '...' || 'Unknown'
        });
      }
    }
    
    // Return response with results
    res.status(201).json({
      message: `Successfully uploaded ${processedQuestions.length} questions with ${errors.length} errors and ${duplicates.length} duplicates skipped`,
      success: processedQuestions,
      duplicates,
      errors
    });
    
  } catch (error) {
    console.error('Error uploading questions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});


/**
 * @route   PUT /api/jupeb/quiz/questions/update
 * @desc    Update existing quiz questions
 * @access  Private (Add authentication middleware as needed)
 */
router.put('/questions/update', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request. Questions array is required.' 
      });
    }
    
    const updatedQuestions = [];
    const notFoundQuestions = [];
    const errors = [];
    
    // Get JupebQuestion model
    const JupebQuestion = mongoose.model('JupebQuestion');
    
    // Process each question
    for (const [index, q] of questions.entries()) {
      try {
        let existingQuestion;
        
        // If ID is provided, use that to find the question
        if (q.id) {
          existingQuestion = await JupebQuestion.findById(q.id);
        } 
        // If no ID but subject, year, topic, and question are provided, try to find by those criteria
        else if (q.subject && q.year && q.topic && q.question) {
          existingQuestion = await JupebQuestion.findOne({
            subject: q.subject,
            year: q.year,
            topic: q.topic,
            question: q.question
          });
        } else {
          errors.push({
            index,
            message: 'Either question ID or complete question criteria (subject, year, topic, question) are required for update',
            question: q.question?.substring(0, 30) + '...' || 'Unknown'
          });
          continue;
        }
        
        if (!existingQuestion) {
          notFoundQuestions.push({
            index,
            message: q.id ? `Question with ID ${q.id} not found` : 'Question not found with the given criteria',
            question: q.question?.substring(0, 30) + '...' || 'Unknown',
            criteria: q.id ? { id: q.id } : { subject: q.subject, year: q.year, topic: q.topic }
          });
          continue;
        }
        
        // Update fields if provided
        if (q.subject) existingQuestion.subject = q.subject;
        if (q.year) existingQuestion.year = q.year;
        if (q.topic) existingQuestion.topic = q.topic;
        if (q.question) existingQuestion.question = q.question;
        if (q.correct_answer) existingQuestion.correct_answer = q.correct_answer;
        
        // Update incorrect_answers if it's a valid array (with any number of items)
        if (q.incorrect_answers && Array.isArray(q.incorrect_answers)) {
          existingQuestion.incorrect_answers = q.incorrect_answers;
        } else if (q.incorrect_answers) {
          errors.push({
            index,
            message: 'incorrect_answers must be an array',
            question: q.question?.substring(0, 30) + '...' || existingQuestion.question.substring(0, 30) + '...'
          });
          continue;
        }
        
        // Update optional fields if provided
        if (q.hasOwnProperty('explanation')) existingQuestion.explanation = q.explanation;
        if (q.hasOwnProperty('difficulty')) existingQuestion.difficulty = q.difficulty;
        if (q.hasOwnProperty('program')) existingQuestion.program = q.program;
        if (q.hasOwnProperty('question_diagram')) existingQuestion.question_diagram = q.question_diagram;
        if (q.hasOwnProperty('explanation_diagram_1')) existingQuestion.explanation_diagram_1 = q.explanation_diagram_1;
        if (q.hasOwnProperty('explanation_diagram_2')) existingQuestion.explanation_diagram_2 = q.explanation_diagram_2;
        if (q.hasOwnProperty('explanation_diagram_3')) existingQuestion.explanation_diagram_3 = q.explanation_diagram_3;
        
        // Save the updated question
        await existingQuestion.save();
        
        updatedQuestions.push({
          id: existingQuestion._id.toString(),
          subject: existingQuestion.subject,
          year: existingQuestion.year,
          topic: existingQuestion.topic,
          question: existingQuestion.question.substring(0, 30) + '...'
        });
        
      } catch (error) {
        errors.push({
          index,
          message: error.message,
          question: q.question?.substring(0, 30) + '...' || 'Unknown',
          id: q.id
        });
      }
    }
    
    // Return response with results
    res.json({
      message: `Successfully updated ${updatedQuestions.length} questions with ${errors.length} errors and ${notFoundQuestions.length} not found`,
      success: updatedQuestions,
      notFound: notFoundQuestions,
      errors
    });
    
  } catch (error) {
    console.error('Error updating questions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/quiz/questions/upsert
 * @desc    Upload or update questions (create if not exists, update if exists)
 * @access  Private (Add authentication middleware as needed)
 */
router.post('/questions/upsert', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request. Questions array is required.' 
      });
    }
    
    const createdQuestions = [];
    const updatedQuestions = [];
    const errors = [];
    
    // Get JupebQuestion model
    const JupebQuestion = mongoose.model('JupebQuestion');
    
    // Process each question
    for (const [index, q] of questions.entries()) {
      try {
        // Validate required fields
        if (!q.subject || !q.year || !q.topic || !q.question || 
            !q.correct_answer || !q.incorrect_answers || !Array.isArray(q.incorrect_answers)) {
          errors.push({
            index,
            message: 'Missing or invalid required fields',
            question: q.question?.substring(0, 30) + '...' || 'Unknown'
          });
          continue;
        }
        
        // Check if question exists
        let existingQuestion;
        
        if (q.id) {
          existingQuestion = await JupebQuestion.findById(q.id);
        }
        
        if (!existingQuestion) {
          existingQuestion = await JupebQuestion.findOne({
            subject: q.subject,
            year: q.year,
            topic: q.topic,
            question: q.question
          });
        }
        
        // Create question object in the format expected by the schema
        const questionData = {
          subject: q.subject,
          year: q.year,
          topic: q.topic,
          question: q.question,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
          program: q.program || 'JUPEB',
          question_diagram: q.question_diagram || "assets/images/noDiagram.png",
          explanation_diagram_1: q.explanation_diagram_1 || "assets/images/noDiagram.png",
          explanation_diagram_2: q.explanation_diagram_2 || "assets/images/noDiagram.png",
          explanation_diagram_3: q.explanation_diagram_3 || "assets/images/noDiagram.png"
        };
        
        if (existingQuestion) {
          // Update existing question
          Object.keys(questionData).forEach(key => {
            existingQuestion[key] = questionData[key];
          });
          
          await existingQuestion.save();
          
          updatedQuestions.push({
            id: existingQuestion._id.toString(),
            subject: existingQuestion.subject,
            year: existingQuestion.year,
            topic: existingQuestion.topic,
            question: existingQuestion.question.substring(0, 30) + '...'
          });
          
        } else {
          // Create new question
          const newQuestion = new JupebQuestion(questionData);
          await newQuestion.save();
          
          createdQuestions.push({
            id: newQuestion._id.toString(),
            subject: newQuestion.subject,
            year: newQuestion.year,
            topic: newQuestion.topic,
            question: newQuestion.question.substring(0, 30) + '...'
          });
        }
        
      } catch (error) {
        errors.push({
          index,
          message: error.message,
          question: q.question?.substring(0, 30) + '...' || 'Unknown'
        });
      }
    }
    
    // Return response with results
    res.status(201).json({
      message: `Successfully processed ${createdQuestions.length + updatedQuestions.length} questions (${createdQuestions.length} created, ${updatedQuestions.length} updated) with ${errors.length} errors`,
      created: createdQuestions,
      updated: updatedQuestions,
      errors
    });
    
  } catch (error) {
    console.error('Error in upsert questions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jupeb/quiz/questions/:id
 * @desc    Get a single question by ID
 * @access  Private (Add authentication middleware as needed)
 */
router.get('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get JupebQuestion model
    const JupebQuestion = mongoose.model('JupebQuestion');
    
    // Find the question by ID
    const question = await JupebQuestion.findById(id).lean();
    
    if (!question) {
      return res.status(404).json({
        message: `Question with ID ${id} not found`
      });
    }
    
    // Return the question
    res.json({
      id: question._id.toString(),
      ...question,
      _id: undefined
    });
    
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jupeb/quiz/history/:userId
 * @desc    Get user's quiz history
 * @access  Private
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    const history = await quizModel.getUserQuizHistory(userId, parseInt(limit), parseInt(page));
    
    res.json(history);
    
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jupeb/quiz/note/:subject/:topic
 * @desc    Get note by subject and topic
 * @access  Public
 */
router.get('/note/:subject/:topic', async (req, res) => {
  try {
    const { subject, topic } = req.params;
    
    // Get JupebNote model
    const JupebNote = mongoose.model('JupebNote');
    
    const note = await JupebNote.findOne({
      subject: subject,
      topic: topic
    }).lean();
    
    if (!note) {
      return res.status(404).json({
        message: 'Note not found for the selected subject and topic'
      });
    }
    
    res.json({
      id: note._id.toString(),
      subject: note.subject,
      topic: note.topic,
      content: note.content,
      program: note.program,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
    
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Helper function to shuffle an array
function shuffleArray(array) {
  const newArray = [...array];  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

module.exports = router;