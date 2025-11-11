const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const DB_USER = process.env.MONGO_USER;
const DB_PASSWORD = process.env.MONGO_PASSWORD;
const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@crud.jtcvf7t.mongodb.net/?appName=crud`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let petListingsCollection;
let db;


var admin = require("firebase-admin");

var serviceAccount = require("./pawmart-84610-firebase-adminsdk-fbsvc-4e78528a83.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  if(!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" })
  }

  const token = req.headers.authorization.split(' ')[1]
  if(!token) {
    return res.status(401).send({ message: "unauthorized access" })
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.user = userInfo
    next()
  }
  catch (err) {
      return res.status(401).send({ message: "unauthorized access" })
  }
}



app.get('/', (req, res) => {
    res.send("smartPaw server is running");
})



// Create user in database
app.post('/users', async (req, res) => {
  try {
    const {displayName, photoURL, email } = req.body;
  if(!email || !displayName) {
    return res.status(400).json({ message: "Missing requires fields" })
  }

  const usersCollections = db.collection('users');
  const existingUser = await usersCollections.findOne({ email })
  if(existingUser) {
    return res.status(409).json({ message: "user already exists" })
  }

  const newUser = {email, displayName, photoURL, createdAt: new Date()}
  await usersCollections.insertOne(newUser);
  res.status(201).json({ message: 'User saved successfully', user: newUser });
  }
  catch(err) {
    console.log(err);
        res.status(500).json({ message: 'Server error' });
  }
})


// Get all listings or get specific amount using count query
app.get('/listings', async (req, res) => {
    try {
        if(!petListingsCollection) return res.status(500).json({ message: "Database not ready yet!" })

        let query = petListingsCollection.find({}).sort({ date: -1 });
        const count = req.query.count ? parseInt(req.query.count) : null;

        if(count) query = query.limit(count);
        const listings = await query.toArray();

        res.status(200).json(listings)
    }
    catch(err) {
        res.status(500).json({ message: "Failed to fetch pet listings" })
    }
})

// Add new listing
app.post('/add-listing', verifyFirebaseToken, async (req, res) => {
  try {
const { name, category, price, location, description, image, date, email } = req.body;
  if(!name || !category || !price || !location || !description || !image || !date || !email) {
    res.status(400).json({ message: "All fields are required" })
    return;
  }

  const newListing = { 
    name, 
    category,
    price: parseFloat(price), 
    location,
    description,
    image,
    date,
    email,
  }

  const result = await petListingsCollection.insertOne(newListing);
  if (result.insertedId) {
      return res.status(201).json({
        message: "Listing added successfully",
        id: result.insertedId,
      });
    } else {
      return res.status(500).json({ message: "Failed to add listing." });
    }
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" })
  }
  
})

// Get listings by email
app.get('/listings/:email', verifyFirebaseToken, async (req, res) => {
  try {
    const email = req.params.email;
    if(email !== req.user.email) {
      return res.status(401).json({ message: "unauthorized access" })
    }
    const listings = await petListingsCollection.find({ email }).toArray();
    return res.status(200).json(listings)
  }
  catch (err) {
    return res.status(500).json({ message: "Server error" })
  }
})

// Delete Listing
app.delete('/listings/:id',   verifyFirebaseToken, async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.user.email;

    if(!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid listing id" })
    }

    const listing = await petListingsCollection.findOne({ _id: new ObjectId(id) });

    if(!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if(listing.email !== email) {
    return res.status(403).json({ message: "Forbidden: not your listing" });
    }

    const result = await petListingsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      return res.status(200).json({ message: "Listing deleted successfully" });
    } else {
      return res.status(500).json({ message: "Failed to delete listing" });
    }
  }
  catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ message: "Server error" });
  }
})

async function startDB() {
  try {
    await client.connect();
    db = client.db('pawMart')
    petListingsCollection = db.collection('petListings')


    app.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
  }
  catch(err) {
    console.error(err);
  }
}

startDB();



