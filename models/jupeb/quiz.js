// models/jupeb/quiz.js
const mongoose = require('mongoose');

// Define the new Question Schema that matches app's format
const questionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: String,
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  question: {
    type: String,
    required: true
  },
  question_diagram: {
    type: String,
    default: "assets/images/noDiagram.png"
  },
  correct_answer: {
    type: String,
    required: true
  },
  incorrect_answers: {
    type: [String],
    required: true,
  },
  explanation: {
    type: String
  },
  explanation_diagram_1: {
    type: String,
    default: "assets/images/noDiagram.png"
  },
  explanation_diagram_2: {
    type: String,
    default: "assets/images/noDiagram.png"
  },
  explanation_diagram_3: {
    type: String,
    default: "assets/images/noDiagram.png"
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  program: {
    type: String,
    default: 'JUPEB'
  }
}, { timestamps: true });

// Add a compound index to prevent exact duplicates
questionSchema.index({ subject: 1, year: 1, topic: 1, question: 1 }, { unique: true });

// Define Note Schema
const noteSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  program: {
    type: String,
    default: 'JUPEB'
  }
}, { timestamps: true });

// Create a unique compound index for notes
noteSchema.index({ subject: 1, topic: 1 }, { unique: true });

// Define Quiz Result Schema
const quizResultSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Past Question', 'Note']
  },
  subjects: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }],
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  scorePercentage: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  topic: {
    type: String
  },
  program: {
    type: String,
    default: 'JUPEB'
  }
}, { timestamps: true });

// Create models safely - check if they already exist to prevent model overwrite errors
let JupebQuestion;
let JupebNote;
let JupebQuizResult;

try {
  JupebQuestion = mongoose.model('JupebQuestion');
} catch (e) {
  JupebQuestion = mongoose.model('JupebQuestion', questionSchema);
}

try {
  JupebNote = mongoose.model('JupebNote');
} catch (e) {
  JupebNote = mongoose.model('JupebNote', noteSchema);
}

try {
  JupebQuizResult = mongoose.model('JupebQuizResult');
} catch (e) {
  JupebQuizResult = mongoose.model('JupebQuizResult', quizResultSchema);
}

class JupebQuizModel {
  constructor() {
    // No initialization needed with Mongoose
  }

  /**
   * Get questions by subject, year, and topic
   * @param {string} subject - The subject name
   * @param {string} year - The year
   * @param {string} topic - The topic
   * @returns {Promise<Array>} - Array of questions
   */
  async getQuestionsBySubjectYearTopic(subject, year, topic) {
    try {
      const questions = await JupebQuestion.find({
        subject: subject,
        year: year,
        topic: topic
      }).lean();
      
      // Convert _id to id for consistency
      return questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined
      }));
    } catch (error) {
      console.error('Error getting questions by subject, year, and topic:', error);
      throw error;
    }
  }

  /**
   * Check if a question already exists
   * @param {Object} questionData - Question data including subject, year, topic, and question
   * @returns {Promise<boolean>} - Whether the question exists
   */
  async questionExists(questionData) {
    try {
      const count = await JupebQuestion.countDocuments({
        subject: questionData.subject,
        year: questionData.year,
        topic: questionData.topic,
        question: questionData.question
      });
    
      return count > 0;
    } catch (error) {
      console.error('Error checking question existence:', error);
      throw error;
    }
  }

  /**
   * Find a question by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} - Question or null if not found
   */
  async findQuestion(criteria) {
    try {
      const question = await JupebQuestion.findOne(criteria).lean();
      if (!question) return null;
      
      return {
        id: question._id.toString(),
        ...question,
        _id: undefined
      };
    } catch (error) {
      console.error('Error finding question:', error);
      throw error;
    }
  }

  /**
   * Get note questions by subject and topic
   * @param {string} subject - The subject name
   * @param {string} topic - The topic
   * @returns {Promise<Array>} - Array of questions
   */
  async getNoteQuestionsBySubjectTopic(subject, topic) {
    try {
      // First, get the note content for reference
      const note = await JupebNote.findOne({
        subject: subject,
        topic: topic
      }).lean();
      
      // Then get related questions from the questions collection
      const questions = await JupebQuestion.find({
        subject: subject,
        topic: topic
      }).lean();
      
      // Add note reference to questions if available
      const processedQuestions = questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined,
        noteReference: note ? note._id.toString() : null
      }));
      
      return processedQuestions;
    } catch (error) {
      console.error('Error getting note questions by subject and topic:', error);
      throw error;
    }
  }

  /**
   * Save a quiz result
   * @param {Object} resultData - Quiz result data
   * @returns {Promise<Object>} - Saved result
   */
  async saveQuizResult(resultData) {
    try {
      const quizResult = new JupebQuizResult(resultData);
      await quizResult.save();
      
      return {
        id: quizResult._id.toString(),
        ...quizResult.toObject(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error saving quiz result:', error);
      throw error;
    }
  }

  /**
   * Get user's quiz history
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of results to return
   * @param {number} page - Page number for pagination
   * @returns {Promise<Object>} - Paginated quiz history
   */
  async getUserQuizHistory(userId, limit = 10, page = 1) {
    try {
      // Calculate skip value for pagination
      const skip = (page - 1) * limit;
      
      // Get total count for pagination
      const total = await JupebQuizResult.countDocuments({ userId });
      
      // Get quiz results for the user with pagination
      const results = await JupebQuizResult.find({ userId })
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Process results to replace _id with id
      const processedResults = results.map(r => ({
        id: r._id.toString(),
        ...r,
        _id: undefined
      }));
      
      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      
      return {
        total,
        page,
        totalPages,
        limit,
        results: processedResults
      };
    } catch (error) {
      console.error('Error getting user quiz history:', error);
      throw error;
    }
  }

  /**
   * Create a new question
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} - Created question
   */
  async createQuestion(questionData) {
    try {
      // First check if the question already exists
      const exists = await this.questionExists(questionData);
      if (exists) {
        throw new Error('Question already exists');
      }
      
      // Create new question
      const question = new JupebQuestion(questionData);
      await question.save();
      
      return {
        id: question._id.toString(),
        ...question.toObject(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Update an existing question
   * @param {string} id - Question ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated question
   */
  async updateQuestion(id, updateData) {
    try {
      // Find and update the question
      const question = await JupebQuestion.findById(id);
      if (!question) {
        throw new Error(`Question with ID ${id} not found`);
      }
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          question[key] = updateData[key];
        }
      });
      
      // Save updated question
      await question.save();
      
      return {
        id: question._id.toString(),
        ...question.toObject(),
        _id: undefined
      };
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  /**
   * Create or update a question (upsert)
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} - Created or updated question and status
   */
  async upsertQuestion(questionData) {
    try {
      // Try to find by ID first if provided
      let existingQuestion = null;
      let isUpdate = false;
      
      if (questionData.id) {
        try {
          existingQuestion = await JupebQuestion.findById(questionData.id);
          if (existingQuestion) {
            isUpdate = true;
          }
        } catch (err) {
          // ID might be invalid, continue with other search criteria
        }
      }
      
      // If not found by ID, try by subject, year, topic, and question
      if (!existingQuestion && questionData.subject && questionData.year && 
          questionData.topic && questionData.question) {
        existingQuestion = await JupebQuestion.findOne({
          subject: questionData.subject,
          year: questionData.year,
          topic: questionData.topic,
          question: questionData.question
        });
        
        if (existingQuestion) {
          isUpdate = true;
        }
      }
      
      if (isUpdate && existingQuestion) {
        // Update existing question
        Object.keys(questionData).forEach(key => {
          if (key !== 'id' && questionData[key] !== undefined) {
            existingQuestion[key] = questionData[key];
          }
        });
        
        await existingQuestion.save();
        
        return {
          status: 'updated',
          question: {
            id: existingQuestion._id.toString(),
            ...existingQuestion.toObject(),
            _id: undefined
          }
        };
      } else {
        // Create new question
        // Remove the id field if it exists but doesn't match any question
        const { id, ...newQuestionData } = questionData;
        
        const newQuestion = new JupebQuestion(newQuestionData);
        await newQuestion.save();
        
        return {
          status: 'created',
          question: {
            id: newQuestion._id.toString(),
            ...newQuestion.toObject(),
            _id: undefined
          }
        };
      }
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        throw new Error('Duplicate question: A question with the same subject, year, topic, and question text already exists');
      }
      console.error('Error in upsert question:', error);
      throw error;
    }
  }

  /**
   * Delete a question
   * @param {string} id - Question ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteQuestion(id) {
    try {
      const result = await JupebQuestion.findByIdAndDelete(id);
      
      if (!result) {
        throw new Error(`Question with ID ${id} not found`);
      }
      
      return {
        success: true,
        id: id,
        message: 'Question deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  /**
   * Save or update a note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} - Saved or updated note and status
   */
  async upsertNote(noteData) {
    try {
      // Check if note exists
      let existingNote = null;
      let isUpdate = false;
      
      if (noteData.id) {
        try {
          existingNote = await JupebNote.findById(noteData.id);
          if (existingNote) {
            isUpdate = true;
          }
        } catch (err) {
          // ID might be invalid, continue with other search criteria
        }
      }
      
      if (!existingNote && noteData.subject && noteData.topic) {
        existingNote = await JupebNote.findOne({
          subject: noteData.subject,
          topic: noteData.topic
        });
        
        if (existingNote) {
          isUpdate = true;
        }
      }
      
      if (isUpdate && existingNote) {
        // Update existing note
        Object.keys(noteData).forEach(key => {
          if (key !== 'id' && noteData[key] !== undefined) {
            existingNote[key] = noteData[key];
          }
        });
        
        await existingNote.save();
        
        return {
          status: 'updated',
          note: {
            id: existingNote._id.toString(),
            ...existingNote.toObject(),
            _id: undefined
          }
        };
      } else {
        // Create new note
        // Remove the id field if it exists but doesn't match any note
        const { id, ...newNoteData } = noteData;
        
        const newNote = new JupebNote(newNoteData);
        await newNote.save();
        
        return {
          status: 'created',
          note: {
            id: newNote._id.toString(),
            ...newNote.toObject(),
            _id: undefined
          }
        };
      }
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        throw new Error('Duplicate note: A note with the same subject and topic already exists');
      }
      console.error('Error in upsert note:', error);
      throw error;
    }
  }
}

module.exports = JupebQuizModel;