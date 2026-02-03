import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import wbsRoutes from './routes/wbs.js';
import ahspRoutes from './routes/ahsp.js';
import masterRoutes from './routes/masters.js';
import importExportRoutes from './routes/importExport.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use(wbsRoutes);
app.use(ahspRoutes);
app.use(masterRoutes);
app.use(importExportRoutes);

app.listen(config.port, () => {
  console.log(`AHSP Estimator API running on port ${config.port}`);
});
