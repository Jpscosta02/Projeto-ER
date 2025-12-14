const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// importar rotas
const paroquianosRoutes = require('./routes/paroquianosRoutes');
const celebracoesRoutes = require('./routes/celebracoesRoutes');
const celebrantesRoutes = require('./routes/celebrantesRoutes');
const sacramentosRoutes = require('./routes/sacramentosRoutes');
const aniversariantesRoutes = require('./routes/aniversariantesRoutes');
const statsRoutes = require('./routes/statsRoutes');
const authRoutes = require('./routes/authRoutes');

// ligar as rotas com os paths 
app.use('/api/paroquianos', paroquianosRoutes);
app.use('/api/celebracoes', celebracoesRoutes);
app.use('/api/celebrantes', celebrantesRoutes);
app.use('/api/sacramentos', sacramentosRoutes);
app.use('/api/aniversariantes', aniversariantesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend a correr em http://localhost:${PORT}`);
});