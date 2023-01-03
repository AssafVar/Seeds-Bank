import express  from 'express';
import cors from 'cors';
import userRoutes from '../routes/userRoutes.js';

const app = express();
const port = 8080;

app.use(cors({origin: ['http://localhost:3000'],credentials: true}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Response from server');
});
app.use('/user', userRoutes);

app.listen(port,() => {
    console.log(`listening on port ${port}`);
});