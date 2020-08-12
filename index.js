const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
const port = process.env.PORT || 3000;
const productRoutes = require("./api/routes/product");
const feedbackRoutes = require("./api/routes/feedback");
const orderRoutes = require("./api/routes/order");
const cartRoutes = require("./api/routes/cart");
const signUpRoutes = require("./api/routes/signUp");
const loginRoutes = require("./api/routes/login");
const userRoutes = require("./api/routes/user");
const apiErrorHandler = require("./api/error-handler/apiErrorHandler");
const apiError = require("./api/error-handler/apiErrors");

mongoose.connect(
  `${process.env.MONGO_URI}`,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("connected to db");
  }
);
mongoose.set("useFindAndModify", false);
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
app.use("/product/feedback", feedbackRoutes);
app.use("/order", orderRoutes);
app.use("/cart", cartRoutes);
app.use("/auth/account/signup", signUpRoutes);
app.use("/auth/account/login", loginRoutes);
app.use("/user", userRoutes);

app.use((req, res, next) => {
  next(apiError.notFound("Route not Found"));
});

app.use(apiErrorHandler);

app.listen(port, () => {
  console.log(`server started on =  http://localhost:${port}`);
});
