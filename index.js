const express = require("express");
const path = require("path");
const {auth, requiresAuth} = require("express-openid-connect");
require("dotenv").config();
const port = 3000;
const app = express();

app.use(auth({
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL
}))

app.set('view engine', "ejs");
app.set("views", path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname,"public")));

app.listen(port,()=>{
    console.log(`app is listening on ${port}`);
})


// homepage

app.get("/",(req,res) => {
    const authInfo = req.oidc;
    if (authInfo.isAuthenticated()){
        res.redirect('/search');
    }else{
        res.render("home")
    }
})