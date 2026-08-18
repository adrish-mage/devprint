const rateLimit = require("express-rate-limit");

const limitReachedMsg = {
    search: "Search limit reached. Take a breather — you can search again shortly.",
    profile: "Too many profile requests. Slow down a little — you can view profiles again shortly."
};

const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,

    handler: (req, res) => {
        res.status(429).render("error", {
            title: "Search limit reached",
            message: limitReachedMsg.search,
            status: 429,
            backUrl: "/",
            retryUrl: "/",
            details: null
        });
    }
});
const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,

    handler: (req, res) => {
        res.status(429).render("error", {
            title: "Too many profile requests",
            message: limitReachedMsg.profile,
            status: 429,
            backUrl: "/",
            retryUrl: req.originalUrl,
            details: null
        });
    }
});

module.exports = {
    searchLimiter,
    profileLimiter
};