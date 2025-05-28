// routes/waec/subject.js
const express = require('express');
const router = express.Router();
const WaecSubjectModel = require('../../models/waec/subject');

// Initialize the subject model
const subjectModel = new WaecSubjectModel();

/**
 * @route   GET /api/waec/subject
 * @desc    Get all WAEC subjects
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const subjects = await subjectModel.getAllSubjects();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/wace/subject/name/:name/years/:year/topics
 * @desc    Add topics to a WAEC subject year
 * @access  Private
 */
router.post('/name/:name/years/:year/topics', async (req, res) => {
  try {
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
    }
    
    const updatedTopics = await subjectModel.addTopicsToSubjectYear(
      req.params.name, 
      req.params.year, 
      topics
    );
    
    res.json(updatedTopics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/waec/subject/complete-setup
 * @desc    Create a new WAEC subject with years and topics in one API call
 * @access  Private
 */
router.post('/complete-setup', async (req, res) => {
  try {
    const { name, icon, years, topics } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }
    
    if (!years || !Array.isArray(years) || years.length === 0) {
      return res.status(400).json({ message: 'Years array is required' });
    }
    
    if (!topics || typeof topics !== 'object' || Object.keys(topics).length === 0) {
      return res.status(400).json({ message: 'Topics object with year keys is required' });
    }
    
    // Validate that all topic years are included in the years array
    const topicYears = Object.keys(topics);
    const invalidYears = topicYears.filter(year => !years.includes(year));
    
    if (invalidYears.length > 0) {
      return res.status(400).json({ 
        message: 'All topic years must be included in the years array',
        invalidYears
      });
    }
    
    // 1. Add the subject
    const newSubject = await subjectModel.addSubject({ name, icon });
    
    // 2. Add years to the subject
    await subjectModel.addYearsToSubject(name, years);
    
    // 3. Add topics for each year
    const topicPromises = topicYears.map(year => {
      return subjectModel.addTopicsToSubjectYear(name, year, topics[year]);
    });
    
    await Promise.all(topicPromises);
    
    // 4. Get the complete subject data to return
    const subjectYears = await subjectModel.getYearsBySubject(name);
    const subjectTopics = {};
    
    for (const year of subjectYears) {
      const yearTopics = await subjectModel.getTopicsBySubjectAndYear(name, year);
      subjectTopics[year] = yearTopics;
    }
    
    res.status(201).json({
      subject: newSubject,
      years: subjectYears,
      topics: subjectTopics
    });
    
  } catch (error) {
    console.error('Error in complete WAEC subject setup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/waec/subject
 * @desc    Add a new WAEC subject
 * @access  Private (would typically require authentication)
 */
router.post('/', async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }
    
    const newSubject = await subjectModel.addSubject({ name, icon });
    res.status(201).json(newSubject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/waec/subject/name/:name/years
 * @desc    Add years to a WAEC subject
 * @access  Private
 */
router.post('/name/:name/years', async (req, res) => {
  try {
    const { years } = req.body;
    
    if (!years || !Array.isArray(years) || years.length === 0) {
      return res.status(400).json({ message: 'Years array is required' });
    }
    
    const updatedYears = await subjectModel.addYearsToSubject(req.params.name, years);
    res.json(updatedYears);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/name/:name/years/:year/topics
 * @desc    Get topics for a specific WAEC subject and year
 * @access  Public
 */
router.get('/name/:name/years/:year/topics', async (req, res) => {
  try {
    const topics = await subjectModel.getTopicsBySubjectAndYear(req.params.name, req.params.year);
    
    if (!topics || topics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this subject and year' });
    }
    
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/name/:name/all-topics
 * @desc    Get all topics for a WAEC subject across all years
 * @access  Public
 */
router.get('/name/:name/all-topics', async (req, res) => {
  try {
    const topics = await subjectModel.getAllTopicsBySubject(req.params.name);
    
    if (!topics || topics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this subject' });
    }
    
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/id/:id/all-topics
 * @desc    Get all topics for a WAEC subject by ID across all years
 * @access  Public
 */
router.get('/id/:id/all-topics', async (req, res) => {
  try {
    const topics = await subjectModel.getAllTopicsBySubjectId(req.params.id);
    
    if (!topics || topics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this subject' });
    }
    
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/full-data
 * @desc    Get complete WAEC data structure
 * @access  Public
 */
router.get('/full-data', async (req, res) => {
  try {
    const fullData = await subjectModel.getFullData();
    res.json(fullData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/:id
 * @desc    Get a WAEC subject by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const subject = await subjectModel.getSubjectById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/name/:name/years
 * @desc    Get years for a specific WAEC subject
 * @access  Public
 */
router.get('/name/:name/years', async (req, res) => {
  try {
    const years = await subjectModel.getYearsBySubject(req.params.name);
    
    if (!years || years.length === 0) {
      return res.status(404).json({ message: 'No years found for this subject' });
    }
    
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/waec/subject/id/:id/years
 * @desc    Get years for a WAEC subject by ID
 * @access  Public
 */
router.get('/id/:id/years', async (req, res) => {
  try {
    const years = await subjectModel.getYearsBySubjectId(req.params.id);
    
    if (!years || years.length === 0) {
      return res.status(404).json({ message: 'No years found for this subject' });
    }
    
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
