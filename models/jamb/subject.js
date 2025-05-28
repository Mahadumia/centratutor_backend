// models/jamb/subject.js
const mongoose = require('mongoose');

// Define Subject Schema
const subjectSchema = new mongoose.Schema({
  name: {
    type: String, 
    required: true,
    unique: true
  },
  icon: {
    type: String,
    default: function() {
      return `assets/images/${this.name.toLowerCase()}.png`;
    }
  },
  program: {
    type: String,
    default: 'JAMB'
  }
}, { timestamps: true });

// Define Topic Schema
const topicSchema = new mongoose.Schema({
  subjectKey: {
    type: String,
    required: true
  },
  topics: [{
    type: String
  }],
  program: {
    type: String,
    default: 'JAMB'
  }
});

// Create models
const JambSubject = mongoose.model('JambSubject', subjectSchema);
const JambTopic = mongoose.model('JambTopic', topicSchema);

class JambSubjectModel {
  constructor() {
    // No initialization needed with MongoDB
  }

  // Helper method to get the correct key for a subject
  _getSubjectKey(subjectName) {
    const name = subjectName.toLowerCase();
    // Add special mappings here
    if (name === 'mathematics') {
      return 'math';
    }
    return name;
  }

  // Get all subjects
  async getAllSubjects() {
    try {
      const subjects = await JambSubject.find().sort({ name: 1 });
      return subjects.map(subject => ({
        id: subject._id.toString(),
        name: subject.name,
        icon: subject.icon
      }));
    } catch (error) {
      console.error('Error getting all subjects:', error);
      throw error;
    }
  }

  // Get subject by ID
  async getSubjectById(id) {
    try {
      const subject = await JambSubject.findById(id);
      if (!subject) return null;
      
      return {
        id: subject._id.toString(),
        name: subject.name,
        icon: subject.icon
      };
    } catch (error) {
      console.error('Error getting subject by ID:', error);
      throw error;
    }
  }

  // Get topics by subject
  async getTopicsBySubject(subjectName) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      const topicDoc = await JambTopic.findOne({ subjectKey });
      
      return topicDoc ? topicDoc.topics : [];
    } catch (error) {
      console.error('Error getting topics by subject:', error);
      throw error;
    }
  }

  // Get topics by subject ID
  async getTopicsBySubjectId(subjectId) {
    try {
      const subject = await this.getSubjectById(subjectId);
      if (!subject) return [];
      
      return this.getTopicsBySubject(subject.name);
    } catch (error) {
      console.error('Error getting topics by subject ID:', error);
      throw error;
    }
  }

  // Add a new subject
  async addSubject(subject) {
    try {
      const newSubject = new JambSubject({
        name: subject.name,
        icon: subject.icon || `assets/images/${subject.name.toLowerCase()}.png`
      });
      
      await newSubject.save();
      
      // Initialize topics collection for this subject
      const subjectKey = this._getSubjectKey(subject.name);
      
      // Create topics document
      await JambTopic.findOneAndUpdate(
        { subjectKey },
        { subjectKey, topics: [] },
        { upsert: true, new: true }
      );
      
      return {
        id: newSubject._id.toString(),
        name: newSubject.name,
        icon: newSubject.icon
      };
    } catch (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
  }

  // Add topics to a subject
  async addTopicsToSubject(subjectName, topics) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      
      // Find existing topic document or create new one
      const topicDoc = await JambTopic.findOneAndUpdate(
        { subjectKey },
        { subjectKey },
        { upsert: true, new: true }
      );
      
      // Add new topics if they don't already exist
      topics.forEach(topic => {
        if (!topicDoc.topics.includes(topic)) {
          topicDoc.topics.push(topic);
        }
      });
      
      await topicDoc.save();
      return topicDoc.topics;
    } catch (error) {
      console.error('Error adding topics to subject:', error);
      throw error;
    }
  }

  // Update subject details
  async updateSubject(id, updates) {
    try {
      const subject = await JambSubject.findById(id);
      if (!subject) return null;
      
      // If name is being changed, update related collections
      if (updates.name && updates.name !== subject.name) {
        const oldKey = this._getSubjectKey(subject.name);
        const newKey = this._getSubjectKey(updates.name);
        
        // Update topics collection
        await JambTopic.updateOne(
          { subjectKey: oldKey },
          { subjectKey: newKey }
        );
      }
      
      // Update the subject
      const updatedSubject = await JambSubject.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );
      
      return {
        id: updatedSubject._id.toString(),
        name: updatedSubject.name,
        icon: updatedSubject.icon
      };
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  }

  // Delete a subject
  async deleteSubject(id) {
    try {
      const subject = await JambSubject.findById(id);
      if (!subject) return false;
      
      const subjectKey = this._getSubjectKey(subject.name);
      
      // Delete the subject
      await JambSubject.findByIdAndDelete(id);
      
      // Clean up related data
      await JambTopic.deleteOne({ subjectKey });
      
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  }

  // Get the full data structure (to match the original JSON format)
  async getFullData() {
    try {
      // Get all subjects
      const subjects = await this.getAllSubjects();
      
      // Get all topics
      const topicDocs = await JambTopic.find();
      const topics = {};
      
      topicDocs.forEach(doc => {
        topics[doc.subjectKey] = doc.topics;
      });
      
      return {
        subjects,
        topics
      };
    } catch (error) {
      console.error('Error getting full data:', error);
      throw error;
    }
  }
}

module.exports = JambSubjectModel;