// Back/server.js
const express = require('express');
const cors = require('cors');
const formRoutes = require('./routes/form');
const formRoutes = require('./routes/form');
app.use('/api', formRoutes);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/form', formRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🪑 API MissChair ready on port ${PORT}`));