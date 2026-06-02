// Backend Server using Node.js and Express.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage: use MongoDB only if MONGODB_URI is set; otherwise use a JSON file (no MongoDB needed)
const useMongoDB = !!process.env.MONGODB_URI;
const CONTACTS_FILE = path.join(__dirname, 'data', 'contacts.json');

// Middleware – allow frontend from localhost/127.0.0.1 on any port (Live Server often uses 127.0.0.1:5500)
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // same-origin or tools like Postman
        if (allowedOrigins.some(o => origin === o)) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        callback(null, false);
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- File storage (used when MongoDB is not configured) -----
function ensureDataDir() {
    const dir = path.dirname(CONTACTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function readContactsFromFile() {
    ensureDataDir();
    if (!fs.existsSync(CONTACTS_FILE)) return [];
    try {
        const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}
function appendContactToFile(entry) {
    ensureDataDir();
    const contacts = readContactsFromFile();
    const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    const record = { _id: id, ...entry, createdAt: new Date().toISOString() };
    contacts.unshift(record);
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf8');
    return record;
}

// MongoDB Connection (only when MONGODB_URI is set)
if (useMongoDB) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch((err) => {
            console.error('❌ MongoDB connection failed:', err.message || err);
            console.error('   → Check MONGODB_URI in .env or remove it to use file storage (no MongoDB).');
        });
}

// MongoDB Schema for Contact Form
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    type: {
        type: String,
        enum: ['contact', 'hire', 'talk'],
        default: 'contact'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model('Contact', contactSchema);

// Nodemailer – only configure when credentials exist (server runs without email)
const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
const transporter = hasEmailConfig
    ? nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    : null;

if (hasEmailConfig) {
    transporter.verify((error, success) => {
        if (error) console.error('❌ Email configuration error:', error.message);
        else console.log('✅ Email server is ready to send messages');
    });
}

// Function to send email notification (no-op if email not configured)
async function sendEmailNotification(formData) {
    if (!transporter) return false;

    const emailType = formData.type === 'hire' ? 'Hire Me Request' : 
                     formData.type === 'talk' ? 'Let\'s Talk Request' : 
                     'Contact Form Submission';

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to yourself
        subject: `Portfolio: ${emailType} from ${formData.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #64ffda;">New ${emailType}</h2>
                <div style="background-color: #112240; padding: 20px; border-radius: 10px; color: #ffffff;">
                    <p><strong>Name:</strong> ${formData.name}</p>
                    <p><strong>Email:</strong> ${formData.email}</p>
                    <p><strong>Type:</strong> ${emailType}</p>
                    <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
                    <hr style="border-color: #233554; margin: 20px 0;">
                    <p><strong>Message:</strong></p>
                    <p style="background-color: #0a192f; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${formData.message}</p>
                </div>
                <p style="margin-top: 20px; color: #8892b0; font-size: 12px;">
                    This is an automated email from your portfolio website.
                </p>
            </div>
        `,
        replyTo: formData.email
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email notification sent for ${emailType}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
}

// Validation rules
const contactValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('message')
        .trim()
        .notEmpty().withMessage('Message is required')
        .isLength({ min: 3, max: 1000 }).withMessage('Message must be between 3 and 1000 characters'),
    body('type')
        .optional()
        .isIn(['contact', 'hire', 'talk']).withMessage('Invalid form type')
];

// API Routes

// Root – open portfolio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Old filename support
app.get('/portfolio.html', (req, res) => {
    res.redirect(301, '/');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Contact form endpoint
app.post('/api/contact', contactValidation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, message, type } = req.body;
        const formType = type || 'contact';

        let savedContact;

        if (useMongoDB && mongoose.connection.readyState === 1) {
            // Save to MongoDB
            const newContact = new Contact({ name, email, message, type: formType });
            savedContact = await newContact.save();
            console.log('✅ Contact saved to MongoDB:', savedContact._id);
        } else if (!useMongoDB) {
            // Save to JSON file (no MongoDB)
            savedContact = appendContactToFile({ name, email, message, type: formType });
            console.log('✅ Contact saved to file:', savedContact._id);
        } else {
            return res.status(503).json({
                success: false,
                message: 'Database is not available. Please try again later.'
            });
        }

        // Send email notification (optional)
        await sendEmailNotification({ name, email, message, type: formType });

        res.status(200).json({
            success: true,
            message: 'Thank you for your message! I will get back to you soon.',
            data: {
                id: savedContact._id,
                type: savedContact.type || formType
            }
        });

    } catch (error) {
        console.error('❌ Error processing contact form:', error);
        
        // Handle duplicate email or other database errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'This email has already been used. Please use a different email.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get all contacts (optional - for admin panel)
app.get('/api/contacts', async (req, res) => {
    try {
        if (useMongoDB && mongoose.connection.readyState === 1) {
            const contacts = await Contact.find().sort({ createdAt: -1 });
            return res.json({ success: true, count: contacts.length, data: contacts });
        }
        const contacts = readContactsFromFile();
        res.json({ success: true, count: contacts.length, data: contacts });
    } catch (error) {
        console.error('❌ Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts'
        });
    }
});

// Serve portfolio files (HTML, CSS, JS, image)
app.use(express.static(__dirname));

// 404 handler (after static so only unknown paths hit this)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server (handle port already in use)
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`🚀 Server is running on http://localhost:${port}`);
        console.log(`📧 Email notifications: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
        if (useMongoDB) {
            console.log(`🗄️  Storage: MongoDB (MONGODB_URI)`);
        } else {
            console.log(`🗄️  Storage: file (data/contacts.json) — no MongoDB needed`);
        }
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is already in use. Either:`);
            console.error(`   • Stop the other process using port ${port}, or`);
            console.error(`   • Set PORT=${port + 1} (or another port) in .env and run again.`);
            console.error(`   On Windows, find process: netstat -ano | findstr :${port}`);
            process.exit(1);
        }
        throw err;
    });
}

// On Vercel, export the Express app as a serverless function.
// Locally, still run with npm start.
if (process.env.VERCEL) {
    module.exports = app;
} else {
    startServer(PORT);
}

