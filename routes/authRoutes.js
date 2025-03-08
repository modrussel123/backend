const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt.config');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/signup', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password,
      course,
      height,
      weight,
      gender,
      age,
      phoneNumber 
    } = req.body;

    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.com$/)) {
      return res.status(400).json({ 
        message: 'Invalid email format. Must end with .com' 
      });
    }

    // Check if all required fields are present
    const requiredFields = [
      'firstName', 
      'lastName', 
      'email', 
      'password',
      'course',
      'height',
      'weight',
      'gender',
      'age',
      'phoneNumber'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check for existing phone number
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create new user with all fields
    const user = new User({ 
      firstName, 
      lastName, 
      email, 
      password,
      course,
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
      age: parseInt(age),
      phoneNumber
    });

    await user.save();
    console.log(`✅ User signed up: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { userId: user._id, email: user.email }, 
        JWT_SECRET,
        { expiresIn: '3h' }
    );

    res.json({ 
        token, 
        user: { 
            id: user._id, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email 
        } 
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/signout', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required for signout' });
    console.log(`✅ User signed out successfully: ${email}`);
    res.json({ message: 'User signed out successfully' });
  } catch (error) {
    console.error('❌ Signout Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
