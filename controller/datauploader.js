const asyncHandler = require("../middlewares/asyncHandler");
const admin = require("firebase-admin");
const serviceAccount = require("../cred.json");

// initizalizing admin with its credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// utility
async function getDocumentById(collectionName, id) {
  const db = admin.firestore();
  const docRef = db.collection(collectionName).doc(id);
  const doc = await docRef.get();
  return doc;
}

// controllers
module.exports.createUser = asyncHandler(async (req, res) => {
  const db = admin.firestore();
  const { username, email, password } = req.body;
  const docRef = await db.collection("listings").add({
    username,
    email,
    password,
  });
  res
    .status(201)
    .json({ message: "Listing created successfully", id: docRef.id });
});

module.exports.UpdateById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const newData = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID parameter is missing" });
  }

  const doc = await getDocumentById("listings", id);

  if (!doc.exists) {
    return res.status(404).json({ error: "Document not found" });
  }

  const docRef = admin.firestore().collection("listings").doc(id);
  await docRef.update(newData);

  res.status(200).json({ message: "Listing updated successfully" });
});

module.exports.DeleteUserById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "ID parameter is missing" });
  }

  const doc = await getDocumentById("listings", id);

  if (!doc.exists) {
    return res.status(404).json({ error: "Document not found" });
  }

  const docRef = admin.firestore().collection("listings").doc(id);
  await docRef.delete();

  res.status(200).json({ message: "Listing deleted successfully" });
});
