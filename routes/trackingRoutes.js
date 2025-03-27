const express = require("express");
const { sql, poolPromise } = require("../config/dbConfig");
const router = express.Router();

// Pobieranie wszystkich zamówień
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Orders ORDER BY orderDate DESC");
        res.json(result.recordset);
    } catch (err) {
        console.error("⛔ Błąd pobierania zamówień:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

//  Pobieranie szczegółów zamówienia
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const orderQuery = await pool.request().input("id", sql.Int, id).query("SELECT * FROM Orders WHERE id = @id");
        const itemsQuery = await pool.request().input("id", sql.Int, id).query("SELECT * FROM OrderItems WHERE orderId = @id");

        if (orderQuery.recordset.length === 0) {
            return res.status(404).json({ error: "⛔ Zamówienie nie istnieje" });
        }

        res.json({
            order: orderQuery.recordset[0],
            items: itemsQuery.recordset
        });
    } catch (err) {
        console.error("⛔ Błąd pobierania zamówienia:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// Składanie zamówienia
router.post("/", async (req, res) => {
    const { userId, firstName, lastName, email, phone, address, city, postalCode, products } = req.body;

    if (!userId || !firstName || !lastName || !email || !phone || !address || !city || !postalCode || !products || products.length === 0) {
        return res.status(400).json({ error: "❌ Brak wymaganych danych!" });
    }

    try {
        const pool = await poolPromise;
        const orderResult = await pool.request()
            .input("userId", sql.Int, userId)
            .input("firstName", sql.NVarChar(255), firstName)
            .input("lastName", sql.NVarChar(255), lastName)
            .input("email", sql.NVarChar(255), email)
            .input("phone", sql.NVarChar(50), phone)
            .input("address", sql.NVarChar(sql.MAX), address)
            .input("city", sql.NVarChar(100), city)
            .input("postalCode", sql.NVarChar(6), postalCode)
            .query(`
                INSERT INTO Orders (userId, firstName, lastName, email, phone, address, city, postalCode, orderDate, status) 
                OUTPUT INSERTED.id
                VALUES (@userId, @firstName, @lastName, @email, @phone, @address, @city, @postalCode, GETDATE(), 'pending')
            `);

        const orderId = orderResult.recordset[0].id;

        for (const product of products) {
            await pool.request()
                .input("orderId", sql.Int, orderId)
                .input("productId", sql.Int, product.productId)
                .input("quantity", sql.Int, product.quantity)
                .input("price", sql.Decimal(10, 2), product.price)
                .query("INSERT INTO OrderItems (orderId, productId, quantity, price) VALUES (@orderId, @productId, @quantity, @price)");
        }

        res.json({ message: "✅ Zamówienie złożone!", orderId });
    } catch (err) {
        console.error("⛔ Błąd składania zamówienia:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

module.exports = router;
