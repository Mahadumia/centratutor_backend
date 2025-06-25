// models/exam.js - Enhanced with Track-Specific Topic Filtering
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
trackSchema.index({ examId: 1, subCategoryId: 1, name: 1 }, { unique: true });
subjectAvailabilitySchema.index({ examId: 1, subjectId: 1, subCategoryId: 1 }, { unique: true });
contentSchema.index({ examId: 1, subjectId: 1, trackId: 1, subCategoryId: 1, topicId: 1, name: 1 }, { unique: true });
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
  // ========== NEW: TRACK-SPECIFIC TOPIC METHODS ==========
  
  /**
   * NEW: Get topics that have actual content for a specific track
   * This is what should be used in step 8 of the user flow
   */
  async getTopicsWithContentForTrack(examId, subjectId, trackId, subCategoryId) {
    try {
      // Get all content for the specific track
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
   * NEW: Get topics that have questions for a specific track (for past questions)
   */
  async getTopicsWithQuestionsForTrack(examId, subjectId, trackId) {
    try {
      // Get all questions for the specific track
      const questions = await Question.find({
        examId,
        subjectId,
        trackId,
        isActive: true
      }).populate('topicId');

      // Extract unique topics from the questions
      const topicsWithQuestions = [];
      const topicIds = new Set();

      questions.forEach(question => {
        if (question.topicId && !topicIds.has(question.topicId._id.toString())) {
          topicIds.add(question.topicId._id.toString());
          topicsWithQuestions.push({
            ...question.topicId.toObject(),
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
   * NEW: Get content grouped by track-specific topics
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

  /**
   * NEW: Get questions grouped by track-specific topics
   */
  async getQuestionsGroupedByTrackTopics(examId, subjectId, trackId) {
    try {
      // Get topics that have questions for this track
      const topicsWithQuestions = await this.getTopicsWithQuestionsForTrack(
        examId, subjectId, trackId
      );

      // Get all questions for the track
      const allQuestions = await Question.find({
        examId,
        subjectId,
        trackId,
        isActive: true
      }).populate(['examId', 'subjectId', 'trackId', 'topicId'])
        .sort({ orderIndex: 1, _id: 1 });

      // Group questions by topics (only topics that have questions)
      const questionsByTopics = {};

      topicsWithQuestions.forEach(topic => {
        questionsByTopics[topic._id.toString()] = {
          topic: topic,
          questions: allQuestions.filter(question => 
            question.topicId._id.toString() === topic._id.toString()
          )
        };
      });

      return {
        topicsWithQuestions: topicsWithQuestions,
        questionsByTopics: Object.values(questionsByTopics),
        totalTopics: topicsWithQuestions.length,
        totalQuestions: allQuestions.length
      };
    } catch (error) {
      console.error('Error getting questions grouped by track topics:', error);
      throw error;
    }
  }
// Add these methods to your ExamModel class in models/exam.js

// ========== TIME-BASED CONTENT METHODS ==========

/**
 * NEW: Get content grouped by time periods (weeks, days, months, semesters)
 */
async getContentByTimePeriods(examId, subjectId, trackId, subCategoryId) {
  try {
    // Get the track to determine type
    const track = await Track.findById(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    // Get all content for this track
    const allContent = await Content.find({
      examId,
      subjectId,
      trackId,
      subCategoryId,
      isActive: true
    }).populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId'])
      .sort({ orderIndex: 1, name: 1 });

    // Group content by time periods based on track type
    const timeGroups = {};
    const trackType = track.trackType;

    allContent.forEach(content => {
      let timeKey = 'ungrouped';
      let timeName = 'Ungrouped';

      if (content.metadata && content.metadata.timeBasedContent) {
        // Use metadata time information
        if (trackType === 'weeks' && content.metadata.week) {
          timeKey = `week_${content.metadata.week}`;
          timeName = `Week ${content.metadata.week}`;
        } else if (trackType === 'days' && content.metadata.day) {
          timeKey = `day_${content.metadata.day}`;
          timeName = `Day ${content.metadata.day}`;
        } else if (trackType === 'months' && content.metadata.month) {
          timeKey = `month_${content.metadata.month}`;
          timeName = content.metadata.monthName || `Month ${content.metadata.month}`;
        } else if (trackType === 'semester' && content.metadata.semester) {
          timeKey = `semester_${content.metadata.semester}`;
          timeName = content.metadata.semesterName || `Semester ${content.metadata.semester}`;
        }
      } else {
        // Fallback: try to extract from name
        if (trackType === 'weeks') {
          const weekMatch = content.name.match(/week(\d+)/i);
          if (weekMatch) {
            const weekNum = parseInt(weekMatch[1]);
            timeKey = `week_${weekNum}`;
            timeName = `Week ${weekNum}`;
          }
        } else if (trackType === 'days') {
          const dayMatch = content.name.match(/day(\d+)/i);
          if (dayMatch) {
            const dayNum = parseInt(dayMatch[1]);
            timeKey = `day_${dayNum}`;
            timeName = `Day ${dayNum}`;
          }
        } else if (trackType === 'months') {
          const monthMatch = content.name.match(/month(\d+)/i);
          if (monthMatch) {
            const monthNum = parseInt(monthMatch[1]);
            timeKey = `month_${monthNum}`;
            timeName = `Month ${monthNum}`;
          }
        } else if (trackType === 'semester') {
          const semesterMatch = content.name.match(/semester(\d+)/i);
          if (semesterMatch) {
            const semesterNum = parseInt(semesterMatch[1]);
            timeKey = `semester_${semesterNum}`;
            timeName = `Semester ${semesterNum}`;
          }
        }
      }

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {
          timeKey,
          timeName,
          timeType: trackType,
          timeNumber: timeKey === 'ungrouped' ? 0 : parseInt(timeKey.split('_')[1]),
          content: []
        };
      }

      timeGroups[timeKey].content.push(content);
    });

    // Convert to array and sort by time number
    const sortedTimeGroups = Object.values(timeGroups).sort((a, b) => {
      if (a.timeNumber === 0) return 1; // Put ungrouped at end
      if (b.timeNumber === 0) return -1;
      return a.timeNumber - b.timeNumber;
    });

    return {
      track: {
        id: track._id,
        name: track.displayName,
        type: trackType,
        duration: track.duration
      },
      totalContent: allContent.length,
      totalTimePeriods: sortedTimeGroups.length,
      contentByTimePeriods: sortedTimeGroups
    };
  } catch (error) {
    console.error('Error getting content by time periods:', error);
    throw error;
  }
}

/**
 * NEW: Get content for a specific time period
 */
async getContentForTimePeriod(examId, subjectId, trackId, subCategoryId, timeType, timeNumber) {
  try {
    const track = await Track.findById(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    if (track.trackType !== timeType) {
      throw new Error(`Track type mismatch. Expected ${timeType}, got ${track.trackType}`);
    }

    // Get all content for this track
    const allContent = await Content.find({
      examId,
      subjectId,
      trackId,
      subCategoryId,
      isActive: true
    }).populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId'])
      .sort({ orderIndex: 1, name: 1 });

    // Filter content for the specific time period
    const timeContent = allContent.filter(content => {
      // Check metadata first
      if (content.metadata && content.metadata.timeBasedContent) {
        const timeKey = timeType === 'weeks' ? 'week' :
                       timeType === 'days' ? 'day' :
                       timeType === 'months' ? 'month' :
                       timeType === 'semester' ? 'semester' : null;
        
        if (timeKey && content.metadata[timeKey] === timeNumber) {
          return true;
        }
      }

      // Fallback: check name pattern
      const timePattern = new RegExp(`${timeType.slice(0, -1)}${timeNumber}`, 'i');
      return timePattern.test(content.name);
    });

    // Get time period name
    let timeName = `${timeType.charAt(0).toUpperCase() + timeType.slice(1, -1)} ${timeNumber}`;
    if (timeType === 'months') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      timeName = monthNames[timeNumber - 1] || timeName;
    } else if (timeType === 'semester') {
      const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
      timeName = semesterNames[timeNumber - 1] || timeName;
    }

    // Group by topics if there are multiple topics
    const contentByTopics = {};
    timeContent.forEach(content => {
      const topicKey = content.topicId ? content.topicId._id.toString() : 'no_topic';
      const topicName = content.topicId ? content.topicId.displayName : 'No Topic';
      
      if (!contentByTopics[topicKey]) {
        contentByTopics[topicKey] = {
          topic: content.topicId ? content.topicId : null,
          topicName,
          content: []
        };
      }
      contentByTopics[topicKey].content.push(content);
    });

    return {
      timePeriod: {
        type: timeType,
        number: timeNumber,
        name: timeName
      },
      track: {
        id: track._id,
        name: track.displayName,
        type: track.trackType,
        duration: track.duration
      },
      totalContent: timeContent.length,
      totalTopics: Object.keys(contentByTopics).length,
      content: timeContent,
      contentByTopics: Object.values(contentByTopics)
    };
  } catch (error) {
    console.error('Error getting content for time period:', error);
    throw error;
  }
}

/**
 * NEW: Generate time period structure for a track
 */
async getTrackTimePeriods(examId, subCategoryId, trackId) {
  try {
    const track = await Track.findById(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    const periods = [];
    const trackType = track.trackType;
    const duration = track.duration || 0;

    // Get content count for each period
    const allContent = await Content.find({
      examId,
      trackId,
      subCategoryId,
      isActive: true
    });

    for (let i = 1; i <= duration; i++) {
      let periodName = `${trackType.charAt(0).toUpperCase() + trackType.slice(1, -1)} ${i}`;
      
      if (trackType === 'months') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        periodName = monthNames[i - 1] || periodName;
      } else if (trackType === 'semester') {
        const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
        periodName = semesterNames[i - 1] || periodName;
      }

      // Count content for this period
      const periodContent = allContent.filter(content => {
        // Check metadata
        if (content.metadata && content.metadata.timeBasedContent) {
          const timeKey = trackType === 'weeks' ? 'week' :
                         trackType === 'days' ? 'day' :
                         trackType === 'months' ? 'month' :
                         trackType === 'semester' ? 'semester' : null;
          
          if (timeKey && content.metadata[timeKey] === i) {
            return true;
          }
        }

        // Check name pattern
        const timePattern = new RegExp(`${trackType.slice(0, -1)}${i}`, 'i');
        return timePattern.test(content.name);
      });

      periods.push({
        number: i,
        name: periodName,
        type: trackType.slice(0, -1), // Remove 's' from end
        contentCount: periodContent.length,
        hasContent: periodContent.length > 0
      });
    }

    return {
      track: {
        id: track._id,
        name: track.displayName,
        type: trackType,
        duration: duration
      },
      totalPeriods: periods.length,
      periods
    };
  } catch (error) {
    console.error('Error getting track time periods:', error);
    throw error;
  }
}

/**
 * NEW: Get track progress/completion status
 */
async getTrackProgress(examId, subjectId, trackId, subCategoryId) {
  try {
    const track = await Track.findById(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    const periods = await this.getTrackTimePeriods(examId, subCategoryId, trackId);
    
    const totalPeriods = periods.totalPeriods;
    const periodsWithContent = periods.periods.filter(p => p.hasContent).length;
    const emptyPeriods = totalPeriods - periodsWithContent;
    
    const progressPercentage = totalPeriods > 0 ? 
      Math.round((periodsWithContent / totalPeriods) * 100) : 0;

    // Get total content count
    const totalContent = await Content.countDocuments({
      examId,
      subjectId,
      trackId,
      subCategoryId,
      isActive: true
    });

    return {
      track: periods.track,
      progress: {
        totalPeriods,
        periodsWithContent,
        emptyPeriods,
        progressPercentage,
        totalContent,
        status: progressPercentage === 100 ? 'complete' : 
                progressPercentage > 0 ? 'in_progress' : 'empty'
      },
      periods: periods.periods
    };
  } catch (error) {
    console.error('Error getting track progress:', error);
    throw error;
  }
}

/**
 * NEW: Bulk update content time periods
 */
async updateContentTimePeriods(examId, subjectId, trackId, subCategoryId) {
  try {
    const track = await Track.findById(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    const trackType = track.trackType;
    if (!['weeks', 'days', 'months', 'semester'].includes(trackType)) {
      return { message: 'Track type does not support time periods', updated: 0 };
    }

    // Get all content for this track
    const allContent = await Content.find({
      examId,
      subjectId,
      trackId,
      subCategoryId,
      isActive: true
    });

    let updateCount = 0;

    for (const content of allContent) {
      let timeNumber = null;
      let timeName = null;
      let timeKey = null;

      // Extract time information from name
      if (trackType === 'weeks') {
        const weekMatch = content.name.match(/week(\d+)/i);
        if (weekMatch) {
          timeNumber = parseInt(weekMatch[1]);
          timeName = `Week ${timeNumber}`;
          timeKey = 'week';
        }
      } else if (trackType === 'days') {
        const dayMatch = content.name.match(/day(\d+)/i);
        if (dayMatch) {
          timeNumber = parseInt(dayMatch[1]);
          timeName = `Day ${timeNumber}`;
          timeKey = 'day';
        }
      } else if (trackType === 'months') {
        const monthMatch = content.name.match(/month(\d+)/i);
        if (monthMatch) {
          timeNumber = parseInt(monthMatch[1]);
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          timeName = monthNames[timeNumber - 1] || `Month ${timeNumber}`;
          timeKey = 'month';
        }
      } else if (trackType === 'semester') {
        const semesterMatch = content.name.match(/semester(\d+)/i);
        if (semesterMatch) {
          timeNumber = parseInt(semesterMatch[1]);
          const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
          timeName = semesterNames[timeNumber - 1] || `Semester ${timeNumber}`;
          timeKey = 'semester';
        }
      }

      // Update metadata if time information was found
      if (timeNumber && timeKey) {
        const updatedMetadata = {
          ...content.metadata,
          timeBasedContent: true,
          [timeKey]: timeNumber,
          [`${timeKey}Name`]: timeName
        };

        await Content.findByIdAndUpdate(content._id, {
          metadata: updatedMetadata
        });

        updateCount++;
      }
    }

    return {
      message: `Updated ${updateCount} content items with time period metadata`,
      updated: updateCount,
      total: allContent.length,
      trackType
    };
  } catch (error) {
    console.error('Error updating content time periods:', error);
    throw error;
  }
}

/**
 * NEW: Get time-based content summary for dashboard
 */
async getTimeBasedContentSummary(examId) {
  try {
    const tracks = await Track.find({ examId, isActive: true })
      .populate(['examId', 'subCategoryId']);

    const summary = {
      totalTracks: tracks.length,
      tracksByType: {},
      tracksWithContent: 0,
      tracksEmpty: 0,
      totalContentItems: 0
    };

    for (const track of tracks) {
      const trackType = track.trackType;
      
      if (!summary.tracksByType[trackType]) {
        summary.tracksByType[trackType] = {
          count: 0,
          totalDuration: 0,
          withContent: 0,
          empty: 0
        };
      }

      summary.tracksByType[trackType].count++;
      summary.tracksByType[trackType].totalDuration += track.duration || 0;

      // Check if track has content
      const contentCount = await Content.countDocuments({
        examId,
        trackId: track._id,
        isActive: true
      });

      summary.totalContentItems += contentCount;

      if (contentCount > 0) {
        summary.tracksWithContent++;
        summary.tracksByType[trackType].withContent++;
      } else {
        summary.tracksEmpty++;
        summary.tracksByType[trackType].empty++;
      }
    }

    return summary;
  } catch (error) {
    console.error('Error getting time-based content summary:', error);
    throw error;
  }
}
  // ========== ENHANCED TOPIC MANAGEMENT METHODS ==========
  
  /**
   * NEW: Validate if a topic exists and is approved for the given context
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
   * NEW: Get all approved topics for a subject
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
   * NEW: Bulk validate topics for content upload
   */
  async validateTopicsForBulkContent(contentArray) {
    try {
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
            name: contentData.name,
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

      return validationResults;
    } catch (error) {
      console.error('Error validating topics for bulk content:', error);
      throw error;
    }
  }

  /**
   * NEW: Enhanced content creation with mandatory topic validation
   */
  async createContentWithTopicValidation(contentData) {
    try {
      const { examId, subjectId, topicName, ...restData } = contentData;
      
      // Validate topic first
      const topicValidation = await this.validateTopicForContent(
        examId, 
        subjectId, 
        topicName
      );

      if (!topicValidation.isValid) {
        throw new Error(topicValidation.message);
      }

      // Create content with validated topic
      const completeContentData = {
        examId,
        subjectId,
        topicId: topicValidation.topicId,
        ...restData
      };

      const content = new Content(completeContentData);
      await content.save();
      return await content.populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId']);
    } catch (error) {
      console.error('Error creating content with topic validation:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Bulk content creation with topic validation
   */
  async createBulkContentWithValidation(contentArray) {
    try {
      // Phase 1: Pre-validation
      console.log('🔍 Phase 1: Pre-validating all content items...');
      const validation = await this.validateTopicsForBulkContent(contentArray);
      
      if (validation.invalidItems.length > 0) {
        return {
          success: false,
          message: `Validation failed: ${validation.invalidItems.length} items have invalid topics`,
          validation,
          created: [],
          errors: validation.invalidItems,
          duplicates: []
        };
      }

      // Phase 2: Atomic creation
      console.log('✅ Phase 1 passed. Phase 2: Creating content items...');
      const results = { created: [], errors: [], duplicates: [] };
      
      // Use MongoDB transaction for atomicity
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          for (const [index, contentData] of contentArray.entries()) {
            try {
              // Get validation data
              const validationItem = validation.validItems.find(v => v.index === index);
              if (!validationItem) {
                throw new Error('Validation item not found');
              }

              // Resolve other required IDs
              const subCategory = await SubCategory.findOne({ 
                examId: validationItem.examId,
                name: contentData.subCategoryName?.toLowerCase() 
              }).session(session);
              
              const track = await Track.findOne({ 
                examId: validationItem.examId, 
                subCategoryId: subCategory?._id,
                name: contentData.trackName 
              }).session(session);

              if (!subCategory || !track) {
                throw new Error('SubCategory or Track not found');
              }

              // Create content with all validated data
              const completeContentData = {
                examId: validationItem.examId,
                subjectId: validationItem.subjectId,
                trackId: track._id,
                subCategoryId: subCategory._id,
                topicId: validationItem.topicId, // Validated topic ID
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

              const newContent = new Content(completeContentData);
              await newContent.save({ session });
              
              results.created.push({
                id: newContent._id,
                name: newContent.name,
                topic: validationItem.topicName
              });
              
            } catch (error) {
              if (error.code === 11000) {
                results.duplicates.push({
                  index,
                  name: contentData.name,
                  topic: contentData.topicName
                });
              } else {
                results.errors.push({
                  index,
                  name: contentData.name || 'Unknown',
                  topic: contentData.topicName,
                  error: error.message
                });
              }
            }
          }

          // If any errors occurred during creation, throw to rollback
          if (results.errors.length > 0) {
            throw new Error(`Creation failed with ${results.errors.length} errors`);
          }
        });

        return {
          success: true,
          message: `Successfully created ${results.created.length} content items with topic validation`,
          validation,
          results
        };

      } catch (transactionError) {
        return {
          success: false,
          message: 'Transaction failed, all changes rolled back',
          validation,
          results,
          transactionError: transactionError.message
        };
      } finally {
        await session.endSession();
      }

    } catch (error) {
      console.error('Error creating bulk content with validation:', error);
      throw error;
    }
  }

  // ========== EXISTING METHODS (Updated where needed) ==========

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

  async getTopicById(topicId) {
    try {
      return await Topic.findById(topicId).populate(['examId', 'subjectId']);
    } catch (error) {
      console.error('Error getting topic by id:', error);
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

  // Content methods (ENHANCED with topic validation)
  async createContent(contentData) {
    try {
      // If topicName is provided instead of topicId, validate and convert
      if (contentData.topicName && !contentData.topicId) {
        return await this.createContentWithTopicValidation(contentData);
      }
      
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

          // NEW: Topic validation
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
            topicId: topicId, // Now mandatory
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
        const exam = await Exam.findOne({ name: questionData.examName?.toUpperCase() });
        const subject = await Subject.findOne({ 
          examId: exam?._id, 
          name: questionData.subject 
        });
        
        // For past questions, find track in the pastquestions subcategory
        const pastQuestionsSubCategory = await SubCategory.findOne({
          examId: exam?._id,
          name: 'pastquestions'
        });
        
        // FIX: Use questionData.year to match track name
        const track = await Track.findOne({ 
          examId: exam?._id, 
          subCategoryId: pastQuestionsSubCategory?._id,
          name: questionData.year // Track name should match the year
        });
        
        // NEW: Enhanced topic validation for questions
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

  // Multi-selection methods for Past Questions
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

// UPDATED: Complete structure methods with track-specific topic filtering
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

        // UPDATED: For past questions, get topics that have questions for each track
        if (subCategory.name === 'pastquestions' || subCategory.contentType === 'json') {
          trackData.subjectTopics = {};
          for (const subject of subjects) {
            // Use the new method to get only topics with questions for this track
            const topicsWithQuestions = await this.getTopicsWithQuestionsForTrack(
              examId, subject._id, track._id
            );
            trackData.subjectTopics[subject._id] = topicsWithQuestions.map(topic => topic);
          }
        } else {
          // UPDATED: For file-based content, get topics that have content for each track
          trackData.subjectContent = {};
          for (const subject of subjects) {
            // Use the new method to get content grouped by track-specific topics
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

  // Validation methods (enhanced)
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

  // NEW: Enhanced validation for complete content upload
  async validateCompleteContentStructure(examId, subjectId, trackId, subCategoryId, topicName) {
    try {
      const validationResults = {
        examValid: false,
        subjectValid: false,
        trackValid: false,
        subCategoryValid: false,
        topicValid: false,
        availabilityValid: false,
        allValid: false,
        errors: []
      };

      // Validate exam
      validationResults.examValid = await this.validateExamExists(examId);
      if (!validationResults.examValid) {
        validationResults.errors.push('Exam not found');
      }

      // Validate subject
      validationResults.subjectValid = await this.validateSubjectExists(examId, subjectId);
      if (!validationResults.subjectValid) {
        validationResults.errors.push('Subject not found');
      }

      // Validate track
      validationResults.trackValid = await this.validateTrackExists(examId, subCategoryId, trackId);
      if (!validationResults.trackValid) {
        validationResults.errors.push('Track not found');
      }

      // Validate subcategory
      const subCategory = await SubCategory.findById(subCategoryId);
      validationResults.subCategoryValid = !!subCategory;
      if (!validationResults.subCategoryValid) {
        validationResults.errors.push('SubCategory not found');
      }

      // Validate topic
      if (topicName) {
        const topicValidation = await this.validateTopicForContent(examId, subjectId, topicName);
        validationResults.topicValid = topicValidation.isValid;
        if (!validationResults.topicValid) {
          validationResults.errors.push(topicValidation.message);
        }
      }

      // Validate subject availability
      validationResults.availabilityValid = await this.validateSubjectAvailability(
        examId, 
        subjectId, 
        subCategoryId
      );
      if (!validationResults.availabilityValid) {
        validationResults.errors.push('Subject not available in this subcategory');
      }

      // Overall validation
      validationResults.allValid = Object.keys(validationResults)
        .filter(key => key.endsWith('Valid'))
        .every(key => validationResults[key] === true);

      return validationResults;
    } catch (error) {
      console.error('Error validating complete content structure:', error);
      return {
        examValid: false,
        subjectValid: false,
        trackValid: false,
        subCategoryValid: false,
        topicValid: false,
        availabilityValid: false,
        allValid: false,
        errors: ['Validation error occurred']
      };
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

  // NEW: Topic management utilities
  async getTopicStatistics(examId, subjectId) {
    try {
      const stats = await Topic.aggregate([
        { 
          $match: { 
            examId: examId ? mongoose.Types.ObjectId(examId) : { $exists: true },
            subjectId: subjectId ? mongoose.Types.ObjectId(subjectId) : { $exists: true },
            isActive: true 
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
            from: 'exams',
            localField: 'examId',
            foreignField: '_id',
            as: 'exam'
          }
        },
        {
          $group: {
            _id: {
              examId: '$examId',
              subjectId: '$subjectId',
              examName: { $arrayElemAt: ['$exam.displayName', 0] },
              subjectName: { $arrayElemAt: ['$subject.displayName', 0] }
            },
            topicCount: { $sum: 1 },
            topics: { $push: { name: '$name', displayName: '$displayName' } }
          }
        },
        {
          $sort: { '_id.examName': 1, '_id.subjectName': 1 }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting topic statistics:', error);
      throw error;
    }
  }



/**
 * NEW: Get topics that have actual content for a specific track
 */
async getTopicsWithContentForTrack(examId, subjectId, trackId, subCategoryId) {
  try {
    // Get all content for the specific track
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
 * NEW: Get topics that have questions for a specific track (for past questions)
 */
async getTopicsWithQuestionsForTrack(examId, subjectId, trackId) {
  try {
    // Get all questions for the specific track
    const questions = await Question.find({
      examId,
      subjectId,
      trackId,
      isActive: true
    }).populate('topicId');

    // Extract unique topics from the questions
    const topicsWithQuestions = [];
    const topicIds = new Set();

    questions.forEach(question => {
      if (question.topicId && !topicIds.has(question.topicId._id.toString())) {
        topicIds.add(question.topicId._id.toString());
        topicsWithQuestions.push({
          ...question.topicId.toObject(),
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
 * NEW: Get content grouped by track-specific topics
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

/**
 * NEW: Get questions grouped by track-specific topics
 */
async getQuestionsGroupedByTrackTopics(examId, subjectId, trackId) {
  try {
    // Get topics that have questions for this track
    const topicsWithQuestions = await this.getTopicsWithQuestionsForTrack(
      examId, subjectId, trackId
    );

    // Get all questions for the track
    const allQuestions = await Question.find({
      examId,
      subjectId,
      trackId,
      isActive: true
    }).populate(['examId', 'subjectId', 'trackId', 'topicId'])
      .sort({ orderIndex: 1, _id: 1 });

    // Group questions by topics (only topics that have questions)
    const questionsByTopics = {};

    topicsWithQuestions.forEach(topic => {
      questionsByTopics[topic._id.toString()] = {
        topic: topic,
        questions: allQuestions.filter(question => 
          question.topicId._id.toString() === topic._id.toString()
        )
      };
    });

    return {
      topicsWithQuestions: topicsWithQuestions,
      questionsByTopics: Object.values(questionsByTopics),
      totalTopics: topicsWithQuestions.length,
      totalQuestions: allQuestions.length
    };
  } catch (error) {
    console.error('Error getting questions grouped by track topics:', error);
    throw error;
  }
}

  // Additional utility methods
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
      if (filters.topicId) searchQuery.topicId = filters.topicId;
      if (filters.fileType) searchQuery.fileType = filters.fileType;

      return await Content.find(searchQuery)
        .populate(['examId', 'subjectId', 'trackId', 'subCategoryId', 'topicId'])
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