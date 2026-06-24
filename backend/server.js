require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🎯 Verified Base URL
const ORACLE_API_BASE = "https://oracleapex.com/ords/healthcare_groupq/api/";

// Common Headers to bypass Oracle 403 Security Block
const oracleHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

app.get('/', (req, res) => {
    res.send('Backend is running smoothly!');
});

// GET Patients
app.get('/api/patients', async (req, res) => {
    try {
        console.log("🎯 Fetching directly from Oracle Cloud with custom headers...");
        const response = await fetch(`${ORACLE_API_BASE}patient`, {
            method: 'GET',
            headers: oracleHeaders
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Data retrieved successfully!");
            res.json(data.items || data);
        } else {
            console.error(`❌ Oracle GET Error Status: ${response.status}`);
            res.status(response.status).json({ error: 'Failed to fetch data' });
        }
    } catch (error) {
        console.error('System Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST Patient
app.post('/api/patients', async (req, res) => {
    try {
        const body = req.body;
        const cleanDob = body.DOB || body.dob ? (body.DOB || body.dob).split('T')[0] : null;

        const oraclePayload = {
            PATIENTID: parseInt(body.PATIENTID || body.patientid),
            NIC: body.NIC || body.nic,
            NAME: body.NAME || body.name,
            GENDER: body.GENDER || body.gender,
            DOB: cleanDob,
            CONTACTNO: body.CONTACTNO || body.contactno
        };

        const response = await fetch(`${ORACLE_API_BASE}patient`, {
            method: 'POST',
            headers: oracleHeaders,
            body: JSON.stringify(oraclePayload)
        });

        if (response.ok) {
            res.status(201).json({ success: true });
        } else {
            const errText = await response.text();
            res.status(response.status).json({ success: false, error: errText });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE Route: Route delete request as a POST with an ACTION header parameter
app.delete('/api/patients/:id', async (req, res) => {
    try {
        const patientId = req.params.id;
        console.log(`🗑️ Routing delete request for Patient ID: ${patientId} via POST with ACTION header`);

        // Construct headers containing the action descriptor for Oracle PL/SQL routing
        const customPostHeaders = {
            ...oracleHeaders,
            'ACTION': 'DELETE' // Sent as an HTTP Header to match Oracle Parameter configuration
        };

        // Construct the standard insert payload body structure (Oracle expects these bind variables to exist)
        const dummyPayload = {
            PATIENTID: parseInt(patientId),
            NIC: '',
            NAME: '',
            GENDER: 'Male',
            DOB: null,
            CONTACTNO: ''
        };

        // Trigger the request using the fully operational POST endpoint
        const response = await fetch(`${ORACLE_API_BASE}patient`, { 
            method: 'POST',
            headers: customPostHeaders,
            body: JSON.stringify(dummyPayload)
        });

        if (response.ok) {
            console.log("✅ Patient deleted successfully from Oracle Cloud using POST Header configuration!");
            res.json({ success: true });
        } else {
            const errStatus = response.status;
            console.error(`❌ POST Header Delete routing failed with status code: ${errStatus}`);
            res.status(errStatus).json({ success: false });
        }
    } catch (error) {
        console.error('System Error during POST header delete routing:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 🩺 DOCTOR ROUTES (Linked to Oracle Cloud)
// ==========================================

// GET Route: Fetch all doctor records from Oracle DB
app.get('/api/doctors', async (req, res) => {
    try {
        console.log("🩺 Fetching doctors from Oracle Cloud...");
        const response = await fetch(`${ORACLE_API_BASE}doctor`, {
            method: 'GET',
            headers: oracleHeaders
        });

        if (response.ok) {
            const data = await response.json();
            // Oracle REST returns records inside the 'items' array
            res.json(data.items || []);
        } else {
            console.error(`❌ Oracle Fetch Doctors Failed: ${response.status}`);
            res.status(response.status).json({ error: 'Failed to fetch doctors data' });
        }
    } catch (error) {
        console.error('System Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST Route: Add a brand new doctor record into Oracle DB
app.post('/api/doctors', async (req, res) => {
    try {
        const body = req.body;
        console.log(`➕ Forwarding new doctor data to Oracle: ${body.NAME}`);

        // Construct payload matching Oracle bind variables
        const doctorPayload = {
            DOCTORID: parseInt(body.DOCTORID),
            NAME: body.NAME,
            SPECIALIZATION: body.SPECIALIZATION,
            CONTACTNO: body.CONTACTNO
        };

        const response = await fetch(`${ORACLE_API_BASE}doctor`, {
            method: 'POST',
            headers: oracleHeaders,
            body: JSON.stringify(doctorPayload)
        });

        if (response.ok) {
            console.log("✅ Doctor record added successfully to Oracle Cloud!");
            res.json({ success: true });
        } else {
            console.error(`❌ Oracle Add Doctor Failed Status: ${response.status}`);
            res.status(response.status).json({ success: false });
        }
    } catch (error) {
        console.error('System Error adding doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 💊 MEDICINE ROUTES (Linked to Oracle Cloud)
// ==========================================

// GET Route: Fetch all medicine stock records from Oracle DB
app.get('/api/medicines', async (req, res) => {
    try {
        console.log("💊 Fetching medicine inventory from Oracle Cloud...");
        const response = await fetch(`${ORACLE_API_BASE}medicine`, {
            method: 'GET',
            headers: oracleHeaders
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data.items || []);
        } else {
            console.error(`❌ Oracle Fetch Medicines Failed: ${response.status}`);
            res.status(response.status).json({ error: 'Failed to fetch medicines data' });
        }
    } catch (error) {
        console.error('System Error fetching medicines:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST Route: Add a brand new medicine record into Oracle DB inventory
app.post('/api/medicines', async (req, res) => {
    try {
        const body = req.body;
        console.log(`➕ Forwarding new medicine to Oracle: ${body.MEDICINENAME}`);

        // Construct payload matching Oracle bind variables
        const medicinePayload = {
            MEDICINEID: parseInt(body.MEDICINEID),
            MEDICINENAME: body.MEDICINENAME,
            QUANTITYINSTOCK: parseInt(body.QUANTITYINSTOCK),
            UNITPRICE: parseFloat(body.UNITPRICE),
            EXPIRYDATE: body.EXPIRYDATE // Expected format: YYYY-MM-DD
        };

        const response = await fetch(`${ORACLE_API_BASE}medicine`, {
            method: 'POST',
            headers: oracleHeaders,
            body: JSON.stringify(medicinePayload)
        });

        if (response.ok) {
            console.log("✅ Medicine stock record added successfully to Oracle Cloud!");
            res.json({ success: true });
        } else {
            console.error(`❌ Oracle Add Medicine Failed Status: ${response.status}`);
            res.status(response.status).json({ success: false });
        }
    } catch (error) {
        console.error('System Error adding medicine:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 📅 APPOINTMENT ROUTES (Linked to Oracle Cloud)
// ==========================================

// GET Route: Fetch all scheduled appointments from Oracle DB
app.get('/api/appointments', async (req, res) => {
    try {
        console.log("📅 Fetching appointments from Oracle Cloud...");
        const response = await fetch(`${ORACLE_API_BASE}appointment`, {
            method: 'GET',
            headers: oracleHeaders
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data.items || []);
        } else {
            console.error(`❌ Oracle Fetch Appointments Failed: ${response.status}`);
            res.status(response.status).json({ error: 'Failed to fetch appointments data' });
        }
    } catch (error) {
        console.error('System Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST Route: Book a brand new patient appointment into Oracle DB
app.post('/api/appointments', async (req, res) => {
    try {
        const body = req.body;
        console.log(`➕ Booking new appointment ID: ${body.APPID} for Patient: ${body.PATIENTID}`);

        // Construct payload matching Oracle bind variables
        const appPayload = {
            APPID: parseInt(body.APPID),
            PATIENTID: parseInt(body.PATIENTID),
            DOCTORID: parseInt(body.DOCTORID),
            WARDID: parseInt(body.WARDID),
            APPDATE: body.APPDATE, // Expected format: YYYY-MM-DD
            APPTIME: body.APPTIME
        };

        const response = await fetch(`${ORACLE_API_BASE}appointment`, {
            method: 'POST',
            headers: oracleHeaders,
            body: JSON.stringify(appPayload)
        });

        if (response.ok) {
            console.log("✅ Appointment scheduled successfully in Oracle Cloud!");
            res.json({ success: true });
        } else {
            console.error(`❌ Oracle Booking Failed Status: ${response.status}`);
            res.status(response.status).json({ success: false });
        }
    } catch (error) {
        console.error('System Error adding appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// 💳 BILLING ROUTES (Linked to Oracle Cloud)
// ==========================================

// GET Route: Fetch all billing records with calculated 10% tax from Oracle DB
app.get('/api/billings', async (req, res) => {
    try {
        console.log("💳 Fetching billing reports from Oracle Cloud...");
        const response = await fetch(`${ORACLE_API_BASE}billing`, {
            method: 'GET',
            headers: oracleHeaders
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data.items || []);
        } else {
            console.error(`❌ Oracle Fetch Billings Failed: ${response.status}`);
            res.status(response.status).json({ error: 'Failed to fetch billing data' });
        }
    } catch (error) {
        console.error('System Error fetching billings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST Route: Issue a brand new patient bill invoice into Oracle DB
app.post('/api/billings', async (req, res) => {
    try {
        const body = req.body;
        console.log(`➕ Issuing new bill ID: ${body.BILLID} for Prescription: ${body.PRESCRIPTIONID}`);

        // Construct payload matching Oracle bind variables
        const billingPayload = {
            BILLID: parseInt(body.BILLID),
            PRESCRIPTIONID: parseInt(body.PRESCRIPTIONID),
            TOTALAMOUNT: parseFloat(body.TOTALAMOUNT),
            BILLDATE: body.BILLDATE // Expected format: YYYY-MM-DD
        };

        const response = await fetch(`${ORACLE_API_BASE}billing`, {
            method: 'POST',
            headers: oracleHeaders,
            body: JSON.stringify(billingPayload)
        });

        if (response.ok) {
            console.log("✅ Billing invoice successfully synced to Oracle Cloud!");
            res.json({ success: true });
        } else {
            console.error(`❌ Oracle Billing Failed Status: ${response.status}`);
            res.status(response.status).json({ success: false });
        }
    } catch (error) {
        console.error('System Error adding bill record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT Patient
app.put('/api/patients/:id', async (req, res) => {
    try {
        const body = req.body;
        const cleanDob = body.DOB || body.dob ? (body.DOB || body.dob).split('T')[0] : null;

        const oraclePayload = {
            NIC: body.NIC || body.nic,
            NAME: body.NAME || body.name,
            GENDER: body.GENDER || body.gender,
            DOB: cleanDob,
            CONTACTNO: body.CONTACTNO || body.contactno
        };

        const response = await fetch(`${ORACLE_API_BASE}patient/${req.params.id}`, {
            method: 'PUT',
            headers: oracleHeaders,
            body: JSON.stringify(oraclePayload)
        });

        if (response.ok) res.json({ success: true });
        else res.status(response.status).json({ success: false });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Cloud Backend running on port ${PORT}`);
});