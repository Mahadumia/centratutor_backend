// models/jupeb/questionBank.js (updated)
const mongoose = require('mongoose');
const crypto = require('crypto');

class JupebQuestionBankModel {

  /**
   * Get all questions from the JupebQuestion collection
   * @param {number} limit - Optional limit to the number of questions returned
   * @param {number} skip - Optional number of questions to skip
   * @returns {Promise<Array>} - Array of questions
   */
  async getAllQuestions(limit = 1000, skip = 0) {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      const questions = await JupebQuestion.find()
        .skip(skip)
        .limit(limit)
        .lean();
      
      return questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined
      }));
    } catch (error) {
      console.error('Error getting all questions:', error);
      throw error;
    }
  }

  /**
   * Count total questions in the database
   * @returns {Promise<number>} - Total question count
   */
  async countTotalQuestions() {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      return await JupebQuestion.countDocuments();
    } catch (error) {
      console.error('Error counting questions:', error);
      throw error;
    }
  }

  /**
   * Get questions by subject, topic combination (across all years)
   * @param {string} subject - The subject name
   * @param {Array} topics - Array of topics to filter by
   * @returns {Promise<Array>} - Array of questions
   */
  async getQuestionsBySubjectAndTopics(subject, topics) {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      
      // Check for valid inputs
      if (!subject) {
        throw new Error('Subject is required');
      }
      
      // If topics array is provided, filter by it
      const filter = { subject };
      if (topics && Array.isArray(topics) && topics.length > 0) {
        filter.topic = { $in: topics };
      }

      const questions = await JupebQuestion.find(filter).lean();
      
      return questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined
      }));
    } catch (error) {
      console.error('Error getting questions by subject and topics:', error);
      throw error;
    }
  }

  /**
   * Get questions by category and topics (across all subjects and years)
   * @param {string} category - The category (e.g., "Past Question")
   * @param {Array} topics - Array of topics to filter by
   * @returns {Promise<Array>} - Array of questions
   */
  async getQuestionsByCategoryAndTopics(category, topics) {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      
      // Check for valid inputs
      if (!category) {
        throw new Error('Category is required');
      }
      
      // Build filter object
      const filter = { program: category };
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        filter.topic = { $in: topics };
      }

      const questions = await JupebQuestion.find(filter).lean();
      
      return questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined
      }));
    } catch (error) {
      console.error('Error getting questions by category and topics:', error);
      throw error;
    }
  }

  /**
   * Generate a deterministic hash for a string
   * @param {string} input - Input string to hash
   * @returns {number} - Numeric hash value
   */
  getHashCode(input) {
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Create a deterministic random number generator
   * @param {number} seed - Seed value for the RNG
   * @returns {Function} - Function that generates random numbers deterministically
   */
  createSeededRandom(seed) {
    // Simple seeded pseudorandom number generator
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Sort array deterministically based on a seed
   * @param {Array} array - Array to sort
   * @param {number} seed - Seed value for deterministic sorting
   * @returns {Array} - Sorted array
   */
  deterministicSort(array, seed) {
    const random = this.createSeededRandom(seed);
    
    // Create a copy with additional sort values
    const arrayCopy = array.map(item => ({
      item,
      sortValue: random()
    }));
    
    // Sort by the random values
    arrayCopy.sort((a, b) => a.sortValue - b.sortValue);
    
    // Return just the original items in the new order
    return arrayCopy.map(x => x.item);
  }

/**
 * Divide questions into sections with topic balancing while maintaining deterministic distribution
 * @param {Array} questions - Array of questions to divide
 * @param {number} totalSections - Total number of sections to divide into
 * @param {number} sectionNumber - Section number to retrieve (1-based)
 * @param {number} maxQuestionsPerSection - Maximum questions per section
 * @param {Object} metadata - Additional metadata for deterministic distribution
 * @returns {Object} - Object containing the section questions and metadata
 */
divideQuestionsIntoSections(questions, totalSections, sectionNumber, maxQuestionsPerSection = 10, metadata = {}) {
    // Validate inputs
    if (!Array.isArray(questions)) {
      throw new Error('Questions must be an array');
    }
    
    // Handle empty questions array
    if (questions.length === 0) {
      return {
        totalQuestions: 0,
        totalSections,
        currentSection: sectionNumber,
        questionsInSection: 0,
        maxQuestionsPerSection,
        questions: []
      };
    }
    
    // Ensure valid section parameters
    if (totalSections <= 0) {
      totalSections = 1;
    }
    
    if (sectionNumber <= 0) {
      sectionNumber = 1;
    } else if (sectionNumber > totalSections) {
      sectionNumber = totalSections;
    }
    
    // Create a deterministic seed based on the metadata
    const seedInput = JSON.stringify({
      subject: metadata.subject || '',
      topics: metadata.topics || [],
      category: metadata.category || ''
    });
    
    // Generate a consistent hash for the combination of parameters
    const seed = this.getHashCode(seedInput);
    
    // Group questions by topic
    const questionsByTopic = {};
    questions.forEach(question => {
      const topic = question.topic || 'unknown';
      if (!questionsByTopic[topic]) {
        questionsByTopic[topic] = [];
      }
      questionsByTopic[topic].push(question);
    });
    
    // Get list of topics and sort them deterministically
    const topics = Object.keys(questionsByTopic);
    const sortedTopics = this.deterministicSort([...topics], seed);
    
    // Sort questions within each topic deterministically
    for (const topic of topics) {
      questionsByTopic[topic] = this.deterministicSort(
        questionsByTopic[topic], 
        this.getHashCode(topic + seedInput)
      );
    }
    
    // Initialize sections array
    const sectionsData = Array(totalSections).fill().map(() => []);
    
    // Calculate total questions needed
    const totalQuestionsNeeded = totalSections * maxQuestionsPerSection;
    
    // Ensure each section will get exactly maxQuestionsPerSection questions
    const questionsPerSection = maxQuestionsPerSection;
    
    // Track which topics have been exhausted
    const exhaustedTopics = new Set();
    
    // Calculate how many questions to include from each topic in each section
    // We'll try to keep the topic distribution balanced across sections
    for (let sectionIdx = 0; sectionIdx < totalSections; sectionIdx++) {
      // Calculate how many questions we still need for this section
      let remainingQuestions = questionsPerSection;
      
      // Counter to prevent infinite loops
      let cycleCount = 0;
      const maxCycles = sortedTopics.length * 2;
      
      // Create a temporary working set of topics for this section
      const availableTopics = sortedTopics.filter(topic => !exhaustedTopics.has(topic));
      
      // If all topics are exhausted but we still need questions, reset
      if (availableTopics.length === 0 && remainingQuestions > 0) {
        exhaustedTopics.clear();
        availableTopics.push(...sortedTopics);
      }
      
      // Use a deterministic starting point for this section
      const sectionSeed = seed + sectionIdx;
      const startingTopicIndex = sectionSeed % availableTopics.length;
      
      // Distribute in round-robin fashion starting from our deterministic point
      let currentTopicIndex = startingTopicIndex;
      
      while (remainingQuestions > 0 && cycleCount < maxCycles) {
        cycleCount++;
        
        const currentTopic = availableTopics[currentTopicIndex % availableTopics.length];
        
        // Skip if topic is exhausted
        if (exhaustedTopics.has(currentTopic)) {
          currentTopicIndex++;
          continue;
        }
        
        // Get questions for this topic
        if (questionsByTopic[currentTopic].length > 0) {
          // Take one question from this topic
          const question = questionsByTopic[currentTopic].shift();
          sectionsData[sectionIdx].push(question);
          remainingQuestions--;
          
          // If this topic is now exhausted, mark it
          if (questionsByTopic[currentTopic].length === 0) {
            exhaustedTopics.add(currentTopic);
            
            // Recalculate available topics
            const newAvailableTopics = sortedTopics.filter(topic => !exhaustedTopics.has(topic));
            
            // If we've exhausted all topics, but still need questions, we'll need to reset
            if (newAvailableTopics.length === 0 && remainingQuestions > 0) {
              // We've used all questions exactly once
              // If we still need more, we need to cycle through again
              // This can happen if questions.length < totalQuestionsNeeded
              
              // Reset but maintain deterministic behavior
              for (const topic of sortedTopics) {
                // Skip truly empty topics
                if (questionsByTopic[topic] === undefined || 
                    questions.filter(q => q.topic === topic).length === 0) {
                  continue;
                }
                
                // Restore the original questions for this topic
                questionsByTopic[topic] = this.deterministicSort(
                  questions.filter(q => q.topic === topic),
                  this.getHashCode(topic + seedInput + sectionIdx) // Add sectionIdx for variation
                );
              }
              
              exhaustedTopics.clear();
            }
          }
        }
        
        // Move to next topic (round-robin fashion)
        currentTopicIndex++;
      }
      
      // After populating the section, sort the questions within the section for consistency
      sectionsData[sectionIdx] = this.deterministicSort(sectionsData[sectionIdx], sectionSeed);
    }
    
    // Return the requested section
    const sectionQuestions = sectionsData[sectionNumber - 1] || [];
    
    // Handle cases where we need to pad the section to reach maxQuestionsPerSection
    if (sectionQuestions.length < maxQuestionsPerSection && questions.length > 0) {
      // We need to pad this section with questions to reach the minimum required
      const questionsNeeded = maxQuestionsPerSection - sectionQuestions.length;
      
      // Create a pool of questions to draw from, prioritizing questions not already in this section
      const questionPool = this.deterministicSort(
        questions.filter(q => !sectionQuestions.some(sq => sq.id === q.id)),
        seed + sectionNumber * 31  // Use a different seed variation
      );
      
      // If we don't have enough unique questions left, just use all questions
      const paddingPool = questionPool.length >= questionsNeeded ? questionPool : 
        this.deterministicSort([...questions], seed + sectionNumber * 71);
      
      // Add questions until we reach the minimum or run out of questions to add
      for (let i = 0; i < questionsNeeded && i < paddingPool.length; i++) {
        sectionQuestions.push(paddingPool[i]);
      }
    }
    
    return {
      totalQuestions: questions.length,
      totalSections,
      currentSection: sectionNumber,
      questionsInSection: sectionQuestions.length,
      maxQuestionsPerSection,
      uniqueQuestionCount: questions.length,
      topicDistribution: this.calculateTopicDistribution(sectionQuestions),
      questions: sectionQuestions
    };
  }
  
  /**
   * Calculate the distribution of topics in a set of questions
   * @param {Array} questions - Array of questions
   * @returns {Object} - Object mapping topics to their counts
   */
  calculateTopicDistribution(questions) {
    const distribution = {};
    
    questions.forEach(question => {
      const topic = question.topic || 'unknown';
      distribution[topic] = (distribution[topic] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  shuffleArray(array) {
    // Implementation of Fisher-Yates (Knuth) shuffle algorithm
    for (let i = array.length - 1; i > 0; i--) {
      // Generate a random index between 0 and i (inclusive)
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements at indices i and j
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Get the count of questions matching the given filters
   * @param {string} subject - The subject name (optional if category is provided)
   * @param {string} category - The category (optional if subject is provided)
   * @param {Array} topics - Array of topics to filter by
   * @returns {Promise<number>} - Count of matching questions
   */
  async countQuestionsByFilters(subject, category, topics) {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      
      // Build filter object
      const filter = {};
      
      if (subject) {
        filter.subject = subject;
      }
      
      if (category) {
        filter.program = category;
      }
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        filter.topic = { $in: topics };
      }
      
      return await JupebQuestion.countDocuments(filter);
    } catch (error) {
      console.error('Error counting questions by filters:', error);
      throw error;
    }
  }
  
  /**
   * Get questions by combined filters
   * @param {Object} filters - Object containing filter criteria
   * @param {string} filters.subject - The subject name (optional if category is provided)
   * @param {string} filters.category - The category (optional if subject is provided)
   * @param {Array} filters.topics - Array of topics to filter by
   * @param {number} filters.limit - Maximum number of questions to return
   * @param {number} filters.skip - Number of questions to skip
   * @returns {Promise<Array>} - Array of questions
   */
  async getQuestionsByFilters(filters) {
    try {
      const JupebQuestion = mongoose.model('JupebQuestion');
      const { subject, category, topics, limit = 1000, skip = 0 } = filters;
      
      // Build filter object
      const queryFilter = {};
      
      if (subject) {
        queryFilter.subject = subject;
      }
      
      if (category) {
        queryFilter.program = category;
      }
      
      if (topics && Array.isArray(topics) && topics.length > 0) {
        queryFilter.topic = { $in: topics };
      }
      
      const questions = await JupebQuestion.find(queryFilter)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();
      
      return questions.map(q => ({
        id: q._id.toString(),
        ...q,
        _id: undefined
      }));
    } catch (error) {
      console.error('Error getting questions by filters:', error);
      throw error;
    }
  }
}

module.exports = JupebQuestionBankModel;