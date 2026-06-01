# Portfolio Website

Ready-to-upload Node.js + Express portfolio.

## Deploy on Render

1. Upload this folder to GitHub.
2. On Render, create **New Web Service**.
3. Select your GitHub repo.
4. Use these settings:

- Build Command: `npm install`
- Start Command: `npm start`

5. Click Deploy.

## Local Run

```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Optional environment variables

The site works without these. Contact form data will be stored in `data/contacts.json` locally.

- `MONGODB_URI` for MongoDB storage
- `EMAIL_USER` and `EMAIL_PASSWORD` for email notifications
- `EMAIL_SERVICE` default is `gmail`
