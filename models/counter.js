const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
     _id: {
        type: String,
        default: "global"
    },
    totalCards : {
        type: Number,
        default : 0
    }
});

const Counter = mongoose.model("Counter", CounterSchema);

module.exports = Counter;