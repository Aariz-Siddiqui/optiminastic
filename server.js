const express = require("express");
const cors = require("cors");

const dbconnect = require("./DB/dbconfig");
const Wallet = require("./models/walletmodel");
const Ledger = require("./models/ledgermodel");
const Order = require("./models/ordermodel");

const app = express();
app.use(express.json());
app.use(cors());

// DB CONNECT
dbconnect();


// ---------------- ADMIN CREDIT ----------------
app.post("/admin/wallet/credit", async (req, res) => {
  try {
    const { client_id, amount } = req.body;

    const wallet = await Wallet.findOneAndUpdate(
      { clientId: client_id },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    );

    await Ledger.create({
      clientId: client_id,
      type: "credit",
      amount
    });

    res.json(wallet);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ---------------- ADMIN DEBIT ----------------
app.post("/admin/wallet/debit", async (req, res) => {
  try {
    const { client_id, amount } = req.body;

    const wallet = await Wallet.findOne({ clientId: client_id });

    if (!wallet || wallet.balance < amount)
      return res.status(400).send("Insufficient Balance");

    wallet.balance -= amount;
    await wallet.save();

    await Ledger.create({
      clientId: client_id,
      type: "debit",
      amount
    });

    res.json(wallet);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ---------------- CREATE ORDER ----------------
app.post("/orders", async (req, res) => {
  try {
    const clientId = req.headers["client-id"];
    const { amount } = req.body;

    // 1. Check Wallet
    const wallet = await Wallet.findOne({ clientId });

    if (!wallet || wallet.balance < amount)
      return res.status(400).send("Insufficient Balance");

    // 2. Deduct Wallet
    wallet.balance -= amount;
    await wallet.save();

    // 3. Create Order
    const order = await Order.create({
      clientId,
      amount,
      status: "pending"
    });

    // 4. Generate Fulfillment ID Locally
    order.fulfillmentId = Math.floor(Math.random() * 100000);
    order.status = "fulfilled";
    await order.save();

    // 5. Ledger Entry
    await Ledger.create({
      clientId,
      type: "order",
      amount
    });

    res.json(order);

  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ---------------- GET ORDER DETAILS ----------------
app.get("/orders/:id", async (req, res) => {
  try {
    const clientId = req.headers["client-id"];

    const order = await Order.findOne({
      _id: req.params.id,
      clientId
    });

    res.json(order);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ---------------- WALLET BALANCE ----------------
app.get("/wallet/balance", async (req, res) => {
  try {
    const clientId = req.headers["client-id"];
    const wallet = await Wallet.findOne({ clientId });

    res.json({ balance: wallet?.balance || 0 });
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// ---------------- SERVER ----------------
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
