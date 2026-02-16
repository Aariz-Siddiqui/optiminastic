const mongoose = require("mongoose");
const ledgerSchema = new mongoose.Schema({
  clientId: String,
  type: String,
  amount: Number
}, { timestamps: true });

module.exports = mongoose.model("Ledger", ledgerSchema);
