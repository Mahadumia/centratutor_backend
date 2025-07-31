const { MongoClient } = require('mongodb');

// Your MongoDB connection string
const uri = "mongodb+srv://centratutor:7uUltLuRhjXXzfN3@centratutor.qfast0o.mongodb.net/centratutorApp?retryWrites=true&w=majority&appName=centratutor";
const dbName = "centratutorApp";
const oldBaseUrl = "https://centratutor.s3.eu-north-1.amazonaws.com";
const newBaseUrl = "https://d1e4j0pjg1eygw.cloudfront.net";

// Function to recursively count URLs in any object structure - with debugging
function countUrlsInObject(obj, oldUrl, path = '') {
  let count = 0;
  
  if (typeof obj === 'string' && obj.includes(oldUrl)) {
    console.log(`      🔗 Found URL at ${path}: ${obj.substring(0, 80)}...`);
    return 1;
  }
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      count += countUrlsInObject(obj[i], oldUrl, `${path}[${i}]`);
    }
  } else if (obj && typeof obj === 'object' && obj !== null) {
    // Skip MongoDB internal fields
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
        const newPath = path ? `${path}.${key}` : key;
        count += countUrlsInObject(value, oldUrl, newPath);
      }
    }
  }
  
  return count;
}

// Function to recursively replace URLs in any object structure
function replaceUrlsInObject(obj, oldUrl, newUrl) {
  if (typeof obj === 'string' && obj.includes(oldUrl)) {
    return obj.replace(new RegExp(escapeRegex(oldUrl), 'g'), newUrl);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => replaceUrlsInObject(item, oldUrl, newUrl));
  } else if (obj && typeof obj === 'object' && obj !== null && obj.constructor === Object) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceUrlsInObject(value, oldUrl, newUrl);
    }
    return result;
  }
  
  return obj;
}

async function comprehensiveSearch() {
  const client = new MongoClient(uri);
  let totalUrls = 0;
  
  try {
    await client.connect();
    console.log("🔍 Connected to MongoDB - Comprehensive URL Search...\n");
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections to search:\n`);
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      console.log(`📁 Checking collection: ${collectionName}`);
      
      try {
        // Use text search with regex to find documents containing the old URL
        // This approach works with all MongoDB Atlas tiers
        const searchQueries = [
          // Direct string fields
          { $or: [
            { filePath: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { contentUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { url: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { fileUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { mediaUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { imageUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { videoUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { pdfUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } }
          ]},
          // Nested in content arrays
          { "content.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          // Nested in weeks.contents arrays (for nightclasses)
          { "weeks.contents.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "weeks.contents.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          // Nested in other possible structures
          { "items.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "items.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "files.path": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "files.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "media.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "attachments.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } }
        ];
        
        let documentsWithOldUrls = [];
        
        // Try each query pattern and collect unique documents
        const foundDocIds = new Set();
        
        for (const query of searchQueries) {
          try {
            const docs = await collection.find(query).toArray();
            for (const doc of docs) {
              if (!foundDocIds.has(doc._id.toString())) {
                foundDocIds.add(doc._id.toString());
                documentsWithOldUrls.push(doc);
              }
            }
          } catch (queryError) {
            // Skip queries that fail due to field not existing
            continue;
          }
        }
        
        if (documentsWithOldUrls.length === 0) {
          console.log(`   ✅ No old URLs found\n`);
          continue;
        }
        
        console.log(`   📄 Found ${documentsWithOldUrls.length} documents with old URLs`);
        
        // Count actual URLs in all documents
        let collectionUrlCount = 0;
        console.log(`   🔍 Analyzing documents for URL count...`);
        
        for (let i = 0; i < Math.min(documentsWithOldUrls.length, 3); i++) {
          const doc = documentsWithOldUrls[i];
          console.log(`   📄 Document ${i + 1} (${doc._id}):`);
          
          // Debug: Show structure of first few fields
          const sampleFields = Object.keys(doc).slice(0, 5);
          console.log(`      Sample fields: ${sampleFields.join(', ')}`);
          
          const urlsInDoc = countUrlsInObject(doc, oldBaseUrl);
          collectionUrlCount += urlsInDoc;
          console.log(`      URLs in this document: ${urlsInDoc}`);
        }
        
        // Count remaining documents without detailed logging
        for (let i = 3; i < documentsWithOldUrls.length; i++) {
          const doc = documentsWithOldUrls[i];
          const urlsInDoc = countUrlsInObject(doc, oldBaseUrl);
          collectionUrlCount += urlsInDoc;
        }
        
        console.log(`   🔗 Total URLs to update: ${collectionUrlCount}`);
        totalUrls += collectionUrlCount;
        
        // Show sample document structure
        console.log(`   📋 Sample document structure:`);
        const sampleDoc = documentsWithOldUrls[0];
        console.log(`      Document ID: ${sampleDoc._id}`);
        
        // Find and show the specific fields containing URLs
        const urlFields = findUrlFields(sampleDoc, oldBaseUrl);
        if (urlFields.length > 0) {
          console.log(`   🎯 URL fields found: ${urlFields.join(', ')}`);
        }
        
        console.log("");
        
      } catch (error) {
        console.log(`   ❌ Error searching collection: ${error.message}\n`);
      }
    }
    
    console.log(`🎯 TOTAL URLs to update across all collections: ${totalUrls}\n`);
    
  } catch (error) {
    console.error("❌ Error during comprehensive search:", error);
  } finally {
    await client.close();
  }
}

// Function to find all field paths containing URLs
function findUrlFields(obj, oldUrl, currentPath = '') {
  let fields = [];
  
  if (typeof obj === 'string' && obj.includes(oldUrl)) {
    fields.push(currentPath || 'root');
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const path = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      fields = fields.concat(findUrlFields(item, oldUrl, path));
    });
  } else if (obj && typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
        const path = currentPath ? `${currentPath}.${key}` : key;
        fields = fields.concat(findUrlFields(value, oldUrl, path));
      }
    }
  }
  
  return fields;
}

async function comprehensiveUpdate() {
  const client = new MongoClient(uri);
  let totalUpdated = 0;
  let totalUrlsReplaced = 0;
  
  try {
    await client.connect();
    console.log("🚀 Connected to MongoDB - Starting Comprehensive Update...\n");
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      console.log(`📁 Processing collection: ${collectionName}`);
      
      try {
        // Find all documents with old URLs using multiple query patterns
        const searchQueries = [
          // Direct string fields
          { $or: [
            { filePath: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { contentUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { url: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { fileUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { mediaUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { imageUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { videoUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
            { pdfUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } }
          ]},
          // Nested in content arrays
          { "content.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          // Nested in weeks.contents arrays (for nightclasses)
          { "weeks.contents.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "weeks.contents.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          // Nested in other possible structures
          { "items.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "items.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "files.path": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "files.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "media.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "attachments.url": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } }
        ];
        
        let documentsWithOldUrls = [];
        
        // Try each query pattern and collect unique documents
        const foundDocIds = new Set();
        
        for (const query of searchQueries) {
          try {
            const docs = await collection.find(query).toArray();
            for (const doc of docs) {
              if (!foundDocIds.has(doc._id.toString())) {
                foundDocIds.add(doc._id.toString());
                documentsWithOldUrls.push(doc);
              }
            }
          } catch (queryError) {
            // Skip queries that fail due to field not existing
            continue;
          }
        }
        
        if (documentsWithOldUrls.length === 0) {
          console.log(`   ✅ No updates needed\n`);
          continue;
        }
        
        let collectionUpdated = 0;
        let collectionUrlsReplaced = 0;
        
        // Process each document individually
        for (const doc of documentsWithOldUrls) {
          const originalUrlCount = countUrlsInObject(doc, oldBaseUrl);
          
          // Create updated document with all URLs replaced
          const updatedDoc = replaceUrlsInObject(doc, oldBaseUrl, newBaseUrl);
          
          // Remove _id for the update operation
          const { _id, ...updateFields } = updatedDoc;
          
          // Update the document
          const result = await collection.replaceOne(
            { _id: doc._id },
            updateFields
          );
          
          if (result.modifiedCount > 0) {
            collectionUpdated++;
            collectionUrlsReplaced += originalUrlCount;
            console.log(`   ✅ Updated document ${doc._id} (${originalUrlCount} URLs replaced)`);
          }
        }
        
        totalUpdated += collectionUpdated;
        totalUrlsReplaced += collectionUrlsReplaced;
        
        console.log(`   📊 Collection Summary: ${collectionUpdated} documents updated, ${collectionUrlsReplaced} URLs replaced\n`);
        
      } catch (error) {
        console.log(`   ❌ Error updating collection: ${error.message}\n`);
      }
    }
    
    console.log(`🎉 UPDATE COMPLETE!`);
    console.log(`📊 Total documents updated: ${totalUpdated}`);
    console.log(`🔗 Total URLs replaced: ${totalUrlsReplaced}`);
    console.log(`🔄 Changed from: ${oldBaseUrl}`);
    console.log(`🔄 Changed to:   ${newBaseUrl}\n`);
    
  } catch (error) {
    console.error("❌ Error during comprehensive update:", error);
  } finally {
    await client.close();
  }
}

// Function to verify update completion
async function verifyUpdate() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("🔍 Verifying update completion...\n");
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    let foundOldUrls = false;
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      const count = await collection.countDocuments({
        $or: [
          { filePath: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { contentUrl: { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "content.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "weeks.contents.contentUrl": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } },
          { "weeks.contents.filePath": { $regex: escapeRegex(oldBaseUrl), $options: 'i' } }
        ]
      });
      
      if (count > 0) {
        console.log(`⚠️  ${collectionName}: Still has ${count} documents with old URLs`);
        foundOldUrls = true;
      }
    }
    
    if (!foundOldUrls) {
      console.log("✅ SUCCESS! No old URLs found in any collection.");
      console.log("🎉 All URLs have been successfully updated to CloudFront!\n");
    } else {
      console.log("⚠️  Some old URLs were found. You may need to run the update again.\n");
    }
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
  } finally {
    await client.close();
  }
}

// Function to escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==========================================
// MAIN EXECUTION
// ==========================================

// Choose what to run:

// 1. SEARCH ONLY (run this first to see what will be updated)
comprehensiveSearch();

// 2. UPDATE (uncomment to run the actual update)
// comprehensiveUpdate();

// 3. VERIFY (uncomment to verify update completion)
// verifyUpdate();


/// what to run
// cd mongodb-url-updater
// node update-urls.js
console.log("================================================");
console.log("INSTRUCTIONS:");
console.log("1. First run: Search only (current mode)");
console.log("2. Second run: Uncomment comprehensiveUpdate()");
console.log("3. Third run: Uncomment verifyUpdate()");
console.log("================================================");