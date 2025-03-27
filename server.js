require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const productsRoutes = require("./routes/productsRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const promotionsRoutes = require("./routes/promotionsRoutes");
const categoriesRoutes = require("./routes/categoriesRoutes");

const app = express();

// 📌 Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend/build")));

//  Endpointy
//app.use("/users", usersRoutes);
app.use("/products", productsRoutes);
//app.use("/cart", cartRoutes);
app.use("/orders", ordersRoutes);
app.use("/tracking", trackingRoutes);
app.use("/promotions", promotionsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/categories", categoriesRoutes);


app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

//  Uruchomienie serwera
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Serwer działa na porcie ${PORT}`);
});
