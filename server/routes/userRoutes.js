import express from 'express';


const router = express.Router();

router.post('/login', (req,res) => {
    console.log(req.body);
    res.status(200).send(req.body);
});
router.post('/signup', (req,res) => {
    console.log(req.body);
    res.status(200).send(req.body);
});
export default router;