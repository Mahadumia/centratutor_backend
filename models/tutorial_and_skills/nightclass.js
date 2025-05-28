const mongoose = require('mongoose');

const nightClassSchema = mongoose.Schema({
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
    weeks: [
        {
            weekNumber: {
                type: Number,  // e.g., 1, 2, 3
                required: true
            },
            weekDescription: {
                type: String
            },
            topics: {
                type: [String],  // e.g., ["Calculus", "Algebra"] for Mathematics week
                required: true,
                validate: [arrayMinLength, 'At least one topic is required for each week']
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
nightClassSchema.index({ category: 1, year: 1, subject: 1 });

module.exports = mongoose.model('NightClass', nightClassSchema);
