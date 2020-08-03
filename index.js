const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
const port = process.env.PORT || 3000;
const productRoutes = require("./api/routes/product");
const orderRoutes = require("./api/routes/order");
const cartRoutes = require("./api/routes/cart");
const signUpRoutes = require("./api/routes/signUp");
const loginRoutes = require("./api/routes/login");
const apiErrorHandler = require("./api/error-handler/apiErrorHandler");
const apiError = require("./api/error-handler/apiErrors");

mongoose.connect(
  `mongodb+srv://<username>:${process.env.MONGO_DB_PASSWORD}@cluster0.z5kcq.mongodb.net/shop?retryWrites=true&w=majority`,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("connected to db");
  }
);
app.all("*", (req, res, next) => {
  // CORS headers
  //use * to allow all or can set http://localhost:3000 for testing
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Key, Authorization"
  );
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/product", productRoutes);
app.use("/order", orderRoutes);
app.use("/cart", cartRoutes);
app.use("/signup", signUpRoutes);
app.use("/login", loginRoutes);

app.use((req, res, next) => {
  next(apiError.notFound("Route not Found"));
});

app.use(apiErrorHandler);

app.listen(port, () => {
  console.log(`server started on =  http://localhost:${port}`);
});
