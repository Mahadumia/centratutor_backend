// models/exam.js - UPDATED: Enhanced with TopicAssignment schema for weeks/days/semesters topic management
const mongoose = require('mongoose');

// Exam Schema - Main exam categories like JUPEB, WAEC, etc.
const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: function() {
      return `assets/images/${this.name.toLowerCase()}.png`;
    }
  }
}, { timestamps: true });

// Subject Schema - Global subjects for each exam
const subjectSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: function() {
      return `assets/images/subjects/${this.name.toLowerCase()}.png`;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// ENHANCED: Topic Schema - Global approved topics for each exam-subject combination
const topicSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // NEW: Track which tracks this topic is available for
  availableForTracks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  }],
  // NEW: Metadata for topic management
  metadata: {
    createdBy: String,
    approvedBy: String,
    approvalDate: Date,
    tags: [String],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all'
    }
  }
}, { timestamps: true });

// NEW: TopicAssignment Schema - For weeks/days/semesters topic assignments
const topicAssignmentSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
    index: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true,
    index: true
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
    index: true
  },
  timePeriod: {
    type: String,
    enum: ['week', 'day', 'semester'],
    required: true,
    index: true
  },
  periodValue: {
    type: Number,
    required: true,
    min: 1,
    index: true
  },
  orderIndex: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Track Schema - Tracks per exam-subcategory combination
const trackSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  trackType: {
    type: String,
    enum: ['years', 'days', 'weeks', 'months', 'semester', 'custom'],
    required: true
  },
  duration: {
    type: Number,
    default: null
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// SubCategory Schema
const subCategorySchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: function() {
      return `assets/images/subcategories/${this.name}.png`;
    }
  },
  routePath: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['file', 'json'],
    default: 'file'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  orderIndex: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// SubjectAvailability Schema
const subjectAvailabilitySchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// ENHANCED: Content Schema with MANDATORY topic validation
const contentSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
    index: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true,
    index: true
  },
  // NEW: MANDATORY topic field - must match approved global topics
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'video', 'audio', 'image', 'document', 'link'],
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: null
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Question Schema - Enhanced with topic validation
const questionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: true,
    index: true
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true,
    index: true
  },
  year: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  questionDiagram: {
    type: String,
    default: 'assets/images/noDiagram.png'
  },
  correctAnswer: {
    type: String,
    required: true
  },
  incorrectAnswers: [{
    type: String,
    required: true
  }],
  explanation: {
    type: String,
    default: ''
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  orderIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Enhanced indexes
subjectSchema.index({ examId: 1, name: 1 }, { unique: true });
topicSchema.index({ examId: 1, subjectId: 1, name: 1 }, { unique: true });
topicAssignmentSchema.index({ examId: 1, subjectId: 1, trackId: 1, subCategoryId: 1, timePeriod: 1, periodValue: 1, topicId: 1 }, { unique: true });
trackSchema.index({ examId: 1, subCategoryId: 1, name: 1 }, { unique: true });
subjectAvailabilitySchema.index({ examId: 1, subjectId: 1, subCategoryId: 1 }, { unique: true });
contentSchema.index({ examId: 1, subjectId: 1, trackId: 1, subCategoryId: 1, topicId: 1, name: 1 }, { unique: true });
questionSchema.index({ examId: 1, subjectId: 1, trackId: 1, topicId: 1, year: 1 });
subCategorySchema.index({ examId: 1, name: 1 }, { unique: true });

// Create models
const Exam = mongoose.model('Exam', examSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Topic = mongoose.model('Topic', topicSchema);
const TopicAssignment = mongoose.model('TopicAssignment', topicAssignmentSchema);
const Track = mongoose.model('Track', trackSchema);
const SubCategory = mongoose.model('SubCategory', subCategorySchema);
const SubjectAvailability = mongoose.model('SubjectAvailability', subjectAvailabilitySchema);
const Content = mongoose.model('Content', contentSchema);
const Question = mongoose.model('Question', questionSchema);

class ExamModel {
  // ========== NEW: TOPIC ASSIGNMENT METHODS FOR WEEKS/DAYS/SEMESTERS ==========
  
  /**
   * Create topic assignments for a specific time period
   */
  async createTopicAssignments(contextData, timePeriod, periodValue, topics) {
    try {
      const { exam, subject, track, subCategory } = contextData;
      const results = { created: [], errors: [], duplicates: [] };
      
      // Validate all topics first
      const topicValidationResults = await this.validateTopicsForContext(topics, exam._id, subject._id);
      
      if (topicValidationResults.invalidTopics.length > 0) {
        throw new Error(`Invalid topics found: ${topicValidationResults.invalidTopics.map(t => t.topicName).join(', ')}`);
      }
      
      // Delete existing assignments for this period
      await TopicAssignment.updateMany(
        {
          examId: exam._id,
          subjectId: subject._id,
          trackId: track._id,
          subCategoryId: subCategory._id,
          timePeriod,
          periodValue
        },
        { isActive: false }
      );
      
      // Create new assignments
      for (const [index, validatedTopic] of topicValidationResults.validTopics.entries()) {
        try {
          const assignment = new TopicAssignment({
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            subCategoryId: subCategory._id,
            topicId: validatedTopic.topicId,
            timePeriod,
            periodValue,
            orderIndex: index,
            isActive: true
          });
          
          await assignment.save();
          results.created.push({
            id: assignment._id,
            topicName: validatedTopic.topicName,
            orderIndex: index
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              topicName: validatedTopic.topicName,
              reason: 'Topic already assigned to this period'
            });
          } else {
            results.errors.push({
              topicName: validatedTopic.topicName,
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating topic assignments:', error);
      throw error;
    }
  }
  
  /**
   * Get topic assignments for a specific time period
   */
  async getTopicAssignments(examId, subjectId, trackId, subCategoryId, timePeriod, periodValue) {
    try {
      return await TopicAssignment.find({
        examId,
        subjectId,
        trackId,
        subCategoryId,
        timePeriod,
        periodValue,
        isActive: true
      })
      .populate('topicId')
      .sort({ orderIndex: 1 });
    } catch (error) {
      console.error('Error getting topic assignments:', error);
      throw error;
    }
  }
  
  /**
   * Check if topic assignments exist for a specific time period
   */
  async checkExistingTopicAssignments(examId, subjectId, trackId, subCategoryId, timePeriod, periodValue) {
    try {
      const existingAssignments = await TopicAssignment.find({
        examId,
        subjectId,
        trackId,
        subCategoryId,
        timePeriod,
        periodValue,
        isActive: true
      });
      
      return {
        exists: existingAssignments.length > 0,
        count: existingAssignments.length,
        assignments: existingAssignments
      };
    } catch (error) {
      console.error('Error checking existing topic assignments:', error);
      return { exists: false, count: 0, assignments: [] };
    }
  }
  
  /**
   * Validate multiple topics for context
   */
  async validateTopicsForContext(topics, examId, subjectId) {
    try {
      const validationResults = {
        validTopics: [],
        invalidTopics: [],
        summary: {
          total: topics.length,
          valid: 0,
          invalid: 0
        }
      };

      // Get approved topics for this exam-subject
      const approvedTopics = await this.getApprovedTopicsForSubject(examId, subjectId);
      const approvedTopicNames = new Set(approvedTopics.map(topic => topic.name.trim().toLowerCase()));

      // Validate each topic
      for (const [index, topicName] of topics.entries()) {
        if (!topicName || typeof topicName !== 'string') {
          validationResults.invalidTopics.push({
            index,
            topicName: topicName,
            error: 'Topic name must be a non-empty string'
          });
          continue;
        }

        const normalizedTopicName = topicName.trim().toLowerCase();

        if (approvedTopicNames.has(normalizedTopicName)) {
          // Find the actual topic object
          const approvedTopic = approvedTopics.find(topic => 
            topic.name.trim().toLowerCase() === normalizedTopicName
          );

          validationResults.validTopics.push({
            index,
            topicName: topicName.trim(),
            topicId: approvedTopic._id,
            displayName: approvedTopic.displayName
          });
        } else {
          validationResults.invalidTopics.push({
            index,
            topicName: topicName,
            error: `Topic "${topicName}" is not in the approved list for this exam-subject`
          });
        }
      }

      validationResults.summary.valid = validationResults.validTopics.length;
      validationResults.summary.invalid = validationResults.invalidTopics.length;

      return validationResults;
    } catch (error) {
      console.error('Error validating topics for context:', error);
      throw error;
    }
  }
  
  /**
   * Get questions for a topic across all years (for weeks/days/semesters)
   */
  async getQuestionsForTopicAcrossYears(examId, subjectId, topicId, trackId = null) {
    try {
      const query = {
        examId,
        subjectId,
        topicId,
        isActive: true
      };
      
      // If trackId provided, use it; otherwise get from any track
      if (trackId) {
        query.trackId = trackId;
      }
      
      const questions = await Question.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'topicId'])
        .sort({ year: -1, _id: 1 }); // Year DESC, then by ID for consistency
      
      // Group by year and randomize within each year
      const questionsByYear = {};
      questions.forEach(question => {
        const year = question.year;
        if (!questionsByYear[year]) {
          questionsByYear[year] = [];
        }
        questionsByYear[year].push(question);
      });
      
      // Randomize questions within each year group
      Object.keys(questionsByYear).forEach(year => {
        questionsByYear[year] = this.shuffleArray(questionsByYear[year]);
      });
      
      // Flatten back to array maintaining year order (newest first)
      const sortedYears = Object.keys(questionsByYear).sort((a, b) => parseInt(b) - parseInt(a));
      const finalQuestions = [];
      
      sortedYears.forEach(year => {
        finalQuestions.push(...questionsByYear[year]);
      });
      
      return {
        totalQuestions: finalQuestions.length,
        yearBreakdown: Object.keys(questionsByYear).map(year => ({
          year,
          count: questionsByYear[year].length
        })).sort((a, b) => parseInt(b.year) - parseInt(a.year)),
        questions: finalQuestions
      };
    } catch (error) {
      console.error('Error getting questions for topic across years:', error);
      throw error;
    }
  }
  
  /**
   * Utility method to shuffle array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ========== ENHANCED BULK QUESTION CREATION METHODS (UNCHANGED) ==========
  
  /**
   * ENHANCED: Create bulk questions with better validation and duplicate handling
   */
  async createBulkQuestionsWithValidation(questionsArray) {
    try {
      const results = { created: [], errors: [], duplicates: [], skipped: [] };
      
      console.log(`🚀 Processing ${questionsArray.length} questions for bulk creation...`);
      
      for (const [index, questionData] of questionsArray.entries()) {
        try {
          // Check if question was pre-validated (from route validation)
          if (questionData._preValidated && questionData._preValidated.contextResolved) {
            // Use pre-validated context and topic data
            const { contextResolved } = questionData._preValidated;
            const topicId = questionData._preValidated.topicId;
            
            console.log(`📝 Processing question ${index + 1}: Using pre-validated context`);
            
            if (!contextResolved.exam?.id || !contextResolved.subject?.id || !contextResolved.track?.id || !topicId) {
              console.error(`❌ Missing required context data for question ${index}:`, {
                exam: contextResolved.exam?.id ? 'Present' : 'Missing',
                subject: contextResolved.subject?.id ? 'Present' : 'Missing',
                track: contextResolved.track?.id ? 'Present' : 'Missing',
                topicId: topicId ? 'Present' : 'Missing'
              });
              
              results.errors.push({
                index,
                error: 'Incomplete pre-validated context data'
              });
              continue;
            }

            // ENHANCED: Check for duplicates before creating
            const duplicateCheck = await this.checkForDuplicateQuestion(
              contextResolved.exam.id,
              contextResolved.subject.id,
              contextResolved.track.id,
              topicId,
              questionData.question,
              questionData.year || questionData.metadata?.uploadYear || questionData.metadata?.week || questionData.metadata?.day || questionData.metadata?.semester
            );

            if (duplicateCheck.exists) {
              console.log(`⚠️ Duplicate question found for ${index + 1}, skipping...`);
              results.duplicates.push({
                index,
                reason: 'Question already exists with same content',
                existingId: duplicateCheck.questionId,
                timePeriod: duplicateCheck.timePeriod
              });
              continue;
            }

            const completeQuestionData = {
              examId: contextResolved.exam.id,
              subjectId: contextResolved.subject.id,
              trackId: contextResolved.track.id,
              topicId: topicId,
              year: questionData.year,
              question: questionData.question,
              questionDiagram: questionData.question_diagram || 'assets/images/noDiagram.png',
              correctAnswer: questionData.correct_answer,
              incorrectAnswers: questionData.incorrect_answers,
              explanation: questionData.explanation || '',
              difficulty: questionData.difficulty || 'medium',
              orderIndex: questionData.metadata?.orderIndex || index,
              metadata: {
                ...questionData.metadata,
                createdVia: 'bulk_upload_pre_validated',
                uploadTimestamp: new Date()
              }
            };

            const newQuestion = await this.createQuestion(completeQuestionData);
            results.created.push({
              id: newQuestion._id,
              topic: newQuestion.topicId,
              year: newQuestion.year,
              trackUsed: contextResolved.track.name,
              timePeriod: questionData.metadata?.timePeriod
            });
            
            console.log(`✅ Successfully created question ${index + 1}`);
            
          } else {
            // Fallback: Manual context resolution for non-pre-validated questions
            console.log(`📝 Processing question ${index + 1}: Manual context resolution`);
            
            const exam = await Exam.findOne({ name: questionData.examName?.toUpperCase() });
            const subject = await Subject.findOne({ 
              examId: exam?._id, 
              name: questionData.subject 
            });
            
            const pastQuestionsSubCategory = await SubCategory.findOne({
              examId: exam?._id,
              name: 'pastquestions'
            });
            
            // Enhanced track resolution with multiple fallback strategies
            let track = null;
            
            // Strategy 1: Use trackName if provided
            if (questionData.trackName) {
              track = await Track.findOne({ 
                examId: exam?._id, 
                subCategoryId: pastQuestionsSubCategory?._id,
                name: questionData.trackName,
                isActive: true
              });
            }
            
            // Strategy 2: Find by year match (legacy support)
            if (!track && questionData.year) {
              track = await Track.findOne({ 
                examId: exam?._id, 
                subCategoryId: pastQuestionsSubCategory?._id,
                name: questionData.year,
                isActive: true
              });
            }
            
            // Strategy 3: Find any years-type track
            if (!track) {
              track = await Track.findOne({ 
                examId: exam?._id, 
                subCategoryId: pastQuestionsSubCategory?._id,
                trackType: 'years',
                isActive: true
              });
            }
            
            // Validate topic
            let topicId = null;
            if (questionData.topic) {
              const topicValidation = await this.validateTopicForContent(
                exam?._id,
                subject?._id,
                questionData.topic
              );
              
              if (!topicValidation.isValid) {
                throw new Error(`Invalid topic "${questionData.topic}": ${topicValidation.message}`);
              }
              topicId = topicValidation.topicId;
            }

            if (!exam || !subject || !track || !topicId) {
              console.error(`❌ Manual context resolution failed for question ${index}:`, {
                exam: exam?.name || 'Not found',
                subject: subject?.name || 'Not found',
                track: track?.name || 'Not found',
                topicId: topicId ? 'Found' : 'Not found'
              });
              
              results.errors.push({
                index,
                error: 'Manual context or topic validation failed'
              });
              continue;
            }

            // ENHANCED: Check for duplicates before creating
            const duplicateCheck = await this.checkForDuplicateQuestion(
              exam._id,
              subject._id,
              track._id,
              topicId,
              questionData.question,
              questionData.year
            );

            if (duplicateCheck.exists) {
              console.log(`⚠️ Duplicate question found for ${index + 1} (manual resolution), skipping...`);
              results.duplicates.push({
                index,
                reason: 'Question already exists with same content',
                existingId: duplicateCheck.questionId,
                year: questionData.year
              });
              continue;
            }

            const completeQuestionData = {
              examId: exam._id,
              subjectId: subject._id,
              trackId: track._id,
              topicId: topicId,
              year: questionData.year,
              question: questionData.question,
              questionDiagram: questionData.question_diagram || 'assets/images/noDiagram.png',
              correctAnswer: questionData.correct_answer,
              incorrectAnswers: questionData.incorrect_answers,
              explanation: questionData.explanation || '',
              difficulty: questionData.difficulty || 'medium',
              orderIndex: questionData.orderIndex || index,
              metadata: {
                ...questionData.metadata,
                createdVia: 'bulk_upload_manual_resolution',
                uploadTimestamp: new Date()
              }
            };

            const newQuestion = await this.createQuestion(completeQuestionData);
            results.created.push({
              id: newQuestion._id,
              topic: newQuestion.topicId,
              year: newQuestion.year,
              trackUsed: track.name
            });
            
            console.log(`✅ Successfully created question ${index + 1} via manual resolution`);
          }
          
        } catch (error) {
          console.error(`❌ Error creating question ${index + 1}:`, error.message);
          results.errors.push({
            index,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Bulk question creation completed: ${results.created.length} created, ${results.errors.length} errors, ${results.duplicates.length} duplicates`);
      return results;
    } catch (error) {
      console.error('❌ Error in createBulkQuestionsWithValidation:', error);
      throw error;
    }
  }

  /**
   * NEW: Check for duplicate questions
   */
  async checkForDuplicateQuestion(examId, subjectId, trackId, topicId, questionText, timePeriodValue) {
    try {
      // Clean and normalize question text for comparison
      const normalizedQuestion = questionText.trim().toLowerCase().replace(/\s+/g, ' ');
      
      // Build query to find potential duplicates
      const query = {
        examId,
        subjectId,
        trackId,
        topicId,
        isActive: true
      };

      // Add time period filter if provided
      if (timePeriodValue) {
        // Try different time period fields
        query.$or = [
          { year: timePeriodValue.toString() },
          { 'metadata.week': parseInt(timePeriodValue) },
          { 'metadata.day': parseInt(timePeriodValue) },
          { 'metadata.semester': parseInt(timePeriodValue) },
          { 'metadata.uploadYear': timePeriodValue.toString() }
        ];
      }

      const existingQuestions = await Question.find(query);
      
      // Check for exact question text matches
      for (const existingQuestion of existingQuestions) {
        const existingNormalized = existingQuestion.question.trim().toLowerCase().replace(/\s+/g, ' ');
        
        if (existingNormalized === normalizedQuestion) {
          return {
            exists: true,
            questionId: existingQuestion._id,
            timePeriod: existingQuestion.year || existingQuestion.metadata?.week || existingQuestion.metadata?.day || existingQuestion.metadata?.semester,
            existingQuestion: existingQuestion
          };
        }
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking for duplicate question:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * NEW: Get questions with better filtering (no difficulty/limit constraints)
   */
  async getQuestionsByFilters(filters) {
    try {
      const query = { isActive: true };
      
      if (filters.examId) query.examId = filters.examId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.trackId) query.trackId = filters.trackId;
      if (filters.topicId) query.topicId = filters.topicId;
      if (filters.year) query.year = filters.year;
      
      // Enhanced topic filtering
      if (filters.topicIds && filters.topicIds.length > 0) {
        query.topicId = { $in: filters.topicIds };
      }

      // Time period metadata filters
      if (filters.week) query['metadata.week'] = filters.week;
      if (filters.day) query['metadata.day'] = filters.day;
      if (filters.semester) query['metadata.semester'] = filters.semester;

      return await Question.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'topicId'])
        .sort({ orderIndex: 1, _id: 1 });
    } catch (error) {
      console.error('Error getting questions by filters:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Get topics with questions for track (no constraints)
   */
  async getTopicsWithQuestionsForTrack(examId, subjectId, trackId) {
    try {
      // Get ALL questions for the specific track (removed any filtering constraints)
      const questions = await Question.find({
        examId,
        subjectId,
        trackId,
        isActive: true
      }).populate('topicId');

      // Extract unique topics from the questions
      const topicsWithQuestions = [];
      const topicIds = new Set();

      questions.forEach(questionItem => {
        if (questionItem.topicId && !topicIds.has(questionItem.topicId._id.toString())) {
          topicIds.add(questionItem.topicId._id.toString());
          topicsWithQuestions.push({
            ...questionItem.topicId.toObject(),
            questionCount: 0 // Will be calculated below
          });
        }
      });

      // Count questions per topic
      topicsWithQuestions.forEach(topic => {
        topic.questionCount = questions.filter(q => 
          q.topicId._id.toString() === topic._id.toString()
        ).length;
      });

      // Sort by orderIndex and name
      topicsWithQuestions.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) {
          return (a.orderIndex || 0) - (b.orderIndex || 0);
        }
        return a.name.localeCompare(b.name);
      });

      return topicsWithQuestions;
    } catch (error) {
      console.error('Error getting topics with questions for track:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Get topics with content for track (no constraints)
   */
  async getTopicsWithContentForTrack(examId, subjectId, trackId, subCategoryId) {
    try {
      // Get ALL content for the specific track (removed any filtering constraints)
      const content = await Content.find({
        examId,
        subjectId,
        trackId,
        subCategoryId,
        isActive: true
      }).populate('topicId');

      // Extract unique topics from the content
      const topicsWithContent = [];
      const topicIds = new Set();

      content.forEach(contentItem => {
        if (contentItem.topicId && !topicIds.has(contentItem.topicId._id.toString())) {
          topicIds.add(contentItem.topicId._id.toString());
          topicsWithContent.push({
            ...contentItem.topicId.toObject(),
            contentCount: 0 // Will be calculated below
          });
        }
      });

      // Count content per topic
      topicsWithContent.forEach(topic => {
        topic.contentCount = content.filter(c => 
          c.topicId._id.toString() === topic._id.toString()
        ).length;
      });

      // Sort by orderIndex and name
      topicsWithContent.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) {
          return (a.orderIndex || 0) - (b.orderIndex || 0);
        }
        return a.name.localeCompare(b.name);
      });

      return topicsWithContent;
    } catch (error) {
      console.error('Error getting topics with content for track:', error);
      throw error;
    }
  }

  /**
   * Get content grouped by track-specific topics
   */
  async getContentGroupedByTrackTopics(examId, subjectId, trackId, subCategoryId) {
    try {
      // Get topics that have content for this track
      const topicsWithContent = await this.getTopicsWithContentForTrack(
        examId, subjectId, trackId, subCategoryId
      );

      // Get all content for the track
      const allContent = await Content.find({
        examId,
        subjectId,
        trackId,
        subCategoryId,
        isActive: true
      }).populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId'])
        .sort({ orderIndex: 1, name: 1 });

      // Group content by topics (only topics that have content)
      const contentByTopics = {};

      topicsWithContent.forEach(topic => {
        contentByTopics[topic._id.toString()] = {
          topic: topic,
          content: allContent.filter(content => 
            content.topicId._id.toString() === topic._id.toString()
          )
        };
      });

      return {
        topicsWithContent: topicsWithContent,
        contentByTopics: Object.values(contentByTopics),
        totalTopics: topicsWithContent.length,
        totalContent: allContent.length
      };
    } catch (error) {
      console.error('Error getting content grouped by track topics:', error);
      throw error;
    }
  }

  // ========== TOPIC MANAGEMENT METHODS ==========
  
  /**
   * Validate if a topic exists and is approved for the given context
   */
  async validateTopicForContent(examId, subjectId, topicName) {
    try {
      const topic = await Topic.findOne({
        examId,
        subjectId,
        name: topicName.trim(),
        isActive: true
      });
      
      return {
        isValid: !!topic,
        topicId: topic?._id,
        topic: topic,
        message: topic ? 'Topic is valid' : `Topic "${topicName}" is not in the approved list for this subject`
      };
    } catch (error) {
      console.error('Error validating topic:', error);
      return {
        isValid: false,
        topicId: null,
        topic: null,
        message: 'Error validating topic'
      };
    }
  }

  /**
   * Get all approved topics for a subject
   */
  async getApprovedTopicsForSubject(examId, subjectId) {
    try {
      return await Topic.find({
        examId,
        subjectId,
        isActive: true
      })
      .populate(['examId', 'subjectId'])
      .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting approved topics:', error);
      throw error;
    }
  }

  /**
   * NEW: Get topic statistics across exam
   */
  async getTopicStatistics(examId) {
    try {
      const subjects = await Subject.find({ examId, isActive: true });
      const stats = [];

      for (const subject of subjects) {
        const topicCount = await Topic.countDocuments({
          examId,
          subjectId: subject._id,
          isActive: true
        });

        const contentCount = await Content.countDocuments({
          examId,
          subjectId: subject._id,
          isActive: true
        });

        const questionCount = await Question.countDocuments({
          examId,
          subjectId: subject._id,
          isActive: true
        });

        stats.push({
          subject: {
            id: subject._id,
            name: subject.name,
            displayName: subject.displayName
          },
          topicCount,
          contentCount,
          questionCount,
          averageContentPerTopic: topicCount > 0 ? (contentCount / topicCount).toFixed(2) : 0,
          averageQuestionsPerTopic: topicCount > 0 ? (questionCount / topicCount).toFixed(2) : 0
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting topic statistics:', error);
      throw error;
    }
  }

  /**
   * NEW: Enhanced content creation with mandatory topic validation
   */
  async createBulkContentWithValidation(contentArray) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      // First, validate all topics
      const validationResults = {
        validItems: [],
        invalidItems: [],
        summary: {
          total: contentArray.length,
          valid: 0,
          invalid: 0,
          uniqueTopics: new Set(),
          missingTopics: new Set()
        }
      };

      for (const [index, contentData] of contentArray.entries()) {
        const { examName, subjectName, topicName } = contentData;
        
        if (!topicName) {
          validationResults.invalidItems.push({
            index,
            name: contentData.name || 'Unknown',
            error: 'Topic name is required',
            examName,
            subjectName,
            topicName: null
          });
          continue;
        }

        // Find exam and subject
        const exam = await Exam.findOne({ name: examName?.toUpperCase() });
        const subject = await Subject.findOne({ 
          examId: exam?._id, 
          name: subjectName 
        });

        if (!exam || !subject) {
          validationResults.invalidItems.push({
            index,
            name: contentData.name || 'Unknown',
            error: 'Exam or Subject not found',
            examName,
            subjectName,
            topicName
          });
          continue;
        }

        // Validate topic
        const topicValidation = await this.validateTopicForContent(
          exam._id, 
          subject._id, 
          topicName
        );

        if (topicValidation.isValid) {
          validationResults.validItems.push({
            index,
            contentData,
            examId: exam._id,
            subjectId: subject._id,
            topicId: topicValidation.topicId,
            topicName,
            examName,
            subjectName
          });
          validationResults.summary.uniqueTopics.add(topicName);
        } else {
          validationResults.invalidItems.push({
            index,
            name: contentData.name || 'Unknown',
            error: topicValidation.message,
            examName,
            subjectName,
            topicName
          });
          validationResults.summary.missingTopics.add(topicName);
        }
      }

      validationResults.summary.valid = validationResults.validItems.length;
      validationResults.summary.invalid = validationResults.invalidItems.length;
      validationResults.summary.uniqueTopics = Array.from(validationResults.summary.uniqueTopics);
      validationResults.summary.missingTopics = Array.from(validationResults.summary.missingTopics);

      // If there are invalid items, return validation errors
      if (validationResults.invalidItems.length > 0) {
        return {
          success: false,
          message: `Validation failed: ${validationResults.invalidItems.length} items have invalid topics`,
          validation: validationResults,
          results: { created: [], errors: validationResults.invalidItems, duplicates: [] }
        };
      }

      // If validation passes, proceed with creation
      for (const validItem of validationResults.validItems) {
        try {
          const contentData = validItem.contentData;
          
          // Resolve all required IDs
          const exam = await Exam.findOne({ name: contentData.examName?.toUpperCase() });
          const subject = await Subject.findOne({ 
            examId: exam?._id, 
            name: contentData.subjectName 
          });
          const subCategory = await SubCategory.findOne({ 
            examId: exam?._id,
            name: contentData.subCategoryName?.toLowerCase() 
          });
          const track = await Track.findOne({ 
            examId: exam?._id, 
            subCategoryId: subCategory?._id,
            name: contentData.trackName 
          });

          if (!exam || !subject || !track || !subCategory) {
            results.errors.push({
              index: validItem.index,
              name: contentData.name || 'Unknown',
              error: 'Context resolution failed'
            });
            continue;
          }

          const completeContentData = {
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            subCategoryId: subCategory._id,
            topicId: validItem.topicId,
            name: contentData.name,
            displayName: contentData.displayName,
            description: contentData.description || '',
            filePath: contentData.filePath,
            fileType: contentData.fileType,
            fileSize: contentData.fileSize || 0,
            duration: contentData.duration,
            orderIndex: contentData.orderIndex || 0,
            metadata: contentData.metadata || {}
          };

          const newContent = await this.createContent(completeContentData);
          results.created.push({
            id: newContent._id,
            name: newContent.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index: validItem.index,
              name: validItem.contentData.name
            });
          } else {
            results.errors.push({
              index: validItem.index,
              name: validItem.contentData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }

      return {
        success: true,
        message: `Successfully processed ${results.created.length} content items`,
        validation: validationResults,
        results
      };
    } catch (error) {
      console.error('Error creating bulk content with validation:', error);
      throw error;
    }
  }

  // ========== EXISTING METHODS (Kept for compatibility and utility) ==========

  // Exam methods
  async createExam(examData) {
    try {
      const exam = new Exam(examData);
      await exam.save();
      return exam;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  async getAllExams() {
    try {
      return await Exam.find({ isActive: true }).sort({ name: 1 });
    } catch (error) {
      console.error('Error getting exams:', error);
      throw error;
    }
  }

  async getExamById(examId) {
    try {
      return await Exam.findById(examId);
    } catch (error) {
      console.error('Error getting exam by id:', error);
      throw error;
    }
  }

  // Subject methods
  async createSubject(subjectData) {
    try {
      const subject = new Subject(subjectData);
      await subject.save();
      return await subject.populate('examId');
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  }

  async getSubjectsByExam(examId) {
    try {
      return await Subject.find({ examId, isActive: true })
        .populate('examId')
        .sort({ name: 1 });
    } catch (error) {
      console.error('Error getting subjects:', error);
      throw error;
    }
  }

  async createBulkSubjects(examId, subjects) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, subjectData] of subjects.entries()) {
        try {
          if (!subjectData.name || !subjectData.displayName) {
            results.errors.push({
              index,
              name: subjectData.name || 'Unknown',
              error: 'Name and displayName are required'
            });
            continue;
          }
          
          const completeSubjectData = { examId, ...subjectData };
          const newSubject = await this.createSubject(completeSubjectData);
          results.created.push({
            id: newSubject._id,
            name: newSubject.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: subjectData.name
            });
          } else {
            results.errors.push({
              index,
              name: subjectData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk subjects:', error);
      throw error;
    }
  }

  // Topic methods
  async createTopic(topicData) {
    try {
      const topic = new Topic(topicData);
      await topic.save();
      return await topic.populate(['examId', 'subjectId']);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }

  async getTopicsBySubject(examId, subjectId) {
    try {
      return await Topic.find({ examId, subjectId, isActive: true })
        .populate(['examId', 'subjectId'])
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting topics:', error);
      throw error;
    }
  }

  async createBulkTopics(examId, subjectId, topics) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, topicData] of topics.entries()) {
        try {
          if (!topicData.name || !topicData.displayName) {
            results.errors.push({
              index,
              name: topicData.name || 'Unknown',
              error: 'Name and displayName are required'
            });
            continue;
          }
          
          const completeTopicData = { examId, subjectId, ...topicData };
          const newTopic = await this.createTopic(completeTopicData);
          results.created.push({
            id: newTopic._id,
            name: newTopic.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: topicData.name
            });
          } else {
            results.errors.push({
              index,
              name: topicData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk topics:', error);
      throw error;
    }
  }

  // Track methods
  async createTrack(trackData) {
    try {
      const track = new Track(trackData);
      await track.save();
      return await track.populate(['examId', 'subCategoryId']);
    } catch (error) {
      console.error('Error creating track:', error);
      throw error;
    }
  }

  async getTracksByExamSubCategory(examId, subCategoryId) {
    try {
      return await Track.find({ examId, subCategoryId, isActive: true })
        .populate(['examId', 'subCategoryId'])
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting tracks:', error);
      throw error;
    }
  }

  async createBulkTracks(examId, subCategoryId, tracks) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, trackData] of tracks.entries()) {
        try {
          if (!trackData.name || !trackData.displayName || !trackData.trackType) {
            results.errors.push({
              index,
              name: trackData.name || 'Unknown',
              error: 'Name, displayName, and trackType are required'
            });
            continue;
          }
          
          const completeTrackData = { examId, subCategoryId, ...trackData };
          const newTrack = await this.createTrack(completeTrackData);
          results.created.push({
            id: newTrack._id,
            name: newTrack.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: trackData.name
            });
          } else {
            results.errors.push({
              index,
              name: trackData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk tracks:', error);
      throw error;
    }
  }

  // Subject Availability methods
  async createSubjectAvailability(availabilityData) {
    try {
      const availability = new SubjectAvailability(availabilityData);
      await availability.save();
      return await availability.populate(['examId', 'subjectId', 'subCategoryId']);
    } catch (error) {
      console.error('Error creating subject availability:', error);
      throw error;
    }
  }

  async setSubjectAvailabilityBulk(examId, availabilityData) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, availability] of availabilityData.entries()) {
        try {
          const subject = await Subject.findOne({ 
            examId, 
            name: availability.subjectName, 
            isActive: true 
          });
          const subCategory = await SubCategory.findOne({ 
            examId,
            name: availability.subCategoryName.toLowerCase(), 
            isActive: true 
          });

          if (!subject || !subCategory) {
            results.errors.push({
              index,
              name: `${availability.subjectName}-${availability.subCategoryName}`,
              error: 'Subject or SubCategory not found for this exam'
            });
            continue;
          }

          const availabilityRecord = await this.createSubjectAvailability({
            examId,
            subjectId: subject._id,
            subCategoryId: subCategory._id
          });

          results.created.push({
            id: availabilityRecord._id,
            name: `${availability.subjectName}-${availability.subCategoryName}`
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: `${availability.subjectName}-${availability.subCategoryName}`
            });
          } else {
            results.errors.push({
              index,
              name: `${availability.subjectName || 'Unknown'}-${availability.subCategoryName || 'Unknown'}`,
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error setting bulk subject availability:', error);
      throw error;
    }
  }

  async getSubjectsInSubCategory(examId, subCategoryId) {
    try {
      return await SubjectAvailability.find({ 
        examId, 
        subCategoryId, 
        isActive: true 
      })
      .populate('subjectId')
      .then(results => results.map(r => r.subjectId))
      .then(subjects => subjects.filter(s => s.isActive));
    } catch (error) {
      console.error('Error getting subjects in subcategory:', error);
      throw error;
    }
  }

  async getTracksInSubCategory(examId, subCategoryId) {
    try {
      return await Track.find({ examId, subCategoryId, isActive: true })
        .populate(['examId', 'subCategoryId'])
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting tracks in subcategory:', error);
      throw error;
    }
  }

  // Content methods
  async createContent(contentData) {
    try {
      const content = new Content(contentData);
      await content.save();
      return await content.populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId']);
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  }

  async getContentByFilters(filters) {
    try {
      const query = { isActive: true };
      
      if (filters.examId) query.examId = filters.examId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.trackId) query.trackId = filters.trackId;
      if (filters.subCategoryId) query.subCategoryId = filters.subCategoryId;
      if (filters.topicId) query.topicId = filters.topicId;

      return await Content.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId'])
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting content by filters:', error);
      throw error;
    }
  }

  // LEGACY: Keep original method for backward compatibility
  async createBulkContent(contentArray) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, contentData] of contentArray.entries()) {
        try {
          // Resolve names to IDs
          const exam = await Exam.findOne({ name: contentData.examName?.toUpperCase() });
          const subject = await Subject.findOne({ 
            examId: exam?._id, 
            name: contentData.subjectName 
          });
          const subCategory = await SubCategory.findOne({ 
            examId: exam?._id,
            name: contentData.subCategoryName?.toLowerCase() 
          });
          const track = await Track.findOne({ 
            examId: exam?._id, 
            subCategoryId: subCategory?._id,
            name: contentData.trackName 
          });

          // Topic validation
          let topicId = null;
          if (contentData.topicName) {
            const topicValidation = await this.validateTopicForContent(
              exam?._id, 
              subject?._id, 
              contentData.topicName
            );
            
            if (!topicValidation.isValid) {
              throw new Error(topicValidation.message);
            }
            topicId = topicValidation.topicId;
          }

          if (!exam || !subject || !track || !subCategory || !topicId) {
            results.errors.push({
              index,
              name: contentData.name || 'Unknown',
              error: 'Exam, Subject, Track, SubCategory, or Topic not found/invalid'
            });
            continue;
          }

          const completeContentData = {
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            subCategoryId: subCategory._id,
            topicId: topicId,
            name: contentData.name,
            displayName: contentData.displayName,
            description: contentData.description || '',
            filePath: contentData.filePath,
            fileType: contentData.fileType,
            fileSize: contentData.fileSize || 0,
            duration: contentData.duration,
            orderIndex: contentData.orderIndex || 0,
            metadata: contentData.metadata || {}
          };

          const newContent = await this.createContent(completeContentData);
          results.created.push({
            id: newContent._id,
            name: newContent.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: contentData.name
            });
          } else {
            results.errors.push({
              index,
              name: contentData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk content:', error);
      throw error;
    }
  }

  // Question methods
  async createQuestion(questionData) {
    try {
      const question = new Question(questionData);
      await question.save();
      return await question.populate(['examId', 'subjectId', 'trackId', 'topicId']);
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  // LEGACY: Keep original method for backward compatibility
  async createBulkQuestions(questionsArray) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, questionData] of questionsArray.entries()) {
        try {
          // Resolve names to IDs
          const exam = await Exam.findOne({ name: questionData.examName?.toUpperCase() });
          const subject = await Subject.findOne({ 
            examId: exam?._id, 
            name: questionData.subject 
          });
          
          const pastQuestionsSubCategory = await SubCategory.findOne({
            examId: exam?._id,
            name: 'pastquestions'
          });
          
          const track = await Track.findOne({ 
            examId: exam?._id, 
            subCategoryId: pastQuestionsSubCategory?._id,
            name: questionData.year
          });
          
          // Topic validation
          let topicId = null;
          if (questionData.topic) {
            const topicValidation = await this.validateTopicForContent(
              exam?._id,
              subject?._id,
              questionData.topic
            );
            
            if (!topicValidation.isValid) {
              throw new Error(`Invalid topic "${questionData.topic}": ${topicValidation.message}`);
            }
            topicId = topicValidation.topicId;
          }

          if (!exam || !subject || !track || !topicId) {
            results.errors.push({
              index,
              error: 'Exam, Subject, Track, or Topic not found/invalid'
            });
            continue;
          }

          const completeQuestionData = {
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            topicId: topicId,
            year: questionData.year,
            question: questionData.question,
            questionDiagram: questionData.question_diagram || 'assets/images/noDiagram.png',
            correctAnswer: questionData.correct_answer,
            incorrectAnswers: questionData.incorrect_answers,
            explanation: questionData.explanation || '',
            difficulty: questionData.difficulty || 'medium',
            orderIndex: questionData.orderIndex || 0
          };

          const newQuestion = await this.createQuestion(completeQuestionData);
          results.created.push({
            id: newQuestion._id,
            topic: newQuestion.topicId
          });
          
        } catch (error) {
          results.errors.push({
            index,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk questions:', error);
      throw error;
    }
  }

  // Complete structure methods with track-specific topic filtering
  async getCompleteUserFlow(examId) {
    try {
      const exam = await Exam.findById(examId);
      if (!exam) return null;

      // Get all subcategories for this exam
      const subCategories = await SubCategory.find({ examId, isActive: true })
        .sort({ orderIndex: 1, name: 1 });
      
      const structure = {
        exam,
        subCategories: []
      };

      for (const subCategory of subCategories) {
        // Get subjects available in this subcategory
        const subjects = await this.getSubjectsInSubCategory(examId, subCategory._id);
        
        // Get tracks for this subcategory
        const tracks = await this.getTracksInSubCategory(examId, subCategory._id);

        const subCategoryData = {
          ...subCategory.toObject(),
          subjects: subjects.map(subject => subject.toObject()),
          tracks: []
        };

        for (const track of tracks) {
          let trackData = {
            ...track.toObject()
          };

          // For past questions, get topics that have questions for each track
          if (subCategory.name === 'pastquestions' || subCategory.contentType === 'json') {
            trackData.subjectTopics = {};
            for (const subject of subjects) {
              // Use the enhanced method to get ALL topics with questions for this track
              const topicsWithQuestions = await this.getTopicsWithQuestionsForTrack(
                examId, subject._id, track._id
              );
              trackData.subjectTopics[subject._id] = topicsWithQuestions.map(topic => topic);
            }
          } else {
            // For file-based content, get topics that have content for each track
            trackData.subjectContent = {};
            for (const subject of subjects) {
              // Use the enhanced method to get content grouped by track-specific topics
              const contentGrouped = await this.getContentGroupedByTrackTopics(
                examId, subject._id, track._id, subCategory._id
              );
              
              trackData.subjectContent[subject._id] = {
                topicsWithContent: contentGrouped.topicsWithContent,
                contentByTopics: contentGrouped.contentByTopics,
                totalTopics: contentGrouped.totalTopics,
                totalContent: contentGrouped.totalContent
              };
            }
          }

          subCategoryData.tracks.push(trackData);
        }

        structure.subCategories.push(subCategoryData);
      }

      return structure;
    } catch (error) {
      console.error('Error getting complete user flow:', error);
      throw error;
    }
  }

  // Validation methods
  async validateExamExists(examId) {
    try {
      const exam = await Exam.findById(examId);
      return !!exam;
    } catch (error) {
      console.error('Error validating exam:', error);
      return false;
    }
  }

  async validateSubjectExists(examId, subjectId) {
    try {
      const subject = await Subject.findOne({
        _id: subjectId,
        examId,
        isActive: true
      });
      return !!subject;
    } catch (error) {
      console.error('Error validating subject:', error);
      return false;
    }
  }

  async validateTopicExists(examId, subjectId, topicId) {
    try {
      const topic = await Topic.findOne({
        _id: topicId,
        examId,
        subjectId,
        isActive: true
      });
      return !!topic;
    } catch (error) {
      console.error('Error validating topic:', error);
      return false;
    }
  }

  async validateTrackExists(examId, subCategoryId, trackId) {
    try {
      const track = await Track.findOne({
        _id: trackId,
        examId,
        subCategoryId,
        isActive: true
      });
      return !!track;
    } catch (error) {
      console.error('Error validating track:', error);
      return false;
    }
  }

  async validateSubjectAvailability(examId, subjectId, subCategoryId) {
    try {
      const availability = await SubjectAvailability.findOne({
        examId,
        subjectId,
        subCategoryId,
        isActive: true
      });
      return !!availability;
    } catch (error) {
      console.error('Error validating subject availability:', error);
      return false;
    }
  }

  // Utility methods for content/question management
  async getContentById(contentId) {
    try {
      return await Content.findById(contentId)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId']);
    } catch (error) {
      console.error('Error getting content by id:', error);
      throw error;
    }
  }

  async updateContent(contentId, updateData) {
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        updateData,
        { new: true }
      ).populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId']);
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }

  async deleteContent(contentId) {
    try {
      return await Content.findByIdAndUpdate(
        contentId,
        { isActive: false },
        { new: true }
      );
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  async getTopicById(topicId) {
    try {
      return await Topic.findById(topicId).populate(['examId', 'subjectId']);
    } catch (error) {
      console.error('Error getting topic by id:', error);
      throw error;
    }
  }

  // Enhanced seed method
  async seedCompleteExam(examData, subjectsData, topicsData, tracksData, availabilityData) {
    try {
      // Create or get exam
      let exam;
      try {
        exam = await this.createExam(examData);
      } catch (error) {
        if (error.code === 11000) {
          exam = await Exam.findOne({ name: examData.name.toUpperCase() });
        } else {
          throw error;
        }
      }

      const results = {
        exam: { id: exam._id, name: exam.name },
        subjects: [],
        topics: [],
        tracks: [],
        availability: []
      };

      // Create subjects
      if (subjectsData && subjectsData.length > 0) {
        const subjectResults = await this.createBulkSubjects(exam._id, subjectsData);
        results.subjects = subjectResults;
      }

      // Create standard topics for each subject
      if (topicsData && topicsData.length > 0) {
        const topicsBySubject = {};
        topicsData.forEach(topic => {
          if (!topicsBySubject[topic.subjectName]) {
            topicsBySubject[topic.subjectName] = [];
          }
          topicsBySubject[topic.subjectName].push(topic);
        });

        for (const [subjectName, topics] of Object.entries(topicsBySubject)) {
          const subject = await Subject.findOne({ examId: exam._id, name: subjectName });
          if (subject) {
            const topicResults = await this.createBulkTopics(exam._id, subject._id, topics);
            results.topics.push(...topicResults.created);
          }
        }
      }

      // Create tracks for each subcategory
      if (tracksData && tracksData.length > 0) {
        const tracksBySubCategory = {};
        tracksData.forEach(track => {
          if (!tracksBySubCategory[track.subCategoryName]) {
            tracksBySubCategory[track.subCategoryName] = [];
          }
          tracksBySubCategory[track.subCategoryName].push(track);
        });

        for (const [subCategoryName, tracks] of Object.entries(tracksBySubCategory)) {
          const subCategory = await SubCategory.findOne({ 
            examId: exam._id, 
            name: subCategoryName.toLowerCase() 
          });
          if (subCategory) {
            const trackResults = await this.createBulkTracks(exam._id, subCategory._id, tracks);
            results.tracks.push(...trackResults.created);
          }
        }
      }

      // Set subject availability
      if (availabilityData && availabilityData.length > 0) {
        const availabilityResults = await this.setSubjectAvailabilityBulk(exam._id, availabilityData);
        results.availability = availabilityResults;
      }

      return results;
    } catch (error) {
      console.error('Error seeding complete exam:', error);
      throw error;
    }
  }
}

module.exports = {
  ExamModel,
  Exam,
  Subject,
  Topic,
  TopicAssignment,
  Track,
  SubCategory,
  SubjectAvailability,
  Content,
  Question
};