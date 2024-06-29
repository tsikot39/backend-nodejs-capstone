const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { ObjectId } = require('mongodb');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.error('oops something went wrong', e);
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('image'), async(req, res,next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        let secondChanceItem = req.body;
        secondChanceItem.image = req.file ? req.file.path : null;

        const lastItemQuery = await collection.find().sort({ 'id': -1 }).limit(1);
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString();
        });

        const date_added = Math.floor(new Date().getTime() / 1000);
        secondChanceItem.date_added = date_added;

        const result = await collection.insertOne(secondChanceItem);
        res.status(201).json(result.ops[0]);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const itemId = req.params.id;
        const secondChanceItem = await collection.findOne({ _id: new ObjectId(itemId) });

        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found");
        }

        res.json(secondChanceItem);
    } catch (e) {
        next(e);
    }
}); 

// Update an existing item
router.put('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        const itemId = req.params.id;
        const secondChanceItem = await collection.findOne({ _id: new ObjectId(itemId) });

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        secondChanceItem.category = req.body.category;
        secondChanceItem.condition = req.body.condition;
        secondChanceItem.age_days = req.body.age_days;
        secondChanceItem.description = req.body.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1));
        secondChanceItem.updatedAt = new Date();

        const updateReloveItem = await collection.findOneAndUpdate(
            { _id: new ObjectId(itemId) },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );

        if (updateReloveItem) {
            res.json({ uploaded: "success" });
        } else {
            res.json({ uploaded: "failed" });
        }
    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
        // Task 1: Retrieve the database connection
        const db = await connectToDatabase();

        // Task 2: Retrieve the collection
        const collection = db.collection("secondChanceItems");

        // Task 3: Find a specific secondChanceItem by ID
        const itemId = req.params.id;
        const secondChanceItem = await collection.findOne({ _id: new ObjectId(itemId) });

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        // Task 4: Delete the object and send an appropriate message
        await collection.deleteOne({ _id: new ObjectId(itemId) });
        res.json({ deleted: "success" });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
