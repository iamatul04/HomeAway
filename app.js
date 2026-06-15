require("dotenv").config();
const express = require("express");

const app = express();

const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require ("path");
const methodOverride =require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema} = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user.js");
const { isLoggedIn, isOwner } = require("./middleware");

const MONGO_URL = process.env.ATLASDB_URL;
main().then(() =>{
    console.log("Connected to DB");
}).catch(err =>{
    console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
}

app.set("view engine","ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended: true}));

const sessionOptions = {
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true,
    },
};

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.currUser = req.user;
    next();
});

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

//demo user
app.get("/demouser",async (req,res)=>{
    let fakeuser = new User({
        email:"Student@gmail.com",
        username:"atulnirmal",
    });

    let registerUser = await User.register(fakeuser, "Helloworld");
    res.send(registeredUser);
});

//Index Route
app.get("/listings",async(req,res) =>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs",{allListings});
    });
    
//NEw Route
//NEw Route
app.get("/listings/new", isLoggedIn, (req,res)=>{
    res.render("listings/new.ejs");
});

//signup
app.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

//login
app.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);

        req.session.destroy((err) => {
            if (err) return next(err);

            res.clearCookie("connect.sid");
            res.redirect("/login");
        });
    });
});
//login post route 
app.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
    }),
    (req, res) => {
        console.log(req.user);
        res.redirect("/listings");
    }
);

app.post("/signup", async (req, res) => {
    try {
        let { username, password } = req.body;

        const newUser = new User({ username });

        const registeredUser = await User.register(
            newUser,
            password
        );

        console.log(registeredUser);

        res.redirect("/listings");
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
});

// Search Route
app.get("/listings/search", async (req, res) => {
    let { q } = req.query;

    const allListings = await Listing.find({
        title: {
            $regex: q,
            $options: "i"
        }
    });

    if (allListings.length === 0) {
        const listings = await Listing.find({});
        return res.render("listings/index.ejs", {
            allListings: listings
        });
    }

    res.render("listings/index.ejs", { allListings });
});


// Show Route 
app.get("/listings/:id", async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate("reviews");

    res.render("listings/show.ejs", { listing });
});

//delete route 
// Delete Listing Route
app.delete("/listings/:id", async (req, res) => {
    let { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");
});


//Create route
app.post("/listings", isLoggedIn, wrapAsync(async (req, res, next) => {
    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;

    await newListing.save();

    res.redirect("/listings");
}));
//Edit route
app.get("/listings/:id/edit", isLoggedIn, isOwner, async(req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs",{listing});

});

//update route
app.put("/listings/:id", isLoggedIn, isOwner, async(req,res)=>{
     let {id} = req.params;
     await Listing.findByIdAndUpdate(id,{...req.body.listing});
     res.redirect(`/listings/${id}`);
});

// delete route
app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
    let { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");
});

//revviews

//post route 

app.post("/listings/:id/reviews", async (req, res) => {

    let listing = await Listing.findById(req.params.id);

    let newReview = new Review(req.body.review);

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
});

// app.get("/testListing", async(req,res) =>{
//     let sampleListing = new Listing({
//         title: "Atul Villa",
//         description:"By the beach",
//         price:6000,
//         location:"Alibaug",
//         country:"India",
//     });
//     await sampleListing.save();
//     console.log("Sample was saved");
//     res.send("Successfull");
// });


app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.get("/test", (req, res) => {
    res.send(req.isAuthenticated().toString());
});

app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;

    res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080 ,() =>{
    console.log("port is listening in 8080");
});
