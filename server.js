
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');

// CONFIGURATION 
const ADMIN_USERNAME = 'admin';

const ADMIN_PASSWORD_HASH = '$2b$10$2cCiORERNjfsaXTcwpYwROMyorMbOb.kn46f.bKiWpPoMlqOmCcsW'; 
const activeSessions = {};

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'scheme_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected');
});


function authenticate(req, res, callback) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return sendUnauthorized(res, 'Authorization header missing');

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return sendUnauthorized(res, 'Invalid token format');

    const session = activeSessions[token];
    if (!session || session.expiry < Date.now()) {
        delete activeSessions[token]; 
        return sendUnauthorized(res, 'Token expired or invalid');
    }

    req.user = session.user; 
    callback();
}

function createToken(username) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry
    activeSessions[token] = { user: username, expiry };
    return token;
}

// HTTP SERVER
const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    
    if (pathname === '/' || pathname === '/home.html') {
        serveFile('home.html', 'text/html', res);
    } else if (pathname === '/index.html') {
        serveFile('index.html', 'text/html', res);
    } else if (pathname === '/style.css') {
        serveFile('style.css', 'text/css', res);
    } else if (pathname === '/apply.js') {
        serveFile('apply.js', 'application/javascript', res);
    }
    else if (pathname === '/api/schemes' && req.method === 'GET') {
        db.query('SELECT * FROM schemes', (err, results) => {
            sendJSON(res, err ? { error: err.message } : results);
        });
    }
    else if (pathname === '/api/apply' && req.method === 'POST') {
        collectBody(req, body => {
            const data = JSON.parse(body);
            const { scheme_id, name, email, phone } = data;
            if (!scheme_id || !name || !email || !phone) {
                 return sendJSON(res, { success: false, error: 'Missing required fields' }, 400);
            }
            db.query('INSERT INTO applications (scheme_id, name, email, phone) VALUES (?, ?, ?, ?)',
                [scheme_id, name, email, phone],
                (err, result) => {
                    sendJSON(res, err ? { success: false, error: err.message } : { success: true, id: result.insertId });
                }
            );
        });
    }
    else if (pathname.startsWith('/api/status/') && req.method === 'GET') {
        const id = pathname.split('/')[3]; 
        if (!id || isNaN(id)) return send404(res);
        db.query(`SELECT a.id, a.status, s.name AS scheme_name FROM applications a JOIN schemes s ON a.scheme_id = s.id WHERE a.id = ?`, [id], (err, results) => {
            if (err) return sendJSON(res, { error: err.message }, 500);
            if (results.length === 0) return sendJSON(res, { error: 'Application not found' }, 404);
            sendJSON(res, results[0]);
        });
    }

    //  API: Admin Login
    else if (pathname === '/api/login' && req.method === 'POST') {
        collectBody(req, async body => {
            let data;
            try {
                data = JSON.parse(body);
            } catch (e) {
                return sendJSON(res, { success: false, error: 'Invalid data format' }, 400);
            }
            const { username, password } = data;

            if (username === ADMIN_USERNAME) {
                try {
                    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
                    if (isMatch) {
                        const token = createToken(username);
                        return sendJSON(res, { success: true, token });
                    }
                } catch (error) {
                    return sendJSON(res, { success: false, error: 'Login Failed (Server Error)' }, 500);
                }
            }
            sendJSON(res, { success: false, error: 'Invalid credentials' }, 401);
        });
    }
    
    // API: Get All Applications (ADMIN) 
    else if (pathname === '/api/applications' && req.method === 'GET') {
        authenticate(req, res, () => {
             db.query(`SELECT a.*, s.name AS scheme_name FROM applications a JOIN schemes s ON a.scheme_id = s.id ORDER BY a.applied_at DESC`, (err, results) => {
                sendJSON(res, err ? { error: err.message } : results);
            });
        });
    }

    // API: Update Status (ADMIN) 
    else if (/^\/api\/application\/\d+$/.test(pathname) && req.method === 'PUT') {
        authenticate(req, res, () => {
            const id = pathname.split('/')[3]; 
            collectBody(req, body => {
                const { status } = JSON.parse(body);
                if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
                    return sendJSON(res, { success: false, error: 'Invalid status value' }, 400);
                }
                db.query('UPDATE applications SET status = ? WHERE id = ?', [status, id], err => {
                    sendJSON(res, { success: !err, error: err ? err.message : null });
                });
            });
        });
    }

    // PDF GENERATION
    else if (pathname.startsWith('/pdf/') && req.method === 'GET') {
        const id = pathname.split('/')[2];
        if (!id || isNaN(id)) return send404(res);
        db.query(`SELECT a.*, s.name AS scheme_name FROM applications a JOIN schemes s ON a.scheme_id = s.id WHERE a.id = ?`, [id], (err, results) => {
            if (err || results.length === 0) return send404(res);
            const app = results[0];
            res.writeHead(200, {'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=application_${id}.pdf`});
            const doc = new PDFDocument();
            doc.pipe(res);
            doc.fontSize(20).text('Government Scheme Application Receipt', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Application ID: ${app.id}`);
            doc.text(`Name: ${app.name}`);
            doc.text(`Email: ${app.email}`);
            doc.text(`Phone: ${app.phone}`);
            doc.text(`Scheme: ${app.scheme_name}`);
            doc.text(`Status: ${app.status}`);
            doc.text(`Applied On: ${new Date(app.applied_at).toLocaleString()}`);
            doc.moveDown();
            doc.fontSize(12).text('Retain this for your records.', { align: 'center' });
            doc.end();
        });
    }
    else {
        send404(res);
    }
});


function serveFile(file, type, res) {
    fs.readFile(file, (err, data) => {
        if (err) return send404(res);
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
    });
}

function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function send404(res) {
    res.writeHead(404);
    res.end('Not Found');
}

function sendUnauthorized(res, message) {
    res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' });
    res.end(JSON.stringify({ error: message || 'Unauthorized' }));
}

function collectBody(req, callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => callback(body));
}

server.listen(8000, () => console.log('Server running at http://localhost:8000'));
