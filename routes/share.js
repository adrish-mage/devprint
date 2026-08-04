const express = require('express');
const router = express.Router();
const { getGithubData } = require('../services/github');

router.get("/search",(req,res) => {
    const username = req.query.username?.trim();
    if(!username) {
        return res.redirect('/');
    }
    res.redirect(`/u/${encodeURIComponent(username)}`);
})
router.get("/u/:username", async (req, res, next) => {
    const viewerLoggedIn = req.oidc.isAuthenticated();
    const loggedInUser = viewerLoggedIn ? req.oidc.user?.nickname : null;
    const isOwnCard = viewerLoggedIn && loggedInUser?.toLowerCase() === req.params.username?.toLowerCase();

    try {
        const doc = await getGithubData(req.params.username);
        const data = doc.stats;
        res.render("share-card", {
            searchError: null,
            loggedInUser,
            isOwnCard,
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
            nickname: req.params.username
        });
    } catch (err) {
        console.error('Share route error:', err.stack || err.message);
        next(err);
    }
});

module.exports = router;