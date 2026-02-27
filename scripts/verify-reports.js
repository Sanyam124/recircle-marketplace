const mongoose = require('mongoose');

// Need to match exactly what is in src/lib/db.js or the .env file.
const MONGODB_URI = "mongodb://localhost:27017/recircle";

// Minimal Report Schema string
const reportSchema = new mongoose.Schema({
    status: String,
    reason: String
}, { collection: 'reports' }); // force collection name

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

async function checkReports() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected. Counting Reports...");
        
        const count = await Report.countDocuments();
        const pendingCount = await Report.countDocuments({ status: "Pending" });
        const reviewedCount = await Report.countDocuments({ status: "Reviewed" });
        
        console.log(`TOTAL REPORTS IN DB: ${count}`);
        console.log(`- Pending: ${pendingCount}`);
        console.log(`- Reviewed: ${reviewedCount}`);
        
    } catch (err) {
        console.error("Database connection error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

checkReports();
