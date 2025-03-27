const express = require("express");
const { sql, poolPromise } = require("../config/dbConfig");
const router = express.Router();

router.post("/:categoryId/products", async (req, res) => {
    const { categoryId } = req.params;
    const { productId } = req.body;

    if (!categoryId || !productId) {
        return res.status(400).json({ error: "❌ Brak ID kategorii lub produktu!" });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input("categoryId", sql.Int, categoryId)
            .input("productId", sql.Int, productId)
            .query("UPDATE Products SET categoryId = @categoryId WHERE id = @productId");

        res.json({ message: "✅ Produkt przypisany do kategorii!" });
    } catch (err) {
        console.error("⛔ Błąd przypisywania produktu:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Categories");
        res.json(result.recordset);
    } catch (err) {
        console.error("⛔ Błąd pobierania kategorii:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Dodawanie nowej kategorii
router.post("/", async (req, res) => {
    const { name } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: "❌ Podaj nazwę kategorii!" });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input("name", sql.NVarChar(255), name)
            .query("INSERT INTO Categories (name) VALUES (@name)");

        res.status(201).json({ message: "✅ Kategoria dodana!" });
    } catch (err) {
        console.error("⛔ Błąd dodawania kategorii:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// Usuwanie kategorii 
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        // Sprawdzamy, czy kategoria jest przypisana do produktu
        const checkResult = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT COUNT(*) AS count FROM Products WHERE categoryId = @id");

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "⛔ Kategoria jest przypisana do produktów!" });
        }

        const result = await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Categories WHERE id = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "⛔ Kategoria nie istnieje!" });
        }

        res.json({ message: "✅ Kategoria usunięta!" });
    } catch (err) {
        console.error("⛔ Błąd usuwania kategorii:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Edytowanie kategorii
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "❌ Podaj nazwę kategorii!" });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("id", sql.Int, id)
            .input("name", sql.NVarChar(255), name)
            .query("UPDATE Categories SET name = @name WHERE id = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "⛔ Kategoria nie istnieje!" });
        }

        res.json({ message: "✅ Kategoria zaktualizowana!" });
    } catch (err) {
        console.error("⛔ Błąd edycji kategorii:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});
const fetchCategoryProducts = async (categoryId) => {
    try {
        const response = await fetch(`http://localhost:5000/categories/${categoryId}/products`);
        if (!response.ok) {
            throw new Error("Błąd pobierania produktów.");
        }
        const data = await response.json();

        // Logowanie danych do debugowania
        console.log("Produkty w kategorii:", data);

        setCategoryProducts(data);
    } catch (err) {
        console.error("⛔ Błąd pobierania produktów dla kategorii:", err);
        setCategoryProducts([]); // Reset w przypadku błędu
    }
};
module.exports = router;
