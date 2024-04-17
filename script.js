const admin = require('firebase-admin');

const serviceAccount = require('./cred.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function updateAllListings(newData) {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("listings").get();

    const batchedUpdates = [];

    snapshot.forEach(doc => {
      const docRef = db.collection('listings').doc(doc.id);
      batchedUpdates.push(docRef.update(newData));
    });

    await Promise.all(batchedUpdates);

    console.log('All listings updated successfully');
  } catch (error) {
    console.error('Error updating listings:', error);
  }
}

const newData = {
  password : "12345678"
};

updateAllListings(newData);
