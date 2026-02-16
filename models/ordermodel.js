const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  clientId: String,
  amount: Number,
  status: String,
  fulfillmentId: String
});

module.exports = mongoose.model("Order", orderSchema);
