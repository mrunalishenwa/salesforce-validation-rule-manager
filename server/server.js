require("dotenv").config();

const session = require("express-session");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const validationRuleRoutes = require("./routes/validationRuleRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "salesforce-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Salesforce Backend is Running 🚀");
});

app.use("/", authRoutes);
app.use("/", validationRuleRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});