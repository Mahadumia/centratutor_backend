// routes/jupeb/questionBank.js (updated)
const express = require('express');
const router = express.Router();
const JupebQuestionBankModel = require('../../models/jupeb/questionBank');
const mongoose = require('mongoose');

// Initialize model
const questionBankModel = new JupebQuestionBankModel();

/**
 * @route   GET /api/jupeb/question-bank/all
 * @desc    Get all questions with optional pagination
 * @access  Private
 */
router.get('/all', async (req, res) => {
  try {
    const { limit = 1000, page = 1 } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive number' });
    }
    
    if (isNaN(parsedPage) || parsedPage <= 0) {
      return res.status(400).json({ message: 'Page must be a positive number' });
    }
    
    const skip = (parsedPage - 1) * parsedLimit;
    
    const questions = await questionBankModel.getAllQuestions(parsedLimit, skip);
    const total = await questionBankModel.countTotalQuestions();
    
    res.json({
      total,
      page: parsedPage,
      limit: parsedLimit,
      pageCount: Math.ceil(total / parsedLimit),
      questions
    });
    
  } catch (error) {
    console.error('Error fetching all questions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/question-bank/filter
 * @desc    Get questions by category/subject and topics with advanced filtering
 * @access  Public
 */
router.post('/filter', async (req, res) => {
  try {
    const { 
      category,
      subject,
      topics,
      totalSections = 6,
      sectionNumber = 1,
      maxQuestionsPerSection = 10
    } = req.body;
    
    // Validate inputs
    if (!category && !subject) {
      return res.status(400).json({ 
        message: 'Either category or subject is required' 
      });
    }
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ 
        message: 'Topics array is required and cannot be empty' 
      });
    }
    
    // Validate section parameters
    const parsedTotalSections = parseInt(totalSections);
    const parsedSectionNumber = parseInt(sectionNumber);
    const parsedMaxQuestionsPerSection = parseInt(maxQuestionsPerSection);
    
    if (isNaN(parsedTotalSections) || parsedTotalSections <= 0) {
      return res.status(400).json({ message: 'Total sections must be a positive number' });
    }
    
    if (isNaN(parsedSectionNumber) || parsedSectionNumber <= 0 || parsedSectionNumber > parsedTotalSections) {
      return res.status(400).json({ 
        message: `Section number must be between 1 and ${parsedTotalSections}` 
      });
    }
    
    if (isNaN(parsedMaxQuestionsPerSection) || parsedMaxQuestionsPerSection <= 0) {
      return res.status(400).json({ message: 'Max questions per section must be a positive number' });
    }
    
    // Get questions based on filters
    let questions;
    try {
      if (subject) {
        questions = await questionBankModel.getQuestionsBySubjectAndTopics(subject, topics);
      } else {
        questions = await questionBankModel.getQuestionsByCategoryAndTopics(category, topics);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ 
        message: 'Error fetching questions', 
        error: error.message 
      });
    }
    
    // If no questions found
    if (!questions || questions.length === 0) {
      return res.status(404).json({
        message: 'No questions found for the selected criteria',
        category,
        subject,
        topics
      });
    }
    
    // Divide questions into sections and get requested section
    try {
      // Pass metadata for deterministic sorting
      const metadata = {
        subject,
        category,
        topics
      };
      
      const sectionData = questionBankModel.divideQuestionsIntoSections(
        questions, 
        parsedTotalSections, 
        parsedSectionNumber,
        parsedMaxQuestionsPerSection,
        metadata
      );
      
      // Return the filtered and sectioned quiz data
      res.json({
        category,
        subject,
        topics,
        ...sectionData
      });
    } catch (error) {
      console.error('Error dividing questions into sections:', error);
      res.status(500).json({ 
        message: 'Error dividing questions into sections', 
        error: error.message 
      });
    }
    
  } catch (error) {
    console.error('Error in question bank filter API:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/question-bank/section
 * @desc    Get a specific section of questions
 * @access  Public
 */
router.post('/section', async (req, res) => {
  try {
    const { 
      category,
      subject,
      topics,
      totalSections = 6,
      sectionNumber = 1,
      maxQuestionsPerSection = 10
    } = req.body;
    
    // Validate inputs
    if (!category && !subject) {
      return res.status(400).json({ 
        message: 'Either category or subject is required' 
      });
    }
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ 
        message: 'Topics array is required and cannot be empty' 
      });
    }
    
    // Validate section parameters
    const parsedTotalSections = parseInt(totalSections);
    const parsedSectionNumber = parseInt(sectionNumber);
    const parsedMaxQuestionsPerSection = parseInt(maxQuestionsPerSection);
    
    if (isNaN(parsedTotalSections) || parsedTotalSections <= 0) {
      return res.status(400).json({ message: 'Total sections must be a positive number' });
    }
    
    if (isNaN(parsedSectionNumber) || parsedSectionNumber <= 0 || parsedSectionNumber > parsedTotalSections) {
      return res.status(400).json({ 
        message: `Section number must be between 1 and ${parsedTotalSections}` 
      });
    }
    
    if (isNaN(parsedMaxQuestionsPerSection) || parsedMaxQuestionsPerSection <= 0) {
      return res.status(400).json({ message: 'Max questions per section must be a positive number' });
    }
    
    // Get questions based on filters
    let questions;
    try {
      if (subject) {
        questions = await questionBankModel.getQuestionsBySubjectAndTopics(subject, topics);
      } else {
        questions = await questionBankModel.getQuestionsByCategoryAndTopics(category, topics);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ 
        message: 'Error fetching questions', 
        error: error.message 
      });
    }
    
    // If no questions found
    if (!questions || questions.length === 0) {
      return res.status(404).json({
        message: 'No questions found for the selected criteria',
        category,
        subject,
        topics
      });
    }
    
    // Divide questions into sections and get requested section
    try {
      // Pass metadata for deterministic sorting
      const metadata = {
        subject,
        category,
        topics
      };
      
      const sectionData = questionBankModel.divideQuestionsIntoSections(
        questions, 
        parsedTotalSections, 
        parsedSectionNumber,
        parsedMaxQuestionsPerSection,
        metadata
      );
      
      // Return the section data
      res.json({
        category,
        subject,
        topics,
        ...sectionData
      });
    } catch (error) {
      console.error('Error dividing questions into sections:', error);
      res.status(500).json({ 
        message: 'Error dividing questions into sections', 
        error: error.message 
      });
    }
    
  } catch (error) {
    console.error('Error in question bank section API:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/jupeb/question-bank/advanced-filter
 * @desc    Get questions by multiple criteria with advanced filtering options
 * @access  Public
 */
router.post('/advanced-filter', async (req, res) => {
  try {
    const { 
      category,
      subject,
      topics,
      limit = 1000,
      page = 1
    } = req.body;
    
    // Validate the minimum required filters
    if (!category && !subject && (!topics || !topics.length)) {
      return res.status(400).json({ 
        message: 'At least one filter criterion (category, subject, or topics) is required' 
      });
    }
    
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: 'Limit must be a positive number' });
    }
    
    if (isNaN(parsedPage) || parsedPage <= 0) {
      return res.status(400).json({ message: 'Page must be a positive number' });
    }
    
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Get count of matching questions for pagination
    const totalCount = await questionBankModel.countQuestionsByFilters(subject, category, topics);
    
    if (totalCount === 0) {
      return res.status(404).json({
        message: 'No questions found for the specified criteria',
        category,
        subject,
        topics
      });
    }
    
    // Get questions based on filters
    const questions = await questionBankModel.getQuestionsByFilters({
      subject,
      category,
      topics,
      limit: parsedLimit,
      skip
    });
    
    res.json({
      total: totalCount,
      page: parsedPage,
      limit: parsedLimit,
      pageCount: Math.ceil(totalCount / parsedLimit),
      category,
      subject,
      topics,
      questions
    });
    
  } catch (error) {
    console.error('Error in advanced filter API:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;