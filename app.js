const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion } = require('mongodb');
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

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send("smartPaw server is running");
})

app.get('/pets', async (req, res) => {
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



