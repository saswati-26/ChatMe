import express from 'express';
const router = express.Router();

router.get('/send', (req, res) => {
    res.send('Send message');
});

router.get('/receive', (req, res) => {
    res.send('Receive message');
});

export default router;