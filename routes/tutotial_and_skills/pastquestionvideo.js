const router = require('express').Router();
const PastQuestionVideo = require('../../models/tutorial_and_skills/pastquestionvideo');

// Create a new past question video class
router.post('/create', async (req, res) => {
    try {
        // Check if a past question video class with the same category, year, and subject already exists
        const existingClass = await PastQuestionVideo.findOne({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject
        });

        if (existingClass) {
            return res.status(409).json({
                message: 'Past question video class already exists with this category, year, and subject'
            });
        }

        const pqVideoClass = new PastQuestionVideo({
            category: req.body.category,
            year: req.body.year,
            subject: req.body.subject,
            subjectDescription: req.body.subjectDescription,
            batch: req.body.batch || []
        });

        const newPQVideoClass = await pqVideoClass.save();
        res.status(200).json(newPQVideoClass);
    } catch (error) {
        res.status(403).json({
            message: 'Past question video class not created',
            error: error.message
        });
    }
});

// Get past question video class by category, year and subject
router.get('/:category/:year/:subject', async (req, res) => {
    try {
        const pqVideoClass = await PastQuestionVideo.findOne({
            category: req.params.category,
            year: req.params.year,
            subject: req.params.subject
        });

        if (!pqVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found for this category, year and subject'
            });
        }

        res.status(200).json(pqVideoClass);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching past question video class',
            error: error.message
        });
    }
});

// Get all subjects for a specific category and year
router.get('/:category/:year', async (req, res) => {
    try {
        const pqVideoClasses = await PastQuestionVideo.find({
            category: req.params.category,
            year: req.params.year
        }).select('subject subjectDescription');

        if (pqVideoClasses.length === 0) {
            return res.status(404).json({
                message: 'No subjects found for this category and year'
            });
        }

        res.status(200).json(pqVideoClasses);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching subjects',
            error: error.message
        });
    }
});

// Update a past question video class
router.put('/:id', async (req, res) => {
    try {
        // If trying to update category, year, or subject, check for duplicates
        if (req.body.category || req.body.year || req.body.subject) {
            // First fetch the current class to get the current values
            const currentClass = await PastQuestionVideo.findById(req.params.id);
            
            if (!currentClass) {
                return res.status(404).json({
                    message: 'Past question video class not found'
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
            const duplicateClass = await PastQuestionVideo.findOne(searchCriteria);
            
            if (duplicateClass) {
                return res.status(409).json({
                    message: 'Another past question video class already exists with these details'
                });
            }
        }

        // Set the updated date
        req.body.updatedAt = Date.now();
        
        const updatedPQVideoClass = await PastQuestionVideo.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true } // Return the updated document
        );

        if (!updatedPQVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }

        res.status(200).json(updatedPQVideoClass);
    } catch (error) {
        res.status(500).json({
            message: 'Past question video class not updated',
            error: error.message
        });
    }
});

// Add a new batch to a past question video class
router.post('/:id/batch', async (req, res) => {
    try {
        const pqVideoClass = await PastQuestionVideo.findById(req.params.id);
        
        if (!pqVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }

        pqVideoClass.batch.push(req.body);
        pqVideoClass.updatedAt = Date.now();
        
        const updatedPQVideoClass = await pqVideoClass.save();
        res.status(200).json(updatedPQVideoClass);
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
        const pqVideoClass = await PastQuestionVideo.findById(req.params.id);
        
        if (!pqVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }

        const batchIndex = pqVideoClass.batch.findIndex(batch => batch._id.toString() === req.params.batchId);
        
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
            });
        }

        pqVideoClass.batch[batchIndex] = {
            ...pqVideoClass.batch[batchIndex].toObject(),
            ...req.body
        };
        
        pqVideoClass.updatedAt = Date.now();
        const updatedPQVideoClass = await pqVideoClass.save();
        
        res.status(200).json(updatedPQVideoClass);
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
        const pqVideoClass = await PastQuestionVideo.findById(req.params.id);
        
        if (!pqVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }

        const batchIndex = pqVideoClass.batch.findIndex(batch => batch._id.toString() === req.params.batchId);
        
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
            });
        }

        pqVideoClass.batch[batchIndex].contents.push(req.body);
        pqVideoClass.updatedAt = Date.now();
        
        const updatedPQVideoClass = await pqVideoClass.save();
        res.status(200).json(updatedPQVideoClass);
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
        
        const pqVideoClass = await PastQuestionVideo.findById(req.params.id);
        
        if (!pqVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }

        const batchIndex = pqVideoClass.batch.findIndex(batch => batch._id.toString() === req.params.batchId);
        
        if (batchIndex === -1) {
            return res.status(404).json({
                message: 'Batch not found'
            });
        }

        const contentIndex = pqVideoClass.batch[batchIndex].contents.findIndex(
            content => content._id.toString() === req.params.contentId
        );
        
        if (contentIndex === -1) {
            return res.status(404).json({
                message: 'Content not found'
            });
        }

        pqVideoClass.batch[batchIndex].contents[contentIndex].isRead = isRead;
        pqVideoClass.updatedAt = Date.now();
        
        const updatedPQVideoClass = await pqVideoClass.save();
        res.status(200).json(updatedPQVideoClass);
    } catch (error) {
        res.status(500).json({
            message: 'Read status not updated',
            error: error.message
        });
    }
});

// Delete a past question video class
router.delete('/:id', async (req, res) => {
    try {
        const deletedPQVideoClass = await PastQuestionVideo.findByIdAndDelete(req.params.id);
        
        if (!deletedPQVideoClass) {
            return res.status(404).json({
                message: 'Past question video class not found'
            });
        }
        
        res.status(200).json({
            message: 'Past question video class deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Past question video class not deleted',
            error: error.message
        });
    }
});

module.exports = router;