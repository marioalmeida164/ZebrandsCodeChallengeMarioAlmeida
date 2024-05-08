const express = require("express");
const admin = require("firebase-admin");
const ejs = require("ejs");
var path = require("path");
const app = express();
const nodemailer = require('nodemailer');

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: ""
});

let transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider
    auth: {
        user: 'marioalmeida164@gmail.com',
        pass: 'notActualPassword'
    }
});

const db = admin.firestore();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
//#region Login
    app.get("/", function(req,res){
        res.render("login");
    });

    app.post("/api/login", async (req, res) => {
        const user = {
            mail: req.body.email,
            pwd: req.body.password
        }
        if (!user.mail || !user.pwd) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }
        console.log("Request Body:", JSON.stringify({ user}));
        try {
            const data = await readData("users");
            data.forEach(doc =>{
                if(doc.email == user.mail && doc.password == user.pwd)
                {
                    if(doc.isAdmin){
                       return res.redirect("/Users")
                    }
                    else{
                        return res.redirect("/GuestProducts")
                    }
                }
            });     
        } catch (error) {
          console.error("Error logging in:", error);
          res.status(500).json({ success: false, message: "Server error" });
        }
    });
//#endregion
//#region User Routes
    //#region read users function
        app.get("/Users", async (req,res) => {
            const data = await readData("users");
            res.render("user/indexUser", {data});
        });

        async function readData(collectionName) {
            const snapshot = await db.collection(collectionName).get();
            const data = [];
            snapshot.forEach(doc =>{
                data.push({id: doc.id, ... doc.data() });
            });
            return data;
        }
    //#endregion
    //#region add users function
        app.get("/addUser", async (req,res) => {
            res.render("user/addUser");
        });

        app.post("/addUser", async (req,res) => {
            const data = req.body;
            const newDocId = createData("users", data);
            res.redirect("/Users"); 
        });

        async function createData(collectionName, data) {
            const docRef = db.collection(collectionName).doc();
            await docRef.set(data);
        }
    //#endregion
    //#region update/edit users function
        app.get("/editUser/:id", async (req,res) => {
            const { id } = req.params;
            const doc = await readSingleData("users", id);
            res.render("user/editUser", { doc });
        });

        async function readSingleData(collectionName, docId) {
            const docRef = db.collection(collectionName).doc(docId);
            const doc = await docRef.get();
            if(!doc.exists){
                throw new Error("Document Not Found");
            }
            return { id: doc.id, ...doc.data() };
        }

        app.post("/updateUser/:id", async (req,res) =>{
            const { id } = req.params;
            const dataToUpdate = {
                Name: req.body.Name,
                email: req.body.email,
                isAdmin: req.body.isAdmin,
                password: req.body.password
            }
            await updateData("users", id, dataToUpdate);
            res.redirect("/Users");
        });

        async function updateData(collectionName, docId, data) {
            const docRef = db.collection(collectionName).doc(docId);
            await docRef.update(data);
        }
    //#endregion
    //#region delete users function
        app.get("/deleteUser/:id", async (req,res) => {
            const {id} = req.params;
            await deleteData("users",id);
            res.redirect("user/indexUser");
        });

        async function deleteData(collectionName, docId) {
            const docRef = db.collection(collectionName).doc(docId);
            await docRef.delete();
        }
    //#endregion
//#endregion end Users

//#region Product Routes
    //#region read products function
    app.get("/Products", async (req,res) => {
        const data = await readData("products");
        res.render("products/indexProduct", {data});
    });

    app.get("/GuestProducts", async (req,res) => {
        const data = await readData("products");
        res.render("products/guestProduct", {data});
    });

    async function readData(collectionName) {
        const snapshot = await db.collection(collectionName).get();
        const data = [];
        snapshot.forEach(doc =>{
            data.push({id: doc.id, ... doc.data() });
        });
        return data;
    }
    //#endregion
    //#region add products function
        app.get("/addProduct", async (req,res) => {
            res.render("products/addProduct");
        });

        app.post("/addProduct", async (req,res) => {
            const data = req.body;
            const newDocId = createData("products", data);
            res.redirect("/Products"); 
        });

        async function createData(collectionName, data) {
            const docRef = db.collection(collectionName).doc();
            await docRef.set(data);
        }
    //#endregion
    //#region update/edit products function
        app.get("/editProduct/:id", async (req,res) => {
            const { id } = req.params;
            const doc = await readSingleData("products", id);
            res.render("products/editProduct", { doc });
        });

        async function readSingleData(collectionName, docId) {
            const docRef = db.collection(collectionName).doc(docId);
            const doc = await docRef.get();
            if(!doc.exists){
                throw new Error("Document Not Found");
            }
            //logic to keep track of queries
            return { id: doc.id, ...doc.data() };
        }

        app.post("/updateProduct/:id", async (req,res) =>{
            const { id } = req.params;
            const dataToUpdate = {
                name: req.body.name,
                description: req.body.description,
                brand: req.body.brand,
                sku: req.body.sku,
                price: req.body.price
            }
            await updateData("products", id, dataToUpdate);
            const data = await readData("users");
            data.forEach(doc =>{
                if(doc.isAdmin){
                    let mailOptions = {
                        from: 'marioalmeida164@gmail.com',
                        to: doc.email,
                        subject: `Update in product ${doc.Name}`,
                        text: `This is an automated email due to an update to the product ${doc.Name}`
                    }; 
                    transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                }
            });     
            res.redirect("/Products");
        });

        async function updateData(collectionName, docId, data) {
            const docRef = db.collection(collectionName).doc(docId);
            await docRef.update(data);
        }
    //#endregion 
    //#region delete products function
        app.get("/deleteProduct/:id", async (req,res) => {
            const {id} = req.params;
            await deleteData("products",id);
            res.redirect("/Products");
        });

        async function deleteData(collectionName, docId) {
            const docRef = db.collection(collectionName).doc(docId);
            await docRef.delete();
        }
    //#endregion
//#endregion

//start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>{
    console.log(`Server is running on port ${PORT}`);
});