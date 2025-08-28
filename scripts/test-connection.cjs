#!/usr/bin/env node

// Simple test script to verify Jira connection
const https = require('https');

// Load environment variables
require('dotenv').config();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

console.log('Testing Jira Connection...');
console.log('========================');
console.log(`Base URL: ${JIRA_BASE_URL}`);
console.log(`Email: ${JIRA_EMAIL}`);
console.log(`Token: ***${JIRA_API_TOKEN?.slice(-4) || 'MISSING'}`);
console.log('========================\n');

// Parse URL
const url = new URL(`${JIRA_BASE_URL}/rest/api/3/myself`);

// Create auth string (Basic auth)
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'GET',
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

console.log(`Making request to: ${url.toString()}`);

const req = https.request(options, (res) => {
  console.log(`\nResponse Status: ${res.statusCode}`);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('\n✅ SUCCESS! Connection working!');
        console.log('========================');
        console.log('User Details:');
        console.log(`- Display Name: ${json.displayName}`);
        console.log(`- Email: ${json.emailAddress}`);
        console.log(`- Account ID: ${json.accountId}`);
        console.log(`- Active: ${json.active}`);
        console.log('========================');

        if (json.emailAddress !== JIRA_EMAIL) {
          console.log('\n⚠️  WARNING: Email mismatch!');
          console.log(`- .env email: ${JIRA_EMAIL}`);
          console.log(`- Jira email: ${json.emailAddress}`);
          console.log('\nYou should update JIRA_EMAIL in your .env file to: ' + json.emailAddress);
        }
      } else {
        console.log('\n❌ FAILED! Authentication error');
        console.log('Response:', json);

        if (res.statusCode === 401) {
          console.log('\nPossible issues:');
          console.log('1. Wrong email address (check if it matches your Jira account)');
          console.log('2. Invalid or expired API token');
          console.log('3. Token needs to be regenerated');
        }
      }
    } catch (e) {
      console.log('Response body:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Network Error: ${e.message}`);
});

req.end();
