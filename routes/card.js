const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');
const { getGithubData } = require('../services/github');

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

module.exports = router;