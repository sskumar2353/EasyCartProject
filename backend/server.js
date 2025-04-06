const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require('dotenv').config(); // This should be line 1
console.log('Environment variables loaded:', process.env.EMAIL_USER ? 'Yes' : 'No'); // For debugging

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "pass123",
    database: "easycart_dupe",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
        
        const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "1h" });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/details", async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/SignUp", async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [email, hashedPassword, name]);
        res.status(201).json({ message: "User registered" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/update", async (req, res) => {
    const { id, name } = req.body;
    try {
        await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, id]);
        res.json({ message: "User updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/reset-password", async (req, res) => {
    const { email, password } = req.body; // Changed from newPassword to password
    console.log(req.body); // Check if password is received properly

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Now password exists
        await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        res.json({ message: "Password reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post("/api/validate-password", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query("SELECT password FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });
        
        const isMatch = await bcrypt.compare(password, rows[0].password);
        res.json({ valid: isMatch });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/update-password", async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        res.json({ message: "Password updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/recipes", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM recipes LIMIT 24");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/recipes/filter", async (req, res) => {
    const { preferences } = req.body;

    if (!Array.isArray(preferences) || preferences.length === 0) {
        return res.status(400).json({ error: "No preferences provided." });
    }

    try {
        const placeholders = preferences.map(() => '?').join(',');

        const [rows] = await pool.query(
            `SELECT * FROM recipes WHERE type IN (${placeholders}) ORDER BY type, recipe_name`,
            preferences
        );

        res.json(rows);
    } catch (err) {
        console.error("Error filtering recipes:", err);
        res.status(500).json({ error: err.message });
    }
});



app.get("/api/ingredients/:recipe_id", async (req, res) => {
    try {
        const recipe_id = req.params.recipe_id;
        console.log(recipe_id);
        const [rows] = await pool.query("SELECT * FROM ingredients WHERE recipe_id = ?", [recipe_id]);

        if (!Array.isArray(rows)) {
            throw new Error("Database query did not return an array");
        }
        // console.log(rows)
        res.json(rows);

    } catch (error) {
        console.error("Error fetching ingredients:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

app.get("/api/recipe_name/:recipe_id", async (req, res) => {
    try {
        const recipe_id = req.params.recipe_id;
        const [rows] = await pool.query("SELECT * FROM recipes WHERE recipe_id = ?", [recipe_id]);

        if (!Array.isArray(rows)) {
            throw new Error("Database query did not return an array");
        }
        res.json(rows);
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});
app.get("/api/recipe_search/:recipe_name", async (req, res) => {
    const recipe_name = req.params.recipe_name;  // ✅ Only declared once
    console.log(recipe_name);
    
    try {
        const [rows] = await pool.query(
            "SELECT * FROM recipes WHERE recipe_name = ?",
            [recipe_name]
        );

        if (!Array.isArray(rows)) {
            throw new Error("Database query did not return an array");
        }

        res.json(rows);
    } catch (error) {
        console.error("Error fetching ingredients:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


app.get("/api/meals", async (req, res) => {
    const { date } = req.query; // Extracts the date parameter from the query (e.g., "2025-01-01")
    console.log(date);
    try {
        const [rows] = await pool.query("SELECT * FROM meals WHERE meal_date = ?", [date]); // Ensures the query matches the database format
        res.json(rows); // Sends the rows for the given date as a JSON response
    } catch (err) {
        console.error("Error querying the database:", err);
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/meals-update", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM meals"); 
        res.json(rows); 
    } catch (err) {
        console.error("Error querying the database:", err);
        res.status(500).json({ error: err.message });
    }
});

// Change GET to POST for updating meals
app.post("/api/update-meal", async (req, res) => {
    const { meal_id, meal_name, meal_date, meal_type } = req.body;
    
    try {
        if (!meal_id || !meal_name || !meal_date || !meal_type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await pool.query("UPDATE meals SET meal_name = ? WHERE meal_date = ? AND meal_type = ?", 
                         [meal_name, meal_date, meal_type]);

        res.json({ message: "Updated Meal Plan" });
    } catch (err) {
        console.error("Error updating meal:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/add-meal", async (req, res) => {
    const { meal_id, meal_name, meal_date, meal_type } = req.body;
    console.log(meal_date);
    try {
        await pool.query(
            "INSERT INTO meals (meal_id, meal_name, meal_date, meal_type) VALUES (?, ?, ?, ?)",
            [meal_id, meal_name, meal_date, meal_type]
        );
        res.status(201).json({ message: "Meal added successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/groceries-by-categories', async (req, res) => {
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'Invalid categories provided' });
    }

    try {
        const placeholders = categories.map(() => '?').join(',');
        const query = `
            SELECT 
                id,
                category,
                item AS name,
                quantity,
                unit,
                price,
                image_url
            FROM groceries
            WHERE category IN (${placeholders})
            ORDER BY category, item
        `;
        
        const [rows] = await pool.query(query, categories);
        
        const formattedGroceries = rows.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            weight: `${item.quantity} ${item.unit}`,
            price: Number(item.price),  // Convert price to number
            image_url: item.image_url
        }));
        
        res.json(formattedGroceries);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to fetch groceries' });
    }
});

// Add these at the top with other requires
const nodemailer = require('nodemailer');
const pdf = require('html-pdf');

// Add this endpoint to your existing server code
app.post('/api/generate-and-send-pdf', async (req, res) => {
    const { userEmail, items, total, storeName, address } = req.body;

    try {
        // 1. Generate PDF HTML
        const pdfHtml = `
        <html>
            <head>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    h1 { color: #019863; text-align: center; }
                    .header { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #f4efe6; padding: 10px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #e9dfce; }
                    .total { font-weight: bold; text-align: right; margin-top: 20px; font-size: 1.2em; }
                </style>
            </head>
            <body>
                <h1>Grocery Order Summary</h1>
                <div class="header">
                    <p><strong>Store:</strong> ${storeName}</p>
                    <p><strong>Address:</strong> ${address}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price/Unit</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.name} (${item.weight || 'N/A'})</td>
                                <td>${item.quantity || 1}</td>
                                <td>₹${item.price?.toFixed(2) || '0.00'}</td>
                                <td>₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="total">
                    <p>Final Total: ₹${total}</p>
                </div>
            </body>
        </html>
        `;

        // 2. Create PDF
        const pdfBuffer = await new Promise((resolve, reject) => {
            const options = { format: 'Letter' };
            pdf.create(pdfHtml, options).toBuffer((err, buffer) => {
                if (err) reject(err);
                else resolve(buffer);
            });
        });

        // 3. Get user details from database
        const [userRows] = await pool.query("SELECT * FROM users WHERE email = ?", [userEmail]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const user = userRows[0];

        // 4. Send Email with PDF Attachment
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or your email service
            auth: {
                user: 'sskumar2353@gmail.com',
                pass: 'xfgms fewm zwzg paav'
            }
        });

        const mailOptions = {
            from: `EasyCart <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Your Grocery Order Summary - ${new Date().toLocaleDateString()}`,
            html: `
                <p>Dear ${user.name},</p>
                <p>Please find your order summary attached.</p>
                <p>Thank you for using EasyCart!</p>
            `,
            attachments: [{
                filename: `EasyCart-Order-Summary-${new Date().toISOString().split('T')[0]}.pdf`,
                content: pdfBuffer
            }]
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'PDF generated and sent successfully' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate and send PDF' });
    }
});
// In your Express server file (e.g., server.js)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Add this if you get certificate errors
    }
  });
app.get('/test-email', async (req, res) => {
    try {
      await transporter.sendMail({
        from: `"Test" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,  // Send to yourself
        subject: 'Test Email',
        text: 'This is a test email from your backend'
      });
      res.send('Email sent successfully!');
    } catch (error) {
      console.error('Email test failed:', error);
      res.status(500).send(`Failed to send email: ${error.message}`);
    }
  });

// Helper function to get current date in YYYY-MM-DD format
// Helper function to get current date (YYYY-MM-DD)
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  // Helper function to get Monday of the current week
  // Helper function to get Monday of the current week
function getFirstDayOfWeek() {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Normalize time
    return monday;
}

// API: Weekly Calorie Data
app.get('/api/weekly-calories', async (req, res) => {
    try {
        const startOfWeek = getFirstDayOfWeek();
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999); // End of day

        // Fetch daily calories for the week
        const [rows] = await pool.query(`
            SELECT DATE(meal_date) AS date, 
                   DAYOFWEEK(meal_date) AS day_of_week, 
                   SUM(calories) AS total_calories
            FROM meals
            WHERE meal_date BETWEEN ? AND ?
            GROUP BY DATE(meal_date), DAYOFWEEK(meal_date)
            ORDER BY date ASC
        `, [startOfWeek, endOfWeek]);

        // Structure complete 7-day data (Mon-Sun)
        const dailyCalories = Array(7).fill().map((_, i) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            return {
                dayOfWeek: i + 1, // 1=Mon to 7=Sun
                date: dayDate.toISOString().split('T')[0],
                calories: 0,
                isToday: dayDate.toDateString() === new Date().toDateString()
            };
        });

        // Populate fetched data
        rows.forEach(row => {
            const dayIndex = (row.day_of_week + 5) % 7; // Convert SQL DAYOFWEEK (1=Sun) to our array (0=Mon)
            if (dayIndex >= 0 && dayIndex < 7) {
                dailyCalories[dayIndex].calories = row.total_calories;
            }
        });

        // Calculate metrics
        const totalCaloriesThisWeek = dailyCalories.reduce((sum, day) => sum + day.calories, 0);
        const averageCalories = Math.round(totalCaloriesThisWeek / 7);
        const weeklyChangePercentage = 0; // Replace with real logic if historical data exists

        res.json({
            dailyCalories,
            totalCaloriesThisWeek,
            averageCalories,
            weeklyChangePercentage
        });

    } catch (error) {
        console.error('Error fetching weekly calories:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// API: Weekly Meal Plans
app.get('/api/daily-nutrition', async (req, res) => {
    try {
      // Get date parameter or use current date
      const requestDate = req.query.date ? new Date(req.query.date) : new Date();
      const formattedDate = requestDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get user ID from authentication (using placeholder here)
      const userId = req.user?.id || 1;
      
      // Connect to database
      const connection = await mysql.createConnection(dbConfig);
      
      // Get user's calorie goal from users table
      const [userRows] = await connection.execute(
        'SELECT calorie_goal FROM users WHERE id = ?',
        [userId]
      );
      
      // Default goal if not found
      const calorieGoal = userRows.length > 0 ? userRows[0].calorie_goal : 2000;
      
      // Get today's meals
      const [mealRows] = await connection.execute(
        'SELECT id, meal_name, meal_type, proteins, fats, carbs, calories, fibres ' +
        'FROM meals WHERE user_id = ? AND DATE(meal_date) = ? ' +
        'ORDER BY meal_date ASC',
        [userId, formattedDate]
      );
      
      // Get previous day's totals for comparison
      const previousDate = new Date(requestDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const formattedPrevDate = previousDate.toISOString().split('T')[0];
      
      const [prevTotals] = await connection.execute(
        'SELECT SUM(proteins) as total_protein, SUM(fats) as total_fats, ' +
        'SUM(carbs) as total_carbs, SUM(calories) as total_calories ' +
        'FROM meals WHERE user_id = ? AND DATE(meal_date) = ?',
        [userId, formattedPrevDate]
      );
      
      // Get hourly distribution data
      const [hourlyData] = await connection.execute(
        'SELECT HOUR(meal_date) as hour, SUM(calories) as calories ' +
        'FROM meals WHERE user_id = ? AND DATE(meal_date) = ? ' +
        'GROUP BY HOUR(meal_date) ORDER BY hour',
        [userId, formattedDate]
      );
      
      // Calculate daily totals
      let dailyCalories = 0;
      let dailyProtein = 0;
      let dailyFats = 0;
      let dailyCarbs = 0;
      
      // Process meals for response
      const meals = mealRows.map(meal => {
        // Add to totals
        dailyCalories += meal.calories;
        dailyProtein += meal.proteins;
        dailyFats += meal.fats;
        dailyCarbs += meal.carbs;
        
        return {
          type: meal.meal_type,
          description: meal.meal_name,
          calories: meal.calories,
          protein: meal.proteins,
          fats: meal.fats,
          carbs: meal.carbs
        };
      });
      
      // Calculate meal nutrient percentages by meal type
      const mealTypes = ['Breakfast', 'Lunch', 'Snack','Dinner'];
      const mealProtein = [];
      const mealFats = [];
      const mealCarbs = [];
      
      mealTypes.forEach(type => {
        const typeMeals = mealRows.filter(meal => meal.meal_type === type);
        const typeProtein = typeMeals.reduce((sum, meal) => sum + meal.proteins, 0);
        const typeFats = typeMeals.reduce((sum, meal) => sum + meal.fats, 0);
        const typeCarbs = typeMeals.reduce((sum, meal) => sum + meal.carbs, 0);
        
        // Calculate percentages of daily totals
        mealProtein.push(dailyProtein > 0 ? Math.round((typeProtein / dailyProtein) * 100) : 0);
        mealFats.push(dailyFats > 0 ? Math.round((typeFats / dailyFats) * 100) : 0);
        mealCarbs.push(dailyCarbs > 0 ? Math.round((typeCarbs / dailyCarbs) * 100) : 0);
      });
      
      // Calculate percentage changes from previous day
      const prevCalories = prevTotals[0].total_calories || 0;
      const prevProtein = prevTotals[0].total_protein || 0;
      const prevFats = prevTotals[0].total_fats || 0;
      const prevCarbs = prevTotals[0].total_carbs || 0;
      
      const calorieChange = prevCalories > 0 ? 
        Math.round(((dailyCalories - prevCalories) / prevCalories) * 100) : 0;
      const proteinChange = prevProtein > 0 ? 
        Math.round(((dailyProtein - prevProtein) / prevProtein) * 100) : 0;
      const fatsChange = prevFats > 0 ? 
        Math.round(((dailyFats - prevFats) / prevFats) * 100) : 0;
      const carbsChange = prevCarbs > 0 ? 
        Math.round(((dailyCarbs - prevCarbs) / prevCarbs) * 100) : 0;
      
      // Format hourly nutrients for graph
      const hourlyNutrients = [];
      for (let i = 0; i < 24; i++) {
        const hourData = hourlyData.find(h => h.hour === i);
        hourlyNutrients.push(hourData ? Math.min(hourData.calories / 5, 148) : 0);
      }
      
      // Build response object
      const responseData = {
        dailyCalories: Math.round(dailyCalories),
        protein: Math.round(dailyProtein),
        fats: Math.round(dailyFats),
        carbs: Math.round(dailyCarbs),
        calorieChange,
        proteinChange,
        fatsChange,
        carbsChange,
        calorieGoal,
        hourlyNutrients: hourlyNutrients.slice(0, 12), // First 12 hours for graph
        mealProtein,
        mealFats,
        mealCarbs,
        meals
      };
      
      // Close database connection
      await connection.end();
      
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      res.status(500).json({
        error: 'Failed to fetch nutrition data',
        message: error.message
      });
    }
  });
  
app.get('/api/weekly-meal-plans', async (req, res) => {
    try {
        const startOfWeek = getFirstDayOfWeek();
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999); // End of day

        // Fetch daily nutrition data
        const [rows] = await pool.query(`
            SELECT DATE(meal_date) AS date,
                   DAYOFWEEK(meal_date) AS day_of_week,
                   SUM(proteins) AS proteins,
                   SUM(carbs) AS carbs,
                   SUM(fats) AS fats
            FROM meals
            WHERE meal_date BETWEEN ? AND ?
            GROUP BY DATE(meal_date), DAYOFWEEK(meal_date)
            ORDER BY date ASC
        `, [startOfWeek, endOfWeek]);

        // Structure complete 7-day data
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const mealPlans = Array(7).fill().map((_, i) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            return {
                dayName: days[i],
                date: dayDate.toISOString().split('T')[0],
                proteins: 0,
                carbs: 0,
                fats: 0,
                type: 'No data' // Default
            };
        });

        // Populate and determine meal plan type
        rows.forEach(row => {
            const dayIndex = (row.day_of_week + 5) % 7; // Convert SQL DAYOFWEEK to our array
            if (dayIndex >= 0 && dayIndex < 7) {
                mealPlans[dayIndex].proteins = row.proteins;
                mealPlans[dayIndex].carbs = row.carbs;
                mealPlans[dayIndex].fats = row.fats;
                
                // Determine meal plan type based on macros
                if (row.carbs < 100 && row.proteins >= 60) {
                    mealPlans[dayIndex].type = 'Low carb';
                } else if (row.proteins >= 80) {
                    mealPlans[dayIndex].type = 'High protein';
                } else if (row.proteins >= 40 && row.carbs >= 100 && row.fats >= 30) {
                    mealPlans[dayIndex].type = 'Balanced meals';
                } else {
                    mealPlans[dayIndex].type = 'Custom';
                }
            }
        });

        res.json(mealPlans);

    } catch (error) {
        console.error('Error fetching meal plans:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
  
  // API: Dietary Consistency
  app.get('/api/dietary-consistency', async (req, res) => {
    try {
      const currentDate = getCurrentDate();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
      // Days with meals
      const [daysWithMeals] = await pool.query(`
        SELECT COUNT(DISTINCT DATE(meal_date)) AS days
        FROM meals
        WHERE meal_date BETWEEN ? AND ?
      `, [sevenDaysAgo.toISOString().split('T')[0], currentDate]);
  
      // Days with balanced nutrition (protein >= 40g, carbs >= 100g, fats >= 30g)
      const [balancedDays] = await pool.query(`
        SELECT COUNT(*) AS balanced_days
        FROM (
          SELECT DATE(meal_date) AS day,
                 SUM(proteins) AS protein,
                 SUM(carbs) AS carbs,
                 SUM(fats) AS fats
          FROM meals
          WHERE meal_date BETWEEN ? AND ?
          GROUP BY DATE(meal_date)
          HAVING protein >= 40 AND carbs >= 100 AND fats >= 30
        ) AS balanced
      `, [sevenDaysAgo.toISOString().split('T')[0], currentDate]);
  
      const consistencyPercentage = Math.round((balancedDays[0].balanced_days / 7) * 100);
  
      res.json({
        daysConsistent: balancedDays[0].balanced_days,
        totalDays: 7,
        consistencyPercentage
      });
  
    } catch (error) {
      console.error('Error fetching consistency data:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/groceries', async (req, res) => {
    try {
      // Query to get distinct categories
      const [categories] = await pool.query(
        'SELECT DISTINCT category FROM groceries'
      );
  
      // Initialize result object
      const result = {};
  
      // For each category, get top 3 items
      for (const categoryObj of categories) {
        const category = categoryObj.category;
        const [items] = await pool.query(
          'SELECT id, category, item, quantity, unit, price, image_url FROM groceries WHERE category = ? LIMIT 3',
          [category]
        );
        result[category] = items;
      }
  
      // Send result
      res.json(result);
    } catch (error) {
      console.error('Error fetching groceries:', error);
      res.status(500).json({ error: 'Failed to fetch groceries' });
    }
  });
  
  
  // Get all groceries by category
  app.get('/api/groceries/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const [items] = await pool.query(
        'SELECT id, category, item, quantity, unit, price, image_url FROM groceries WHERE category = ?',
        [category]
      );
  
      res.json(items);
    } catch (error) {
      console.error('Error fetching groceries by category:', error);
      res.status(500).json({ error: 'Failed to fetch groceries by category' });
    }
  });
  
// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
