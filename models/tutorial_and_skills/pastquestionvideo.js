const mongoose = require('mongoose');

const pqVideoClassSchema = mongoose.Schema({
    category: {
        type: String,    // e.g., "jupeb", "jamb", "waec"
        required: true
    },
    year: {
        type: String,    // e.g., "2025", "2024", "2023"
        required: true
    },
    subject: {
        type: String,    // e.g., "mathematics", "literature", "physics"
        required: true
    },
    subjectDescription: {
        type: String
    },
    batch: [
        {
            batchNumber: {
                type: Number,  // e.g., 1, 2, 3
                required: true
            },
            batchDescription: {
                type: String
            },
            contents: [
                {
                    leadingNumber: {
                        type: Number,  // e.g., 1, 2, 3
                        required: true
                    },
                    title: {
                        type: String,
                        required: true
                    },
                    description: {
                        type: String
                    },
                    contentUrl: {
                        type: String,
                        required: true
                    },
                    contentUrlType: {
                        type: String,
                        enum: ['video', 'pdf'],
                        required: true
                    },
                    isRead: {
                        type: Boolean,
                        default: false
                    }
                }
            ]
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create compound index for faster querying by category, year, and subject
pqVideoClassSchema.index({ category: 1, year: 1, subject: 1 });

module.exports = mongoose.model('PastQuestionVideo', pqVideoClassSchema);