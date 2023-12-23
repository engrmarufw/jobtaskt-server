const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const multer = require('multer');
const port = process.env.PORT || 5000;
// middleware
app.use(express.json());
app.use(cors({ origin: process.env.REMOTE_CLIENT_APP, credentials: true }));
// app.use(cors());

const uri = process.env.MONGODB_URL;
const upload = multer();

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the cliddent to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db('ecomarceTask').collection('users');
        const productCollection = client.db('ecomarceTask').collection('products');
        const cartsCollection = client.db('ecomarceTask').collection('carts');


        app.post('/users', async (req, res) => {
            const user = req.body;
            const existingUser = await userCollection.findOne({ email: user.email });
            if (existingUser) {
                return res.send('userexists');
            }
            const hashedPassword = await bcrypt.hash(user?.password, 10);
            user.password = hashedPassword
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updaterecord = req.body;
            const update = {
                $set: updaterecord
            }
            const result = await userCollection.updateOne(filter, update, options);
            res.send(result);
        })
        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query);
            res.send(result);
        });




        app.post("/login", async (req, res) => {
            const user = req.body;
            const requser = await userCollection.findOne({ email: user.email });
            if (requser) {
                if (await bcrypt.compare(user.password, requser.password)) {
                    const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
                        expiresIn: "24h",
                    });

                    if (res.status(201)) {
                        return res.json({ status: "ok", data: token });
                    } else {
                        return res.json({ error: "error" });
                    }
                }
            }
            res.json({ status: "error", error: "InvAlidPassword" });
        });



        // logged user 
        app.get('/loggeduser', async (req, res) => {
            const token = req.headers.token;
            const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, res) => {
                if (err) {
                    return "token expired";
                }
                return res;
            });
            if (user == "token expired") {
                return res.send({ status: "error", data: "token expired" });
            }
            if (user) {

                const currentUser = await userCollection.findOne({ email: user.email });

                res.send(currentUser);
            }
            else {
                return res.send({ status: "error", data: "unauthorized" });
            }
        });



        //products
        app.post('/products', async (req, res) => {
            const products = req.body;
            const result = await productCollection.insertOne(products);
            res.send(result);
        })
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updaterecord = req.body;
            const update = {
                $set: updaterecord
            }
            const result = await productCollection.updateOne(filter, update, options);
            res.send(result);
        })
        app.get('/products', async (req, res) => {
            const products = await productCollection.find().toArray();
            res.send(products);
        });
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        app.get('/totalproducts', async (req, res) => {
            const products = await productCollection.estimatedDocumentCount();
            res.send({ totalproducts: totalproducts });
        });

        //carts
        app.post('/carts', async (req, res) => {
            const carts = req.body;
            const result = await cartsCollection.insertOne(carts);
            res.send(result);
        })
        app.put('/carts/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updaterecord = req.body;
            const update = {
                $set: updaterecord
            }
            const result = await cartsCollection.updateOne(filter, update, options);
            res.send(result);
        })
        app.get('/carts', async (req, res) => {
            const carts = await cartsCollection.find().toArray();
            res.send(carts);
        });
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.findOne(query);
            res.send(result);
        });



        // multiimage upload 


        app.post('/multiimguploadimgbb', upload.array('images', 10), async (req, res) => {
            try {
                const files = req.files;
                const imageUrls = [];

                for (const file of files) {
                    const blob = new Blob([file.buffer], { type: file.mimetype });

                    const formData = new FormData();
                    formData.append('image', blob, file.originalname);

                    const response = await fetch('https://api.imgbb.com/1/upload?key=f8da0af88fab3ff18c4c9ee179898914', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const imgbbUrl = data.data.url;
                        // console.log(imgbbUrl);
                        imageUrls.push(imgbbUrl);
                    } else {
                        console.error('Error uploading image to imgbb:', response.statusText);
                        res.status(response.status).send(response.statusText);
                        return;
                    }
                }
                console.log(imageUrls);
                res.send(imageUrls);

            } catch (error) {
                console.error('Error uploading image:', error);
                res.status(500).send(error);
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('AIST making server is running')
})

app.listen(port, () => {
    console.log(`AIST Server is running on port: ${port}`)
})