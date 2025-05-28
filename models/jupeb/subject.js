// models/jupeb/subject.js
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
    default: 'JUPEB'
  }
}, { timestamps: true });

// Define Year Schema
const yearSchema = new mongoose.Schema({
  subjectKey: {
    type: String,
    required: true
  },
  years: [{
    type: String
  }],
  program: {
    type: String,
    default: 'JUPEB'
  }
});

// Define Topic Schema
const topicSchema = new mongoose.Schema({
  subjectKey: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  topics: [{
    type: String
  }],
  program: {
    type: String,
    default: 'JUPEB'
  }
});

// Create models
const JupebSubject = mongoose.model('JupebSubject', subjectSchema);
const JupebYear = mongoose.model('JupebYear', yearSchema);
const JupebTopic = mongoose.model('JupebTopic', topicSchema);

class JupebSubjectModel {
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
      const subjects = await JupebSubject.find().sort({ name: 1 });
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
      const subject = await JupebSubject.findById(id);
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

  // Get years by subject name
  async getYearsBySubject(subjectName) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      const yearDoc = await JupebYear.findOne({ subjectKey });
      
      return yearDoc ? yearDoc.years : [];
    } catch (error) {
      console.error('Error getting years by subject:', error);
      throw error;
    }
  }

  // Get years by subject ID
  async getYearsBySubjectId(subjectId) {
    try {
      const subject = await this.getSubjectById(subjectId);
      if (!subject) return [];
      
      return this.getYearsBySubject(subject.name);
    } catch (error) {
      console.error('Error getting years by subject ID:', error);
      throw error;
    }
  }

  // Get topics by subject and year
  async getTopicsBySubjectAndYear(subjectName, year) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      const topicDoc = await JupebTopic.findOne({ subjectKey, year });
      
      return topicDoc ? topicDoc.topics : [];
    } catch (error) {
      console.error('Error getting topics by subject and year:', error);
      throw error;
    }
  }

  // Get all topics for a subject across all years
  async getAllTopicsBySubject(subjectName) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      const topicDocs = await JupebTopic.find({ subjectKey });
      
      // Collect unique topics across all years
      const allTopics = new Set();
      
      topicDocs.forEach(doc => {
        doc.topics.forEach(topic => {
          allTopics.add(topic);
        });
      });
      
      return Array.from(allTopics);
    } catch (error) {
      console.error('Error getting all topics by subject:', error);
      throw error;
    }
  }

  // Get all topics by subject ID
  async getAllTopicsBySubjectId(subjectId) {
    try {
      const subject = await this.getSubjectById(subjectId);
      if (!subject) return [];
      
      return this.getAllTopicsBySubject(subject.name);
    } catch (error) {
      console.error('Error getting all topics by subject ID:', error);
      throw error;
    }
  }

  // Add a new subject
  async addSubject(subject) {
    try {
      const newSubject = new JupebSubject({
        name: subject.name,
        icon: subject.icon || `assets/images/${subject.name.toLowerCase()}.png`
      });
      
      await newSubject.save();
      
      // Initialize years and topics collections for this subject
      const subjectKey = this._getSubjectKey(subject.name);
      
      // Create years document
      await JupebYear.findOneAndUpdate(
        { subjectKey },
        { subjectKey, years: [] },
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

  // Add years to a subject
  async addYearsToSubject(subjectName, years) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      
      // Find existing years document or create new one
      const yearDoc = await JupebYear.findOneAndUpdate(
        { subjectKey },
        { subjectKey },
        { upsert: true, new: true }
      );
      
      // Add new years if they don't already exist
      years.forEach(year => {
        if (!yearDoc.years.includes(year)) {
          yearDoc.years.push(year);
        }
      });
      
      await yearDoc.save();
      return yearDoc.years;
    } catch (error) {
      console.error('Error adding years to subject:', error);
      throw error;
    }
  }

  // Add topics to a subject year
  async addTopicsToSubjectYear(subjectName, year, topics) {
    try {
      const subjectKey = this._getSubjectKey(subjectName);
      
      // Find existing topic document or create new one
      const topicDoc = await JupebTopic.findOneAndUpdate(
        { subjectKey, year },
        { subjectKey, year },
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
      console.error('Error adding topics to subject year:', error);
      throw error;
    }
  }

  // Update subject details
  async updateSubject(id, updates) {
    try {
      const subject = await JupebSubject.findById(id);
      if (!subject) return null;
      
      // If name is being changed, update related collections
      if (updates.name && updates.name !== subject.name) {
        const oldKey = this._getSubjectKey(subject.name);
        const newKey = this._getSubjectKey(updates.name);
        
        // Update years collection
        await JupebYear.updateOne(
          { subjectKey: oldKey },
          { subjectKey: newKey }
        );
        
        // Update topics collection
        await JupebTopic.updateMany(
          { subjectKey: oldKey },
          { subjectKey: newKey }
        );
      }
      
      // Update the subject
      const updatedSubject = await JupebSubject.findByIdAndUpdate(
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
      const subject = await JupebSubject.findById(id);
      if (!subject) return false;
      
      const subjectKey = this._getSubjectKey(subject.name);
      
      // Delete the subject
      await JupebSubject.findByIdAndDelete(id);
      
      // Clean up related data
      await JupebYear.deleteOne({ subjectKey });
      await JupebTopic.deleteMany({ subjectKey });
      
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
      
      // Get all years
      const yearDocs = await JupebYear.find();
      const years = {};
      yearDocs.forEach(doc => {
        years[doc.subjectKey] = doc.years;
      });
      
      // Get all topics
      const topicDocs = await JupebTopic.find();
      const topics = {};
      
      topicDocs.forEach(doc => {
        if (!topics[doc.subjectKey]) {
          topics[doc.subjectKey] = {};
        }
        topics[doc.subjectKey][doc.year] = doc.topics;
      });
      
      return {
        subjects,
        years,
        topics
      };
    } catch (error) {
      console.error('Error getting full data:', error);
      throw error;
    }
  }
}

module.exports = JupebSubjectModel;