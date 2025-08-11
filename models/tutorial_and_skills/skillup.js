const mongoose = require('mongoose');

const skillUpBatchSchema = mongoose.Schema({
    category: {
        type: String,    // e.g., "AI", "Data Science", "Web Development"
        required: true
    },
    year: {
        type: String,    // e.g., "2025", "2024", "2023"
        required: true
    },
    subject: {
        type: String,    // e.g., "AI Spark Cohort 1", "Python Bootcamp"
        required: true
    },
    subjectDescription: {
        type: String
    },
    // NEW FIELDS ADDED
    thumbnail: {
        type: String    // URL to the thumbnail image
    },
    author: {
        type: String    // Author name
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
            topics: {
                type: [String],  // e.g., ["Prompt Engineering", "AI Applications"]
                required: true,
                validate: [arrayMinLength, 'At least one topic is required for each batch']
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
                        enum: ['video', 'pdf', 'question'],
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

// Validator function to ensure topics array has at least one element
function arrayMinLength(val) {
    return val.length > 0;
}

// Create compound index for faster querying by category, year, and subject
skillUpBatchSchema.index({ category: 1, year: 1, subject: 1 });

module.exports = mongoose.model('SkillUpBatch', skillUpBatchSchema);