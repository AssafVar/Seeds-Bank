import express  from 'express';
import cors from 'cors';
import userRoutes from '../src/routes/userRoutes.js';
import projectsRoutes from '../src/routes/projectsRoutes.js';
import "dotenv/config";

const app = express();
const PORT = process.env.PORT;


app.use(cors({origin: ['http://localhost:3000'],credentials: true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Response from server');
});
app.use('/users', userRoutes);
app.use('/projects', projectsRoutes);

app.listen(PORT,() => {
    console.log(`listening on port ${PORT}`);
});