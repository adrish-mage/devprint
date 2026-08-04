const express = require("express");
const path = require("path");
const { auth } = require("express-openid-connect"); 
const Profile = require("./models/profile");
const Counter = require("./models/counter");
require("dotenv").config();
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const app = express();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
app.engine('ejs', require('ejs-mate'));
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

app.get("/stats", async (req, res) => {
    const totalCards = (await Counter.findOne({_id:"global"}))?.totalCards || 0;
    const uniqueDevelopers = await Profile.countDocuments();
    res.json({ totalCards, uniqueDevelopers });
});


app.use((req, res, next) => {
    next(new HttpError(404, "Page not found."));
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const status = err.status || err.statusCode || 500;
    console.error(`Error ${status} on ${req.method} ${req.originalUrl}:`, err.stack || err.message);

    res.status(status).render("error", {
        title: status === 404 ? "Page not found" : "Something went wrong",
        message: err.message || "Unexpected server error.",
        status,
        backUrl: "/",
        retryUrl: req.method === "GET" ? req.originalUrl : undefined,
        details: process.env.NODE_ENV !== "production" ? err.stack : null
    });
});

app.listen(port, () => {
    console.log(`DevPrint running on port ${port}`);
});