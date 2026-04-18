const express = require("express");
const path = require("path");
const axios = require("axios");
const {auth, requiresAuth} = require("express-openid-connect");
const { profile } = require("console");
require("dotenv").config();
const port = process.env.PORT || 3000;
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

app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
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
            let avatar = info.data.avatar_url;
            let bio = info.data.bio;
            let public_repo_count = info.data.public_repos;
            let followers = info.data.followers;
            let following = info.data.following;

            const repoInfo = await axios.get(repoURL);
            const repos = repoInfo.data;
            const langCount = {};

            for (repo of repos){
                let lang = repo.language;

                if(lang){
                    if(langCount[lang]){
                        langCount[lang]++;
                    }else{
                        langCount[lang] = 1;
                    }
                }
            }
            
            const topLangs = Object.entries(langCount).sort((a,b) => b[1]-a[1]).slice(0,3);
            topLangs.forEach(([lang, count]) => {
                console.log(`${lang}: ${count}`)
            });
            res.render("card", {
                google: req.oidc.user,
                github: {
                    avatar,
                    bio,
                    public_repo_count,
                    followers,
                    following,
                    topLangs
                }
            });
            console.log(topLangs);

        }catch(err){
            res.render('search', { error: "User Not Found" });
            console.log(err.message);
            console.log("error!!!");
        }
    }
    getUser();
      
    
})
// shortlist the top languages
// display info