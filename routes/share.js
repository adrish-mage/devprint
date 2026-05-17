const express = require('express');
const router = express.Router();
const { fetchGitHubData } = require('../services/github');

router.get("/u/:username", async (req, res) => {
    const loggedInUser = req.oidc.user?.nickname;
    try {
        const data = await fetchGitHubData(req.params.username);
        res.render("share-card", { 
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
        res.redirect('/');
    }
});

module.exports = router;