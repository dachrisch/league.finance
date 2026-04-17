import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import * as trpcExpress from '@trpc/server/adapters/express';
import { User } from './models/User';
import { appRouter } from './routers/index';
import { createContext } from './trpc';
import path from 'path';
import { healthHandler } from './health';
import { offerSendQueue } from './jobs/queue';
import { SendOfferJobHandler } from './jobs/SendOfferJob';

export function createApp() {
  const app = express();
  const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

  // Register job processor
  offerSendQueue.process(SendOfferJobHandler.process.bind(SendOfferJobHandler));

  app.use(cors({ origin: CLIENT_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value ?? '';

        if (!email.endsWith('@bumbleflies.de')) {
          return done(null, false, { message: 'Domain not allowed' });
        }

        const hasAdmin = await User.exists({ role: 'admin' });
        const role = hasAdmin ? 'viewer' : 'admin';

        const update: any = {
          email,
          displayName: profile.displayName,
          googleAccessToken: accessToken,
        };

        if (refreshToken) {
          update.googleRefreshToken = refreshToken;
        }

        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            $set: update,
            $setOnInsert: { googleId: profile.id, role },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        done(null, user);
      }
    )
  );

  app.use(passport.initialize());

  app.get('/health', healthHandler);

  // OAuth routes (not tRPC)
  app.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
      accessType: 'offline',
      prompt: 'consent',
    })
  );

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
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
      res.redirect(`${CLIENT_URL}/login/callback`);
    }
  );

  app.get('/auth/logout', (req, res) => {
    res.clearCookie('auth_token', { path: '/' });
    res.redirect(`${CLIENT_URL}/login`);
  });

  // Test auth endpoint (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get('/auth/test-token', async (req, res) => {
      try {
        // Create or get test user
        const testUser = await User.findOneAndUpdate(
          { email: 'test@bumbleflies.de' },
          {
            $set: {
              email: 'test@bumbleflies.de',
              displayName: 'Test User',
            },
            $setOnInsert: {
              role: 'admin',
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        // Create JWT token
        const token = jwt.sign(
          { userId: testUser._id.toString(), email: testUser.email, role: testUser.role },
          process.env.JWT_SECRET!,
          { expiresIn: '24h', algorithm: 'HS256' }
        );

        // Set cookie
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/',
        });

        // Return token in response (for API tests)
        res.json({ token, userId: testUser._id });
      } catch (error) {
        res.status(500).json({ error: 'Failed to create test token' });
      }
    });
  }

  // tRPC handler
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({ router: appRouter, createContext })
  );

  // Serve built client in production
  if (process.env.NODE_ENV === 'production') {
    const clientDir = path.join(__dirname, '../..');
    app.use(express.static(clientDir));
    app.get('/*splat', (req, res, next) => {
      if (req.url.startsWith('/trpc') || req.url.startsWith('/auth')) {
        return next();
      }
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  return app;
}
