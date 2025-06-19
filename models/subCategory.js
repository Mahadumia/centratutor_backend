// models/subCategory.js
const mongoose = require('mongoose');
const { SubCategory } = require('./exam');

class SubCategoryModel {
  async createSubCategory(data) {
    try {
      const { name, displayName, description, icon, routePath, orderIndex } = data;
      
      const subCategory = new SubCategory({
        name: name.toLowerCase(),
        displayName,
        description,
        icon: icon || `assets/images/${name.toLowerCase()}.png`,
        routePath,
        orderIndex: orderIndex || 0
      });

      await subCategory.save();
      return subCategory;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw error;
    }
  }

  async getAllSubCategories() {
    try {
      return await SubCategory.find({ isActive: true })
        .sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting subcategories:', error);
      throw error;
    }
  }

  async getSubCategoryById(id) {
    try {
      return await SubCategory.findById(id);
    } catch (error) {
      console.error('Error getting subcategory by id:', error);
      throw error;
    }
  }

  async getSubCategoryByName(name) {
    try {
      return await SubCategory.findOne({ 
        name: name.toLowerCase(), 
        isActive: true 
      });
    } catch (error) {
      console.error('Error getting subcategory by name:', error);
      throw error;
    }
  }

  async updateSubCategory(id, updateData) {
    try {
      const updates = { ...updateData };
      if (updates.name) {
        updates.name = updates.name.toLowerCase();
      }

      const subCategory = await SubCategory.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );

      return subCategory;
    } catch (error) {
      console.error('Error updating subcategory:', error);
      throw error;
    }
  }

  async deleteSubCategory(id) {
    try {
      // Soft delete by setting isActive to false
      const subCategory = await SubCategory.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      return !!subCategory;
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      throw error;
    }
  }

  async reorderSubCategories(orderUpdates) {
    try {
      const updatePromises = orderUpdates.map(({ id, orderIndex }) =>
        SubCategory.findByIdAndUpdate(id, { orderIndex })
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Error reordering subcategories:', error);
      throw error;
    }
  }

  async createBulkSubCategories(subCategoriesData) {
    try {
      const results = { created: [], errors: [], duplicates: [] };
      
      for (const [index, subCategoryData] of subCategoriesData.entries()) {
        try {
          if (!subCategoryData.name || !subCategoryData.displayName || !subCategoryData.routePath) {
            results.errors.push({
              index,
              name: subCategoryData.name || 'Unknown',
              error: 'Name, displayName, and routePath are required'
            });
            continue;
          }
          
          const newSubCategory = await this.createSubCategory(subCategoryData);
          results.created.push({
            id: newSubCategory._id,
            name: newSubCategory.name
          });
          
        } catch (error) {
          if (error.code === 11000) {
            results.duplicates.push({
              index,
              name: subCategoryData.name
            });
          } else {
            results.errors.push({
              index,
              name: subCategoryData.name || 'Unknown',
              error: error.message
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk subcategories:', error);
      throw error;
    }
  }

  async seedDefaultSubCategories() {
    try {
      const defaultSubCategories = [
        {
          name: 'pastquestions',
          displayName: 'Past Questions',
          description: 'Previous exam questions and answers',
          routePath: '/pastquestions',
          orderIndex: 1
        },
        {
          name: 'notes',
          displayName: 'Notes',
          description: 'Study materials and comprehensive notes',
          routePath: '/notes',
          orderIndex: 2
        },
        {
          name: 'videos',
          displayName: 'Videos',
          description: 'Educational video content',
          routePath: '/videos',
          orderIndex: 3
        }
      ];

      const results = { created: [], existing: [], errors: [] };
      
      for (const subCategoryData of defaultSubCategories) {
        try {
          // Check if subcategory already exists
          const existing = await this.getSubCategoryByName(subCategoryData.name);
          if (!existing) {
            const created = await this.createSubCategory(subCategoryData);
            results.created.push(created.name);
          } else {
            results.existing.push(subCategoryData.name);
          }
        } catch (error) {
          results.errors.push({ 
            name: subCategoryData.name, 
            error: error.message 
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error seeding default subcategories:', error);
      throw error;
    }
  }

  async searchSubCategories(query) {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      return await SubCategory.find({
        $or: [
          { name: searchRegex },
          { displayName: searchRegex },
          { description: searchRegex }
        ],
        isActive: true
      }).sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error searching subcategories:', error);
      throw error;
    }
  }

  async validateSubCategoryExists(subCategoryId) {
    try {
      const subCategory = await SubCategory.findById(subCategoryId);
      return !!subCategory;
    } catch (error) {
      console.error('Error validating subcategory:', error);
      return false;
    }
  }

  async getActiveSubCategoriesCount() {
    try {
      return await SubCategory.countDocuments({ isActive: true });
    } catch (error) {
      console.error('Error counting subcategories:', error);
      throw error;
    }
  }

  async getSubCategoriesByRoute(routePath) {
    try {
      return await SubCategory.find({ 
        routePath, 
        isActive: true 
      }).sort({ orderIndex: 1, name: 1 });
    } catch (error) {
      console.error('Error getting subcategories by route:', error);
      throw error;
    }
  }

  async toggleSubCategoryStatus(id) {
    try {
      const subCategory = await SubCategory.findById(id);
      if (!subCategory) {
        return null;
      }

      subCategory.isActive = !subCategory.isActive;
      await subCategory.save();
      
      return subCategory;
    } catch (error) {
      console.error('Error toggling subcategory status:', error);
      throw error;
    }
  }
}

module.exports = SubCategoryModel;