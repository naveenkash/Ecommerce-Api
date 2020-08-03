const router = require("express").Router();
const Orders = require("../models/order");
const authenticateUser = require("../middlewares/authenticateUser");

router.get("/", authenticateUser, async (req, res) => {
  const body = req.body;
  const orders = await Orders.find({ user_id: body.user_id });
  if (orders.length > 0) {
    res.status(200).json({
      orders: [orders],
    });
  } else {
    res.status(404).json({
      message: "No items in cart",
    });
  }
});

module.exports = router;
