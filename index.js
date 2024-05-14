const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.port || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://volunteer-a11.web.app",
      "https://volunteer-a11.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

//middleware

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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

    //jwt auth api
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //clear cookie
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log(user.email, "logout Successfully");
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //data related api
    app.get("/volunteerposts", async (req, res) => {
      const limit = parseInt(req.query?.limit);

      const cursor = VPostsCollection.find().limit(limit).sort({ deadline: 1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/needposts", verifyToken, async (req, res) => {
      const email = req?.query?.email;

      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        organizer_email: email,
      };
      const result = await VPostsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/requestedpost", verifyToken, async (req, res) => {
      const email = req?.query?.email;

      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
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

      res.send(result);
    });

    app.get("/singlevpost/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await VPostsCollection.findOne(query);
      res.send(result);
    });

    app.get("/updatesandnews", async (req, res) => {
      const cursor = NewsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/volunteerposts", verifyToken, async (req, res) => {
      const post = req.body;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      console.log(email);
      const doc = {
        ...post,
      };
      const result = await VPostsCollection.insertOne(doc);
      res.send(result);
    });

    app.post("/updatevolunteerneeded", verifyToken, async (req, res) => {
      const id = req.query?.id;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

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

    app.put("/volunteerposts", verifyToken, async (req, res) => {
      const post = req.body;
      const id = req.query?.update;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

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

    app.delete("/volunteerposts", verifyToken, async (req, res) => {
      const id = req.query?.deleteid;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { _id: new ObjectId(id) };

      const result = await VPostsCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/requestedpost", verifyToken, async (req, res) => {
      const id = req.query?.cancelid;
      //verify user
      const email = req.query?.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { _id: new ObjectId(id) };

      const result = await RequestedPostCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
