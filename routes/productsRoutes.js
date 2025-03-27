const express = require("express");
const multer = require("multer");
const path = require("path");
const { sql, poolPromise } = require("../config/dbConfig");
const router = express.Router();

// 📌 Konfiguracja Multer dla przesyłania zdjęć
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // 📂 Zapis obrazów do folderu 'uploads'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unikalna nazwa pliku
    }
});
const upload = multer({ storage: storage });

// 📌 Pobieranie produktów (razem z kategoriami)
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.*, c.name AS categoryName 
            FROM Products p 
            LEFT JOIN Categories c ON p.categoryId = c.id
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("⛔ Błąd pobierania produktów:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Dodawanie nowego produktu (z opcjonalnym zdjęciem i kategorią)
router.post("/", upload.single("image"), async (req, res) => {
    const { name, description, price, stock, categoryId } = req.body;
    const imageUrl = req.file ? req.file.filename : null; // Jeśli przesłano plik, zapisujemy nazwę

    if (!name || !price || !stock) {
        return res.status(400).json({ error: "❌ Podaj nazwę, cenę i ilość!" });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input("name", sql.NVarChar(255), name)
            .input("description", sql.NVarChar(sql.MAX), description || "")
            .input("price", sql.Decimal(10, 2), price)
            .input("stock", sql.Int, stock)
            .input("imageUrl", sql.NVarChar(255), imageUrl) // Poprawiona nazwa kolumny
            .input("categoryId", sql.Int, categoryId || null)
            .query("INSERT INTO Products (name, description, price, stock, imageUrl, categoryId) VALUES (@name, @description, @price, @stock, @imageUrl, @categoryId)");

        res.status(201).json({ message: "✅ Produkt dodany!", imageUrl });
    } catch (err) {
        console.error("⛔ Błąd dodawania produktu:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Usuwanie produktu
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "❌ Brak ID produktu!" });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Products WHERE id = @id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "⛔ Produkt nie znaleziony!" });
        }

        res.json({ message: "✅ Produkt usunięty!" });
    } catch (err) {
        console.error("⛔ Błąd usuwania produktu:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// 📌 Edytowanie produktu (z możliwością zmiany zdjęcia i kategorii)
router.put("/:id", upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, categoryId } = req.body;
    const imageUrl = req.file ? req.file.filename : null; // Nowe zdjęcie, jeśli przesłano

    if (!id || !name || !price || stock === undefined) {
        return res.status(400).json({ error: "❌ Podaj ID, nazwę, cenę i ilość!" });
    }

    try {
        const pool = await poolPromise;
        const query = `
            UPDATE Products 
            SET name = @name, description = @description, price = @price, stock = @stock, categoryId = @categoryId
            ${imageUrl ? ", imageUrl = @imageUrl" : ""}
            WHERE id = @id
        `;

        const request = pool.request()
            .input("id", sql.Int, id)
            .input("name", sql.NVarChar(255), name)
            .input("description", sql.NVarChar(sql.MAX), description || "")
            .input("price", sql.Decimal(10, 2), price)
            .input("stock", sql.Int, stock)
            .input("categoryId", sql.Int, categoryId || null);
        
        if (imageUrl) request.input("imageUrl", sql.NVarChar(255), imageUrl);

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "⛔ Produkt nie znaleziony!" });
        }

        res.json({ message: "✅ Produkt zaktualizowany!", imageUrl });
    } catch (err) {
        console.error("⛔ Błąd edycji produktu:", err);
        res.status(500).json({ error: "⛔ Błąd serwera" });
    }
});

// Udostępnianie folderu `uploads/` dla zdjęć produktów
router.use("/images", express.static("uploads"));

module.exports = router;
