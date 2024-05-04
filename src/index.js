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
let cors = require("cors");

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);

const bodyParser = require('body-parser');
const Schema = mongoose.Schema
const dotenv = require("dotenv");
const { error } = require("console");
dotenv.config()

app.use(cors({
    origin: [process.env.origin1, process.env.origin2,process.env.origin3],  // it was '*' process.env.origin1, process.env.origin2,process.env.origin3
}));

app.use(express.json());



//Database connection
mongoose.connect(process.env.Mongoose);

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
    const loginUrl = `${process.env.BASE_URL}/images/${req.file.filename}`;
    res.json({
        success:1,
        image_url:loginUrl
    })
})

//Stripe endpoint

app.post('/create-checkout-session', async (req, res) => {
    const shippingFees = {
        "Belgium": {
          "3": 10,
          "10": 12,
        },
        "Canada": {
          "3kg": 15,
          "10kg": 30,
        },
        // other countries...
      };
      
      const fee = shippingFees[req.body.country][req.body.Totalweight];  // or "10kg", depending on the weight
      console.log(fee)
      
    const line_items = req.body.productWithQuantityArray.map(item =>{
        return{
            price_data: {
                currency: 'eur',
                product_data: {
                  name: item.name,
                  images: [item.image],
                  description: item.description,
                },
                unit_amount: item.new_price * 100,
              },
              quantity: item.quantity,
        }
    })
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
    shipping_address_collection: {
      allowed_countries: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
      "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
      "RO", "SK", "SI", "ES", "SE", "GB", "IS", "NO", "LI", "CH", "US", "CA"],
    },
    shipping_options: [
      //{
      //  shipping_rate_data: {
      //    type: "fixed_amount",
      //    fixed_amount: {
      //      amount: 0,
      //      currency: "eur",
      //    },
      //    display_name: "Free shipping",
          // Delivers between 5-7 business days
      //    delivery_estimate: {
      //      minimum: {
      //        unit: "business_day",
      //        value: 5,
      //      },
      //      maximum: {
      //        unit: "business_day",
       //       value: 7,
       //     },
       //   },
       // },
      //},
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 1500,
            currency: "eur",
          },
          display_name: "Next day air",
          // Delivers in exactly 1 business day
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 1,
            },
            maximum: {
              unit: "business_day",
              value: 1,
            },
          },    
        },
      },
    ],
    phone_number_collection: {
      enabled: true,
    },
        line_items,
        mode: 'payment',
        
        success_url: `${process.env.BASE_URL}/payment`,
        cancel_url: `${process.env.BASE_URL}/cart`,
      });
      res.send({url:session.url});
  });

const transporter = nodemailer.createTransport({
    service: process.env.SERVICE,
    host:"smtp.gmail.com",
    port:process.env.EMAIL_PORT,
    secure:false, 
    auth: {
      user: process.env.USER,
      pass: process.env.gmailpass,
    }
  });
app.post('/log-value', (req, res) => {
    const mailOptions = {
        from: {
            name:'Eucway',
            address: process.env.USER
        },
        to: req.body.to,
        subject: req.body.subject,
        text:req.body.text,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        
        res.status(200).send("Email sent successfully");
     });
   
    console.log('Received value:', req.body.to);
    //res.status(200).json({ message: 'Value logged successfully'  });
  });

  app.post('/usercontact', (req, res) => {
    const mailOptions = {
        from: {
            name:'Eucway',
            address: process.env.USER
        },
        to: req.body.to,
        subject: req.body.subject,
        text:req.body.text,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        
        //res.status(200).send("Email");
     });
   
    console.log('Received value:', req.body.to);
    //res.status(200).json({ message: 'Value logged successfully'  });
  });


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
        required:false,
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

    stringimage:{
        type:String,
        required:true,
    },

    weight:{
        type:Number,
        required:false,
    }    
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
    LoggedIn:{
        type:Boolean,
        default:false,
    },
    lastSubmission: {
        type: Date
    }
})

app.post('/signupCheck',async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false, errors:"existing user found with this email address"})
    }
    else{
        return res.status(200).json({success:true})
    }
})

app.post('/findcontact', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});

    if(user){
        if (user.lastSubmission) {
            const timeElapsed = new Date().getTime() - user.lastSubmission.getTime();

            // if less than 24 hours have passed
            if (timeElapsed < 24 * 60 * 60 * 1000) {
                return res.status(400).json({success:false})
            }
          }
          user.lastSubmission = new Date();
            await user.save();
            return res.status(200).json({success:true})
    }
    else{
        return res.status(400).json({success:false})
    }
})
app.post('/promocheck', async (req,res)=>{
    
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
        LoggedIn:!check,  
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
app.post('/logout', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        user.LoggedIn = false
    }
    res.send("Logged Out")
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
            user.LoggedIn = true;
            res.json({success:true,token});
        }
        else{
            res.json({success:false, errors:"Wrong Password or Email"}) //wrong password
        }
    }
    else{
        res.json({success:false,errors: "Wrong Password or Email"}); //wrong email
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
   
}

//endpoint for stripe

//endpoint for cartdata
app.post('/addtocart',fetchUser, async (req,res) =>{
    console.log("added", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send(userData)
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




//http://localhost:${port}/images/${req.file.filename}