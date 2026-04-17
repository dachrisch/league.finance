import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';

export class AuthService {
  static async getGoogleAccessToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.googleAccessToken) throw new Error('No Google access token found for user');

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Automatically refreshes if expired and refresh_token is present
    const { token } = await oauth2Client.getAccessToken();
    
    if (!token) throw new Error('Failed to obtain Google access token');

    // Update stored token if it changed
    if (token !== user.googleAccessToken) {
      user.googleAccessToken = token;
      await user.save();
    }

    return token;
  }
}
