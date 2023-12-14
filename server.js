const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

// PostgreSQL database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gaushalakqr',
  password: 'abc',
  port: 5432,
});

app.use(cors());

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// Endpoint to handle POST requests
app.post('/donate', async (req, res) => {
  try {
    console.log('Request received for /donate');
    const { name, phone_num, email, address, product, type, amount, datetime, pan_number,units } = req.body;
    console.log(datetime)

    // Insert data into the PostgreSQL database
    const result = await pool.query(
      'INSERT INTO donators (name, phone_num, email, address, product, type, amount, datetime, pan_number,units) VALUES ($1, $2, $3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, phone_num, email, address, product, type, amount, datetime, pan_number,units]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/donationCategories', async (req, res) => {
    try {
        console.log('Request received for /donationCategories');
      // Query to retrieve data from the "donation_products" table
      const query = 'SELECT * FROM donation_products';
  
      const result = await pool.query(query);
  
      // Format the result into the specified JSON format
      const donationCategories = formatDonationCategories(result.rows);
  
      // Send the formatted data as JSON response
      res.json({ donationCategories });
    } catch (error) {
      console.error('Error retrieving data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Function to format donation categories and products
  function formatDonationCategories(products) {
    const categoriesMap = new Map();
  
    // Group products by category
    products.forEach((product) => {
      if (!categoriesMap.has(product.type)) {
        categoriesMap.set(product.type, []);
      }
  
      categoriesMap.get(product.type).push({
        nameEnglish: product.name_in_english,
        nameHindi: product.name_in_hindi,
        costPerUnit: product.cost,
      });
    });
  
    // Format the grouped data into the specified JSON format
    const donationCategories = Array.from(categoriesMap.entries()).map(([category, donations]) => ({
      categoryName: category,
      donations,
    }));
  
    return donationCategories;
  }

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
