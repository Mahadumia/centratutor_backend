// routes/jamb/subject.js
const express = require('express');
const router = express.Router();
const JambSubjectModel = require('../../models/jamb/subject');

// Initialize the subject model
const subjectModel = new JambSubjectModel();

/**
 * @route   GET /api/jamb/subject
 * @desc    Get all JAMB subjects
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
 * @route   GET /api/jamb/subject/full-data
 * @desc    Get complete JAMB data structure
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
 * @route   GET /api/jamb/subject/:id
 * @desc    Get a JAMB subject by ID
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
 * @route   GET /api/jamb/subject/name/:name/topics
 * @desc    Get topics for a specific JAMB subject
 * @access  Public
 */
router.get('/name/:name/topics', async (req, res) => {
  try {
    const topics = await subjectModel.getTopicsBySubject(req.params.name);
    
    if (!topics || topics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this subject' });
    }
    
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/jamb/subject/id/:id/topics
 * @desc    Get topics for a JAMB subject by ID
 * @access  Public
 */
router.get('/id/:id/topics', async (req, res) => {
  try {
    const topics = await subjectModel.getTopicsBySubjectId(req.params.id);
    
    if (!topics || topics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this subject' });
    }
    
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jamb/subject
 * @desc    Add a new JAMB subject
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
 * @route   POST /api/jamb/subject/name/:name/topics
 * @desc    Add topics to a JAMB subject
 * @access  Private
 */
router.post('/name/:name/topics', async (req, res) => {
  try {
    const { topics } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
    }
    
    const updatedTopics = await subjectModel.addTopicsToSubject(req.params.name, topics);
    res.json(updatedTopics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/jamb/subject/complete-setup
 * @desc    Create a new JAMB subject with topics in one API call
 * @access  Private
 */
router.post('/complete-setup', async (req, res) => {
  try {
    const { name, icon, topics } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'Topics array is required' });
    }
    
    // 1. Add the subject
    const newSubject = await subjectModel.addSubject({ name, icon });
    
    // 2. Add topics to the subject
    const subjectTopics = await subjectModel.addTopicsToSubject(name, topics);
    
    res.status(201).json({
      subject: newSubject,
      topics: subjectTopics
    });
    
  } catch (error) {
    console.error('Error in complete JAMB subject setup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/jamb/subject/:id
 * @desc    Update a JAMB subject
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const updatedSubject = await subjectModel.updateSubject(req.params.id, updates);
    
    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json(updatedSubject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/jamb/subject/id/:id/complete-update
 * @desc    Update a JAMB subject with its topics in one API call
 * @access  Private
 */
router.put('/id/:id/complete-update', async (req, res) => {
  try {
    const { name, icon, topics } = req.body;
    const subjectId = req.params.id;
    
    // 1. Get the current subject
    const currentSubject = await subjectModel.getSubjectById(subjectId);
    if (!currentSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // 2. Update the subject details if provided
    if (name || icon) {
      const updates = {};
      if (name) updates.name = name;
      if (icon) updates.icon = icon;
      
      await subjectModel.updateSubject(subjectId, updates);
    }
    
    // Get the subject name to use (either updated or original)
    const subjectName = name || currentSubject.name;
    
    // 3. Update or add topics if provided
    let subjectTopics = [];
    if (topics && Array.isArray(topics) && topics.length > 0) {
      subjectTopics = await subjectModel.addTopicsToSubject(subjectName, topics);
    } else {
      subjectTopics = await subjectModel.getTopicsBySubject(subjectName);
    }
    
    // 4. Get the updated subject data to return
    const updatedSubject = await subjectModel.getSubjectById(subjectId);
    
    res.json({
      subject: updatedSubject,
      topics: subjectTopics
    });
    
  } catch (error) {
    console.error('Error in complete JAMB subject update:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/jamb/subject/:id
 * @desc    Delete a JAMB subject
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await subjectModel.deleteSubject(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;