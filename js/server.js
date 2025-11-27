const express = require('express');
const mysql = require('mysql2/promise'); 
const path = require('path');

// Database Configuration
const dbConfig = {
    host: 'localhost',
    user: 'root', 
    password: 'root', 
    database: 'gdp_db', 
    port: 3306 
};

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.redirect('/html/index.html');
});

app.get('/html/index.html', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'html', 'index.html'));
});

app.use(express.json());

const staticOptions = {

};

app.use('/html', express.static(path.resolve(__dirname, '..', 'html'), staticOptions));
app.use('/css', express.static(path.resolve(__dirname, '..', 'css'), staticOptions));
app.use('/js', express.static(path.resolve(__dirname, '..', 'js'), staticOptions));

let pool; 
async function initializeDatabase() {
    try {
        // Create a connection pool
        pool = mysql.createPool(dbConfig);
        console.log('Successfully connected to MySQL pool.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS gdp_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                country VARCHAR(255) NOT NULL,
                year INT NOT NULL,
                gdp_value BIGINT NOT NULL,
                population BIGINT NOT NULL DEFAULT 0,
                gdp_per_capita DOUBLE NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                UNIQUE KEY unique_gdp (country, year)
            )
        `;
        await pool.query(createTableQuery);
        console.log('Database table "gdp_records" checked/created successfully.');
    } catch (error) {
        console.error('Failed to connect to MySQL or create table:', error);
        process.exit(1);
    }
}



// Add a new GDP record
app.post('/api/gdp', async (req, res) => {
    const { country, year, gdp_value, population, unit } = req.body;
    if (!country || !year || !gdp_value || !unit || !population) {
        return res.status(400).json({ message: 'Missing required fields: country, year, gdp_value, population, or unit.' });
    }

    try {
        const gdp_per_capita = gdp_value * 1000000000 / population;
        const query = 'INSERT INTO gdp_records (country, year, gdp_value, population, unit, gdp_per_capita) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(query, [country, year, gdp_value, population, unit, gdp_per_capita]);
        res.status(201).json({ id: result.insertId, message: 'GDP record created successfully' });
    } catch (error) {
        console.error('Error creating record:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A GDP record for this country and year already exists.' });
        }
        res.status(500).json({ message: 'Failed to create GDP record.' });
    }
});

//Get all GDP records
app.get('/api/gdp', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT id, country, year, gdp_value, population, unit, gdp_per_capita
          FROM gdp_records ORDER BY country, year DESC`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ message: 'Failed to fetch GDP records.' });
    }
});

// Update an existing GDP record
app.put('/api/gdp/:id', async (req, res) => {
    const id = req.params.id;
    const { country, year, gdp_value, population, unit } = req.body;

    if (!country || !year || !gdp_value || !unit || !population) {
        return res.status(400).json({ message: 'Missing required fields for update.' });
    }

    try {
        const gdp_per_capita = gdp_value * 1000000000 / population;
        const query = 'UPDATE gdp_records SET country = ?, year = ?, gdp_value = ?, population = ?, unit = ?, gdp_per_capita = ? WHERE id = ?';
        const [result] = await pool.query(query, [country, year, gdp_value, population, unit, gdp_per_capita, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'GDP record not found.' });
        }
        res.json({ message: 'GDP record updated successfully' });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ message: 'Failed to update GDP record.' });
    }
});

//Delete a GDP record
app.delete('/api/gdp/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await pool.query('DELETE FROM gdp_records WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'GDP record not found.' });
        }
        res.json({ message: 'GDP record deleted successfully' });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ message: 'Failed to delete GDP record.' });
    }
});


// Initialize the database and then start the Express server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`Open your browser to http://localhost:${PORT}/html/index.html`);
    });
}).catch(err => {
    console.error("Application failed to start due to database error.");
});