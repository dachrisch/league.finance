import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import * as trpcExpress from '@trpc/server/adapters/express';
import { connectMongo } from './db/mongo';
import { User } from './models/User';
import { appRouter } from './routers/index';
import { createContext } from './trpc';

declare global {
  namespace Express {
    interface User extends InstanceType<typeof import('./models/User').User> {}
  }
}

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value ?? '';

      if (!email.endsWith('@bumbleflies.de')) {
        return done(null, false, { message: 'Domain not allowed' });
      }

      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'admin' : 'viewer';

      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          googleId: profile.id,
          email,
          displayName: profile.displayName,
          $setOnInsert: { role },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      done(null, user);
    }
  )
);

app.use(passport.initialize());

// OAuth routes (not tRPC)
app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=domain' }),
  (req, res) => {
    const user = req.user as InstanceType<typeof User>;
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h', algorithm: 'HS256' }
    );
    // Redirect to client with token in query string (client stores in localStorage)
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  }
);

// tRPC handler
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({ router: appRouter, createContext })
);

const PORT = Number(process.env.PORT ?? 3000);

connectMongo().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
