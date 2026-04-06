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
import path from 'path';

declare global {
  namespace Express {
    interface User extends InstanceType<typeof import('./models/User').User> {}
  }
}

const app = express();
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
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

      const hasAdmin = await User.exists({ role: 'admin' });
      const role = hasAdmin ? 'viewer' : 'admin';

      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          $set: { email, displayName: profile.displayName },
          $setOnInsert: { googleId: profile.id, role },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
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
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=domain` }),
  (req, res) => {
    const user = req.user as InstanceType<typeof User>;
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h', algorithm: 'HS256' }
    );
    // Redirect to client with token in query string
    res.redirect(`${CLIENT_URL}/login/callback?token=${token}`);
  }
);

// tRPC handler
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({ router: appRouter, createContext })
);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDir = path.join(__dirname, '../..'); 
  app.use(express.static(clientDir));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/trpc') || req.url.startsWith('/auth')) {
      return next();
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

const PORT = Number(process.env.PORT ?? 3000);

connectMongo().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
