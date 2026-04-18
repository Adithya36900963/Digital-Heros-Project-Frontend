# Digital Heroes Frontend

React and Vite frontend for the Digital Heroes backend.

## Run

```bash
cd C:\Users\adith\Desktop\digital-heroes-frontend
npm install
copy .env.example .env
npm run dev
```

The backend should be running at `http://localhost:5000`.

For Razorpay payments, set `VITE_RAZORPAY_KEY_ID` in the frontend `.env` and set `RAZORPAY_KEY_ID` plus `RAZORPAY_KEY_SECRET` in the backend `.env`.

Seeded accounts from the backend:

- Admin: `admin@digitalheroes.local` / `Admin123!`
- User: `user@digitalheroes.local` / `User123!`
