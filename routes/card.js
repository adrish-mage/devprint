const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');
const { getGithubData } = require('../services/github');
const Profile = require("../models/profile")

function buildCardPayload({ data, loggedInUser, isOwnCard, searchError, nickname }) {
    return {
        searchError,
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
        nickname
    };
}

router.get("/card", requiresAuth(), async (req, res, next) => {
    const loggedInUser = req.oidc.user?.nickname;
    const username = req.query.username || loggedInUser;
    try {
        const doc = await getGithubData(username);
        res.render("card", buildCardPayload({
            data: doc.stats,
            loggedInUser,
            isOwnCard: !req.query.username,
            searchError: null,
            nickname: loggedInUser
        }));
    } catch (err) {
        console.error('Card route error:', err.stack || err.message);

        if (req.query.username && err.status === 404) {
            try {
                const ownDoc = await getGithubData(loggedInUser);
                return res.render("card", buildCardPayload({
                    data: ownDoc.stats,
                    loggedInUser,
                    isOwnCard: true,
                    searchError: `Couldn't find GitHub user "${req.query.username}"`,
                    nickname: loggedInUser
                }));
            } catch (innerErr) {
                console.error('Fallback to own card also failed:', innerErr.stack || innerErr.message);
                return next(innerErr);
            }
        }

        next(err);
    }
});

router.post("/card/refresh", requiresAuth(), async (req, res) => {
    const username = req.oidc.user?.nickname;
    try {
        await Profile.deleteOne({ username });
        await getGithubData(username);
    } catch (err) {
        console.error("Refresh Error", err.message);
    }
    res.redirect(`/card`);

})
module.exports = router;