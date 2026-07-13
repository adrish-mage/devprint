const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    stats: {
        type: Object
    },
    heatmapData: {
        type: Object
    },
    fetchedAt: {
        type: Date
    }
})
module.exports = mongoose.model('Profile', ProfileSchema);
