// models/exam.js - Modified Architecture: Global Subjects & Tracks per Exam-SubCategory
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

// MODIFIED: Subject Schema - Global subjects for each exam (not tied to subcategory)
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

// Topic Schema - Standard approved topics for each exam-subject combination
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
  orderIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// MODIFIED: Track Schema - Tracks per exam-subcategory combination (not per subject)
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
    type: Number, // For numerical tracks like 14 days, 7 weeks
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

// SubCategory Schema - Learning content types like Notes, Past Questions, Videos
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
    default: 'file' // 'file' for notes/videos, 'json' for past questions
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

// SubjectAvailability Schema - Defines which subjects are available in which subcategories
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

// MODIFIED: Content Schema - Updated to work with new track structure
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
    type: Number, // in bytes
    default: 0
  },
  duration: {
    type: Number, // for videos/audio in seconds
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

// MODIFIED: Question Schema - Updated to work with new track structure
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

// UPDATED: Compound indexes for better query performance
subjectSchema.index({ examId: 1, name: 1 }, { unique: true });
topicSchema.index({ examId: 1, subjectId: 1, name: 1 }, { unique: true });
trackSchema.index({ examId: 1, subCategoryId: 1, name: 1 }, { unique: true }); // CHANGED
subjectAvailabilitySchema.index({ examId: 1, subjectId: 1, subCategoryId: 1 }, { unique: true });
contentSchema.index({ examId: 1, subjectId: 1, trackId: 1, subCategoryId: 1, name: 1 }, { unique: true });
questionSchema.index({ examId: 1, subjectId: 1, trackId: 1, topicId: 1, year: 1 });
subCategorySchema.index({ examId: 1, name: 1 }, { unique: true });

// Create models
const Exam = mongoose.model('Exam', examSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Topic = mongoose.model('Topic', topicSchema);
const Track = mongoose.model('Track', trackSchema);
const SubCategory = mongoose.model('SubCategory', subCategorySchema);
const SubjectAvailability = mongoose.model('SubjectAvailability', subjectAvailabilitySchema);
const Content = mongoose.model('Content', contentSchema);
const Question = mongoose.model('Question', questionSchema);

class ExamModel {
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

  // MODIFIED: Subject methods - Now global per exam
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

  // Topic methods (unchanged)
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

  async getTopicById(topicId) {
    try {
      return await Topic.findById(topicId).populate(['examId', 'subjectId']);
    } catch (error) {
      console.error('Error getting topic by id:', error);
      throw error;
    }
  }

  // MODIFIED: Track methods - Now per exam-subcategory combination
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

  // Subject Availability methods (unchanged)
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
          // Get subject and subcategory by name (subcategory must be for this exam)
          const subject = await Subject.findOne({ 
            examId, 
            name: availability.subjectName, 
            isActive: true 
          });
          const subCategory = await SubCategory.findOne({ 
            examId, // Add examId filter
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

  // MODIFIED: Get tracks for subcategory (not dependent on subject anymore)
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

  // Content methods (updated to work with new structure)
  async createContent(contentData) {
    try {
      const content = new Content(contentData);
      await content.save();
      return await content.populate(['examId', 'subjectId', 'trackId', 'subCategoryId']);
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

      return await Content.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId'])
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting content by filters:', error);
      throw error;
    }
  }

  // Question methods (updated to work with new structure)
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

  async createBulkQuestions(questionsArray) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, questionData] of questionsArray.entries()) {
        try {
          // Resolve names to IDs
          const exam = await Exam.findOne({ name: questionData.examName.toUpperCase() });
          const subject = await Subject.findOne({ 
            examId: exam._id, 
            name: questionData.subject 
          });
          
          // For past questions, find track in the pastquestions subcategory
          const pastQuestionsSubCategory = await SubCategory.findOne({
            examId: exam._id,
            name: 'pastquestions'
          });
          
          const track = await Track.findOne({ 
            examId: exam._id, 
            subCategoryId: pastQuestionsSubCategory._id,
            name: questionData.year // For past questions, track is usually the year
          });
          
          const topic = await Topic.findOne({
            examId: exam._id,
            subjectId: subject._id,
            name: questionData.topic
          });

          if (!exam || !subject || !track || !topic) {
            results.errors.push({
              index,
              error: 'Exam, Subject, Track, or Topic not found'
            });
            continue;
          }

          const completeQuestionData = {
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            topicId: topic._id,
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

  async getQuestionsByFilters(filters) {
    try {
      const query = { isActive: true };
      
      if (filters.examId) query.examId = filters.examId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.trackId) query.trackId = filters.trackId;
      if (filters.topicId) query.topicId = filters.topicId;
      if (filters.year) query.year = filters.year;
      if (filters.difficulty) query.difficulty = filters.difficulty;
      if (filters.topicIds && filters.topicIds.length > 0) {
        query.topicId = { $in: filters.topicIds };
      }

      return await Question.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'topicId'])
        .sort({ orderIndex: 1, _id: 1 });
    } catch (error) {
      console.error('Error getting questions by filters:', error);
      throw error;
    }
  }

  // Multi-selection methods for Past Questions (updated)
  async getQuestionsMultiSelection(examId, subjectId, trackIds, topicIds) {
    try {
      const query = {
        examId,
        subjectId,
        isActive: true
      };

      if (trackIds && trackIds.length > 0) {
        query.trackId = { $in: trackIds };
      }

      if (topicIds && topicIds.length > 0) {
        query.topicId = { $in: topicIds };
      }

      return await Question.find(query)
        .populate(['examId', 'subjectId', 'trackId', 'topicId'])
        .sort({ year: -1, 'topicId.orderIndex': 1 });
    } catch (error) {
      console.error('Error getting questions with multi-selection:', error);
      throw error;
    }
  }

  // MODIFIED: Complete structure methods
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

          // If this is past questions, add topics for each subject
          if (subCategory.name === 'pastquestions' || subCategory.contentType === 'json') {
            trackData.subjectTopics = {};
            for (const subject of subjects) {
              const topics = await this.getTopicsBySubject(examId, subject._id);
              trackData.subjectTopics[subject._id] = topics.map(topic => topic.toObject());
            }
          } else {
            // For file-based content (notes/videos), get content for each subject
            trackData.subjectContent = {};
            for (const subject of subjects) {
              const content = await this.getContentByFilters({
                examId,
                subjectId: subject._id,
                trackId: track._id,
                subCategoryId: subCategory._id
              });
              trackData.subjectContent[subject._id] = content.map(c => c.toObject());
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

  // Validation methods (updated)
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

  // MODIFIED: Seed method for complete exam setup
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

      // Create subjects (global per exam)
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

  async createBulkContent(contentArray) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, contentData] of contentArray.entries()) {
        try {
          // Resolve names to IDs
          const exam = await Exam.findOne({ name: contentData.examName.toUpperCase() });
          const subject = await Subject.findOne({ 
            examId: exam._id, 
            name: contentData.subjectName 
          });
          const subCategory = await SubCategory.findOne({ 
            examId: exam._id,
            name: contentData.subCategoryName.toLowerCase() 
          });
          const track = await Track.findOne({ 
            examId: exam._id, 
            subCategoryId: subCategory._id, 
            name: contentData.trackName 
          });

          if (!exam || !subject || !track || !subCategory) {
            results.errors.push({
              index,
              name: contentData.name || 'Unknown',
              error: 'Exam, Subject, Track, or SubCategory not found'
            });
            continue;
          }

          const completeContentData = {
            examId: exam._id,
            subjectId: subject._id,
            trackId: track._id,
            subCategoryId: subCategory._id,
            name: contentData.name,
            displayName: contentData.displayName,
            description: contentData.description,
            filePath: contentData.filePath,
            fileType: contentData.fileType,
            fileSize: contentData.fileSize,
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

  async searchContent(query, filters = {}) {
    try {
      const searchRegex = new RegExp(query, 'i');
      const searchQuery = {
        $or: [
          { name: searchRegex },
          { displayName: searchRegex },
          { description: searchRegex }
        ],
        isActive: true
      };

      if (filters.examId) searchQuery.examId = filters.examId;
      if (filters.subjectId) searchQuery.subjectId = filters.subjectId;
      if (filters.trackId) searchQuery.trackId = filters.trackId;
      if (filters.subCategoryId) searchQuery.subCategoryId = filters.subCategoryId;
      if (filters.fileType) searchQuery.fileType = filters.fileType;

      return await Content.find(searchQuery)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId'])
        .sort({ orderIndex: 1, name: 1 })
        .limit(50);
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }

  async getContentById(contentId) {
    try {
      return await Content.findById(contentId)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId']);
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
      ).populate(['examId', 'subjectId', 'trackId', 'subCategoryId']);
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
}

module.exports = {
  ExamModel,
  Exam,
  Subject,
  Topic,
  Track,
  SubCategory,
  SubjectAvailability,
  Content,
  Question
};