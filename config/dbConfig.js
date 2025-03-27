const sql = require("mssql/msnodesqlv8");

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    driver: "msnodesqlv8",
    options: { trustedConnection: true }
};

// Tworzenie połączenia
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log(" Połączono z MSSQL");
        return pool;
    })
    .catch(err => {
        console.error(" Błąd połączenia z MSSQL:", err);
        process.exit(1);
    });

module.exports = { sql, poolPromise };
