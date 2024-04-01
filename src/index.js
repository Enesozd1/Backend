//import env from "../env";
//const sendemail = require("../sendEmail/sendEmail")
const nodemailer = require("nodemailer");
const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require('cors');


const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_KEY)
const bodyParser = require('body-parser');
const Schema = mongoose.Schema
const dotenv = require("dotenv")
dotenv.config()

app.use(cors({
    origin: "https://eucway.com",
}))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://eucway.com');
    next();
  });
app.use(express.json());



//Database connection
mongoose.connect("mongodb+srv://eucway:t9O6PmartaYBzJFY@cluster0.rgcx0d6.mongodb.net/e-commerce");

// create API
app.get("/", (req,res)=>{
    res.send("Express App is Running")
})



// Image Storage Engine

const storage = multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})
const upload = multer({storage:storage})

//Create upload Endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload", upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://eucway.com/images/${req.file.filename}`
    })
})

//Schema for products

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})




app.post('/addproduct', async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;

    }
    else{
        id=1;
    } 
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        description:req.body.description,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Create API for deleting

app.post('/removeproduct', async (req,res) =>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Create api for getting all products
app.get('/allproducts', async (req,res) =>{
    let products = await Product.find({});
    console.log("All products Fetched");
    res.send(products);
})

// Scheme for user model
const Users = mongoose.model('Users', {
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    verified:{
        type:Boolean,
        default:false,
    }
    
})

//Endpoint for user registration
app.post('/signup',async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false, errors:"existing user found with this email address"})
    }
    let cart = {};
    for(let i=0; i<100; i++){
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})

    
})
//User login endpoint
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false, errors:"Wrong Password or email"}) //wrong password
        }
    }
    else{
        res.json({success:false,errors:"Wrong Password or email"}); //wrong email
    }
})

//endpoint for newcollection
app.get('/newcollections',async (req,res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("newcollection fetched");
    res.send(newcollection);
})

// creating middleware to fetch user
const fetchUser = async (req,res,next) => {
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenicate using valid token"})
    }
    
    else{
        try{
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        }
        catch (error){
            response.status(401).send({errors:"Please authenticate using a valid token"})
        }
    }
    await Users.updateOne({_id:user.id, verified:true});  //for to be removed
}

//endpoint for stripe
app.post('/create-checkout-session', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'T-shirt',
            },
            unit_amount: 2000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:4242/success',
      cancel_url: 'http://localhost:4242/cancel',
    });
  
    res.redirect(303, session.url);
  });






//endpoint for cartdata
app.post('/addtocart',fetchUser, async (req,res) =>{
    console.log("added", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

//endpoint for remove cartdata
app.post('/removefromcart',fetchUser, async (req,res)=>{
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//endpoint to retrieve cartdata on login
app.post('/getcart',fetchUser,async (req,res) =>{
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData);
})


app.listen(port,(error)=>{
    if(!error){
        console.log("Server Runnng on Port" + port)
        
    }
    else{
        console.log("Error: " +error)
    }

})

//endpoint for brevo

app.use(bodyParser.json()).post('/api/email', (req, res) => {
    const { email = '', msg = '' } = req.body; //We will use this later
  
    res.send('success');
    sendinblue(sendSmtpEmail)

});



//http://localhost:${port}/images/${req.file.filename}