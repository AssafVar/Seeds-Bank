import express from 'express';


const router = express.Router();

router.post('/', (req,res) => {
    console.log(req.body);
    res.status(200).send(req.body);
});

export default router;