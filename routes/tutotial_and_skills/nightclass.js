const router = require('express').Router();
const NightClass = require('../../models/tutorial_and_skills/nightclass');

// Create a new night class
router.post('/create', async (req, res) => {
    try {
        // Check if a night class with the same category, year, and subject already exists
        const existingClass = await NightClass.findOne({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject
        });

        if (existingClass) {
            return res.status(409).json({
                message: 'Night class already exists with this category, year, and subject'
            });
        }

        // Validate that weeks array exists and each week has topics
        if (!req.body.weeks || !Array.isArray(req.body.weeks) || req.body.weeks.length === 0) {
            return res.status(400).json({
                message: 'Weeks array is required and must contain at least one week'
            });
        }

        // Validate that each week has a valid topics array
        for (let i = 0; i < req.body.weeks.length; i++) {
            const week = req.body.weeks[i];
            if (!week.topics || !Array.isArray(week.topics) || week.topics.length === 0) {
                return res.status(400).json({
                    message: `Week ${week.weekNumber || i+1} must have a topics array with at least one topic`
                });
            }
        }

        const nightClass = new NightClass({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject,
            subjectDescription: req.body.subjectDescription,
            weeks: req.body.weeks || []
        });

        const newNightClass = await nightClass.save();
        res.status(200).json(newNightClass);
    } catch (error) {
        res.status(403).json({
            message: 'Night class not created',
            error: error.message
        });
    }
});

// Get night class by category, year and subject
router.get('/:category/:year/:subject', async (req, res) => {
    try {
        const nightClass = await NightClass.findOne({
            category: req.params.category,
            year: req.params.year,
            subject: req.params.subject
        });

        if (!nightClass) {
            return res.status(404).json({
                message: 'Night class not found for this category, year and subject'
            });
        }

        res.status(200).json(nightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching night class',
            error: error.message
        });
    }
});

// Get all subjects for a specific category and year
router.get('/:category/:year', async (req, res) => {
    try {
        const nightClasses = await NightClass.find({
            category: req.params.category,
            year: req.params.year
        }).select('subject subjectDescription topics');

        if (nightClasses.length === 0) {
            return res.status(404).json({
                message: 'No subjects found for this category and year'
            });
        }

        res.status(200).json(nightClasses);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching subjects',
            error: error.message
        });
    }
});

// Update a night class
router.put('/:id', async (req, res) => {
    try {
        // If trying to update category, year, or subject, check for duplicates
        if (req.body.category || req.body.year || req.body.subject) {
            // First fetch the current class to get the current values
            const currentClass = await NightClass.findById(req.params.id);
            
            if (!currentClass) {
                return res.status(404).json({
                    message: 'Night class not found'
                });
            }
            
            // Prepare the search criteria with new or existing values
            const searchCriteria = {
                category: req.body.category || currentClass.category,
                year: req.body.year || currentClass.year,
                subject: req.body.subject || currentClass.subject,
                _id: { $ne: req.params.id } // Exclude the current document
            };
            
            // Check if another class with the same criteria exists
            const duplicateClass = await NightClass.findOne(searchCriteria);
            
            if (duplicateClass) {
                return res.status(409).json({
                    message: 'Another night class already exists with these details'
                });
            }
        }

        // If updating weeks, validate each week has topics
        if (req.body.weeks) {
            if (!Array.isArray(req.body.weeks) || req.body.weeks.length === 0) {
                return res.status(400).json({
                    message: 'Weeks array must contain at least one week'
                });
            }

            // Check each week for valid topics
            for (let i = 0; i < req.body.weeks.length; i++) {
                const week = req.body.weeks[i];
                if (!week.topics || !Array.isArray(week.topics) || week.topics.length === 0) {
                    return res.status(400).json({
                        message: `Week ${week.weekNumber || i+1} must have a topics array with at least one topic`
                    });
                }
            }
        }

        // Set the updated date
        req.body.updatedAt = Date.now();
        
        const updatedNightClass = await NightClass.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true } // Return the updated document
        );

        if (!updatedNightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }

        res.status(200).json(updatedNightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Night class not updated',
            error: error.message
        });
    }
});

// Add a new week to a night class
router.post('/:id/week', async (req, res) => {
    try {
        const nightClass = await NightClass.findById(req.params.id);
        
        if (!nightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }

        // Validate that the week has topics
        if (!req.body.topics || !Array.isArray(req.body.topics) || req.body.topics.length === 0) {
            return res.status(400).json({
                message: 'Week must have a topics array with at least one topic'
            });
        }

        nightClass.weeks.push(req.body);
        nightClass.updatedAt = Date.now();
        
        const updatedNightClass = await nightClass.save();
        res.status(200).json(updatedNightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Week not added',
            error: error.message
        });
    }
});

// Update a specific week
router.put('/:id/week/:weekId', async (req, res) => {
    try {
        const nightClass = await NightClass.findById(req.params.id);
        
        if (!nightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }

        const weekIndex = nightClass.weeks.findIndex(week => week._id.toString() === req.params.weekId); 
        if (weekIndex === -1) {
            return res.status(404).json({
                message: 'Week not found'
            });
        }

        // If topics are being updated, validate them
        if (req.body.topics !== undefined) {
            if (!Array.isArray(req.body.topics) || req.body.topics.length === 0) {
                return res.status(400).json({
                    message: 'Topics array must contain at least one topic'
                });
            }
        }

    
        nightClass.weeks[weekIndex] = {
            ...nightClass.weeks[weekIndex].toObject(),
            ...req.body
        };
        
        nightClass.updatedAt = Date.now();
        const updatedNightClass = await nightClass.save();
        
        res.status(200).json(updatedNightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Week not updated',
            error: error.message
        });
    }
});

// Add content to a specific week
router.post('/:id/week/:weekId/content', async (req, res) => {
    try {
        const nightClass = await NightClass.findById(req.params.id);
        
        if (!nightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }

        const weekIndex = nightClass.weeks.findIndex(week => week._id.toString() === req.params.weekId);
        
        if (weekIndex === -1) {
            return res.status(404).json({
                message: 'Week not found'
            });
        }

        nightClass.weeks[weekIndex].contents.push(req.body);
        nightClass.updatedAt = Date.now();
        
        const updatedNightClass = await nightClass.save();
        res.status(200).json(updatedNightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Content not added',
            error: error.message
        });
    }
});

// Update read status for a specific content
router.put('/:id/week/:weekId/content/:contentId/readStatus', async (req, res) => {
    try {
        const { isRead } = req.body;
        
        const nightClass = await NightClass.findById(req.params.id);
        
        if (!nightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }

        const weekIndex = nightClass.weeks.findIndex(week => week._id.toString() === req.params.weekId);
        
        if (weekIndex === -1) {
            return res.status(404).json({
                message: 'Week not found'
            });
        }

        const contentIndex = nightClass.weeks[weekIndex].contents.findIndex(
            content => content._id.toString() === req.params.contentId
        );
        
        if (contentIndex === -1) {
            return res.status(404).json({
                message: 'Content not found'
            });
        }

        nightClass.weeks[weekIndex].contents[contentIndex].isRead = isRead;
        nightClass.updatedAt = Date.now();
        
        const updatedNightClass = await nightClass.save();
        res.status(200).json(updatedNightClass);
    } catch (error) {
        res.status(500).json({
            message: 'Read status not updated',
            error: error.message
        });
    }
});

// Delete a night class
router.delete('/:id', async (req, res) => {
    try {
        const deletedNightClass = await NightClass.findByIdAndDelete(req.params.id);
        
        if (!deletedNightClass) {
            return res.status(404).json({
                message: 'Night class not found'
            });
        }
        
        res.status(200).json({
            message: 'Night class deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Night class not deleted',
            error: error.message
        });
    }
});

module.exports = router;