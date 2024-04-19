const asyncHandler = require("../middlewares/asyncHandler");
const admin = require("firebase-admin");
const fs = require("fs");
const json2csv = require("json2csv").Parser;
const path = require("path")
const csv = require("csv-parser");

// helper functions

module.exports.getAllDataInCsv = asyncHandler(async (req, res) => {
  const db = admin.firestore();
  const snapshot = await db.collection("listings").get();

  const listings = [];
  snapshot.forEach((doc) => {
    listings.push({
      id: doc.id,
      ...doc.data(), // Include all fields from document data
    });
  });

  // Check if listings array is empty
  if (listings.length === 0) {
    return res.status(404).json({ error: "No data found" });
  }
  const json2csvParser = new json2csv();
  const csv = json2csvParser.parse(listings);

  // Write CSV to file
  fs.writeFileSync("listings.csv", csv);

  // Respond with CSV file
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=listings.csv");
  res.status(200).send(csv);
});




// module.exports.getAllDataInCsv = asyncHandler(async (req, res) => {
//   const db = admin.firestore();
//   const snapshot = await db.collection("listings").get();

//   const listings = [];
//   snapshot.forEach((doc) => {
//     listings.push({
//       id: doc.id,
//       ...doc.data(),
//     });
//   });

//   // Convert JSON data to CSV
//   const json2csvParser = new json2csv();
//   const csv = json2csvParser.parse(listings.map((listing) => listing.data));

//   // Write CSV to file
//   fs.writeFileSync("listings.csv", csv);

//   // Respond with CSV file
//   res.setHeader("Content-Type", "text/csv");
//   res.setHeader("Content-Disposition", "attachment; filename=listings.csv");
//   res.status(200).send(csv);
// });



// function to add extra fields in each documents
module.exports.addFields = asyncHandler(async (req, res) => {
  // Function to add a field to all documents in a Firestore collection
  async function addFieldToCollection(collectionName, additionalField) {
    const db = admin.firestore();
    const collectionRef = db.collection(collectionName);

    try {
      const batch = db.batch();
      let totalDocumentsUpdated = 0;

      // Fetch all documents in the collection
      const snapshot = await collectionRef.get();

      snapshot.forEach((doc) => {
        // Get the document reference
        const docRef = collectionRef.doc(doc.id);

        // Get the existing data
        const existingData = doc.data();

        // Add the additional field to the existing data
        const updatedData = { ...existingData, ...additionalField };

        // Update the document in the batch
        batch.update(docRef, updatedData);

        totalDocumentsUpdated++;
      });

      // Commit the batch update
      await batch.commit();

      return totalDocumentsUpdated;
    } catch (error) {
      console.error("Error updating documents:", error);
      throw error; // Propagate the error to the caller
    }
  }

  const { additionalField } = req.body;
  const { collectionName } = req.params;

  try {
    if (!collectionName || !additionalField) {
      return res
        .status(400)
        .json({ error: "Collection name and additional field are required" });
    }

    const totalDocumentsUpdated = await addFieldToCollection(
      collectionName,
      additionalField
    );
    res
      .status(200)
      .json({ message: `Total documents updated: ${totalDocumentsUpdated}` });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// function to add data into the database using csv
// module.exports.createBulkWithCsv = asyncHandler(async (req, res) => {
//   const { collectionName } = req.params;

//   try {
//     // Ensure CSV file is uploaded
//     if (!req.files || !req.files.csvFile) {
//       return res.status(400).json({ error: "CSV file is required" });
//     }

//     // Extract CSV file from request
//     const csvFile = req.files.csvFile;

//      // Check file extension
//     if (!csvFile.name.endsWith(".csv")) {
//       return res
//         .status(400)
//         .json({ error: "Invalid file format. Please upload a CSV file" });
//     }

//     // Save the uploaded CSV file to the local machine
//     const filePath = path.join(__dirname, "../uploads", csvFile.name);
//     await csvFile.mv(filePath);

//     // Convert CSV to JSON
//     const jsonData = [];
//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on("data", (data) => {
//         jsonData.push(data);
//       })
//       .on("end", async () => {
//         // Create documents in Firebase based on JSON data
//         const db = admin.firestore();
//         const batch = db.batch();
//         const startTime = Date.now();
//         let documentsCreated = 0;

//         jsonData.forEach((data) => {
//           const docRef = db.collection(collectionName).doc();
//           batch.set(docRef, data);
//           documentsCreated++;
//         });

//         await batch.commit();

//         const endTime = Date.now();
//         const elapsedTime = endTime - startTime;

//         // Respond with success message and statistics
//         res.status(200).json({
//           message: "Documents created successfully",
//           documentsCreated,
//           elapsedTime: `${elapsedTime} milliseconds`,
//         });
//       });

//   } catch (error) {
//     console.error("Error creating documents:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// })


// function to add data into the database using csv with new "won" logic 
module.exports.createBulkWithCsv = asyncHandler(async (req, res) => {
  const { collectionName } = req.params;

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
    await csvFile.mv(filePath);

    // Convert CSV to JSON
    const jsonData = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        // Add custom key field 'won' to each data object
        jsonData.push(data);
      })
      .on("end", async () => {
        // Create documents in Firebase based on JSON data
        const db = admin.firestore();
        const batch = db.batch();
        const startTime = Date.now();
        let documentsCreated = 0;

        jsonData.forEach((data) => {
          // Extract the 'won' field value to use as document ID
          const documentId = data['won'];
          if (!documentId) {
            console.error("Document ID ('won') not found in CSV data:", data);
            return;
          }
          const docRef = db.collection(collectionName).doc(documentId);
          batch.set(docRef, data);
          documentsCreated++;
        });

        await batch.commit();

        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        // Respond with success message and statistics
        res.status(200).json({
          message: "Documents created successfully",
          documentsCreated,
          elapsedTime: `${elapsedTime} milliseconds`,
        });
      });

  } catch (error) {
    console.error("Error creating documents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

