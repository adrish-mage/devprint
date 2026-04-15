const express = require("express");
const path = require("path");
const axios = require("axios");
const {auth, requiresAuth} = require("express-openid-connect");
const { profile } = require("console");
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


// home-page

app.get("/",(req,res) => {
    const authInfo = req.oidc;
    if (authInfo.isAuthenticated()){
        res.redirect('/search');
    }else{
        res.render('home')
    }
})

//search-github-page

app.get("/search",requiresAuth(),(req,res)=>{
    res.render('search', {error : null});
})

// card-display-page

// recieve the username
app.get("/card",requiresAuth(),(req,res)=>{
    const username = req.query.username;
    const profileURL = `https://api.github.com/users/${username}`;
    const repoURL = `https://api.github.com/users/${username}/repos`;
    
    async function getUser(){
        try{
            const info = await axios.get(profileURL);
            console.log(info.data.login);
        }catch(err){
            console.log(err.message);
            console.log("error!!!");
        }
    }
    getUser();
    res.send("check terminal for json");
    console.log(req.query);
})
// shortlist the top languages
// display info