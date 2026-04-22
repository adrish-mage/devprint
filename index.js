const express = require("express");
const path = require("path");
const axios = require("axios");
const { auth, requiresAuth } = require("express-openid-connect");
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
}));

app.set('view engine', "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "public")));

// health check — ping this with UptimeRobot every 14 min to avoid cold starts
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
        res.render('home');
    }
});

// /search is dead — card page handles everything
app.get("/search", requiresAuth(), (req, res) => {
    res.redirect('/card');
});

// card — own card if no ?username, else look up that user
app.get("/card", requiresAuth(), async (req, res) => {
    const loggedInUser = req.oidc.user?.nickname;
    const username = req.query.username || loggedInUser;
    const isOwnCard = !req.query.username;

    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    };

    try {
        const [profileRes, repoRes] = await Promise.all([
            axios.get(`https://api.github.com/users/${username}`, { headers }),
            axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers })
        ]);

        const { avatar_url, bio, login, name, public_repos, followers, following } = profileRes.data;
        const repos = repoRes.data;

        // language frequency count
        const langCount = {};
        for (const repo of repos) {
            if (repo.language) {
                langCount[repo.language] = (langCount[repo.language] || 0) + 1;
            }
        }
        const topLangs = Object.entries(langCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        res.render("card", {
            searchError: null,
            loggedInUser,
            isOwnCard,
            github: {
                login,
                name,
                avatar_url,
                bio,
                public_repo_count: public_repos,
                followers,
                following,
                topLangs
            }
        });

    } catch (err) {
        console.error("GitHub API error:", err.message);
        if (isOwnCard) {
            res.redirect('/');
        } else {
            // re-render card with own card data + error message
            // fetch own card data so the page still renders correctly
            try {
                const [ownProfile, ownRepos] = await Promise.all([
                    axios.get(`https://api.github.com/users/${loggedInUser}`, { headers }),
                    axios.get(`https://api.github.com/users/${loggedInUser}/repos?per_page=100`, { headers })
                ]);
                const { avatar_url, bio, login, name, public_repos, followers, following } = ownProfile.data;
                const repos = ownRepos.data;
                const langCount = {};
                for (const repo of repos) {
                    if (repo.language) langCount[repo.language] = (langCount[repo.language] || 0) + 1;
                }
                const topLangs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
                res.render("card", {
                    loggedInUser,
                    isOwnCard: true,
                    searchError: username,
                    github: { login, name, avatar_url, bio, public_repo_count: public_repos, followers, following, topLangs }
                });
            } catch (e) {
                res.redirect('/');
            }
        }
    }
});

app.listen(port, () => {
    console.log(`DevPrint running on port ${port}`);
});