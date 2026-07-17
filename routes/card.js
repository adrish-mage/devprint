const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');
const { getGithubData } = require('../services/github');
const Profile = require("../models/profile")

router.get("/card", requiresAuth(), async (req, res) => {
    const loggedInUser = req.oidc.user?.nickname;
    const username = req.query.username || loggedInUser;
    try {
        const doc = await getGithubData(username);
        const data = doc.stats;
        console.log(data);
        res.render("card", {
            searchError: null,
            loggedInUser,
            isOwnCard: !req.query.username,
            github: {
                login: data.login,
                name: data.name,
                avatar_url: data.avatar_url,
                bio: data.bio,
                public_repo_count: data.public_repo_count,
                followers: data.followers,
                following: data.following,
                topLangs: data.topLangs,
                totalStars: data.totalStars
            },
            contributionStats: { weeks: data.coloredWeeks },
            nickname: loggedInUser
        });
    } catch (err) {
        console.error('Card route error:', err.message);
        res.status(500).send(err.message);

    }
});

router.post("/card/refresh", requiresAuth(), async(req,res) => {
    const username = req.oidc.user?.nickname;
    try{
        await Profile.deleteOne({username});
        await getGithubData(username);
    }catch(err) {
        console.error("Refresh Error",err.message);
    }
    res.redirect(`/card`);    

})
module.exports = router;