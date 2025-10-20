import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import MailerLite from '@mailerlite/mailerlite-node';

const app = express();
const port = 3000;

// Reemplaza con tu clave de API de MailerLite
const MAILERLITE_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiNWUzMjc5YjdhY2MwMzU5NWMxZjQzYWU1NzE1YTY1NzVhYzYwZjI4YzE0MzVkYjc2OTZkZDBmZDMzNGU5MjQ4NGRhMTUxOGQzODBmMDk0YzEiLCJpYXQiOjE3NTk4ODc2NTguMzM1OTc0LCJuYmYiOjE3NTk4ODc2NTguMzM1OTc3LCJleHAiOjQ5MTU1NjEyNTguMzI5MTI4LCJzdWIiOiIxODU5MDg1Iiwic2NvcGVzIjpbXX0.UGaBlg5wELCXofGD3fT9DLZPjCiijU4pVMupEsKy0EjGCTa2B4zyggl0z5WkimIjCHkg6KmYlbuPzEeT7gi1JSRRAc1mTt5sSyBmHJfIUWBvBaPSsEFudFr9Ey-uZej62VZPha4yORR_olypOPK7PfpzuzkUOmIFYT5SZQ_pVUboZ6NPvmgal9GJd1hswO1mhW4y6LC38ZdjcvkzCIEqaLYq5N010JvSko_oMCA-VmYtSfRKeiIKY75fqfvAf96zKmk30QnwztjqzU0jTPHRVdV9lwn5kdrmzYzyvpu7wdjQf1GuxqWEfO5an058ydv4s1lhAzWwAr2y62ZqpvNwQeG_aBCOntG-iDwhu28jd_E6QkNVYZzTq8GJBgfkCQVQ10J-iouY6DEndHgKiEGw1aWTuclIEmd055JUKzMdNKi1i330IS1DYSnVp8h8PeGyffMBWbsYS5mpJ2VMT5WK3wcGRguIXqCGPTLLNo2E9YB00oIN90pl_JdIIO05fVd1e7SU-UjGlTa4Kp8JBt426xFfXPGtxk0RE8lx9ZQ_r5H2xnrDi4XTeBfj5K9sC7AV6_CsQvNN_qFQa1ak2HlEyggLrTyO-NhTWcfXB2PRcv4v6y18HL2DDo9V7_QDZsujCS-yFUVbK8bm9FRQMldiePtmUH5xA5NkoixbCtG66uw";

const mailerlite = new MailerLite({
    api_key: MAILERLITE_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/send-email', async (req, res) => {
    try {
        const { to, subject, text, from } = req.body;

        const emailData = {
            from: {
                name: from.name,
                email: from.email,
            },
            to: to,
            subject: subject,
            text: text,
        };

        const response = await mailerlite.emails.send(emailData);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to forward request' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});