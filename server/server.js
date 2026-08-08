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
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1); // required for secure cookies to work behind Render's proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || "salesforce-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Vercel (frontend) and Render (backend) are different domains, so the
      // session cookie must be sameSite:"none" + secure:true to be sent on
      // cross-site fetch requests. Locally, both run on http://localhost, so
      // we fall back to lax/insecure there instead.
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
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