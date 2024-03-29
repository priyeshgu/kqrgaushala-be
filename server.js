const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const { google } = require('googleapis');const app = express();
const port = 3001;
const nodemailer = require('nodemailer');
const multer = require('multer');
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// PostgreSQL database connection configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY,
  key_secret: process.env.RZP_SECRET,
});

app.use(cors());

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// Endpoint to handle POST requests
app.post('/donate', async (req, res) => {
  try {
    console.log('Request received for /donate');
    const { name, phone_num, email, address, product, type, amount, datetime, pan_number,units,order_id } = req.body;

    // Insert data into the PostgreSQL database
    const result = await pool.query(
      'INSERT INTO donators (name, phone_num, email, address, product, type, amount, datetime, pan_number,units,order_id) VALUES ($1, $2, $3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [name, phone_num, email, address, product, type, amount, datetime, pan_number,units,order_id]
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
      const query = 'SELECT * FROM donation_products ORDER BY id ASC';
  
      const result = await pool.query(query);

      const typeParam = req.query.type;

      if (typeParam && typeParam === 'categories') {
  
      // Format the result into the specified JSON format
      const donationCategories = formatDonationCategories(result.rows);
  
      // Send the formatted data as JSON response
      res.json({ donationCategories });
      }
      else if (typeParam && typeParam === 'products'){
        return_result=result['rows']
        res.json({ return_result });
      }
      else{
        res.json({ message: 'Invalid request type' });
      }
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
    const query = 'SELECT * FROM donators ORDER BY id ASC';
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
app.post('/addProduct', async (req, res) => {
  try {
    console.log('Request received for /addproduct');
    const { name_in_english,name_in_hindi,type,cost } = req.body;

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

app.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount provided' });
  }

  const options = {
    amount: amount * 100, // Convert amount to paise
    currency: 'INR',
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({  order, razorpayKey: process.env.RZP_KEY });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/emailentry', async (req, res) => {
  try {
    const { email } = req.body;

    // Insert the email and current datetime into the newsletter table
    const result = await pool.query(
      'INSERT INTO newsletter (email, created_at) VALUES ($1, $2) RETURNING *',
      [email, new Date()]
    );

    console.log('Inserted into newsletter table:', result.rows[0]);

    // Send a success response to the client
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling email entry:', error);

    // Send an error response to the client
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URL);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Function to send email
const sendEmail = async (toEmail, subject, message,filename,pdf) => {
  const accessToken = await oAuth2Client.getAccessToken();
  oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: 'kqrgaushala@gmail.com', // Your Gmail address
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  const mailOptions = {
    from: 'kqrgaushala@gmail.com',
    to: toEmail,
    subject: subject,
    text: message,
    attachments: [{
      filename: filename,
      content: pdf,
      encoding: 'base64'
    }]
  };

  await transporter.sendMail(mailOptions);
};

// Endpoint to send email
app.post('/send-email', upload.single('pdf'), async (req, res) => {
  const { to, subject, message,filename } = req.body;
  const pdfFile = req.file;

  try {
    await sendEmail(to, subject, message,filename,pdfFile.buffer);
    console.log('Request received for /send-email');
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});
const AWS = require('aws-sdk');

const {
  Translate,
} = require('@aws-sdk/client-translate');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const translate = new Translate({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY,
  },

  region: process.env.AWS_REGION,
});

app.post('/translate', async (req, res) => {
  try {
    const { webpageContent } = req.body;
    // Call AWS Translate API to translate the website content
    const translationParams = {
      SourceLanguageCode: 'en', // English
      TargetLanguageCode: 'hi', // Hindi
      Text: webpageContent  // Replace with your website content
      // Add any additional parameters as needed
    };

    const translationData = await translate.translateText(translationParams);
    res.json(translationData); // Return translated data to frontend
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to translate website' });
  }
});
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});