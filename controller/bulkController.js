const asyncHandler = require("../middlewares/asyncHandler");
const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");


module.exports.createBulk = asyncHandler(async (req, res) => {
  // Extract collection name and documents array from request parameters
  const { collectionName } = req.params;
  const { documents, batchSize = 500 } = req.body;

  // Validate documents array
  if (!Array.isArray(documents)) {
    return res.status(400).json({ error: "Documents should be an array" });
  }

  // Validate batchSize
  if (batchSize <= 0) {
    return res.status(400).json({ error: "Batch size should more than 0" });
  }

  const db = admin.firestore();

  let totalAdded = 0;
  const startTime = Date.now();

  // Split documents into smaller batches
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(
      i,
      i + Math.min(batchSize, documents.length - i)
    );

    const batchWrite = db.batch();
    batch.forEach((doc) => {
      // Create document reference and add it to batch
      const docRef = db.collection(collectionName).doc();
      batchWrite.set(docRef, doc);
    });

    try {
      // Commit batch write
      await batchWrite.commit();
      totalAdded += batch.length;
    } catch (error) {
      console.error("Error committing batch:", error);
      return res.status(500).json({ error: "Error committing batch" });
    }
  }

  // Calculate the time taken to create the data
  const endTime = Date.now();
  const elapsedTime = endTime - startTime;

  // Respond with success message, total number of documents added, and time taken
  res.status(201).json({
    message: "Documents created successfully",
    totalAdded,
    elapsedTime: `${elapsedTime} milliseconds`,
  });
});

module.exports.updateBulk = asyncHandler(async (req, res) => {
  const { collectionName } = req.params;
  const startTime = Date.now(); // Track start time

  try {
    // Ensure CSV file is uploaded
    if (!req.files || !req.files.csvFile) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    // Extract CSV file from request
    const csvFile = req.files.csvFile;

    // Check file extension
    if (!csvFile.name.endsWith(".csv")) {
      return res
        .status(400)
        .json({ error: "Invalid file format. Please upload a CSV file" });
    }

    // Save the uploaded CSV file to the local machine
    const filePath = path.join(__dirname, "../uploads", csvFile.name);

    // Move the file to the desired destination
    await csvFile.mv(filePath);

    // Convert CSV to JSON
    let jsonData = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        jsonData.push(data);
      })
      .on("error", (err) => {
        res.json({ message: `Error in any document: ${err}` });
      })
      .on("end", async () => {
        try {
          // Update documents in Firebase based on JSON data
          const db = admin.firestore();
          const batch = db.batch();

          jsonData.forEach((data) => {
            const { id, ...updateData } = data;
            const docRef = db.collection(collectionName).doc(id);
            batch.update(docRef, updateData);
          });

          await batch.commit();

          const endTime = Date.now(); // Track end time
          const executionTime = endTime - startTime; // Calculate execution time in milliseconds

          // Respond with success message and execution time
          res.status(200).json({
            message: "Documents updated successfully",
            documentsUpdated: jsonData.length,
            executionTime: executionTime + "ms",
          });
        } catch (error) {
          console.error("Error updating documents:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      });
  } catch (error) {
    console.error("Error processing CSV file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports.getAllData = asyncHandler(async (req, res) => {
  const db = admin.firestore();
  const snapshot = await db.collection("listings").get();

  const listings = [];
  snapshot.forEach((doc) => {
    listings.push({
      id: doc.id,
      data: doc.data(),
    });
  });

  res.status(200).json(listings);
});

