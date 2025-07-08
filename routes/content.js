// routes/content.js - Improved Context-Specific Content Upload Routes
const express = require('express');
const router = express.Router();
const { ExamModel } = require('../models/exam');

// Initialize the exam model
const examModel = new ExamModel();


router.get('/groups/:examName/:subjectName/:trackName/:subCategoryName', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    const { groupBy = 'topic' } = req.query; // Can group by 'topic', 'day', 'year', etc.

    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    // Get content for this context
    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });

    let groupedContent = {};

    if (groupBy === 'topic') {
      // Group by topics (DEFAULT - works for all track types)
      content.forEach(item => {
        const topicKey = item.topicId?.name || 'uncategorized';
        const topicDisplay = item.topicId?.displayName || 'Uncategorized';
        
        if (!groupedContent[topicKey]) {
          groupedContent[topicKey] = {
            groupKey: topicKey,
            groupName: topicDisplay,
            groupType: 'topic',
            items: []
          };
        }
        groupedContent[topicKey].items.push(item);
      });

    } else if (groupBy === 'day' && track.trackType === 'days') {
      // Group by days for day-based tracks
      content.forEach(item => {
        // Check metadata first, then fallback to name parsing
        const day = item.metadata?.day || 
                    (item.name.match(/day(\d+)/i) ? parseInt(item.name.match(/day(\d+)/i)[1]) : 0);
        const dayKey = `day_${day}`;
        
        if (!groupedContent[dayKey]) {
          groupedContent[dayKey] = {
            groupKey: dayKey,
            groupName: `Day ${day}`,
            groupType: 'day',
            items: []
          };
        }
        groupedContent[dayKey].items.push(item);
      });

    } else if (groupBy === 'week' && track.trackType === 'weeks') {
      // Group by weeks for week-based tracks - MATCHES YOUR UPLOAD STRUCTURE
      content.forEach(item => {
        // Check metadata first (from your upload), then fallback to name parsing
        const week = item.metadata?.week || 
                     (item.name.match(/week(\d+)/i) ? parseInt(item.name.match(/week(\d+)/i)[1]) : 0);
        const weekKey = `week_${week}`;
        
        if (!groupedContent[weekKey]) {
          groupedContent[weekKey] = {
            groupKey: weekKey,
            groupName: `Week ${week}`,
            groupType: 'week',
            items: []
          };
        }
        groupedContent[weekKey].items.push(item);
      });

    } else if (groupBy === 'month' && track.trackType === 'months') {
      // Group by months for month-based tracks
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      content.forEach(item => {
        // Check metadata first, then fallback to name parsing
        const month = item.metadata?.month || 
                      (item.name.match(/month(\d+)/i) ? parseInt(item.name.match(/month(\d+)/i)[1]) : 0);
        const monthKey = `month_${month}`;
        const monthName = monthNames[month - 1] || `Month ${month}`;
        
        if (!groupedContent[monthKey]) {
          groupedContent[monthKey] = {
            groupKey: monthKey,
            groupName: monthName,
            groupType: 'month',
            items: []
          };
        }
        groupedContent[monthKey].items.push(item);
      });

    } else if (groupBy === 'semester' && track.trackType === 'semester') {
      // 🔧 FIXED: Group by exact semesterName to create separate groups for learning app
      console.log('🎓 [SEMESTER DEBUG] Starting semester grouping...');
      console.log('📊 [CONTENT COUNT]', content.length, 'items found');
      
      content.forEach((item, index) => {
        // 🎯 Use semesterName as the key, not numeric semester for separate groups
        const semesterName = item.metadata?.semesterName || 
                            item.metadata?.originalSemesterNumber || 
                            `Semester ${item.metadata?.semester || 1}`;
        
        // Create unique key based on actual semester name for separate groups
        const semesterKey = semesterName.toLowerCase().replace(/\s+/g, '_');
        
        console.log(`🔍 [ITEM ${index + 1}] Processing:`, {
          name: item.name,
          semesterName: semesterName,
          semesterKey: semesterKey,
          fullMetadata: item.metadata
        });
        
        if (!groupedContent[semesterKey]) {
          groupedContent[semesterKey] = {
            groupKey: semesterKey,
            groupName: semesterName, // Exact name: "001", "first semester", "john up"
            groupType: 'semester',
            items: [],
            sortOrder: item.metadata?.semester || 1 // For sorting purposes
          };
          console.log(`✅ [NEW GROUP] Created separate group "${semesterName}" (${semesterKey})`);
        } else {
          console.log(`📁 [EXISTING GROUP] Adding to group "${groupedContent[semesterKey].groupName}" (${semesterKey})`);
        }
        
        groupedContent[semesterKey].items.push(item);
      });
      
      console.log('🎓 [SEMESTER DEBUG] Final groups:', Object.keys(groupedContent).map(key => ({
        key,
        name: groupedContent[key].groupName,
        itemCount: groupedContent[key].items.length
      })));

    } else if (groupBy === 'year' && track.trackType === 'years') {
      // Group by years for year-based tracks
      content.forEach(item => {
        // Check metadata first, then fallback to name parsing
        const year = item.metadata?.year || 
                     item.name.match(/(\d{4})/)?.[1] || 'unknown';
        
        if (!groupedContent[year]) {
          groupedContent[year] = {
            groupKey: year,
            groupName: year,
            groupType: 'year',
            items: []
          };
        }
        groupedContent[year].items.push(item);
      });

    } else {
      // Default fallback - group by topic if invalid groupBy or track type mismatch
      content.forEach(item => {
        const topicKey = item.topicId?.name || 'uncategorized';
        const topicDisplay = item.topicId?.displayName || 'Uncategorized';
        
        if (!groupedContent[topicKey]) {
          groupedContent[topicKey] = {
            groupKey: topicKey,
            groupName: topicDisplay,
            groupType: 'topic',
            items: []
          };
        }
        groupedContent[topicKey].items.push(item);
      });
    }

    // Convert to array and sort
    const groups = Object.values(groupedContent).sort((a, b) => {
      if (groupBy === 'topic') {
        return (a.items[0]?.topicId?.orderIndex || 0) - (b.items[0]?.topicId?.orderIndex || 0);
      } else if (groupBy === 'day') {
        const aDay = parseInt(a.groupKey.split('_')[1]) || 0;
        const bDay = parseInt(b.groupKey.split('_')[1]) || 0;
        return aDay - bDay;
      } else if (groupBy === 'week') {
        const aWeek = parseInt(a.groupKey.split('_')[1]) || 0;
        const bWeek = parseInt(b.groupKey.split('_')[1]) || 0;
        return aWeek - bWeek;
      } else if (groupBy === 'month') {
        const aMonth = parseInt(a.groupKey.split('_')[1]) || 0;
        const bMonth = parseInt(b.groupKey.split('_')[1]) || 0;
        return aMonth - bMonth;
      } else if (groupBy === 'semester') {
        // Sort by sortOrder (numeric semester) but keep separate groups
        const aSemester = a.sortOrder || 0;
        const bSemester = b.sortOrder || 0;
        if (aSemester !== bSemester) {
          return aSemester - bSemester;
        }
        // If same numeric semester, sort alphabetically by name
        return a.groupName.localeCompare(b.groupName);
      } else if (groupBy === 'year') {
        return parseInt(b.groupKey) - parseInt(a.groupKey); // Newest first
      }
      return 0;
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      groupBy,
      totalItems: content.length,
      totalGroups: groups.length,
      groups
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== WEEK-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific week in a weekly track
 * @route   POST /api/content/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Upload content for a specific week (Week 1, Week 2, etc.)
 * @access  Private
 */
router.post('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate week number
    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      return res.status(400).json({ message: 'Valid week number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
      });
    }

    // Check if week number is within track duration
    if (track.duration && week > track.duration) {
      return res.status(400).json({ 
        message: `Week ${week} exceeds track duration of ${track.duration} weeks` 
      });
    }

    // NEW: Check for existing content in this week to prevent duplicates
    const existingWeekContent = await Content.findOne({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.week': week
    });

    if (existingWeekContent) {
      return res.status(409).json({ 
        message: `Content for Week ${week} already exists. Cannot upload duplicate weekly content.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        existingContent: {
          name: existingWeekContent.name,
          displayName: existingWeekContent.displayName,
          createdAt: existingWeekContent.createdAt
        }
      });
    }

    // Add week-specific naming to each content item
    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `week${week}_${item.name}`,
      displayName: `Week ${week} - ${item.displayName || item.name}`,
      description: item.description ? `Week ${week}: ${item.description}` : `Week ${week} content`,
      orderIndex: (week * 1000) + (item.orderIndex || index), // Week-based ordering
      metadata: {
        ...item.metadata,
        week: week,
        weekLabel: `Week ${week}`,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week,
          weekLabel: `Week ${week}`
        },
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== DAY-BASED TRACK CONTENT UPLOAD ==========

/**
 * NEW: Upload content to a specific day in a daily track
 * @route   POST /api/content/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Upload content for a specific day (Day 1, Day 2, etc.)
 * @access  Private
 */
router.post('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // Validate day number
    const day = parseInt(dayNumber);
    if (isNaN(day) || day < 1) {
      return res.status(400).json({ message: 'Valid day number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
      });
    }

    // Check if day number is within track duration
    if (track.duration && day > track.duration) {
      return res.status(400).json({ 
        message: `Day ${day} exceeds track duration of ${track.duration} days` 
      });
    }

    // NEW: Check for existing content in this day to prevent duplicates
    const existingDayContent = await Content.findOne({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.day': day
    });

    if (existingDayContent) {
      return res.status(409).json({ 
        message: `Content for Day ${day} already exists. Cannot upload duplicate daily content.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        existingContent: {
          name: existingDayContent.name,
          displayName: existingDayContent.displayName,
          createdAt: existingDayContent.createdAt
        }
      });
    }

    // Add day-specific naming to each content item
    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `day${day}_${item.name}`,
      displayName: `Day ${day} - ${item.displayName || item.name}`,
      description: item.description ? `Day ${day}: ${item.description}` : `Day ${day} content`,
      orderIndex: day * 100 + (item.orderIndex || index), // Day-based ordering
      metadata: {
        ...item.metadata,
        day: day,
        dayLabel: `Day ${day}`,
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to Day ${day}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day,
          dayLabel: `Day ${day}`
        },
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== SEMESTER-BASED TRACK CONTENT UPLOAD ==========
/**
 * UPDATED: Upload content to a specific semester in a semester track
 * @route   POST /api/content/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Upload content for a specific semester (preserves original semesterNumber format)
 * @access  Private
 */
router.post('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { content } = req.body;
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: 'Content array is required' });
    }

    // UPDATED: Preserve original semesterNumber format (001, 1, "2nd", etc.)
    const originalSemesterNumber = semesterNumber; // Keep as string to preserve format
    const numericSemester = parseInt(semesterNumber) || 1; // For validation and ordering

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    // Check if semester number is within track duration (using numeric value)
    if (track.duration && numericSemester > track.duration) {
      return res.status(400).json({ 
        message: `Semester ${originalSemesterNumber} exceeds track duration of ${track.duration} semesters` 
      });
    }

    // NEW: Check for existing content in this semester to prevent duplicates
    const existingSemesterContent = await Content.findOne({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.semesterName': originalSemesterNumber
    });

    if (existingSemesterContent) {
      return res.status(409).json({ 
        message: `Content for Semester "${originalSemesterNumber}" already exists. Cannot upload duplicate semester content.`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        },
        existingContent: {
          name: existingSemesterContent.name,
          displayName: existingSemesterContent.displayName,
          createdAt: existingSemesterContent.createdAt
        }
      });
    }

    // UPDATED: Use original semester format instead of hardcoded names
    const semesterDisplayName = originalSemesterNumber; // Use exactly what was passed in URL

    const enrichedContent = content.map((item, index) => ({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      name: `semester${numericSemester}_${item.name}`,
      displayName: `${semesterDisplayName} - ${item.displayName || item.name}`,
      description: item.description ? `${semesterDisplayName}: ${item.description}` : `${semesterDisplayName} content`,
      orderIndex: numericSemester * 100000 + (item.orderIndex || index), // Semester-based ordering
      metadata: {
        ...item.metadata,
        semester: numericSemester, // Numeric for backend grouping logic
        semesterName: semesterDisplayName, // Original format for display
        originalSemesterNumber: originalSemesterNumber, // Preserve exact input
        timeBasedContent: true
      },
      ...item
    }));

    // Upload using enhanced validation
    const results = await examModel.createBulkContentWithValidation(enrichedContent);
    
    if (results.success) {
      res.status(201).json({
        message: `Successfully uploaded ${results.results.created.length} content items to ${semesterDisplayName}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: semesterDisplayName,
          originalSemesterNumber: originalSemesterNumber
        },
        validation: results.validation,
        results: results.results
      });
    } else {
      res.status(400).json({
        message: results.message,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: semesterDisplayName,
          originalSemesterNumber: originalSemesterNumber
        },
        validation: results.validation,
        results: results.results || { created: [], errors: results.errors || [], duplicates: [] }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== TIME-BASED CONTENT UPDATE ROUTES ==========

/**
 * UPDATE: Update entire week content
 * @route   PUT /api/content/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber
 * @desc    Update all content items in a specific week
 * @access  Private
 */
router.put('/weeks/:examName/:subjectName/:trackName/:subCategoryName/:weekNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, weekNumber } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Validate week number
    const week = parseInt(weekNumber);
    if (isNaN(week) || week < 1) {
      return res.status(400).json({ message: 'Valid week number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'weeks') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a weekly track (type: ${track.trackType})` 
      });
    }

    // Get existing content for this week
    const existingContent = await Content.find({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.week': week
    });

    if (existingContent.length === 0) {
      return res.status(404).json({
        message: `No content found for Week ${week}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          week: week
        }
      });
    }

    const results = { updated: [], errors: [] };

    // Update each item
    for (const [index, item] of items.entries()) {
      try {
        // Find the content item by name or index
        let contentToUpdate;
        
        if (item.name) {
          // Find by name (with week prefix)
          const fullName = item.name.startsWith(`week${week}_`) ? item.name : `week${week}_${item.name}`;
          contentToUpdate = existingContent.find(content => content.name === fullName);
        } else if (item.index !== undefined) {
          // Find by index position
          contentToUpdate = existingContent[item.index];
        } else if (item.id) {
          // Find by ID
          contentToUpdate = existingContent.find(content => content._id.toString() === item.id);
        }

        if (!contentToUpdate) {
          results.errors.push({
            index,
            item: item.name || item.index || item.id,
            error: 'Content item not found in this week'
          });
          continue;
        }

        // Update the content
        const updatedContent = await examModel.updateContent(contentToUpdate._id, {
          displayName: item.displayName || contentToUpdate.displayName,
          description: item.description || contentToUpdate.description,
          orderIndex: item.orderIndex !== undefined ? ((week * 1000) + item.orderIndex) : contentToUpdate.orderIndex,
          isActive: item.isActive !== undefined ? item.isActive : contentToUpdate.isActive,
          filePath: item.filePath || contentToUpdate.filePath,
          fileType: item.fileType || contentToUpdate.fileType,
          fileSize: item.fileSize || contentToUpdate.fileSize
        });

        if (updatedContent) {
          results.updated.push({
            id: updatedContent._id,
            name: updatedContent.name,
            displayName: updatedContent.displayName,
            orderIndex: updatedContent.orderIndex
          });
        }
      } catch (error) {
        results.errors.push({
          index,
          item: item.name || item.index || item.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Updated ${results.updated.length} items in Week ${week}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        week: week,
        weekLabel: `Week ${week}`
      },
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * UPDATE: Update entire day content
 * @route   PUT /api/content/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber
 * @desc    Update all content items in a specific day
 * @access  Private
 */
router.put('/days/:examName/:subjectName/:trackName/:subCategoryName/:dayNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, dayNumber } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Validate day number
    const day = parseInt(dayNumber);
    if (isNaN(day) || day < 1) {
      return res.status(400).json({ message: 'Valid day number (1 or greater) is required' });
    }

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'days') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a daily track (type: ${track.trackType})` 
      });
    }

    // Get existing content for this day
    const existingContent = await Content.find({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.day': day
    });

    if (existingContent.length === 0) {
      return res.status(404).json({
        message: `No content found for Day ${day}`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          day: day
        }
      });
    }

    const results = { updated: [], errors: [] };

    // Update each item
    for (const [index, item] of items.entries()) {
      try {
        let contentToUpdate;
        
        if (item.name) {
          const fullName = item.name.startsWith(`day${day}_`) ? item.name : `day${day}_${item.name}`;
          contentToUpdate = existingContent.find(content => content.name === fullName);
        } else if (item.index !== undefined) {
          contentToUpdate = existingContent[item.index];
        } else if (item.id) {
          contentToUpdate = existingContent.find(content => content._id.toString() === item.id);
        }

        if (!contentToUpdate) {
          results.errors.push({
            index,
            item: item.name || item.index || item.id,
            error: 'Content item not found in this day'
          });
          continue;
        }

        const updatedContent = await examModel.updateContent(contentToUpdate._id, {
          displayName: item.displayName || contentToUpdate.displayName,
          description: item.description || contentToUpdate.description,
          orderIndex: item.orderIndex !== undefined ? ((day * 100) + item.orderIndex) : contentToUpdate.orderIndex,
          isActive: item.isActive !== undefined ? item.isActive : contentToUpdate.isActive,
          filePath: item.filePath || contentToUpdate.filePath,
          fileType: item.fileType || contentToUpdate.fileType,
          fileSize: item.fileSize || contentToUpdate.fileSize
        });

        if (updatedContent) {
          results.updated.push({
            id: updatedContent._id,
            name: updatedContent.name,
            displayName: updatedContent.displayName,
            orderIndex: updatedContent.orderIndex
          });
        }
      } catch (error) {
        results.errors.push({
          index,
          item: item.name || item.index || item.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Updated ${results.updated.length} items in Day ${day}`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        day: day,
        dayLabel: `Day ${day}`
      },
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * UPDATE: Update entire semester content
 * @route   PUT /api/content/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber
 * @desc    Update all content items in a specific semester
 * @access  Private
 */
router.put('/semesters/:examName/:subjectName/:trackName/:subCategoryName/:semesterNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, semesterNumber } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const originalSemesterNumber = semesterNumber;
    const numericSemester = parseInt(semesterNumber) || 1;

    // Resolve context
    const { Exam, Subject, Track, SubCategory, Content } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found - check exam, subject, track, or subcategory names' });
    }

    // Validate track type
    if (track.trackType !== 'semester') {
      return res.status(400).json({ 
        message: `Track "${trackName}" is not a semester track (type: ${track.trackType})` 
      });
    }

    // Get existing content for this semester
    const existingContent = await Content.find({
      examName: exam.name,
      subjectName: subject.name,
      trackName: track.name,
      subCategoryName: subCategory.name,
      'metadata.semesterName': originalSemesterNumber
    });

    if (existingContent.length === 0) {
      return res.status(404).json({
        message: `No content found for Semester "${originalSemesterNumber}"`,
        context: {
          exam: exam.displayName,
          subject: subject.displayName,
          track: track.displayName,
          subCategory: subCategory.displayName,
          semester: numericSemester,
          semesterName: originalSemesterNumber
        }
      });
    }

    const results = { updated: [], errors: [] };

    // Update each item
    for (const [index, item] of items.entries()) {
      try {
        let contentToUpdate;
        
        if (item.name) {
          const fullName = item.name.startsWith(`semester${numericSemester}_`) ? item.name : `semester${numericSemester}_${item.name}`;
          contentToUpdate = existingContent.find(content => content.name === fullName);
        } else if (item.index !== undefined) {
          contentToUpdate = existingContent[item.index];
        } else if (item.id) {
          contentToUpdate = existingContent.find(content => content._id.toString() === item.id);
        }

        if (!contentToUpdate) {
          results.errors.push({
            index,
            item: item.name || item.index || item.id,
            error: 'Content item not found in this semester'
          });
          continue;
        }

        const updatedContent = await examModel.updateContent(contentToUpdate._id, {
          displayName: item.displayName || contentToUpdate.displayName,
          description: item.description || contentToUpdate.description,
          orderIndex: item.orderIndex !== undefined ? ((numericSemester * 100000) + item.orderIndex) : contentToUpdate.orderIndex,
          isActive: item.isActive !== undefined ? item.isActive : contentToUpdate.isActive,
          filePath: item.filePath || contentToUpdate.filePath,
          fileType: item.fileType || contentToUpdate.fileType,
          fileSize: item.fileSize || contentToUpdate.fileSize
        });

        if (updatedContent) {
          results.updated.push({
            id: updatedContent._id,
            name: updatedContent.name,
            displayName: updatedContent.displayName,
            orderIndex: updatedContent.orderIndex
          });
        }
      } catch (error) {
        results.errors.push({
          index,
          item: item.name || item.index || item.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Updated ${results.updated.length} items in Semester "${originalSemesterNumber}"`,
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName,
        semester: numericSemester,
        semesterName: originalSemesterNumber
      },
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== UTILITY ENDPOINTS ==========

/**
 * NEW: Get track time periods structure
 * @route   GET /api/content/:examName/:subjectName/:trackName/:subCategoryName/periods
 * @desc    Get available time periods for a track (weeks, days, months, etc.)
 * @access  Public
 */
router.get('/:examName/:subjectName/:trackName/:subCategoryName/periods', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName } = req.params;
    
    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    const periods = [];
    const trackType = track.trackType;
    const duration = track.duration || 0;

    if (trackType === 'weeks') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Week ${i}`,
          type: 'week',
          uploadEndpoint: `/api/content/weeks/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'days') {
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: `Day ${i}`,
          type: 'day',
          uploadEndpoint: `/api/content/days/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'months') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: monthNames[i - 1] || `Month ${i}`,
          type: 'month',
          uploadEndpoint: `/api/content/months/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'semester') {
      const semesterNames = ['First Semester', 'Second Semester', 'Third Semester', 'Fourth Semester'];
      for (let i = 1; i <= duration; i++) {
        periods.push({
          number: i,
          name: semesterNames[i - 1] || `Semester ${i}`,
          type: 'semester',
          uploadEndpoint: `/api/content/semesters/${examName}/${subjectName}/${trackName}/${subCategoryName}/${i}`
        });
      }
    } else if (trackType === 'years') {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < duration; i++) {
        const year = currentYear + i;
        periods.push({
          number: year,
          name: year.toString(),
          type: 'year',
          uploadEndpoint: `/api/content/years/${examName}/${subjectName}/${trackName}/${subCategoryName}/${year}`
        });
      }
    }

    res.json({
      track: {
        name: track.displayName,
        type: trackType,
        duration: duration
      },
      totalPeriods: periods.length,
      periods,
      batchUploadEndpoint: `/api/content/${trackType}/${examName}/${subjectName}/${trackName}/${subCategoryName}/batch`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * NEW: Get content for a specific time period
 * @route   GET /api/content/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber
 * @desc    Get content for a specific week/day/month/semester/year
 * @access  Public
 */
router.get('/:examName/:subjectName/:trackName/:subCategoryName/:trackType/:periodNumber', async (req, res) => {
  try {
    const { examName, subjectName, trackName, subCategoryName, trackType, periodNumber } = req.params;
    
    // Resolve context
    const { Exam, Subject, Track, SubCategory } = require('../models/exam');
    
    const exam = await Exam.findOne({ name: examName.toUpperCase(), isActive: true });
    const subject = await Subject.findOne({ examId: exam?._id, name: subjectName, isActive: true });
    const subCategory = await SubCategory.findOne({ examId: exam?._id, name: subCategoryName.toLowerCase(), isActive: true });
    const track = await Track.findOne({ examId: exam?._id, subCategoryId: subCategory?._id, name: trackName, isActive: true });

    if (!exam || !subject || !subCategory || !track) {
      return res.status(404).json({ message: 'Context not found' });
    }

    // Validate track type
    const validTypes = ['weeks', 'days', 'months', 'semester', 'years'];
    const trackTypeMap = { weeks: 'week', days: 'day', months: 'month', semester: 'semester', years: 'year' };
    
    if (!validTypes.includes(trackType)) {
      return res.status(400).json({ message: 'Invalid track type. Use: weeks, days, months, semester, or years' });
    }

    if (track.trackType !== trackType) {
      return res.status(400).json({ 
        message: `Track type mismatch. Track is "${track.trackType}", requested "${trackType}"` 
      });
    }

    const period = parseInt(periodNumber);
    if (isNaN(period) || period < 1) {
      return res.status(400).json({ message: 'Valid period number required' });
    }

    // Get content for this specific time period
    const content = await examModel.getContentByFilters({
      examId: exam._id,
      subjectId: subject._id,
      trackId: track._id,
      subCategoryId: subCategory._id
    });

    // Filter content for this specific period
    const periodContent = content.filter(item => {
      const periodKey = trackTypeMap[trackType];
      if (trackType === 'semester') {
        // For semester, check both numeric semester and semesterName
        return item.metadata && (item.metadata[periodKey] === period || item.metadata.semesterName === periodNumber);
      }
      return item.metadata && item.metadata[periodKey] === period;
    });

    res.json({
      context: {
        exam: exam.displayName,
        subject: subject.displayName,
        track: track.displayName,
        subCategory: subCategory.displayName
      },
      period: {
        number: period,
        type: trackTypeMap[trackType],
        name: `${trackTypeMap[trackType].charAt(0).toUpperCase() + trackTypeMap[trackType].slice(1)} ${period}`
      },
      totalContent: periodContent.length,
      content: periodContent
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;