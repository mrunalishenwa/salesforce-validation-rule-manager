const express = require("express");
const router = express.Router();

const {
  getValidationRules,
  deployValidationRules,
} = require("../controllers/validationRuleController");

router.get("/validation-rules", getValidationRules);
router.patch("/validation-rules/deploy", deployValidationRules);

module.exports = router;
