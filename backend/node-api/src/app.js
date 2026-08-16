const express = require('express');
const cors = require('cors');
const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());
app.use('/api', analysisRoutes);

app.listen(PORT, () => {
  console.log(`Node API running on http://localhost:${PORT}`);
});
