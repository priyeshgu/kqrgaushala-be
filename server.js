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

  // Endpoint to handle GET requests for fetching all records from the 'donators' table
app.get('/donators', async (req, res) => {
  try {
    console.log('Get Request received for /donators');
    // Query to retrieve all records from the 'donators' table
    const query = 'SELECT * FROM donators';
    const result = await pool.query(query);

    // Send the fetched records as JSON response
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error retrieving data:', error);
    // Handle error and send an error response
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Endpoint to add products
app.post('/addproduct', async (req, res) => {
  try {
    console.log('Request received for /addproduct');
    const { name_in_english,name_in_hindi,type,cost } = req.body;
    console.log(datetime)

    // Insert data into the PostgreSQL database
    const result = await pool.query(
      'INSERT INTO donation_products (name_in_english,name_in_hindi,type,cost) VALUES ($1, $2, $3,$4) RETURNING *',
      [name_in_english,name_in_hindi,type,cost]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error processing donation product:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Endpoint to handle updating donation products
app.post('/updateProduct', async (req, res) => {
  try {
    // Extracting data from the request body
    const { id,name_in_english, name_in_hindi, type, cost } = req.body;

    // Query to update the fields in the 'donation_products' table
    const query = `
      UPDATE donation_products
      SET name_in_english = $2, name_in_hindi = $3, type = $4, cost = $5
      WHERE id=$1;
    `;

    const result = await pool.query(query, [id,name_in_english, name_in_hindi, type, cost]);

    // Check if any rows were affected
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Send a success response
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (error) {
    console.error('Error updating donation product:', error);
    // Handle error and send an error response
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint to handle  deleting donation products
app.post('/deleteProduct', async (req, res) => {
  try {
    // Extracting data from the request body
    const { id, name_in_english, name_in_hindi, type, cost } = req.body;

    // Query to delete the fields in the 'donation_products' table
    const query = `
      DELETE FROM donation_products
      WHERE id = $1 AND name_in_english = $2 AND name_in_hindi = $3 AND type = $4 AND cost = $5;
    `;

    const result = await pool.query(query, [id, name_in_english, name_in_hindi, type, cost]);

    // Check if any rows were affected
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Send a success response
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting donation product:', error);
    // Handle error and send an error response
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});