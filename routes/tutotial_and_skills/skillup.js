const router = require('express').Router();
const SkillUpBatch = require('../../models/tutorial_and_skills/skillup');

// Create a new skill up
router.post('/create', async (req, res) => {
    try {
        // Check if a skill up with the same category, year, and subject already exists
        const existingClass = await SkillUpBatch.findOne({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject
        });

        if (existingClass) {
            return res.status(409).json({
                message: 'Skill up already exists with this category, year, and subject'
            });
        }

        // Validate that batch array exists and each batch has topics
        if (!req.body.batch || !Array.isArray(req.body.batch) || req.body.batch.length === 0) {
            return res.status(400).json({
                message: 'Batch array is required and must contain at least one batch'
            });
        }

        // Validate that each batch has a valid topics array
        for (let i = 0; i < req.body.batch.length; i++) {
            const batch = req.body.batch[i];
            if (!batch.topics || !Array.isArray(batch.topics) || batch.topics.length === 0) {
                return res.status(400).json({
                    message: `Batch ${batch.batchNumber || i+1} must have a topics array with at least one topic`
                });
            }
        }

        const skillUp = new SkillUpBatch({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject,
            subjectDescription: req.body.subjectDescription,
            batch: req.body.batch || []
        });

        const newSkillUp = await skillUp.save();
        res.status(200).json(newSkillUp);
    } catch (error) {
        res.status(403).json({
            message: 'Skill up not created',
            error: error.message
        });
    }
});

// Get skill up by category, year and subject
router.get('/:category/:year/:subject', async (req, res) => {
    try {
        const skillUp = await SkillUpBatch.findOne({
            category: req.params.category,
            year: req.params.year,
            subject: req.params.subject
        });

        if (!skillUp) {
            return res.status(404).json({
                message: 'Skill up not found for this category, year and subject'
            });
        }

        res.status(200).json(skillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching skill up',
            error: error.message
        });
    }
});

// Get all subjects for a specific category and year
router.get('/:category/:year', async (req, res) => {
    try {
        const skillUps = await SkillUp.find({
            category: req.params.category,
            year: req.params.year
        }).select('subject subjectDescription topics');

        if (skillUps.length === 0) {
            return res.status(404).json({
                message: 'No subjects found for this category and year'
            });
        }

        res.status(200).json(skillUps);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching subjects',
            error: error.message
        });
    }
});

// Update a skill up
router.put('/:id', async (req, res) => {
    try {
        // If trying to update category, year, or subject, check for duplicates
        if (req.body.category || req.body.year || req.body.subject) {
            // First fetch the current class to get the current values
            const currentClass = await SkillUp.findById(req.params.id);
            
            if (!currentClass) {
                return res.status(404).json({
                    message: 'Skill up not found'
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
            const duplicateClass = await SkillUp.findOne(searchCriteria);
            
            if (duplicateClass) {
                return res.status(409).json({
                    message: 'Another skill up already exists with these details'
                });
            }
        }

        // If updating batch, validate each batch has topics
        if (req.body.batch) {
            if (!Array.isArray(req.body.batch) || req.body.batch.length === 0) {
                return res.status(400).json({
                    message: 'Batch array must contain at least one batch'
                });
            }

            // Check each batch for valid topics
            for (let i = 0; i < req.body.batch.length; i++) {
                const batch = req.body.batch[i];
                if (!batch.topics || !Array.isArray(batch.topics) || batch.topics.length === 0) {
                    return res.status(400).json({
                        message: `Batch ${batch.batchNumber || i+1} must have a topics array with at least one topic`
                    });
                }
            }
        }

        // Set the updated date
        req.body.updatedAt = Date.now();
        
        const updatedSkillUp = await SkillUp.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true } // Return the updated document
        );

        if (!updatedSkillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }

        res.status(200).json(updatedSkillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Skill up not updated',
            error: error.message
        });
    }
});

// Add a new batch to a skill up
router.post('/:id/batch', async (req, res) => {
    try {
        const skillUp = await SkillUp.findById(req.params.id);
        
        if (!skillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }

        // Validate that the batch has topics
        if (!req.body.topics || !Array.isArray(req.body.topics) || req.body.topics.length === 0) {
            return res.status(400).json({
                message: 'Batch must have a topics array with at least one topic'
            });
        }

        skillUp.batch.push(req.body);
        skillUp.updatedAt = Date.now();
        
        const updatedSkillUp = await skillUp.save();
        res.status(200).json(updatedSkillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Batch not added',
            error: error.message
        });
    }
});

// Update a specific batch
router.put('/:id/batch/:batchId', async (req, res) => {
    try {
        const skillUp = await SkillUp.findById(req.params.id);
        
        if (!skillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }

        const batchIndex = skillUp.batch.findIndex(batch => batch._id.toString() === req.params.batchId); 
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
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

        skillUp.batch[batchIndex] = {
            ...skillUp.batch[batchIndex].toObject(),
            ...req.body
        };
        
        skillUp.updatedAt = Date.now();
        const updatedSkillUp = await skillUp.save();
        
        res.status(200).json(updatedSkillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Batch not updated',
            error: error.message
        });
    }
});

// Add content to a specific batch
router.post('/:id/batch/:batchId/content', async (req, res) => {
    try {
        const skillUp = await SkillUp.findById(req.params.id);
        
        if (!skillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }

        const batchIndex = skillUp.batch.findIndex(batch => batch._id.toString() === req.params.batchId);
        
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
            });
        }

        skillUp.batch[batchIndex].contents.push(req.body);
        skillUp.updatedAt = Date.now();
        
        const updatedSkillUp = await skillUp.save();
        res.status(200).json(updatedSkillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Content not added',
            error: error.message
        });
    }
});

// Update read status for a specific content
router.put('/:id/batch/:batchId/content/:contentId/readStatus', async (req, res) => {
    try {
        const { isRead } = req.body;
        
        const skillUp = await SkillUp.findById(req.params.id);
        
        if (!skillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }

        const batchIndex = skillUp.batch.findIndex(batch => batch._id.toString() === req.params.batchId);
        
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
            });
        }

        const contentIndex = skillUp.batch[batchIndex].contents.findIndex(
            content => content._id.toString() === req.params.contentId
        );
        
        if (contentIndex === -1) {
            return res.status(404).json({
                message: 'Content not found'
            });
        }

        skillUp.batch[batchIndex].contents[contentIndex].isRead = isRead;
        skillUp.updatedAt = Date.now();
        
        const updatedSkillUp = await skillUp.save();
        res.status(200).json(updatedSkillUp);
    } catch (error) {
        res.status(500).json({
            message: 'Read status not updated',
            error: error.message
        });
    }
});

// Delete a skill up
router.delete('/:id', async (req, res) => {
    try {
        const deletedSkillUp = await SkillUp.findByIdAndDelete(req.params.id);
        
        if (!deletedSkillUp) {
            return res.status(404).json({
                message: 'Skill up not found'
            });
        }
        
        res.status(200).json({
            message: 'Skill up deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Skill up not deleted',
            error: error.message
        });
    }
});

module.exports = router;