require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
};

// Define Schema
const recordSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // Keeping numeric ID for consistency
    name: { type: String, required: true },
    value: { type: String, required: true },
    created: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

const Record = mongoose.model('Record', recordSchema);

// --- Database Operations ---

async function addRecord({ name, value, created }) {
    // Generate a simple numeric ID (find max ID + 1)
    const lastRecord = await Record.findOne().sort({ id: -1 });
    const nextId = lastRecord ? lastRecord.id + 1 : 1;
    
    const newRecord = new Record({ id: nextId, name, value, created });
    await newRecord.save();
    return newRecord;
}

async function listRecords() {
    return await Record.find().sort({ id: 1 }); // Return all records sorted by ID
}

async function updateRecord(id, name, value) {
    const record = await Record.findOneAndUpdate(
        { id: id }, 
        { name, value }, 
        { new: true } // Return the updated document
    );
    return record !== null;
}

async function deleteRecord(id) {
    const result = await Record.findOneAndDelete({ id: id });
    return result !== null;
}

module.exports = { connectDB, addRecord, listRecords, updateRecord, deleteRecord };