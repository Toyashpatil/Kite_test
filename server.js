// server.js (or index.js)
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health
app.get('/', (req, res) => res.send('Hello World!'));

// Example public route (you had /zlogin)
app.get('/zlogin', (req, res) => {
  res.send('Hello World!');
});

/**
 * POST /get-access-token
 * Body JSON: { request_token: "xxx" }
 * Server computes checksum: sha256(api_key + request_token + api_secret)
 * Calls Kite API and returns their JSON response to the frontend.
 */
app.post('/get-access-token', async (req, res) => {
  try {
    const { request_token } = req.body;
    if (!request_token) return res.status(400).json({ error: 'request_token required' });

    // Read API key & secret from env
    const api_key = process.env.KITE_API_KEY;        // e.g. itw2n3rqalf8pgu7
    const api_secret = process.env.KITE_API_SECRET; // KEEP SECRET

    if (!api_key || !api_secret) {
      return res.status(500).json({ error: 'Server misconfiguration: API credentials missing' });
    }

    // compute checksum
    const checksum = crypto
      .createHash('sha256')
      .update(api_key + request_token + api_secret)
      .digest('hex');

    // prepare form body
    console.log(checksum)
    const params = new URLSearchParams({
      api_key,
      request_token,
      checksum
    }).toString();

    // POST to Kite
    const kiteResp = await axios.post('https://api.kite.trade/session/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // return Kite response (it typically includes access_token etc.)
    return res.status(kiteResp.status).json(kiteResp.data);

  } catch (err) {
    // axios error handling
    if (err.response) {
      // Kite returned non-2xx
      return res.status(err.response.status).json({
        error: 'Kite API error',
        details: err.response.data
      });
    }
    // other errors
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
