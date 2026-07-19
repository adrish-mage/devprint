const axios = require("axios");
const Profile = require("../models/profile");
const Counter = require("../models/counter");

const buildQuery = (login) => ({
    query: `query($login: String!) {
        user(login: $login) {
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
    }`,
    variables: { login }
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
function getLevel(count) {
    if(count == 0) return "off";
    if(count >= 1 && count <= 2) return "dim";
    if(count >= 3 && count <= 5) return "mid";
    if(count >= 6) return "bright";
    return "off";

}

async function fetchGitHubData(username){
    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
    };
    const [profileRes, repoData, graphQL] = await Promise.all([
        axios.get(`https://api.github.com/users/${username}`, { headers }),
        // capped at 100 repos - covers effectively all users, avoids full pagination complexity
        axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers }),
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
    // console.dir(userData.repositories.nodes,{depth : null});
    if (!userData) throw new Error("GitHub user not found");

    // top language 
    const topLangs = parseLangs(userData.repositories.nodes);
    const weeks = userData.contributionsCollection.contributionCalendar.weeks;
    const coloredWeeks = weeks.map(week => ({ // weeks -> days -> date: count: level:
        days : week.contributionDays.map(day => ({
            date: day.date,
            count: day.contributionCount,
            level: getLevel(day.contributionCount)
        }))
    }));  
    // counter increment
    const updateCounter = async () => {
        try {
            await Counter.findOneAndUpdate({_id: "global"}, {$inc: {totalCards: 1}}, {upsert: true});
        } catch (err) {
            console.error("Counter update failed:", err);
        }
    }
    updateCounter();
    return {                                   
        login, name, avatar_url, bio,
        followers, following,
        public_repo_count: profileRes.data.public_repos,
        topLangs,
        totalStars,
        coloredWeeks,

    };
}
// cache - layer
async function getGithubData(username) {
    const cached = await Profile.findOne({username});
    const ONE_HOUR = 60 * 60 * 1000;
    const isFresh = cached && (Date.now() - cached.fetchedAt) < ONE_HOUR;
    
    if(isFresh){
        console.log(`Cache HIT for ${username}`);
        return cached;
    }
    console.log(`Cache MISS for ${username}, fetching from GitHub...`);
    const freshData = await fetchGitHubData(username);
    
    const updated = await Profile.findOneAndUpdate(
        {username},
        {$set : {stats: freshData, heatmapData: freshData.coloredWeeks,fetchedAt: Date.now()}},
        
        {
            new: true,
            upsert: true,
        }
    )
    return updated; 

}

module.exports = { getGithubData };