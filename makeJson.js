const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

// Initialize Firebase Admin SDK
const serviceAccount = require("./cred.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Function to read CSV file and convert it into JSON
function convertCSVtoJSON(csvFilePath) {
  return new Promise((resolve, reject) => {
    const jsonArray = [];
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (data) => jsonArray.push(data))
      .on("end", () => resolve(jsonArray))
      .on("error", (error) => reject(error));
  });
}

// Function to update Firebase data using JSON data
async function updateFirebaseData(jsonData, collectionName) {
  const db = admin.firestore();
  const batch = db.batch();

  // Iterate over JSON data and update documents in Firebase
  jsonData.forEach((data) => {
    const { id, ...updateData } = data;
    const docRef = db.collection(collectionName).doc(id); // Replace 'collectionName' with your actual collection name
    batch.update(docRef, updateData);
  });

  // Commit batched writes
  await batch.commit();
  console.log("Data updated in Firebase successfully.");
}

// Main function to execute the process
async function processData(csvFilePath, collectionName) {
  try {
    // Convert CSV to JSON
    const jsonData = await convertCSVtoJSON(csvFilePath);

    // Update Firebase data using JSON data
    await updateFirebaseData(jsonData, collectionName);
  } catch (error) {
    console.error("Error processing data:", error);
  }
}

// Define CSV file path and Firebase collection name
const csvFilePath = "./sample.csv"; // Replace with your CSV file path
const collectionName = "listings"; // Replace with your actual collection name

// Execute the process
processData(csvFilePath, collectionName);
