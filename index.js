const express=require('express');
const bodyParser = require('body-parser');
require("dotenv").config();
const { btoa } = require('abab');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;
const PORT = process.env.PORT || 3000;
const crypto = require('crypto');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json());
const path = require("path");
app.use(express.static(path.join(__dirname)));
const session = require('express-session');
//configuring express-session
app.use(
  session({
    secret: 'iron_spidey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
  }


function generateCodeChallenge(codeVerifier) {
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace('+', '-')
      .replace('/', '_')
      .replace(/=+$/, '');
    return hash;
  }
  
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

app.get('/auth', (req, res) => {
    const authUrl = `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    res.redirect(authUrl);
  });

  app.get('/oauth/callback', async (req, res) => {
    const authorizationCode = req.query.code;
  
    try {
      const accessTokenData = await getAccessToken(authorizationCode);
      console.log('Access Token Data:', accessTokenData); 
      const accessToken = accessTokenData.access_token;
      const { baseURI, accountId } = await getUserBaseURI(accessToken);       
      req.session.accessToken = accessToken;
      req.session.accountId = accountId;
      req.session.baseURI = baseURI;
      // Redirecting the user to the frontend with the 'authenticated' query parameter
      res.redirect('/?authenticated=true');
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('An error occurred');
    }
  });
  
  
  app.post('/send-envelope', async (req, res) => {
    const { email, name, roleName } = req.body;
  
    const accessToken = req.session.accessToken;
    const accountId = req.session.accountId;
    const baseURI = req.session.baseURI;

    try {
      const envelopeResponse = await createAndSendEnvelope(baseURI, accountId, accessToken, {
        templateId: '9b1170c9-5bf5-4eaf-994a-aa1edf98ca6a',
        email,
        name,
        roleName,
      });
  
      console.log('Envelope Response:', envelopeResponse);
      res.send('Envelope sent successfully!');
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).send('An error occurred');

    }
    });  


  async function getAccessToken(authorizationCode) {
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=${REDIRECT_URI}&code_verifier=${codeVerifier}`,
    });
  
    if (!response.ok) {
        const errorDetails = await response.json();
    console.error('Error Details:', errorDetails);
      throw new Error(`Request failed with status code ${response.status}`);
    }
  
    return await response.json();
  }

  async function getUserBaseURI(accessToken) {
    const response = await fetch('https://account-d.docusign.com/oauth/userinfo', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });
  
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
  
    const userInfo = await response.json();
    return {
        baseURI: userInfo.accounts[0].base_uri,
        accountId: userInfo.accounts[0].account_id,
      };  }
  
  

  async function createAndSendEnvelope(baseURI, accountId, accessToken, { templateId, email, name, roleName }) {
    const response = await fetch(`${baseURI}/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId,
        emailSubject: 'Sent from a Template',
        templateRoles: [
          {
            email,
            name,
            roleName,
            routingOrder: '1',
          },
        ],
        status: 'sent',
      }),
    });
  
    if (!response.ok) {
        const errorDetails = await response.json();
        console.error('Error Details:', errorDetails);
      throw new Error(`Request failed with status code ${response.status}`);
    }
  
    return await response.json();
  }

  
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });