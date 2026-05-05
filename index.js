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
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,  
}));

app.set('view engine', "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "public")));

// health check
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
// card — own card if no ?username, else look up that user
app.get("/card", requiresAuth(), async (req, res) => {
    const loggedInUser = req.oidc.user?.nickname;
    const username = req.query.username || loggedInUser;
    const isOwnCard = !req.query.username;

    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    };

    const buildQuery = (login) => ({
        query: `query {
            user(login: "${login}") {
                contributionsCollection {
                    contributionCalendar {
                        weeks {
                            contributionDays {
                                date
                                contributionCount
                            }
                        }
                    }
                }
                repositories(first: 100, ownerAffiliations: OWNER) {
                    nodes {
                        languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                            edges {
                                size
                                node { name }
                            }
                        }
                    }
                }
            }
        }`
    });

    const parseLangs = (repoNodes) => { // repoNodes -> repo -> languages -> edge -> node -> name
        const langCount = {};
        repoNodes.forEach(repo => {
            repo.languages.edges.forEach(edge => {
                const lang = edge.node.name;
                langCount[lang] = (langCount[lang] || 0) + edge.size;
            });
        });
        return Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
    };

    try {
        const [profileRes, repoData, graphQL] = await Promise.all([
            axios.get(`https://api.github.com/users/${username}`, { headers }),
            axios.get(`https://api.github.com/users/${username}/repos`, { headers }),
            axios.post("https://api.github.com/graphql", buildQuery(username), { headers }),
            

        ]);

        const { avatar_url, bio, login, name, followers, following } = profileRes.data;
        const starsCount = [];
        repoData.data.forEach((repo) => {
            starsCount.push(repo.stargazers_count);
        });
        const totalStars = starsCount.reduce((sum,stars) => sum + stars , 0);
        console.log(`STARS ${totalStars}`);
        const userData = graphQL.data.data.user;
        console.dir(userData.repositories.nodes,{depth : null});
        if (!userData) throw new Error("GitHub user not found");

        // top language 
        const topLangs = parseLangs(userData.repositories.nodes);
        // heatmap
        function getLevel(count) {
            if(count == 0) return "off";
            if(count >= 1 && count <= 2) return "dim";
            if(count >= 3 && count <= 5) return "mid";
            if(count >= 6) return "bright";
            return "off";

        }
        const weeks = userData.contributionsCollection.contributionCalendar.weeks;
        const coloredWeeks = weeks.map(week => ({ // weeks -> days -> date: count: level:
            days : week.contributionDays.map(day => ({
                date: day.date,
                count: day.contributionCount,
                level: getLevel(day.contributionCount)
            }))
        }));        
        
        res.render("card", {
            searchError: null,
            loggedInUser,
            isOwnCard,
            github: {
                login,
                name,
                avatar_url,
                bio,
                public_repo_count: profileRes.data.public_repos,
                followers,
                following,
                topLangs,
                totalStars
            },
            contributionStats: {
                weeks: coloredWeeks
            }
            
        });

    } catch (err) {
        console.error("GitHub API error:", err.message);
        
        console.log(err.response?.headers);
        if (isOwnCard) {
            res.redirect('/');
        } else {
            try {
                const [ownProfile, ownGraphQL] = await Promise.all([
                    axios.get(`https://api.github.com/users/${loggedInUser}`, { headers }),
                    axios.post("https://api.github.com/graphql", buildQuery(loggedInUser), { headers }),
                    
                ]);

                const { avatar_url, bio, login, name, followers, following } = ownProfile.data;
                const ownUserData = ownGraphQL.data.data.user;
                const topLangs = parseLangs(ownUserData.repositories.nodes);

                res.render("card", {
                    loggedInUser,
                    isOwnCard: true,
                    searchError: username,
                    github: { login, name, avatar_url, bio, public_repo_count: ownProfile.data.public_repos, followers, following, topLangs }
                });
            } catch (e) {
                res.redirect('/');
            }
        }
    }
});
// shareable card / card visible to un-logged in users too

    app.listen(port, () => {
        console.log(`DevPrint running on port ${port}`);
    });