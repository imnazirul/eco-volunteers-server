const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.port || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
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
    const RequestedPostCollection = client
      .db("volunteerDB")
      .collection("RequestedPosts");
    const NewsCollection = client.db("volunteerDB").collection("updateNews");

    app.get("/volunteerposts", async (req, res) => {
      const email = req.query?.email;
      const limit = parseInt(req.query?.limit);

      let query = {};
      if (email) {
        query = {
          organizer_email: email,
        };
      }

      const cursor = VPostsCollection.find(query)
        .limit(limit)
        .sort({ deadline: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/requestedpost", async (req, res) => {
      const email = req?.query.email;
      const query = {
        volunteer_email: email,
      };
      const result = await RequestedPostCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/volunteerpostssearch", async (req, res) => {
      const search = req.query?.search;
      const query = {
        post_title: { $regex: search, $options: "i" },
      };
      const options = {};
      const result = await VPostsCollection.find(query, options).toArray();

      console.log(result.length);
      res.send(result);
    });

    app.get("/singlevpost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await VPostsCollection.findOne(query);
      res.send(result);
    });

    app.get("/updatesandnews", async (req, res) => {
      const cursor = NewsCollection.find();
      const result = await cursor.toArray();
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

    app.post("/updatevolunteerneeded", async (req, res) => {
      const id = req.query?.id;
      const volunteer = req.body;
      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $inc: { volunteers_needed: -1 },
      };
      const addIdToDataBase = await RequestedPostCollection.insertOne({
        id,
        ...volunteer,
      });
      const result = await VPostsCollection.updateOne(filter, updateDoc);

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

    app.delete("/volunteerposts", async (req, res) => {
      const id = req.query?.deleteid;
      const query = { _id: new ObjectId(id) };

      const result = await VPostsCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/requestedpost", async (req, res) => {
      const id = req.query?.cancelid;
      const query = { _id: new ObjectId(id) };

      const result = await RequestedPostCollection.deleteOne(query);
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
