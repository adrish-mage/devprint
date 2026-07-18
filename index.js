const express = require("express");
const path = require("path");
const { auth } = require("express-openid-connect"); 
const Profile = require("./models/profile");
const Counter = require("./models/counter");
require("dotenv").config();
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const app = express();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully")
    })
    .catch((err) => {
        console.log("Error connecting to MongoDB", err);
    })


app.use(auth({
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,  
}));
app.set('view engine', "ejs");
app.set("views", path.join(__dirname, "/services/views"));
app.use(express.static(path.join(__dirname, "public")));

app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// home — redirect to card if logged in
app.get("/", (req, res) => {
    if (req.oidc.isAuthenticated()) {
        res.redirect('/card');
    } else {
        res.render('home',{ searchError: req.query.error || null });
    }
});
// card — own card if no ?username, else look up that user
app.use(require('./routes/card'));
// shareable card / card visible to un-logged in users too
app.use(require('./routes/share'));
app.listen(port, () => {
    console.log(`DevPrint running on port ${port}`);
});

app.get("/stats",async (req,res) => {
    const totalCards = (await Counter.findOne({_id:"global"})) ?.totalCards || 0 ;
    const uniqueDevelopers = await Profile.countDocuments();
    res.json({totalCards,uniqueDevelopers});
})