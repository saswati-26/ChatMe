import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../email/emailHandlers.js";
import { ENV } from "../lib/env.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;

    const sanitizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
    const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const sanitizedPassword = typeof password === 'string' ? password.trim() : '';

    try {
        if (!sanitizedFullName || !sanitizedEmail || !sanitizedPassword) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (sanitizedPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        // check if email is valid: regex    
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email: sanitizedEmail });
        if (user) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        // 123456 => $dnjasdkasj_?dmsakmk    
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(sanitizedPassword, salt);
        const newUser = new User({
            fullName: sanitizedFullName,
            email: sanitizedEmail,
            password: hashedPassword,
        });

        if (newUser) {
            // Persist user to database first
            const savedUser = await newUser.save();
            // Then generate JWT token (auth cookie)
            generateToken(savedUser._id, res);
            // Return user data
            res.status(201).json({
                _id: savedUser._id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                profilePic: savedUser.profilePic,
            });

            try {
                await sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL);
            } catch (error) {
                console.error('Failed to send welcome email:', error);
            }

            console.log('User created successfully');

        } else {
            res.status(400).json({
                message: "Invalid user data"
            });
        }
    } catch (error) {
        console.log("Error in signup controller:", error);

        if (error.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};