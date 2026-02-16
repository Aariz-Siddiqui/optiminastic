const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const clientId = req.headers["client-id"];
    const { amount } = req.body;

    const wallet = await Wallet.findOne({ clientId }).session(session);

    if (!wallet || wallet.balance < amount)
      throw new Error("Insufficient Balance");

    wallet.balance -= amount;
    await wallet.save({ session });

    const order = await Order.create([{
      clientId,
      amount,
      status: "pending"
    }], { session });

    // -------- FETCH CALL --------
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/posts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: clientId,
          title: order[0]._id.toString()
        })
      }
    );

    const data = await response.json();

    order[0].fulfillmentId = data.id;
    order[0].status = "fulfilled";
    await order[0].save({ session });

    await Ledger.create([{
      clientId,
      type: "order",
      amount
    }], { session });

    await session.commitTransaction();
    res.json(order[0]);

  } catch (err) {
    await session.abortTransaction();
    res.status(400).send(err.message);
  } finally {
    session.endSession();
  }
});

// ---------------- GET ORDER ----------------
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
