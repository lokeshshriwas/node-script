const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
const fileUpload = require("express-fileupload");

const {
  createUser,
  DeleteUserById,
  UpdateById,
} = require("./controller/datauploader");
const {
  createBulk,
  updateBulk,
  getAllData,
} = require("./controller/bulkController.js");
const { addFields, createBulkWithCsv, getAllDataInCsv } = require("./controller/helperFunctions.js");

// Middleware to handle file uploads and save to local machine
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Optional: Serve static files from 'public' directory
app.use(fileUpload()); // Use express-fileupload middleware

// Add custom middleware with increased payload limit
app.use(express.json({ limit: "50mb" }));

// Route to create a new document
app.post("/create", createUser);

// Route to get all documents
app.get("/getalldata", getAllDataInCsv);

// Route to update a document by ID
app.put("/updateuser/:id", UpdateById);

// Route to delete a document by ID
app.delete("/deleteuser/:id", DeleteUserById);

// Route to create multiple documents at once
app.post("/create-bulk/:collectionName", createBulkWithCsv);

// Route to update multiple documents at once
app.post("/update-bulk/:collectionName", updateBulk);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
