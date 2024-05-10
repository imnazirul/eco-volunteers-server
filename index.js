const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.port || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5175"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kygk2l2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const VPostsCollection = client
      .db("volunteerDB")
      .collection("volunteerPosts");

    app.get("/volunteerposts", async (req, res) => {
      const email = req.query?.email;
      const limit = parseInt(req.query?.limit);

      let query = {};
      if (email) {
        query = {
          organizer_email: email,
        };
      }
      const cursor = VPostsCollection.find(query).limit(limit);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/singlevpost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await VPostsCollection.findOne(query);
      res.send(result);
    });

    app.post("/volunteerposts", async (req, res) => {
      const post = req.body;
      const doc = {
        ...post,
      };
      const result = await VPostsCollection.insertOne(doc);
      res.send(result);
    });

    app.put("/volunteerposts", async (req, res) => {
      const post = req.body;
      const id = req.query?.update;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...post,
        },
      };
      const result = await VPostsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server in running...");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
