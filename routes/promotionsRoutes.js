const express = require("express");
const { sql, poolPromise } = require("../config/dbConfig");
const router = express.Router();

// 📌 Pobieranie aktywnych promocji
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM Promotions WHERE expiresAt > GETDATE()
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("⛔ Błąd pobierania promocji:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Sprawdzanie kodu rabatowego
router.post("/validate", async (req, res) => {
    const { code, orderValue } = req.body;

    if (!code) {
        return res.status(400).json({ error: "❌ Podaj kod rabatowy!" });
    }

    try {
        const pool = await poolPromise;
        const promoQuery = await pool.request()
            .input("code", sql.NVarChar(50), code)
            .query("SELECT * FROM Promotions WHERE code = @code AND expiresAt > GETDATE()");

        if (promoQuery.recordset.length === 0) {
            return res.status(404).json({ error: "⛔ Kod rabatowy nie istnieje lub wygasł!" });
        }

        const promo = promoQuery.recordset[0];

        if (promo.minOrderValue && orderValue < promo.minOrderValue) {
            return res.status(400).json({ error: `❌ Minimalna wartość zamówienia to ${promo.minOrderValue} zł` });
        }

        res.json({ message: "✅ Kod poprawny!", discount: promo.discount, isPercentage: promo.isPercentage });
    } catch (err) {
        console.error("⛔ Błąd sprawdzania kodu rabatowego:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

module.exports = router;
